import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { MatchRow, ProfileRow } from '@/types/database'
import { Card } from '@/components/Card'
import { euros, formatDateFr, formatHeure, formatHeureAffichage, normalizeSearch } from '@/lib/format'
import {
  getDemoMatchsOuverts,
  getDemoVillesJoueurs,
  resolveDemoMatchOuvert,
  type DemoOpenResolved,
} from '@/lib/launch-demo'

type MatchListItem = MatchRow & { nb_inscrits: number; organisateur_pseudo: string }

type HomeListItem =
  | { kind: 'real'; m: MatchListItem }
  | { kind: 'demo'; m: DemoOpenResolved }

function passesHomeFilters(
  item: HomeListItem,
  q: string,
  ville: string,
): boolean {
  const qn = normalizeSearch(q)
  if (ville) {
    const vn = normalizeSearch(ville)
    if (item.kind === 'demo') {
      if (normalizeSearch(item.m.lieuVille) !== vn) return false
    } else {
      if (!normalizeSearch(item.m.lieu).includes(vn)) return false
    }
  }
  if (qn) {
    if (item.kind === 'demo') {
      const hay = normalizeSearch(
        `${item.m.lieuLabel} ${item.m.orgPrenom} ${item.m.type} exemple`,
      )
      if (!hay.includes(qn)) return false
    } else {
      const hay = normalizeSearch(
        `${item.m.lieu} ${item.m.organisateur_pseudo} ${item.m.nb_max}`,
      )
      if (!hay.includes(qn)) return false
    }
  }
  return true
}

