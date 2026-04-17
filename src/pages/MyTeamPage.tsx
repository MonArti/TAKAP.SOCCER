import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Copy, Users } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { Card } from '@/components/Card'
import { Button } from '@/components/Button'
import {
  countTeamMatches,
  fetchTeamMembers,
  fetchTeamsForUser,
  type MemberWithProfile,
  type TeamRow,
} from '@/lib/teams'

export function MyTeamPage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [teams, setTeams] = useState<TeamRow[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [members, setMembers] = useState<MemberWithProfile[]>([])
  const [matchCount, setMatchCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!user) {
      setLoading(false)
      return
    }
    let c = false
    void (async () => {
      const list = await fetchTeamsForUser(user.id)
      if (c) return
      setTeams(list)
      if (list.length > 0) setSelectedId(list[0].id)
      setLoading(false)
    })()
    return () => {
      c = true
    }
  }, [user])

  useEffect(() => {
    if (!selectedId) {
      setMembers([])
      setMatchCount(0)
      return
    }
    let c = false
    void (async () => {
      const [m, n] = await Promise.all([fetchTeamMembers(selectedId), countTeamMatches(selectedId)])
      if (!c) {
        setMembers(m)
        setMatchCount(n)
      }
    })()
    return () => {
      c = true
    }
  }, [selectedId])

  const current = teams.find((x) => x.id === selectedId) ?? null

  async function copyCode() {
    if (!current?.invite_code) return
    try {
      await navigator.clipboard.writeText(current.invite_code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* ignore */
    }
  }

  if (!user) {
    return (
      <p className="text-sm text-[#7A9180]">
        <Link to="/login" className="text-[#00E676] underline">
          {t('common.login')}
        </Link>
      </p>
    )
  }

  if (loading) {
    return <p className="text-sm text-[#7A9180]">{t('common.loading')}</p>
  }

  if (teams.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-[#E8F0E9]">{t('teams.my_title')}</h1>
        <Card className="border-[rgba(0,230,118,0.12)] bg-[#1A211B]/80 p-8 text-center">
          <Users className="mx-auto size-12 text-[#7A9180]" />
          <p className="mt-4 text-[#7A9180]">{t('teams.my_empty')}</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              to="/equipes/creer"
              className="inline-flex h-12 items-center justify-center rounded-xl bg-[#00E676] px-6 text-sm font-bold text-[#0A0E0B] shadow-[0_0_28px_-8px_rgba(0,230,118,0.8)] transition hover:brightness-110"
            >
              {t('teams.cta_create')}
            </Link>
            <Link
              to="/equipes/rejoindre"
              className="inline-flex h-12 items-center justify-center rounded-xl border border-[rgba(0,230,118,0.35)] bg-transparent px-6 text-sm font-bold text-[#00E676] transition hover:bg-[rgba(0,230,118,0.08)]"
            >
              {t('teams.cta_join')}
            </Link>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#E8F0E9]">{t('teams.my_title')}</h1>
          <p className="mt-2 text-sm text-[#7A9180]">{t('teams.my_subtitle')}</p>
        </div>
        {teams.length > 1 && (
          <label className="flex flex-col gap-1 text-xs text-[#7A9180]">
            {t('teams.switch_team')}
            <select
              value={selectedId ?? ''}
              onChange={(e) => setSelectedId(e.target.value)}
              className="rounded-lg border border-[rgba(0,230,118,0.2)] bg-[#0A0E0B] px-3 py-2 text-sm font-medium text-[#E8F0E9]"
            >
              {teams.map((te) => (
                <option key={te.id} value={te.id}>
                  {te.name}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      {current && (
        <>
          <Card className="overflow-hidden border-[rgba(0,230,118,0.12)] bg-[#1A211B]/80 ring-1 ring-[rgba(0,230,118,0.08)]">
            <div
              className="flex flex-wrap items-center gap-4 border-b border-[rgba(0,230,118,0.1)] px-5 py-4"
              style={{
                background: `linear-gradient(135deg, ${current.color_primary ?? '#1A211B'}33, ${current.color_secondary ?? '#0A0E0B'}33)`,
              }}
            >
              {current.logo_url ? (
                <img src={current.logo_url} alt="" className="size-16 rounded-xl object-cover" />
              ) : (
                <div
                  className="size-16 rounded-xl"
                  style={{
                    background: `linear-gradient(135deg, ${current.color_primary ?? '#333'}, ${current.color_secondary ?? '#111'})`,
                  }}
                />
              )}
              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-bold text-[#E8F0E9]">{current.name}</h2>
                <p className="text-sm text-[#7A9180]">
                  {current.city} · {current.stadium}
                </p>
              </div>
            </div>

            <div className="grid gap-4 p-5 sm:grid-cols-3">
              <div className="rounded-xl bg-[#0A0E0B] p-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#7A9180]">
                  {t('teams.stat_members')}
                </p>
                <p className="mt-1 text-2xl font-bold text-[#00E676]">{members.length}</p>
              </div>
              <div className="rounded-xl bg-[#0A0E0B] p-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#7A9180]">
                  {t('teams.stat_matches')}
                </p>
                <p className="mt-1 text-2xl font-bold text-[#00E676]">{matchCount}</p>
              </div>
              <div className="rounded-xl bg-[#0A0E0B] p-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#7A9180]">
                  {t('teams.stat_points')}
                </p>
                <p className="mt-1 text-2xl font-bold text-[#FFD600]">
                  {typeof current.points === 'number' ? current.points : '—'}
                </p>
              </div>
            </div>

            <div className="border-t border-[rgba(0,230,118,0.1)] px-5 py-4">
              <p className="text-xs font-bold uppercase tracking-wider text-[#7A9180]">
                {t('teams.invite_code_label')}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <code className="rounded-lg bg-[#0A0E0B] px-4 py-2 font-mono text-lg tracking-[0.2em] text-[#00E676]">
                  {current.invite_code}
                </code>
                <Button type="button" variant="secondary" size="sm" onClick={() => void copyCode()}>
                  <Copy className="size-4" />
                  {copied ? t('common.copied') : t('common.copy')}
                </Button>
              </div>
            </div>
          </Card>

          <Card className="border-[rgba(0,230,118,0.12)] bg-[#1A211B]/80 ring-1 ring-[rgba(0,230,118,0.08)]">
            <h3 className="mb-4 flex items-center gap-2 font-bold text-[#E8F0E9]">
              <Users className="size-5 text-[#00E676]" />
              {t('teams.members_title')}
            </h3>
            <ul className="divide-y divide-[rgba(0,230,118,0.08)]">
              {members.map((m) => (
                <li key={m.id} className="flex items-center justify-between py-3 first:pt-0">
                  <div>
                    <p className="font-medium text-[#E8F0E9]">
                      {m.profiles?.pseudo ?? t('teams.member_unknown')}
                    </p>
                    <p className="text-xs text-[#7A9180]">
                      {m.role === 'captain' ? t('teams.role_captain') : t('teams.role_member')}
                    </p>
                  </div>
                  <Link
                    to={`/joueur/${m.profile_id}`}
                    className="text-sm font-medium text-[#00E676] hover:underline"
                  >
                    {t('teams.view_profile')}
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        </>
      )}
    </div>
  )
}
