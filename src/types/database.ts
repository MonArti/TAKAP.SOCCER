import type { MatchNiveau } from '@/lib/match-niveau'

export type MatchStatut = 'ouvert' | 'termine'

export type ProfileRole = 'user' | 'admin'

export type { MatchNiveau }

export type ProfileRow = {
  id: string
  email: string | null
  pseudo: string
  age: number | null
  taille: number | null
  poids: number | null
  note_moyenne: number
  nb_matchs: number
  code_parrainage?: string | null
  parrain_id?: string | null
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
  /** Absent avant migration SQL `niveau_chat_stats.sql` — traiter comme `amateur`. */
  niveau?: MatchNiveau
  created_at: string
}

export type MessageMatchRow = {
  id: string
  match_id: string
  user_id: string
  message: string
  created_at: string
}

export type StatsMatchJoueurRow = {
  id: string
  match_id: string
  joueur_id: string
  buts: number
  passes_decisives: number
  cartons_jaunes: number
  cartons_rouges: number
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

export type NotificationType =
  | 'match_created'
  | 'new_rating'
  | 'rank_changed'
  | 'match_invite'

export type InvitationStatut = 'en_attente' | 'acceptee' | 'refusee' | 'ignoree'

export type InvitationRow = {
  id: string
  match_id: string
  inviteur_id: string
  invite_id: string
  statut: InvitationStatut
  cree_le: string
}

export type NotificationRow = {
  id: string
  user_id: string
  type: NotificationType
  content: string
  read: boolean
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
          code_parrainage?: string | null
          parrain_id?: string | null
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
          niveau?: MatchNiveau
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
      notifications: {
        Row: NotificationRow
        Insert: {
          id?: string
          user_id: string
          type: NotificationType
          content: string
          read?: boolean
          created_at?: string
        }
        Update: Partial<Pick<NotificationRow, 'read'>>
        Relationships: []
      }
      invitations: {
        Row: InvitationRow
        Insert: {
          id?: string
          match_id: string
          inviteur_id: string
          invite_id: string
          statut?: InvitationStatut
          cree_le?: string
        }
        Update: Partial<Pick<InvitationRow, 'statut'>>
        Relationships: []
      }
      messages_match: {
        Row: MessageMatchRow
        Insert: {
          id?: string
          match_id: string
          user_id: string
          message: string
          created_at?: string
        }
        Update: Partial<Omit<MessageMatchRow, 'id'>>
        Relationships: []
      }
      stats_match_joueur: {
        Row: StatsMatchJoueurRow
        Insert: {
          id?: string
          match_id: string
          joueur_id: string
          buts?: number
          passes_decisives?: number
          cartons_jaunes?: number
          cartons_rouges?: number
        }
        Update: Partial<Omit<StatsMatchJoueurRow, 'id'>>
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
          p_niveau?: string
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
