export function formatDateFr(isoDate: string) {
  const d = new Date(isoDate + 'T12:00:00')
  return d.toLocaleDateString('fr-FR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

/** heure_match from PG time is often "HH:MM:SS" */
export function formatHeure(heure: string) {
  const [h, m] = heure.split(':')
  return `${h}:${m ?? '00'}`
}

/** Affichage heure démo « 20h30 » ou time SQL. */
export function formatHeureAffichage(heure: string) {
  if (heure.includes('h')) return heure
  return formatHeure(heure)
}

export function euros(n: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n)
}

/** Niveau affiché à partir de la note moyenne (indicatif). */
export function niveauIndicatifFromNote(noteMoyenne: number): string {
  if (noteMoyenne <= 0) return 'Pas encore noté'
  if (noteMoyenne < 2.25) return 'Débutant'
  if (noteMoyenne < 3.25) return 'Loisir'
  if (noteMoyenne < 4.25) return 'Confirmé'
  return 'Très solide'
}

/** Recherche insensible aux accents / casse. */
export function normalizeSearch(s: string) {
  return s
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
}

export function parseNoteMoyenne(v: unknown): number {
  if (typeof v === 'number' && !Number.isNaN(v)) return v
  if (typeof v === 'string') {
    const x = parseFloat(v)
    return Number.isNaN(x) ? 0 : x
  }
  return 0
}

/** True si la date du match (jour calendaire) est passée ou aujourd’hui */
export function isMatchDayPassedOrToday(dateIso: string) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const m = new Date(dateIso + 'T12:00:00')
  m.setHours(0, 0, 0, 0)
  return m.getTime() <= today.getTime()
}
