import { supabase } from '@/lib/supabase'
import type { TournoiParticipantRow, TournoiRow, TournoiType } from '@/types/database'

export type TournoiWithExtras = TournoiRow & { nb_equipes: number }

export type ParticipantAvecEquipe = {
  tournoi_id: string
  equipe_id: string
  points: number
  buts_pour: number
  buts_contre: number
  equipes: { nom: string; id: string } | null
}

export const DEFAULT_NB_EQUIPES_MAX_TOURNOI = 8

export async function fetchTournoisList(): Promise<TournoiWithExtras[]> {
  const { data: tournois, error } = await supabase.from('tournois').select('*').order('date_debut', { ascending: false })
  if (error) {
    console.warn('[tournois] list:', error.message)
    return []
  }
  if (!tournois?.length) return []

  const { data: parts } = await supabase.from('tournoi_participants').select('tournoi_id')
  const countBy = new Map<string, number>()
  for (const p of (parts ?? []) as { tournoi_id: string }[]) {
    countBy.set(p.tournoi_id, (countBy.get(p.tournoi_id) ?? 0) + 1)
  }

  return (tournois as TournoiRow[]).map((t) => ({
    ...t,
    nb_equipes: countBy.get(t.id) ?? 0,
  }))
}

export async function createTournoi(input: {
  nom: string
  date_debut: string | null
  date_fin: string | null
  lieu: string
  type: TournoiType | null
  organisateur_id: string
  nb_equipes_max: number
}): Promise<{ id: string | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('tournois')
    .insert({
      nom: input.nom.trim(),
      date_debut: input.date_debut || null,
      date_fin: input.date_fin || null,
      lieu: input.lieu.trim() || null,
      type: input.type,
      organisateur_id: input.organisateur_id,
      statut: 'planifie',
      nb_equipes_max: input.nb_equipes_max,
    })
    .select('id')
    .maybeSingle()

  if (error) return { id: null, error: new Error(error.message) }
  const row = data as { id: string } | null
  return { id: row?.id ?? null, error: null }
}

export async function fetchTournoiById(id: string): Promise<TournoiRow | null> {
  const { data, error } = await supabase.from('tournois').select('*').eq('id', id).maybeSingle()
  if (error) {
    console.warn('[tournois] by id:', error.message)
    return null
  }
  return data as TournoiRow | null
}

export async function fetchParticipants(tournoiId: string): Promise<ParticipantAvecEquipe[]> {
  const { data, error } = await supabase
    .from('tournoi_participants')
    .select('tournoi_id, equipe_id, points, buts_pour, buts_contre')
    .eq('tournoi_id', tournoiId)

  if (error || !data?.length) {
    if (error) console.warn('[tournois] participants:', error.message)
    return []
  }

  const rows = data as TournoiParticipantRow[]
  const ids = [...new Set(rows.map((r) => r.equipe_id))]
  const { data: eqs } = await supabase.from('equipes').select('id, nom').in('id', ids)
  const nomById = new Map((eqs ?? []).map((e) => [e.id as string, e.nom as string]))

  return rows.map((r) => ({
    tournoi_id: r.tournoi_id,
    equipe_id: r.equipe_id,
    points: r.points,
    buts_pour: r.buts_pour,
    buts_contre: r.buts_contre,
    equipes: nomById.has(r.equipe_id) ? { id: r.equipe_id, nom: nomById.get(r.equipe_id)! } : null,
  }))
}

export async function addEquipeToTournoi(tournoiId: string, equipeId: string): Promise<{ error: Error | null }> {
  const tournoi = await fetchTournoiById(tournoiId)
  if (!tournoi) return { error: new Error('not_found') }

  const maxRaw = tournoi.nb_equipes_max
  const max =
    typeof maxRaw === 'number' && maxRaw > 0 ? maxRaw : DEFAULT_NB_EQUIPES_MAX_TOURNOI

  const { count, error: cErr } = await supabase
    .from('tournoi_participants')
    .select('*', { count: 'exact', head: true })
    .eq('tournoi_id', tournoiId)

  if (cErr) {
    console.warn('[tournois] count participants:', cErr.message)
    return { error: new Error(cErr.message) }
  }
  if ((count ?? 0) >= max) {
    return { error: new Error('tournoi_complet') }
  }

  const { error } = await supabase.from('tournoi_participants').insert({
    tournoi_id: tournoiId,
    equipe_id: equipeId,
  })
  if (error) {
    if (error.code === '23505') return { error: new Error('duplicate') }
    return { error: new Error(error.message) }
  }
  return { error: null }
}

export async function findEquipeByInviteCode(code: string): Promise<{ id: string; nom: string } | null> {
  const clean = code.trim().toUpperCase()
  const { data, error } = await supabase.from('equipes').select('id, nom').eq('code_invitation', clean).maybeSingle()
  if (error || !data) return null
  return data as { id: string; nom: string }
}

export async function searchEquipesByNom(q: string): Promise<{ id: string; nom: string }[]> {
  const t = q.trim()
  if (t.length < 2) return []
  const { data, error } = await supabase.from('equipes').select('id, nom').ilike('nom', `%${t}%`).limit(15)
  if (error || !data) return []
  return data as { id: string; nom: string }[]
}
