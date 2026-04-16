import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
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
import { euros, formatDateFr, formatHeure, isMatchDayPassedOrToday } from '@/lib/format'
import { matchNiveauLabel, type MatchNiveau } from '@/lib/match-niveau'
import { ChatBox } from '@/components/ChatBox'

type Part = ParticipationRow & { profile: Pick<ProfileRow, 'id' | 'pseudo'> }

type StatsDraft = { buts: number; passes: number; jaunes: number; rouges: number }

export function MatchDetailPage() {
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

  const load = useCallback(async () => {
    if (!id) return
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
        profile: pmap.get(p.joueur_id) ?? { id: p.joueur_id, pseudo: 'Joueur' },
      })),
    )
    setOrgPseudo((org as ProfileRow | null)?.pseudo ?? 'Organisateur')

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
  }, [id, user])

  useEffect(() => {
    setLoading(true)
    void load()
  }, [load])

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
      setErr(error.message.includes('duplicate') ? 'Tu es déjà inscrit à ce match.' : error.message)
      return
    }
    setMsg('Place réservée (paiement simulé : non requis en V1).')
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
        setInviteErr('Une invitation existe déjà pour ce joueur et ce match.')
      } else {
        setInviteErr(error.message)
      }
      return
    }
    setInviteMsg('Invitation envoyée : le joueur reçoit une notification avec un rappel — il doit cliquer sur « Rejoindre » pour s’inscrire (aucune place réservée).')
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
    setMsg('Match marqué comme terminé. Les joueurs peuvent se noter.')
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
    setStatsMsg('Statistiques enregistrées.')
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
      setErr('Sélectionne au moins une note (1 à 5 étoiles) pour un joueur.')
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
    setMsg('Notes enregistrées !')
    const { data: notes } = await supabase
      .from('notes')
      .select('*')
      .eq('match_id', id)
      .eq('donneur_id', user.id)
    setMyNotes((notes ?? []) as NoteRow[])
  }

  if (loading) return <p className="text-sm font-medium text-muted-foreground">Chargement…</p>
  if (!match) {
    return (
      <Card>
        <p className="text-foreground">Match introuvable ou inaccessible.</p>
        <Link to="/" className="mt-3 inline-block text-sm font-semibold text-primary hover:underline">
          Retour
        </Link>
      </Card>
    )
  }

  return (
    <div className="space-y-8">
      <Link to="/" className="text-sm font-semibold text-primary hover:underline">
        ← Matchs ouverts
      </Link>

      <Card className="shadow-md ring-1 ring-border/80">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant={match.statut === 'ouvert' ? 'default' : 'secondary'}
                className="rounded-full px-2.5 font-semibold"
              >
                {match.statut === 'ouvert' ? 'Ouvert' : 'Terminé'}
              </Badge>
              <Badge variant="outline" className="rounded-full px-2.5 font-semibold">
                {matchNiveauLabel((match.niveau ?? 'amateur') as MatchNiveau)}
              </Badge>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {formatDateFr(match.date_match)} · {formatHeure(match.heure_match)}
            </h1>
            <p className="text-muted-foreground">{match.lieu}</p>
            <p className="text-sm text-muted-foreground">
              Organisateur :{' '}
              <Link
                to={`/joueur/${match.organisateur_id}`}
                className="font-semibold text-primary hover:underline"
              >
                {orgPseudo}
              </Link>
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-2xl font-bold text-foreground">{euros(Number(match.prix))}</p>
            <p className="text-xs text-muted-foreground">par joueur</p>
            <Badge className="mt-3 rounded-full bg-primary/15 font-semibold text-primary hover:bg-primary/20">
              {places} place{places > 1 ? 's' : ''} restante{places > 1 ? 's' : ''}
            </Badge>
          </div>
        </div>

        <Separator className="my-5" />

        {msg && <p className="text-sm font-medium text-primary">{msg}</p>}
        {err && <p className="mt-2 text-sm font-medium text-destructive">{err}</p>}

        {canReserve && (
          <div className="mt-4 space-y-2">
            <Button onClick={() => void reserve()} disabled={actionPending}>
              Rejoindre
            </Button>
            <p className="text-xs text-muted-foreground">Simulation : aucun paiement en ligne.</p>
          </div>
        )}

        {!user && match.statut === 'ouvert' && places > 0 && (
          <p className="mt-4 text-sm text-muted-foreground">
            <Link to="/login" className="font-semibold text-primary hover:underline">
              Connecte-toi
            </Link>{' '}
            pour réserver.
          </p>
        )}

        {user && match.statut === 'ouvert' && isOrg && (
          <p className="mt-4 text-xs text-muted-foreground">
            Tu es l’organisateur — tu ne peux pas réserver ta propre annonce.
          </p>
        )}
      </Card>

      <ChatBox matchId={match.id} userId={user?.id} canUseChat={imIn} />

      {showInviteCard && (
        <Card className="shadow-md ring-1 ring-border/80 ring-primary/15">
          <h2 className="text-lg font-semibold text-foreground">Inviter un joueur</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Envoie une invitation : le joueur reçoit une notification. Il doit ouvrir ce match et cliquer sur
            « Rejoindre » pour s’inscrire — aucune place n’est réservée.
          </p>

          {!user && (
            <p className="mt-4 text-sm text-muted-foreground">
              <Link to="/login" className="font-semibold text-primary hover:underline">
                Connecte-toi
              </Link>{' '}
              pour inviter quelqu’un (réservé à l’organisateur ou aux joueurs déjà inscrits).
            </p>
          )}

          {user && !canInvite && (
            <p className="mt-4 rounded-lg border border-border/80 bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
              Seuls <strong className="text-foreground">l’organisateur</strong> du match et les joueurs{' '}
              <strong className="text-foreground">déjà inscrits</strong> peuvent envoyer une invitation. Tu
              n’es pas dans ce cas pour l’instant — inscris-toi avec « Rejoindre » ou crée ton propre match.
            </p>
          )}

          {canInvite && (
            <>
              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
                <div className="min-w-0 flex-1 space-y-2">
                  <Label htmlFor="invite-pseudo">Pseudo (recherche)</Label>
                  <Input
                    id="invite-pseudo"
                    value={inviteQuery}
                    onChange={(e) => setInviteQuery(e.target.value)}
                    placeholder="Au moins 2 caractères"
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
                  Rechercher
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
                        Inviter
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
        <h2 className="text-lg font-semibold text-foreground">Participants ({nbInscrits})</h2>
        <ul className="mt-3 divide-y divide-border">
          {parts.map((p) => (
            <li key={p.id} className="flex items-center justify-between py-3 text-sm">
              <Link to={`/joueur/${p.joueur_id}`} className="font-semibold text-primary hover:underline">
                {p.profile.pseudo}
              </Link>
              <span className="text-xs text-muted-foreground">{p.a_paye ? 'Payé' : 'Non payé'}</span>
            </li>
          ))}
          {parts.length === 0 && (
            <li className="py-3 text-muted-foreground">Aucun inscrit pour l’instant.</li>
          )}
        </ul>

        {isOrg && match.statut === 'ouvert' && (
          <div className="mt-4 border-t border-border pt-4">
            {!canComplete && (
              <p className="mb-2 text-xs text-muted-foreground">
                Tu pourras cliquer « Match terminé » à partir du jour du match (date prévue).
              </p>
            )}
            <Button
              variant="secondary"
              disabled={!canComplete || actionPending}
              onClick={() => void completeMatch()}
            >
              Match terminé
            </Button>
          </div>
        )}
      </Card>

      {showMatchStatsReadonly && (
        <Card className="shadow-md ring-1 ring-border/80">
          <h2 className="text-lg font-semibold text-foreground">Résultats du match</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Statistiques saisies par l’organisateur — lecture seule pour tous les participants.
          </p>
          <div className="mt-4 overflow-x-auto rounded-lg border border-border">
            <table className="w-full min-w-[28rem] text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <th className="px-3 py-2.5">Joueur</th>
                  <th className="px-3 py-2.5 text-right tabular-nums">Buts</th>
                  <th className="px-3 py-2.5 text-right tabular-nums">Passes</th>
                  <th className="px-3 py-2.5 text-right tabular-nums">C. jaune</th>
                  <th className="px-3 py-2.5 text-right tabular-nums">C. rouge</th>
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

      {isOrg && match.statut === 'termine' && (
        <Card className="shadow-md ring-1 ring-border/80">
          <h2 className="text-lg font-semibold text-foreground">Statistiques du match</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Saisie réservée à l’organisateur : buts, passes décisives et cartons par joueur inscrit.
          </p>
          {statsErr && <p className="mt-3 text-sm font-medium text-destructive">{statsErr}</p>}
          {statsMsg && <p className="mt-3 text-sm font-medium text-primary">{statsMsg}</p>}
          {!showStatsEditor ? (
            <Button type="button" className="mt-4" variant="secondary" onClick={() => setShowStatsEditor(true)}>
              Saisir les stats
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
                        <Label className="text-[10px] text-muted-foreground">Buts</Label>
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
                        <Label className="text-[10px] text-muted-foreground">Passes</Label>
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
                        <Label className="text-[10px] text-muted-foreground">C. jaune</Label>
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
                        <Label className="text-[10px] text-muted-foreground">C. rouge</Label>
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
                  {actionPending ? 'Enregistrement…' : 'Enregistrer les stats'}
                </Button>
                <Button type="button" variant="ghost" disabled={actionPending} onClick={() => setShowStatsEditor(false)}>
                  Fermer
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}

      {match.statut === 'termine' && user && imIn && others.length > 0 && (
        <Card className="shadow-md ring-1 ring-border/80">
          <h2 className="text-lg font-semibold text-foreground">Noter les joueurs</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Choisis une note par joueur, puis clique sur « Valider les notes » pour enregistrer en base (table{' '}
            <code className="rounded bg-muted px-1 text-xs">notes</code>). Tu ne peux pas te noter toi-même.
          </p>
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
            <p className="text-xs text-muted-foreground">
              Les notes déjà enregistrées sont rechargées depuis le serveur après validation.
            </p>
            <Button type="button" disabled={actionPending} onClick={() => void submitNotes()}>
              {actionPending ? 'Enregistrement…' : 'Valider les notes'}
            </Button>
          </div>
        </Card>
      )}

      {match.statut === 'termine' && user && imIn && others.length === 0 && (
        <Card>
          <p className="text-sm text-muted-foreground">
            Tu étais le seul inscrit : il n’y a personne d’autre à noter pour ce match.
          </p>
        </Card>
      )}

      {match.statut === 'termine' && user && !imIn && (
        <Card>
          <p className="text-sm text-muted-foreground">
            Les notes sont réservées aux joueurs inscrits sur ce match.
          </p>
        </Card>
      )}

      {match.statut === 'termine' && !user && (
        <Card>
          <p className="text-sm text-muted-foreground">
            Connecte-toi pour voir ou donner des notes si tu as participé.
          </p>
        </Card>
      )}
    </div>
  )
}
