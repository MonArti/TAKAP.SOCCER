import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { MatchRow, ProfileRow } from '@/types/database'
import { Card } from '@/components/Card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
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
    <div className="space-y-8">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Matchs ouverts</h1>
          <Badge variant="secondary" className="rounded-full border border-primary/20 bg-primary/10 text-primary">
            Live
          </Badge>
        </div>
        <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Réserve ta place — paiement simulé pour la V1. Filtre par lieu ou organisateur ; coche « exemples
          Takap » pour tester sans base remplie.
        </p>
        <p className="text-[11px] text-muted-foreground/80">
          Si ce bloc n’apparaît pas après déploiement : vide le cache ou ouvre en navigation privée.
        </p>
      </div>

      <Card className="space-y-4 border-primary/15 bg-gradient-to-br from-primary/5 via-card to-card shadow-md ring-1 ring-primary/10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-foreground">Recherche & filtres</h2>
          <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-foreground">
            <input
              type="checkbox"
              checked={showDemo}
              onChange={(e) => setShowDemo(e.target.checked)}
              className="size-4 rounded border-input text-primary focus:ring-2 focus:ring-ring"
            />
            Exemples Takap
          </label>
        </div>
        <Separator />
        <div className="space-y-2">
          <Label htmlFor="home-q" className="sr-only">
            Rechercher un match
          </Label>
          <Input
            id="home-q"
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Lieu, organisateur…"
            className="h-11 border-border bg-background text-base md:text-sm"
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="home-ville" className="text-xs text-muted-foreground">
              Ville (lieu du match)
            </Label>
            <select
              id="home-ville"
              value={ville}
              onChange={(e) => setVille(e.target.value)}
              className="flex h-11 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground shadow-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <option value="">Toutes les villes</option>
              {villesOptions.filter(Boolean).map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">
              Pour les vrais matchs, la ville est détectée dans le texte du lieu.
            </p>
          </div>
          <div className="flex items-end">
            <button
              type="button"
              onClick={() => {
                setQ('')
                setVille('')
              }}
              className="h-11 w-full rounded-lg border border-border bg-muted/50 px-4 text-sm font-medium text-foreground transition hover:bg-muted sm:w-auto"
            >
              Réinitialiser
            </button>
          </div>
        </div>
        {!loading && (
          <p className="text-xs text-muted-foreground">
            {filtered.length} résultat{filtered.length !== 1 ? 's' : ''}
            {showDemo && demoCount > 0 && ` · dont ${demoCount} exemple${demoCount > 1 ? 's' : ''}`}
            {realCount > 0 && ` · ${realCount} réel${realCount > 1 ? 's' : ''}`}
          </p>
        )}
      </Card>

      {loading && (
        <p className="text-sm font-medium text-muted-foreground">Chargement des matchs…</p>
      )}
      {remoteWarn && (
        <Card className="border-amber-200/80 bg-amber-50 text-sm text-amber-950 shadow-none">
          {remoteWarn}
        </Card>
      )}

      {!loading && filtered.length === 0 && (
        <Card className="border-dashed border-muted-foreground/25">
          <p className="text-foreground">Aucun match ne correspond à ces critères.</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Élargis la recherche ou réactive les exemples Takap.
          </p>
          <Link
            to="/matchs/nouveau"
            className="mt-4 inline-flex text-sm font-semibold text-primary hover:underline"
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
                <Link to={`/matchs/${m.id}`} className="block">
                  <Card className="transition hover:border-primary/30 hover:shadow-md">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 space-y-1">
                        <p className="font-semibold text-foreground">
                          {formatDateFr(m.date_match)} · {formatHeure(m.heure_match)}
                        </p>
                        <p className="text-sm text-muted-foreground">{m.lieu}</p>
                        <p className="text-xs text-muted-foreground">
                          Par{' '}
                          <span className="font-medium text-foreground/90">{m.organisateur_pseudo}</span>
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
                        <Badge className="rounded-full bg-primary/15 font-semibold text-primary hover:bg-primary/20">
                          {places} place{places > 1 ? 's' : ''} restante{places > 1 ? 's' : ''}
                        </Badge>
                        <span className="text-sm font-semibold text-foreground">
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
              <Link to={`/demo/ouvert/${m.id}`} className="block">
                <Card className="relative transition hover:border-amber-300/60 hover:shadow-md">
                  <Badge
                    variant="secondary"
                    className="absolute right-4 top-4 rounded-full bg-amber-100 text-[10px] font-bold uppercase tracking-wide text-amber-900"
                  >
                    Exemple
                  </Badge>
                  <div className="flex flex-col gap-3 pr-20 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 space-y-1">
                      <p className="font-semibold text-foreground">
                        {formatDateFr(m.date)} · {formatHeureAffichage(m.heure)}
                      </p>
                      <p className="text-sm text-muted-foreground">{m.lieuLabel}</p>
                      <p className="text-xs text-muted-foreground">
                        Par <span className="font-medium text-foreground/90">{m.orgPrenom}</span> (fictif)
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
                      <Badge
                        variant="secondary"
                        className="rounded-full bg-amber-100 font-semibold text-amber-900"
                      >
                        {places} place{places > 1 ? 's' : ''} restante{places > 1 ? 's' : ''}
                      </Badge>
                      <span className="text-sm font-semibold text-foreground">
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

      <Separator />
      <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-center text-xs text-muted-foreground">
        <Link to="/demo" className="font-semibold text-primary hover:underline">
          Explorer la démo
        </Link>
        <Link to="/joueurs" className="font-semibold text-primary hover:underline">
          Annuaire joueurs
        </Link>
      </div>
    </div>
  )
}
