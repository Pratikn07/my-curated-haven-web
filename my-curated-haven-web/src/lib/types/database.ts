export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      access_entitlements: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          release_id: string
          revoked_at: string | null
          state: string
          user_id: string
          valid_from: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          release_id: string
          revoked_at?: string | null
          state?: string
          user_id: string
          valid_from?: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          release_id?: string
          revoked_at?: string | null
          state?: string
          user_id?: string
          valid_from?: string
        }
        Relationships: [
          {
            foreignKeyName: "access_entitlements_release_id_fkey"
            columns: ["release_id"]
            isOneToOne: false
            referencedRelation: "collection_releases"
            referencedColumns: ["id"]
          },
        ]
      }
      collection_recipes: {
        Row: {
          position: number
          recipe_id: string
          release_id: string
        }
        Insert: {
          position: number
          recipe_id: string
          release_id: string
        }
        Update: {
          position?: number
          recipe_id?: string
          release_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "collection_recipes_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipe_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collection_recipes_release_id_fkey"
            columns: ["release_id"]
            isOneToOne: false
            referencedRelation: "collection_releases"
            referencedColumns: ["id"]
          },
        ]
      }
      collection_releases: {
        Row: {
          collection_id: string
          created_at: string
          id: string
          sealed_at: string | null
          state: string
          version: number
        }
        Insert: {
          collection_id: string
          created_at?: string
          id?: string
          sealed_at?: string | null
          state?: string
          version: number
        }
        Update: {
          collection_id?: string
          created_at?: string
          id?: string
          sealed_at?: string | null
          state?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "collection_releases_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "recipe_collections"
            referencedColumns: ["id"]
          },
        ]
      }
      free_recipe_slots: {
        Row: {
          assigned_at: string
          recipe_id: string
          slot: number
        }
        Insert: {
          assigned_at?: string
          recipe_id: string
          slot: number
        }
        Update: {
          assigned_at?: string
          recipe_id?: string
          slot?: number
        }
        Relationships: [
          {
            foreignKeyName: "free_recipe_slots_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: true
            referencedRelation: "recipe_catalog"
            referencedColumns: ["id"]
          },
        ]
      }
      recipe_bodies: {
        Row: {
          allergen_review_state: string
          allergens: string[] | null
          content_version: number
          ingredients: Json
          instructions: Json
          recipe_id: string
          reviewed_notes: string | null
          storage_notes: string | null
          updated_at: string
          yield: string
          yield_structured: Json | null
        }
        Insert: {
          allergen_review_state?: string
          allergens?: string[] | null
          content_version?: number
          ingredients?: Json
          instructions?: Json
          recipe_id: string
          reviewed_notes?: string | null
          storage_notes?: string | null
          updated_at?: string
          yield: string
          yield_structured?: Json | null
        }
        Update: {
          allergen_review_state?: string
          allergens?: string[] | null
          content_version?: number
          ingredients?: Json
          instructions?: Json
          recipe_id?: string
          reviewed_notes?: string | null
          storage_notes?: string | null
          updated_at?: string
          yield?: string
          yield_structured?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "recipe_bodies_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: true
            referencedRelation: "recipe_catalog"
            referencedColumns: ["id"]
          },
        ]
      }
      recipe_catalog: {
        Row: {
          created_at: string
          diet_labels: string[]
          id: string
          meal_labels: string[]
          preview_image_path: string
          public_summary: string
          publication_state: string
          published_at: string | null
          slug: string
          title: string
          total_minutes: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          diet_labels?: string[]
          id?: string
          meal_labels?: string[]
          preview_image_path: string
          public_summary: string
          publication_state?: string
          published_at?: string | null
          slug: string
          title: string
          total_minutes?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          diet_labels?: string[]
          id?: string
          meal_labels?: string[]
          preview_image_path?: string
          public_summary?: string
          publication_state?: string
          published_at?: string | null
          slug?: string
          title?: string
          total_minutes?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      recipe_collections: {
        Row: {
          created_at: string
          id: string
          listing_state: string
          public_summary: string
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          listing_state?: string
          public_summary: string
          slug: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          listing_state?: string
          public_summary?: string
          slug?: string
          title?: string
          updated_at?: string
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const

