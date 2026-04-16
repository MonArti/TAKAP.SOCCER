import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { euros } from '@/lib/format'

export type MatchCardStatus = 'ouvert' | 'complet' | 'aujourdhui'

const AVATAR_BG = [
  'bg-indigo-600',
  'bg-sky-600',
  'bg-amber-700',
  'bg-fuchsia-700',
  'bg-rose-700',
  'bg-teal-600',
  'bg-orange-700',
  'bg-cyan-700',
]

function initialsFromName(name: string) {
  const t = name.trim()
  if (!t) return '?'
  const bits = t.split(/\s+/)
  if (bits.length >= 2) return (bits[0][0] + bits[1][0]).toUpperCase()
  return t.slice(0, 2).toUpperCase()
}

function StatusBadge({ status }: { status: MatchCardStatus }) {
  if (status === 'complet') {
    return (
      <span
        className={cn(
          'rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide',
          'border-[#FF3B5C]/45 bg-[#FF3B5C]/12 text-[#FF3B5C]',
        )}
      >
        Complet
      </span>
    )
  }
  if (status === 'aujourdhui') {
    return (
      <span
        className={cn(
          'rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide',
          'border-[#FFD600]/45 bg-[#FFD600]/12 text-[#FFD600]',
        )}
      >
        Aujourd&apos;hui
      </span>
    )
  }
  return (
    <span
      className={cn(
        'rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide',
        'border-[#00E676]/45 bg-[#00E676]/14 text-[#00E676]',
      )}
    >
      Ouvert
    </span>
  )
}

function AvatarStack({
  leaderName,
  nbInscrits,
  nbMax,
}: {
  leaderName: string
  nbInscrits: number
  nbMax: number
}) {
  const total = Math.max(0, Math.min(nbInscrits, nbMax))
  if (total === 0) {
    return <p className="text-xs text-[#7A9180]">Aucun joueur inscrit — sois le premier.</p>
  }
  const cap = 8
  const shown = Math.min(total, cap)
  const overflow = total > cap ? total - cap : 0
  const extraSlots = Math.max(0, shown - 1)

  return (
    <div className="flex items-center gap-1.5">
      <div className="flex -space-x-2">
        <span
          className="relative z-10 flex size-9 items-center justify-center rounded-full border-2 border-[#1A211B] bg-[#00E676] text-xs font-bold text-[#0A0E0B]"
          title={leaderName}
        >
          {initialsFromName(leaderName)}
        </span>
        {Array.from({ length: extraSlots }).map((_, i) => (
          <span
            key={i}
            className={cn(
              'relative flex size-9 items-center justify-center rounded-full border-2 border-[#1A211B] text-xs font-bold text-white',
              AVATAR_BG[i % AVATAR_BG.length],
            )}
          >
            ?
          </span>
        ))}
        {overflow > 0 && (
          <span className="relative flex size-9 items-center justify-center rounded-full border-2 border-[#1A211B] bg-[#243028] text-[10px] font-bold text-[#7A9180]">
            +{overflow}
          </span>
        )}
      </div>
    </div>
  )
}

export type MatchCardProps = {
  to: string
  variant: 'real' | 'demo'
  nbMax: number
  venueTitle: string
  lieuPin: string
  organizerDisplay: string
  nbInscrits: number
  prix: number
  dateLine: string
  status: MatchCardStatus
  /** Libellé court affiché à côté du statut (ex. niveau du match). */
  niveauLabel?: string
}

export function MatchCard({
  to,
  variant,
  nbMax,
  venueTitle,
  lieuPin,
  organizerDisplay,
  nbInscrits,
  prix,
  dateLine,
  status,
  niveauLabel,
}: MatchCardProps) {
  const title = `${nbMax} VS ${nbMax} — ${venueTitle.toUpperCase()}`
  const ratio = `${nbInscrits}/${nbMax}`

  return (
    <Link
      to={to}
      className={cn(
        'group block rounded-2xl border bg-[#1A211B] p-4 shadow-[0_12px_40px_-24px_rgba(0,0,0,0.85)] transition-[transform,box-shadow]',
        'border-[rgba(0,230,118,0.12)] hover:border-[rgba(0,230,118,0.22)] hover:shadow-[0_16px_48px_-20px_rgba(0,230,118,0.12)]',
        variant === 'demo' && 'ring-1 ring-[#FFD600]/25',
      )}
    >
      <article>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={status} />
          {variant === 'demo' && (
            <span className="rounded-md border border-[#FFD600]/40 bg-[#FFD600]/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#FFD600]">
              Exemple
            </span>
          )}
          {niveauLabel && (
            <span className="rounded-md border border-[rgba(0,230,118,0.35)] bg-[rgba(0,230,118,0.1)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#7A9180]">
              {niveauLabel}
            </span>
          )}
        </div>
        <span className="text-xs font-semibold text-[#7A9180]">{ratio}</span>
      </div>

      <h3 className="mt-3 font-bold leading-tight tracking-tight text-[#E8F0E9]">{title}</h3>
      <p className="mt-1 text-xs text-[#7A9180]">{dateLine}</p>
      <p className="mt-2 flex items-start gap-1.5 text-sm text-[#E8F0E9]/90">
        <span className="shrink-0" aria-hidden>
          📍
        </span>
        <span>{lieuPin}</span>
      </p>
      <p className="mt-1 text-[11px] text-[#7A9180]">
        Organisateur · <span className="font-medium text-[#E8F0E9]/85">{organizerDisplay}</span>
      </p>

      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <AvatarStack leaderName={organizerDisplay} nbInscrits={nbInscrits} nbMax={nbMax} />
        <div className="flex flex-col items-stretch gap-2 sm:items-end">
          <span className="text-right text-sm font-semibold text-[#00E676]">{euros(Number(prix))}</span>
          <span
            className={cn(
              'inline-flex h-11 items-center justify-center rounded-xl px-6 text-sm font-bold',
              'bg-[#00E676] text-[#0A0E0B] shadow-[0_0_24px_-8px_rgba(0,230,118,0.75)] transition group-hover:brightness-110',
            )}
          >
            Rejoindre
          </span>
        </div>
      </div>
      </article>
    </Link>
  )
}
