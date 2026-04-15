import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import type { MatchRow, NoteRow, ParticipationRow, ProfileRow } from '@/types/database'
import { Card } from '@/components/Card'
import { Button } from '@/components/Button'
import { StarRatingInput } from '@/components/StarRatingInput'
import { euros, formatDateFr, formatHeure, isMatchDayPassedOrToday } from '@/lib/format'

type Part = ParticipationRow & { profile: Pick<ProfileRow, 'id' | 'pseudo'> }

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
    setLoading(false)
  }, [id, user])

  useEffect(() => {
    setLoading(true)
    void load()
  }, [load])

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

  const notesByReceiver = useMemo(() => {
    const m = new Map<string, number>()
    for (const n of myNotes) m.set(n.receveur_id, n.note)
    return m
  }, [myNotes])

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

  async function saveNote(receveurId: string, note: number) {
    if (!user || !id || !match || match.statut !== 'termine') return
    setErr(null)
    const { error } = await supabase.from('notes').upsert(
      {
        match_id: id,
        donneur_id: user.id,
        receveur_id: receveurId,
        note,
      },
      { onConflict: 'match_id,donneur_id,receveur_id' },
    )
    if (error) {
      setErr(error.message)
      return
    }
    const { data: notes } = await supabase
      .from('notes')
      .select('*')
      .eq('match_id', id)
      .eq('donneur_id', user.id)
    setMyNotes((notes ?? []) as NoteRow[])
  }

  if (loading) return <p className="text-zinc-500">Chargement…</p>
  if (!match) {
    return (
      <Card>
        <p className="text-zinc-600">Match introuvable ou inaccessible.</p>
        <Link to="/" className="mt-2 inline-block text-sm font-semibold text-brand-700 hover:underline">
          Retour
        </Link>
      </Card>
    )
  }

  const others = user ? parts.filter((p) => p.joueur_id !== user.id) : parts

  return (
    <div className="space-y-6">
      <Link to="/" className="text-sm font-medium text-brand-700 hover:underline">
        ← Matchs ouverts
      </Link>

      <Card>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="text-xs font-semibold uppercase text-zinc-400">
              {match.statut === 'ouvert' ? 'Ouvert' : 'Terminé'}
            </p>
            <h1 className="mt-1 text-xl font-bold text-zinc-900">
              {formatDateFr(match.date_match)} · {formatHeure(match.heure_match)}
            </h1>
            <p className="mt-2 text-zinc-600">{match.lieu}</p>
            <p className="mt-2 text-sm text-zinc-500">
              Organisateur :{' '}
              <Link
                to={`/joueur/${match.organisateur_id}`}
                className="font-medium text-brand-700 hover:underline"
              >
                {orgPseudo}
              </Link>
            </p>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold text-zinc-900">{euros(Number(match.prix))}</p>
            <p className="text-xs text-zinc-500">par joueur</p>
            <p className="mt-2 text-sm font-medium text-brand-800">
              {places} place{places > 1 ? 's' : ''} restante{places > 1 ? 's' : ''}
            </p>
          </div>
        </div>

        {msg && <p className="mt-4 text-sm text-brand-800">{msg}</p>}
        {err && <p className="mt-2 text-sm text-red-600">{err}</p>}

        {canReserve && (
          <div className="mt-4 border-t border-zinc-100 pt-4">
            <Button onClick={() => void reserve()} disabled={actionPending}>
              Réserver ma place
            </Button>
            <p className="mt-2 text-xs text-zinc-400">Simulation : aucun paiement en ligne.</p>
          </div>
        )}

        {!user && match.statut === 'ouvert' && places > 0 && (
          <p className="mt-4 text-sm text-zinc-500">
            <Link to="/login" className="font-semibold text-brand-700 hover:underline">
              Connecte-toi
            </Link>{' '}
            pour réserver.
          </p>
        )}

        {user && match.statut === 'ouvert' && isOrg && (
          <p className="mt-4 text-xs text-zinc-400">Tu es l’organisateur — tu ne peux pas réserver ta propre annonce.</p>
        )}
      </Card>

      <Card>
        <h2 className="text-lg font-semibold text-zinc-900">Participants ({nbInscrits})</h2>
        <ul className="mt-3 divide-y divide-zinc-100">
          {parts.map((p) => (
            <li key={p.id} className="flex items-center justify-between py-2 text-sm">
              <Link to={`/joueur/${p.joueur_id}`} className="font-medium text-brand-800 hover:underline">
                {p.profile.pseudo}
              </Link>
              <span className="text-xs text-zinc-400">{p.a_paye ? 'Payé' : 'Non payé'}</span>
            </li>
          ))}
          {parts.length === 0 && <li className="py-2 text-zinc-500">Aucun inscrit pour l’instant.</li>}
        </ul>

        {isOrg && match.statut === 'ouvert' && (
          <div className="mt-4 border-t border-zinc-100 pt-4">
            {!canComplete && (
              <p className="mb-2 text-xs text-zinc-500">
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

      {match.statut === 'termine' && user && imIn && others.length > 0 && (
        <Card>
          <h2 className="text-lg font-semibold text-zinc-900">Noter les joueurs</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Une seule note par joueur. Tu ne peux pas te noter toi-même.
          </p>
          <ul className="mt-4 space-y-4">
            {others.map((p) => (
              <li key={p.joueur_id} className="flex flex-col gap-2 border-b border-zinc-50 pb-4 last:border-0 sm:flex-row sm:items-center sm:justify-between">
                <Link to={`/joueur/${p.joueur_id}`} className="font-medium text-zinc-800 hover:underline">
                  {p.profile.pseudo}
                </Link>
                <StarRatingInput
                  value={notesByReceiver.get(p.joueur_id) ?? null}
                  onChange={(n) => void saveNote(p.joueur_id, n)}
                />
              </li>
            ))}
          </ul>
        </Card>
      )}

      {match.statut === 'termine' && user && imIn && others.length === 0 && (
        <Card>
          <p className="text-sm text-zinc-600">
            Tu étais le seul inscrit : il n’y a personne d’autre à noter pour ce match.
          </p>
        </Card>
      )}

      {match.statut === 'termine' && user && !imIn && (
        <Card>
          <p className="text-sm text-zinc-600">
            Les notes sont réservées aux joueurs inscrits sur ce match.
          </p>
        </Card>
      )}

      {match.statut === 'termine' && !user && (
        <Card>
          <p className="text-sm text-zinc-600">Connecte-toi pour voir ou donner des notes si tu as participé.</p>
        </Card>
      )}
    </div>
  )
}
