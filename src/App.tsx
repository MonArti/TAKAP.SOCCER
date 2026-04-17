import { Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/contexts/AuthContext'
import { InscriptionRedirect } from '@/components/InscriptionRedirect'
import { Layout } from '@/components/Layout'
import { HomePage } from '@/pages/HomePage'
import { LoginPage } from '@/pages/LoginPage'
import { RegisterPage } from '@/pages/RegisterPage'
import { ProfilePage } from '@/pages/ProfilePage'
import { CreateMatchPage } from '@/pages/CreateMatchPage'
import { MatchDetailPage } from '@/pages/MatchDetailPage'
import { MyMatchesPage } from '@/pages/MyMatchesPage'
import { PublicProfilePage } from '@/pages/PublicProfilePage'
import { AdminDashboardPage } from '@/pages/AdminDashboardPage'
import { DemoExplorePage } from '@/pages/DemoExplorePage'
import { DemoJoueurPage } from '@/pages/DemoJoueurPage'
import { DemoMatchPage } from '@/pages/DemoMatchPage'
import { DemoOpenMatchPage } from '@/pages/DemoOpenMatchPage'
import { JoueursExplorePage } from '@/pages/JoueursExplorePage'
import { InvitePage } from '@/pages/InvitePage'

function Protected({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const { t } = useTranslation()
  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-muted-foreground">
        {t('app.loading_session')}
      </div>
    )
  }
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

function AppRoutes() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/inscription" element={<InscriptionRedirect />} />
        <Route path="/joueur/:id" element={<PublicProfilePage />} />
        <Route
          path="/joueurs"
          element={
            <Protected>
              <JoueursExplorePage />
            </Protected>
          }
        />
        <Route path="/demo" element={<DemoExplorePage />} />
        <Route path="/demo/joueur/:id" element={<DemoJoueurPage />} />
        <Route path="/demo/match/:id" element={<DemoMatchPage />} />
        <Route path="/demo/ouvert/:id" element={<DemoOpenMatchPage />} />
        <Route
          path="/profil"
          element={
            <Protected>
              <ProfilePage />
            </Protected>
          }
        />
        <Route
          path="/inviter"
          element={
            <Protected>
              <InvitePage />
            </Protected>
          }
        />
        <Route
          path="/matchs/nouveau"
          element={
            <Protected>
              <CreateMatchPage />
            </Protected>
          }
        />
        <Route path="/matchs/:id" element={<MatchDetailPage />} />
        <Route
          path="/mes-matchs"
          element={
            <Protected>
              <MyMatchesPage />
            </Protected>
          }
        />
        <Route
          path="/admin"
          element={
            <Protected>
              <AdminDashboardPage />
            </Protected>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  )
}

export default function App() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center bg-[#0A0E0B] text-[#7A9180]">
          Loading…
        </div>
      }
    >
      <AppRoutes />
    </Suspense>
  )
}
