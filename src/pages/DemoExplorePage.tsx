import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Card } from '@/components/Card'
import { formatDateFr, niveauIndicatifFromNote, normalizeSearch } from '@/lib/format'
import {
  getLaunchDemo,
  getLieuById,
  getJoueurById,
  getMatchsHistoriqueDesc,
  getDemoVillesJoueurs,
  getDemoMatchFormats,
  getDemoVillesMatchs,
  type LaunchDemoJoueur,
  type LaunchDemoMatch,
} from '@/lib/launch-demo'

const COMPARE_MAX = 3

function filterJoueurs(
  list: LaunchDemoJoueur[],
  opts: {
    q: string
    ville: string
    noteMin: string
    noteMax: string
    matchsMin: string
  },
): LaunchDemoJoueur[] {
  const qn = normalizeSearch(opts.q)
  const nMin = opts.noteMin === '' ? null : Number(opts.noteMin)
  const nMax = opts.noteMax === '' ? null : Number(opts.noteMax)
  const mMin = opts.matchsMin === '' ? null : Number.parseInt(opts.matchsMin, 10)

  return list.filter((j) => {
    if (opts.ville && j.ville !== opts.ville) return false
    if (nMin != null && !Number.isNaN(nMin) && j.note < nMin) return false
    if (nMax != null && !Number.isNaN(nMax) && j.note > nMax) return false
    if (mMin != null && !Number.isNaN(mMin) && j.matchs < mMin) return false
    if (qn) {
      const hay = normalizeSearch(`${j.prenom} ${j.ville} ${j.id}`)
      if (!hay.includes(qn)) return false
    }
    return true
  })
}

function filterMatchs(
  list: LaunchDemoMatch[],
  opts: { q: string; ville: string; format: string },
): LaunchDemoMatch[] {
  const qn = normalizeSearch(opts.q)
  return list.filter((m) => {
    if (opts.format && m.type !== opts.format) return false
    const lieu = getLieuById(m.lieu_id)
    if (opts.ville && (!lieu || lieu.ville !== opts.ville)) return false
    if (qn) {
      const org = getJoueurById(m.org_id)
      const hay = normalizeSearch(
        `${lieu?.nom ?? ''} ${lieu?.ville ?? ''} ${lieu?.type ?? ''} ${org?.prenom ?? ''} ${m.id}`,
      )
      if (!hay.includes(qn)) return false
    }
    return true
  })
}

