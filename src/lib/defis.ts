import { supabase } from '@/lib/supabase'
import { attachEquipesToMatch, fetchCapitaineEquipeIdsForUser, fetchEquipeIdsForUser } from '@/lib/equipes'
import type { DefiRow, DefiStatut } from '@/types/database'

export type DefiWithNoms = DefiRow & {
  nom_demandeur: string | null
  nom_receveur: string | null
}

function mapDefiRow(raw: Record<string, unknown>): DefiWithNoms {
  const ed = raw.ed as { nom?: string } | null | undefined
  const er = raw.er as { nom?: string } | null | undefined
  return {
    id: String(raw.id),
    equipe_demandeur_id: String(raw.equipe_demandeur_id),
    equipe_receveur_id: String(raw.equipe_receveur_id),
    statut: raw.statut as DefiStatut,
    match_id: raw.match_id != null ? String(raw.match_id) : null,
    date_proposee: typeof raw.date_proposee === 'string' ? raw.date_proposee : null,
    message: typeof raw.message === 'string' ? raw.message : null,
    created_at: String(raw.created_at ?? ''),
    nom_demandeur: ed?.nom ?? null,
    nom_receveur: er?.nom ?? null,
  }
}

export async function fetchDefisRecus(userId: string): Promise<DefiWithNoms[]> {
  const equipeIds = await fetchEquipeIdsForUser(userId)
  if (equipeIds.length === 0) return []

  const q2 = await supabase.from('defis').select('*').in('equipe_receveur_id', equipeIds)
  if (q2.error) {
    console.warn('[defis] fetchDefisRecus:', q2.error.message)
    return []
  }
  const rows = await hydrateDefiNoms((q2.data ?? []) as Record<string, unknown>[])

  return rows.map(mapDefiRow).sort((a, b) => {
    const ta = new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    return ta
  })
}

export async function fetchDefisEnvoyes(userId: string): Promise<DefiWithNoms[]> {
  const capIds = await fetchCapitaineEquipeIdsForUser(userId)
  if (capIds.length === 0) return []

  const q2 = await supabase.from('defis').select('*').in('equipe_demandeur_id', capIds)
  if (q2.error) {
    console.warn('[defis] fetchDefisEnvoyes:', q2.error.message)
    return []
  }
  const rows = await hydrateDefiNoms((q2.data ?? []) as Record<string, unknown>[])

  return rows.map(mapDefiRow).sort((a, b) => {
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })
}

function parseDateProposee(isoOrLocal: string): { date_match: string; heure_match: string } {
  const d = new Date(isoOrLocal)
  if (Number.isNaN(d.getTime())) {
    const now = new Date()
    const y = now.getFullYear()
    const m = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    const h = String(now.getHours()).padStart(2, '0')
    const min = String(now.getMinutes()).padStart(2, '0')
    return { date_match: `${y}-${m}-${day}`, heure_match: `${h}:${min}:00` }
  }
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const h = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return { date_match: `${y}-${m}-${day}`, heure_match: `${h}:${min}:00` }
}

async function hydrateDefiNoms(rows: Record<string, unknown>[]): Promise<Record<string, unknown>[]> {
  const ids = new Set<string>()
  for (const r of rows) {
    ids.add(String(r.equipe_demandeur_id))
    ids.add(String(r.equipe_receveur_id))
  }
  const { data: eqs } = await supabase.from('equipes').select('id, nom').in('id', [...ids])
  const nomBy = new Map((eqs ?? []).map((e) => [e.id as string, e.nom as string]))
  return rows.map((r) => ({
    ...r,
    ed: { nom: nomBy.get(String(r.equipe_demandeur_id)) },
    er: { nom: nomBy.get(String(r.equipe_receveur_id)) },
  }))
}

