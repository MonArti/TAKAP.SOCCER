import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import type { ProfileRow } from '@/types/database'
import { Card } from '@/components/Card'
import { Button } from '@/components/Button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
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

  if (loading) return <p className="text-sm font-medium text-muted-foreground">Chargement du profil…</p>

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Mon profil</h1>
        <p className="mt-2 text-sm text-muted-foreground">Statistiques et informations visibles des autres joueurs.</p>
      </div>

      {profile && (
        <Card className="border-primary/15 bg-gradient-to-br from-primary/5 to-card shadow-md ring-primary/10">
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Statistiques</h2>
          <dl className="mt-4 grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-muted-foreground">Note moyenne</dt>
              <dd className="text-xl font-bold text-foreground">
                {parseNoteMoyenne(profile.note_moyenne).toFixed(2)} / 5
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Matchs joués</dt>
              <dd className="text-xl font-bold text-foreground">{profile.nb_matchs}</dd>
            </div>
            <div className="col-span-2">
              <dt className="text-muted-foreground">Rôle (base de données)</dt>
              <dd className="mt-1 flex flex-wrap items-center gap-2 text-sm font-medium text-foreground">
                <span>{profile.role ?? '—'}</span>
                {isAdmin && (
                  <span className="rounded-full bg-primary/15 px-2.5 py-0.5 text-xs font-semibold text-primary">
                    Admin
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => void refreshAdminRole()}
                  className="text-xs font-semibold text-primary underline underline-offset-2 hover:text-primary/80"
                >
                  Recharger le rôle
                </button>
              </dd>
              <p className="mt-2 text-xs text-muted-foreground">
                Si tu viens de passer <code className="rounded bg-muted px-1">admin</code> en SQL, clique ici ou
                reconnecte-toi.
              </p>
            </div>
          </dl>
          <p className="mt-4 text-xs text-muted-foreground">
            Niveau : calcul automatique prévu plus tard (V1 : indisponible).
          </p>
        </Card>
      )}

      <Card className="shadow-md ring-1 ring-border/80">
        <form onSubmit={save} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="pseudo">Pseudo</Label>
            <Input
              id="pseudo"
              required
              minLength={2}
              value={pseudo}
              onChange={(e) => setPseudo(e.target.value)}
              className="h-11"
            />
          </div>
          <Separator />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="age">Âge</Label>
              <Input
                id="age"
                type="number"
                inputMode="numeric"
                min={5}
                max={99}
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder="—"
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="taille">Taille (cm)</Label>
              <Input
                id="taille"
                type="number"
                inputMode="numeric"
                min={100}
                max={250}
                value={taille}
                onChange={(e) => setTaille(e.target.value)}
                placeholder="—"
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="poids">Poids (kg)</Label>
              <Input
                id="poids"
                type="number"
                inputMode="numeric"
                min={30}
                max={200}
                value={poids}
                onChange={(e) => setPoids(e.target.value)}
                placeholder="—"
                className="h-11"
              />
            </div>
          </div>
          {err && <p className="text-sm font-medium text-destructive">{err}</p>}
          {msg && <p className="text-sm font-medium text-primary">{msg}</p>}
          <Button type="submit" disabled={saving}>
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </Button>
        </form>
      </Card>
    </div>
  )
}
