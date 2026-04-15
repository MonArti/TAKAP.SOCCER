import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import type { ProfileRow } from '@/types/database'
import { Card } from '@/components/Card'
import { niveauIndicatifFromNote, parseNoteMoyenne } from '@/lib/format'
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

function comparePhrase(player: number, community: number | null, higherIsBetter = true): string | null {
  if (community == null || community === 0) return null
  const diff = player - community
  const eps = 0.08
  if (Math.abs(diff) < eps) return 'Proche de la moyenne Takap.'
  if (higherIsBetter) {
    return diff > 0 ? 'Au-dessus de la moyenne Takap.' : 'En dessous de la moyenne Takap.'
  }
  return diff < 0 ? 'Au-dessus de la moyenne Takap.' : 'En dessous de la moyenne Takap.'
}

export function PublicProfilePage() {
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

  if (loading) return <p className="text-zinc-500">Chargement…</p>
  if (err) return <Card className="text-sm text-red-700">{err}</Card>
  if (!profile) {
    return (
      <Card>
        <p className="text-zinc-600">Joueur introuvable.</p>
        <Link to="/" className="mt-2 inline-block text-sm font-semibold text-brand-700 hover:underline">
          Retour aux matchs
        </Link>
      </Card>
    )
  }

  const note = parseNoteMoyenne(profile.note_moyenne)
  const commNote = extras?.community_avg_note ?? null
  const commNb = extras?.community_avg_nb_matchs ?? null
  const phraseNote = comparePhrase(note, commNote, true)
  const phraseNb = comparePhrase(profile.nb_matchs, commNb, true)

  return (
    <div className="space-y-6">
      <Link to="/" className="text-sm font-medium text-brand-700 hover:underline">
        ← Matchs
      </Link>
      <Card>
        <h1 className="text-2xl font-bold text-zinc-900">{profile.pseudo}</h1>
        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <div>
            <dt className="text-zinc-500">Âge</dt>
            <dd className="font-medium">{profile.age ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">Taille</dt>
            <dd className="font-medium">{profile.taille != null ? `${profile.taille} cm` : '—'}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">Poids</dt>
            <dd className="font-medium">{profile.poids != null ? `${profile.poids} kg` : '—'}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">Niveau (indicatif)</dt>
            <dd className="font-medium text-zinc-800">{niveauIndicatifFromNote(note)}</dd>
          </div>
        </dl>
        <div className="mt-6 flex flex-wrap gap-4 border-t border-zinc-100 pt-4">
          <div>
            <p className="text-xs uppercase text-zinc-400">Note moyenne</p>
            <p className="text-xl font-bold text-zinc-900">{note.toFixed(2)} / 5</p>
          </div>
          <div>
            <p className="text-xs uppercase text-zinc-400">Matchs joués</p>
            <p className="text-xl font-bold text-zinc-900">{profile.nb_matchs}</p>
          </div>
        </div>
      </Card>

      {extras && extras.recent_notes.length > 0 && (
        <Card>
          <h2 className="text-lg font-semibold text-zinc-900">Dernières notes reçues</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Agrégat anonyme après les matchs terminés — pour se faire une idée de la régularité.
          </p>
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
          <h2 className="text-lg font-semibold text-zinc-900">Communauté Takap</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Moyennes parmi les joueurs ayant déjà au moins un match terminé — utile pour se situer.
          </p>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            {commNote != null && (
              <div className="rounded-lg bg-zinc-50 p-3">
                <dt className="text-zinc-500">Note moyenne communauté</dt>
                <dd className="text-lg font-semibold text-zinc-900">{commNote.toFixed(2)} / 5</dd>
                {phraseNote && <p className="mt-1 text-xs text-zinc-600">{phraseNote}</p>}
              </div>
            )}
            {commNb != null && (
              <div className="rounded-lg bg-zinc-50 p-3">
                <dt className="text-zinc-500">Matchs joués (moyenne)</dt>
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
            <h2 className="text-lg font-semibold text-zinc-900">Vous vs ce joueur</h2>
            <p className="mt-1 text-sm text-zinc-500">Comparaison rapide avec votre profil.</p>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[280px] text-left text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 text-zinc-500">
                    <th className="pb-2 pr-4 font-medium">Indicateur</th>
                    <th className="pb-2 pr-4 font-medium">Vous</th>
                    <th className="pb-2 font-medium">{profile.pseudo}</th>
                  </tr>
                </thead>
                <tbody className="text-zinc-800">
                  <tr className="border-b border-zinc-100">
                    <td className="py-2 pr-4">Note moyenne</td>
                    <td className="py-2 pr-4 font-medium">
                      {parseNoteMoyenne(extras.viewer_note_moyenne).toFixed(2)}
                    </td>
                    <td className="py-2 font-medium">{note.toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4">Matchs joués</td>
                    <td className="py-2 pr-4 font-medium">{extras.viewer_nb_matchs}</td>
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
            Connectez-vous
          </Link>{' '}
          pour voir la comparaison directe avec votre profil.
        </p>
      )}
    </div>
  )
}
