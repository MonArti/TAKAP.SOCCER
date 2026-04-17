/**
 * Table Supabase `equipes` + `equipe_membres` (colonne `joueur_id` → `profiles.id`).
 */
import { supabase } from '@/lib/supabase'
import type { EquipeRow, MatchRow, MembreEquipeRow } from '@/types/database'

export const EQUIPES_TABLE = 'equipes' as const
export const EQUIPE_MEMBRES_TABLE = 'equipe_membres' as const

export type EquipeHubRow = EquipeRow & { memberCount: number }

export type MembreEquipeWithProfile = MembreEquipeRow & {
  profiles: { pseudo: string | null; id: string } | null
}

function pickFirstString(raw: Record<string, unknown>, keys: readonly string[]): string | null {
  for (const k of keys) {
    const v = raw[k]
    if (typeof v === 'string' && v.trim() !== '') return v.trim()
  }
  return null
}

function pickNullableNumber(raw: Record<string, unknown>, key: string): number | null {
  const v = raw[key]
  if (v === null || v === undefined) return null
  if (typeof v === 'number' && !Number.isNaN(v)) return v
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v)
    return Number.isNaN(n) ? null : n
  }
  return null
}

/** Unifie les lignes `equipes` vers `EquipeRow` (couleurs : plusieurs noms de colonnes possibles). */
export function normalizeEquipeRow(raw: Record<string, unknown>): EquipeRow {
  return {
    id: String(raw.id ?? ''),
    nom: typeof raw.nom === 'string' ? raw.nom : String(raw.nom ?? ''),
    ville: typeof raw.ville === 'string' ? raw.ville : null,
    logo_url: pickFirstString(raw, ['logo_url', 'logo']),
    couleur_principale: pickFirstString(raw, [
      'couleur_principale',
      'couleur_domicile',
      'couleur_1',
      'couleur1',
      'color_primary',
      'couleur_hex_principale',
    ]),
    couleur_secondaire: pickFirstString(raw, [
      'couleur_secondaire',
      'couleur_exterieur',
      'couleur_2',
      'couleur2',
      'color_secondary',
      'couleur_hex_secondaire',
    ]),
    stade: typeof raw.stade === 'string' ? raw.stade : null,
    nb_victoires: pickNullableNumber(raw, 'nb_victoires'),
    nb_defaites: pickNullableNumber(raw, 'nb_defaites'),
    nb_matchs: pickNullableNumber(raw, 'nb_matchs'),
    code_invitation: pickFirstString(raw, ['code_invitation', 'invite_code']) ?? null,
    capitaine_id: pickFirstString(raw, ['capitaine_id']) ?? null,
    created_by: pickFirstString(raw, ['created_by']) ?? pickFirstString(raw, ['capitaine_id']) ?? null,
    created_at:
      typeof raw.created_at === 'string'
        ? raw.created_at
        : typeof raw.date_creation === 'string'
          ? raw.date_creation
          : raw.created_at != null
            ? String(raw.created_at)
            : '',
  }
}

/** Compte les membres d’une équipe (une requête `count`, comme dans le dashboard Supabase). */
export async function countMembresEquipe(equipeId: string): Promise<number> {
  const { count, error } = await supabase
    .from(EQUIPE_MEMBRES_TABLE)
    .select('*', { count: 'exact', head: true })
    .eq('equipe_id', equipeId)

  if (error) {
    console.warn('[equipes] countMembresEquipe:', error.message)
    return 0
  }
  return count ?? 0
}

/** Agrège les effectifs en un seul aller-retour (équivalent à un count par équipe). */
async function memberCountsByEquipeIds(equipeIds: string[]): Promise<Map<string, number>> {
  const counts = new Map<string, number>()
  for (const id of equipeIds) counts.set(id, 0)

  const { data: rows, error } = await supabase.from(EQUIPE_MEMBRES_TABLE).select('equipe_id')

  if (error) {
    console.warn('[equipes] fetch equipe_membres (comptage):', error.message)
    return counts
  }

  for (const row of (rows ?? []) as { equipe_id: string }[]) {
    if (!equipeIds.includes(row.equipe_id)) continue
    counts.set(row.equipe_id, (counts.get(row.equipe_id) ?? 0) + 1)
  }

  return counts
}