export async function creerDefi(
  equipeDemandeurId: string,
  equipeReceveurId: string,
  dateProposee: string,
  message: string | null,
): Promise<{ id: string | null; error: Error | null }> {
  if (equipeDemandeurId === equipeReceveurId) {
    return { id: null, error: new Error('same_team') }
  }

  const { data, error } = await supabase
    .from('defis')
    .insert({
      equipe_demandeur_id: equipeDemandeurId,
      equipe_receveur_id: equipeReceveurId,
      date_proposee: dateProposee || null,
      message: message?.trim() || null,
      statut: 'en_attente',
    })
    .select('id')
    .maybeSingle()

  if (error) return { id: null, error: new Error(error.message) }
  const id = (data as { id: string } | null)?.id ?? null

  if (id) {
    void supabase.functions
      .invoke('notify-defi', { body: { kind: 'defi_sent', defi_id: id } })
      .then(({ error: fnErr }) => {
        if (fnErr) console.warn('[Takap] notify-defi:', fnErr.message)
      })
  }

  return { id, error: null }
}

export async function accepterDefi(defiId: string): Promise<{ matchId: string | null; error: Error | null }> {
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser()
  if (authErr || !user) return { matchId: null, error: new Error('auth') }

  const q2 = await supabase.from('defis').select('*').eq('id', defiId).maybeSingle()
  if (q2.error || !q2.data) return { matchId: null, error: new Error(q2.error?.message ?? 'not_found') }
  const [raw] = await hydrateDefiNoms([q2.data as Record<string, unknown>])

  const defi = mapDefiRow(raw)
  if (defi.statut !== 'en_attente') {
    return { matchId: null, error: new Error('not_pending') }
  }

  const capReceveur = await fetchCapitaineEquipeIdsForUser(user.id)
  if (!capReceveur.includes(defi.equipe_receveur_id)) {
    return { matchId: null, error: new Error('forbidden') }
  }

  const nomA = defi.nom_demandeur ?? '—'
  const nomB = defi.nom_receveur ?? '—'
  const lieu = `Défi — ${nomA} vs ${nomB}`
  const { date_match, heure_match } = parseDateProposee(defi.date_proposee ?? new Date().toISOString())

  const { data: matchIdRaw, error: mErr } = await supabase.rpc('create_match', {
    p_date_match: date_match,
    p_heure_match: heure_match.length === 5 ? `${heure_match}:00` : heure_match,
    p_lieu: lieu,
    p_prix: 0,
    p_nb_max: 22,
    p_lieu_lat: null,
    p_lieu_lng: null,
    p_niveau: 'amateur',
  })

  if (mErr || matchIdRaw == null) {
    return { matchId: null, error: new Error(mErr?.message ?? 'match_create_failed') }
  }

  const matchId = String(matchIdRaw)
  const { error: attErr } = await attachEquipesToMatch(matchId, defi.equipe_demandeur_id, defi.equipe_receveur_id)
  if (attErr) {
    console.warn('[defis] attachEquipesToMatch:', attErr.message)
  }

  const { error: uErr } = await supabase
    .from('defis')
    .update({ statut: 'accepte', match_id: matchId })
    .eq('id', defiId)
    .eq('statut', 'en_attente')

  if (uErr) return { matchId: null, error: new Error(uErr.message) }

  void supabase.from('participations').insert({
    match_id: matchId,
    joueur_id: user.id,
    a_paye: false,
  })

  void supabase.functions
    .invoke('notify-defi', { body: { kind: 'defi_accepted', defi_id: defiId } })
    .then(({ error: fnErr }) => {
      if (fnErr) console.warn('[Takap] notify-defi:', fnErr.message)
    })

  return { matchId, error: null }
}

export async function refuserDefi(defiId: string): Promise<{ error: Error | null }> {
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser()
  if (authErr || !user) return { error: new Error('auth') }

  const { data: row, error: fErr } = await supabase
    .from('defis')
    .select('equipe_receveur_id, statut')
    .eq('id', defiId)
    .maybeSingle()

  if (fErr || !row) return { error: new Error(fErr?.message ?? 'not_found') }
  const r = row as { equipe_receveur_id: string; statut: DefiStatut }
  if (r.statut !== 'en_attente') return { error: new Error('not_pending') }

  const capReceveur = await fetchCapitaineEquipeIdsForUser(user.id)
  if (!capReceveur.includes(r.equipe_receveur_id)) {
    return { error: new Error('forbidden') }
  }

  const { error } = await supabase.from('defis').update({ statut: 'refuse' }).eq('id', defiId).eq('statut', 'en_attente')

  if (error) return { error: new Error(error.message) }
  return { error: null }
}
