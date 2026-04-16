import type { ComponentProps } from 'react'
import { Button as ShadcnButton } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type LegacyVariant = 'primary' | 'secondary' | 'ghost' | 'danger'

type Props = Omit<ComponentProps<typeof ShadcnButton>, 'variant'> & {
  variant?: LegacyVariant
}

const variantMap: Record<
  LegacyVariant,
  NonNullable<ComponentProps<typeof ShadcnButton>['variant']>
> = {
  primary: 'default',
  secondary: 'outline',
  ghost: 'ghost',
  danger: 'destructive',
}

export function Button({ variant = 'primary', className, size = 'lg', ...props }: Props) {
  return (
    <ShadcnButton
      variant={variantMap[variant]}
      size={size}
      className={cn(
        'h-auto min-h-10 rounded-xl px-4 py-2.5 text-sm font-semibold',
        variant === 'primary' && 'shadow-sm',
        className,
      )}
      {...props}
    />
  )
}
