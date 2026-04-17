import { useEffect, useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Bell, Compass, Gift, LayoutGrid, Medal, Settings, Shield, Swords, Trophy, User, Users } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useNotifications } from '@/contexts/NotificationContext'
import { IosPushHintBanner } from '@/components/IosPushHintBanner'
import { LanguageSelector } from '@/components/LanguageSelector'
import { LeaderboardPanel } from '@/components/LeaderboardPanel'
import { NotificationsPanel } from '@/components/NotificationsPanel'
import { isSupabaseConfigured, supabase } from '@/lib/supabase'
import { parseNoteMoyenne } from '@/lib/format'
import { cn } from '@/lib/utils'

const sideNavClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors',
    isActive
      ? 'border border-[rgba(0,230,118,0.35)] bg-[rgba(0,230,118,0.1)] text-[#00E676] shadow-[0_0_20px_-8px_rgba(0,230,118,0.45)]'
      : 'border border-transparent text-[#7A9180] hover:border-[rgba(0,230,118,0.12)] hover:bg-[#1A211B] hover:text-[#E8F0E9]',
  )

type ProfileStats = {
  nb_matchs: number
  note_moyenne: number
}

export function Layout({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation()
  const { user, signOut, isAdmin, adminResolved } = useAuth()
  const { unreadCount } = useNotifications()
  const [stats, setStats] = useState<ProfileStats | null>(null)

  useEffect(() => {
    if (!user) {
      setStats(null)
      return
    }
    let cancelled = false
    ;(async () => {
      const { data } = await supabase
        .from('profiles')
        .select('nb_matchs, note_moyenne')
        .eq('id', user.id)
        .maybeSingle()
      if (!cancelled && data) {
        setStats({
          nb_matchs: data.nb_matchs ?? 0,
          note_moyenne: parseNoteMoyenne(data.note_moyenne),
        })
      } else if (!cancelled) setStats(null)
    })()
    return () => {
      cancelled = true
    }
  }, [user?.id])

  return (
    <div className="min-h-dvh bg-[#0A0E0B] text-[#E8F0E9]">
      {!isSupabaseConfigured && (
        <div
          role="alert"
          className="border-b border-amber-500/30 bg-amber-500/10 px-4 py-3 text-center text-sm text-amber-100"
        >
          <strong>{t('layout.supabase_missing')}</strong> {t('layout.supabase_hint')}
        </div>
      )}

      <div className="mx-auto grid min-h-dvh w-full max-w-[1920px] grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)_320px]">
        {/* Colonne gauche — sidebar */}
        <aside
          className={cn(
            'flex flex-col border-b border-[rgba(0,230,118,0.12)] bg-[#0A0E0B] lg:border-b-0 lg:border-r',
            'lg:sticky lg:top-0 lg:h-[100dvh] lg:overflow-y-auto',
          )}
        >
          <div className="flex items-center justify-between gap-3 p-4">
            <Link
              to="/"
              className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl border border-[rgba(0,230,118,0.18)] bg-[#1A211B] px-3 py-2.5 transition hover:border-[rgba(0,230,118,0.35)]"
            >
              <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl bg-[#00E676] text-base font-black text-[#0A0E0B] shadow-[0_0_28px_-6px_rgba(0,230,118,0.85)]">
                TS
              </span>
              <div className="min-w-0">
                <span className="block truncate font-bold tracking-tight text-[#E8F0E9]">{t('brand.title')}</span>
                <span className="block truncate text-[11px] font-medium text-[#7A9180]">{t('brand.tagline')}</span>
              </div>
            </Link>
            {user && (
              <div
                className="flex shrink-0 items-center gap-1.5 rounded-full border border-[rgba(0,230,118,0.2)] bg-[#1A211B] px-2.5 py-1.5"
                title={t('nav.unread_notifications_title')}
              >
                <Bell className="size-4 text-[#00E676]" aria-hidden />
                {unreadCount > 0 ? (
                  <span className="min-w-[1.25rem] text-center text-[11px] font-bold tabular-nums text-[#00E676]">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                ) : (
                  <span className="text-[10px] text-[#7A9180]">0</span>
                )}
              </div>
            )}
          </div>

          <nav className="flex gap-1 overflow-x-auto px-3 pb-2 lg:flex-col lg:overflow-visible lg:px-4">
            <NavLink to="/mes-matchs" className={sideNavClass}>
              <LayoutGrid className="size-4 shrink-0 opacity-90" aria-hidden />
              {t('nav.my_matches')}
            </NavLink>
            <NavLink to="/" className={sideNavClass} end>
              <Compass className="size-4 shrink-0 opacity-90" aria-hidden />
              {t('nav.explore')}
            </NavLink>
            <NavLink to="/joueurs" className={sideNavClass}>
              <Trophy className="size-4 shrink-0 opacity-90" aria-hidden />
              {t('nav.rankings')}
            </NavLink>
            <NavLink to="/teams" className={sideNavClass}>
              <Users className="size-4 shrink-0 opacity-90" aria-hidden />
              {t('nav.teams')}
            </NavLink>
            <NavLink to="/tournois" className={sideNavClass}>
              <Medal className="size-4 shrink-0 opacity-90" aria-hidden />
              {t('nav.tournois')}
            </NavLink>
            <NavLink to="/defis" className={sideNavClass}>
              <Swords className="size-4 shrink-0 opacity-90" aria-hidden />
              {t('nav.defis')}
            </NavLink>
            <NavLink to="/profil" className={sideNavClass}>
              <User className="size-4 shrink-0 opacity-90" aria-hidden />
              {t('nav.my_profile')}
            </NavLink>
            <NavLink to="/inviter" className={sideNavClass}>
              <Gift className="size-4 shrink-0 opacity-90" aria-hidden />
              {t('nav.invite_friends')}
            </NavLink>
            <NavLink to="/profil" className={sideNavClass}>
              <Settings className="size-4 shrink-0 opacity-90" aria-hidden />
              {t('nav.settings')}
            </NavLink>
          </nav>

          <div className="px-4 pb-3">
            <LanguageSelector className="mb-3" />
            <Link
              to="/matchs/nouveau"
              className={cn(
                'flex h-12 w-full items-center justify-center rounded-xl text-sm font-bold',
                'bg-[#00E676] text-[#0A0E0B] shadow-[0_0_28px_-8px_rgba(0,230,118,0.8)] transition hover:brightness-110',
              )}
            >
              {t('nav.create_match')}
            </Link>
          </div>

          {adminResolved && isAdmin && (
            <div className="px-4 pb-2">
              <NavLink
                to="/admin"
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold',
                    isActive
                      ? 'border border-[#FFD600]/40 bg-[#FFD600]/10 text-[#FFD600]'
                      : 'border border-transparent text-[#7A9180] hover:bg-[#1A211B] hover:text-[#E8F0E9]',
                  )
                }
              >
                <Shield className="size-4 shrink-0" aria-hidden />
                {t('nav.admin')}
              </NavLink>
            </div>
          )}

          <div className="mt-auto space-y-3 p-4">
            {user ? (
              <>
                <div className="rounded-2xl border border-[rgba(0,230,118,0.12)] bg-[#1A211B] p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#00E676]">{t('nav.your_stats')}</p>
                  <dl className="mt-3 grid grid-cols-2 gap-x-2 gap-y-2.5 text-xs">
                    <div>
                      <dt className="text-[#7A9180]">{t('nav.matches_played')}</dt>
                      <dd className="font-bold tabular-nums text-[#E8F0E9]">{stats?.nb_matchs ?? t('common.dash')}</dd>
                    </div>
                    <div>
                      <dt className="text-[#7A9180]">{t('nav.goals_sidebar')}</dt>
                      <dd className="font-bold tabular-nums text-[#7A9180]">{t('common.dash')}</dd>
                    </div>
                    <div>
                      <dt className="text-[#7A9180]">{t('nav.avg_rating_short')}</dt>
                      <dd className="font-bold tabular-nums text-[#00E676]">
                        {stats != null ? stats.note_moyenne.toFixed(1) : t('common.dash')}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[#7A9180]">{t('nav.wins')}</dt>
                      <dd className="font-bold tabular-nums text-[#7A9180]">{t('common.dash')}</dd>
                    </div>
                  </dl>
                </div>
                <button
                  type="button"
                  onClick={() => void signOut()}
                  className="flex w-full items-center justify-center rounded-xl border border-[rgba(0,230,118,0.15)] py-2.5 text-sm font-semibold text-[#7A9180] transition hover:border-[rgba(0,230,118,0.3)] hover:text-[#E8F0E9]"
                >
                  {t('common.logout')}
                </button>
              </>
            ) : (
              <div className="flex flex-col gap-2">
                <NavLink
                  to="/login"
                  className="flex h-11 items-center justify-center rounded-xl border border-[rgba(0,230,118,0.2)] text-sm font-semibold text-[#E8F0E9] transition hover:bg-[#1A211B]"
                >
                  {t('common.login')}
                </NavLink>
                <NavLink
                  to="/register"
                  className="flex h-11 items-center justify-center rounded-xl bg-[#00E676] text-sm font-bold text-[#0A0E0B] shadow-[0_0_24px_-8px_rgba(0,230,118,0.75)] transition hover:brightness-110"
                >
                  {t('common.register')}
                </NavLink>
              </div>
            )}
          </div>
        </aside>

        {/* Centre — contenu */}
        <main className="min-w-0 border-[rgba(0,230,118,0.12)] bg-[#0A0E0B] px-4 py-6 lg:border-r lg:px-6">
          {children}
        </main>

        {/* Droite — classement + notifications */}
        <aside
          className={cn(
            'space-y-4 border-t border-[rgba(0,230,118,0.12)] bg-[#0A0E0B] px-4 py-6',
            'lg:sticky lg:top-0 lg:h-[100dvh] lg:overflow-y-auto lg:border-t-0',
          )}
        >
          <LeaderboardPanel />
          <NotificationsPanel />
        </aside>
      </div>

      <IosPushHintBanner />
    </div>
  )
}
