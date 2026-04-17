import { Link, useParams } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Shield, Swords, Users } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { Card } from '@/components/Card'
import { fetchEquipeById, fetchEquipeIdsForUser, fetchMembresEquipe, type MembreEquipeWithProfile } from '@/lib/equipes'
import type { EquipeRow } from '@/types/database'

export function TeamDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { t } = useTranslation()
  const { user } = useAuth()
  const [equipe, setEquipe] = useState<EquipeRow | null | undefined>(undefined)
  const [membres, setMembres] = useState<MembreEquipeWithProfile[]>([])
  const [myEquipeIds, setMyEquipeIds] = useState<string[]>([])

  useEffect(() => {
    if (!id) {
      setEquipe(null)
      return
    }
    let c = false
    void (async () => {
      const [eq, mem] = await Promise.all([fetchEquipeById(id), fetchMembresEquipe(id)])
      if (!c) {
        setEquipe(eq)
        setMembres(mem)
      }
    })()
    return () => {
      c = true
    }
  }, [id])

  useEffect(() => {
    if (!user) {
      setMyEquipeIds([])
      return
    }
    let c = false
    void fetchEquipeIdsForUser(user.id).then((ids) => {
      if (!c) setMyEquipeIds(ids)
    })
    return () => {
      c = true
    }
  }, [user])

  if (equipe === undefined) {
    return (
      <div className="space-y-6">
        <p className="text-sm text-[#7A9180]">{t('common.loading')}</p>
      </div>
    )
  }

  if (!equipe) {
    return (
      <div className="space-y-4">
        <Link
          to="/teams"
          className="inline-flex items-center gap-2 text-sm font-medium text-[#00E676] hover:underline"
        >
          <ArrowLeft className="size-4" />
          {t('teams.back_to_list')}
        </Link>
        <p className="text-[#7A9180]">{t('teams.detail_not_found')}</p>
      </div>
    )
  }

  const c1 = equipe.couleur_principale ?? '#1A211B'
  const c2 = equipe.couleur_secondaire ?? '#0A0E0B'
  const hasRecord = equipe.nb_victoires != null || equipe.nb_defaites != null
  const nbMatchs = equipe.nb_matchs
  const canChallenge =
    Boolean(user) && myEquipeIds.length > 0 && id != null && !myEquipeIds.includes(id)

  return (
    <div className="space-y-8">
      <Link
        to="/teams"
        className="inline-flex items-center gap-2 text-sm font-medium text-[#00E676] hover:underline"
      >
        <ArrowLeft className="size-4" />
        {t('teams.back_to_list')}
      </Link>

      <div className="flex flex-wrap items-start gap-6">
        {equipe.logo_url ? (
          <img
            src={equipe.logo_url}
            alt=""
            className="size-24 shrink-0 rounded-2xl border border-[rgba(0,230,118,0.15)] object-cover"
          />
        ) : (
          <div
            className="size-24 shrink-0 rounded-2xl border border-[rgba(0,230,118,0.15)]"
            style={{ background: `linear-gradient(135deg, ${c1}, ${c2})` }}
          />
        )}
        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight text-[#E8F0E9]">{equipe.nom}</h1>
            <span
              className="inline-flex items-center gap-1.5 rounded-lg border border-[rgba(0,230,118,0.2)] px-2 py-1 text-xs text-[#7A9180]"
              title={t('teams.colors')}
            >
              <span className="size-3 rounded-full ring-1 ring-white/20" style={{ backgroundColor: c1 }} />
              <span className="size-3 rounded-full ring-1 ring-white/20" style={{ backgroundColor: c2 }} />
            </span>
          </div>
          <p className="text-sm text-[#7A9180]">
            {[equipe.ville, equipe.stade].filter(Boolean).join(' · ') || '—'}
          </p>
          <div className="flex flex-wrap gap-4 text-sm">
            <span className="inline-flex items-center gap-1.5 text-[#7A9180]">
              <Users className="size-4 text-[#00E676]" />
              {membres.length} {t('teams.stat_members').toLowerCase()}
            </span>
            {hasRecord ? (
              <span className="tabular-nums text-[#E8F0E9]">
                <span className="font-semibold text-[#00E676]">{equipe.nb_victoires}</span>
                {t('teams.wins_suffix')}
                <span className="mx-1.5 text-[#7A9180]">·</span>
                <span className="font-semibold text-[#FF6B6B]">{equipe.nb_defaites}</span>
                {t('teams.losses_suffix')}
                {nbMatchs != null ? (
                  <>
                    <span className="mx-1.5 text-[#7A9180]">·</span>
                    <span>{t('teams.nb_matchs_label', { count: nbMatchs })}</span>
                  </>
                ) : null}
              </span>
            ) : (
              <span className="text-[#7A9180]">
                {t('teams.record_unknown')}
                {nbMatchs != null ? (
                  <>
                    <span className="mx-1.5 text-[#7A9180]">·</span>
                    <span className="text-[#E8F0E9]">{t('teams.nb_matchs_label', { count: nbMatchs })}</span>
                  </>
                ) : null}
              </span>
            )}
          </div>
          {canChallenge && id ? (
            <Link
              to={`/equipes/${id}/defier`}
              className="mt-4 inline-flex h-auto min-h-10 items-center gap-2 rounded-xl border border-[rgba(0,230,118,0.35)] bg-[#1A211B] px-4 py-2.5 text-sm font-semibold text-[#00E676] transition hover:border-[#00E676]"
            >
              <Swords className="size-4 shrink-0" aria-hidden />
              {t('defis.challenge_cta')}
            </Link>
          ) : null}
        </div>
      </div>

      <Card className="border-[rgba(0,230,118,0.12)] bg-[#1A211B]/80 ring-1 ring-[rgba(0,230,118,0.08)]">
        <div className="flex items-center gap-2 border-b border-[rgba(0,230,118,0.12)] pb-4">
          <Shield className="size-5 text-[#00E676]" />
          <h2 className="text-lg font-bold text-[#E8F0E9]">{t('teams.members_title')}</h2>
        </div>
        {membres.length === 0 ? (
          <p className="mt-4 text-sm text-[#7A9180]">{t('teams.detail_no_members')}</p>
        ) : (
          <ul className="mt-4 divide-y divide-[rgba(0,230,118,0.08)]">
            {membres.map((m) => (
              <li
                key={`${m.equipe_id}-${m.joueur_id}`}
                className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0"
              >
                <div>
                  <p className="font-medium text-[#E8F0E9]">{m.profiles?.pseudo ?? t('teams.member_unknown')}</p>
                  <p className="text-xs text-[#7A9180]">
                    {m.role === 'captain' || m.role === 'capitaine'
                      ? t('teams.role_captain')
                      : t('teams.role_member')}
                  </p>
                </div>
                {m.profiles?.id ? (
                  <Link
                    to={`/joueur/${m.profiles.id}`}
                    className="text-sm font-semibold text-[#00E676] hover:underline"
                  >
                    {t('teams.view_profile')}
                  </Link>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}
