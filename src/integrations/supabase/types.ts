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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      badges: {
        Row: {
          created_at: string | null
          description: string | null
          icon: string | null
          id: string
          name: string
          requirement: Json | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          name: string
          requirement?: Json | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
          requirement?: Json | null
        }
        Relationships: []
      }
      cards: {
        Row: {
          answer: string
          bloom_level: string | null
          card_type: string
          citation: string | null
          confidence_score: number | null
          created_at: string | null
          deck_id: string
          easiness_factor: number | null
          explanation: string | null
          id: string
          interval_days: number | null
          last_reviewed_at: string | null
          next_review_at: string | null
          options: Json | null
          question: string
          review_count: number | null
          source_span: string | null
          topic: string | null
          updated_at: string | null
        }
        Insert: {
          answer: string
          bloom_level?: string | null
          card_type: string
          citation?: string | null
          confidence_score?: number | null
          created_at?: string | null
          deck_id: string
          easiness_factor?: number | null
          explanation?: string | null
          id?: string
          interval_days?: number | null
          last_reviewed_at?: string | null
          next_review_at?: string | null
          options?: Json | null
          question: string
          review_count?: number | null
          source_span?: string | null
          topic?: string | null
          updated_at?: string | null
        }
        Update: {
          answer?: string
          bloom_level?: string | null
          card_type?: string
          citation?: string | null
          confidence_score?: number | null
          created_at?: string | null
          deck_id?: string
          easiness_factor?: number | null
          explanation?: string | null
          id?: string
          interval_days?: number | null
          last_reviewed_at?: string | null
          next_review_at?: string | null
          options?: Json | null
          question?: string
          review_count?: number | null
          source_span?: string | null
          topic?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cards_deck_id_fkey"
            columns: ["deck_id"]
            isOneToOne: false
            referencedRelation: "decks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_cards_deck"
            columns: ["deck_id"]
            isOneToOne: false
            referencedRelation: "decks"
            referencedColumns: ["id"]
          },
        ]
      }
      chunks: {
        Row: {
          citation: string | null
          created_at: string | null
          id: string
          lang: string | null
          ord: number
          source_id: string
          text: string
        }
        Insert: {
          citation?: string | null
          created_at?: string | null
          id?: string
          lang?: string | null
          ord: number
          source_id: string
          text: string
        }
        Update: {
          citation?: string | null
          created_at?: string | null
          id?: string
          lang?: string | null
          ord?: number
          source_id?: string
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "chunks_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_chunks_source"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "sources"
            referencedColumns: ["id"]
          },
        ]
      }
      concepts: {
        Row: {
          correct_count: number | null
          created_at: string | null
          deck_id: string
          id: string
          last_seen_at: string | null
          mastery: number | null
          name: string
          seen_count: number | null
          user_id: string
        }
        Insert: {
          correct_count?: number | null
          created_at?: string | null
          deck_id: string
          id?: string
          last_seen_at?: string | null
          mastery?: number | null
          name: string
          seen_count?: number | null
          user_id: string
        }
        Update: {
          correct_count?: number | null
          created_at?: string | null
          deck_id?: string
          id?: string
          last_seen_at?: string | null
          mastery?: number | null
          name?: string
          seen_count?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "concepts_deck_id_fkey"
            columns: ["deck_id"]
            isOneToOne: false
            referencedRelation: "decks"
            referencedColumns: ["id"]
          },
        ]
      }
      decks: {
        Row: {
          card_count: number | null
          created_at: string | null
          description: string | null
          id: string
          language: string | null
          metadata: Json | null
          source_id: string | null
          status: string | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          card_count?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          language?: string | null
          metadata?: Json | null
          source_id?: string | null
          status?: string | null
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          card_count?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          language?: string | null
          metadata?: Json | null
          source_id?: string | null
          status?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "decks_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_decks_source"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_decks_user"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          age_group: string | null
          created_at: string | null
          daily_goal: number | null
          difficulty_preference: string | null
          display_name: string | null
          id: string
          interests: string[] | null
          learning_goals: string[] | null
          notification_enabled: boolean | null
          preferred_language: string | null
          theme_preference: string | null
          updated_at: string | null
        }
        Insert: {
          age_group?: string | null
          created_at?: string | null
          daily_goal?: number | null
          difficulty_preference?: string | null
          display_name?: string | null
          id: string
          interests?: string[] | null
          learning_goals?: string[] | null
          notification_enabled?: boolean | null
          preferred_language?: string | null
          theme_preference?: string | null
          updated_at?: string | null
        }
        Update: {
          age_group?: string | null
          created_at?: string | null
          daily_goal?: number | null
          difficulty_preference?: string | null
          display_name?: string | null
          id?: string
          interests?: string[] | null
          learning_goals?: string[] | null
          notification_enabled?: boolean | null
          preferred_language?: string | null
          theme_preference?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      reviews: {
        Row: {
          card_id: string
          created_at: string | null
          deck_id: string
          difficulty_at_attempt: number | null
          id: string
          metadata: Json | null
          response_ms: number | null
          result: string
          session_id: string | null
          time_spent_seconds: number | null
          user_id: string
        }
        Insert: {
          card_id: string
          created_at?: string | null
          deck_id: string
          difficulty_at_attempt?: number | null
          id?: string
          metadata?: Json | null
          response_ms?: number | null
          result: string
          session_id?: string | null
          time_spent_seconds?: number | null
          user_id: string
        }
        Update: {
          card_id?: string
          created_at?: string | null
          deck_id?: string
          difficulty_at_attempt?: number | null
          id?: string
          metadata?: Json | null
          response_ms?: number | null
          result?: string
          session_id?: string | null
          time_spent_seconds?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_reviews_card"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_reviews_deck"
            columns: ["deck_id"]
            isOneToOne: false
            referencedRelation: "decks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_reviews_user"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_deck_id_fkey"
            columns: ["deck_id"]
            isOneToOne: false
            referencedRelation: "decks"
            referencedColumns: ["id"]
          },
        ]
      }
      sources: {
        Row: {
          content: string | null
          created_at: string | null
          error: string | null
          file_path: string | null
          id: string
          language: string | null
          metadata: Json | null
          source_type: string
          source_url: string | null
          status: string | null
          title: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          error?: string | null
          file_path?: string | null
          id?: string
          language?: string | null
          metadata?: Json | null
          source_type: string
          source_url?: string | null
          status?: string | null
          title?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          content?: string | null
          created_at?: string | null
          error?: string | null
          file_path?: string | null
          id?: string
          language?: string | null
          metadata?: Json | null
          source_type?: string
          source_url?: string | null
          status?: string | null
          title?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_sources_user"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_badges: {
        Row: {
          badge_id: string
          earned_at: string | null
          user_id: string
        }
        Insert: {
          badge_id: string
          earned_at?: string | null
          user_id: string
        }
        Update: {
          badge_id?: string
          earned_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["id"]
          },
        ]
      }
      user_progress: {
        Row: {
          created_at: string | null
          id: string
          last_study_date: string | null
          level: number | null
          metadata: Json | null
          streak_days: number | null
          streak_vault: number | null
          total_cards_reviewed: number | null
          total_decks_completed: number | null
          tree_level: number | null
          updated_at: string | null
          xp: number | null
        }
        Insert: {
          created_at?: string | null
          id: string
          last_study_date?: string | null
          level?: number | null
          metadata?: Json | null
          streak_days?: number | null
          streak_vault?: number | null
          total_cards_reviewed?: number | null
          total_decks_completed?: number | null
          tree_level?: number | null
          updated_at?: string | null
          xp?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          last_study_date?: string | null
          level?: number | null
          metadata?: Json | null
          streak_days?: number | null
          streak_vault?: number | null
          total_cards_reviewed?: number | null
          total_decks_completed?: number | null
          tree_level?: number | null
          updated_at?: string | null
          xp?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
