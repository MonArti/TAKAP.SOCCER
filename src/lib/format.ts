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

export function euros(n: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n)
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
