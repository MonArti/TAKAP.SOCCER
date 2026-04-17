import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { InviteShareButtons } from '@/components/InviteShareButtons'

export function InvitePage() {
  const { t } = useTranslation()
  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-3xl font-black tracking-tight text-[#E8F0E9]">{t('invite_share.title')}</h1>
        <p className="mt-2 text-sm text-[#7A9180]">
          {t('invite_page.subtitle')}{' '}
          <code className="rounded bg-[#1A211B] px-1 text-[#00E676]">?ref=</code>
        </p>
      </div>

      <InviteShareButtons compact={false} />

      <div className="rounded-2xl border border-[rgba(0,230,118,0.12)] bg-[#1A211B]/80 p-6 text-center">
        <div className="text-3xl" aria-hidden>
          🎁
        </div>
        <h3 className="mt-2 font-semibold text-[#E8F0E9]">{t('invite_page.why_title')}</h3>
        <p className="mt-1 text-sm text-[#7A9180]">{t('invite_page.why_body')}</p>
        <Link to="/" className="mt-4 inline-block text-sm font-bold text-[#00E676] hover:underline">
          {t('invite_page.back_home')}
        </Link>
      </div>
    </div>
  )
}
