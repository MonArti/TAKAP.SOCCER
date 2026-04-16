import { Navigate, useSearchParams } from 'react-router-dom'

/** Redirige /inscription?ref=… vers /register?ref=… (même paramètres). */
export function InscriptionRedirect() {
  const [sp] = useSearchParams()
  const ref = sp.get('ref')
  const to = ref != null && ref !== '' ? `/register?ref=${encodeURIComponent(ref)}` : '/register'
  return <Navigate to={to} replace />
}
