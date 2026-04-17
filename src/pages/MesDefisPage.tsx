import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { accepterDefi, fetchDefisEnvoyes, fetchDefisRecus, refuserDefi, type DefiWithNoms } from '@/lib/defis'
import { fetchCapitaineEquipeIdsForUser, fetchEquipeIdsForUser } from '@/lib/equipes'
import { cn } from '@/lib/utils'

type Tab = 'recus' | 'envoyes'

export function MesDefisPage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const nav = useNavigate()
  const [tab, setTab] = useState<Tab>('recus')
  const [recus, setRecus] = useState<DefiWithNoms[]>([])
  const [envoyes, setEnvoyes] = useState<DefiWithNoms[]>([])
  const [capIds, setCapIds] = useState<string[]>([])
  const [membreIds, setMembreIds] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const reload = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const [r, e, c, m] = await Promise.all([
      fetchDefisRecus(user.id),
      fetchDefisEnvoyes(user.id),
      fetchCapitaineEquipeIdsForUser(user.id),
      fetchEquipeIdsForUser(user.id),
    ])
    setRecus(r)
    setEnvoyes(e)
    setCapIds(c)
    setMembreIds(m)
    setLoading(false)
  }, [user])

  useEffect(() => {
    void reload()
  }, [reload])

  async function accept(id: string) {
    setErr(null)
    setBusyId(id)
    const { matchId, error } = await accepterDefi(id)
    setBusyId(null)
    if (error) {
      setErr(error.message)
      return
    }
    void reload()
    if (matchId) nav(`/matchs/${matchId}`)
  }

  async function refuse(id: string) {
    setErr(null)
    setBusyId(id)
    const { error } = await refuserDefi(id)
    setBusyId(null)
    if (error) {
      setErr(error.message)
      return
    }
    void reload()
  }

  function statutLabel(s: DefiWithNoms['statut']): string {
    if (s === 'en_attente') return t('defis.status_pending')
    if (s === 'accepte') return t('defis.status_accepted')
    return t('defis.status_refused')
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

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-[#E8F0E9]">{t('defis.title')}</h1>
        <p className="mt-2 text-sm text-[#7A9180]">{t('defis.subtitle')}</p>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setTab('recus')}
          className={cn(
            'rounded-xl px-4 py-2 text-sm font-semibold transition',
            tab === 'recus'
              ? 'border border-[rgba(0,230,118,0.35)] bg-[rgba(0,230,118,0.1)] text-[#00E676]'
              : 'border border-transparent text-[#7A9180] hover:bg-[#1A211B]',
          )}
        >
          {t('defis.tab_received')}
        </button>
        <button
          type="button"
          onClick={() => setTab('envoyes')}
          className={cn(
            'rounded-xl px-4 py-2 text-sm font-semibold transition',
            tab === 'envoyes'
              ? 'border border-[rgba(0,230,118,0.35)] bg-[rgba(0,230,118,0.1)] text-[#00E676]'
              : 'border border-transparent text-[#7A9180] hover:bg-[#1A211B]',
          )}
        >
          {t('defis.tab_sent')}
        </button>
      </div>

      {err && <p className="text-sm font-medium text-red-400">{err}</p>}

      {loading ? (
        <p className="text-sm text-[#7A9180]">{t('common.loading')}</p>
      ) : tab === 'recus' ? (
        recus.length === 0 ? (
          <p className="text-sm text-[#7A9180]">{t('defis.empty_received')}</p>
        ) : (
          <ul className="space-y-3">
            {recus.map((d) => {
              const canAct = capIds.includes(d.equipe_receveur_id) && d.statut === 'en_attente'
              const showAsMember = membreIds.includes(d.equipe_receveur_id)
              return (
                <li key={d.id}>
                  <Card className="border-[rgba(0,230,118,0.12)] bg-[#1A211B]/80">
                    <p className="font-semibold text-[#E8F0E9]">
                      {d.nom_demandeur ?? '—'} → {d.nom_receveur ?? '—'}
                    </p>
                    <p className="mt-1 text-xs text-[#7A9180]">
                      {d.date_proposee
                        ? new Date(d.date_proposee).toLocaleString(undefined, {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })
                        : '—'}
                    </p>
                    {d.message ? <p className="mt-2 text-sm text-[#7A9180]">{d.message}</p> : null}
                    <p className="mt-2 text-xs font-medium uppercase tracking-wide text-[#00E676]">
                      {statutLabel(d.statut)}
                    </p>
                    {d.match_id && d.statut === 'accepte' ? (
                      <Link
                        to={`/matchs/${d.match_id}`}
                        className="mt-3 inline-block text-sm font-semibold text-[#00E676] hover:underline"
                      >
                        {t('defis.open_match')}
                      </Link>
                    ) : null}
                    {d.statut === 'en_attente' && showAsMember && !canAct ? (
                      <p className="mt-3 text-xs text-amber-200/90">{t('defis.captain_only_actions')}</p>
                    ) : null}
                    {canAct ? (
                      <div className="mt-4 flex flex-wrap gap-2">
                        <Button
                          type="button"
                          disabled={busyId === d.id}
                          onClick={() => void accept(d.id)}
                          className="bg-[#00E676] text-[#0A0E0B]"
                        >
                          {t('defis.accept')}
                        </Button>
                        <Button type="button" variant="secondary" disabled={busyId === d.id} onClick={() => void refuse(d.id)}>
                          {t('defis.refuse')}
                        </Button>
                      </div>
                    ) : null}
                  </Card>
                </li>
              )
            })}
          </ul>
        )
      ) : envoyes.length === 0 ? (
        <p className="text-sm text-[#7A9180]">{t('defis.empty_sent')}</p>
      ) : (
        <ul className="space-y-3">
          {envoyes.map((d) => (
            <li key={d.id}>
              <Card className="border-[rgba(0,230,118,0.12)] bg-[#1A211B]/80">
                <p className="font-semibold text-[#E8F0E9]">
                  {d.nom_demandeur ?? '—'} → {d.nom_receveur ?? '—'}
                </p>
                <p className="mt-1 text-xs text-[#7A9180]">
                  {d.date_proposee
                    ? new Date(d.date_proposee).toLocaleString(undefined, {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })
                    : '—'}
                </p>
                {d.message ? <p className="mt-2 text-sm text-[#7A9180]">{d.message}</p> : null}
                <p className="mt-2 text-xs font-medium uppercase tracking-wide text-[#00E676]">{statutLabel(d.statut)}</p>
                {d.match_id && d.statut === 'accepte' ? (
                  <Link
                    to={`/matchs/${d.match_id}`}
                    className="mt-3 inline-block text-sm font-semibold text-[#00E676] hover:underline"
                  >
                    {t('defis.open_match')}
                  </Link>
                ) : null}
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
