import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Trophy, Users, UserPlus, PlusCircle, ChevronRight } from 'lucide-react'
import { Card } from '@/components/Card'
import { fetchEquipesForHub, type EquipeHubRow } from '@/lib/equipes'

export function TeamsHubPage() {
  const { t } = useTranslation()
  const [rows, setRows] = useState<EquipeHubRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let c = false
    void fetchEquipesForHub(100).then((list) => {
      if (!c) {
        setRows(list)
        setLoading(false)
      }
    })
    return () => {
      c = true
    }
  }, [])

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-[#E8F0E9]">{t('teams.hub_title')}</h1>
        <p className="mt-2 text-sm text-[#7A9180]">{t('teams.hub_subtitle')}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Link
          to="/equipes/creer"
          className="flex items-center gap-3 rounded-2xl border border-[rgba(0,230,118,0.2)] bg-[#1A211B] p-4 transition hover:border-[rgba(0,230,118,0.45)]"
        >
          <PlusCircle className="size-8 shrink-0 text-[#00E676]" />
          <span className="font-semibold text-[#E8F0E9]">{t('teams.cta_create')}</span>
        </Link>
        <Link
          to="/equipes/rejoindre"
          className="flex items-center gap-3 rounded-2xl border border-[rgba(0,230,118,0.2)] bg-[#1A211B] p-4 transition hover:border-[rgba(0,230,118,0.45)]"
        >
          <UserPlus className="size-8 shrink-0 text-[#00E676]" />
          <span className="font-semibold text-[#E8F0E9]">{t('teams.cta_join')}</span>
        </Link>
        <Link
          to="/equipes/mon-equipe"
          className="flex items-center gap-3 rounded-2xl border border-[rgba(0,230,118,0.2)] bg-[#1A211B] p-4 transition hover:border-[rgba(0,230,118,0.45)]"
        >
          <Users className="size-8 shrink-0 text-[#00E676]" />
          <span className="font-semibold text-[#E8F0E9]">{t('teams.cta_my_team')}</span>
        </Link>
        <div className="flex items-center gap-3 rounded-2xl border border-[rgba(0,230,118,0.08)] bg-[#1A211B]/50 p-4 opacity-80">
          <Trophy className="size-8 shrink-0 text-[#7A9180]" />
          <span className="text-sm font-medium text-[#7A9180]">{t('teams.list_live_hint')}</span>
        </div>
      </div>

      <Card className="border-[rgba(0,230,118,0.12)] bg-[#1A211B]/80 ring-1 ring-[rgba(0,230,118,0.08)]">
        <div className="flex items-center gap-2 border-b border-[rgba(0,230,118,0.12)] pb-4">
          <Trophy className="size-5 text-[#FFD600]" />
          <h2 className="text-lg font-bold text-[#E8F0E9]">{t('teams.list_title')}</h2>
        </div>
        {loading ? (
          <p className="mt-4 text-sm text-[#7A9180]">{t('common.loading')}</p>
        ) : rows.length === 0 ? (
          <p className="mt-4 text-sm text-[#7A9180]">{t('teams.leaderboard_empty')}</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {rows.map((eq) => {
              const c1 = eq.couleur_principale ?? '#1A211B'
              const c2 = eq.couleur_secondaire ?? '#0A0E0B'
              const hasRecord = eq.nb_victoires != null || eq.nb_defaites != null
              const nbMatchs = eq.nb_matchs

              return (
                <li
                  key={eq.id}
                  className="flex flex-col gap-4 rounded-xl border border-[rgba(0,230,118,0.08)] bg-[#0A0E0B] px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    {eq.logo_url ? (
                      <img
                        src={eq.logo_url}
                        alt=""
                        className="size-12 shrink-0 rounded-xl object-cover ring-1 ring-[rgba(0,230,118,0.12)]"
                      />
                    ) : (
                      <div
                        className="size-12 shrink-0 rounded-xl ring-1 ring-[rgba(0,230,118,0.12)]"
                        style={{ background: `linear-gradient(135deg, ${c1}, ${c2})` }}
                      />
                    )}
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate font-semibold text-[#E8F0E9]">{eq.nom}</p>
                        <span className="inline-flex shrink-0 items-center gap-1 rounded-md border border-[rgba(0,230,118,0.15)] px-1.5 py-0.5">
                          <span className="size-2.5 rounded-full" style={{ backgroundColor: c1 }} />
                          <span className="size-2.5 rounded-full" style={{ backgroundColor: c2 }} />
                        </span>
                      </div>
                      <p className="truncate text-xs text-[#7A9180]">
                        {[eq.ville, eq.stade].filter(Boolean).join(' · ') || '—'}
                      </p>
                      <p className="text-xs text-[#7A9180]">
                        <span className="inline-flex items-center gap-1 font-medium text-[#E8F0E9]">
                          <Users className="size-3.5 text-[#00E676]" />
                          {eq.memberCount}
                        </span>
                        <span className="mx-2 text-[rgba(122,145,128,0.5)]">|</span>
                        {hasRecord ? (
                          <span className="tabular-nums">
                            <span className="text-[#00E676]">{eq.nb_victoires}</span>
                            {t('teams.wins_suffix')}
                            <span className="mx-1 text-[#7A9180]">·</span>
                            <span className="text-[#FF6B6B]">{eq.nb_defaites}</span>
                            {t('teams.losses_suffix')}
                            {nbMatchs != null ? (
                              <>
                                <span className="mx-1 text-[#7A9180]">·</span>
                                <span className="text-[#E8F0E9]">
                                  {t('teams.nb_matchs_label', { count: nbMatchs })}
                                </span>
                              </>
                            ) : null}
                          </span>
                        ) : (
                          <span>
                            {t('teams.record_unknown')}
                            {nbMatchs != null ? (
                              <>
                                <span className="mx-1 text-[#7A9180]">·</span>
                                <span className="text-[#E8F0E9]">
                                  {t('teams.nb_matchs_label', { count: nbMatchs })}
                                </span>
                              </>
                            ) : null}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  <Link
                    to={`/teams/${eq.id}`}
                    className="inline-flex shrink-0 items-center justify-center gap-1 rounded-xl border border-[rgba(0,230,118,0.35)] bg-[#1A211B] px-4 py-2.5 text-sm font-semibold text-[#00E676] transition hover:border-[#00E676] hover:bg-[rgba(0,230,118,0.08)] sm:justify-start"
                  >
                    {t('teams.view_team')}
                    <ChevronRight className="size-4" />
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </Card>
    </div>
  )
}
