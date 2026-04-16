import { loadExternalScript } from '@/lib/load-script'

const SCRIPT_SRC = 'https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js'

export function getOneSignalAppId(): string | undefined {
  return import.meta.env.VITE_ONESIGNAL_APP_ID?.trim() || undefined
}

let initDone = false

/** Initialise OneSignal (une fois) + demande la permission notifications + partage localisation si dispo. */
export async function initOneSignal(): Promise<void> {
  const appId = getOneSignalAppId()
  if (!appId || initDone) return

  const w = window as Window & {
    OneSignalDeferred?: Array<(OneSignal: OneSignalLike) => void>
  }
  w.OneSignalDeferred = w.OneSignalDeferred || []

  // v16 : enregistrer le callback *avant* de charger le script (sinon la file peut être traitée vide).
  const initPromise = new Promise<void>((resolve, reject) => {
    w.OneSignalDeferred!.push(async (OneSignal) => {
      try {
        await OneSignal.init({
          appId,
          allowLocalhostAsSecureOrigin: Boolean(import.meta.env.DEV),
        })
        await OneSignal.Notifications.requestPermission()
        try {
          await OneSignal.Location?.setShared?.(true)
        } catch {
          // navigateur ou SDK sans partage localisation
        }
        initDone = true
        if (import.meta.env.DEV) {
          ;(w as unknown as { __TAKAP_ONESIGNAL_READY__?: boolean }).__TAKAP_ONESIGNAL_READY__ = true
        }
        resolve()
      } catch (e) {
        reject(e)
      }
    })
  })

  try {
    await loadExternalScript(SCRIPT_SRC, 'script-onesignal-sdk')
  } catch {
    console.warn('[Takap] OneSignal SDK non chargé')
    return
  }

  try {
    await initPromise
  } catch (e) {
    console.warn('[Takap] OneSignal init:', e)
  }
}

export function syncOneSignalUser(userId: string | null): void {
  if (!getOneSignalAppId()) return
  const w = window as Window & {
    OneSignalDeferred?: Array<(OneSignal: OneSignalLike) => void>
  }
  if (!w.OneSignalDeferred) return
  w.OneSignalDeferred.push(async (OneSignal) => {
    try {
      if (userId) await OneSignal.login(userId)
      else await OneSignal.logout()
    } catch {
      /* ignore */
    }
  })
}

type OneSignalLike = {
  init: (opts: { appId: string; allowLocalhostAsSecureOrigin?: boolean }) => Promise<void>
  Notifications: { requestPermission: () => Promise<void> }
  login: (id: string) => Promise<void>
  logout: () => Promise<void>
  Location?: { setShared?: (v: boolean) => Promise<void> }
}
