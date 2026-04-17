import { Bell } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/contexts/AuthContext'
import { useNotifications } from '@/contexts/NotificationContext'
import { getOneSignalAppId } from '@/lib/onesignal'
import { resolveUiLocale } from '@/lib/format'
import type { NotificationRow, NotificationType } from '@/types/database'
import { cn } from '@/lib/utils'

function humanLine(n: NotificationRow, t: (k: string) => string): string {
  const c = n.content?.trim()
  if (c) return c
  const map: Partial<Record<NotificationType, string>> = {
    match_created: 'notifications.type_match_created',
    new_rating: 'notifications.type_new_rating',
    rank_changed: 'notifications.type_rank_changed',
    match_invite: 'notifications.type_match_invite',
  }
  const key = map[n.type as NotificationType]
  return key ? t(key) : t('notifications.type_default')
}

function formatWhen(iso: string, locale: string) {
  try {
    return new Date(iso).toLocaleString(locale, {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

export function NotificationsPanel() {
  const { t, i18n } = useTranslation()
  const { user } = useAuth()
  const { notifications, loading, markAsRead } = useNotifications()
  const hasOneSignal = Boolean(getOneSignalAppId())
  const locale = resolveUiLocale(i18n.language)

  if (!user) {
    return (
      <section className="rounded-2xl border border-[rgba(0,230,118,0.12)] bg-[#1A211B] p-4">
        <h2 className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-[#00E676]">
          <Bell className="size-3.5" aria-hidden />
          {t('notifications.title')}
        </h2>
        <p className="mt-2 text-sm text-[#7A9180]">{t('notifications.login_prompt')}</p>
      </section>
    )
  }

  return (
    <section id="notifications-panel" className="rounded-2xl border border-[rgba(0,230,118,0.12)] bg-[#1A211B] p-4">
      <h2 className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-[#00E676]">
        <Bell className="size-3.5" aria-hidden />
        {t('notifications.title')}
      </h2>
      <p className="mt-1 text-[11px] leading-relaxed text-[#7A9180]">
        {hasOneSignal ? t('notifications.hint_push') : t('notifications.hint_no_push')}
      </p>

      {loading && <p className="mt-3 text-sm text-[#7A9180]">{t('common.loading')}</p>}

      {!loading && notifications.length === 0 && (
        <p className="mt-3 text-sm text-[#7A9180]">{t('notifications.empty')}</p>
      )}

      {!loading && notifications.length > 0 && (
        <ul className="mt-3 max-h-72 space-y-2 overflow-y-auto pr-1">
          {notifications.map((n) => (
            <li key={n.id}>
              <button
                type="button"
                onClick={() => {
                  if (!n.read) void markAsRead(n.id)
                }}
                className={cn(
                  'flex w-full gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors',
                  n.read
                    ? 'border-[rgba(0,230,118,0.06)] bg-[#0A0E0B]/30 text-[#7A9180]'
                    : 'border-[rgba(0,230,118,0.25)] bg-[rgba(0,230,118,0.08)] text-[#E8F0E9]',
                )}
              >
                <span
                  className={cn(
                    'mt-1.5 size-2 shrink-0 rounded-full',
                    n.read ? 'bg-[#243028]' : 'bg-[#00E676] shadow-[0_0_10px_rgba(0,230,118,0.9)]',
                  )}
                  aria-hidden
                />
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-medium text-[#7A9180]">{formatWhen(n.created_at, locale)}</p>
                  <p className="mt-0.5 text-sm font-medium leading-snug">{humanLine(n, t)}</p>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
