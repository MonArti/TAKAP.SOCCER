/** iPhone / iPod / iPad (iPadOS 13+ peut se présenter comme MacIntel + tactile). */
export function isIOSUserAgent(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent
  if (/iPad|iPhone|iPod/.test(ua)) return true
  if (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) return true
  return false
}

/** App ouverte depuis l’écran d’accueil (PWA / standalone). */
export function isStandaloneDisplayMode(): boolean {
  if (typeof window === 'undefined') return false
  try {
    if (window.matchMedia('(display-mode: standalone)').matches) return true
  } catch {
    /* ignore */
  }
  const nav = navigator as Navigator & { standalone?: boolean }
  if (nav.standalone === true) return true
  return false
}

/** Bannière « ajoute à l’écran d’accueil » : iOS uniquement, pas déjà en mode standalone. */
export function shouldShowIosPushHomeScreenHint(): boolean {
  if (!isIOSUserAgent()) return false
  if (isStandaloneDisplayMode()) return false
  return true
}
