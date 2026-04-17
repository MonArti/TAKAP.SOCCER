import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '@/lib/supabase'
import type { ProfileRow } from '@/types/database'
import { Card } from '@/components/Card'
import { parseNoteMoyenne, ratingBandFromNote } from '@/lib/format'
import { useAuth } from '@/contexts/AuthContext'

type PublicProfileExtras = {
  recent_notes: number[]
  community_avg_note: number | null
  community_avg_nb_matchs: number | null
  viewer_note_moyenne?: number | null
  viewer_nb_matchs?: number | null
  is_self?: boolean
}

function parseExtras(raw: Record<string, unknown> | null): PublicProfileExtras | null {
  if (!raw) return null
  const recent = raw.recent_notes
  const notes = Array.isArray(recent) ? recent.map((x) => Number(x)).filter((n) => n >= 1 && n <= 5) : []
  const cn = raw.community_avg_note
  const cm = raw.community_avg_nb_matchs
  return {
    recent_notes: notes,
    community_avg_note: typeof cn === 'number' ? cn : cn != null ? Number(cn) : null,
    community_avg_nb_matchs: typeof cm === 'number' ? cm : cm != null ? Number(cm) : null,
    viewer_note_moyenne:
      raw.viewer_note_moyenne != null ? Number(raw.viewer_note_moyenne) : undefined,
    viewer_nb_matchs: raw.viewer_nb_matchs != null ? Number(raw.viewer_nb_matchs) : undefined,
    is_self: raw.is_self === true,
  }
}

function comparePhrase(
  player: number,
  community: number | null,
  higherIsBetter: boolean,
  t: (k: string) => string,
): string | null {
  if (community == null || community === 0) return null
  const diff = player - community
  const eps = 0.08
  if (Math.abs(diff) < eps) return t('public_profile.near_community')
  if (higherIsBetter) {
    return diff > 0 ? t('public_profile.above_community') : t('public_profile.below_community')
  }
  return diff < 0 ? t('public_profile.above_community') : t('public_profile.below_community')
}

