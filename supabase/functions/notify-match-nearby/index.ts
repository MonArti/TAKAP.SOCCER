import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4'

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/** Secrets Edge : ONESIGNAL_APP_ID, ONESIGNAL_REST_API_KEY (Dashboard → Project Settings → Edge Functions → Secrets) */
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
    const match_id = body?.match_id as string | undefined
    if (!match_id) {
      return json({ error: 'match_id required' }, 400)
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    const { data: match, error: mErr } = await supabaseAdmin
      .from('matchs')
      .select('id, lieu, lieu_lat, lieu_lng, organisateur_id')
      .eq('id', match_id)
      .single()

    if (mErr || !match) {
      return json({ error: 'Match not found' }, 404)
    }

    if (match.organisateur_id !== user.id) {
      return json({ error: 'Forbidden' }, 403)
    }

    if (match.lieu_lat == null || match.lieu_lng == null) {
      return json({ ok: true, skipped: true, reason: 'no_coordinates' })
    }

    const appId = Deno.env.get('ONESIGNAL_APP_ID')
    const restKey = Deno.env.get('ONESIGNAL_REST_API_KEY')
    if (!appId || !restKey) {
      return json({ error: 'OneSignal secrets missing (ONESIGNAL_APP_ID, ONESIGNAL_REST_API_KEY)' }, 500)
    }

    const lieuNom = String(match.lieu).split('—')[0].trim().slice(0, 120)
    const msg = `Nouveau match à ${lieuNom} - Rejoins la partie !`

    const payload = {
      app_id: appId,
      filters: [
        {
          field: 'location',
          radius: 10,
          lat: Number(match.lieu_lat),
          long: Number(match.lieu_lng),
        },
      ],
      contents: { fr: msg, en: msg },
      headings: { fr: 'Takap.Soccer', en: 'Takap.Soccer' },
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
      console.error('[notify-match-nearby] OneSignal:', osRes.status, osText)
      return json({ error: 'OneSignal request failed', status: osRes.status, detail: osText }, 502)
    }

    let parsed: unknown
    try {
      parsed = JSON.parse(osText)
    } catch {
      parsed = osText
    }
    return json({ ok: true, onesignal: parsed })
  } catch (e) {
    console.error('[notify-match-nearby]', e)
    return json({ error: String(e) }, 500)
  }
})

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
