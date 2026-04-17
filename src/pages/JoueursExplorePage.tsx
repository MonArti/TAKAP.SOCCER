import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '@/lib/supabase'
import { Card } from '@/components/Card'
import { Button } from '@/components/Button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { normalizeSearch, parseNoteMoyenne, ratingBandFromNote } from '@/lib/format'
import type { ProfileRow } from '@/types/database'
import { useAuth } from '@/contexts/AuthContext'
import {
  getDemoVillesJoueurs,
  getLaunchDemo,
  type LaunchDemoJoueur,
} from '@/lib/launch-demo'

const COMPARE_MAX = 3

type ProfileListRow = Pick<
  ProfileRow,
  'id' | 'pseudo' | 'age' | 'taille' | 'poids' | 'note_moyenne' | 'nb_matchs'
>

type ExplorerRow =
  | { kind: 'db'; profile: ProfileListRow }
  | { kind: 'demo'; j: LaunchDemoJoueur }

function rowKey(r: ExplorerRow): string {
  return r.kind === 'db' ? r.profile.id : `demo:${r.j.id}`
}

function filterExplorerRows(
  list: ExplorerRow[],
  opts: {
    q: string
    ville: string
    noteMin: string
    noteMax: string
    matchsMin: string
    ageMin: string
    ageMax: string
  },
): ExplorerRow[] {
  const qn = normalizeSearch(opts.q)
  const nMin = opts.noteMin === '' ? null : Number(opts.noteMin)
  const nMax = opts.noteMax === '' ? null : Number(opts.noteMax)
  const mMin = opts.matchsMin === '' ? null : Number.parseInt(opts.matchsMin, 10)
  const aMin = opts.ageMin === '' ? null : Number.parseInt(opts.ageMin, 10)
  const aMax = opts.ageMax === '' ? null : Number.parseInt(opts.ageMax, 10)
  const ville = opts.ville

  return list.filter((row) => {
    if (row.kind === 'demo') {
      const j = row.j
      if (ville && j.ville !== ville) return false
      const note = j.note
      if (nMin != null && !Number.isNaN(nMin) && note < nMin) return false
      if (nMax != null && !Number.isNaN(nMax) && note > nMax) return false
      if (mMin != null && !Number.isNaN(mMin) && j.matchs < mMin) return false
      if (aMin != null || aMax != null) return false
      if (qn) {
        const hay = normalizeSearch(`${j.prenom} ${j.ville} ${j.id} exemple`)
        if (!hay.includes(qn)) return false
      }
      return true
    }

    const p = row.profile
    if (ville) {
      /* pas de ville en base : on ne masque pas les réels quand une ville est choisie */
    }
    const note = parseNoteMoyenne(p.note_moyenne)
    if (nMin != null && !Number.isNaN(nMin) && note < nMin) return false
    if (nMax != null && !Number.isNaN(nMax) && note > nMax) return false
    if (mMin != null && !Number.isNaN(mMin) && p.nb_matchs < mMin) return false
    if (aMin != null && !Number.isNaN(aMin) && (p.age == null || p.age < aMin)) return false
    if (aMax != null && !Number.isNaN(aMax) && (p.age == null || p.age > aMax)) return false
    if (qn) {
      const hay = normalizeSearch(`${p.pseudo} ${p.id}`)
      if (!hay.includes(qn)) return false
    }
    return true
  })
}

