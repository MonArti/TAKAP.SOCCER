export const MATCH_NIVEAUX = ['debutant', 'amateur', 'confirme', 'expert'] as const

export type MatchNiveau = (typeof MATCH_NIVEAUX)[number]

const LABELS: Record<MatchNiveau, string> = {
  debutant: 'Débutant',
  amateur: 'Amateur',
  confirme: 'Confirmé',
  expert: 'Expert',
}

export function matchNiveauLabel(n: MatchNiveau): string {
  return LABELS[n] ?? n
}

export function parseMatchNiveauParam(s: string | null): MatchNiveau | null {
  if (!s) return null
  const v = s.trim().toLowerCase()
  return (MATCH_NIVEAUX as readonly string[]).includes(v) ? (v as MatchNiveau) : null
}
