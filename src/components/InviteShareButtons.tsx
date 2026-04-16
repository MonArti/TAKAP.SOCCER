import { useMemo, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { cn } from '@/lib/utils'

export type InviteShareButtonsProps = {
  compact?: boolean
}

function registerInvitePath(ref: string) {
  const q = new URLSearchParams({ ref })
  return `/register?${q.toString()}`
}

export function InviteShareButtons({ compact = false }: InviteShareButtonsProps) {
  const { user } = useAuth()
  const [copied, setCopied] = useState(false)

  const userCode = useMemo(() => {
    const meta = user?.user_metadata as Record<string, unknown> | undefined
    const fromMeta = meta?.code_parrainage
    if (typeof fromMeta === 'string' && fromMeta.trim()) return fromMeta.trim().toUpperCase()
    if (user?.id) return user.id.replace(/-/g, '').slice(0, 8).toUpperCase()
    return 'TAKAP'
  }, [user])

  const inviteUrl = useMemo(() => {
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    const path = registerInvitePath(userCode)
    return origin ? `${origin}${path}` : path
  }, [userCode])

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  const shareLinks = {
    whatsapp: () => {
      const msg = encodeURIComponent(
        `🎉 Rejoins-moi sur Takap Soccer pour organiser des matchs de foot !\n\n🔗 ${inviteUrl}`,
      )
      window.open(`https://wa.me/?text=${msg}`, '_blank', 'noopener,noreferrer')
    },
    email: () => {
      const subject = encodeURIComponent('Rejoins-moi sur Takap Soccer')
      const body = encodeURIComponent(
        `Salut !\n\nJe t'invite à découvrir Takap Soccer, l'app pour organiser des matchs de foot entre amis.\n\n🔗 ${inviteUrl}\n\nÀ bientôt sur le terrain !`,
      )
      window.open(`mailto:?subject=${subject}&body=${body}`, '_blank', 'noopener,noreferrer')
    },
    sms: () => {
      const msg = encodeURIComponent(`Rejoins Takap Soccer ! ${inviteUrl}`)
      window.open(`sms:?body=${msg}`, '_blank', 'noopener,noreferrer')
    },
    facebook: () => {
      window.open(
        `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(inviteUrl)}`,
        '_blank',
        'noopener,noreferrer',
      )
    },
    twitter: () => {
      const text = encodeURIComponent(
        `🎉 Je t'invite à découvrir Takap Soccer ! Rejoins-moi pour organiser des matchs de foot.`,
      )
      window.open(
        `https://twitter.com/intent/tweet?text=${text}&url=${encodeURIComponent(inviteUrl)}`,
        '_blank',
        'noopener,noreferrer',
      )
    },
  }

  const cardClass = cn(
    'rounded-2xl border border-[rgba(0,230,118,0.12)] bg-[#1A211B] text-[#E8F0E9]',
    compact ? 'p-4' : 'p-6',
  )

  const codeBox = 'rounded-lg border border-[rgba(0,230,118,0.15)] bg-[#0A0E0B] px-3 py-2 font-mono text-[#00E676]'

  if (compact) {
    return (
      <div className={cn(cardClass, 'space-y-3')}>
        <p className="text-xs font-bold uppercase tracking-wider text-[#7A9180]">Inviter des amis</p>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <code className={cn(codeBox, 'text-sm')}>{userCode}</code>
          <button
            type="button"
            onClick={() => void copyLink()}
            className="rounded-xl bg-[rgba(0,230,118,0.15)] px-4 py-2 text-sm font-semibold text-[#00E676] transition hover:bg-[rgba(0,230,118,0.25)]"
          >
            {copied ? '✅ Copié !' : '📋 Copier le lien'}
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={shareLinks.whatsapp}
            className="min-w-[7rem] flex-1 rounded-lg bg-green-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-green-700"
          >
            📱 WhatsApp
          </button>
          <button
            type="button"
            onClick={shareLinks.facebook}
            className="min-w-[7rem] flex-1 rounded-lg bg-blue-800 px-3 py-2 text-sm font-semibold text-white transition hover:bg-blue-900"
          >
            👍 Facebook
          </button>
          <button
            type="button"
            onClick={shareLinks.twitter}
            className="min-w-[7rem] flex-1 rounded-lg bg-neutral-900 px-3 py-2 text-sm font-semibold text-white transition hover:bg-neutral-800"
          >
            🐦 X
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={cn(cardClass, 'space-y-6')}>
      <div>
        <h2 className="text-xl font-bold text-[#E8F0E9]">Inviter des amis</h2>
        <p className="mt-2 text-sm text-[#7A9180]">
          Partage ton lien d’inscription : tes amis arrivent sur Takap avec ton code (aucune API externe).
        </p>
      </div>

      <div className="rounded-xl border border-[rgba(0,230,118,0.12)] bg-[#0A0E0B] p-4">
        <div className="text-xs font-bold uppercase tracking-wider text-[#7A9180]">Ton code</div>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <code className={cn(codeBox, 'flex-1 text-2xl font-bold tracking-wider')}>{userCode}</code>
          <button
            type="button"
            onClick={() => void copyLink()}
            className="rounded-xl bg-[#00E676] px-5 py-2.5 text-sm font-bold text-[#0A0E0B] shadow-[0_0_20px_-8px_rgba(0,230,118,0.6)] transition hover:brightness-110"
          >
            {copied ? 'Copié !' : 'Copier'}
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-[rgba(0,230,118,0.12)] bg-[#0A0E0B] p-4">
        <div className="text-xs font-bold uppercase tracking-wider text-[#7A9180]">Lien à partager</div>
        <code className="mt-2 block overflow-x-auto rounded-lg bg-[#1A211B] p-2 text-xs text-[#7A9180]">
          {inviteUrl}
        </code>
      </div>

      <div>
        <div className="mb-2 text-xs font-bold uppercase tracking-wider text-[#7A9180]">Partager</div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
          <button
            type="button"
            onClick={shareLinks.whatsapp}
            className="flex items-center justify-center gap-2 rounded-lg bg-green-600 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-green-700"
          >
            📱 WhatsApp
          </button>
          <button
            type="button"
            onClick={shareLinks.email}
            className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            📧 Email
          </button>
          <button
            type="button"
            onClick={shareLinks.sms}
            className="flex items-center justify-center gap-2 rounded-lg bg-purple-600 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-purple-700"
          >
            💬 SMS
          </button>
          <button
            type="button"
            onClick={shareLinks.facebook}
            className="flex items-center justify-center gap-2 rounded-lg bg-blue-800 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-900"
          >
            👍 Facebook
          </button>
          <button
            type="button"
            onClick={shareLinks.twitter}
            className="col-span-2 flex items-center justify-center gap-2 rounded-lg bg-neutral-900 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-neutral-800 md:col-span-1 lg:col-span-1"
          >
            🐦 X
          </button>
        </div>
      </div>
    </div>
  )
}
