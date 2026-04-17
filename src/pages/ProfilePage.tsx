import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import type { ProfileRow } from '@/types/database'
import { Card } from '@/components/Card'
import { Button } from '@/components/Button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { parseNoteMoyenne } from '@/lib/format'
import { InviteShareButtons } from '@/components/InviteShareButtons'

export function ProfilePage() {
  const { t } = useTranslation()
  const { user, refreshAdminRole, isAdmin } = useAuth()
  const [profile, setProfile] = useState<ProfileRow | null>(null)
  const [pseudo, setPseudo] = useState('')
  const [age, setAge] = useState('')
  const [taille, setTaille] = useState('')
  const [poids, setPoids] = useState('')
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [careerButs, setCareerButs] = useState(0)
  const [careerPasses, setCareerPasses] = useState(0)
  const [careerMatchsStats, setCareerMatchsStats] = useState(0)

  useEffect(() => {
    if (!user) return
    let cancelled = false
    ;(async () => {
      const [{ data, error }, { data: statRows, error: statErr }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
        supabase.from('stats_match_joueur').select('buts, passes_decisives, match_id').eq('joueur_id', user.id),
      ])
      if (cancelled) return
      if (error) setErr(error.message)
      else if (data) {
        setProfile(data as ProfileRow)
        setPseudo(data.pseudo ?? '')
        setAge(data.age != null ? String(data.age) : '')
        setTaille(data.taille != null ? String(data.taille) : '')
        setPoids(data.poids != null ? String(data.poids) : '')
      }
      if (!statErr && statRows) {
        let b = 0
        let p = 0
        const mids = new Set<string>()
        for (const r of statRows) {
          b += Number((r as { buts: number }).buts) || 0
          p += Number((r as { passes_decisives: number }).passes_decisives) || 0
          mids.add((r as { match_id: string }).match_id)
        }
        setCareerButs(b)
        setCareerPasses(p)
        setCareerMatchsStats(mids.size)
      } else {
        setCareerButs(0)
        setCareerPasses(0)
        setCareerMatchsStats(0)
      }
      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [user])

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return
    setErr(null)
    setMsg(null)
    setSaving(true)
    const parseOpt = (s: string, min: number, max: number) => {
      if (s.trim() === '') return null
      const n = parseInt(s, 10)
      if (Number.isNaN(n)) return null
      return Math.min(max, Math.max(min, n))
    }
    const payload = {
      pseudo: pseudo.trim(),
      age: parseOpt(age, 5, 99),
      taille: parseOpt(taille, 100, 250),
      poids: parseOpt(poids, 30, 200),
    }

    const { error } = await supabase.from('profiles').update(payload).eq('id', user.id)
    setSaving(false)
    if (error) {
      setErr(error.message)
      return
    }
    setMsg(t('profile.saved'))
  }

  if (loading)
    return <p className="text-sm font-medium text-muted-foreground">{t('common.loading_profile')}</p>

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">{t('profile.title')}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t('profile.subtitle')}</p>
      </div>

      {profile && (
        <Card className="border-primary/15 bg-gradient-to-br from-primary/5 to-card shadow-md ring-primary/10">
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t('profile.stats_section')}</h2>
          <dl className="mt-4 grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-muted-foreground">{t('profile.avg_rating')}</dt>
              <dd className="text-xl font-bold text-foreground">
                {parseNoteMoyenne(profile.note_moyenne).toFixed(2)} / 5
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{t('profile.matches_profile')}</dt>
              <dd className="text-xl font-bold text-foreground">{profile.nb_matchs}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{t('profile.total_goals')}</dt>
              <dd className="text-xl font-bold text-foreground">{careerButs}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{t('profile.total_assists')}</dt>
              <dd className="text-xl font-bold text-foreground">{careerPasses}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{t('profile.matches_with_stats')}</dt>
              <dd className="text-xl font-bold text-foreground">{careerMatchsStats}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{t('profile.ratio_goals')}</dt>
              <dd className="text-xl font-bold text-foreground">
                {careerMatchsStats > 0 ? (careerButs / careerMatchsStats).toFixed(2) : t('common.dash')}
              </dd>
            </div>
            <div className="col-span-2">
              <dt className="text-muted-foreground">{t('profile.role_db')}</dt>
              <dd className="mt-1 flex flex-wrap items-center gap-2 text-sm font-medium text-foreground">
                <span>{profile.role ?? t('common.dash')}</span>
                {isAdmin && (
                  <span className="rounded-full bg-primary/15 px-2.5 py-0.5 text-xs font-semibold text-primary">
                    {t('common.admin')}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => void refreshAdminRole()}
                  className="text-xs font-semibold text-primary underline underline-offset-2 hover:text-primary/80"
                >
                  {t('profile.reload_role')}
                </button>
              </dd>
              <p className="mt-2 text-xs text-muted-foreground">{t('profile.admin_sql_hint')}</p>
            </div>
          </dl>
          <p className="mt-4 text-xs text-muted-foreground">{t('profile.stats_source')}</p>
        </Card>
      )}

      <Card className="shadow-md ring-1 ring-border/80">
        <form onSubmit={save} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="pseudo">{t('common.pseudo')}</Label>
            <Input
              id="pseudo"
              required
              minLength={2}
              value={pseudo}
              onChange={(e) => setPseudo(e.target.value)}
              className="h-11"
            />
          </div>
          <Separator />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="age">{t('common.age')}</Label>
              <Input
                id="age"
                type="number"
                inputMode="numeric"
                min={5}
                max={99}
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder={t('common.dash')}
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="taille">{t('common.height_cm')}</Label>
              <Input
                id="taille"
                type="number"
                inputMode="numeric"
                min={100}
                max={250}
                value={taille}
                onChange={(e) => setTaille(e.target.value)}
                placeholder={t('common.dash')}
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="poids">{t('common.weight_kg')}</Label>
              <Input
                id="poids"
                type="number"
                inputMode="numeric"
                min={30}
                max={200}
                value={poids}
                onChange={(e) => setPoids(e.target.value)}
                placeholder={t('common.dash')}
                className="h-11"
              />
            </div>
          </div>
          {err && <p className="text-sm font-medium text-destructive">{err}</p>}
          {msg && <p className="text-sm font-medium text-primary">{msg}</p>}
          <Button type="submit" disabled={saving}>
            {saving ? t('common.saving') : t('common.save')}
          </Button>
        </form>
      </Card>

      <div className="mt-6">
        <InviteShareButtons compact />
      </div>
    </div>
  )
}
