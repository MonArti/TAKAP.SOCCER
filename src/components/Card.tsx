import { Card as UICard } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export function Card({
  children,
  className = '',
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <UICard className={cn('gap-0 px-4 py-4 shadow-sm ring-border/60 sm:px-5 sm:py-5', className)}>
      {children}
    </UICard>
  )
}
