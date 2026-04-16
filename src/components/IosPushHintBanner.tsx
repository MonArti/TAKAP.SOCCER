import { useCallback, useEffect, useRef, useState } from 'react'
import { getOneSignalAppId } from '@/lib/onesignal'
import { shouldShowIosPushHomeScreenHint } from '@/lib/ios-web-push-hint'

const STORAGE_KEY = 'takap-ios-push-hint-dismissed'
const AUTO_DISMISS_MS = 5000

export function IosPushHintBanner() {
  const [visible, setVisible] = useState(false)
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const dismiss = useCallback(() => {
    if (dismissTimerRef.current) {
      clearTimeout(dismissTimerRef.current)
      dismissTimerRef.current = null
    }
    try {
      sessionStorage.setItem(STORAGE_KEY, '1')
    } catch {
      /* navigation privée, quota, etc. */
    }
    setVisible(false)
  }, [])

  useEffect(() => {
    if (!getOneSignalAppId()) return
    if (!shouldShowIosPushHomeScreenHint()) return
    try {
      if (sessionStorage.getItem(STORAGE_KEY) === '1') return
    } catch {
      /* ignore */
    }
    setVisible(true)
  }, [])

  useEffect(() => {
    if (!visible) return
    dismissTimerRef.current = setTimeout(() => dismiss(), AUTO_DISMISS_MS)
    return () => {
      if (dismissTimerRef.current) {
        clearTimeout(dismissTimerRef.current)
        dismissTimerRef.current = null
      }
    }
  }, [visible, dismiss])

  if (!visible) return null

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2"
      role="status"
      aria-live="polite"
    >
      <div className="pointer-events-auto flex max-w-lg gap-3 rounded-t-2xl border border-primary/35 bg-card/95 px-4 py-3 text-sm leading-snug text-foreground shadow-[0_-8px_32px_-8px_rgba(0,230,118,0.15)] backdrop-blur-sm">
        <p className="min-w-0 flex-1">
          📱 Pour recevoir les notifications, ajoute Takap Soccer à ton écran d’accueil : Partager →
          Sur l’écran d’accueil
        </p>
        <button
          type="button"
          onClick={dismiss}
          className="shrink-0 rounded-lg px-2 py-1 text-xs font-medium text-primary underline decoration-primary/50 underline-offset-2 hover:bg-primary/10"
        >
          Fermer
        </button>
      </div>
    </div>
  )
}
