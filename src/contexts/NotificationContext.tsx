import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import type { NotificationRow } from '@/types/database'

type NotificationContextValue = {
  notifications: NotificationRow[]
  unreadCount: number
  loading: boolean
  refresh: () => Promise<void>
  markAsRead: (id: string) => Promise<void>
}

const NotificationContext = createContext<NotificationContextValue | null>(null)

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<NotificationRow[]>([])
  const [loading, setLoading] = useState(false)

  const refresh = useCallback(async () => {
    if (!user) {
      setNotifications([])
      return
    }
    setLoading(true)
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50)
    setLoading(false)
    if (error) {
      console.warn('[Takap] notifications:', error.message)
      setNotifications([])
      return
    }
    setNotifications((data as NotificationRow[]) ?? [])
  }, [user])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const unreadCount = useMemo(() => notifications.filter((n) => !n.read).length, [notifications])

  const markAsRead = useCallback(
    async (id: string) => {
      if (!user) return
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', id)
        .eq('user_id', user.id)
      if (error) {
        console.warn('[Takap] mark notification read:', error.message)
        void refresh()
      }
    },
    [user, refresh],
  )

  const value = useMemo<NotificationContextValue>(
    () => ({
      notifications,
      unreadCount,
      loading,
      refresh,
      markAsRead,
    }),
    [notifications, unreadCount, loading, refresh, markAsRead],
  )

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>
}

export function useNotifications() {
  const ctx = useContext(NotificationContext)
  if (!ctx) throw new Error('useNotifications doit être utilisé dans NotificationProvider')
  return ctx
}
