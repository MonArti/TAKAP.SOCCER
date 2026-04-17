import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Calendar, Plus, Users } from 'lucide-react'
import { Card } from '@/components/Card'
import { DEFAULT_NB_EQUIPES_MAX_TOURNOI, fetchTournoisList, type TournoiWithExtras } from '@/lib/tournois'

export function TournoisListPage() {
  const { t } = useTranslation()
  const [rows, setRows] = useState<TournoiWithExtras[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let c = false
    void fetchTournoisList().then((r) => {
      if (!c) {
        setRows(r)
        setLoading(false)
      }
    })
    return () => {
      c = true
    }
  }, [])

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#E8F0E9]">{t('tournois.list_title')}</h1>
          <p className="mt-2 text-sm text-[#7A9180]">{t('tournois.list_subtitle')}</p>
        </div>
        <Link
          to="/tournois/creer"
          className="inline-flex h-auto min-h-10 items-center gap-2 rounded-xl border border-[rgba(0,230,118,0.35)] bg-[#1A211B] px-4 py-2.5 text-sm font-semibold text-[#00E676] transition hover:border-[#00E676]"
        >
          <Plus className="size-4" />
          {t('tournois.create_cta')}
        </Link>
      </div>

      {loading ? (
        <p className="text-sm text-[#7A9180]">{t('common.loading')}</p>
      ) : rows.length === 0 ? (
        <Card className="border-[rgba(0,230,118,0.12)] bg-[#1A211B]/80">
          <p className="text-[#7A9180]">{t('tournois.empty')}</p>
          <Link
            to="/tournois/creer"
            className="mt-4 inline-flex min-h-10 items-center rounded-xl border border-[rgba(0,230,118,0.35)] px-4 py-2.5 text-sm font-semibold text-[#00E676]"
          >
            {t('tournois.create_cta')}
          </Link>
        </Card>
      ) : (
        <ul className="space-y-3">
          {rows.map((tr) => {
            const max =
              typeof tr.nb_equipes_max === 'number' && tr.nb_equipes_max > 0
                ? tr.nb_equipes_max
                : DEFAULT_NB_EQUIPES_MAX_TOURNOI
            const remaining = Math.max(0, max - tr.nb_equipes)
            return (
              <li key={tr.id}>
                <Link to={`/tournois/${tr.id}`}>
                  <Card className="border-[rgba(0,230,118,0.12)] bg-[#1A211B]/80 transition hover:border-[rgba(0,230,118,0.35)]">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="min-w-0">
                        <h2 className="truncate text-lg font-bold text-[#E8F0E9]">{tr.nom}</h2>
                        <div className="mt-1 flex flex-wrap gap-3 text-xs text-[#7A9180]">
                          {tr.lieu && (
                            <span className="inline-flex items-center gap-1">
                              <Calendar className="size-3.5" />
                              {tr.lieu}
                            </span>
                          )}
                          <span className="inline-flex items-center gap-1">
                            <Users className="size-3.5 text-[#00E676]" />
                            {t('tournois.nb_teams', { count: tr.nb_equipes })}
                          </span>
                          <span className="inline-flex items-center gap-1 text-[#E8F0E9]">
                            {t('tournois.slots_remaining', { remaining, max })}
                          </span>
                          <span className="rounded-md bg-[#0A0E0B] px-2 py-0.5 text-[#7A9180]">{tr.statut}</span>
                        </div>
                      </div>
                    </div>
                  </Card>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
