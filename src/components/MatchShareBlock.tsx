import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Copy, Globe, MessageCircle, Share2 } from 'lucide-react'
import { Card } from '@/components/Card'
import { Button } from '@/components/Button'

export type MatchSharePayload = {
  matchUrl: string
  homeName: string
  awayName: string
  scoreHome: string
  scoreAway: string
  scorersLine: string
  mvpName: string
}

function buildShareText(t: (k: string, o?: Record<string, string>) => string, p: MatchSharePayload) {
  return t('match_share.body', {
    home: p.homeName,
    away: p.awayName,
    sh: p.scoreHome,
    sa: p.scoreAway,
    scorers: p.scorersLine,
    mvp: p.mvpName,
  })
}

type Props = {
  payload: MatchSharePayload
}

export function MatchShareBlock({ payload }: Props) {
  const { t } = useTranslation()
  const [copied, setCopied] = useState(false)
  const text = buildShareText(t, payload)
  const encodedText = encodeURIComponent(text)
  const encodedUrl = encodeURIComponent(payload.matchUrl)

  function openWa() {
    window.open(`https://wa.me/?text=${encodedText}`, '_blank', 'noopener,noreferrer')
  }

  function openFb() {
    window.open(
      `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodedText}`,
      '_blank',
      'noopener,noreferrer',
    )
  }

  function openX() {
    window.open(`https://twitter.com/intent/tweet?text=${encodedText}`, '_blank', 'noopener,noreferrer')
  }

  async function copyAll() {
    try {
      await navigator.clipboard.writeText(`${text}\n${payload.matchUrl}`)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  return (
    <Card className="shadow-md ring-1 ring-border/80">
      <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
        <Share2 className="size-5" />
        {t('match_share.title')}
      </h2>
      <pre className="mt-3 max-h-40 overflow-auto whitespace-pre-wrap rounded-lg border border-border bg-muted/30 p-3 text-xs text-foreground">
        {text}
        {'\n'}
        {payload.matchUrl}
      </pre>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button type="button" variant="secondary" className="inline-flex items-center gap-2" onClick={openWa}>
          <MessageCircle className="size-4" />
          WhatsApp
        </Button>
        <Button type="button" variant="secondary" className="inline-flex items-center gap-2" onClick={openFb}>
          <Globe className="size-4" />
          Facebook
        </Button>
        <Button type="button" variant="secondary" className="inline-flex items-center gap-2" onClick={openX}>
          X
        </Button>
        <Button type="button" variant="ghost" className="inline-flex items-center gap-2" onClick={() => void copyAll()}>
          <Copy className="size-4" />
          {copied ? t('common.copied') : t('match_share.copy')}
        </Button>
      </div>
    </Card>
  )
}
