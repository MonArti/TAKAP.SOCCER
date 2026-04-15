import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

type AuthContextValue = {
  user: User | null
  session: Session | null
  loading: boolean
  /** true une fois le rôle lu en base (ou pas connecté) */
  adminResolved: boolean
  isAdmin: boolean
  /** Recharge le rôle depuis `profiles` (ex. après un SQL `role = admin` sans se déconnecter) */
  refreshAdminRole: () => Promise<void>
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signUp: (email: string, password: string, pseudo: string) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [adminResolved, setAdminResolved] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const sessionRef = useRef<Session | null>(null)
  sessionRef.current = session

  const fetchRoleForUser = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .maybeSingle()
    if (error) {
      console.warn('[Takap.Soccer] lecture du rôle admin:', error.message)
      setIsAdmin(false)
      return
    }
    const r = data?.role
    setIsAdmin(typeof r === 'string' && r.trim() === 'admin')
  }, [])

  const applySession = useCallback(
    async (s: Session | null, endInitialLoad: boolean) => {
      setSession(s)
      const id = s?.user?.id
      if (id) {
        setAdminResolved(false)
        try {
          await fetchRoleForUser(id)
        } catch (e) {
          console.warn('[Takap.Soccer] rôle admin (réseau ?):', e)
          setIsAdmin(false)
        } finally {
          setAdminResolved(true)
        }
      } else {
        setIsAdmin(false)
        setAdminResolved(true)
      }
      if (endInitialLoad) setLoading(false)
    },
    [fetchRoleForUser],
  )

  const refreshAdminRole = useCallback(async () => {
    const id = sessionRef.current?.user?.id
    if (!id) {
      setIsAdmin(false)
      return
    }
    setAdminResolved(false)
    try {
      await fetchRoleForUser(id)
    } catch (e) {
      console.warn('[Takap.Soccer] refreshAdminRole:', e)
      setIsAdmin(false)
    } finally {
      setAdminResolved(true)
    }
  }, [fetchRoleForUser])

  useEffect(() => {
    let mounted = true

    void supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return
      void applySession(data.session ?? null, true)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => {
      if (!mounted) return
      void applySession(s, true)
    })

    const onFocus = () => {
      const id = sessionRef.current?.user?.id
      if (!id) return
      void (async () => {
        try {
          await fetchRoleForUser(id)
        } catch {
          setIsAdmin(false)
        } finally {
          setAdminResolved(true)
        }
      })()
    }
    window.addEventListener('focus', onFocus)

    return () => {
      mounted = false
      subscription.unsubscribe()
      window.removeEventListener('focus', onFocus)
    }
  }, [applySession, fetchRoleForUser])

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error ? new Error(error.message) : null }
  }, [])

  const signUp = useCallback(async (email: string, password: string, pseudo: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { pseudo: pseudo.trim() },
        emailRedirectTo: `${window.location.origin}/`,
      },
    })
    return { error: error ? new Error(error.message) : null }
  }, [])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user: session?.user ?? null,
      session,
      loading,
      adminResolved,
      isAdmin,
      refreshAdminRole,
      signIn,
      signUp,
      signOut,
    }),
    [session, loading, adminResolved, isAdmin, refreshAdminRole, signIn, signUp, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth doit être utilisé dans AuthProvider')
  return ctx
}
