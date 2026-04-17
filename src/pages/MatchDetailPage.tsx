import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import type { MatchRow, NoteRow, ParticipationRow, ProfileRow, StatsMatchJoueurRow } from '@/types/database'
import { Card } from '@/components/Card'
import { Button } from '@/components/Button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { StarRatingInput } from '@/components/StarRatingInput'
import { eurosForApp, formatDateForApp, formatHeure, isMatchDayPassedOrToday } from '@/lib/format'
import type { MatchNiveau } from '@/lib/match-niveau'
import { ChatBox } from '@/components/ChatBox'
import { MatchPhotosSection } from '@/components/MatchPhotosSection'
import { MatchShareBlock, type MatchSharePayload } from '@/components/MatchShareBlock'

type Part = ParticipationRow & { profile: Pick<ProfileRow, 'id' | 'pseudo'> }

type StatsDraft = { buts: number; passes: number; jaunes: number; rouges: number }

export function MatchDetailPage() {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const [match, setMatch] = useState<MatchRow | null>(null)
  const [parts, setParts] = useState<Part[]>([])
  const [myNotes, setMyNotes] = useState<NoteRow[]>([])
  const [orgPseudo, setOrgPseudo] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionPending, setActionPending] = useState(false)
  const [inviteQuery, setInviteQuery] = useState('')
  const [inviteHits, setInviteHits] = useState<Pick<ProfileRow, 'id' | 'pseudo'>[]>([])
  const [inviteBusy, setInviteBusy] = useState(false)
  const [inviteMsg, setInviteMsg] = useState<string | null>(null)
  const [inviteErr, setInviteErr] = useState<string | null>(null)
  const [matchStatsRows, setMatchStatsRows] = useState<StatsMatchJoueurRow[]>([])
  const [statsDraft, setStatsDraft] = useState<Record<string, StatsDraft>>({})
  const [showStatsEditor, setShowStatsEditor] = useState(false)
  const [statsMsg, setStatsMsg] = useState<string | null>(null)
  const [statsErr, setStatsErr] = useState<string | null>(null)
  /** Brouillon des notes (enregistré dans la table `notes` au clic sur « Valider les notes »). */
  const [draftNotes, setDraftNotes] = useState<Record<string, number>>({})
  /** Évite de remettre loading=true quand seul `user` change (session / refresh) — ça provoquait un écran quasi vide et un clignotement. */
  const routeIdRef = useRef<string | undefined>(undefined)
  const [equipeNoms, setEquipeNoms] = useState<{ home: string; away: string }>({ home: '', away: '' })

  const load = useCallback(async () => {
    if (!id) {
      setLoading(false)
      return
    }
    setErr(null)
    const { data: m, error: e1 } = await supabase.from('matchs').select('*').eq('id', id).maybeSingle()
    if (e1) {
      setErr(e1.message)
      setLoading(false)
      return
    }
    if (!m) {
      setMatch(null)
      setLoading(false)
      return
    }
    const matchRow = m as MatchRow
    setMatch(matchRow)

    const hid = matchRow.equipe_domicile_id
    const aid = matchRow.equipe_exterieur_id
    if (hid || aid) {
      const ids = [hid, aid].filter(Boolean) as string[]
      const { data: eqRows } = await supabase.from('equipes').select('id, nom').in('id', ids)
      const em = new Map((eqRows ?? []).map((e) => [e.id as string, e.nom as string]))
      setEquipeNoms({
        home: hid ? em.get(hid) ?? '' : '',
        away: aid ? em.get(aid) ?? '' : '',
      })
    } else {
      setEquipeNoms({ home: '', away: '' })
    }

    const [{ data: pList, error: e2 }, { data: org }] = await Promise.all([
      supabase.from('participations').select('id, match_id, joueur_id, a_paye, created_at').eq('match_id', id),
      supabase.from('profiles').select('id, pseudo').eq('id', matchRow.organisateur_id).maybeSingle(),
    ])
    if (e2) setErr(e2.message)
    const joueurIds = [...new Set((pList ?? []).map((p) => p.joueur_id))]
    let profs: Pick<ProfileRow, 'id' | 'pseudo'>[] = []
    if (joueurIds.length) {
      const { data: pr } = await supabase.from('profiles').select('id, pseudo').in('id', joueurIds)
      profs = (pr ?? []) as Pick<ProfileRow, 'id' | 'pseudo'>[]
    }
    const pmap = new Map(profs.map((p) => [p.id, p]))
    setParts(
      (pList ?? []).map((p) => ({
        ...(p as ParticipationRow),
        profile: pmap.get(p.joueur_id) ?? { id: p.joueur_id, pseudo: t('common.player') },
      })),
    )
    setOrgPseudo((org as ProfileRow | null)?.pseudo ?? t('common.organizer_fallback'))

    if (user && matchRow.statut === 'termine') {
      const { data: notes } = await supabase
        .from('notes')
        .select('*')
        .eq('match_id', id)
        .eq('donneur_id', user.id)
      setMyNotes((notes ?? []) as NoteRow[])
    } else {
      setMyNotes([])
    }

    if (matchRow.statut === 'termine') {
      const { data: st } = await supabase.from('stats_match_joueur').select('*').eq('match_id', id)
      setMatchStatsRows((st ?? []) as StatsMatchJoueurRow[])
    } else {
      setMatchStatsRows([])
    }
    setLoading(false)
  }, [id, user, t])

  useEffect(() => {
    const routeChanged = routeIdRef.current !== id
    routeIdRef.current = id
    if (routeChanged) {
      setLoading(true)
    }
    void load()
  }, [load, id])

  const excludedFromInvite = useMemo(() => {
    const s = new Set(parts.map((p) => p.joueur_id))
    if (user) s.add(user.id)
    return s
  }, [parts, user])

  useEffect(() => {
    const fromServer: Record<string, number> = {}
    for (const n of myNotes) fromServer[n.receveur_id] = n.note
    setDraftNotes(fromServer)
  }, [myNotes])

  useEffect(() => {
    setStatsDraft((prev) => {
      const next = { ...prev }
      const byJ = new Map(matchStatsRows.map((s) => [s.joueur_id, s]))
      for (const p of parts) {
        const ex = byJ.get(p.joueur_id)
        if (ex) {
          next[p.joueur_id] = {
            buts: ex.buts,
            passes: ex.passes_decisives,
            jaunes: ex.cartons_jaunes,
            rouges: ex.cartons_rouges,
          }
        } else if (!next[p.joueur_id]) {
          next[p.joueur_id] = { buts: 0, passes: 0, jaunes: 0, rouges: 0 }
        }
      }
      return next
    })
  }, [parts, matchStatsRows])

  const others = useMemo(
    () => (user ? parts.filter((p) => p.joueur_id !== user.id) : parts),
    [user, parts],
  )

  const matchStatsDisplayRows = useMemo(() => {
    const statsByJoueur = new Map(matchStatsRows.map((s) => [s.joueur_id, s]))
    return parts
      .map((p) => {
        const st = statsByJoueur.get(p.joueur_id)
        return st ? { part: p, st } : null
      })
      .filter((x): x is { part: Part; st: StatsMatchJoueurRow } => x != null)
  }, [parts, matchStatsRows])

  const nbInscrits = parts.length
  const places = match ? Math.max(0, match.nb_max - nbInscrits) : 0
  const imIn = user ? parts.some((p) => p.joueur_id === user.id) : false
  const isOrg = user && match && user.id === match.organisateur_id
  const canReserve =
    user &&
    match &&
    match.statut === 'ouvert' &&
    !imIn &&
    !isOrg &&
    places > 0

  const canComplete =
    isOrg &&
    match &&
    match.statut === 'ouvert' &&
    isMatchDayPassedOrToday(match.date_match)

  const canInvite = Boolean(
    user && match && match.statut === 'ouvert' && (isOrg || imIn),
  )
  /** Afficher la carte d’aide / formulaire dès que le match est ouvert (même si l’utilisateur ne peut pas encore inviter). */
  const showInviteCard = Boolean(match && match.statut === 'ouvert')

  const showMatchStatsReadonly = Boolean(
    match && match.statut === 'termine' && imIn && matchStatsDisplayRows.length > 0,
  )

  const sharePayload = useMemo((): MatchSharePayload | null => {
    if (!match || match.statut !== 'termine' || !id) return null
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    const home = equipeNoms.home || t('match_detail.equipe_unknown_short')
    const away = equipeNoms.away || t('match_detail.equipe_unknown_short')
    const sh = match.score_domicile != null ? String(match.score_domicile) : '?'
    const sa = match.score_exterieur != null ? String(match.score_exterieur) : '?'
    const byJ = new Map(parts.map((p) => [p.joueur_id, p.profile.pseudo]))
    const scorers: string[] = []
    for (const st of matchStatsRows) {
      if (st.buts > 0) scorers.push(`${byJ.get(st.joueur_id) ?? t('common.player')} (${st.buts})`)
    }
    const scorersLine = scorers.length ? scorers.join(', ') : t('match_share.no_scorers')
    let mvpName = t('match_share.no_mvp')
    if (matchStatsRows.length) {
      const sorted = [...matchStatsRows].sort((a, b) => {
        if (b.buts !== a.buts) return b.buts - a.buts
        return String(byJ.get(a.joueur_id)).localeCompare(String(byJ.get(b.joueur_id)))
      })
      const top = sorted[0]
      if (top) mvpName = byJ.get(top.joueur_id) ?? t('common.player')
    }
    return {
      matchUrl: `${origin}/matchs/${id}`,
      homeName: home,
      awayName: away,
      scoreHome: sh,
      scoreAway: sa,
      scorersLine,
      mvpName,
    }
  }, [match, id, equipeNoms, matchStatsRows, parts, t])

  async function reserve() {
    if (!user || !id || !match) return
    setMsg(null)
    setErr(null)
    setActionPending(true)
    const { error } = await supabase.from('participations').insert({
      match_id: id,
      joueur_id: user.id,
      a_paye: false,
    })
    setActionPending(false)
    if (error) {
      setErr(error.message.includes('duplicate') ? t('match_detail.err_already_in') : error.message)
      return
    }
    setMsg(t('match_detail.msg_reserved'))
    void load()
  }

  async function searchInvitePlayers() {
    if (!user || inviteQuery.trim().length < 2) {
      setInviteHits([])
      return
    }
    setInviteBusy(true)
    setInviteMsg(null)
    setInviteErr(null)
    const q = inviteQuery.trim()
    const { data, error } = await supabase
      .from('profiles')
      .select('id, pseudo')
      .ilike('pseudo', `%${q}%`)
      .limit(12)
    setInviteBusy(false)
    if (error) {
      setInviteErr(error.message)
      setInviteHits([])
      return
    }
    const list = ((data ?? []) as Pick<ProfileRow, 'id' | 'pseudo'>[]).filter(
      (p) => !excludedFromInvite.has(p.id),
    )
    setInviteHits(list)
  }

  async function sendInvitation(inviteId: string) {
    if (!user || !id || !match) return
    setInviteMsg(null)
    setInviteErr(null)
    setInviteBusy(true)
    const { error } = await supabase.from('invitations').insert({
      match_id: id,
      inviteur_id: user.id,
      invite_id: inviteId,
    })
    setInviteBusy(false)
    if (error) {
      if (error.message.includes('duplicate') || error.code === '23505') {
        setInviteErr(t('match_detail.err_invite_dup'))
      } else {
        setInviteErr(error.message)
      }
      return
    }
    setInviteMsg(t('match_detail.msg_invite_sent'))
    setInviteHits([])
    setInviteQuery('')
  }

  async function completeMatch() {
    if (!id || !match) return
    setMsg(null)
    setErr(null)
    setActionPending(true)
    const { error } = await supabase.from('matchs').update({ statut: 'termine' }).eq('id', id)
    setActionPending(false)
    if (error) {
      setErr(error.message)
      return
    }
    setMsg(t('match_detail.msg_match_done'))
    void load()
  }

  async function submitStats() {
    if (!user || !id || !match || match.statut !== 'termine' || user.id !== match.organisateur_id) return
    setStatsErr(null)
    setStatsMsg(null)
    setActionPending(true)
    const rows = parts.map((p) => {
      const d = statsDraft[p.joueur_id] ?? { buts: 0, passes: 0, jaunes: 0, rouges: 0 }
      return {
        match_id: id,
        joueur_id: p.joueur_id,
        buts: Math.max(0, Math.min(99, Math.floor(Number(d.buts) || 0))),
        passes_decisives: Math.max(0, Math.min(99, Math.floor(Number(d.passes) || 0))),
        cartons_jaunes: Math.max(0, Math.min(10, Math.floor(Number(d.jaunes) || 0))),
        cartons_rouges: Math.max(0, Math.min(5, Math.floor(Number(d.rouges) || 0))),
      }
    })
    const { error } = await supabase.from('stats_match_joueur').upsert(rows, {
      onConflict: 'match_id,joueur_id',
    })
    setActionPending(false)
    if (error) {
      setStatsErr(error.message)
      return
    }
    setStatsMsg(t('match_detail.msg_stats_saved'))
    const { data: st } = await supabase.from('stats_match_joueur').select('*').eq('match_id', id)
    setMatchStatsRows((st ?? []) as StatsMatchJoueurRow[])
  }

  async function submitNotes() {
    if (!user || !id || !match || match.statut !== 'termine') return
    setErr(null)
    setMsg(null)
    setActionPending(true)
    const rows = others
      .map((p) => {
        const note = draftNotes[p.joueur_id]
        if (note == null || note < 1 || note > 5) return null
        return {
          match_id: id,
          donneur_id: user.id,
          receveur_id: p.joueur_id,
          note,
        }
      })
      .filter((r): r is NonNullable<typeof r> => r != null)

    if (rows.length === 0) {
      setErr(t('match_detail.err_notes_min'))
      setActionPending(false)
      return
    }

    const { error } = await supabase.from('notes').upsert(rows, {
      onConflict: 'match_id,donneur_id,receveur_id',
    })
    setActionPending(false)
    if (error) {
      setErr(error.message)
      return
    }
    setMsg(t('match_detail.msg_notes_saved'))
    const { data: notes } = await supabase
      .from('notes')
      .select('*')
      .eq('match_id', id)
      .eq('donneur_id', user.id)
    setMyNotes((notes ?? []) as NoteRow[])
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Card className="border-[rgba(0,230,118,0.12)] bg-[#1A211B]">
          <p className="text-sm font-medium text-[#E8F0E9]">{t('match_detail.loading_title')}</p>
          <p className="mt-2 text-xs text-[#7A9180]">{t('match_detail.loading_sub')}</p>
        </Card>
      </div>
    )
  }
  if (!match) {
    return (
      <Card>
        <p className="text-foreground">{t('match_detail.not_found')}</p>
        <Link to="/" className="mt-3 inline-block text-sm font-semibold text-primary hover:underline">
          {t('common.back')}
        </Link>
      </Card>
    )
  }

  return (
    <div className="space-y-8">
      <Link to="/" className="text-sm font-semibold text-primary hover:underline">
        {t('match_detail.back_open')}
      </Link>

      <Card className="shadow-md ring-1 ring-border/80">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant={match.statut === 'ouvert' ? 'default' : 'secondary'}
                className="rounded-full px-2.5 font-semibold"
              >
                {match.statut === 'ouvert' ? t('match_detail.status_open') : t('match_detail.status_done')}
              </Badge>
              <Badge variant="outline" className="rounded-full px-2.5 font-semibold">
                {t(`levels.${(match.niveau ?? 'amateur') as MatchNiveau}`)}
              </Badge>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {formatDateForApp(match.date_match)} · {formatHeure(match.heure_match)}
            </h1>
            <p className="text-muted-foreground">{match.lieu}</p>
            {(equipeNoms.home || equipeNoms.away) && (
              <div className="mt-3 rounded-xl border border-border/80 bg-muted/25 px-3 py-2">
                <p className="text-sm font-semibold text-foreground">
                  {t('match_detail.equipe_vs', {
                    home: equipeNoms.home || t('match_detail.equipe_unknown_short'),
                    away: equipeNoms.away || t('match_detail.equipe_unknown_short'),
                  })}
                </p>
                {match.statut === 'termine' && (match.score_domicile != null || match.score_exterieur != null) && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t('match_detail.equipe_score')}:{' '}
                    <span className="font-mono text-base font-bold text-foreground">
                      {match.score_domicile ?? '—'} – {match.score_exterieur ?? '—'}
                    </span>
                  </p>
                )}
              </div>
            )}
            <p className="text-sm text-muted-foreground">
              {t('match_detail.organizer')}{' '}
              <Link
                to={`/joueur/${match.organisateur_id}`}
                className="font-semibold text-primary hover:underline"
              >
                {orgPseudo}
              </Link>
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-2xl font-bold text-foreground">{eurosForApp(Number(match.prix))}</p>
            <p className="text-xs text-muted-foreground">{t('common.per_player')}</p>
            <Badge className="mt-3 rounded-full bg-primary/15 font-semibold text-primary hover:bg-primary/20">
              {t('match_detail.places', { count: places })}
            </Badge>
          </div>
        </div>

        <Separator className="my-5" />

        {msg && <p className="text-sm font-medium text-primary">{msg}</p>}
        {err && <p className="mt-2 text-sm font-medium text-destructive">{err}</p>}

        {canReserve && (
          <div className="mt-4 space-y-2">
            <Button onClick={() => void reserve()} disabled={actionPending}>
              {t('match_detail.join')}
            </Button>
            <p className="text-xs text-muted-foreground">{t('match_detail.sim_payment')}</p>
          </div>
        )}

        {!user && match.statut === 'ouvert' && places > 0 && (
          <p className="mt-4 text-sm text-muted-foreground">
            <Link to="/login" className="font-semibold text-primary hover:underline">
              {t('common.connect')}
            </Link>{' '}
            {t('match_detail.login_to_book')}
          </p>
        )}

        {user && match.statut === 'ouvert' && isOrg && (
          <p className="mt-4 text-xs text-muted-foreground">
            {t('match_detail.org_cannot_book')}
          </p>
        )}
      </Card>

      <ChatBox matchId={match.id} userId={user?.id} canUseChat={imIn} />

      {showInviteCard && (
        <Card className="shadow-md ring-1 ring-border/80 ring-primary/15">
          <h2 className="text-lg font-semibold text-foreground">{t('match_detail.invite_title')}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t('match_detail.invite_intro')}</p>

          {!user && (
            <p className="mt-4 text-sm text-muted-foreground">
              <Link to="/login" className="font-semibold text-primary hover:underline">
                {t('common.connect')}
              </Link>{' '}
              {t('match_detail.invite_login_hint')}
            </p>
          )}

          {user && !canInvite && (
            <p className="mt-4 rounded-lg border border-border/80 bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
              {t('match_detail.invite_restricted')}
            </p>
          )}

          {canInvite && (
            <>
              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
                <div className="min-w-0 flex-1 space-y-2">
                  <Label htmlFor="invite-pseudo">{t('match_detail.pseudo_search')}</Label>
                  <Input
                    id="invite-pseudo"
                    value={inviteQuery}
                    onChange={(e) => setInviteQuery(e.target.value)}
                    placeholder={t('match_detail.placeholder_min_chars')}
                    className="max-w-md"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') void searchInvitePlayers()
                    }}
                  />
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={inviteBusy}
                  onClick={() => void searchInvitePlayers()}
                >
                  {t('common.search')}
                </Button>
              </div>
              {inviteErr && <p className="mt-3 text-sm font-medium text-destructive">{inviteErr}</p>}
              {inviteMsg && <p className="mt-3 text-sm font-medium text-primary">{inviteMsg}</p>}
              {inviteHits.length > 0 && (
                <ul className="mt-3 divide-y divide-border rounded-lg border border-border">
                  {inviteHits.map((p) => (
                    <li key={p.id} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                      <Link to={`/joueur/${p.id}`} className="font-semibold text-primary hover:underline">
                        {p.pseudo}
                      </Link>
                      <Button
                        type="button"
                        size="sm"
                        disabled={inviteBusy}
                        onClick={() => void sendInvitation(p.id)}
                      >
                        {t('common.invite')}
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </Card>
      )}

      <Card className="shadow-md ring-1 ring-border/80">
        <h2 className="text-lg font-semibold text-foreground">{t('match_detail.participants', { count: nbInscrits })}</h2>
        <ul className="mt-3 divide-y divide-border">
          {parts.map((p) => (
            <li key={p.id} className="flex items-center justify-between py-3 text-sm">
              <Link to={`/joueur/${p.joueur_id}`} className="font-semibold text-primary hover:underline">
                {p.profile.pseudo}
              </Link>
              <span className="text-xs text-muted-foreground">{p.a_paye ? t('common.paid') : t('common.unpaid')}</span>
            </li>
          ))}
          {parts.length === 0 && (
            <li className="py-3 text-muted-foreground">{t('match_detail.no_participants')}</li>
          )}
        </ul>

        {isOrg && match.statut === 'ouvert' && (
          <div className="mt-4 border-t border-border pt-4">
            {!canComplete && (
              <p className="mb-2 text-xs text-muted-foreground">
                {t('match_detail.complete_hint')}
              </p>
            )}
            <Button
              variant="secondary"
              disabled={!canComplete || actionPending}
              onClick={() => void completeMatch()}
            >
              {t('match_detail.mark_complete')}
            </Button>
          </div>
        )}
      </Card>

      {showMatchStatsReadonly && (
        <Card className="shadow-md ring-1 ring-border/80">
          <h2 className="text-lg font-semibold text-foreground">{t('match_detail.results_title')}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t('match_detail.results_intro')}</p>
          <div className="mt-4 overflow-x-auto rounded-lg border border-border">
            <table className="w-full min-w-[28rem] text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <th className="px-3 py-2.5">{t('match_detail.stats_col_player')}</th>
                  <th className="px-3 py-2.5 text-right tabular-nums">{t('common.goals')}</th>
                  <th className="px-3 py-2.5 text-right tabular-nums">{t('common.passes')}</th>
                  <th className="px-3 py-2.5 text-right tabular-nums">{t('common.yellow_card_short')}</th>
                  <th className="px-3 py-2.5 text-right tabular-nums">{t('common.red_card_short')}</th>
                </tr>
              </thead>
              <tbody>
                {matchStatsDisplayRows.map(({ part, st }) => (
                  <tr key={st.id} className="border-b border-border/60 last:border-0">
                    <td className="px-3 py-2.5 font-medium text-foreground">
                      <Link to={`/joueur/${part.joueur_id}`} className="text-primary hover:underline">
                        {part.profile.pseudo}
                      </Link>
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-foreground">{st.buts}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-foreground">{st.passes_decisives}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-foreground">{st.cartons_jaunes}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-foreground">{st.cartons_rouges}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {match.statut === 'termine' && id && (
        <>
          <MatchPhotosSection matchId={id} userId={user?.id} canUpload={Boolean(user && (imIn || isOrg))} />
          {sharePayload && <MatchShareBlock payload={sharePayload} />}
        </>
      )}

      {isOrg && match.statut === 'termine' && (
        <Card className="shadow-md ring-1 ring-border/80">
          <h2 className="text-lg font-semibold text-foreground">{t('match_detail.stats_title')}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t('match_detail.stats_intro')}</p>
          {statsErr && <p className="mt-3 text-sm font-medium text-destructive">{statsErr}</p>}
          {statsMsg && <p className="mt-3 text-sm font-medium text-primary">{statsMsg}</p>}
          {!showStatsEditor ? (
            <Button type="button" className="mt-4" variant="secondary" onClick={() => setShowStatsEditor(true)}>
              {t('match_detail.enter_stats')}
            </Button>
          ) : (
            <div className="mt-4 space-y-4">
              <ul className="space-y-4">
                {parts.map((p) => {
                  const d = statsDraft[p.joueur_id] ?? { buts: 0, passes: 0, jaunes: 0, rouges: 0 }
                  return (
                    <li
                      key={p.id}
                      className="grid gap-3 border-b border-border/60 pb-4 last:border-0 sm:grid-cols-[1fr,repeat(4,minmax(0,5rem))] sm:items-end"
                    >
                      <Link
                        to={`/joueur/${p.joueur_id}`}
                        className="font-medium text-foreground hover:underline sm:pb-2"
                      >
                        {p.profile.pseudo}
                      </Link>
                      <div className="space-y-1">
                        <Label className="text-[10px] text-muted-foreground">{t('common.goals')}</Label>
                        <Input
                          type="number"
                          min={0}
                          max={99}
                          value={d.buts}
                          onChange={(e) =>
                            setStatsDraft((prev) => ({
                              ...prev,
                              [p.joueur_id]: { ...d, buts: parseInt(e.target.value, 10) || 0 },
                            }))
                          }
                          className="h-9"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] text-muted-foreground">{t('common.passes')}</Label>
                        <Input
                          type="number"
                          min={0}
                          max={99}
                          value={d.passes}
                          onChange={(e) =>
                            setStatsDraft((prev) => ({
                              ...prev,
                              [p.joueur_id]: { ...d, passes: parseInt(e.target.value, 10) || 0 },
                            }))
                          }
                          className="h-9"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] text-muted-foreground">{t('common.yellow_card_short')}</Label>
                        <Input
                          type="number"
                          min={0}
                          max={10}
                          value={d.jaunes}
                          onChange={(e) =>
                            setStatsDraft((prev) => ({
                              ...prev,
                              [p.joueur_id]: { ...d, jaunes: parseInt(e.target.value, 10) || 0 },
                            }))
                          }
                          className="h-9"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] text-muted-foreground">{t('common.red_card_short')}</Label>
                        <Input
                          type="number"
                          min={0}
                          max={5}
                          value={d.rouges}
                          onChange={(e) =>
                            setStatsDraft((prev) => ({
                              ...prev,
                              [p.joueur_id]: { ...d, rouges: parseInt(e.target.value, 10) || 0 },
                            }))
                          }
                          className="h-9"
                        />
                      </div>
                    </li>
                  )
                })}
              </ul>
              <div className="flex flex-wrap gap-2 border-t border-border pt-4">
                <Button type="button" disabled={actionPending} onClick={() => void submitStats()}>
                  {actionPending ? t('common.saving') : t('match_detail.save_stats')}
                </Button>
                <Button type="button" variant="ghost" disabled={actionPending} onClick={() => setShowStatsEditor(false)}>
                  {t('common.close')}
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}

      {match.statut === 'termine' && user && imIn && others.length > 0 && (
        <Card className="shadow-md ring-1 ring-border/80">
          <h2 className="text-lg font-semibold text-foreground">{t('match_detail.rate_players')}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t('match_detail.rate_intro')}</p>
          <ul className="mt-4 space-y-4">
            {others.map((p) => (
              <li
                key={p.joueur_id}
                className="flex flex-col gap-3 border-b border-border/60 pb-4 last:border-0 sm:flex-row sm:items-center sm:justify-between"
              >
                <Link to={`/joueur/${p.joueur_id}`} className="font-medium text-foreground hover:underline">
                  {p.profile.pseudo}
                </Link>
                <StarRatingInput
                  value={draftNotes[p.joueur_id] ?? null}
                  onChange={(n) =>
                    setDraftNotes((prev) => ({
                      ...prev,
                      [p.joueur_id]: n,
                    }))
                  }
                  disabled={actionPending}
                />
              </li>
            ))}
          </ul>
          {err && <p className="mt-4 text-sm font-medium text-destructive">{err}</p>}
          {msg && <p className="mt-2 text-sm font-medium text-primary">{msg}</p>}
          <div className="mt-6 flex flex-col gap-2 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground">{t('match_detail.notes_reload_hint')}</p>
            <Button type="button" disabled={actionPending} onClick={() => void submitNotes()}>
              {actionPending ? t('common.saving') : t('match_detail.validate_notes')}
            </Button>
          </div>
        </Card>
      )}

      {match.statut === 'termine' && user && imIn && others.length === 0 && (
        <Card>
          <p className="text-sm text-muted-foreground">
            {t('match_detail.alone_no_rate')}
          </p>
        </Card>
      )}

      {match.statut === 'termine' && user && !imIn && (
        <Card>
          <p className="text-sm text-muted-foreground">
            {t('match_detail.rates_participants_only')}
          </p>
        </Card>
      )}

      {match.statut === 'termine' && !user && (
        <Card>
          <p className="text-sm text-muted-foreground">
            {t('match_detail.login_for_notes')}
          </p>
        </Card>
      )}
    </div>
  )
}
