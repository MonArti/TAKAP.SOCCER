import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4'

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type Kind = 'defi_sent' | 'defi_accepted'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return json({ error: 'Missing authorization' }, 401)
    }

    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } },
    )

    const {
      data: { user },
      error: userErr,
    } = await supabaseUser.auth.getUser()
    if (userErr || !user) {
      return json({ error: 'Unauthorized' }, 401)
    }

    const body = await req.json().catch(() => ({}))
    const kind = body?.kind as Kind | undefined
    const defi_id = body?.defi_id as string | undefined
    if (!defi_id || (kind !== 'defi_sent' && kind !== 'defi_accepted')) {
      return json({ error: 'kind and defi_id required' }, 400)
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    const { data: defi, error: dErr } = await supabaseAdmin
      .from('defis')
      .select('id, equipe_demandeur_id, equipe_receveur_id, statut, message')
      .eq('id', defi_id)
      .maybeSingle()

    if (dErr || !defi) {
      return json({ error: 'Defi not found' }, 404)
    }

    const { data: eqA } = await supabaseAdmin.from('equipes').select('id, nom, capitaine_id').eq('id', defi.equipe_demandeur_id).maybeSingle()
    const { data: eqB } = await supabaseAdmin.from('equipes').select('id, nom, capitaine_id').eq('id', defi.equipe_receveur_id).maybeSingle()

    const nomA = (eqA as { nom?: string } | null)?.nom ?? 'Équipe'
    const nomB = (eqB as { nom?: string } | null)?.nom ?? 'Équipe'

    async function capitaineUuids(equipeId: string, capitaineCol: string | null): Promise<string[]> {
      const ids = new Set<string>()
      if (capitaineCol) ids.add(capitaineCol)
      const { data: mem } = await supabaseAdmin
        .from('equipe_membres')
        .select('joueur_id, role')
        .eq('equipe_id', equipeId)
      for (const m of (mem ?? []) as { joueur_id: string; role: string | null }[]) {
        const r = (m.role ?? '').toLowerCase()
        if (r === 'capitaine' || r === 'captain') ids.add(m.joueur_id)
      }
      return [...ids]
    }

    const capDemandeur = await capitaineUuids(
      defi.equipe_demandeur_id,
      (eqA as { capitaine_id?: string | null } | null)?.capitaine_id ?? null,
    )
    const capReceveur = await capitaineUuids(
      defi.equipe_receveur_id,
      (eqB as { capitaine_id?: string | null } | null)?.capitaine_id ?? null,
    )

    let targets: string[] = []
    let heading = 'Takap.Soccer'
    let msgFr = ''
    let notifType: string = 'defi_received'
    let notifContent = ''

    if (kind === 'defi_sent') {
      if (!capDemandeur.includes(user.id)) {
        return json({ error: 'Forbidden' }, 403)
      }
      targets = capReceveur.filter((id) => id !== user.id)
      msgFr = `${nomA} te défie — ouvre l’app pour répondre.`
      notifType = 'defi_received'
      notifContent = `Défi reçu : ${nomA} → ${nomB}.`
    } else {
      if (!capReceveur.includes(user.id)) {
        return json({ error: 'Forbidden' }, 403)
      }
      targets = capDemandeur.filter((id) => id !== user.id)
      msgFr = `${nomB} a accepté ton défi (${nomA}).`
      notifType = 'defi_accepted'
      notifContent = `Défi accepté : ${nomA} vs ${nomB}.`
    }

    for (const uid of targets) {
      await supabaseAdmin.from('notifications').insert({
        user_id: uid,
        type: notifType,
        content: notifContent,
        read: false,
      })
    }

    const appId = Deno.env.get('ONESIGNAL_APP_ID')
    const restKey = Deno.env.get('ONESIGNAL_REST_API_KEY')
    if (appId && restKey && targets.length > 0) {
      const payload = {
        app_id: appId,
        include_external_user_ids: targets,
        contents: { fr: msgFr, en: msgFr },
        headings: { fr: heading, en: heading },
      }
      const osRes = await fetch('https://onesignal.com/api/v1/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Key ${restKey}`,
        },
        body: JSON.stringify(payload),
      })
      const osText = await osRes.text()
      if (!osRes.ok) {
        console.error('[notify-defi] OneSignal:', osRes.status, osText)
        return json({ ok: true, onesignal_error: osText, notified: targets.length })
      }
    }

    return json({ ok: true, notified: targets.length })
  } catch (e) {
    console.error('[notify-defi]', e)
    return json({ error: String(e) }, 500)
  }
})

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
