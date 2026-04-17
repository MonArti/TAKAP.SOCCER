import i18n from '@/i18n'

const LOCALE_BY_LANG: Record<string, string> = {
  fr: 'fr-FR',
  en: 'en-GB',
  es: 'es-ES',
  ar: 'ar-SA',
}

export function resolveUiLocale(i18nLng: string): string {
  const base = (i18nLng ?? 'fr').split('-')[0] ?? 'fr'
  return LOCALE_BY_LANG[base] ?? 'fr-FR'
}

function appLocale(): string {
  return resolveUiLocale(i18n.language)
}

export function formatDateLocalized(isoDate: string, locale: string) {
  const d = new Date(isoDate + 'T12:00:00')
  return d.toLocaleDateString(locale, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

/** Uses current i18n language */
export function formatDateForApp(isoDate: string) {
  return formatDateLocalized(isoDate, appLocale())
}

/** @deprecated prefer formatDateForApp */
export function formatDateFr(isoDate: string) {
  return formatDateLocalized(isoDate, 'fr-FR')
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

export function eurosLocalized(n: number, locale: string) {
  return new Intl.NumberFormat(locale, { style: 'currency', currency: 'EUR' }).format(n)
}

/** Uses current i18n language */
export function eurosForApp(n: number) {
  return eurosLocalized(n, appLocale())
}

/** @deprecated prefer eurosForApp */
export function euros(n: number) {
  return eurosLocalized(n, 'fr-FR')
}

export type RatingBandKey = 'unrated' | 'beginner' | 'casual' | 'intermediate' | 'strong'

export function ratingBandFromNote(noteMoyenne: number): RatingBandKey {
  if (noteMoyenne <= 0) return 'unrated'
  if (noteMoyenne < 2.25) return 'beginner'
  if (noteMoyenne < 3.25) return 'casual'
  if (noteMoyenne < 4.25) return 'intermediate'
  return 'strong'
}

/** @deprecated prefer ratingBandFromNote + i18n t(`rating_bands.${key}`) */
export function niveauIndicatifFromNote(noteMoyenne: number): string {
  const k = ratingBandFromNote(noteMoyenne)
  const legacy: Record<RatingBandKey, string> = {
    unrated: 'Pas encore noté',
    beginner: 'Débutant',
    casual: 'Loisir',
    intermediate: 'Confirmé',
    strong: 'Très solide',
  }
  return legacy[k]
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

/** True si la date du match (jour calendaire) est passée ou aujourd'hui */
export function isMatchDayPassedOrToday(dateIso: string) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const m = new Date(dateIso + 'T12:00:00')
  m.setHours(0, 0, 0, 0)
  return m.getTime() <= today.getTime()
}