export function DemoExplorePage() {
  const { joueurs } = getLaunchDemo()
  const matchsAll = getMatchsHistoriqueDesc()
  const villesJoueurs = getDemoVillesJoueurs()
  const villesMatchs = getDemoVillesMatchs()
  const formatsMatch = getDemoMatchFormats()

  const [qJoueur, setQJoueur] = useState('')
  const [villeJoueur, setVilleJoueur] = useState('')
  const [noteMin, setNoteMin] = useState('')
  const [noteMax, setNoteMax] = useState('')
  const [matchsMin, setMatchsMin] = useState('')
  const [compareIds, setCompareIds] = useState<string[]>([])

  const [qMatch, setQMatch] = useState('')
  const [villeMatch, setVilleMatch] = useState('')
  const [formatMatch, setFormatMatch] = useState('')

  const joueursFiltres = useMemo(
    () =>
      filterJoueurs(joueurs, {
        q: qJoueur,
        ville: villeJoueur,
        noteMin,
        noteMax,
        matchsMin,
      }),
    [joueurs, qJoueur, villeJoueur, noteMin, noteMax, matchsMin],
  )

  const matchsFiltres = useMemo(
    () => filterMatchs(matchsAll, { q: qMatch, ville: villeMatch, format: formatMatch }),
    [matchsAll, qMatch, villeMatch, formatMatch],
  )

  const compareJoueurs = useMemo(
    () => compareIds.map((id) => getJoueurById(id)).filter(Boolean) as LaunchDemoJoueur[],
    [compareIds],
  )

  function toggleCompare(id: string) {
    setCompareIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id)
      if (prev.length >= COMPARE_MAX) return [...prev.slice(1), id]
      return [...prev, id]
    })
  }

  function resetFiltresJoueurs() {
    setQJoueur('')
    setVilleJoueur('')
    setNoteMin('')
    setNoteMax('')
    setMatchsMin('')
  }

  function resetFiltresMatchs() {
    setQMatch('')
    setVilleMatch('')
    setFormatMatch('')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Démo lancement</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Historique et joueurs <strong>100 % fictifs</strong> — recherche, filtres et comparaison pour
          t’entraîner avant les vrais profils. Les matchs ouverts restent sur l’accueil.
        </p>
      </div>

      <div
        role="note"
        className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"
      >
        Données lues depuis un JSON embarqué — rien n’est écrit dans Supabase.
      </div>

      <section>
        <h2 className="text-lg font-semibold text-zinc-900">Joueurs fictifs</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Recherche par prénom ou ville, affine avec les filtres, puis coche jusqu’à {COMPARE_MAX} joueurs
          pour les comparer côte à côte.
        </p>

        <Card className="mt-4 space-y-4">
          <div>
            <label htmlFor="demo-search-joueur" className="sr-only">
              Rechercher un joueur
            </label>
            <input
              id="demo-search-joueur"
              type="search"
              value={qJoueur}
              onChange={(e) => setQJoueur(e.target.value)}
              placeholder="Rechercher (prénom, ville, id…)"
              className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label htmlFor="demo-ville-j" className="block text-xs font-medium text-zinc-500">
                Ville
              </label>
              <select
                id="demo-ville-j"
                value={villeJoueur}
                onChange={(e) => setVilleJoueur(e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200"
              >
                <option value="">Toutes</option>
                {villesJoueurs.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="demo-note-min" className="block text-xs font-medium text-zinc-500">
                Note min (/5)
              </label>
              <input
                id="demo-note-min"
                type="number"
                inputMode="decimal"
                min={1}
                max={5}
                step={0.1}
                value={noteMin}
                onChange={(e) => setNoteMin(e.target.value)}
                placeholder="ex. 3.5"
                className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200"
              />
            </div>
            <div>
              <label htmlFor="demo-note-max" className="block text-xs font-medium text-zinc-500">
                Note max (/5)
              </label>
              <input
                id="demo-note-max"
                type="number"
                inputMode="decimal"
                min={1}
                max={5}
                step={0.1}
                value={noteMax}
                onChange={(e) => setNoteMax(e.target.value)}
                placeholder="ex. 4.5"
                className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200"
              />
            </div>
            <div>
              <label htmlFor="demo-matchs-min" className="block text-xs font-medium text-zinc-500">
                Matchs min.
              </label>
              <input
                id="demo-matchs-min"
                type="number"
                inputMode="numeric"
                min={0}
                step={1}
                value={matchsMin}
                onChange={(e) => setMatchsMin(e.target.value)}
                placeholder="ex. 5"
                className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={resetFiltresJoueurs}
              className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100"
            >
              Réinitialiser les filtres
            </button>
            <span className="text-xs text-zinc-500">
              {joueursFiltres.length} résultat{joueursFiltres.length !== 1 ? 's' : ''}
              {compareIds.length > 0 && ` · ${compareIds.length} sélectionné(s) pour comparaison`}
            </span>
          </div>
        </Card>

        {compareJoueurs.length >= 2 && (
          <Card className="mt-4 border-brand-200 bg-brand-50/40">
            <h3 className="text-base font-semibold text-zinc-900">Comparaison</h3>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[320px] text-left text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 text-xs text-zinc-500">
                    <th className="pb-2 pr-3 font-medium">Joueur</th>
                    <th className="pb-2 pr-3 font-medium">Ville</th>
                    <th className="pb-2 pr-3 font-medium">Note</th>
                    <th className="pb-2 pr-3 font-medium">Matchs</th>
                    <th className="pb-2 font-medium">Niveau (indic.)</th>
                  </tr>
                </thead>
                <tbody className="text-zinc-800">
                  {compareJoueurs.map((j) => (
                    <tr key={j.id} className="border-b border-zinc-100 last:border-0">
                      <td className="py-2 pr-3 font-medium">
                        <Link to={`/demo/joueur/${j.id}`} className="text-brand-800 hover:underline">
                          {j.prenom}
                        </Link>
                      </td>
                      <td className="py-2 pr-3">{j.ville}</td>
                      <td className="py-2 pr-3 tabular-nums">{j.note.toFixed(1)}</td>
                      <td className="py-2 pr-3 tabular-nums">{j.matchs}</td>
                      <td className="py-2 text-zinc-600">{niveauIndicatifFromNote(j.note)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button
              type="button"
              onClick={() => setCompareIds([])}
              className="mt-3 text-xs font-medium text-zinc-600 underline hover:text-zinc-900"
            >
              Vider la sélection
            </button>
          </Card>
        )}

        <ul className="mt-4 space-y-2">
          {joueursFiltres.map((j) => {
            const selected = compareIds.includes(j.id)
            return (
              <li
                key={j.id}
                className={`flex flex-col gap-2 rounded-xl border bg-white px-3 py-3 transition sm:flex-row sm:items-center sm:justify-between ${
                  selected ? 'border-brand-300 ring-1 ring-brand-200' : 'border-zinc-200'
                }`}
              >
                <Link
                  to={`/demo/joueur/${j.id}`}
                  className="min-w-0 flex-1 text-sm font-medium text-zinc-900 hover:text-brand-800"
                >
                  <span className="block">{j.prenom}</span>
                  <span className="block text-xs font-normal text-zinc-500">
                    {j.ville} · {j.note.toFixed(1)}★ · {j.matchs} matchs
                  </span>
                </Link>
                <label className="flex shrink-0 cursor-pointer items-center gap-2 text-xs font-medium text-zinc-600">
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={() => toggleCompare(j.id)}
                    className="h-4 w-4 rounded border-zinc-300 text-brand-600 focus:ring-brand-500"
                  />
                  Comparer
                </label>
              </li>
            )
          })}
        </ul>
        {joueursFiltres.length === 0 && (
          <p className="mt-3 text-sm text-zinc-500">Aucun joueur ne correspond à ces critères.</p>
        )}
      </section>

      <section>
        <h2 className="text-lg font-semibold text-zinc-900">Matchs passés (scores)</h2>
        <p className="mt-1 text-sm text-zinc-500">Recherche par lieu ou organisateur ; filtre ville et format.</p>

        <Card className="mt-4 space-y-4">
          <div>
            <label htmlFor="demo-search-match" className="sr-only">
              Rechercher un match
            </label>
            <input
              id="demo-search-match"
              type="search"
              value={qMatch}
              onChange={(e) => setQMatch(e.target.value)}
              placeholder="Rechercher (nom du lieu, ville, organisateur…)"
              className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="demo-ville-m" className="block text-xs font-medium text-zinc-500">
                Ville du lieu
              </label>
              <select
                id="demo-ville-m"
                value={villeMatch}
                onChange={(e) => setVilleMatch(e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200"
              >
                <option value="">Toutes</option>
                {villesMatchs.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="demo-format-m" className="block text-xs font-medium text-zinc-500">
                Format
              </label>
              <select
                id="demo-format-m"
                value={formatMatch}
                onChange={(e) => setFormatMatch(e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200"
              >
                <option value="">Tous</option>
                {formatsMatch.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <button
            type="button"
            onClick={resetFiltresMatchs}
            className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100"
          >
            Réinitialiser
          </button>
          <p className="text-xs text-zinc-500">
            {matchsFiltres.length} match{matchsFiltres.length !== 1 ? 's' : ''}
          </p>
        </Card>

        <ul className="mt-3 space-y-3">
          {matchsFiltres.map((m) => {
            const lieu = getLieuById(m.lieu_id)
            const org = getJoueurById(m.org_id)
            const labelLieu = lieu ? `${lieu.nom} — ${lieu.ville}` : m.lieu_id
            return (
              <li key={m.id}>
                <Link to={`/demo/match/${m.id}`}>
                  <Card className="transition hover:border-brand-200 hover:shadow-md">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="font-semibold text-zinc-900">
                          {formatDateFr(m.date)} · {m.heure}
                        </p>
                        <p className="mt-0.5 text-sm text-zinc-600">{labelLieu}</p>
                        <p className="mt-1 text-xs text-zinc-400">
                          Organisateur :{' '}
                          <span className="font-medium text-zinc-600">
                            {org?.prenom ?? m.org_id}
                          </span>{' '}
                          · {m.type}
                        </p>
                      </div>
                      <div className="shrink-0 text-lg font-bold tabular-nums text-brand-900">
                        {m.scoreA} — {m.scoreB}
                      </div>
                    </div>
                  </Card>
                </Link>
              </li>
            )
          })}
        </ul>
        {matchsFiltres.length === 0 && (
          <p className="mt-3 text-sm text-zinc-500">Aucun match ne correspond à ces critères.</p>
        )}
      </section>

      <p className="text-center text-sm">
        <Link to="/" className="font-semibold text-brand-700 hover:underline">
          ← Retour aux vrais matchs ouverts
        </Link>
      </p>
    </div>
  )
}
