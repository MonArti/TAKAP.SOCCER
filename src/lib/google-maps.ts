/** Charge Maps JS + bibliothèque Places (clé via VITE_GOOGLE_MAPS_API_KEY). */
let loadPromise: Promise<void> | null = null
const SCRIPT_ID = 'script-google-maps-js'

export function getGoogleMapsApiKey(): string | undefined {
  return import.meta.env.VITE_GOOGLE_MAPS_API_KEY?.trim() || undefined
}

export function loadGoogleMapsScript(): Promise<void> {
  const key = getGoogleMapsApiKey()
  if (!key) {
    return Promise.reject(new Error('VITE_GOOGLE_MAPS_API_KEY manquante (.env)'))
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
