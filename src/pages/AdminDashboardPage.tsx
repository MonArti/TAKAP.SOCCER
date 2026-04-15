import { useCallback, useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import type { MatchRow, NoteRow, ParticipationRow, ProfileRow } from '@/types/database'
import { Card } from '@/components/Card'
import { formatDateFr, formatHeure } from '@/lib/format'

type Tab = 'matchs' | 'profils' | 'participations' | 'notes'

export function AdminDashboardPage() {
  const { user, loading: authLoading, isAdmin, adminResolved } = useAuth()
  const [tab, setTab] = useState<Tab>('matchs')
  const [matchs, setMatchs] = useState<MatchRow[]>([])
  const [profils, setProfils] = useState<ProfileRow[]>([])
  const [parts, setParts] = useState<ParticipationRow[]>([])
  const [notes, setNotes] = useState<NoteRow[]>([])
  const [err, setErr] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

  const loadAll = useCallback(async () => {
    if (!user || !isAdmin) return
    setErr(null)
    const [m, p, pa, n] = await Promise.all([
      supabase.from('matchs').select('*').order('created_at', { ascending: false }),
      supabase.from('profiles').select('*').order('created_at', { ascending: false }),
      supabase.from('participations').select('*').order('created_at', { ascending: false }),
      supabase.from('notes').select('*').order('created_at', { ascending: false }),
    ])
    if (m.error) setErr(m.error.message)
    else setMatchs((m.data ?? []) as MatchRow[])
    if (p.error) setErr(p.error.message)
    else setProfils((p.data ?? []) as ProfileRow[])
    if (pa.error) setErr(pa.error.message)
    else setParts((pa.data ?? []) as ParticipationRow[])
    if (n.error) setErr(n.error.message)
    else setNotes((n.data ?? []) as NoteRow[])
  }, [user, isAdmin])

  useEffect(() => {
    if (!isAdmin || !user) return
    void loadAll()
  }, [isAdmin, user, loadAll, tick])

  useEffect(() => {
    if (!isAdmin || !user) return
    const interval = setInterval(() => setTick((t) => t + 1), 12_000)
    const channel = supabase
      .channel('admin-dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matchs' }, () =>
        setTick((t) => t + 1),
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'participations' }, () =>
        setTick((t) => t + 1),
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () =>
        setTick((t) => t + 1),
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notes' }, () =>
        setTick((t) => t + 1),
      )
      .subscribe()
    return () => {
      clearInterval(interval)
      void supabase.removeChannel(channel)
    }
  }, [isAdmin, user])

  if (authLoading || (user && !adminResolved)) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-zinc-500">Chargement…</div>
    )
  }
  if (!user) return <Navigate to="/login" replace />
  if (!isAdmin) return <Navigate to="/" replace />

  const tabBtn = (id: Tab, label: string) => (
    <button
      key={id}
      type="button"
      onClick={() => setTab(id)}
      className={[
        'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
        tab === id ? 'bg-brand-600 text-white' : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200',
      ].join(' ')}
    >
      {label}
    </button>
  )

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Admin — supervision</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Lecture seule. Mise à jour ~12 s ou en temps réel si Realtime est activé sur Supabase.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setTick((t) => t + 1)}
          className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
        >
          Actualiser
        </button>
      </div>

      {err && (
        <Card className="border-red-200 bg-red-50 text-sm text-red-800">{err}</Card>
      )}

      <div className="flex flex-wrap gap-2">
        {tabBtn('matchs', `Matchs (${matchs.length})`)}
        {tabBtn('profils', `Profils (${profils.length})`)}
        {tabBtn('participations', `Inscriptions (${parts.length})`)}
        {tabBtn('notes', `Notes (${notes.length})`)}
      </div>

      {tab === 'matchs' && (
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase text-zinc-500">
              <tr>
                <th className="px-3 py-2">Statut</th>
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Lieu</th>
                <th className="px-3 py-2">Org.</th>
                <th className="px-3 py-2">Places</th>
              </tr>
            </thead>
            <tbody>
              {matchs.map((m) => (
                <tr key={m.id} className="border-b border-zinc-100">
                  <td className="px-3 py-2 font-medium">{m.statut}</td>
                  <td className="px-3 py-2">
                    {formatDateFr(m.date_match)} {formatHeure(m.heure_match)}
                  </td>
                  <td className="px-3 py-2 text-zinc-600">{m.lieu}</td>
                  <td className="px-3 py-2 font-mono text-xs text-zinc-500">{m.organisateur_id.slice(0, 8)}…</td>
                  <td className="px-3 py-2">{m.nb_max}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {tab === 'profils' && (
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase text-zinc-500">
              <tr>
                <th className="px-3 py-2">Pseudo</th>
                <th className="px-3 py-2">Email</th>
                <th className="px-3 py-2">Rôle</th>
                <th className="px-3 py-2">Matchs</th>
                <th className="px-3 py-2">Note</th>
              </tr>
            </thead>
            <tbody>
              {profils.map((p) => (
                <tr key={p.id} className="border-b border-zinc-100">
                  <td className="px-3 py-2 font-medium">{p.pseudo}</td>
                  <td className="px-3 py-2 text-zinc-600">{p.email ?? '—'}</td>
                  <td className="px-3 py-2">{p.role}</td>
                  <td className="px-3 py-2">{p.nb_matchs}</td>
                  <td className="px-3 py-2">{p.note_moyenne}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {tab === 'participations' && (
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase text-zinc-500">
              <tr>
                <th className="px-3 py-2">Match</th>
                <th className="px-3 py-2">Joueur</th>
                <th className="px-3 py-2">Payé</th>
                <th className="px-3 py-2">Créé</th>
              </tr>
            </thead>
            <tbody>
              {parts.map((x) => (
                <tr key={x.id} className="border-b border-zinc-100">
                  <td className="px-3 py-2 font-mono text-xs">{x.match_id.slice(0, 8)}…</td>
                  <td className="px-3 py-2 font-mono text-xs">{x.joueur_id.slice(0, 8)}…</td>
                  <td className="px-3 py-2">{x.a_paye ? 'oui' : 'non'}</td>
                  <td className="px-3 py-2 text-zinc-500">{new Date(x.created_at).toLocaleString('fr-FR')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {tab === 'notes' && (
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase text-zinc-500">
              <tr>
                <th className="px-3 py-2">Match</th>
                <th className="px-3 py-2">Donneur</th>
                <th className="px-3 py-2">Receveur</th>
                <th className="px-3 py-2">Note</th>
              </tr>
            </thead>
            <tbody>
              {notes.map((x) => (
                <tr key={x.id} className="border-b border-zinc-100">
                  <td className="px-3 py-2 font-mono text-xs">{x.match_id.slice(0, 8)}…</td>
                  <td className="px-3 py-2 font-mono text-xs">{x.donneur_id.slice(0, 8)}…</td>
                  <td className="px-3 py-2 font-mono text-xs">{x.receveur_id.slice(0, 8)}…</td>
                  <td className="px-3 py-2 font-semibold">{x.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  )
}
