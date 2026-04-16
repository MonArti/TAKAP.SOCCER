import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { getGoogleMapsApiKey, loadGoogleMapsScript } from '@/lib/google-maps'
import { Card } from '@/components/Card'
import { Button } from '@/components/Button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'

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
    if (error) {
      setPending(false)
      setErr(error.message)
      return
    }
    if (!matchId) {
      setPending(false)
      setErr('Réponse vide du serveur.')
      return
    }
    const id = String(matchId)

    const { error: partErr } = await supabase.from('participations').insert({
      match_id: id,
      joueur_id: user.id,
      a_paye: false,
    })
    if (partErr && partErr.code !== '23505' && !partErr.message.toLowerCase().includes('duplicate')) {
      setPending(false)
      setErr(
        `Match créé mais inscription organisateur impossible : ${partErr.message}. Exécute supabase/organisateur_auto_participation.sql sur ton projet.`,
      )
      nav(`/matchs/${id}`)
      void supabase.functions
        .invoke('notify-match-nearby', { body: { match_id: id } })
        .then(({ error: fnErr }) => {
          if (fnErr) console.warn('[Takap] notify-match-nearby:', fnErr.message)
        })
      return
    }

    setPending(false)
    nav(`/matchs/${id}`)
    void supabase.functions
      .invoke('notify-match-nearby', { body: { match_id: id } })
      .then(({ error: fnErr }) => {
        if (fnErr) console.warn('[Takap] notify-match-nearby:', fnErr.message)
      })
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Créer un match</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Renseigne la date, le lieu (idéalement via Google Places) et le tarif.
        </p>
      </div>
      <Card className="shadow-md ring-1 ring-border/80">
        <form onSubmit={submit} className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                required
                value={dateMatch}
                onChange={(e) => setDateMatch(e.target.value)}
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="heure">Heure</Label>
              <Input
                id="heure"
                type="time"
                required
                value={heureMatch}
                onChange={(e) => setHeureMatch(e.target.value)}
                className="h-11"
              />
            </div>
          </div>
          <Separator />
          <div className="space-y-2">
            <Label htmlFor="lieu">Lieu (Google Places)</Label>
            <Input
              ref={lieuInputRef}
              id="lieu"
              type="text"
              required
              placeholder="Salle, stade, ville…"
              value={lieu}
              onChange={(e) => {
                setLieu(e.target.value)
                setLieuNom('')
                setLieuAdresse('')
                setLieuLat(null)
                setLieuLng(null)
              }}
              autoComplete="off"
              className="h-11"
            />
            <p className="text-xs text-muted-foreground">
              Choisis une <strong className="text-foreground">suggestion</strong> pour enregistrer GPS
              (notifications à proximité).
            </p>
            {(lieuNom || lieuAdresse || lieuLat != null) && (
              <dl className="mt-3 space-y-1 rounded-xl border border-border bg-muted/40 px-3 py-3 text-xs text-muted-foreground">
                {lieuNom && (
                  <div className="flex gap-2">
                    <dt className="w-14 shrink-0 font-medium text-foreground/80">Nom</dt>
                    <dd>{lieuNom}</dd>
                  </div>
                )}
                {lieuAdresse && (
                  <div className="flex gap-2">
                    <dt className="w-14 shrink-0 font-medium text-foreground/80">Adresse</dt>
                    <dd>{lieuAdresse}</dd>
                  </div>
                )}
                {lieuLat != null && lieuLng != null && (
                  <div className="font-mono text-foreground/90">
                    GPS : {lieuLat.toFixed(6)}, {lieuLng.toFixed(6)}
                  </div>
                )}
              </dl>
            )}
            {mapsHint && (
              <p className="text-xs font-medium text-amber-800 dark:text-amber-200">{mapsHint}</p>
            )}
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="prix">Prix par joueur (€)</Label>
              <Input
                id="prix"
                type="text"
                inputMode="decimal"
                required
                value={prix}
                onChange={(e) => setPrix(e.target.value)}
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nbMax">Nombre max de joueurs</Label>
              <Input
                id="nbMax"
                type="number"
                min={2}
                max={22}
                required
                value={nbMax}
                onChange={(e) => setNbMax(e.target.value)}
                className="h-11"
              />
              <p className="text-xs text-muted-foreground">Conseillé : 10.</p>
            </div>
          </div>
          {err && <p className="text-sm font-medium text-destructive">{err}</p>}
          <Button type="submit" disabled={pending} className="w-full sm:w-auto">
            {pending ? 'Création…' : 'Publier le match'}
          </Button>
        </form>
      </Card>
    </div>
  )
}
