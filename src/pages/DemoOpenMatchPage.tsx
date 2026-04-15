import { Link, useParams } from 'react-router-dom'
import { Card } from '@/components/Card'
import { euros, formatDateFr, formatHeureAffichage } from '@/lib/format'
import { getDemoMatchOuvertById, getJoueurById, getLieuById, resolveDemoMatchOuvert } from '@/lib/launch-demo'

export function DemoOpenMatchPage() {
  const { id } = useParams<{ id: string }>()
  const raw = id ? getDemoMatchOuvertById(id) : undefined
  const m = raw ? resolveDemoMatchOuvert(raw) : null

  if (!m) {
    return (
      <Card>
        <p className="text-zinc-600">Match exemple introuvable.</p>
        <Link to="/" className="mt-2 inline-block text-sm font-semibold text-brand-700 hover:underline">
          Retour à l’accueil
        </Link>
      </Card>
    )
  }

  const lieu = getLieuById(m.lieu_id)
  const org = getJoueurById(m.org_id)
  const places = Math.max(0, m.nb_max - m.nb_inscrits)

  return (
    <div className="space-y-6">
      <Link to="/" className="text-sm font-medium text-brand-700 hover:underline">
        ← Matchs ouverts
      </Link>

      <div
        role="status"
        className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"
      >
        <strong>Exemple Takap</strong> — ce match n’existe pas en base : navigation et mise en page de test
        uniquement (pas d’inscription réelle ici).
      </div>

      <Card>
        <h1 className="text-xl font-bold text-zinc-900">
          {formatDateFr(m.date)} · {formatHeureAffichage(m.heure)}
        </h1>
        <p className="mt-2 text-zinc-700">{m.lieuLabel}</p>
        {lieu && <p className="mt-1 text-sm text-zinc-500">{lieu.type}</p>}
        <p className="mt-4 text-sm text-zinc-600">
          Organisateur (fictif) :{' '}
          {org ? (
            <Link to={`/demo/joueur/${org.id}`} className="font-medium text-brand-800 hover:underline">
              {org.prenom}
            </Link>
          ) : (
            m.org_id
          )}
        </p>
        <div className="mt-6 flex flex-wrap gap-4 border-t border-zinc-100 pt-4">
          <div>
            <p className="text-xs uppercase text-zinc-400">Places</p>
            <p className="text-lg font-semibold text-zinc-900">
              {places} restante{places > 1 ? 's' : ''} / {m.nb_max}
            </p>
            <p className="text-xs text-zinc-500">{m.nb_inscrits} joueur(s) déjà inscrits (fictif)</p>
          </div>
          <div>
            <p className="text-xs uppercase text-zinc-400">Prix</p>
            <p className="text-lg font-semibold text-zinc-900">{euros(Number(m.prix))} / joueur</p>
          </div>
          <div>
            <p className="text-xs uppercase text-zinc-400">Format</p>
            <p className="text-lg font-semibold text-zinc-900">{m.type}</p>
          </div>
        </div>
        <p className="mt-6 text-sm text-zinc-500">
          Pour réserver une vraie place, utilise un match créé par la communauté depuis l’accueil.
        </p>
      </Card>
    </div>
  )
}
