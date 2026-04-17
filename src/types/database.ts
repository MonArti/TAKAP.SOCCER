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
  /** FK optionnelle vers `equipes`. */
  equipe_domicile_id?: string | null
  equipe_exterieur_id?: string | null
  score_domicile?: number | null
  score_exterieur?: number | null
  created_at: string
}

export type TournoiType = 'elimination' | 'poules'

export type TournoiRow = {
  id: string
  nom: string
  date_debut: string | null
  date_fin: string | null
  lieu: string | null
  type: TournoiType | null
  statut: string
  organisateur_id: string | null
  created_at: string
  /** Places max (migration tournois) — défaut UI 8 si absent. */
  nb_equipes_max?: number | null
}

export type DefiStatut = 'en_attente' | 'accepte' | 'refuse'

export type DefiRow = {
  id: string
  equipe_demandeur_id: string
  equipe_receveur_id: string
  statut: DefiStatut
  match_id: string | null
  date_proposee: string | null
  message: string | null
  created_at: string
}

export type TournoiParticipantRow = {
  tournoi_id: string
  equipe_id: string
  points: number
  buts_pour: number
  buts_contre: number
}

export type MatchPhotoRow = {
  id: string
  match_id: string
  url: string
  uploaded_by: string
  created_at: string
}

export type TeamRow = {
  id: string
  name: string
  city: string
  logo_url: string | null
  color_primary: string | null
  color_secondary: string | null
  stadium: string | null
  invite_code: string
  created_by: string
  created_at: string
  points?: number | null
}

export type TeamMemberRow = {
  id: string
  team_id: string
  profile_id: string
  role: string | null
  joined_at: string
}

/**
 * Table `equipes`. Côté API, les couleurs sont normalisées depuis plusieurs noms de colonnes possibles
 * (`normalizeEquipeRow` dans `equipes.ts`).
 */
export type EquipeRow = {
  id: string
  nom: string
  ville: string | null
  logo_url: string | null
  couleur_principale: string | null
  couleur_secondaire: string | null
  stade: string | null
  nb_victoires?: number | null
  nb_defaites?: number | null
  nb_matchs?: number | null
  code_invitation?: string | null
  created_by?: string | null
  capitaine_id?: string | null
  created_at: string
}

/** Table `equipe_membres`. */
export type MembreEquipeRow = {
  equipe_id: string
  joueur_id: string
  role: string | null
  date_adhesion: string | null
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
  | 'defi_received'
  | 'defi_accepted'

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
  __InternalSupabase: {
    PostgrestVersion: '14.5'
  }
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
          equipe_domicile_id?: string | null
          equipe_exterieur_id?: string | null
          score_domicile?: number | null
          score_exterieur?: number | null
          created_at?: string
        }
        Update: Partial<Omit<MatchRow, 'id'>>
        Relationships: []
      }
      tournois: {
        Row: TournoiRow
        Insert: {
          id?: string
          nom: string
          date_debut?: string | null
          date_fin?: string | null
          lieu?: string | null
          type?: TournoiType | null
          statut?: string
          organisateur_id?: string | null
          created_at?: string
          nb_equipes_max?: number | null
        }
        Update: Partial<Omit<TournoiRow, 'id'>>
        Relationships: []
      }
      defis: {
        Row: DefiRow
        Insert: {
          id?: string
          equipe_demandeur_id: string
          equipe_receveur_id: string
          statut?: DefiStatut
          match_id?: string | null
          date_proposee?: string | null
          message?: string | null
          created_at?: string
        }
        Update: {
          statut?: DefiStatut
          match_id?: string | null
        }
        Relationships: []
      }
      tournoi_participants: {
        Row: TournoiParticipantRow
        Insert: {
          tournoi_id: string
          equipe_id: string
          points?: number
          buts_pour?: number
          buts_contre?: number
        }
        Update: Partial<Omit<TournoiParticipantRow, 'tournoi_id' | 'equipe_id'>>
        Relationships: []
      }
      match_photos: {
        Row: MatchPhotoRow
        Insert: {
          id?: string
          match_id: string
          url: string
          uploaded_by: string
          created_at?: string
        }
        Update: Partial<Omit<MatchPhotoRow, 'id'>>
        Relationships: []
      }
      teams: {
        Row: TeamRow
        Insert: {
          id?: string
          name: string
          city: string
          logo_url?: string | null
          color_primary?: string | null
          color_secondary?: string | null
          stadium?: string | null
          invite_code: string
          created_by: string
          points?: number | null
          created_at?: string
        }
        Update: Partial<Omit<TeamRow, 'id'>>
        Relationships: []
      }
      team_members: {
        Row: TeamMemberRow
        Insert: {
          id?: string
          team_id: string
          profile_id: string
          role?: string | null
          joined_at?: string
        }
        Update: Partial<Omit<TeamMemberRow, 'id'>>
        Relationships: []
      }
      equipes: {
        Row: EquipeRow
        Insert: {
          id?: string
          nom: string
          ville?: string | null
          logo_url?: string | null
          couleur_principale?: string | null
          couleur_secondaire?: string | null
          stade?: string | null
          nb_victoires?: number | null
          nb_defaites?: number | null
          nb_matchs?: number | null
          code_invitation?: string | null
          created_by?: string | null
          capitaine_id?: string | null
          created_at?: string
        }
        Update: Partial<Omit<EquipeRow, 'id'>>
        Relationships: []
      }
      equipe_membres: {
        Row: MembreEquipeRow
        Insert: {
          equipe_id: string
          joueur_id: string
          role?: string | null
          date_adhesion?: string | null
        }
        Update: Partial<MembreEquipeRow>
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
    Views: {
      [_ in never]: never
    }
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
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
