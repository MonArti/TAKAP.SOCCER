/**
 * Accès aux tables équipes Supabase.
 * Adapte TEAMS_TABLE / TEAM_MEMBERS_TABLE / colonnes matchs si ton schéma diffère.
 */
import { supabase } from '@/lib/supabase'
import type { MatchRow, TeamMemberRow, TeamRow } from '@/types/database'

export const TEAMS_TABLE = 'teams' as const
export const TEAM_MEMBERS_TABLE = 'team_members' as const

export const MATCH_HOME_TEAM_COL = 'equipe_domicile_id' as const
export const MATCH_AWAY_TEAM_COL = 'equipe_exterieur_id' as const

export type { TeamRow, TeamMemberRow }

export type MemberWithProfile = TeamMemberRow & {
  profiles: { pseudo: string | null; id: string } | null
}

function randomInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let s = ''
  for (let i = 0; i < 8; i++) s += chars[Math.floor(Math.random() * chars.length)]
  return s
}

export async function createTeam(input: {
  name: string
  city: string
  logoUrl: string | null
  colorPrimary: string
  colorSecondary: string
  stadium: string
  createdBy: string
}): Promise<{ team: TeamRow | null; error: Error | null }> {
  let code = randomInviteCode()
  for (let attempt = 0; attempt < 5; attempt++) {
    const { data, error } = await supabase
      .from(TEAMS_TABLE)
      .insert({
        name: input.name.trim(),
        city: input.city.trim(),
        logo_url: input.logoUrl?.trim() || null,
        color_primary: input.colorPrimary,
        color_secondary: input.colorSecondary,
        stadium: input.stadium.trim(),
        invite_code: code,
        created_by: input.createdBy,
      })
      .select()
      .single()

    if (!error && data) {
      const team = data as TeamRow
      const { error: memErr } = await supabase.from(TEAM_MEMBERS_TABLE).insert({
        team_id: team.id,
        profile_id: input.createdBy,
        role: 'captain',
      })
      if (memErr) {
        return { team: null, error: new Error(memErr.message) }
      }
      return { team, error: null }
    }
    if (error?.code === '23505' && String(error.message).toLowerCase().includes('invite')) {
      code = randomInviteCode()
      continue
    }
    return { team: null, error: new Error(error?.message ?? 'insert team failed') }
  }
  return { team: null, error: new Error('invite_code collision') }
}

export async function joinTeamByCode(
  code: string,
  profileId: string,
): Promise<{ teamId: string | null; error: Error | null }> {
  const clean = code.trim().toUpperCase().replace(/\s+/g, '')
  const { data: team, error: findErr } = await supabase
    .from(TEAMS_TABLE)
    .select('id')
    .eq('invite_code', clean)
    .maybeSingle()

  if (findErr) return { teamId: null, error: new Error(findErr.message) }
  if (!team) return { teamId: null, error: new Error('code_not_found') }

  const { error: insErr } = await supabase.from(TEAM_MEMBERS_TABLE).insert({
    team_id: team.id,
    profile_id: profileId,
    role: 'member',
  })

  if (insErr) {
    if (insErr.code === '23505') {
      return { teamId: null, error: new Error('already_member') }
    }
    return { teamId: null, error: new Error(insErr.message) }
  }
  return { teamId: team.id, error: null }
}

export async function fetchTeamsForUser(profileId: string): Promise<TeamRow[]> {
  const { data: links, error } = await supabase
    .from(TEAM_MEMBERS_TABLE)
    .select('team_id')
    .eq('profile_id', profileId)

  if (error || !links?.length) return []
  const ids = [...new Set(links.map((l) => (l as { team_id: string }).team_id))]
  const { data: teams } = await supabase.from(TEAMS_TABLE).select('*').in('id', ids)
  return (teams ?? []) as TeamRow[]
}

export async function fetchTeamMembers(teamId: string): Promise<MemberWithProfile[]> {
  const { data: rows, error } = await supabase.from(TEAM_MEMBERS_TABLE).select('*').eq('team_id', teamId)

  if (error || !rows?.length) return []

  const ids = (rows as TeamMemberRow[]).map((r) => r.profile_id)
  const { data: profs } = await supabase.from('profiles').select('id, pseudo').in('id', ids)
  const map = new Map((profs ?? []).map((p) => [p.id, p]))

  return (rows as TeamMemberRow[]).map((row) => {
    const p = map.get(row.profile_id)
    return {
      ...row,
      profiles: p ? { id: p.id, pseudo: p.pseudo } : null,
    }
  })
}

export async function countTeamMatches(teamId: string): Promise<number> {
  const { count: c1, error: e1 } = await supabase
    .from('matchs')
    .select('id', { count: 'exact', head: true })
    .eq(MATCH_HOME_TEAM_COL, teamId)

  const { count: c2, error: e2 } = await supabase
    .from('matchs')
    .select('id', { count: 'exact', head: true })
    .eq(MATCH_AWAY_TEAM_COL, teamId)

  if (e1 && e2) return 0
  return (c1 ?? 0) + (c2 ?? 0)
}

export async function fetchTeamsLeaderboard(limit = 10): Promise<TeamRow[]> {
  const q1 = await supabase.from(TEAMS_TABLE).select('*').order('points', { ascending: false }).limit(limit)

  if (!q1.error) {
    return (q1.data ?? []) as TeamRow[]
  }

  const q2 = await supabase.from(TEAMS_TABLE).select('*').order('name').limit(limit)
  return (q2.data ?? []) as TeamRow[]
}

export async function fetchUserTeamsForSelect(profileId: string): Promise<{ id: string; name: string }[]> {
  const teams = await fetchTeamsForUser(profileId)
  return teams.map((t) => ({ id: t.id, name: t.name }))
}

export async function attachTeamsToMatch(
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
