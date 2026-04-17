import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { creerDefi } from '@/lib/defis'
import { fetchCapitaineEquipeIdsForUser, fetchEquipeById } from '@/lib/equipes'
import { supabase } from '@/lib/supabase'

function defaultDatetimeLocal(): string {
  const d = new Date()
  d.setMinutes(0, 0, 0)
  d.setHours(d.getHours() + 1)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const h = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${y}-${m}-${day}T${h}:${min}`
}

export function DefierEquipePage() {
  const { id: receveurId } = useParams<{ id: string }>()
  const { t } = useTranslation()
  const { user } = useAuth()
  const nav = useNavigate()
  const [receiverName, setReceiverName] = useState<string | null>(null)
  const [capEquipeIds, setCapEquipeIds] = useState<string[]>([])
  const [equipeLabels, setEquipeLabels] = useState<Record<string, string>>({})
  const [demandeurId, setDemandeurId] = useState('')
  const [when, setWhen] = useState(defaultDatetimeLocal)
  const [message, setMessage] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  useEffect(() => {
    if (!receveurId || !user) return
    let c = false
    void (async () => {
      const [eq, caps] = await Promise.all([
        fetchEquipeById(receveurId),
        fetchCapitaineEquipeIdsForUser(user.id),
      ])
      if (c) return
      setReceiverName(eq?.nom ?? null)
      const allowed = caps.filter((eid) => eid !== receveurId)
      setCapEquipeIds(allowed)
      if (allowed.length === 1) setDemandeurId(allowed[0])
      if (allowed.length > 0) {
        const { data } = await supabase.from('equipes').select('id, nom').in('id', allowed)
        const map: Record<string, string> = {}
        for (const row of data ?? []) {
          map[row.id as string] = row.nom as string
        }
        setEquipeLabels(map)
      }
    })()
    return () => {
      c = true
    }
  }, [receveurId, user])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!user || !receveurId || !demandeurId) return
    setErr(null)
    setPending(true)
    const { error } = await creerDefi(demandeurId, receveurId, new Date(when).toISOString(), message.trim() || null)
    setPending(false)
    if (error) {
      if (error.message === 'same_team') setErr(t('defis.err_same_team'))
      else setErr(error.message)
      return
    }
    nav('/defis')
  }

  if (!user) {
    return (
      <Card className="border-[rgba(0,230,118,0.12)] bg-[#1A211B]/80">
        <p className="text-[#7A9180]">{t('defis.login_required')}</p>
        <Link to="/login" className="mt-2 inline-block font-semibold text-[#00E676] hover:underline">
          {t('common.login')}
        </Link>
      </Card>
    )
  }

  if (!receveurId) {
    return <p className="text-sm text-[#7A9180]">{t('match_detail.not_found')}</p>
  }

  return (
    <div className="space-y-8">
      <Link
        to={`/teams/${receveurId}`}
        className="text-sm font-semibold text-[#00E676] hover:underline"
      >
        ← {t('defis.back_team')}
      </Link>
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-[#E8F0E9]">{t('defis.challenge_title')}</h1>
        <p className="mt-2 text-sm text-[#7A9180]">
          {receiverName ? t('defis.challenge_subtitle_team', { name: receiverName }) : t('defis.challenge_subtitle')}
        </p>
      </div>

      {capEquipeIds.length === 0 ? (
        <Card className="border-[rgba(0,230,118,0.12)] bg-[#1A211B]/80">
          <p className="text-sm text-[#7A9180]">{t('defis.no_captain_team')}</p>
        </Card>
      ) : (
        <Card className="border-[rgba(0,230,118,0.12)] bg-[#1A211B]/80 ring-1 ring-[rgba(0,230,118,0.08)]">
          <form onSubmit={(e) => void submit(e)} className="space-y-5">
            {capEquipeIds.length > 1 && (
              <div className="space-y-2">
                <Label htmlFor="dem">{t('defis.your_team_label')}</Label>
                <select
                  id="dem"
                  required
                  value={demandeurId}
                  onChange={(e) => setDemandeurId(e.target.value)}
                  className="flex h-11 w-full max-w-md rounded-lg border border-[rgba(0,230,118,0.2)] bg-[#0A0E0B] px-3 text-sm text-[#E8F0E9] outline-none focus-visible:ring-2 focus-visible:ring-[#00E676]"
                >
                  <option value="">{t('defis.pick_team')}</option>
                  {capEquipeIds.map((eid) => (
                    <option key={eid} value={eid}>
                      {equipeLabels[eid] ?? eid}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="dt">{t('defis.datetime_label')}</Label>
              <Input
                id="dt"
                type="datetime-local"
                required
                value={when}
                onChange={(e) => setWhen(e.target.value)}
                className="h-11 max-w-md border-[rgba(0,230,118,0.2)] bg-[#0A0E0B] text-[#E8F0E9]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="msg">{t('defis.message_label')}</Label>
              <Input
                id="msg"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={t('defis.message_placeholder')}
                className="max-w-lg border-[rgba(0,230,118,0.2)] bg-[#0A0E0B] text-[#E8F0E9]"
              />
            </div>
            {err && <p className="text-sm font-medium text-red-400">{err}</p>}
            <Button type="submit" disabled={pending || !demandeurId} className="border-[rgba(0,230,118,0.25)]">
              {pending ? t('defis.sending') : t('defis.send_challenge')}
            </Button>
          </form>
        </Card>
      )}
    </div>
  )
}
