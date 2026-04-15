import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { Card } from '@/components/Card'
import { Button } from '@/components/Button'

export function CreateMatchPage() {
  const { user } = useAuth()
  const nav = useNavigate()
  const [dateMatch, setDateMatch] = useState('')
  const [heureMatch, setHeureMatch] = useState('20:00')
  const [lieu, setLieu] = useState('')
  const [prix, setPrix] = useState('5')
  const [nbMax, setNbMax] = useState('10')
  const [err, setErr] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return
    setErr(null)
    const nb = parseInt(nbMax, 10)
    const px = parseFloat(prix.replace(',', '.'))
    if (Number.isNaN(nb) || nb < 2 || nb > 22) {
      setErr('Nombre max de joueurs : entre 2 et 22.')
      return
    }
    if (Number.isNaN(px) || px < 0) {
      setErr('Prix invalide.')
      return
    }
    setPending(true)
    const { data: matchId, error } = await supabase.rpc('create_match', {
      p_date_match: dateMatch,
      p_heure_match: heureMatch.length === 5 ? `${heureMatch}:00` : heureMatch,
      p_lieu: lieu.trim(),
      p_prix: px,
      p_nb_max: nb,
    })
    setPending(false)
    if (error) {
      setErr(error.message)
      return
    }
    if (!matchId) {
      setErr('Réponse vide du serveur.')
      return
    }
    nav(`/matchs/${matchId}`)
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-zinc-900">Créer un match</h1>
      <Card>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="date" className="block text-sm font-medium text-zinc-700">
                Date
              </label>
              <input
                id="date"
                type="date"
                required
                value={dateMatch}
                onChange={(e) => setDateMatch(e.target.value)}
                className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none ring-brand-600 focus:ring-2"
              />
            </div>
            <div>
              <label htmlFor="heure" className="block text-sm font-medium text-zinc-700">
                Heure
              </label>
              <input
                id="heure"
                type="time"
                required
                value={heureMatch}
                onChange={(e) => setHeureMatch(e.target.value)}
                className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none ring-brand-600 focus:ring-2"
              />
            </div>
          </div>
          <div>
            <label htmlFor="lieu" className="block text-sm font-medium text-zinc-700">
              Lieu (adresse)
            </label>
            <input
              id="lieu"
              type="text"
              required
              placeholder="Stade municipal, rue…"
              value={lieu}
              onChange={(e) => setLieu(e.target.value)}
              className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none ring-brand-600 focus:ring-2"
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="prix" className="block text-sm font-medium text-zinc-700">
                Prix par joueur (€)
              </label>
              <input
                id="prix"
                type="text"
                inputMode="decimal"
                required
                value={prix}
                onChange={(e) => setPrix(e.target.value)}
                className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none ring-brand-600 focus:ring-2"
              />
            </div>
            <div>
              <label htmlFor="nbMax" className="block text-sm font-medium text-zinc-700">
                Nombre max de joueurs
              </label>
              <input
                id="nbMax"
                type="number"
                min={2}
                max={22}
                required
                value={nbMax}
                onChange={(e) => setNbMax(e.target.value)}
                className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none ring-brand-600 focus:ring-2"
              />
              <p className="mt-1 text-xs text-zinc-400">Défaut conseillé : 10.</p>
            </div>
          </div>
          {err && <p className="text-sm text-red-600">{err}</p>}
          <Button type="submit" disabled={pending}>
            {pending ? 'Création…' : 'Publier le match'}
          </Button>
        </form>
      </Card>
    </div>
  )
}
