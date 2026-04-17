import { Capacitor } from '@capacitor/core'

/** Charge Maps JS + bibliothèque Places (clés VITE_* — voir .env.example). */
let loadPromise: Promise<void> | null = null
const SCRIPT_ID = 'script-google-maps-js'

/**
 * Clé utilisée pour l’URL du script Maps JS.
 * En WebView Capacitor, prévoir des clés restreintes « Android app » / « iOS app » dans Google Cloud,
 * sinon réutilise la clé web (sans restriction par referrer HTTP).
 */
export function getGoogleMapsApiKey(): string | undefined {
  const web = import.meta.env.VITE_GOOGLE_MAPS_API_KEY?.trim()
  const android = import.meta.env.VITE_GOOGLE_MAPS_API_KEY_ANDROID?.trim()
  const ios = import.meta.env.VITE_GOOGLE_MAPS_API_KEY_IOS?.trim()
  const p = Capacitor.getPlatform()
  if (p === 'android') return android || web || undefined
  if (p === 'ios') return ios || web || undefined
  return web || undefined
}

export function loadGoogleMapsScript(): Promise<void> {
  const key = getGoogleMapsApiKey()
  if (!key) {
    return Promise.reject(new Error('Clé Google Maps manquante (.env)'))
  }
  if (typeof window !== 'undefined' && window.google?.maps?.places) {
    return Promise.resolve()
  }
  if (loadPromise) return loadPromise

  loadPromise = new Promise((resolve, reject) => {
    if (window.google?.maps?.places) {
      resolve()
      return
    }

    let el = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null
    if (!el) {
      el = document.createElement('script')
      el.id = SCRIPT_ID
      el.async = true
      el.defer = true
      el.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&libraries=places`
      el.onerror = () => {
        loadPromise = null
        reject(new Error('Impossible de charger Google Maps'))
      }
      document.head.appendChild(el)
    }

    el.addEventListener(
      'load',
      () => {
        if (window.google?.maps?.places) resolve()
        else {
          loadPromise = null
          reject(new Error('Bibliothèque Places indisponible'))
        }
      },
      { once: true },
    )
  })
  return loadPromise
}
