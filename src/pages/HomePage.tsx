import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { MatchRow, ProfileRow } from '@/types/database'
import { MatchCard, type MatchCardStatus } from '@/components/MatchCard'
import { Card } from '@/components/Card'
import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { formatDateForApp, formatHeure, formatHeureAffichage, normalizeSearch } from '@/lib/format'
import {
  getDemoMatchsOuverts,
  getDemoVillesJoueurs,
  resolveDemoMatchOuvert,
  type DemoOpenResolved,
} from '@/lib/launch-demo'
import { MATCH_NIVEAUX, parseMatchNiveauParam, type MatchNiveau } from '@/lib/match-niveau'

type MatchListItem = MatchRow & { nb_inscrits: number; organisateur_pseudo: string }

type HomeListItem =
  | { kind: 'real'; m: MatchListItem }
  | { kind: 'demo'; m: DemoOpenResolved }

function passesHomeFilters(
  item: HomeListItem,
  q: string,
  ville: string,
  niveauFilter: MatchNiveau | null,
): boolean {
  if (niveauFilter) {
    if (item.kind === 'demo') return false
    const nv = item.m.niveau ?? 'amateur'
    if (nv !== niveauFilter) return false
  }
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

function isMatchDateToday(dateIso: string) {
  const today = new Date()
  const d = new Date(dateIso + 'T12:00:00')
  return (
    today.getFullYear() === d.getFullYear() &&
    today.getMonth() === d.getMonth() &&
    today.getDate() === d.getDate()
  )
}

function matchCardStatus(nbInscrits: number, nbMax: number, dateIso: string): MatchCardStatus {
  if (nbInscrits >= nbMax) return 'complet'
  if (isMatchDateToday(dateIso)) return 'aujourdhui'
  return 'ouvert'
}

function lieuVenueAndPin(lieu: string) {
  const comma = lieu.split(',').map((s) => s.trim())
  if (comma.length >= 2) {
    return { venue: comma[0] ?? lieu, pin: comma[comma.length - 1] ?? lieu }
  }
  const em = lieu.split(/\s—\s/)
  if (em.length >= 2) {
    return { venue: em[0] ?? lieu, pin: em[em.length - 1] ?? lieu }
  }
  return { venue: lieu, pin: lieu }
}

export function HomePage() {
  const { t } = useTranslation()
  const { session } = useAuth()
  const authKey = session?.user?.id ?? 'anon'
  const [searchParams, setSearchParams] = useSearchParams()
  const niveauFilter = parseMatchNiveauParam(searchParams.get('niveau'))

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
          setRemoteWarn(t('home.remote_load_error', { error: e1.message }))
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
          ? t('home.remote_detail_error', {
              detail: [e2?.message, e3?.message].filter(Boolean).join(' ; '),
            })
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
        organisateur_pseudo: pseudoById.get(m.organisateur_id) ?? t('common.organizer_fallback'),
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
  }, [authKey, t])

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
    () => combined.filter((item) => passesHomeFilters(item, q, ville, niveauFilter)),
    [combined, q, ville, niveauFilter],
  )

  function setNiveauInUrl(n: MatchNiveau) {
    const next = new URLSearchParams(searchParams)
    if (niveauFilter === n) {
      next.delete('niveau')
    } else {
      next.set('niveau', n)
    }
    setSearchParams(next, { replace: true })
  }

  const demoCount = useMemo(() => filtered.filter((i) => i.kind === 'demo').length, [filtered])
  const realCount = useMemo(() => filtered.filter((i) => i.kind === 'real').length, [filtered])

  const resultsLine = useMemo(() => {
    const bits: string[] = [t('home.results_summary', { count: filtered.length })]
    if (showDemo && demoCount > 0) bits.push(t('home.demo_part', { count: demoCount }))
    if (realCount > 0) bits.push(t('home.real_part', { count: realCount }))
    return bits.join(' · ')
  }, [t, filtered.length, showDemo, demoCount, realCount])

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-3xl font-black tracking-tight text-[#E8F0E9]">{t('home.title')}</h1>
          <Badge
            variant="secondary"
            className="rounded-full border border-[rgba(0,230,118,0.35)] bg-[rgba(0,230,118,0.12)] text-[11px] font-bold uppercase tracking-wide text-[#00E676]"
          >
            {t('common.live')}
          </Badge>
        </div>
        <p className="max-w-2xl text-sm leading-relaxed text-[#7A9180]">{t('home.intro')}</p>
        <p className="text-[11px] text-[#7A9180]/90">{t('home.cache_hint')}</p>
      </div>

      <Card className="space-y-4 border-[rgba(0,230,118,0.12)] bg-[#1A211B] shadow-[0_16px_48px_-32px_rgba(0,0,0,0.9)] ring-0">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-bold text-[#E8F0E9]">{t('home.filters_title')}</h2>
          <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-[#7A9180]">
            <input
              type="checkbox"
              checked={showDemo}
              onChange={(e) => setShowDemo(e.target.checked)}
              className="size-4 rounded border-[rgba(0,230,118,0.25)] bg-[#0A0E0B] text-[#00E676] focus:ring-2 focus:ring-[#00E676]/40"
            />
            {t('home.demo_examples')}
          </label>
        </div>
        <Separator className="bg-[rgba(0,230,118,0.1)]" />
        <div className="space-y-2">
          <p className="text-xs font-semibold text-[#7A9180]">{t('home.level')}</p>
          <div className="flex flex-wrap gap-2">
            {MATCH_NIVEAUX.map((n) => {
              const active = niveauFilter === n
              return (
                <Button
                  key={n}
                  type="button"
                  variant={active ? 'default' : 'outline'}
                  size="sm"
                  className={
                    active
                      ? 'bg-[#00E676] font-bold text-[#0A0E0B] hover:bg-[#00E676]/90'
                      : 'border-[rgba(0,230,118,0.25)] bg-transparent text-[#E8F0E9] hover:bg-[rgba(0,230,118,0.08)]'
                  }
                  onClick={() => setNiveauInUrl(n)}
                >
                  {t(`levels.${n}`)}
                </Button>
              )
            })}
          </div>
          <p className="text-[11px] text-[#7A9180]">{t('home.level_hint')}</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="home-q" className="sr-only">
            {t('home.search_label')}
          </Label>
          <Input
            id="home-q"
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t('home.search_placeholder')}
            className="h-11 border-[rgba(0,230,118,0.15)] bg-[#0A0E0B] text-base text-[#E8F0E9] placeholder:text-[#7A9180]/70 md:text-sm"
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="home-ville" className="text-xs text-[#7A9180]">
              {t('home.city_label')}
            </Label>
            <select
              id="home-ville"
              value={ville}
              onChange={(e) => setVille(e.target.value)}
              className="flex h-11 w-full rounded-lg border border-[rgba(0,230,118,0.15)] bg-[#0A0E0B] px-3 text-sm text-[#E8F0E9] shadow-sm outline-none focus-visible:border-[#00E676] focus-visible:ring-2 focus-visible:ring-[#00E676]/35"
            >
              <option value="">{t('home.all_cities')}</option>
              {villesOptions.filter(Boolean).map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
            <p className="text-xs text-[#7A9180]">{t('home.city_help')}</p>
          </div>
          <div className="flex flex-col items-stretch gap-2 sm:items-end">
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="h-11 w-full border-[rgba(0,230,118,0.25)] bg-transparent text-[#E8F0E9] hover:bg-[rgba(0,230,118,0.08)] sm:w-auto"
              onClick={() => {
                setQ('')
                setVille('')
              }}
            >
              {t('common.reset')}
            </Button>
            <Link
              to="/matchs/nouveau"
              className={cn(
                buttonVariants({ variant: 'default', size: 'lg' }),
                'h-11 w-full justify-center bg-[#00E676] font-bold text-[#0A0E0B] shadow-[0_0_24px_-8px_rgba(0,230,118,0.75)] hover:brightness-110 sm:w-auto',
              )}
            >
              {t('home.create_match')}
            </Link>
          </div>
        </div>
        {!loading && (
          <p className="text-xs text-[#7A9180]">
            {resultsLine}
          </p>
        )}
      </Card>

      {loading && <p className="text-sm font-medium text-[#7A9180]">{t('common.loading_matches')}</p>}
      {remoteWarn && (
        <Card className="border border-amber-500/35 bg-amber-500/10 text-sm text-amber-100 shadow-none">
          {remoteWarn}
        </Card>
      )}

      {!loading && filtered.length === 0 && (
        <Card className="border border-dashed border-[rgba(0,230,118,0.2)] bg-[#1A211B]">
          <p className="text-[#E8F0E9]">{t('home.no_results')}</p>
          <p className="mt-2 text-sm text-[#7A9180]">{t('home.no_results_hint')}</p>
          <Link
            to="/matchs/nouveau"
            className={cn(
              buttonVariants({ variant: 'default', size: 'lg' }),
              'mt-4 inline-flex h-11 justify-center bg-[#00E676] font-bold text-[#0A0E0B] shadow-[0_0_24px_-8px_rgba(0,230,118,0.75)] hover:brightness-110',
            )}
          >
            {t('home.create_real_match')}
          </Link>
        </Card>
      )}

      <ul className="space-y-4">
        {filtered.map((item) => {
          if (item.kind === 'real') {
            const m = item.m
            const { venue, pin } = lieuVenueAndPin(m.lieu)
            const status = matchCardStatus(m.nb_inscrits, m.nb_max, m.date_match)
            return (
              <li key={`real-${m.id}`}>
                <MatchCard
                  to={`/matchs/${m.id}`}
                  variant="real"
                  nbMax={m.nb_max}
                  venueTitle={venue}
                  lieuPin={pin}
                  organizerDisplay={m.organisateur_pseudo}
                  nbInscrits={m.nb_inscrits}
                  prix={Number(m.prix)}
                  dateLine={`${formatDateForApp(m.date_match)} · ${formatHeure(m.heure_match)}`}
                  status={status}
                  niveauLabel={t(`levels.${(m.niveau ?? 'amateur') as MatchNiveau}`)}
                />
              </li>
            )
          }

          const m = item.m
          const demoVenue = m.lieuLabel.split('—')[0]?.trim() ?? m.lieuLabel
          const status = matchCardStatus(m.nb_inscrits, m.nb_max, m.date)
          return (
            <li key={`demo-${m.id}`}>
              <MatchCard
                to={`/demo/ouvert/${m.id}`}
                variant="demo"
                nbMax={m.nb_max}
                venueTitle={demoVenue}
                lieuPin={m.lieuVille}
                organizerDisplay={m.orgPrenom}
                nbInscrits={m.nb_inscrits}
                prix={Number(m.prix)}
                dateLine={`${formatDateForApp(m.date)} · ${formatHeureAffichage(m.heure)}`}
                status={status}
              />
            </li>
          )
        })}
      </ul>

      <Separator className="bg-[rgba(0,230,118,0.1)]" />
      <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-center text-xs text-[#7A9180]">
        <Link to="/demo" className="font-bold text-[#00E676] transition hover:underline">
          {t('home.link_demo')}
        </Link>
        <Link to="/joueurs" className="font-bold text-[#00E676] transition hover:underline">
          {t('home.link_players_dir')}
        </Link>
      </div>
    </div>
  )
}
