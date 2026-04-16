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

  const field =
    'mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground outline-none transition focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40'

  return (
    <div className="mx-auto max-w-md space-y-6">
      <h1 className="text-2xl font-bold tracking-tight text-foreground">Inscription</h1>
      <Card className="border-primary/15 ring-1 ring-primary/10">
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label htmlFor="pseudo" className="block text-sm font-medium text-muted-foreground">
              Pseudo
            </label>
            <input
              id="pseudo"
              type="text"
              required
              minLength={2}
              value={pseudo}
              onChange={(e) => setPseudo(e.target.value)}
              className={field}
            />
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-muted-foreground">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={field}
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-muted-foreground">
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
              className={field}
            />
            <p className="mt-1 text-xs text-muted-foreground">Minimum 6 caractères (règle Supabase par défaut).</p>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          {info && <p className="text-sm text-primary">{info}</p>}
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? 'Création…' : 'Créer mon compte'}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Déjà inscrit ?{' '}
          <Link to="/login" className="font-semibold text-primary hover:underline">
            Connexion
          </Link>
        </p>
      </Card>
    </div>
  )
}
