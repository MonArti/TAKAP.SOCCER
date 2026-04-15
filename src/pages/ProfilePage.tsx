import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import type { ProfileRow } from '@/types/database'
import { Card } from '@/components/Card'
import { Button } from '@/components/Button'
import { parseNoteMoyenne } from '@/lib/format'

export function ProfilePage() {
  const { user, refreshAdminRole, isAdmin } = useAuth()
  const [profile, setProfile] = useState<ProfileRow | null>(null)
  const [pseudo, setPseudo] = useState('')
  const [age, setAge] = useState('')
  const [taille, setTaille] = useState('')
  const [poids, setPoids] = useState('')
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!user) return
    let cancelled = false
    ;(async () => {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle()
      if (cancelled) return
      if (error) setErr(error.message)
      else if (data) {
        setProfile(data as ProfileRow)
        setPseudo(data.pseudo ?? '')
        setAge(data.age != null ? String(data.age) : '')
        setTaille(data.taille != null ? String(data.taille) : '')
        setPoids(data.poids != null ? String(data.poids) : '')
      }
      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [user])

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return
    setErr(null)
    setMsg(null)
    setSaving(true)
    const parseOpt = (s: string, min: number, max: number) => {
      if (s.trim() === '') return null
      const n = parseInt(s, 10)
      if (Number.isNaN(n)) return null
      return Math.min(max, Math.max(min, n))
    }
    const payload = {
      pseudo: pseudo.trim(),
      age: parseOpt(age, 5, 99),
      taille: parseOpt(taille, 100, 250),
      poids: parseOpt(poids, 30, 200),
    }

    const { error } = await supabase.from('profiles').update(payload).eq('id', user.id)
    setSaving(false)
    if (error) {
      setErr(error.message)
      return
    }
    setMsg('Profil enregistré.')
  }

  if (loading) return <p className="text-zinc-500">Chargement du profil…</p>

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-zinc-900">Mon profil</h1>

      {profile && (
        <Card>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">Statistiques</h2>
          <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-zinc-500">Note moyenne</dt>
              <dd className="text-lg font-bold text-zinc-900">
                {parseNoteMoyenne(profile.note_moyenne).toFixed(2)} / 5
              </dd>
            </div>
            <div>
              <dt className="text-zinc-500">Matchs joués</dt>
              <dd className="text-lg font-bold text-zinc-900">{profile.nb_matchs}</dd>
            </div>
            <div className="col-span-2">
              <dt className="text-zinc-500">Rôle (base de données)</dt>
              <dd className="mt-0.5 flex flex-wrap items-center gap-2 text-sm font-medium text-zinc-800">
                <span>{profile.role ?? '—'}</span>
                {isAdmin && (
                  <span className="rounded bg-brand-100 px-2 py-0.5 text-xs text-brand-800">menu Admin actif</span>
                )}
                <button
                  type="button"
                  onClick={() => void refreshAdminRole()}
                  className="text-xs font-semibold text-brand-700 underline hover:text-brand-900"
                >
                  Recharger le rôle
                </button>
              </dd>
              <p className="mt-1 text-xs text-zinc-400">
                Si tu viens de passer <code className="rounded bg-zinc-100 px-1">admin</code> en SQL, clique sur
                « Recharger le rôle » ou déconnecte-toi puis reconnecte-toi.
              </p>
            </div>
          </dl>
          <p className="mt-3 text-xs text-zinc-400">
            Niveau : calcul automatique prévu plus tard (V1 : indisponible).
          </p>
        </Card>
      )}

      <Card>
        <form onSubmit={save} className="space-y-4">
          <div>
            <label htmlFor="pseudo" className="block text-sm font-medium text-zinc-700">
              Pseudo
            </label>
            <input
              id="pseudo"
              required
              minLength={2}
              value={pseudo}
              onChange={(e) => setPseudo(e.target.value)}
              className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none ring-brand-600 focus:ring-2"
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label htmlFor="age" className="block text-sm font-medium text-zinc-700">
                Âge
              </label>
              <input
                id="age"
                type="number"
                inputMode="numeric"
                min={5}
                max={99}
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder="—"
                className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none ring-brand-600 focus:ring-2"
              />
            </div>
            <div>
              <label htmlFor="taille" className="block text-sm font-medium text-zinc-700">
                Taille (cm)
              </label>
              <input
                id="taille"
                type="number"
                inputMode="numeric"
                min={100}
                max={250}
                value={taille}
                onChange={(e) => setTaille(e.target.value)}
                placeholder="—"
                className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none ring-brand-600 focus:ring-2"
              />
            </div>
            <div>
              <label htmlFor="poids" className="block text-sm font-medium text-zinc-700">
                Poids (kg)
              </label>
              <input
                id="poids"
                type="number"
                inputMode="numeric"
                min={30}
                max={200}
                value={poids}
                onChange={(e) => setPoids(e.target.value)}
                placeholder="—"
                className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none ring-brand-600 focus:ring-2"
              />
            </div>
          </div>
          {err && <p className="text-sm text-red-600">{err}</p>}
          {msg && <p className="text-sm text-brand-800">{msg}</p>}
          <Button type="submit" disabled={saving}>
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </Button>
        </form>
      </Card>
    </div>
  )
}
