import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import type { MatchRow, ProfileRow } from '@/types/database'
import { Card } from '@/components/Card'
import { formatDateFr, formatHeure, euros } from '@/lib/format'

type MatchListItem = MatchRow & { nb_inscrits: number; organisateur_pseudo: string }

export function HomePage() {
  const [rows, setRows] = useState<MatchListItem[]>([])
  const [err, setErr] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      const { data: matchs, error: e1 } = await supabase
        .from('matchs')
        .select('*')
        .eq('statut', 'ouvert')
        .order('date_match', { ascending: true })
      if (e1) {
        if (!cancelled) setErr(e1.message)
        setLoading(false)
        return
      }
      const list = matchs ?? []
      if (list.length === 0) {
        if (!cancelled) {
          setRows([])
          setErr(null)
        }
        setLoading(false)
        return
      }
      const ids = list.map((m) => m.id)
      const orgIds = [...new Set(list.map((m) => m.organisateur_id))]
      const [{ data: parts }, { data: profs }] = await Promise.all([
        supabase.from('participations').select('match_id').in('match_id', ids),
        supabase.from('profiles').select('id, pseudo').in('id', orgIds),
      ])
      const countByMatch = new Map<string, number>()
      for (const p of parts ?? []) {
        countByMatch.set(p.match_id, (countByMatch.get(p.match_id) ?? 0) + 1)
      }
      const pseudoById = new Map<string, string>()
      for (const pr of (profs ?? []) as Pick<ProfileRow, 'id' | 'pseudo'>[]) {
        pseudoById.set(pr.id, pr.pseudo)
      }
      const enriched: MatchListItem[] = list.map((m) => ({
        ...m,
        nb_inscrits: countByMatch.get(m.id) ?? 0,
        organisateur_pseudo: pseudoById.get(m.organisateur_id) ?? 'Organisateur',
      }))
      if (!cancelled) {
        setRows(enriched)
        setErr(null)
      }
      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Matchs ouverts</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Réserve ta place — paiement simulé pour la V1 (aucun prélèvement).
        </p>
      </div>

      {loading && <p className="text-zinc-500">Chargement…</p>}
      {err && (
        <Card className="border-red-200 bg-red-50 text-sm text-red-800">
          {err}
        </Card>
      )}

      {!loading && rows.length === 0 && !err && (
        <Card>
          <p className="text-zinc-600">Aucun match ouvert pour le moment.</p>
          <Link
            to="/matchs/nouveau"
            className="mt-3 inline-block text-sm font-semibold text-brand-700 hover:underline"
          >
            Créer le premier match →
          </Link>
        </Card>
      )}

      <ul className="space-y-3">
        {rows.map((m) => {
          const places = Math.max(0, m.nb_max - m.nb_inscrits)
          return (
            <li key={m.id}>
              <Link to={`/matchs/${m.id}`}>
                <Card className="transition hover:border-brand-200 hover:shadow-md">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="font-semibold text-zinc-900">
                        {formatDateFr(m.date_match)} · {formatHeure(m.heure_match)}
                      </p>
                      <p className="mt-0.5 text-sm text-zinc-600">{m.lieu}</p>
                      <p className="mt-1 text-xs text-zinc-400">
                        Par <span className="font-medium text-zinc-600">{m.organisateur_pseudo}</span>
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-start gap-1 sm:items-end">
                      <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-semibold text-brand-800">
                        {places} place{places > 1 ? 's' : ''} restante{places > 1 ? 's' : ''}
                      </span>
                      <span className="text-sm font-medium text-zinc-700">{euros(Number(m.prix))} / joueur</span>
                    </div>
                  </div>
                </Card>
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
