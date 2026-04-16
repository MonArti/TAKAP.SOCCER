import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { parseNoteMoyenne } from '@/lib/format'
import { cn } from '@/lib/utils'

type Row = {
  id: string
  pseudo: string
  note_moyenne: number
  nb_matchs: number
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
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setErr(null)
      const { data, error } = await supabase
        .from('profiles')
        .select('id, pseudo, note_moyenne, nb_matchs')
        .gt('nb_matchs', 0)
        .order('note_moyenne', { ascending: false })
        .limit(10)
      if (cancelled) return
      if (error) {
        setErr(error.message)
        setRows([])
      } else {
        setRows((data as Row[]) ?? [])
      }
      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <section className="rounded-2xl border border-[rgba(0,230,118,0.12)] bg-[#1A211B] p-4 shadow-[0_12px_40px_-28px_rgba(0,0,0,0.9)]">
      <h2 className="text-xs font-black uppercase tracking-[0.2em] text-[#00E676]">Top joueurs</h2>
      <p className="mt-1 text-[11px] text-[#7A9180]">Par note moyenne (≥ 1 match)</p>
      {loading && <p className="mt-3 text-sm text-[#7A9180]">Chargement…</p>}
      {err && <p className="mt-3 text-xs text-[#FF3B5C]">{err}</p>}
      {!loading && !err && rows.length === 0 && (
        <p className="mt-3 text-sm text-[#7A9180]">Pas encore de stats en base.</p>
      )}
      {!loading && rows.length > 0 && (
        <ol className="mt-4 space-y-2">
          {rows.map((r, i) => {
            const note = parseNoteMoyenne(r.note_moyenne)
            const medal = medalDisplay(i)
            const isMe = user?.id === r.id
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
                    <p className="text-[11px] text-[#7A9180]">
                      {r.nb_matchs} match{r.nb_matchs > 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-black tabular-nums text-[#00E676]">{note.toFixed(1)}</p>
                    <p className="text-[10px] text-[#7A9180]">note</p>
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