export async function fetchEquipesForHub(limit = 100): Promise<EquipeHubRow[]> {
  let rawRows: Record<string, unknown>[] | null = null
  let e1 = null as { message: string } | null

  const qRanked = await supabase
    .from(EQUIPES_TABLE)
    .select('*')
    .order('nb_victoires', { ascending: false, nullsFirst: false })
    .order('nom', { ascending: true })
    .limit(limit)

  if (!qRanked.error && qRanked.data) {
    rawRows = qRanked.data as Record<string, unknown>[]
  } else {
    const qFallback = await supabase.from(EQUIPES_TABLE).select('*').order('nom', { ascending: true }).limit(limit)
    e1 = qFallback.error
    rawRows = (qFallback.data as Record<string, unknown>[] | null) ?? null
    if (qRanked.error) {
      console.warn('[equipes] tri par nb_victoires indisponible, fallback nom:', qRanked.error.message)
    }
  }

  if (e1 || !rawRows?.length) {
    if (e1) console.warn('[equipes] fetch equipes:', e1.message)
    return []
  }

  const equipes = rawRows.map(normalizeEquipeRow)
  const ids = equipes.map((e) => e.id)
  const counts = await memberCountsByEquipeIds(ids)

  return equipes.map((eq) => ({
    ...eq,
    memberCount: counts.get(eq.id) ?? 0,
  }))
}

/** Toutes les équipes (table `equipes`) pour sélecteurs création de match. */
export async function fetchAllEquipesForSelect(): Promise<{ id: string; nom: string }[]> {
  const { data, error } = await supabase.from(EQUIPES_TABLE).select('id, nom').order('nom', { ascending: true })
  if (error) {
    console.warn('[equipes] fetchAllEquipesForSelect:', error.message)
    return []
  }
  return (data ?? []) as { id: string; nom: string }[]
}

export async function attachEquipesToMatch(
  matchId: string,
  homeId: string | null,
  awayId: string | null,
): Promise<{ error: Error | null }> {
  const payload: Pick<MatchRow, 'equipe_domicile_id' | 'equipe_exterieur_id'> = {
    equipe_domicile_id: homeId,
    equipe_exterieur_id: awayId,
  }
  const { error } = await supabase.from('matchs').update(payload).eq('id', matchId)
  if (error) return { error: new Error(error.message) }
  return { error: null }
}

export async function fetchEquipeById(id: string): Promise<EquipeRow | null> {
  const { data, error } = await supabase.from(EQUIPES_TABLE).select('*').eq('id', id).maybeSingle()
  if (error) {
    console.warn('[equipes] fetch by id:', error.message)
    return null
  }
  if (!data) return null
  return normalizeEquipeRow(data as Record<string, unknown>)
}

/** Équipes dont l’utilisateur est membre (`equipe_membres`). */
export async function fetchEquipeIdsForUser(joueurId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from(EQUIPE_MEMBRES_TABLE)
    .select('equipe_id')
    .eq('joueur_id', joueurId)
  if (error) {
    console.warn('[equipes] fetchEquipeIdsForUser:', error.message)
    return []
  }
  return [...new Set((data ?? []).map((r) => (r as { equipe_id: string }).equipe_id))]
}

/** Équipes dont l’utilisateur est capitaine (`capitaine_id` ou rôle membre). */
export async function fetchCapitaineEquipeIdsForUser(joueurId: string): Promise<string[]> {
  const { data: asCap, error: e1 } = await supabase
    .from(EQUIPES_TABLE)
    .select('id')
    .eq('capitaine_id', joueurId)
  const ids = new Set<string>()
  if (!e1 && asCap) {
    for (const r of asCap as { id: string }[]) ids.add(r.id)
  }
  const { data: membres, error: e2 } = await supabase
    .from(EQUIPE_MEMBRES_TABLE)
    .select('equipe_id, role')
    .eq('joueur_id', joueurId)
  if (!e2 && membres) {
    for (const r of membres as { equipe_id: string; role: string | null }[]) {
      const role = (r.role ?? '').toLowerCase()
      if (role === 'capitaine' || role === 'captain') ids.add(r.equipe_id)
    }
  }
  return [...ids]
}

export async function fetchMembresEquipe(equipeId: string): Promise<MembreEquipeWithProfile[]> {
  const { data: rows, error } = await supabase.from(EQUIPE_MEMBRES_TABLE).select('*').eq('equipe_id', equipeId)

  if (error || !rows?.length) return []

  const joueurIds = [...new Set((rows as MembreEquipeRow[]).map((r) => r.joueur_id))]
  const { data: profs } = await supabase.from('profiles').select('id, pseudo').in('id', joueurIds)
  const map = new Map((profs ?? []).map((p) => [p.id, p]))

  return (rows as MembreEquipeRow[]).map((row) => {
    const p = map.get(row.joueur_id)
    return {
      ...row,
      profiles: p ? { id: p.id, pseudo: p.pseudo } : null,
    }
  })
}
