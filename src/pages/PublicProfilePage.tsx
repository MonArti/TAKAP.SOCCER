import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import type { ProfileRow } from '@/types/database'
import { Card } from '@/components/Card'
import { parseNoteMoyenne } from '@/lib/format'

export function PublicProfilePage() {
  const { id } = useParams<{ id: string }>()
  const [profile, setProfile] = useState<ProfileRow | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    ;(async () => {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', id).maybeSingle()
      if (!cancelled) {
        if (error) setErr(error.message)
        else setProfile(data as ProfileRow | null)
        setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [id])

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
            <dt className="text-zinc-500">Niveau</dt>
            <dd className="font-medium text-zinc-400">À calculer</dd>
          </div>
        </dl>
        <div className="mt-6 flex flex-wrap gap-4 border-t border-zinc-100 pt-4">
          <div>
            <p className="text-xs uppercase text-zinc-400">Note moyenne</p>
            <p className="text-xl font-bold text-zinc-900">
              {parseNoteMoyenne(profile.note_moyenne).toFixed(2)} / 5
            </p>
          </div>
          <div>
            <p className="text-xs uppercase text-zinc-400">Matchs joués</p>
            <p className="text-xl font-bold text-zinc-900">{profile.nb_matchs}</p>
          </div>
        </div>
      </Card>
    </div>
  )
}