export function JoueursExplorePage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [rows, setRows] = useState<ProfileListRow[]>([])
  const [err, setErr] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const [includeDemo, setIncludeDemo] = useState(true)
  const [q, setQ] = useState('')
  const [ville, setVille] = useState('')
  const [noteMin, setNoteMin] = useState('')
  const [noteMax, setNoteMax] = useState('')
  const [matchsMin, setMatchsMin] = useState('')
  const [ageMin, setAgeMin] = useState('')
  const [ageMax, setAgeMax] = useState('')
  const [compareKeys, setCompareKeys] = useState<string[]>([])

  const villesDemo = useMemo(() => getDemoVillesJoueurs(), [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from('profiles')
        .select('id, pseudo, age, taille, poids, note_moyenne, nb_matchs')
        .order('pseudo', { ascending: true })
      if (!cancelled) {
        if (error) setErr(error.message)
        else setRows((data as ProfileListRow[]) ?? [])
        setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const merged = useMemo((): ExplorerRow[] => {
    const db: ExplorerRow[] = rows.map((profile) => ({ kind: 'db', profile }))
    if (!includeDemo) return db
    const demo: ExplorerRow[] = getLaunchDemo().joueurs.map((j) => ({ kind: 'demo', j }))
    return [...db, ...demo]
  }, [rows, includeDemo])

  const filtres = useMemo(
    () => ({ q, ville, noteMin, noteMax, matchsMin, ageMin, ageMax }),
    [q, ville, noteMin, noteMax, matchsMin, ageMin, ageMax],
  )

  const filtered = useMemo(() => filterExplorerRows(merged, filtres), [merged, filtres])

  const community = useMemo(() => {
    const withMatch = rows.filter((p) => p.nb_matchs > 0)
    if (withMatch.length === 0) return { avgNote: null as number | null, avgNb: null as number | null }
    const avgNote =
      Math.round(
        (withMatch.reduce((s, p) => s + parseNoteMoyenne(p.note_moyenne), 0) / withMatch.length) * 100,
      ) / 100
    const avgNb =
      Math.round(
        (withMatch.reduce((s, p) => s + p.nb_matchs, 0) / withMatch.length) * 10,
      ) / 10
    return { avgNote, avgNb }
  }, [rows])

  const compareRows = useMemo(() => {
    return compareKeys
      .map((k) => merged.find((r) => rowKey(r) === k))
      .filter(Boolean) as ExplorerRow[]
  }, [compareKeys, merged])

  function toggleCompare(r: ExplorerRow) {
    const k = rowKey(r)
    if (r.kind === 'db' && r.profile.id === user?.id) return
    setCompareKeys((prev) => {
      if (prev.includes(k)) return prev.filter((x) => x !== k)
      if (prev.length >= COMPARE_MAX) return [...prev.slice(1), k]
      return [...prev, k]
    })
  }

  function resetFiltres() {
    setQ('')
    setVille('')
    setNoteMin('')
    setNoteMax('')
    setMatchsMin('')
    setAgeMin('')
    setAgeMax('')
  }

  const nDemo = includeDemo ? getLaunchDemo().joueurs.length : 0

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">{t('players.title')}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">{t('players.intro')}</p>
      </div>

      {community.avgNote != null && (
        <Card className="border-border bg-muted/40 text-sm text-muted-foreground shadow-none">
          <p>
            {t('players.community_avg', {
              note: community.avgNote.toFixed(2),
              matchs: community.avgNb,
            })}
          </p>
        </Card>
      )}

      {loading && <p className="text-sm font-medium text-muted-foreground">{t('common.loading')}</p>}
      {err && (
        <Card className="border-destructive/30 bg-destructive/5 text-sm text-destructive">{err}</Card>
      )}

      {!loading && !err && (
        <>
          <Card className="space-y-4 border-primary/15 bg-gradient-to-br from-primary/5 via-card to-card shadow-md ring-primary/10">
            <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-foreground">
              <input
                type="checkbox"
                checked={includeDemo}
                onChange={(e) => setIncludeDemo(e.target.checked)}
                className="size-4 rounded border-input text-primary focus:ring-2 focus:ring-ring"
              />
              {t('players.include_demo')}
            </label>
            <Separator />

            <div className="space-y-2">
              <Label htmlFor="joueurs-q" className="sr-only">
                {t('players.search_label')}
              </Label>
              <Input
                id="joueurs-q"
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={t('players.search_placeholder')}
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="j-ville" className="text-xs text-muted-foreground">
                {t('players.city_label')}
              </Label>
              <select
                id="j-ville"
                value={ville}
                onChange={(e) => setVille(e.target.value)}
                className="flex h-11 w-full rounded-lg border border-input bg-background px-3 text-sm shadow-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <option value="">{t('players.all_cities')}</option>
                {villesDemo.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <div className="space-y-2">
                <Label htmlFor="j-note-min" className="text-xs text-muted-foreground">
                  {t('players.note_min')}
                </Label>
                <Input
                  id="j-note-min"
                  type="number"
                  inputMode="decimal"
                  min={1}
                  max={5}
                  step={0.1}
                  value={noteMin}
                  onChange={(e) => setNoteMin(e.target.value)}
                  placeholder="ex. 3.5"
                  className="h-10"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="j-note-max" className="text-xs text-muted-foreground">
                  {t('players.note_max')}
                </Label>
                <Input
                  id="j-note-max"
                  type="number"
                  inputMode="decimal"
                  min={1}
                  max={5}
                  step={0.1}
                  value={noteMax}
                  onChange={(e) => setNoteMax(e.target.value)}
                  className="h-10"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="j-matchs-min" className="text-xs text-muted-foreground">
                  {t('players.matches_min')}
                </Label>
                <Input
                  id="j-matchs-min"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={matchsMin}
                  onChange={(e) => setMatchsMin(e.target.value)}
                  className="h-10"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="j-age-min" className="text-xs text-muted-foreground">
                  {t('players.age_min_real')}
                </Label>
                <Input
                  id="j-age-min"
                  type="number"
                  inputMode="numeric"
                  min={10}
                  max={99}
                  value={ageMin}
                  onChange={(e) => setAgeMin(e.target.value)}
                  className="h-10"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="j-age-max" className="text-xs text-muted-foreground">
                  {t('players.age_max_real')}
                </Label>
                <Input
                  id="j-age-max"
                  type="number"
                  inputMode="numeric"
                  min={10}
                  max={99}
                  value={ageMax}
                  onChange={(e) => setAgeMax(e.target.value)}
                  className="h-10"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button type="button" variant="secondary" onClick={resetFiltres} className="text-xs">
                {t('common.reset')}
              </Button>
              <span className="text-xs text-muted-foreground">
                {t('players.results_of', { filtered: filtered.length, real: rows.length })}
                {includeDemo && nDemo > 0 ? ` ${t('players.results_demo_extra', { count: nDemo })}` : ''}
                {compareKeys.length > 0
                  ? ` ${t('players.results_compare_extra', { count: compareKeys.length })}`
                  : ''}
              </span>
            </div>
          </Card>

          {compareRows.length >= 2 && (
            <Card className="border-primary/20 bg-primary/5 shadow-md">
              <h2 className="text-base font-semibold text-foreground">{t('players.compare_title')}</h2>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[380px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-border text-xs text-muted-foreground">
                      <th className="pb-2 pr-2 font-medium">{t('players.col_player')}</th>
                      <th className="pb-2 pr-2 font-medium">{t('players.col_city')}</th>
                      <th className="pb-2 pr-2 font-medium">{t('players.col_rating')}</th>
                      <th className="pb-2 pr-2 font-medium">{t('players.col_matches')}</th>
                      <th className="pb-2 pr-2 font-medium">{t('players.col_age')}</th>
                      <th className="pb-2 pr-2 font-medium">{t('players.col_height')}</th>
                      <th className="pb-2 font-medium">{t('players.col_level')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {compareRows.map((r) => {
                      if (r.kind === 'demo') {
                        const j = r.j
                        return (
                          <tr key={rowKey(r)} className="border-b border-border/60 last:border-0">
                            <td className="py-2 pr-2 font-medium">
                              <Link
                                to={`/demo/joueur/${j.id}`}
                                className="text-primary hover:underline"
                              >
                                {j.prenom}
                              </Link>
                              <span className="ms-1 text-[10px] font-bold uppercase text-amber-700">
                                {t('players.demo_short')}
                              </span>
                            </td>
                            <td className="py-2 pr-2">{j.ville}</td>
                            <td className="py-2 pr-2 tabular-nums">{j.note.toFixed(1)}</td>
                            <td className="py-2 pr-2 tabular-nums">{j.matchs}</td>
                            <td className="py-2 pr-2">{t('common.dash')}</td>
                            <td className="py-2 pr-2">{t('common.dash')}</td>
                            <td className="py-2 text-muted-foreground">
                              {t(`rating_bands.${ratingBandFromNote(j.note)}`)}
                            </td>
                          </tr>
                        )
                      }
                      const p = r.profile
                      const note = parseNoteMoyenne(p.note_moyenne)
                      return (
                        <tr key={rowKey(r)} className="border-b border-border/60 last:border-0">
                          <td className="py-2 pr-2 font-medium">
                            <Link to={`/joueur/${p.id}`} className="text-primary hover:underline">
                              {p.pseudo}
                            </Link>
                          </td>
                          <td className="py-2 pr-2 text-muted-foreground">{t('common.dash')}</td>
                          <td className="py-2 pr-2 tabular-nums">{note.toFixed(2)}</td>
                          <td className="py-2 pr-2 tabular-nums">{p.nb_matchs}</td>
                          <td className="py-2 pr-2">{p.age ?? '—'}</td>
                          <td className="py-2 pr-2">
                            {p.taille != null ? `${p.taille} cm` : '—'}
                          </td>
                          <td className="py-2 text-muted-foreground">
                            {t(`rating_bands.${ratingBandFromNote(note)}`)}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <button
                type="button"
                onClick={() => setCompareKeys([])}
                className="mt-3 text-xs font-semibold text-primary underline underline-offset-2 hover:text-primary/80"
              >
                {t('players.clear_selection')}
              </button>
            </Card>
          )}

          <ul className="space-y-2">
            {filtered.map((r) => {
              const k = rowKey(r)
              const selected = compareKeys.includes(k)

              if (r.kind === 'demo') {
                const j = r.j
                return (
                  <li
                    key={k}
                    className={`flex flex-col gap-2 rounded-xl border bg-card px-3 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between ${
                      selected ? 'border-primary/40 ring-2 ring-primary/20' : 'border-border'
                    }`}
                  >
                    <Link to={`/demo/joueur/${j.id}`} className="min-w-0 flex-1">
                      <span className="text-sm font-medium text-foreground">
                        {j.prenom}
                        <Badge
                          variant="secondary"
                          className="ml-2 rounded-md bg-amber-100 text-[10px] font-bold uppercase text-amber-900"
                        >
                          {t('players.badge_example')}
                        </Badge>
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {t('players.demo_subline', {
                          city: j.ville,
                          rating: j.note.toFixed(1),
                          matches: j.matchs,
                        })}
                      </span>
                    </Link>
                    <label className="flex shrink-0 cursor-pointer items-center gap-2 text-xs font-medium text-muted-foreground">
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => toggleCompare(r)}
                        className="size-4 rounded border-input text-primary focus:ring-2 focus:ring-ring"
                      />
                      {t('players.compare_checkbox')}
                    </label>
                  </li>
                )
              }

              const p = r.profile
              const note = parseNoteMoyenne(p.note_moyenne)
              const isSelf = p.id === user?.id
              return (
                <li
                  key={k}
                  className={`flex flex-col gap-2 rounded-xl border bg-card px-3 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between ${
                    selected ? 'border-primary/40 ring-2 ring-primary/20' : 'border-border'
                  }`}
                >
                  <Link to={`/joueur/${p.id}`} className="min-w-0 flex-1">
                    <span className="text-sm font-medium text-foreground">
                      {p.pseudo}
                      {isSelf && (
                        <span className="ms-2 text-xs font-normal text-primary">{t('players.you_label')}</span>
                      )}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {note.toFixed(2)}★ · {p.nb_matchs} {t('players.matches_word')}
                      {p.age != null && ` · ${t('players.years_old', { age: p.age })}`}
                      {p.taille != null && ` · ${t('players.height_cm_value', { h: p.taille })}`}
                    </span>
                  </Link>
                  <label
                    className={`flex shrink-0 items-center gap-2 text-xs font-medium ${
                      isSelf ? 'cursor-not-allowed text-muted-foreground/60' : 'cursor-pointer text-muted-foreground'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selected}
                      disabled={isSelf}
                      onChange={() => toggleCompare(r)}
                      className="size-4 rounded border-input text-primary focus:ring-2 focus:ring-ring disabled:opacity-50"
                    />
                    {isSelf ? t('common.dash') : t('players.compare_checkbox')}
                  </label>
                </li>
              )
            })}
          </ul>

          {filtered.length === 0 && (
            <p className="text-sm text-muted-foreground">{t('players.no_results')}</p>
          )}
        </>
      )}
    </div>
  )
}
