import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Card } from '@/components/Card'
import { Button } from '@/components/Button'

export function RegisterPage() {
  const { signUp } = useAuth()
  const nav = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [pseudo, setPseudo] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setInfo(null)
    if (pseudo.trim().length < 2) {
      setError('Le pseudo doit contenir au moins 2 caractères.')
      return
    }
    setPending(true)
    const { error: err } = await signUp(email.trim(), password, pseudo.trim())
    setPending(false)
    if (err) {
      setError(err.message)
      return
    }
    setInfo(
      'Compte créé. Si la confirmation email est activée sur ton projet Supabase, vérifie ta boîte mail puis connecte-toi.',
    )
    setTimeout(() => nav('/login'), 4000)
  }

  return (
    <div className="mx-auto max-w-md space-y-6">
      <h1 className="text-2xl font-bold text-zinc-900">Inscription</h1>
      <Card>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label htmlFor="pseudo" className="block text-sm font-medium text-zinc-700">
              Pseudo
            </label>
            <input
              id="pseudo"
              type="text"
              required
              minLength={2}
              value={pseudo}
              onChange={(e) => setPseudo(e.target.value)}
              className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none ring-brand-600 focus:ring-2"
            />
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-zinc-700">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none ring-brand-600 focus:ring-2"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-zinc-700">
              Mot de passe
            </label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none ring-brand-600 focus:ring-2"
            />
            <p className="mt-1 text-xs text-zinc-400">Minimum 6 caractères (règle Supabase par défaut).</p>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          {info && <p className="text-sm text-brand-800">{info}</p>}
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? 'Création…' : 'Créer mon compte'}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-zinc-500">
          Déjà inscrit ?{' '}
          <Link to="/login" className="font-semibold text-brand-700 hover:underline">
            Connexion
          </Link>
        </p>
      </Card>
    </div>
  )
}