export function PublicProfilePage() {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const [profile, setProfile] = useState<ProfileRow | null>(null)
  const [extras, setExtras] = useState<PublicProfileExtras | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    ;(async () => {
      const [{ data: prof, error: e1 }, { data: raw, error: e2 }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', id).maybeSingle(),
        supabase.rpc('get_public_profile_extras', { p_profile_id: id }),
      ])
      if (!cancelled) {
        if (e1) setErr(e1.message)
        else setProfile(prof as ProfileRow | null)
        if (e2) console.warn('[Takap] get_public_profile_extras:', e2.message)
        else setExtras(parseExtras(raw as Record<string, unknown> | null))
        setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [id, user?.id])

  if (loading) return <p className="text-zinc-500">{t('common.loading')}</p>
  if (err) return <Card className="text-sm text-red-700">{err}</Card>
  if (!profile) {
    return (
      <Card>
        <p className="text-zinc-600">{t('public_profile.not_found')}</p>
        <Link to="/" className="mt-2 inline-block text-sm font-semibold text-brand-700 hover:underline">
          {t('public_profile.back_home')}
        </Link>
      </Card>
    )
  }

  const note = parseNoteMoyenne(profile.note_moyenne)
  const commNote = extras?.community_avg_note ?? null
  const commNb = extras?.community_avg_nb_matchs ?? null
  const phraseNote = comparePhrase(note, commNote, true, t)
  const phraseNb = comparePhrase(profile.nb_matchs, commNb, true, t)
  const levelKey = ratingBandFromNote(note)

  return (
    <div className="space-y-6">
      <Link to="/" className="text-sm font-medium text-brand-700 hover:underline">
        {t('public_profile.back_matches')}
      </Link>
      <Card>
        <h1 className="text-2xl font-bold text-zinc-900">{profile.pseudo}</h1>
        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <div>
            <dt className="text-zinc-500">{t('common.age')}</dt>
            <dd className="font-medium">{profile.age ?? t('common.dash')}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">{t('players.col_height')}</dt>
            <dd className="font-medium">
              {profile.taille != null ? t('players.height_cm_value', { h: profile.taille }) : t('common.dash')}
            </dd>
          </div>
          <div>
            <dt className="text-zinc-500">{t('common.weight_kg')}</dt>
            <dd className="font-medium">
              {profile.poids != null ? `${profile.poids} kg` : t('common.dash')}
            </dd>
          </div>
          <div>
            <dt className="text-zinc-500">{t('public_profile.level_indicative')}</dt>
            <dd className="font-medium text-zinc-800">{t(`rating_bands.${levelKey}`)}</dd>
          </div>
        </dl>
        <div className="mt-6 flex flex-wrap gap-4 border-t border-zinc-100 pt-4">
          <div>
            <p className="text-xs uppercase text-zinc-400">{t('public_profile.avg_rating_cap')}</p>
            <p className="text-xl font-bold text-zinc-900">{note.toFixed(2)} / 5</p>
          </div>
          <div>
            <p className="text-xs uppercase text-zinc-400">{t('public_profile.matches_played_cap')}</p>
            <p className="text-xl font-bold text-zinc-900">{profile.nb_matchs}</p>
          </div>
        </div>
      </Card>

      {extras && extras.recent_notes.length > 0 && (
        <Card>
          <h2 className="text-lg font-semibold text-zinc-900">{t('public_profile.recent_ratings_title')}</h2>
          <p className="mt-1 text-sm text-zinc-500">{t('public_profile.recent_ratings_hint')}</p>
          <ul className="mt-4 flex flex-wrap gap-2">
            {extras.recent_notes.map((n, i) => (
              <li
                key={`${i}-${n}`}
                className="rounded-full bg-brand-50 px-3 py-1 text-sm font-medium text-brand-900"
              >
                {n} / 5
              </li>
            ))}
          </ul>
        </Card>
      )}

      {(commNote != null || commNb != null) && (
        <Card>
          <h2 className="text-lg font-semibold text-zinc-900">{t('public_profile.community_title')}</h2>
          <p className="mt-1 text-sm text-zinc-500">{t('public_profile.community_hint')}</p>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            {commNote != null && (
              <div className="rounded-lg bg-zinc-50 p-3">
                <dt className="text-zinc-500">{t('public_profile.community_avg_rating')}</dt>
                <dd className="text-lg font-semibold text-zinc-900">{commNote.toFixed(2)} / 5</dd>
                {phraseNote && <p className="mt-1 text-xs text-zinc-600">{phraseNote}</p>}
              </div>
            )}
            {commNb != null && (
              <div className="rounded-lg bg-zinc-50 p-3">
                <dt className="text-zinc-500">{t('public_profile.community_avg_matches')}</dt>
                <dd className="text-lg font-semibold text-zinc-900">{commNb}</dd>
                {phraseNb && <p className="mt-1 text-xs text-zinc-600">{phraseNb}</p>}
              </div>
            )}
          </dl>
        </Card>
      )}

      {user &&
        extras &&
        !extras.is_self &&
        extras.viewer_note_moyenne != null &&
        extras.viewer_nb_matchs != null && (
          <Card>
            <h2 className="text-lg font-semibold text-zinc-900">{t('public_profile.you_vs_player')}</h2>
            <p className="mt-1 text-sm text-zinc-500">{t('public_profile.you_vs_hint')}</p>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[280px] text-left text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 text-zinc-500">
                    <th className="pb-2 pe-4 font-medium">{t('public_profile.indicator')}</th>
                    <th className="pb-2 pe-4 font-medium">{t('public_profile.you')}</th>
                    <th className="pb-2 font-medium">{profile.pseudo}</th>
                  </tr>
                </thead>
                <tbody className="text-zinc-800">
                  <tr className="border-b border-zinc-100">
                    <td className="py-2 pe-4">{t('public_profile.avg_rating_cap')}</td>
                    <td className="py-2 pe-4 font-medium">
                      {parseNoteMoyenne(extras.viewer_note_moyenne).toFixed(2)}
                    </td>
                    <td className="py-2 font-medium">{note.toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td className="py-2 pe-4">{t('public_profile.matches_played_cap')}</td>
                    <td className="py-2 pe-4 font-medium">{extras.viewer_nb_matchs}</td>
                    <td className="py-2 font-medium">{profile.nb_matchs}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Card>
        )}

      {!user && (
        <p className="text-center text-sm text-zinc-500">
          <Link to="/login" className="font-semibold text-brand-700 hover:underline">
            {t('common.login')}
          </Link>{' '}
          {t('public_profile.login_compare')}
        </p>
      )}
    </div>
  )
}
