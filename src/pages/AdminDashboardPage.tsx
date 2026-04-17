import { useCallback, useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import type { MatchRow, NoteRow, ParticipationRow, ProfileRow } from '@/types/database'
import { Card } from '@/components/Card'
import { formatDateForApp, formatHeure, resolveUiLocale } from '@/lib/format'

type Tab = 'matchs' | 'profils' | 'participations' | 'notes'

export function AdminDashboardPage() {
  const { t, i18n } = useTranslation()
  const locale = resolveUiLocale(i18n.language)
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
    const interval = setInterval(() => setTick((x) => x + 1), 12_000)
    const channel = supabase
      .channel('admin-dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matchs' }, () =>
        setTick((x) => x + 1),
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'participations' }, () =>
        setTick((x) => x + 1),
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () =>
        setTick((x) => x + 1),
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notes' }, () =>
        setTick((x) => x + 1),
      )
      .subscribe()
    return () => {
      clearInterval(interval)
      void supabase.removeChannel(channel)
    }
  }, [isAdmin, user])

  if (authLoading || (user && !adminResolved)) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-zinc-500">{t('admin.loading')}</div>
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
          <h1 className="text-2xl font-bold text-zinc-900">{t('admin.title')}</h1>
          <p className="mt-1 text-sm text-zinc-500">{t('admin.subtitle')}</p>
        </div>
        <button
          type="button"
          onClick={() => setTick((x) => x + 1)}
          className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
        >
          {t('admin.refresh')}
        </button>
      </div>

      {err && (
        <Card className="border-red-200 bg-red-50 text-sm text-red-800">{err}</Card>
      )}

      <div className="flex flex-wrap gap-2">
        {tabBtn('matchs', t('admin.tab_matchs', { count: matchs.length }))}
        {tabBtn('profils', t('admin.tab_profils', { count: profils.length }))}
        {tabBtn('participations', t('admin.tab_participations', { count: parts.length }))}
        {tabBtn('notes', t('admin.tab_notes', { count: notes.length }))}
      </div>

      {tab === 'matchs' && (
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase text-zinc-500">
              <tr>
                <th className="px-3 py-2">{t('admin.col_status')}</th>
                <th className="px-3 py-2">{t('admin.col_date')}</th>
                <th className="px-3 py-2">{t('admin.col_venue')}</th>
                <th className="px-3 py-2">{t('admin.col_org')}</th>
                <th className="px-3 py-2">{t('admin.col_places')}</th>
              </tr>
            </thead>
            <tbody>
              {matchs.map((m) => (
                <tr key={m.id} className="border-b border-zinc-100">
                  <td className="px-3 py-2 font-medium">{m.statut}</td>
                  <td className="px-3 py-2">
                    {formatDateForApp(m.date_match)} {formatHeure(m.heure_match)}
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
                <th className="px-3 py-2">{t('admin.col_pseudo')}</th>
                <th className="px-3 py-2">{t('admin.col_email')}</th>
                <th className="px-3 py-2">{t('admin.col_role')}</th>
                <th className="px-3 py-2">{t('admin.col_matches')}</th>
                <th className="px-3 py-2">{t('admin.col_rating')}</th>
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
                <th className="px-3 py-2">{t('admin.col_match')}</th>
                <th className="px-3 py-2">{t('admin.col_player')}</th>
                <th className="px-3 py-2">{t('admin.col_paid')}</th>
                <th className="px-3 py-2">{t('admin.col_created')}</th>
              </tr>
            </thead>
            <tbody>
              {parts.map((x) => (
                <tr key={x.id} className="border-b border-zinc-100">
                  <td className="px-3 py-2 font-mono text-xs">{x.match_id.slice(0, 8)}…</td>
                  <td className="px-3 py-2 font-mono text-xs">{x.joueur_id.slice(0, 8)}…</td>
                  <td className="px-3 py-2">{x.a_paye ? t('admin.yes') : t('admin.no')}</td>
                  <td className="px-3 py-2 text-zinc-500">
                    {new Date(x.created_at).toLocaleString(locale)}
                  </td>
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
                <th className="px-3 py-2">{t('admin.col_match')}</th>
                <th className="px-3 py-2">{t('admin.col_giver')}</th>
                <th className="px-3 py-2">{t('admin.col_receiver')}</th>
                <th className="px-3 py-2">{t('admin.col_rating')}</th>
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
