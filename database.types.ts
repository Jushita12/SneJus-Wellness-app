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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      activities: {
        Row: {
          calories_burned: number | null
          created_at: string | null
          duration: number | null
          id: string
          log_id: string | null
          type: string
        }
        Insert: {
          calories_burned?: number | null
          created_at?: string | null
          duration?: number | null
          id?: string
          log_id?: string | null
          type: string
        }
        Update: {
          calories_burned?: number | null
          created_at?: string | null
          duration?: number | null
          id?: string
          log_id?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "activities_log_id_fkey"
            columns: ["log_id"]
            isOneToOne: false
            referencedRelation: "daily_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      cycle_settings: {
        Row: {
          cycle_length: number | null
          is_regular: string | null
          last_period_start: string | null
          period_duration: number | null
          tracking_goal: string | null
          updated_at: string | null
          user_name: string
        }
        Insert: {
          cycle_length?: number | null
          is_regular?: string | null
          last_period_start?: string | null
          period_duration?: number | null
          tracking_goal?: string | null
          updated_at?: string | null
          user_name: string
        }
        Update: {
          cycle_length?: number | null
          is_regular?: string | null
          last_period_start?: string | null
          period_duration?: number | null
          tracking_goal?: string | null
          updated_at?: string | null
          user_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "cycle_settings_user_name_fkey"
            columns: ["user_name"]
            isOneToOne: true
            referencedRelation: "user_profiles"
            referencedColumns: ["user_name"]
          },
        ]
      }
      daily_logs: {
        Row: {
          calorie_target: number | null
          calories_burned: number | null
          calories_consumed: number | null
          created_at: string | null
          cycle_day: number | null
          date: string
          flow_level: string | null
          id: string
          is_period: boolean | null
          is_sick: boolean | null
          mood: string | null
          nsvs: string[] | null
          sick_notes: string | null
          steps: number | null
          sugar_cravings: string | null
          symptoms: string[] | null
          updated_at: string | null
          user_name: string
          waist: number | null
          water: number | null
          weight: number | null
        }
        Insert: {
          calorie_target?: number | null
          calories_burned?: number | null
          calories_consumed?: number | null
          created_at?: string | null
          cycle_day?: number | null
          date: string
          flow_level?: string | null
          id?: string
          is_period?: boolean | null
          is_sick?: boolean | null
          mood?: string | null
          nsvs?: string[] | null
          sick_notes?: string | null
          steps?: number | null
          sugar_cravings?: string | null
          symptoms?: string[] | null
          updated_at?: string | null
          user_name: string
          waist?: number | null
          water?: number | null
          weight?: number | null
        }
        Update: {
          calorie_target?: number | null
          calories_burned?: number | null
          calories_consumed?: number | null
          created_at?: string | null
          cycle_day?: number | null
          date?: string
          flow_level?: string | null
          id?: string
          is_period?: boolean | null
          is_sick?: boolean | null
          mood?: string | null
          nsvs?: string[] | null
          sick_notes?: string | null
          steps?: number | null
          sugar_cravings?: string | null
          symptoms?: string[] | null
          updated_at?: string | null
          user_name?: string
          waist?: number | null
          water?: number | null
          weight?: number | null
        }
        Relationships: []
      }
      meals: {
        Row: {
          calories: number | null
          created_at: string | null
          description: string
          has_rice: boolean | null
          id: string
          is_non_veg: boolean | null
          log_id: string | null
          type: string
        }
        Insert: {
          calories?: number | null
          created_at?: string | null
          description: string
          has_rice?: boolean | null
          id?: string
          is_non_veg?: boolean | null
          log_id?: string | null
          type: string
        }
        Update: {
          calories?: number | null
          created_at?: string | null
          description?: string
          has_rice?: boolean | null
          id?: string
          is_non_veg?: boolean | null
          log_id?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "meals_log_id_fkey"
            columns: ["log_id"]
            isOneToOne: false
            referencedRelation: "daily_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      shared_achievements: {
        Row: {
          achievement_key: string
          description: string | null
          id: string
          unlocked_at: string | null
        }
        Insert: {
          achievement_key: string
          description?: string | null
          id?: string
          unlocked_at?: string | null
        }
        Update: {
          achievement_key?: string
          description?: string | null
          id?: string
          unlocked_at?: string | null
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          created_at: string | null
          last_active_date: string | null
          meal_streak: number | null
          movement_streak: number | null
          streak_count: number | null
          unlocked_badges: string[] | null
          updated_at: string | null
          user_name: string
          water_streak: number | null
        }
        Insert: {
          created_at?: string | null
          last_active_date?: string | null
          meal_streak?: number | null
          movement_streak?: number | null
          streak_count?: number | null
          unlocked_badges?: string[] | null
          updated_at?: string | null
          user_name: string
          water_streak?: number | null
        }
        Update: {
          created_at?: string | null
          last_active_date?: string | null
          meal_streak?: number | null
          movement_streak?: number | null
          streak_count?: number | null
          unlocked_badges?: string[] | null
          updated_at?: string | null
          user_name?: string
          water_streak?: number | null
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
