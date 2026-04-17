import { useTranslation } from 'react-i18next'
import i18n from '@/i18n'
import { cn } from '@/lib/utils'

const LANGS = [
  { code: 'fr' as const, flag: '🇫🇷' },
  { code: 'en' as const, flag: '🇬🇧' },
  { code: 'es' as const, flag: '🇪🇸' },
  { code: 'ar' as const, flag: '🇸🇦' },
]

function resolvedLangBase(): string {
  const lng = (i18n.resolvedLanguage ?? i18n.language ?? 'fr').split('-')[0] ?? 'fr'
  return lng
}

export function LanguageSelector({ className }: { className?: string }) {
  const { t } = useTranslation()
  const active = resolvedLangBase()

  return (
    <div
      role="group"
      aria-label={t('language.label')}
      className={cn('flex flex-wrap items-center gap-1.5', className)}
    >
      <span className="text-[10px] font-bold uppercase tracking-wider text-[#7A9180]">
        {t('language.label')}
      </span>
      <div className="flex gap-1">
        {LANGS.map(({ code, flag }) => (
          <button
            key={code}
            type="button"
            title={t(`language.${code}`)}
            aria-pressed={active === code}
            onClick={() => void i18n.changeLanguage(code)}
            className={cn(
              'flex size-9 items-center justify-center rounded-lg border text-lg transition-colors',
              active === code
                ? 'border-[#00E676]/55 bg-[rgba(0,230,118,0.15)] shadow-[0_0_16px_-8px_rgba(0,230,118,0.5)]'
                : 'border-[rgba(0,230,118,0.12)] bg-[#0A0E0B] hover:border-[rgba(0,230,118,0.28)]',
            )}
          >
            <span aria-hidden>{flag}</span>
            <span className="sr-only">{t(`language.${code}`)}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
