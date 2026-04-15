import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Card } from '@/components/Card'
import { formatDateFr, niveauIndicatifFromNote, parseNoteMoyenne } from '@/lib/format'
import { useAuth } from '@/contexts/AuthContext'
import {
  getDemoCommunityAvgMatchs,
  getDemoCommunityAvgNote,
  getJoueurById,
  getLaunchDemo,
  getLieuById,
  getMatchsForJoueur,
} from '@/lib/launch-demo'

export function DemoJoueurPage() {
  const { id } = useParams<{ id: string }>()
  const j = id ? getJoueurById(id) : undefined
  const { user } = useAuth()
  const [me, setMe] = useState<{
    pseudo: string
    note_moyenne: number
    nb_matchs: number
  } | null>(null)

  useEffect(() => {
    if (!user?.id) {
      setMe(null)
      return
    }
    let cancelled = false
    void supabase
      .from('profiles')
      .select('pseudo, note_moyenne, nb_matchs')
      .eq('id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled)
          setMe(
            data
              ? {
                  pseudo: data.pseudo,
                  note_moyenne: data.note_moyenne,
                  nb_matchs: data.nb_matchs,
                }
              : null,
          )
      })
    return () => {
      cancelled = true
    }
  }, [user?.id])

  if (!j) {
    return (
      <Card>
        <p className="text-zinc-600">Joueur démo introuvable.</p>
        <Link to="/demo" className="mt-2 inline-block text-sm font-semibold text-brand-700 hover:underline">
          Liste démo
        </Link>
      </Card>
    )
  }

  const matchs = getMatchsForJoueur(j.id)
  const nDemoJoueurs = getLaunchDemo().joueurs.length
  const avgNoteDemo = getDemoCommunityAvgNote()
  const avgMatchsDemo = getDemoCommunityAvgMatchs()
  const diffNote = j.note - avgNoteDemo
  const diffMatchs = j.matchs - avgMatchsDemo

  return (
    <div className="space-y-6">
      <Link to="/demo" className="text-sm font-medium text-brand-700 hover:underline">
        ← Démo lancement
      </Link>

      <Card>
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Profil fictif</p>
        <h1 className="mt-1 text-2xl font-bold text-zinc-900">{j.prenom}</h1>
        <p className="mt-1 text-sm text-zinc-600">{j.ville}</p>

        <dl className="mt-6 grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-zinc-500">Note (démo)</dt>
            <dd className="text-lg font-semibold text-zinc-900">{j.note.toFixed(1)} / 5</dd>
          </div>
          <div>
            <dt className="text-zinc-500">Matchs (démo)</dt>
            <dd className="text-lg font-semibold text-zinc-900">{j.matchs}</dd>
          </div>
          <div className="col-span-2 sm:col-span-1">
            <dt className="text-zinc-500">Niveau indicatif</dt>
            <dd className="font-medium text-zinc-800">{niveauIndicatifFromNote(j.note)}</dd>
          </div>
        </dl>
      </Card>

      <Card>
        <h2 className="text-lg font-semibold text-zinc-900">Par rapport au groupe démo</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Moyennes calculées sur les {nDemoJoueurs} joueurs fictifs du fichier de lancement.
        </p>
        <ul className="mt-3 space-y-2 text-sm text-zinc-700">
          <li>
            Note moyenne du groupe : <strong>{avgNoteDemo.toFixed(2)}</strong>
            {Math.abs(diffNote) < 0.05 ? (
              <span className="text-zinc-500"> — proche de la moyenne.</span>
            ) : diffNote > 0 ? (
              <span className="text-emerald-700"> — au-dessus de la moyenne fictive.</span>
            ) : (
              <span className="text-zinc-600"> — en dessous de la moyenne fictive.</span>
            )}
          </li>
          <li>
            Matchs joués (moyenne groupe) : <strong>{avgMatchsDemo}</strong>
            {Math.abs(diffMatchs) < 0.05 ? (
              <span className="text-zinc-500"> — proche de la moyenne.</span>
            ) : diffMatchs > 0 ? (
              <span className="text-emerald-700"> — plus de matchs que la moyenne fictive.</span>
            ) : (
              <span className="text-zinc-600"> — moins de matchs que la moyenne fictive.</span>
            )}
          </li>
        </ul>
      </Card>

      {user && me && (
        <Card>
          <h2 className="text-lg font-semibold text-zinc-900">Vous ({me.pseudo}) vs ce joueur fictif</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Vos chiffres viennent de votre vrai profil Takap ; {j.prenom} reste une donnée de démonstration.
          </p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[260px] text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-200 text-zinc-500">
                  <th className="pb-2 pr-4 font-medium">Indicateur</th>
                  <th className="pb-2 pr-4 font-medium">Vous</th>
                  <th className="pb-2 font-medium">{j.prenom} (démo)</th>
                </tr>
              </thead>
              <tbody className="text-zinc-800">
                <tr className="border-b border-zinc-100">
                  <td className="py-2 pr-4">Note moyenne</td>
                  <td className="py-2 pr-4 font-medium">
                    {parseNoteMoyenne(me.note_moyenne).toFixed(2)}
                  </td>
                  <td className="py-2 font-medium">{j.note.toFixed(1)}</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4">Matchs joués</td>
                  <td className="py-2 pr-4 font-medium">{me.nb_matchs}</td>
                  <td className="py-2 font-medium">{j.matchs}</td>
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
          pour comparer ce profil fictif à vos vraies stats.
        </p>
      )}

      <Card>
        <h2 className="text-lg font-semibold text-zinc-900">Matchs dans la démo</h2>
        {matchs.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-500">Aucun match lié.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {matchs.map((m) => {
              const lieu = getLieuById(m.lieu_id)
              return (
                <li key={m.id}>
                  <Link
                    to={`/demo/match/${m.id}`}
                    className="block rounded-lg border border-zinc-100 px-3 py-2 text-sm transition hover:border-brand-200 hover:bg-brand-50/40"
                  >
                    <span className="font-medium text-zinc-900">
                      {formatDateFr(m.date)} · {m.heure}
                    </span>
                    <span className="ml-2 text-zinc-500">
                      {lieu ? `${lieu.nom}` : m.lieu_id} — {m.scoreA}-{m.scoreB}
                    </span>
                    {m.org_id === j.id && (
                      <span className="ml-2 text-xs font-semibold text-brand-700">Organisateur</span>
                    )}
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </Card>
    </div>
  )
}
