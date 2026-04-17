import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/contexts/AuthContext'
import { Card } from '@/components/Card'
import { Button } from '@/components/Button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { createTeam } from '@/lib/teams'

export function CreateTeamPage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const nav = useNavigate()
  const [name, setName] = useState('')
  const [city, setCity] = useState('')
  const [stadium, setStadium] = useState('')
  const [logoUrl, setLogoUrl] = useState('')
  const [colorPrimary, setColorPrimary] = useState('#00E676')
  const [colorSecondary, setColorSecondary] = useState('#0A0E0B')
  const [err, setErr] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return
    setErr(null)
    setPending(true)
    const { team, error } = await createTeam({
      name,
      city,
      stadium,
      logoUrl: logoUrl.trim() || null,
      colorPrimary,
      colorSecondary,
      createdBy: user.id,
    })
    setPending(false)
    if (error) {
      setErr(error.message)
      return
    }
    if (team) nav(`/equipes/mon-equipe`)
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-[#E8F0E9]">{t('teams.create_title')}</h1>
        <p className="mt-2 text-sm text-[#7A9180]">{t('teams.create_subtitle')}</p>
      </div>

      <Card className="border-[rgba(0,230,118,0.12)] bg-[#1A211B]/80 ring-1 ring-[rgba(0,230,118,0.08)]">
        <form onSubmit={submit} className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="tname">{t('teams.field_name')}</Label>
              <Input
                id="tname"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-11 border-[rgba(0,230,118,0.15)] bg-[#0A0E0B] text-[#E8F0E9]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tcity">{t('teams.field_city')}</Label>
              <Input
                id="tcity"
                required
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="h-11 border-[rgba(0,230,118,0.15)] bg-[#0A0E0B] text-[#E8F0E9]"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tstadium">{t('teams.field_stadium')}</Label>
            <Input
              id="tstadium"
              required
              value={stadium}
              onChange={(e) => setStadium(e.target.value)}
              className="h-11 border-[rgba(0,230,118,0.15)] bg-[#0A0E0B] text-[#E8F0E9]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tlogo">{t('teams.field_logo_url')}</Label>
            <Input
              id="tlogo"
              type="url"
              placeholder="https://…"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              className="h-11 border-[rgba(0,230,118,0.15)] bg-[#0A0E0B] text-[#E8F0E9]"
            />
            <p className="text-xs text-[#7A9180]">{t('teams.field_logo_hint')}</p>
          </div>

          <Separator className="bg-[rgba(0,230,118,0.12)]" />

          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="c1">{t('teams.field_color_primary')}</Label>
              <div className="flex items-center gap-3">
                <input
                  id="c1"
                  type="color"
                  value={colorPrimary}
                  onChange={(e) => setColorPrimary(e.target.value)}
                  className="h-11 w-16 cursor-pointer rounded border border-[rgba(0,230,118,0.2)] bg-[#0A0E0B] p-1"
                />
                <Input
                  value={colorPrimary}
                  onChange={(e) => setColorPrimary(e.target.value)}
                  className="h-11 flex-1 font-mono text-sm"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="c2">{t('teams.field_color_secondary')}</Label>
              <div className="flex items-center gap-3">
                <input
                  id="c2"
                  type="color"
                  value={colorSecondary}
                  onChange={(e) => setColorSecondary(e.target.value)}
                  className="h-11 w-16 cursor-pointer rounded border border-[rgba(0,230,118,0.2)] bg-[#0A0E0B] p-1"
                />
                <Input
                  value={colorSecondary}
                  onChange={(e) => setColorSecondary(e.target.value)}
                  className="h-11 flex-1 font-mono text-sm"
                />
              </div>
            </div>
          </div>

          {err && <p className="text-sm font-medium text-red-400">{err}</p>}

          <Button type="submit" disabled={pending} className="w-full sm:w-auto">
            {pending ? t('teams.creating') : t('teams.create_submit')}
          </Button>
        </form>
      </Card>
    </div>
  )
}
