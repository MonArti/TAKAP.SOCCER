import { Link, useParams } from 'react-router-dom'
import { Card } from '@/components/Card'
import { formatDateFr } from '@/lib/format'
import { getJoueurById, getLieuById, getMatchById } from '@/lib/launch-demo'

export function DemoMatchPage() {
  const { id } = useParams<{ id: string }>()
  const m = id ? getMatchById(id) : undefined

  if (!m) {
    return (
      <Card>
        <p className="text-zinc-600">Match démo introuvable.</p>
        <Link to="/demo" className="mt-2 inline-block text-sm font-semibold text-brand-700 hover:underline">
          Liste démo
        </Link>
      </Card>
    )
  }

  const lieu = getLieuById(m.lieu_id)
  const org = getJoueurById(m.org_id)

  return (
    <div className="space-y-6">
      <Link to="/demo" className="text-sm font-medium text-brand-700 hover:underline">
        ← Démo lancement
      </Link>

      <Card>
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Match fictif</p>
        <h1 className="mt-1 text-2xl font-bold text-zinc-900">
          {formatDateFr(m.date)} · {m.heure}
        </h1>
        {lieu && (
          <p className="mt-2 text-zinc-700">
            <span className="font-medium">{lieu.nom}</span>
            <span className="text-zinc-500"> — {lieu.ville}</span>
          </p>
        )}
        <p className="mt-1 text-sm text-zinc-500">{lieu?.type ?? m.type} · format {m.type}</p>

        <div className="mt-6 flex items-center justify-center gap-4 rounded-xl bg-zinc-50 py-6">
          <span className="text-3xl font-bold tabular-nums text-zinc-900">{m.scoreA}</span>
          <span className="text-xl font-medium text-zinc-400">—</span>
          <span className="text-3xl font-bold tabular-nums text-zinc-900">{m.scoreB}</span>
        </div>

        <div className="mt-6 border-t border-zinc-100 pt-4">
          <p className="text-sm text-zinc-500">Organisateur</p>
          <p className="mt-1 font-medium text-zinc-900">
            {org ? (
              <Link to={`/demo/joueur/${org.id}`} className="text-brand-800 hover:underline">
                {org.prenom}
              </Link>
            ) : (
              m.org_id
            )}
            <span className="font-normal text-zinc-500"> · {org?.ville}</span>
          </p>
        </div>

        <div className="mt-4">
          <p className="text-sm text-zinc-500">Joueurs présents (liste démo)</p>
          <ul className="mt-2 space-y-2">
            {m.joueurs.map((jid) => {
              const j = getJoueurById(jid)
              return (
                <li key={jid}>
                  <Link
                    to={`/demo/joueur/${jid}`}
                    className="text-sm font-medium text-brand-800 hover:underline"
                  >
                    {j?.prenom ?? jid}
                  </Link>
                  {j && <span className="text-zinc-500"> — {j.ville}</span>}
                </li>
              )
            })}
          </ul>
        </div>
      </Card>
    </div>
  )
}
