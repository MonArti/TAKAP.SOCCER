import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { getGoogleMapsApiKey, loadGoogleMapsScript } from '@/lib/google-maps'
import { Card } from '@/components/Card'
import { Button } from '@/components/Button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { MATCH_NIVEAUX, type MatchNiveau } from '@/lib/match-niveau'
import { attachEquipesToMatch, fetchAllEquipesForSelect } from '@/lib/equipes'

function buildLieuLine(name: string, address: string) {
  const n = name.trim()
  const a = address.trim()
  if (n && a) return `${n} — ${a}`
  return n || a
}

export function CreateMatchPage() {
  const { t } = useTranslation()
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
  const [niveau, setNiveau] = useState<MatchNiveau>('amateur')
  const [err, setErr] = useState<string | null>(null)
  const [mapsHint, setMapsHint] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [equipeOptions, setEquipeOptions] = useState<{ id: string; nom: string }[]>([])
  const [homeTeamId, setHomeTeamId] = useState('')
  const [awayTeamId, setAwayTeamId] = useState('')

  useEffect(() => {
    const input = lieuInputRef.current
    if (!input || !getGoogleMapsApiKey()) {
      if (!getGoogleMapsApiKey()) {
        setMapsHint(t('create_match.maps_no_key'))
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
          setMapsHint(t('create_match.maps_load_error'))
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
  }, [t])

  useEffect(() => {
    let c = false
    void fetchAllEquipesForSelect().then((opts) => {
      if (!c) setEquipeOptions(opts)
    })
    return () => {
      c = true
    }
  }, [])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return
    setErr(null)
    const nb = parseInt(nbMax, 10)
    const px = parseFloat(prix.replace(',', '.'))
    if (Number.isNaN(nb) || nb < 2 || nb > 22) {
      setErr(t('create_match.err_players_range'))
      return
    }
    if (Number.isNaN(px) || px < 0) {
      setErr(t('create_match.err_price'))
      return
    }
    if (homeTeamId && awayTeamId && homeTeamId === awayTeamId) {
      setErr(t('create_match.err_same_team'))
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
      p_niveau: niveau,
    })
    if (error) {
      setPending(false)
      setErr(error.message)
      return
    }
    if (!matchId) {
      setPending(false)
      setErr(t('create_match.err_empty_server'))
      return
    }
    const id = String(matchId)

    const home = homeTeamId.trim() || null
    const away = awayTeamId.trim() || null
    if (home || away) {
      const { error: teamErr } = await attachEquipesToMatch(id, home, away)
      if (teamErr) {
        console.warn('[Takap] équipes match:', teamErr.message)
      }
    }

    const { error: partErr } = await supabase.from('participations').insert({
      match_id: id,
      joueur_id: user.id,
      a_paye: false,
    })
    if (partErr && partErr.code !== '23505' && !partErr.message.toLowerCase().includes('duplicate')) {
      setPending(false)
      setErr(t('create_match.err_org_participation', { message: partErr.message }))
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
        <h1 className="text-3xl font-bold tracking-tight text-foreground">{t('create_match.title')}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t('create_match.subtitle')}</p>
      </div>
      <Card className="shadow-md ring-1 ring-border/80">
        <form onSubmit={submit} className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="date">{t('common.date')}</Label>
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
              <Label htmlFor="heure">{t('common.time')}</Label>
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
            <Label htmlFor="lieu">{t('create_match.place_label')}</Label>
            <Input
              ref={lieuInputRef}
              id="lieu"
              type="text"
              required
              placeholder={t('create_match.place_placeholder')}
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
            <p className="text-xs text-muted-foreground">{t('create_match.place_hint')}</p>
            {(lieuNom || lieuAdresse || lieuLat != null) && (
              <dl className="mt-3 space-y-1 rounded-xl border border-border bg-muted/40 px-3 py-3 text-xs text-muted-foreground">
                {lieuNom && (
                  <div className="flex gap-2">
                    <dt className="w-14 shrink-0 font-medium text-foreground/80">{t('common.name')}</dt>
                    <dd>{lieuNom}</dd>
                  </div>
                )}
                {lieuAdresse && (
                  <div className="flex gap-2">
                    <dt className="w-14 shrink-0 font-medium text-foreground/80">{t('common.address')}</dt>
                    <dd>{lieuAdresse}</dd>
                  </div>
                )}
                {lieuLat != null && lieuLng != null && (
                  <div className="font-mono text-foreground/90">
                    {t('common.gps')}: {lieuLat.toFixed(6)}, {lieuLng.toFixed(6)}
                  </div>
                )}
              </dl>
            )}
            {mapsHint && (
              <p className="text-xs font-medium text-amber-800 dark:text-amber-200">{mapsHint}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="niveau">{t('create_match.level_label')}</Label>
            <select
              id="niveau"
              value={niveau}
              onChange={(e) => setNiveau(e.target.value as MatchNiveau)}
              className="flex h-11 w-full max-w-md rounded-lg border border-input bg-background px-3 text-sm text-foreground shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {MATCH_NIVEAUX.map((n) => (
                <option key={n} value={n}>
                  {t(`levels.${n}`)}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">{t('create_match.level_help')}</p>
          </div>
          <Separator />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="homeTeam">{t('create_match.my_team')}</Label>
              <select
                id="homeTeam"
                value={homeTeamId}
                onChange={(e) => setHomeTeamId(e.target.value)}
                className="flex h-11 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">{t('create_match.team_none')}</option>
                {equipeOptions.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.nom}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="awayTeam">{t('create_match.opponent_team')}</Label>
              <select
                id="awayTeam"
                value={awayTeamId}
                onChange={(e) => setAwayTeamId(e.target.value)}
                className="flex h-11 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">{t('create_match.team_none')}</option>
                {equipeOptions.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.nom}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">{t('create_match.team_hint')}</p>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="prix">{t('create_match.price_label')}</Label>
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
              <Label htmlFor="nbMax">{t('create_match.max_players_label')}</Label>
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
              <p className="text-xs text-muted-foreground">{t('create_match.max_players_hint')}</p>
            </div>
          </div>
          {err && <p className="text-sm font-medium text-destructive">{err}</p>}
          <Button type="submit" disabled={pending} className="w-full sm:w-auto">
            {pending ? t('create_match.creating') : t('create_match.publish')}
          </Button>
        </form>
      </Card>
    </div>
  )
}
