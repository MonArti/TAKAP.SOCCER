import { Link, useParams } from 'react-router-dom'
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Card } from '@/components/Card'
import { Button } from '@/components/Button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  addEquipeToTournoi,
  DEFAULT_NB_EQUIPES_MAX_TOURNOI,
  fetchParticipants,
  fetchTournoiById,
  findEquipeByInviteCode,
  searchEquipesByNom,
  type ParticipantAvecEquipe,
} from '@/lib/tournois'
import type { TournoiRow } from '@/types/database'

export function TournoiDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { t } = useTranslation()
  const [tournoi, setTournoi] = useState<TournoiRow | null>(null)
  const [parts, setParts] = useState<ParticipantAvecEquipe[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQ, setSearchQ] = useState('')
  const [hits, setHits] = useState<{ id: string; nom: string }[]>([])
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const reload = useCallback(async () => {
    if (!id) return
    setLoading(true)
    const [tr, p] = await Promise.all([fetchTournoiById(id), fetchParticipants(id)])
    setTournoi(tr)
    setParts(p)
    setLoading(false)
  }, [id])

  useEffect(() => {
    void reload()
  }, [reload])

  async function runSearch() {
    setErr(null)
    setMsg(null)
    const list = await searchEquipesByNom(searchQ)
    const inTournoi = new Set(parts.map((p) => p.equipe_id))
    setHits(list.filter((e) => !inTournoi.has(e.id)))
  }

  async function addEquipe(equipeId: string) {
    if (!id) return
    setBusy(true)
    setErr(null)
    setMsg(null)
    const { error } = await addEquipeToTournoi(id, equipeId)
    setBusy(false)
    if (error) {
      if (error.message === 'duplicate') setErr(t('tournois.err_dup'))
      else if (error.message === 'tournoi_complet') setErr(t('tournois.err_full'))
      else setErr(error.message)
      return
    }
    setMsg('OK')
    setHits([])
    setSearchQ('')
    void reload()
  }

  async function addByCode() {
    if (!id) return
    setBusy(true)
    setErr(null)
    setMsg(null)
    const eq = await findEquipeByInviteCode(code)
    if (!eq) {
      setBusy(false)
      setErr(t('tournois.err_not_found'))
      return
    }
    const { error } = await addEquipeToTournoi(id, eq.id)
    setBusy(false)
    if (error) {
      if (error.message === 'duplicate') setErr(t('tournois.err_dup'))
      else if (error.message === 'tournoi_complet') setErr(t('tournois.err_full'))
      else setErr(error.message)
      return
    }
    setCode('')
    void reload()
  }

  if (!id) {
    return <p className="text-muted-foreground">{t('match_detail.not_found')}</p>
  }

  if (loading) {
    return <p className="text-muted-foreground">{t('common.loading')}</p>
  }

  const maxPlaces =
    typeof tournoi?.nb_equipes_max === 'number' && tournoi.nb_equipes_max > 0
      ? tournoi.nb_equipes_max
      : DEFAULT_NB_EQUIPES_MAX_TOURNOI
  const isFull = tournoi != null && parts.length >= maxPlaces

  if (!tournoi) {
    return (
      <Card>
        <p>{t('match_detail.not_found')}</p>
        <Link to="/tournois" className="mt-2 inline-block text-primary hover:underline">
          {t('tournois.back_list')}
        </Link>
      </Card>
    )
  }

  return (
    <div className="space-y-8">
      <Link to="/tournois" className="text-sm font-semibold text-primary hover:underline">
        ← {t('tournois.back_list')}
      </Link>

      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">{tournoi.nom}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {[tournoi.lieu, tournoi.date_debut, tournoi.date_fin].filter(Boolean).join(' · ') || tournoi.statut}
        </p>
        <p className="mt-1 text-sm font-medium text-foreground">
          {t('tournois.registration_count', { registered: parts.length, max: maxPlaces })}
        </p>
        {isFull && (
          <p className="mt-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
            {t('tournois.full_banner')}
          </p>
        )}
      </div>

      <Card className="shadow-md ring-1 ring-border/80">
        <h2 className="text-lg font-semibold text-foreground">{t('tournois.participants_title')}</h2>
        <div className="mt-4 flex flex-col gap-4 border-b border-border pb-4 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1 space-y-2">
            <Label htmlFor="tq">{t('tournois.add_by_search')}</Label>
            <Input
              id="tq"
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void runSearch()
              }}
            />
          </div>
          <Button type="button" variant="secondary" disabled={busy || isFull} onClick={() => void runSearch()}>
            {t('tournois.search_btn')}
          </Button>
        </div>
        {hits.length > 0 && (
          <ul className="mt-2 divide-y divide-border rounded-lg border border-border">
            {hits.map((h) => (
              <li key={h.id} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                <span className="font-medium">{h.nom}</span>
                <Button type="button" size="sm" disabled={busy || isFull} onClick={() => void addEquipe(h.id)}>
                  {t('tournois.add_btn')}
                </Button>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1 space-y-2">
            <Label htmlFor="tcode">{t('tournois.add_by_code')}</Label>
            <Input id="tcode" value={code} onChange={(e) => setCode(e.target.value)} className="max-w-md" />
          </div>
          <Button type="button" variant="secondary" disabled={busy || !code.trim() || isFull} onClick={() => void addByCode()}>
            {t('tournois.add_btn')}
          </Button>
        </div>

        {err && <p className="mt-3 text-sm font-medium text-destructive">{err}</p>}
        {msg && <p className="mt-3 text-sm font-medium text-primary">{msg}</p>}

        {parts.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">{t('tournois.no_participants')}</p>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-lg border border-border">
            <table className="w-full min-w-[20rem] text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30 text-left text-xs font-semibold uppercase text-muted-foreground">
                  <th className="px-3 py-2">{t('common.name')}</th>
                  <th className="px-3 py-2 text-right tabular-nums">{t('tournois.pts')}</th>
                  <th className="px-3 py-2 text-right tabular-nums">{t('tournois.bp')}</th>
                  <th className="px-3 py-2 text-right tabular-nums">{t('tournois.bc')}</th>
                </tr>
              </thead>
              <tbody>
                {parts.map((p) => (
                  <tr key={p.equipe_id} className="border-b border-border/60 last:border-0">
                    <td className="px-3 py-2 font-medium text-foreground">
                      {p.equipes?.nom ?? p.equipe_id}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">{p.points}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{p.buts_pour}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{p.buts_contre}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
