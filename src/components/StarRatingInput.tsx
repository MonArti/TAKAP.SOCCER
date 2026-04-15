type Props = {
  value: number | null
  onChange: (n: number) => void
  disabled?: boolean
}

export function StarRatingInput({ value, onChange, disabled }: Props) {
  return (
    <div className="flex gap-1" role="group" aria-label="Note sur 5">
      {[1, 2, 3, 4, 5].map((n) => {
        const active = value !== null && n <= value
        return (
          <button
            key={n}
            type="button"
            disabled={disabled}
            onClick={() => onChange(n)}
            className={`rounded-md p-1 text-2xl leading-none transition ${
              active ? 'text-amber-400' : 'text-zinc-300 hover:text-amber-200'
            } ${disabled ? 'opacity-40' : ''}`}
            aria-label={`${n} étoile${n > 1 ? 's' : ''}`}
          >
            ★
          </button>
        )
      })}
    </div>
  )
}
