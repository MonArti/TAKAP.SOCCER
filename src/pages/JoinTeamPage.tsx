import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/contexts/AuthContext'
import { Card } from '@/components/Card'
import { Button } from '@/components/Button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { joinTeamByCode } from '@/lib/teams'

export function JoinTeamPage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const nav = useNavigate()
  const [code, setCode] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return
    setErr(null)
    setPending(true)
    const { teamId, error } = await joinTeamByCode(code, user.id)
    setPending(false)
    if (error) {
      if (error.message === 'code_not_found') setErr(t('teams.join_err_not_found'))
      else if (error.message === 'already_member') setErr(t('teams.join_err_duplicate'))
      else setErr(error.message)
      return
    }
    if (teamId) nav('/equipes/mon-equipe')
  }

  return (
    <div className="mx-auto max-w-lg space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-[#E8F0E9]">{t('teams.join_title')}</h1>
        <p className="mt-2 text-sm text-[#7A9180]">{t('teams.join_subtitle')}</p>
      </div>

      <Card className="border-[rgba(0,230,118,0.12)] bg-[#1A211B]/80 ring-1 ring-[rgba(0,230,118,0.08)]">
        <form onSubmit={submit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="invite">{t('teams.invite_code_label')}</Label>
            <Input
              id="invite"
              required
              autoCapitalize="characters"
              autoComplete="off"
              placeholder="TAKAP123"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              className="h-12 border-[rgba(0,230,118,0.2)] bg-[#0A0E0B] text-center font-mono text-lg tracking-widest text-[#E8F0E9]"
            />
          </div>
          {err && <p className="text-sm font-medium text-red-400">{err}</p>}
          <Button type="submit" disabled={pending} className="w-full">
            {pending ? t('teams.joining') : t('teams.join_submit')}
          </Button>
        </form>
      </Card>
    </div>
  )
}
