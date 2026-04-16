import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { parseNoteMoyenne } from '@/lib/format'
import { cn } from '@/lib/utils'

type Tab = 'note' | 'buteur' | 'passeur'

type NoteRow = {
  id: string
  pseudo: string
  note_moyenne: number
  nb_matchs: number
}

type GoalAssistRow = {
  id: string
  pseudo: string
  total: number
  nb_matchs_stats: number
}

function medalDisplay(index: number) {
  if (index === 0) return { emoji: '🥇', className: 'text-[#FFD600]' }
  if (index === 1) return { emoji: '🥈', className: 'text-[#90A4AE]' }
  if (index === 2) return { emoji: '🥉', className: 'text-[#CD7F32]' }
  return { emoji: null as string | null, className: '' }
}

function initials(pseudo: string) {
  const p = pseudo.trim()
  if (!p) return '?'
  const parts = p.split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return p.slice(0, 2).toUpperCase()
}

export function LeaderboardPanel() {
  const { user } = useAuth()
  const [tab, setTab] = useState<Tab>('note')
  const [noteRows, setNoteRows] = useState<NoteRow[]>([])
  const [goalRows, setGoalRows] = useState<GoalAssistRow[]>([])
  const [assistRows, setAssistRows] = useState<GoalAssistRow[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setErr(null)
      if (tab === 'note') {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, pseudo, note_moyenne, nb_matchs')
          .gt('nb_matchs', 0)
          .order('note_moyenne', { ascending: false })
          .limit(10)
        if (cancelled) return
        if (error) {
          setErr(error.message)
          setNoteRows([])
        } else {
          setNoteRows((data as NoteRow[]) ?? [])
        }
        setLoading(false)
        return
      }

      const { data: stats, error: e1 } = await supabase
        .from('stats_match_joueur')
        .select('joueur_id, match_id, buts, passes_decisives')
      if (cancelled) return
      if (e1) {
        setErr(e1.message)
        setGoalRows([])
        setAssistRows([])
        setLoading(false)
        return
      }
      type S = { joueur_id: string; match_id: string; buts?: number; passes_decisives?: number }
      const agg = new Map<string, { total: number; matches: Set<string> }>()
      for (const r of (stats ?? []) as S[]) {
        const add = tab === 'buteur' ? (r.buts ?? 0) : (r.passes_decisives ?? 0)
        const cur = agg.get(r.joueur_id) ?? { total: 0, matches: new Set<string>() }
        cur.total += add
        cur.matches.add(r.match_id)
        agg.set(r.joueur_id, cur)
      }
      const sorted = [...agg.entries()]
        .filter(([, v]) => v.total > 0)
        .sort((a, b) => b[1].total - a[1].total)
        .slice(0, 10)
      const ids = sorted.map(([id]) => id)
      if (ids.length === 0) {
        if (tab === 'buteur') setGoalRows([])
        else setAssistRows([])
        setLoading(false)
        return
      }
      const { data: profs, error: e2 } = await supabase.from('profiles').select('id, pseudo').in('id', ids)
      if (cancelled) return
      if (e2) {
        setErr(e2.message)
        setLoading(false)
        return
      }
      const pmap = new Map((profs ?? []).map((p) => [p.id as string, p.pseudo as string]))
      const rows: GoalAssistRow[] = sorted.map(([jid, v]) => ({
        id: jid,
        pseudo: pmap.get(jid) ?? 'Joueur',
        total: v.total,
        nb_matchs_stats: v.matches.size,
      }))
      if (tab === 'buteur') setGoalRows(rows)
      else setAssistRows(rows)
      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [tab])

  const tabHint =
    tab === 'note'
      ? 'Par note moyenne (≥ 1 match)'
      : tab === 'buteur'
        ? 'Total de buts (stats match enregistrées)'
        : 'Total de passes décisives (stats match enregistrées)'

  const rowsForTab: (NoteRow | GoalAssistRow)[] =
    tab === 'note' ? noteRows : tab === 'buteur' ? goalRows : assistRows

  return (
    <section className="rounded-2xl border border-[rgba(0,230,118,0.12)] bg-[#1A211B] p-4 shadow-[0_12px_40px_-28px_rgba(0,0,0,0.9)]">
      <h2 className="text-xs font-black uppercase tracking-[0.2em] text-[#00E676]">Top joueurs</h2>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {(
          [
            ['note', 'Note'],
            ['buteur', 'Buteur'],
            ['passeur', 'Passeur'],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            type="button"
            onClick={() => setTab(k)}
            className={cn(
              'rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wide transition-colors',
              tab === k
                ? 'bg-[#00E676] text-[#0A0E0B]'
                : 'border border-[rgba(0,230,118,0.2)] text-[#7A9180] hover:border-[rgba(0,230,118,0.35)] hover:text-[#E8F0E9]',
            )}
          >
            {label}
          </button>
        ))}
      </div>
      <p className="mt-2 text-[11px] text-[#7A9180]">{tabHint}</p>
      {loading && <p className="mt-3 text-sm text-[#7A9180]">Chargement…</p>}
      {err && <p className="mt-3 text-xs text-[#FF3B5C]">{err}</p>}
      {!loading && !err && rowsForTab.length === 0 && (
        <p className="mt-3 text-sm text-[#7A9180]">Pas encore de données pour cet onglet.</p>
      )}
      {!loading && rowsForTab.length > 0 && (
        <ol className="mt-4 space-y-2">
          {rowsForTab.map((r, i) => {
            const medal = medalDisplay(i)
            const isMe = user?.id === r.id
            const rightLabel = tab === 'note' ? 'note' : tab === 'buteur' ? 'buts' : 'passes'
            const rightValue =
              tab === 'note'
                ? parseNoteMoyenne((r as NoteRow).note_moyenne).toFixed(1)
                : String((r as GoalAssistRow).total)
            const subLine =
              tab === 'note'
                ? `${(r as NoteRow).nb_matchs} match${(r as NoteRow).nb_matchs > 1 ? 's' : ''}`
                : `${(r as GoalAssistRow).nb_matchs_stats} match${(r as GoalAssistRow).nb_matchs_stats > 1 ? 's' : ''} comptabilisé${(r as GoalAssistRow).nb_matchs_stats > 1 ? 's' : ''}`
            return (
              <li key={r.id}>
                <Link
                  to={`/joueur/${r.id}`}
                  className={cn(
                    'flex items-center gap-2 rounded-xl border px-2 py-2 transition-colors',
                    'border-[rgba(0,230,118,0.1)] bg-[#0A0E0B]/40 hover:border-[rgba(0,230,118,0.22)] hover:bg-[rgba(0,230,118,0.06)]',
                    isMe &&
                      'border-[#00E676]/55 bg-[rgba(0,230,118,0.12)] shadow-[0_0_24px_-12px_rgba(0,230,118,0.5)]',
                  )}
                >
                  <div className="flex w-9 shrink-0 justify-center">
                    {medal.emoji ? (
                      <span className={cn('text-lg leading-none', medal.className)} aria-hidden>
                        {medal.emoji}
                      </span>
                    ) : (
                      <span className="text-xs font-bold tabular-nums text-[#7A9180]">{i + 1}</span>
                    )}
                  </div>
                  <span
                    className={cn(
                      'flex size-9 shrink-0 items-center justify-center rounded-full text-[11px] font-bold',
                      isMe
                        ? 'bg-[#00E676] text-[#0A0E0B]'
                        : 'bg-[#243028] text-[#E8F0E9]',
                    )}
                  >
                    {initials(r.pseudo)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-[#E8F0E9]">
                      {r.pseudo}
                      {isMe && (
                        <span className="ml-1.5 text-[10px] font-bold uppercase tracking-wide text-[#00E676]">
                          · Moi
                        </span>
                      )}
                    </p>
                    <p className="text-[11px] text-[#7A9180]">{subLine}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-black tabular-nums text-[#00E676]">{rightValue}</p>
                    <p className="text-[10px] text-[#7A9180]">{rightLabel}</p>
                  </div>
                </Link>
              </li>
            )
          })}
        </ol>
      )}
      <Link
        to="/joueurs"
        className="mt-4 block text-center text-xs font-bold text-[#00E676] transition hover:underline"
      >
        Voir tous les joueurs →
      </Link>
    </section>
  )
}
