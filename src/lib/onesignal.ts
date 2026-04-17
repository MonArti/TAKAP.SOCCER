import { Capacitor } from '@capacitor/core'
import { loadExternalScript } from '@/lib/load-script'

const SCRIPT_SRC = 'https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js'

/** ID OneSignal « site web » (SDK page). */
function getOneSignalWebAppId(): string | undefined {
  return import.meta.env.VITE_ONESIGNAL_APP_ID?.trim() || undefined
}

/**
 * ID OneSignal pour iOS/Android (souvent le même projet, parfois une app distincte dans le dashboard).
 * Si absent, on retombe sur VITE_ONESIGNAL_APP_ID.
 */
function getOneSignalNativeAppId(): string | undefined {
  const native = import.meta.env.VITE_ONESIGNAL_APP_ID_NATIVE?.trim()
  return native || getOneSignalWebAppId()
}

export function getOneSignalAppId(): string | undefined {
  return Capacitor.isNativePlatform() ? getOneSignalNativeAppId() : getOneSignalWebAppId()
}

let initDone = false
let nativeOneSignal: typeof import('onesignal-cordova-plugin').default | null = null

async function initNativeOneSignal(appId: string): Promise<void> {
  const OneSignal = (await import('onesignal-cordova-plugin')).default
  nativeOneSignal = OneSignal
  if (import.meta.env.DEV) {
    OneSignal.Debug.setLogLevel(6)
  }
  OneSignal.initialize(appId)
  await OneSignal.Notifications.requestPermission(true)
  try {
    OneSignal.Location.setShared(true)
  } catch {
    /* SDK ou permissions */
  }
  initDone = true
  if (import.meta.env.DEV) {
    ;(window as unknown as { __TAKAP_ONESIGNAL_READY__?: boolean }).__TAKAP_ONESIGNAL_READY__ = true
  }
}

/** Initialise OneSignal (une fois) : SDK web ou `onesignal-cordova-plugin` en natif. */
export async function initOneSignal(): Promise<void> {
  const appId = getOneSignalAppId()
  if (!appId || initDone) return

  if (Capacitor.isNativePlatform()) {
    await initNativeOneSignal(appId)
    return
  }

  const w = window as Window & {
    OneSignalDeferred?: Array<(OneSignal: OneSignalLike) => void>
  }
  w.OneSignalDeferred = w.OneSignalDeferred || []

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
          /* navigateur ou SDK sans partage localisation */
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

  if (Capacitor.isNativePlatform()) {
    void (async () => {
      const OneSignal = nativeOneSignal ?? (await import('onesignal-cordova-plugin')).default
      nativeOneSignal = OneSignal
      try {
        if (userId) OneSignal.login(userId)
        else OneSignal.logout()
      } catch {
        /* ignore */
      }
    })()
    return
  }

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
