export type MatchStatut = 'ouvert' | 'termine'

export type ProfileRole = 'user' | 'admin'

export type ProfileRow = {
  id: string
  email: string | null
  pseudo: string
  age: number | null
  taille: number | null
  poids: number | null
  note_moyenne: number
  nb_matchs: number
  /** Absent si la colonne n’existe pas encore en base (exécuter admin_role.sql) */
  role?: ProfileRole
  created_at: string
  updated_at: string
}

export type MatchRow = {
  id: string
  organisateur_id: string
  date_match: string
  heure_match: string
  lieu: string
  lieu_lat: number | null
  lieu_lng: number | null
  prix: number
  nb_max: number
  statut: MatchStatut
  created_at: string
}

export type ParticipationRow = {
  id: string
  match_id: string
  joueur_id: string
  a_paye: boolean
  created_at: string
}

export type NoteRow = {
  id: string
  match_id: string
  donneur_id: string
  receveur_id: string
  note: number
  created_at: string
}

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow
        Insert: {
          id: string
          email?: string | null
          pseudo?: string
          age?: number | null
          taille?: number | null
          poids?: number | null
          note_moyenne?: number
          nb_matchs?: number
          role?: ProfileRole
        }
        Update: Partial<Omit<ProfileRow, 'id'>> & { id?: string }
        Relationships: []
      }
      matchs: {
        Row: MatchRow
        Insert: {
          id?: string
          organisateur_id: string
          date_match: string
          heure_match: string
          lieu: string
          lieu_lat?: number | null
          lieu_lng?: number | null
          prix?: number
          nb_max?: number
          statut?: MatchStatut
          created_at?: string
        }
        Update: Partial<Omit<MatchRow, 'id'>>
        Relationships: []
      }
      participations: {
        Row: ParticipationRow
        Insert: {
          id?: string
          match_id: string
          joueur_id: string
          a_paye?: boolean
          created_at?: string
        }
        Update: Partial<Omit<ParticipationRow, 'id'>>
        Relationships: []
      }
      notes: {
        Row: NoteRow
        Insert: {
          id?: string
          match_id: string
          donneur_id: string
          receveur_id: string
          note: number
          created_at?: string
        }
        Update: Partial<Omit<NoteRow, 'id'>>
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: {
      create_match: {
        Args: {
          p_date_match: string
          p_heure_match: string
          p_lieu: string
          p_prix: number
          p_nb_max: number
          p_lieu_lat?: number | null
          p_lieu_lng?: number | null
        }
        Returns: string
      }
      get_public_profile_extras: {
        Args: { p_profile_id: string }
        /** jsonb renvoyé par Postgres */
        Returns: Record<string, unknown>
      }
    }
    Enums: {
      match_statut: MatchStatut
    }
    CompositeTypes: Record<string, never>
  }
}