export function HomePage() {
  const { session } = useAuth()
  const authKey = session?.user?.id ?? 'anon'

  const [rows, setRows] = useState<MatchListItem[]>([])
  /** Erreur API : n’empêche pas l’affichage des exemples Takap embarqués. */
  const [remoteWarn, setRemoteWarn] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const [q, setQ] = useState('')
  const [ville, setVille] = useState('')
  const [showDemo, setShowDemo] = useState(true)

  const villesOptions = useMemo(() => {
    const fromDemo = getDemoVillesJoueurs()
    return ['', ...fromDemo]
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setRemoteWarn(null)
      const { data: matchs, error: e1 } = await supabase
        .from('matchs')
        .select('*')
        .eq('statut', 'ouvert')
        .order('date_match', { ascending: true })
      if (e1) {
        if (!cancelled) {
          setRows([])
          setRemoteWarn(
            `Les matchs en ligne n’ont pas pu être chargés (${e1.message}). Les exemples Takap ci-dessous restent disponibles.`,
          )
        }
        setLoading(false)
        return
      }
      const list = matchs ?? []
      if (list.length === 0) {
        if (!cancelled) {
          setRows([])
          setRemoteWarn(null)
        }
        setLoading(false)
        return
      }
      const ids = list.map((m) => m.id)
      const orgIds = [...new Set(list.map((m) => m.organisateur_id))]
      const [{ data: parts, error: e2 }, { data: profs, error: e3 }] = await Promise.all([
        supabase.from('participations').select('match_id').in('match_id', ids),
        supabase.from('profiles').select('id, pseudo').in('id', orgIds),
      ])
      const detailErr =
        e2 || e3
          ? `Détail des matchs incomplet (${[e2?.message, e3?.message].filter(Boolean).join(' ; ')}). Pseudos / places peuvent être approximatifs.`
          : null
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
        setRemoteWarn(detailErr)
      }
      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [authKey])

  const combined = useMemo(() => {
    const realItems: HomeListItem[] = rows.map((m) => ({ kind: 'real', m }))
    const demoRaw = getDemoMatchsOuverts()
    const demoItems: HomeListItem[] = showDemo
      ? demoRaw
          .map((d) => resolveDemoMatchOuvert(d))
          .filter(Boolean)
          .map((m) => ({ kind: 'demo', m: m as DemoOpenResolved }))
      : []
    const all = [...realItems, ...demoItems]
    return all.sort((a, b) => {
      const da = a.kind === 'real' ? a.m.date_match : a.m.date
      const db = b.kind === 'real' ? b.m.date_match : b.m.date
      return da < db ? -1 : da > db ? 1 : 0
    })
  }, [rows, showDemo])

  const filtered = useMemo(
    () => combined.filter((item) => passesHomeFilters(item, q, ville)),
    [combined, q, ville],
  )

  const demoCount = useMemo(() => filtered.filter((i) => i.kind === 'demo').length, [filtered])
  const realCount = useMemo(() => filtered.filter((i) => i.kind === 'real').length, [filtered])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Matchs ouverts</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Réserve ta place — paiement simulé pour la V1. La zone <strong>Recherche & filtres</strong> est
          juste en dessous (connecté ou non). Coche « exemples Takap » pour tester sans base remplie.
        </p>
        <p className="mt-2 text-[11px] text-zinc-400">
          Si tu ne vois pas ce bloc après déploiement : vide le cache du navigateur ou ouvre en navigation
          privée.
        </p>
      </div>

      <Card className="space-y-4 border-brand-100 bg-gradient-to-b from-brand-50/40 to-white">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-zinc-900">Recherche & filtres</h2>
          <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-zinc-700">
            <input
              type="checkbox"
              checked={showDemo}
              onChange={(e) => setShowDemo(e.target.checked)}
              className="h-4 w-4 rounded border-zinc-300 text-brand-600 focus:ring-brand-500"
            />
            Afficher les exemples Takap (données fictives comme du réel)
          </label>
        </div>
        <div>
          <label htmlFor="home-q" className="sr-only">
            Rechercher un match
          </label>
          <input
            id="home-q"
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Rechercher : lieu, organisateur…"
            className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 shadow-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200"
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="home-ville" className="block text-xs font-medium text-zinc-500">
              Ville (lieu du match)
            </label>
            <select
              id="home-ville"
              value={ville}
              onChange={(e) => setVille(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200"
            >
              <option value="">Toutes les villes</option>
              {villesOptions.filter(Boolean).map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-zinc-400">
              Pour les vrais matchs, on cherche la ville dans le texte du lieu.
            </p>
          </div>
          <div className="flex items-end">
            <button
              type="button"
              onClick={() => {
                setQ('')
                setVille('')
              }}
              className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 sm:w-auto"
            >
              Réinitialiser recherche
            </button>
          </div>
        </div>
        {!loading && (
          <p className="text-xs text-zinc-500">
            {filtered.length} résultat{filtered.length !== 1 ? 's' : ''}
            {showDemo && demoCount > 0 && ` · dont ${demoCount} exemple${demoCount > 1 ? 's' : ''}`}
            {realCount > 0 && ` · ${realCount} réel${realCount > 1 ? 's' : ''}`}
          </p>
        )}
      </Card>

      {loading && <p className="text-zinc-500">Chargement…</p>}
      {remoteWarn && (
        <Card className="border-amber-200 bg-amber-50 text-sm text-amber-950">{remoteWarn}</Card>
      )}

      {!loading && filtered.length === 0 && (
        <Card>
          <p className="text-zinc-600">Aucun match ne correspond à ces critères.</p>
          <p className="mt-2 text-sm text-zinc-500">
            Élargis la recherche ou réactive les exemples Takap pour tester l’app sans base remplie.
          </p>
          <Link
            to="/matchs/nouveau"
            className="mt-3 inline-block text-sm font-semibold text-brand-700 hover:underline"
          >
            Créer un vrai match →
          </Link>
        </Card>
      )}

      <ul className="space-y-3">
        {filtered.map((item) => {
          if (item.kind === 'real') {
            const m = item.m
            const places = Math.max(0, m.nb_max - m.nb_inscrits)
            return (
              <li key={`real-${m.id}`}>
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
                        <span className="text-sm font-medium text-zinc-700">
                          {euros(Number(m.prix))} / joueur
                        </span>
                      </div>
                    </div>
                  </Card>
                </Link>
              </li>
            )
          }

          const m = item.m
          const places = Math.max(0, m.nb_max - m.nb_inscrits)
          return (
            <li key={`demo-${m.id}`}>
              <Link to={`/demo/ouvert/${m.id}`}>
                <Card className="relative transition hover:border-amber-200 hover:shadow-md">
                  <span className="absolute right-3 top-3 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-900">
                    Exemple
                  </span>
                  <div className="flex flex-col gap-2 pr-16 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="font-semibold text-zinc-900">
                        {formatDateFr(m.date)} · {formatHeureAffichage(m.heure)}
                      </p>
                      <p className="mt-0.5 text-sm text-zinc-600">{m.lieuLabel}</p>
                      <p className="mt-1 text-xs text-zinc-400">
                        Par <span className="font-medium text-zinc-600">{m.orgPrenom}</span> (fictif)
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-start gap-1 sm:items-end">
                      <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-900">
                        {places} place{places > 1 ? 's' : ''} restante{places > 1 ? 's' : ''}
                      </span>
                      <span className="text-sm font-medium text-zinc-700">
                        {euros(Number(m.prix))} / joueur
                      </span>
                    </div>
                  </div>
                </Card>
              </Link>
            </li>
          )
        })}
      </ul>

      <div className="flex flex-wrap justify-center gap-4 border-t border-zinc-100 pt-4 text-center text-xs text-zinc-500">
        <Link to="/demo" className="font-semibold text-brand-700 hover:underline">
          Explorer démo (historique, scores, filtres joueurs)
        </Link>
        <Link to="/joueurs" className="font-semibold text-brand-700 hover:underline">
          Annuaire joueurs (connecté)
        </Link>
      </div>
    </div>
  )
}
