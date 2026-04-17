export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      equipe_membres: {
        Row: {
          date_adhesion: string | null
          equipe_id: string
          joueur_id: string
          role: string | null
        }
        Insert: {
          date_adhesion?: string | null
          equipe_id: string
          joueur_id: string
          role?: string | null
        }
        Update: {
          date_adhesion?: string | null
          equipe_id?: string
          joueur_id?: string
          role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "equipe_membres_equipe_id_fkey"
            columns: ["equipe_id"]
            isOneToOne: false
            referencedRelation: "equipes"
            referencedColumns: ["id"]
          },
        ]
      }
      equipes: {
        Row: {
          capitaine_id: string | null
          code_invitation: string | null
          couleur_principale: string | null
          couleur_secondaire: string | null
          couleurs: string | null
          date_creation: string | null
          id: string
          logo_url: string | null
          nb_defaites: number | null
          nb_matchs: number | null
          nb_victoires: number | null
          nom: string
          stade: string | null
          ville: string | null
        }
        Insert: {
          capitaine_id?: string | null
          code_invitation?: string | null
          couleur_principale?: string | null
          couleur_secondaire?: string | null
          couleurs?: string | null
          date_creation?: string | null
          id?: string
          logo_url?: string | null
          nb_defaites?: number | null
          nb_matchs?: number | null
          nb_victoires?: number | null
          nom: string
          stade?: string | null
          ville?: string | null
        }
        Update: {
          capitaine_id?: string | null
          code_invitation?: string | null
          couleur_principale?: string | null
          couleur_secondaire?: string | null
          couleurs?: string | null
          date_creation?: string | null
          id?: string
          logo_url?: string | null
          nb_defaites?: number | null
          nb_matchs?: number | null
          nb_victoires?: number | null
          nom?: string
          stade?: string | null
          ville?: string | null
        }
        Relationships: []
      }
      invitations: {
        Row: {
          cree_le: string
          id: string
          invite_id: string
          inviteur_id: string
          match_id: string
          statut: string
        }
        Insert: {
          cree_le?: string
          id?: string
          invite_id: string
          inviteur_id: string
          match_id: string
          statut?: string
        }
        Update: {
          cree_le?: string
          id?: string
          invite_id?: string
          inviteur_id?: string
          match_id?: string
          statut?: string
        }
        Relationships: [
          {
            foreignKeyName: "invitations_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matchs"
            referencedColumns: ["id"]
          },
        ]
      }
      match_photos: {
        Row: {
          created_at: string | null
          id: string
          match_id: string | null
          uploaded_by: string | null
          url: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          match_id?: string | null
          uploaded_by?: string | null
          url: string
        }
        Update: {
          created_at?: string | null
          id?: string
          match_id?: string | null
          uploaded_by?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_photos_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matchs"
            referencedColumns: ["id"]
          },
        ]
      }
      matchs: {
        Row: {
          created_at: string
          date_match: string
          equipe_domicile_id: string | null
          equipe_exterieur_id: string | null
          heure_match: string
          id: string
          lieu: string
          lieu_lat: number | null
          lieu_lng: number | null
          nb_max: number
          niveau: string
          organisateur_id: string
          prix: number
          score_domicile: number | null
          score_exterieur: number | null
          statut: Database["public"]["Enums"]["match_statut"]
        }
        Insert: {
          created_at?: string
          date_match: string
          equipe_domicile_id?: string | null
          equipe_exterieur_id?: string | null
          heure_match: string
          id?: string
          lieu: string
          lieu_lat?: number | null
          lieu_lng?: number | null
          nb_max?: number
          niveau?: string
          organisateur_id: string
          prix?: number
          score_domicile?: number | null
          score_exterieur?: number | null
          statut?: Database["public"]["Enums"]["match_statut"]
        }
        Update: {
          created_at?: string
          date_match?: string
          equipe_domicile_id?: string | null
          equipe_exterieur_id?: string | null
          heure_match?: string
          id?: string
          lieu?: string
          lieu_lat?: number | null
          lieu_lng?: number | null
          nb_max?: number
          niveau?: string
          organisateur_id?: string
          prix?: number
          score_domicile?: number | null
          score_exterieur?: number | null
          statut?: Database["public"]["Enums"]["match_statut"]
        }
        Relationships: [
          {
            foreignKeyName: "matchs_equipe_domicile_id_fkey"
            columns: ["equipe_domicile_id"]
            isOneToOne: false
            referencedRelation: "equipes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matchs_equipe_exterieur_id_fkey"
            columns: ["equipe_exterieur_id"]
            isOneToOne: false
            referencedRelation: "equipes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matchs_organisateur_id_fkey"
            columns: ["organisateur_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages_match: {
        Row: {
          created_at: string
          id: string
          match_id: string
          message: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          match_id: string
          message: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          match_id?: string
          message?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_match_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matchs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_match_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notes: {
        Row: {
          created_at: string
          donneur_id: string
          id: string
          match_id: string
          note: number
          receveur_id: string
        }
        Insert: {
          created_at?: string
          donneur_id: string
          id?: string
          match_id: string
          note: number
          receveur_id: string
        }
        Update: {
          created_at?: string
          donneur_id?: string
          id?: string
          match_id?: string
          note?: number
          receveur_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notes_donneur_id_fkey"
            columns: ["donneur_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notes_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matchs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notes_receveur_id_fkey"
            columns: ["receveur_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          content: string
          created_at: string
          id: string
          read: boolean
          type: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          read?: boolean
          type: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          read?: boolean
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      participations: {
        Row: {
          a_ete_notee: boolean | null
          a_paye: boolean
          created_at: string
          id: string
          joueur_id: string
          match_id: string
          notes: Json | null
        }
        Insert: {
          a_ete_notee?: boolean | null
          a_paye?: boolean
          created_at?: string
          id?: string
          joueur_id: string
          match_id: string
          notes?: Json | null
        }
        Update: {
          a_ete_notee?: boolean | null
          a_paye?: boolean
          created_at?: string
          id?: string
          joueur_id?: string
          match_id?: string
          notes?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "participations_joueur_id_fkey"
            columns: ["joueur_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "participations_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matchs"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          age: number | null
          code_parrainage: string | null
          created_at: string
          email: string | null
          id: string
          nb_matchs: number
          note_moyenne: number
          parrain_id: string | null
          poids: number | null
          pseudo: string
          role: string
          taille: number | null
          updated_at: string
        }
        Insert: {
          age?: number | null
          code_parrainage?: string | null
          created_at?: string
          email?: string | null
          id: string
          nb_matchs?: number
          note_moyenne?: number
          parrain_id?: string | null
          poids?: number | null
          pseudo?: string
          role?: string
          taille?: number | null
          updated_at?: string
        }
        Update: {
          age?: number | null
          code_parrainage?: string | null
          created_at?: string
          email?: string | null
          id?: string
          nb_matchs?: number
          note_moyenne?: number
          parrain_id?: string | null
          poids?: number | null
          pseudo?: string
          role?: string
          taille?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      stats_match_joueur: {
        Row: {
          buts: number
          cartons_jaunes: number
          cartons_rouges: number
          id: string
          joueur_id: string
          match_id: string
          passes_decisives: number
        }
        Insert: {
          buts?: number
          cartons_jaunes?: number
          cartons_rouges?: number
          id?: string
          joueur_id: string
          match_id: string
          passes_decisives?: number
        }
        Update: {
          buts?: number
          cartons_jaunes?: number
          cartons_rouges?: number
          id?: string
          joueur_id?: string
          match_id?: string
          passes_decisives?: number
        }
        Relationships: [
          {
            foreignKeyName: "stats_match_joueur_joueur_id_fkey"
            columns: ["joueur_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stats_match_joueur_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matchs"
            referencedColumns: ["id"]
          },
        ]
      }
      tournoi_participants: {
        Row: {
          buts_contre: number | null
          buts_pour: number | null
          equipe_id: string
          points: number | null
          tournoi_id: string
        }
        Insert: {
          buts_contre?: number | null
          buts_pour?: number | null
          equipe_id: string
          points?: number | null
          tournoi_id: string
        }
        Update: {
          buts_contre?: number | null
          buts_pour?: number | null
          equipe_id?: string
          points?: number | null
          tournoi_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tournoi_participants_equipe_id_fkey"
            columns: ["equipe_id"]
            isOneToOne: false
            referencedRelation: "equipes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournoi_participants_tournoi_id_fkey"
            columns: ["tournoi_id"]
            isOneToOne: false
            referencedRelation: "tournois"
            referencedColumns: ["id"]
          },
        ]
      }
      tournois: {
        Row: {
          created_at: string | null
          date_debut: string | null
          date_fin: string | null
          id: string
          lieu: string | null
          nom: string
          organisateur_id: string | null
          statut: string | null
          type: string | null
        }
        Insert: {
          created_at?: string | null
          date_debut?: string | null
          date_fin?: string | null
          id?: string
          lieu?: string | null
          nom: string
          organisateur_id?: string | null
          statut?: string | null
          type?: string | null
        }
        Update: {
          created_at?: string | null
          date_debut?: string | null
          date_fin?: string | null
          id?: string
          lieu?: string | null
          nom?: string
          organisateur_id?: string | null
          statut?: string | null
          type?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      auth_is_admin: { Args: never; Returns: boolean }
      create_match: {
        Args: {
          p_date_match: string
          p_heure_match: string
          p_lieu: string
          p_lieu_lat?: number
          p_lieu_lng?: number
          p_nb_max: number
          p_niveau?: string
          p_prix: number
        }
        Returns: string
      }
      match_accepting_participants: {
        Args: { p_match_id: string }
        Returns: boolean
      }
      match_organizer_is: {
        Args: { p_match_id: string; p_user: string }
        Returns: boolean
      }
      match_select_allowed_for_user: {
        Args: { p_match_id: string; p_user: string }
        Returns: boolean
      }
      note_insert_allowed: {
        Args: { p_donneur: string; p_match_id: string; p_receveur: string }
        Returns: boolean
      }
      note_select_allowed: {
        Args: {
          p_actor: string
          p_donneur: string
          p_match_id: string
          p_receveur: string
        }
        Returns: boolean
      }
      participation_select_allowed: {
        Args: { p_actor: string; p_match_id: string; p_row_joueur_id: string }
        Returns: boolean
      }
      profile_visible_to_anon_open_matchs: {
        Args: { p_profile_id: string }
        Returns: boolean
      }
      refresh_note_moyenne: { Args: { p_user: string }; Returns: undefined }
    }
    Enums: {
      match_statut: "ouvert" | "termine"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      match_statut: ["ouvert", "termine"],
    },
  },
} as const
