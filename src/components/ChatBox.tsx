import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '@/lib/supabase'
import type { MessageMatchRow } from '@/types/database'
import { resolveUiLocale } from '@/lib/format'
import { Button } from '@/components/Button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/Card'
type RowWithPseudo = MessageMatchRow & { pseudo: string }

function formatMessageTime(iso: string, locale: string) {
  try {
    const d = new Date(iso)
    return d.toLocaleString(locale, {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

type ChatBoxProps = {
  matchId: string
  userId: string | undefined
  /** True si l'utilisateur est inscrit (participations) — chat réservé aux participants. */
  canUseChat: boolean
}

export function ChatBox({ matchId, userId, canUseChat }: ChatBoxProps) {
  const { t, i18n } = useTranslation()
  const locale = resolveUiLocale(i18n.language)
  const [rows, setRows] = useState<RowWithPseudo[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [text, setText] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const load = useCallback(async () => {
    if (!matchId || !canUseChat) {
      setRows([])
      setLoading(false)
      return
    }
    setErr(null)
    const { data, error } = await supabase
      .from('messages_match')
      .select('id, match_id, user_id, message, created_at')
      .eq('match_id', matchId)
      .order('created_at', { ascending: true })
    if (error) {
      setErr(error.message)
      setRows([])
    } else {
      const raw = (data ?? []) as MessageMatchRow[]
      const ids = [...new Set(raw.map((r) => r.user_id))]
      let pmap = new Map<string, string>()
      if (ids.length) {
        const { data: profs } = await supabase.from('profiles').select('id, pseudo').in('id', ids)
        pmap = new Map((profs ?? []).map((p) => [p.id as string, (p.pseudo as string) ?? t('common.player')]))
      }
      setRows(
        raw.map((r) => ({
          ...r,
          pseudo: pmap.get(r.user_id) ?? t('common.player'),
        })),
      )
    }
    setLoading(false)
  }, [matchId, canUseChat, t])

  useEffect(() => {
    setLoading(true)
    void load()
  }, [load])

  useEffect(() => {
    if (!canUseChat || !matchId) return
    const ch = supabase
      .channel(`messages_match:${matchId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages_match',
          filter: `match_id=eq.${matchId}`,
        },
        () => {
          void load()
        },
      )
      .subscribe()
    return () => {
      void supabase.removeChannel(ch)
    }
  }, [matchId, canUseChat, load])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [rows])

  async function send() {
    if (!userId || !canUseChat) return
    const m = text.trim()
    if (!m) return
    setErr(null)
    setSending(true)
    const { error } = await supabase.from('messages_match').insert({
      match_id: matchId,
      user_id: userId,
      message: m,
    })
    setSending(false)
    if (error) {
      setErr(error.message)
      return
    }
    setText('')
    void load()
  }

  if (!userId) {
    return (
      <Card className="shadow-md ring-1 ring-border/80">
        <h2 className="text-lg font-semibold text-foreground">{t('chat.title')}</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          <Link to="/login" className="font-semibold text-primary hover:underline">
            {t('common.connect')}
          </Link>{' '}
          {t('chat.login_to_see')}
        </p>
      </Card>
    )
  }

  if (!canUseChat) {
    return (
      <Card className="shadow-md ring-1 ring-border/80">
        <h2 className="text-lg font-semibold text-foreground">{t('chat.title')}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{t('chat.participants_only')}</p>
      </Card>
    )
  }

  return (
    <Card className="shadow-md ring-1 ring-border/80">
      <h2 className="text-lg font-semibold text-foreground">{t('chat.title')}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{t('chat.intro')}</p>

      {err && <p className="mt-3 text-sm font-medium text-destructive">{err}</p>}

      <div
        ref={listRef}
        className="mt-4 max-h-72 space-y-3 overflow-y-auto rounded-lg border border-border bg-muted/20 px-3 py-3"
      >
        {loading && <p className="text-sm text-muted-foreground">{t('chat.loading_messages')}</p>}
        {!loading && rows.length === 0 && (
          <p className="text-sm text-muted-foreground">{t('chat.empty')}</p>
        )}
        {!loading &&
          rows.map((r) => {
            const pseudo = r.pseudo
            const mine = r.user_id === userId
            return (
              <div
                key={r.id}
                className={`flex flex-col gap-0.5 text-sm ${mine ? 'items-end text-right' : 'items-start'}`}
              >
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0">
                  <span className={`font-semibold ${mine ? 'text-primary' : 'text-foreground'}`}>{pseudo}</span>
                  <span className="text-[10px] text-muted-foreground tabular-nums">
                    {formatMessageTime(r.created_at, locale)}
                  </span>
                </div>
                <p
                  className={`max-w-[95%] rounded-lg px-3 py-2 ${
                    mine ? 'bg-primary/15 text-foreground' : 'bg-background text-foreground ring-1 ring-border/80'
                  }`}
                >
                  {r.message}
                </p>
              </div>
            )
          })}
        <div ref={bottomRef} aria-hidden />
      </div>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t('chat.placeholder')}
          className="flex-1"
          disabled={sending}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              void send()
            }
          }}
        />
        <Button type="button" disabled={sending || !text.trim()} onClick={() => void send()}>
          {sending ? t('common.sending') : t('common.send')}
        </Button>
      </div>
    </Card>
  )
}
