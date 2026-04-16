import { Link, NavLink } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { IosPushHintBanner } from '@/components/IosPushHintBanner'
import { isSupabaseConfigured } from '@/lib/supabase'
import { cn } from '@/lib/utils'

const navClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'rounded-lg px-3 py-2 text-sm font-medium transition-colors',
    isActive
      ? 'bg-primary/15 text-primary font-semibold'
      : 'text-muted-foreground hover:bg-muted hover:text-foreground',
  )

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, signOut, isAdmin, adminResolved } = useAuth()

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="sticky top-0 z-10 border-b border-border/80 bg-card/95 shadow-sm backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
          <Link
            to="/"
            className="flex items-center gap-2 font-semibold text-foreground transition hover:text-primary"
          >
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-sm font-bold text-primary-foreground shadow-sm">
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
                  className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
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
                  className="rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90"
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
          className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-center text-sm text-amber-950"
        >
          <strong>Configuration Supabase manquante.</strong> Sur Vercel : ajoute{' '}
          <code className="rounded bg-amber-100/80 px-1">VITE_SUPABASE_URL</code> et{' '}
          <code className="rounded bg-amber-100/80 px-1">VITE_SUPABASE_ANON_KEY</code>, puis{' '}
          <strong>Redeploy</strong> le projet.
        </div>
      )}
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">{children}</main>
      <IosPushHintBanner />
      <footer className="border-t border-border py-6 text-center text-xs text-muted-foreground">
        <p className="font-medium text-foreground/80">Takap.Soccer — foot amateur entre joueurs</p>
        <p className="mt-1 max-w-md mx-auto text-[10px] leading-relaxed opacity-90">
          Accueil : recherche + filtres + exemples Takap — si absent, forcer un redeploy Vercel ou vider le
          cache.
        </p>
      </footer>
    </div>
  )
}
