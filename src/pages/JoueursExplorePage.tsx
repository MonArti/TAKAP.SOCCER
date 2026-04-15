import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Card } from '@/components/Card'
import {
  niveauIndicatifFromNote,
  normalizeSearch,
  parseNoteMoyenne,
} from '@/lib/format'
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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Joueurs</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Recherche, filtres et comparaison. Les profils <strong>Exemple</strong> viennent du même jeu de
          données que sur l’accueil — pour tester sans remplir la base.
        </p>
      </div>

      {community.avgNote != null && (
        <Card className="border-zinc-100 bg-zinc-50/80 text-sm text-zinc-700">
          <p>
            <strong className="text-zinc-900">Moyennes communauté (réel)</strong> — joueurs avec au moins 1
            match terminé : note ~{community.avgNote.toFixed(2)}/5 · {community.avgNb} matchs en moyenne.
          </p>
        </Card>
      )}

      {loading && <p className="text-zinc-500">Chargement…</p>}
      {err && (
        <Card className="border-red-200 bg-red-50 text-sm text-red-800">{err}</Card>
      )}

      {!loading && !err && (
        <>
          <Card className="space-y-4 border-brand-100 bg-gradient-to-b from-brand-50/30 to-white">
            <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-zinc-800">
              <input
                type="checkbox"
                checked={includeDemo}
                onChange={(e) => setIncludeDemo(e.target.checked)}
                className="h-4 w-4 rounded border-zinc-300 text-brand-600 focus:ring-brand-500"
              />
              Inclure les profils d’exemple Takap (même rendu qu’un vrai profil)
            </label>

            <div>
              <label htmlFor="joueurs-q" className="sr-only">
                Rechercher un joueur
              </label>
              <input
                id="joueurs-q"
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Rechercher : pseudo, prénom (exemple), ville…"
                className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 shadow-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200"
              />
            </div>

            <div>
              <label htmlFor="j-ville" className="block text-xs font-medium text-zinc-500">
                Ville (filtre sur les exemples ; les vrais profils n’ont pas encore de ville en base)
              </label>
              <select
                id="j-ville"
                value={ville}
                onChange={(e) => setVille(e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200"
              >
                <option value="">Toutes</option>
                {villesDemo.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <div>
                <label htmlFor="j-note-min" className="block text-xs font-medium text-zinc-500">
                  Note min
                </label>
                <input
                  id="j-note-min"
                  type="number"
                  inputMode="decimal"
                  min={1}
                  max={5}
                  step={0.1}
                  value={noteMin}
                  onChange={(e) => setNoteMin(e.target.value)}
                  placeholder="ex. 3.5"
                  className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200"
                />
              </div>
              <div>
                <label htmlFor="j-note-max" className="block text-xs font-medium text-zinc-500">
                  Note max
                </label>
                <input
                  id="j-note-max"
                  type="number"
                  inputMode="decimal"
                  min={1}
                  max={5}
                  step={0.1}
                  value={noteMax}
                  onChange={(e) => setNoteMax(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200"
                />
              </div>
              <div>
                <label htmlFor="j-matchs-min" className="block text-xs font-medium text-zinc-500">
                  Matchs min.
                </label>
                <input
                  id="j-matchs-min"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={matchsMin}
                  onChange={(e) => setMatchsMin(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200"
                />
              </div>
              <div>
                <label htmlFor="j-age-min" className="block text-xs font-medium text-zinc-500">
                  Âge min (réels)
                </label>
                <input
                  id="j-age-min"
                  type="number"
                  inputMode="numeric"
                  min={10}
                  max={99}
                  value={ageMin}
                  onChange={(e) => setAgeMin(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200"
                />
              </div>
              <div>
                <label htmlFor="j-age-max" className="block text-xs font-medium text-zinc-500">
                  Âge max (réels)
                </label>
                <input
                  id="j-age-max"
                  type="number"
                  inputMode="numeric"
                  min={10}
                  max={99}
                  value={ageMax}
                  onChange={(e) => setAgeMax(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={resetFiltres}
                className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100"
              >
                Réinitialiser
              </button>
              <span className="text-xs text-zinc-500">
                {filtered.length} résultat{filtered.length !== 1 ? 's' : ''} sur {rows.length} réel
                {rows.length !== 1 ? 's' : ''}
                {includeDemo ? ` + ${nDemo} exemple${nDemo > 1 ? 's' : ''}` : ''}
                {compareKeys.length > 0 && ` · ${compareKeys.length} en comparaison`}
              </span>
            </div>
          </Card>

          {compareRows.length >= 2 && (
            <Card className="border-brand-200 bg-brand-50/40">
              <h2 className="text-base font-semibold text-zinc-900">Comparaison</h2>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[380px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-zinc-200 text-xs text-zinc-500">
                      <th className="pb-2 pr-2 font-medium">Joueur</th>
                      <th className="pb-2 pr-2 font-medium">Ville</th>
                      <th className="pb-2 pr-2 font-medium">Note</th>
                      <th className="pb-2 pr-2 font-medium">Matchs</th>
                      <th className="pb-2 pr-2 font-medium">Âge</th>
                      <th className="pb-2 pr-2 font-medium">Taille</th>
                      <th className="pb-2 font-medium">Niveau</th>
                    </tr>
                  </thead>
                  <tbody>
                    {compareRows.map((r) => {
                      if (r.kind === 'demo') {
                        const j = r.j
                        return (
                          <tr key={rowKey(r)} className="border-b border-zinc-100 last:border-0">
                            <td className="py-2 pr-2 font-medium">
                              <Link
                                to={`/demo/joueur/${j.id}`}
                                className="text-brand-800 hover:underline"
                              >
                                {j.prenom}
                              </Link>
                              <span className="ml-1 text-[10px] font-bold uppercase text-amber-700">
                                ex.
                              </span>
                            </td>
                            <td className="py-2 pr-2">{j.ville}</td>
                            <td className="py-2 pr-2 tabular-nums">{j.note.toFixed(1)}</td>
                            <td className="py-2 pr-2 tabular-nums">{j.matchs}</td>
                            <td className="py-2 pr-2">—</td>
                            <td className="py-2 pr-2">—</td>
                            <td className="py-2 text-zinc-600">{niveauIndicatifFromNote(j.note)}</td>
                          </tr>
                        )
                      }
                      const p = r.profile
                      const note = parseNoteMoyenne(p.note_moyenne)
                      return (
                        <tr key={rowKey(r)} className="border-b border-zinc-100 last:border-0">
                          <td className="py-2 pr-2 font-medium">
                            <Link to={`/joueur/${p.id}`} className="text-brand-800 hover:underline">
                              {p.pseudo}
                            </Link>
                          </td>
                          <td className="py-2 pr-2 text-zinc-400">—</td>
                          <td className="py-2 pr-2 tabular-nums">{note.toFixed(2)}</td>
                          <td className="py-2 pr-2 tabular-nums">{p.nb_matchs}</td>
                          <td className="py-2 pr-2">{p.age ?? '—'}</td>
                          <td className="py-2 pr-2">
                            {p.taille != null ? `${p.taille} cm` : '—'}
                          </td>
                          <td className="py-2 text-zinc-600">{niveauIndicatifFromNote(note)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <button
                type="button"
                onClick={() => setCompareKeys([])}
                className="mt-3 text-xs font-medium text-zinc-600 underline hover:text-zinc-900"
              >
                Vider la sélection
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
                    className={`flex flex-col gap-2 rounded-xl border bg-white px-3 py-3 sm:flex-row sm:items-center sm:justify-between ${
                      selected ? 'border-brand-300 ring-1 ring-brand-200' : 'border-zinc-200'
                    }`}
                  >
                    <Link to={`/demo/joueur/${j.id}`} className="min-w-0 flex-1">
                      <span className="text-sm font-medium text-zinc-900">
                        {j.prenom}
                        <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-amber-900">
                          Exemple
                        </span>
                      </span>
                      <span className="block text-xs text-zinc-500">
                        {j.ville} · {j.note.toFixed(1)}★ · {j.matchs} matchs (fictif)
                      </span>
                    </Link>
                    <label className="flex shrink-0 cursor-pointer items-center gap-2 text-xs font-medium text-zinc-600">
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => toggleCompare(r)}
                        className="h-4 w-4 rounded border-zinc-300 text-brand-600 focus:ring-brand-500"
                      />
                      Comparer
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
                  className={`flex flex-col gap-2 rounded-xl border bg-white px-3 py-3 sm:flex-row sm:items-center sm:justify-between ${
                    selected ? 'border-brand-300 ring-1 ring-brand-200' : 'border-zinc-200'
                  }`}
                >
                  <Link to={`/joueur/${p.id}`} className="min-w-0 flex-1">
                    <span className="text-sm font-medium text-zinc-900">
                      {p.pseudo}
                      {isSelf && (
                        <span className="ml-2 text-xs font-normal text-brand-700">(vous)</span>
                      )}
                    </span>
                    <span className="block text-xs text-zinc-500">
                      {note.toFixed(2)}★ · {p.nb_matchs} matchs
                      {p.age != null && ` · ${p.age} ans`}
                      {p.taille != null && ` · ${p.taille} cm`}
                    </span>
                  </Link>
                  <label
                    className={`flex shrink-0 items-center gap-2 text-xs font-medium ${
                      isSelf ? 'cursor-not-allowed text-zinc-400' : 'cursor-pointer text-zinc-600'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selected}
                      disabled={isSelf}
                      onChange={() => toggleCompare(r)}
                      className="h-4 w-4 rounded border-zinc-300 text-brand-600 focus:ring-brand-500 disabled:opacity-50"
                    />
                    {isSelf ? '—' : 'Comparer'}
                  </label>
                </li>
              )
            })}
          </ul>

          {filtered.length === 0 && (
            <p className="text-sm text-zinc-500">Aucun profil ne correspond à ces critères.</p>
          )}
        </>
      )}
    </div>
  )
}
