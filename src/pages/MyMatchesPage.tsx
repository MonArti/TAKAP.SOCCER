import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import type { MatchRow } from '@/types/database'
import { Card } from '@/components/Card'
import { formatDateFr, formatHeure } from '@/lib/format'

export function MyMatchesPage() {
  const { user } = useAuth()
  const [rows, setRows] = useState<MatchRow[]>([])
  const [err, setErr] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    let cancelled = false
    ;(async () => {
      const { data, error } = await supabase
        .from('matchs')
        .select('*')
        .eq('organisateur_id', user.id)
        .order('date_match', { ascending: false })
      if (!cancelled) {
        if (error) setErr(error.message)
        else setRows((data ?? []) as MatchRow[])
        setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [user])

  if (loading) return <p className="text-zinc-500">Chargement…</p>

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-zinc-900">Mes matchs (organisateur)</h1>
      {err && <Card className="border-red-200 bg-red-50 text-sm text-red-800">{err}</Card>}
      {rows.length === 0 && (
        <Card>
          <p className="text-zinc-600">Tu n’as pas encore créé de match.</p>
          <Link
            to="/matchs/nouveau"
            className="mt-2 inline-block text-sm font-semibold text-brand-700 hover:underline"
          >
            Créer un match →
          </Link>
        </Card>
      )}
      <ul className="space-y-2">
        {rows.map((m) => (
          <li key={m.id}>
            <Link to={`/matchs/${m.id}`}>
              <Card className="transition hover:border-brand-200">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium text-zinc-900">
                    {formatDateFr(m.date_match)} · {formatHeure(m.heure_match)}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                      m.statut === 'ouvert'
                        ? 'bg-emerald-50 text-emerald-800'
                        : 'bg-zinc-100 text-zinc-600'
                    }`}
                  >
                    {m.statut === 'ouvert' ? 'Ouvert' : 'Terminé'}
                  </span>
                </div>
                <p className="mt-1 truncate text-sm text-zinc-500">{m.lieu}</p>
              </Card>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
