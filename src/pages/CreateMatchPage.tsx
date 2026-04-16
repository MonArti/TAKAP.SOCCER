import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { getGoogleMapsApiKey, loadGoogleMapsScript } from '@/lib/google-maps'
import { Card } from '@/components/Card'
import { Button } from '@/components/Button'

function buildLieuLine(name: string, address: string) {
  const n = name.trim()
  const a = address.trim()
  if (n && a) return `${n} — ${a}`
  return n || a
}

export function CreateMatchPage() {
  const { user } = useAuth()
  const nav = useNavigate()
  const lieuInputRef = useRef<HTMLInputElement>(null)
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null)

  const [dateMatch, setDateMatch] = useState('')
  const [heureMatch, setHeureMatch] = useState('20:00')
  const [lieu, setLieu] = useState('')
  const [lieuNom, setLieuNom] = useState('')
  const [lieuAdresse, setLieuAdresse] = useState('')
  const [lieuLat, setLieuLat] = useState<number | null>(null)
  const [lieuLng, setLieuLng] = useState<number | null>(null)
  const [prix, setPrix] = useState('5')
  const [nbMax, setNbMax] = useState('10')
  const [err, setErr] = useState<string | null>(null)
  const [mapsHint, setMapsHint] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  useEffect(() => {
    const input = lieuInputRef.current
    if (!input || !getGoogleMapsApiKey()) {
      if (!getGoogleMapsApiKey()) {
        setMapsHint(
          'Sans VITE_GOOGLE_MAPS_API_KEY, saisis le lieu à la main (pas d’autocomplétion ni de GPS enregistré).',
        )
      }
      return
    }

    let cancelled = false

    void loadGoogleMapsScript()
      .then(() => {
        if (cancelled || !lieuInputRef.current) return
        if (autocompleteRef.current) return

        const ac = new google.maps.places.Autocomplete(lieuInputRef.current, {
          fields: ['formatted_address', 'geometry', 'name'],
          types: ['establishment', 'geocode'],
        })
        autocompleteRef.current = ac

        ac.addListener('place_changed', () => {
          const place = ac.getPlace()
          const loc = place.geometry?.location
          if (!loc) return

          const name = place.name?.trim() ?? ''
          const address = place.formatted_address?.trim() ?? ''
          const lat = loc.lat()
          const lng = loc.lng()

          setLieuNom(name)
          setLieuAdresse(address)
          setLieuLat(lat)
          setLieuLng(lng)
          setLieu(buildLieuLine(name, address))
        })
      })
      .catch(() => {
        if (!cancelled) {
          setMapsHint('Google Maps n’a pas pu être chargé. Vérifie la clé et les domaines autorisés.')
        }
      })

    return () => {
      cancelled = true
      const ac = autocompleteRef.current
      if (ac && typeof google !== 'undefined' && google.maps?.event) {
        google.maps.event.clearInstanceListeners(ac)
      }
      autocompleteRef.current = null
    }
  }, [])

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
      p_lieu_lat: lieuLat,
      p_lieu_lng: lieuLng,
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
              Lieu (recherche Google Places)
            </label>
            <input
              ref={lieuInputRef}
              id="lieu"
              type="text"
              required
              placeholder="Tape un nom de salle, une ville…"
              value={lieu}
              onChange={(e) => {
                setLieu(e.target.value)
                setLieuNom('')
                setLieuAdresse('')
                setLieuLat(null)
                setLieuLng(null)
              }}
              autoComplete="off"
              className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none ring-brand-600 focus:ring-2"
            />
            <p className="mt-1 text-xs text-zinc-500">
              Choisis une <strong>suggestion</strong> dans la liste pour enregistrer latitude / longitude
              (utile pour les notifications géolocalisées plus tard).
            </p>
            {(lieuNom || lieuAdresse || lieuLat != null) && (
              <dl className="mt-2 rounded-lg bg-zinc-50 px-3 py-2 text-xs text-zinc-600">
                {lieuNom && (
                  <div className="flex gap-2">
                    <dt className="shrink-0 font-medium text-zinc-500">Nom</dt>
                    <dd>{lieuNom}</dd>
                  </div>
                )}
                {lieuAdresse && (
                  <div className="mt-1 flex gap-2">
                    <dt className="shrink-0 font-medium text-zinc-500">Adresse</dt>
                    <dd>{lieuAdresse}</dd>
                  </div>
                )}
                {lieuLat != null && lieuLng != null && (
                  <div className="mt-1 font-mono text-zinc-700">
                    GPS : {lieuLat.toFixed(6)}, {lieuLng.toFixed(6)}
                  </div>
                )}
              </dl>
            )}
            {mapsHint && <p className="mt-2 text-xs text-amber-800">{mapsHint}</p>}
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
