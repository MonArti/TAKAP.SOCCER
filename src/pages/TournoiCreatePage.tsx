import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/contexts/AuthContext'
import { Card } from '@/components/Card'
import { Button } from '@/components/Button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createTournoi, DEFAULT_NB_EQUIPES_MAX_TOURNOI } from '@/lib/tournois'
import type { TournoiType } from '@/types/database'

export function TournoiCreatePage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const nav = useNavigate()
  const [nom, setNom] = useState('')
  const [dateDebut, setDateDebut] = useState('')
  const [dateFin, setDateFin] = useState('')
  const [lieu, setLieu] = useState('')
  const [type, setType] = useState<TournoiType | ''>('')
  const [nbEquipesMax, setNbEquipesMax] = useState<number>(DEFAULT_NB_EQUIPES_MAX_TOURNOI)
  const [err, setErr] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return
    setErr(null)
    setPending(true)
    const { id, error } = await createTournoi({
      nom,
      date_debut: dateDebut || null,
      date_fin: dateFin || null,
      lieu,
      type: type || null,
      organisateur_id: user.id,
      nb_equipes_max: nbEquipesMax,
    })
    setPending(false)
    if (error) {
      setErr(error.message)
      return
    }
    if (id) nav(`/tournois/${id}`)
    else setErr(t('tournois.create_err'))
  }

  if (!user) {
    return (
      <Card>
        <p className="text-muted-foreground">{t('tournois.login_required')}</p>
        <Link to="/login" className="mt-2 inline-block font-semibold text-primary hover:underline">
          {t('common.login')}
        </Link>
      </Card>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <Link to="/tournois" className="text-sm font-semibold text-primary hover:underline">
          ← {t('tournois.back_list')}
        </Link>
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-foreground">{t('tournois.create_title')}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t('tournois.create_subtitle')}</p>
      </div>

      <Card className="shadow-md ring-1 ring-border/80">
        <form onSubmit={(e) => void submit(e)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="tnom">{t('tournois.field_name')}</Label>
            <Input id="tnom" value={nom} onChange={(e) => setNom(e.target.value)} required className="max-w-lg" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="tdeb">{t('tournois.field_start')}</Label>
              <Input id="tdeb" type="date" value={dateDebut} onChange={(e) => setDateDebut(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tfin">{t('tournois.field_end')}</Label>
              <Input id="tfin" type="date" value={dateFin} onChange={(e) => setDateFin(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="tlieu">{t('tournois.field_place')}</Label>
            <Input id="tlieu" value={lieu} onChange={(e) => setLieu(e.target.value)} className="max-w-lg" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ttype">{t('tournois.field_type')}</Label>
            <select
              id="ttype"
              value={type}
              onChange={(e) => setType(e.target.value as TournoiType | '')}
              className="flex h-11 w-full max-w-md rounded-lg border border-input bg-background px-3 text-sm text-foreground shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">{t('tournois.type_placeholder')}</option>
              <option value="elimination">{t('tournois.type_knockout')}</option>
              <option value="poules">{t('tournois.type_groups')}</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="tmax">{t('tournois.field_max_teams')}</Label>
            <select
              id="tmax"
              value={nbEquipesMax}
              onChange={(e) => setNbEquipesMax(Number(e.target.value))}
              className="flex h-11 w-full max-w-md rounded-lg border border-input bg-background px-3 text-sm text-foreground shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {[4, 8, 16, 32].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">{t('tournois.field_max_teams_hint')}</p>
          </div>
          {err && <p className="text-sm font-medium text-destructive">{err}</p>}
          <Button type="submit" disabled={pending}>
            {pending ? t('tournois.creating') : t('tournois.submit')}
          </Button>
        </form>
      </Card>
    </div>
  )
}
