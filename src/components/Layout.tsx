import { Link, NavLink } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { IosPushHintBanner } from '@/components/IosPushHintBanner'
import { isSupabaseConfigured } from '@/lib/supabase'

const navClass = ({ isActive }: { isActive: boolean }) =>
  [
    'rounded-lg px-3 py-2 text-sm font-medium transition-colors',
    isActive ? 'bg-brand-100 text-brand-900' : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900',
  ].join(' ')

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, signOut, isAdmin, adminResolved } = useAuth()

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-10 border-b border-zinc-200/80 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
          <Link to="/" className="flex items-center gap-2 font-semibold text-brand-800">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-sm text-white">
              TS
            </span>
            <span className="hidden sm:inline">Takap.Soccer</span>
          </Link>
          <nav className="flex flex-wrap items-center justify-end gap-1 sm:gap-2">
            <NavLink to="/" className={navClass} end>
              Matchs
            </NavLink>
            <NavLink to="/demo" className={navClass}>
              Démo
            </NavLink>
            {user ? (
              <>
                <NavLink to="/matchs/nouveau" className={navClass}>
                  Créer
                </NavLink>
                <NavLink to="/mes-matchs" className={navClass}>
                  Mes matchs
                </NavLink>
                <NavLink to="/joueurs" className={navClass}>
                  Joueurs
                </NavLink>
                <NavLink to="/profil" className={navClass}>
                  Profil
                </NavLink>
                {adminResolved && isAdmin && (
                  <NavLink to="/admin" className={navClass}>
                    Admin
                  </NavLink>
                )}
                <button
                  type="button"
                  onClick={() => void signOut()}
                  className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800"
                >
                  Déconnexion
                </button>
              </>
            ) : (
              <>
                <NavLink to="/login" className={navClass}>
                  Connexion
                </NavLink>
                <NavLink
                  to="/register"
                  className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-700"
                >
                  Inscription
                </NavLink>
              </>
            )}
          </nav>
        </div>
      </header>
      {!isSupabaseConfigured && (
        <div
          role="alert"
          className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-center text-sm text-amber-900"
        >
          <strong>Configuration Supabase manquante.</strong> Sur Vercel : ajoute{' '}
          <code className="rounded bg-amber-100/80 px-1">VITE_SUPABASE_URL</code> et{' '}
          <code className="rounded bg-amber-100/80 px-1">VITE_SUPABASE_ANON_KEY</code>, puis{' '}
          <strong>Redeploy</strong> le projet.
        </div>
      )}
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">{children}</main>
      <IosPushHintBanner />
      <footer className="border-t border-zinc-200 py-4 text-center text-xs text-zinc-400">
        <p>Takap.Soccer — foot amateur entre joueurs</p>
        <p className="mt-1 text-[10px] text-zinc-500">
          Accueil : recherche + filtres + exemples Takap (UI jan. 2026) — si absent, forcer un redeploy
          Vercel ou vider le cache.
        </p>
      </footer>
    </div>
  )
}
