import raw from '@/data/launch-demo.json'

export type LaunchDemoLieu = {
  id: string
  nom: string
  ville: string
  type: string
}

export type LaunchDemoJoueur = {
  id: string
  prenom: string
  ville: string
  note: number
  matchs: number
}

export type LaunchDemoMatch = {
  id: string
  date: string
  heure: string
  lieu_id: string
  type: string
  scoreA: number
  scoreB: number
  org_id: string
  joueurs: string[]
}

export type LaunchDemoMatchOuvert = {
  id: string
  date: string
  heure: string
  lieu_id: string
  type: string
  prix: number
  nb_max: number
  nb_inscrits: number
  org_id: string
}

export type LaunchDemoBundle = {
  lieux: LaunchDemoLieu[]
  joueurs: LaunchDemoJoueur[]
  matchs: LaunchDemoMatch[]
  matchs_ouverts?: LaunchDemoMatchOuvert[]
}

const data = raw as LaunchDemoBundle

const lieuxById = new Map(data.lieux.map((l) => [l.id, l]))
const joueursById = new Map(data.joueurs.map((j) => [j.id, j]))
const matchsById = new Map(data.matchs.map((m) => [m.id, m]))
const matchsOuvertsById = new Map(
  (data.matchs_ouverts ?? []).map((m) => [m.id, m]),
)

export function getLaunchDemo(): LaunchDemoBundle {
  return data
}

export function getLieuById(id: string): LaunchDemoLieu | undefined {
  return lieuxById.get(id)
}

export function getJoueurById(id: string): LaunchDemoJoueur | undefined {
  return joueursById.get(id)
}

export function getMatchById(id: string): LaunchDemoMatch | undefined {
  return matchsById.get(id)
}

export function getDemoMatchsOuverts(): LaunchDemoMatchOuvert[] {
  return [...(data.matchs_ouverts ?? [])].sort((a, b) =>
    a.date < b.date ? -1 : a.date > b.date ? 1 : 0,
  )
}

export function getDemoMatchOuvertById(id: string): LaunchDemoMatchOuvert | undefined {
  return matchsOuvertsById.get(id)
}

export type DemoOpenResolved = LaunchDemoMatchOuvert & {
  lieuLabel: string
  lieuVille: string
  orgPrenom: string
}

export function resolveDemoMatchOuvert(m: LaunchDemoMatchOuvert): DemoOpenResolved | null {
  const lieu = lieuxById.get(m.lieu_id)
  const org = joueursById.get(m.org_id)
  if (!lieu || !org) return null
  return {
    ...m,
    lieuLabel: `${lieu.nom} — ${lieu.ville}`,
    lieuVille: lieu.ville,
    orgPrenom: org.prenom,
  }
}

/** Matchs triés du plus récent au plus ancien */
export function getMatchsHistoriqueDesc(): LaunchDemoMatch[] {
  return [...data.matchs].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
}

export function getMatchsForJoueur(joueurId: string): LaunchDemoMatch[] {
  return data.matchs.filter((m) => m.org_id === joueurId || m.joueurs.includes(joueurId))
}

/** Moyenne des notes « démo » (pour se comparer au lot fictif). */
export function getDemoCommunityAvgNote(): number {
  const js = data.joueurs
  if (js.length === 0) return 0
  return Math.round((js.reduce((s, j) => s + j.note, 0) / js.length) * 100) / 100
}

export function getDemoCommunityAvgMatchs(): number {
  const js = data.joueurs
  if (js.length === 0) return 0
  return Math.round((js.reduce((s, j) => s + j.matchs, 0) / js.length) * 10) / 10
}

/** Villes distinctes des joueurs démo (tri FR). */
export function getDemoVillesJoueurs(): string[] {
  return [...new Set(data.joueurs.map((j) => j.ville))].sort((a, b) => a.localeCompare(b, 'fr'))
}

/** Types de match distincts (ex. 7v7, 5v5). */
export function getDemoMatchFormats(): string[] {
  return [...new Set(data.matchs.map((m) => m.type))].sort((a, b) => a.localeCompare(b, 'fr'))
}

/** Villes présentes sur les lieux des matchs démo (passés + ouverts). */
export function getDemoVillesMatchs(): string[] {
  const set = new Set<string>()
  for (const m of data.matchs) {
    const l = lieuxById.get(m.lieu_id)
    if (l) set.add(l.ville)
  }
  for (const m of data.matchs_ouverts ?? []) {
    const l = lieuxById.get(m.lieu_id)
    if (l) set.add(l.ville)
  }
  return [...set].sort((a, b) => a.localeCompare(b, 'fr'))
}
