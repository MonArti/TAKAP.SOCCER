import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/contexts/AuthContext'
import { Card } from '@/components/Card'
import { Button } from '@/components/Button'

export function RegisterPage() {
  const { t } = useTranslation()
  const { user, signUp } = useAuth()
  const nav = useNavigate()
  const [searchParams] = useSearchParams()
  const refCode = searchParams.get('ref')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [pseudo, setPseudo] = useState('')
  const [parrainCode, setParrainCode] = useState(() => refCode?.trim().toUpperCase() ?? '')
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  useEffect(() => {
    if (refCode?.trim()) {
      setParrainCode(refCode.trim().toUpperCase())
    }
  }, [refCode])

  useEffect(() => {
    if (user) {
      nav('/', { replace: true })
    }
  }, [user, nav])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setInfo(null)
    if (pseudo.trim().length < 2) {
      setError(t('auth.pseudo_min_error'))
      return
    }
    setPending(true)
    const code = parrainCode.trim() || null
    const { error: err } = await signUp(email.trim(), password, pseudo.trim(), code)
    setPending(false)
    if (err) {
      setError(err.message)
      return
    }
    setInfo(t('auth.account_created_info'))
    setTimeout(() => nav('/login?registered=1'), 4000)
  }

  const field =
    'mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground outline-none transition focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40'

  return (
    <div className="mx-auto max-w-md space-y-6">
      <div className="text-center">
        <div className="text-2xl font-black tracking-tight text-[#00E676]">{t('brand.title')}</div>
        <p className="mt-2 text-sm text-muted-foreground">{t('auth.register_tagline')}</p>
      </div>

      <Card className="border-primary/15 ring-1 ring-primary/10">
        <h1 className="text-xl font-bold tracking-tight text-foreground">{t('auth.register_title')}</h1>

        {refCode && (
          <p className="mt-4 rounded-lg border border-[rgba(0,230,118,0.25)] bg-[rgba(0,230,118,0.1)] px-3 py-2 text-sm text-[#E8F0E9]">
            {t('auth.ref_invite_banner', { code: refCode })}
          </p>
        )}

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="pseudo" className="block text-sm font-medium text-muted-foreground">
              {t('common.pseudo')}
            </label>
            <input
              id="pseudo"
              type="text"
              required
              minLength={2}
              value={pseudo}
              onChange={(e) => setPseudo(e.target.value)}
              className={field}
              placeholder={t('auth.pseudo_placeholder')}
            />
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-muted-foreground">
              {t('common.email')}
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={field}
              placeholder={t('auth.email_placeholder')}
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-muted-foreground">
              {t('common.password')}
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
            <p className="mt-1 text-xs text-muted-foreground">{t('auth.password_min_hint')}</p>
          </div>
          <div>
            <label htmlFor="parrain" className="block text-sm font-medium text-muted-foreground">
              {t('auth.sponsor_code_label')}
            </label>
            <input
              id="parrain"
              type="text"
              value={parrainCode}
              onChange={(e) => setParrainCode(e.target.value.toUpperCase())}
              className={field}
              placeholder={t('auth.sponsor_placeholder')}
              autoComplete="off"
            />
            <p className="mt-1 text-xs text-muted-foreground">{t('auth.sponsor_code_help')}</p>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          {info && <p className="text-sm text-primary">{info}</p>}
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? t('auth.creating_account') : t('auth.create_account')}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          {t('auth.has_account')}{' '}
          <Link to="/login" className="font-semibold text-primary hover:underline">
            {t('auth.login_title')}
          </Link>
        </p>
      </Card>
    </div>
  )
}
