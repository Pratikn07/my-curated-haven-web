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
      articles: {
        Row: {
          age_max_days: number | null
          age_min_days: number | null
          body_md: string
          created_at: string | null
          id: string
          last_reviewed_at: string | null
          locale: string
          reviewer: string | null
          slug: string
          tags: string[] | null
          title: string
          updated_at: string | null
        }
        Insert: {
          age_max_days?: number | null
          age_min_days?: number | null
          body_md: string
          created_at?: string | null
          id?: string
          last_reviewed_at?: string | null
          locale?: string
          reviewer?: string | null
          slug: string
          tags?: string[] | null
          title: string
          updated_at?: string | null
        }
        Update: {
          age_max_days?: number | null
          age_min_days?: number | null
          body_md?: string
          created_at?: string | null
          id?: string
          last_reviewed_at?: string | null
          locale?: string
          reviewer?: string | null
          slug?: string
          tags?: string[] | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          created_at: string | null
          id: string
          is_from_user: boolean
          message: string
          message_type: string | null
          response: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_from_user?: boolean
          message: string
          message_type?: string | null
          response?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_from_user?: boolean
          message?: string
          message_type?: string | null
          response?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      children: {
        Row: {
          birth_date: string | null
          created_at: string | null
          developmental_stage: string | null
          gender: Database["public"]["Enums"]["gender"] | null
          id: string
          last_milestone_check: string | null
          name: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          birth_date?: string | null
          created_at?: string | null
          developmental_stage?: string | null
          gender?: Database["public"]["Enums"]["gender"] | null
          id?: string
          last_milestone_check?: string | null
          name: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          birth_date?: string | null
          created_at?: string | null
          developmental_stage?: string | null
          gender?: Database["public"]["Enums"]["gender"] | null
          id?: string
          last_milestone_check?: string | null
          name?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "children_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
      conversation_summaries: {
        Row: {
          child_id: string | null
          created_at: string | null
          id: string
          key_insights: string[] | null
          period_end: string
          period_start: string
          summary_period: string
          topics: Json | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          child_id?: string | null
          created_at?: string | null
          id?: string
          key_insights?: string[] | null
          period_end: string
          period_start: string
          summary_period: string
          topics?: Json | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          child_id?: string | null
          created_at?: string | null
          id?: string
          key_insights?: string[] | null
          period_end?: string
          period_start?: string
          summary_period?: string
          topics?: Json | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_summaries_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_summaries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_tips: {
        Row: {
          category: string
          child_age_months: number | null
          created_at: string | null
          description: string
          id: string
          is_viewed: boolean | null
          parenting_stage: Database["public"]["Enums"]["parenting_stage"]
          quick_tips: string[] | null
          tip_date: string
          title: string
          user_id: string | null
          viewed_at: string | null
        }
        Insert: {
          category: string
          child_age_months?: number | null
          created_at?: string | null
          description: string
          id?: string
          is_viewed?: boolean | null
          parenting_stage: Database["public"]["Enums"]["parenting_stage"]
          quick_tips?: string[] | null
          tip_date: string
          title: string
          user_id?: string | null
          viewed_at?: string | null
        }
        Update: {
          category?: string
          child_age_months?: number | null
          created_at?: string | null
          description?: string
          id?: string
          is_viewed?: boolean | null
          parenting_stage?: Database["public"]["Enums"]["parenting_stage"]
          quick_tips?: string[] | null
          tip_date?: string
          title?: string
          user_id?: string | null
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_tips_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
      milestone_templates: {
        Row: {
          age_max_months: number
          age_min_months: number
          category: Database["public"]["Enums"]["milestone_type"]
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          sort_order: number | null
          title: string
        }
        Insert: {
          age_max_months: number
          age_min_months: number
          category: Database["public"]["Enums"]["milestone_type"]
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          sort_order?: number | null
          title: string
        }
        Update: {
          age_max_months?: number
          age_min_months?: number
          category?: Database["public"]["Enums"]["milestone_type"]
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          sort_order?: number | null
          title?: string
        }
        Relationships: []
      }
      milestones: {
        Row: {
          achieved_at: string | null
          child_id: string | null
          created_at: string | null
          description: string | null
          id: string
          milestone_type: Database["public"]["Enums"]["milestone_type"]
          title: string
          updated_at: string | null
        }
        Insert: {
          achieved_at?: string | null
          child_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          milestone_type: Database["public"]["Enums"]["milestone_type"]
          title: string
          updated_at?: string | null
        }
        Update: {
          achieved_at?: string | null
          child_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          milestone_type?: Database["public"]["Enums"]["milestone_type"]
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "milestones_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
        ]
      }
      product_mentions_log: {
        Row: {
          had_affiliate: boolean | null
          id: string
          mentioned_at: string | null
          product_name: string
          session_id: string | null
          user_id: string | null
        }
        Insert: {
          had_affiliate?: boolean | null
          id?: string
          mentioned_at?: string | null
          product_name: string
          session_id?: string | null
          user_id?: string | null
        }
        Update: {
          had_affiliate?: boolean | null
          id?: string
          mentioned_at?: string | null
          product_name?: string
          session_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string
          feeding_preference:
            | Database["public"]["Enums"]["feeding_preference"]
            | null
          has_completed_onboarding: boolean | null
          id: string
          name: string
          parenting_stage: Database["public"]["Enums"]["parenting_stage"] | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email: string
          feeding_preference?:
            | Database["public"]["Enums"]["feeding_preference"]
            | null
          has_completed_onboarding?: boolean | null
          id: string
          name: string
          parenting_stage?:
            | Database["public"]["Enums"]["parenting_stage"]
            | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string
          feeding_preference?:
            | Database["public"]["Enums"]["feeding_preference"]
            | null
          has_completed_onboarding?: boolean | null
          id?: string
          name?: string
          parenting_stage?:
            | Database["public"]["Enums"]["parenting_stage"]
            | null
          updated_at?: string | null
        }
        Relationships: []
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
      recipe_user_preferences: {
        Row: {
          common_substitutes_used: Json | null
          cooking_skill_level: string | null
          created_at: string | null
          cuisine_preference: string | null
          id: string
          profile_id: string
          updated_at: string | null
        }
        Insert: {
          common_substitutes_used?: Json | null
          cooking_skill_level?: string | null
          created_at?: string | null
          cuisine_preference?: string | null
          id?: string
          profile_id: string
          updated_at?: string | null
        }
        Update: {
          common_substitutes_used?: Json | null
          cooking_skill_level?: string | null
          created_at?: string | null
          cuisine_preference?: string | null
          id?: string
          profile_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recipe_user_preferences_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      recipes: {
        Row: {
          age_range_max: number
          age_range_min: number
          allergens: string[] | null
          calories: number | null
          created_at: string | null
          cuisine: string | null
          description: string | null
          dietary_tags: string[] | null
          difficulty: string | null
          feeding_types: string[]
          id: string
          image_description: string | null
          image_url: string | null
          ingredients: Json
          instructions: Json
          kitchen_style_tags: string[] | null
          meal_types: string[] | null
          rating: number | null
          servings: number | null
          storage: string | null
          time_minutes: number | null
          tips: string[] | null
          title: string
          updated_at: string | null
        }
        Insert: {
          age_range_max?: number
          age_range_min?: number
          allergens?: string[] | null
          calories?: number | null
          created_at?: string | null
          cuisine?: string | null
          description?: string | null
          dietary_tags?: string[] | null
          difficulty?: string | null
          feeding_types?: string[]
          id?: string
          image_description?: string | null
          image_url?: string | null
          ingredients?: Json
          instructions?: Json
          kitchen_style_tags?: string[] | null
          meal_types?: string[] | null
          rating?: number | null
          servings?: number | null
          storage?: string | null
          time_minutes?: number | null
          tips?: string[] | null
          title: string
          updated_at?: string | null
        }
        Update: {
          age_range_max?: number
          age_range_min?: number
          allergens?: string[] | null
          calories?: number | null
          created_at?: string | null
          cuisine?: string | null
          description?: string | null
          dietary_tags?: string[] | null
          difficulty?: string | null
          feeding_types?: string[]
          id?: string
          image_description?: string | null
          image_url?: string | null
          ingredients?: Json
          instructions?: Json
          kitchen_style_tags?: string[] | null
          meal_types?: string[] | null
          rating?: number | null
          servings?: number | null
          storage?: string | null
          time_minutes?: number | null
          tips?: string[] | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      resources: {
        Row: {
          category: string | null
          content: string | null
          created_at: string | null
          description: string | null
          id: string
          image_url: string | null
          is_featured: boolean | null
          parenting_stages:
            | Database["public"]["Enums"]["parenting_stage"][]
            | null
          tags: string[] | null
          title: string
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          content?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_featured?: boolean | null
          parenting_stages?:
            | Database["public"]["Enums"]["parenting_stage"][]
            | null
          tags?: string[] | null
          title: string
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          content?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_featured?: boolean | null
          parenting_stages?:
            | Database["public"]["Enums"]["parenting_stage"][]
            | null
          tags?: string[] | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      saved_articles: {
        Row: {
          article_id: string
          created_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          article_id: string
          created_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          article_id?: string
          created_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_articles_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_articles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_recipes: {
        Row: {
          created_at: string | null
          id: string
          recipe_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          recipe_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          recipe_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_recipes_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipe_catalog"
            referencedColumns: ["id"]
          },
        ]
      }
      search_analytics: {
        Row: {
          created_at: string | null
          id: string
          query: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          query: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          query?: string
          user_id?: string | null
        }
        Relationships: []
      }
      shop_affiliates: {
        Row: {
          base_url: string
          commission_rate: number | null
          created_at: string | null
          id: string
          is_active: boolean | null
          logo_url: string | null
          name: string
          priority: number | null
          slug: string
          store_tag: string | null
          tag_param: string | null
          updated_at: string | null
        }
        Insert: {
          base_url: string
          commission_rate?: number | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name: string
          priority?: number | null
          slug: string
          store_tag?: string | null
          tag_param?: string | null
          updated_at?: string | null
        }
        Update: {
          base_url?: string
          commission_rate?: number | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name?: string
          priority?: number | null
          slug?: string
          store_tag?: string | null
          tag_param?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      shop_categories: {
        Row: {
          created_at: string | null
          description: string | null
          emoji: string
          id: string
          is_active: boolean | null
          name: string
          slug: string
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          emoji?: string
          id?: string
          is_active?: boolean | null
          name: string
          slug: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          emoji?: string
          id?: string
          is_active?: boolean | null
          name?: string
          slug?: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      shop_clicks: {
        Row: {
          affiliate_id: string | null
          clicked_at: string | null
          id: string
          product_id: string
          section_type:
            | Database["public"]["Enums"]["recommendation_section"]
            | null
          session_id: string | null
          source: string | null
          user_id: string | null
        }
        Insert: {
          affiliate_id?: string | null
          clicked_at?: string | null
          id?: string
          product_id: string
          section_type?:
            | Database["public"]["Enums"]["recommendation_section"]
            | null
          session_id?: string | null
          source?: string | null
          user_id?: string | null
        }
        Update: {
          affiliate_id?: string | null
          clicked_at?: string | null
          id?: string
          product_id?: string
          section_type?:
            | Database["public"]["Enums"]["recommendation_section"]
            | null
          session_id?: string | null
          source?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shop_clicks_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "shop_affiliates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_clicks_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "shop_products"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_product_affiliates: {
        Row: {
          affiliate_id: string
          affiliate_product_id: string | null
          affiliate_url: string
          created_at: string | null
          id: string
          is_available: boolean | null
          is_primary: boolean | null
          last_checked_at: string | null
          price: number | null
          product_id: string
          updated_at: string | null
        }
        Insert: {
          affiliate_id: string
          affiliate_product_id?: string | null
          affiliate_url: string
          created_at?: string | null
          id?: string
          is_available?: boolean | null
          is_primary?: boolean | null
          last_checked_at?: string | null
          price?: number | null
          product_id: string
          updated_at?: string | null
        }
        Update: {
          affiliate_id?: string
          affiliate_product_id?: string | null
          affiliate_url?: string
          created_at?: string | null
          id?: string
          is_available?: boolean | null
          is_primary?: boolean | null
          last_checked_at?: string | null
          price?: number | null
          product_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shop_product_affiliates_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "shop_affiliates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_product_affiliates_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "shop_products"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_products: {
        Row: {
          age_range_max: number | null
          age_range_min: number | null
          category_id: string | null
          category_slug: string | null
          click_count: number | null
          created_at: string | null
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          is_featured: boolean | null
          name: string
          name_variants: string[] | null
          original_price: number | null
          price: number | null
          rating: number | null
          review_count: number | null
          tags: string[] | null
          updated_at: string | null
        }
        Insert: {
          age_range_max?: number | null
          age_range_min?: number | null
          category_id?: string | null
          category_slug?: string | null
          click_count?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_featured?: boolean | null
          name: string
          name_variants?: string[] | null
          original_price?: number | null
          price?: number | null
          rating?: number | null
          review_count?: number | null
          tags?: string[] | null
          updated_at?: string | null
        }
        Update: {
          age_range_max?: number | null
          age_range_min?: number | null
          category_id?: string | null
          category_slug?: string | null
          click_count?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_featured?: boolean | null
          name?: string
          name_variants?: string[] | null
          original_price?: number | null
          price?: number | null
          rating?: number | null
          review_count?: number | null
          tags?: string[] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shop_products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "shop_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_user_recommendations: {
        Row: {
          context: Json | null
          created_at: string | null
          expires_at: string
          id: string
          product_ids: string[]
          section_type: Database["public"]["Enums"]["recommendation_section"]
          updated_at: string | null
          user_id: string
        }
        Insert: {
          context?: Json | null
          created_at?: string | null
          expires_at: string
          id?: string
          product_ids: string[]
          section_type: Database["public"]["Enums"]["recommendation_section"]
          updated_at?: string | null
          user_id: string
        }
        Update: {
          context?: Json | null
          created_at?: string | null
          expires_at?: string
          id?: string
          product_ids?: string[]
          section_type?: Database["public"]["Enums"]["recommendation_section"]
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      shop_user_saved_products: {
        Row: {
          id: string
          product_id: string
          saved_at: string
          user_id: string
        }
        Insert: {
          id?: string
          product_id: string
          saved_at?: string
          user_id: string
        }
        Update: {
          id?: string
          product_id?: string
          saved_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shop_user_saved_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "shop_products"
            referencedColumns: ["id"]
          },
        ]
      }
      user_activity_log: {
        Row: {
          activity_type: Database["public"]["Enums"]["activity_type"]
          created_at: string | null
          id: string
          metadata: Json | null
          milestone_id: string | null
          resource_id: string | null
          user_id: string | null
        }
        Insert: {
          activity_type: Database["public"]["Enums"]["activity_type"]
          created_at?: string | null
          id?: string
          metadata?: Json | null
          milestone_id?: string | null
          resource_id?: string | null
          user_id?: string | null
        }
        Update: {
          activity_type?: Database["public"]["Enums"]["activity_type"]
          created_at?: string | null
          id?: string
          metadata?: Json | null
          milestone_id?: string | null
          resource_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_activity_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_milestone_progress: {
        Row: {
          child_id: string | null
          completed_at: string | null
          created_at: string | null
          id: string
          is_completed: boolean | null
          milestone_template_id: string | null
          notes: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          child_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          is_completed?: boolean | null
          milestone_template_id?: string | null
          notes?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          child_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          is_completed?: boolean | null
          milestone_template_id?: string | null
          notes?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_milestone_progress_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_milestone_progress_milestone_template_id_fkey"
            columns: ["milestone_template_id"]
            isOneToOne: false
            referencedRelation: "milestone_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_milestone_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_progress_stats: {
        Row: {
          content_saved: number | null
          created_at: string | null
          id: string
          milestones_completed: number | null
          questions_asked: number | null
          resources_viewed: number | null
          search_queries: number | null
          tips_received: number | null
          updated_at: string | null
          user_id: string | null
          week_start_date: string
        }
        Insert: {
          content_saved?: number | null
          created_at?: string | null
          id?: string
          milestones_completed?: number | null
          questions_asked?: number | null
          resources_viewed?: number | null
          search_queries?: number | null
          tips_received?: number | null
          updated_at?: string | null
          user_id?: string | null
          week_start_date: string
        }
        Update: {
          content_saved?: number | null
          created_at?: string | null
          id?: string
          milestones_completed?: number | null
          questions_asked?: number | null
          resources_viewed?: number | null
          search_queries?: number | null
          tips_received?: number | null
          updated_at?: string | null
          user_id?: string | null
          week_start_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_progress_stats_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      increment_shop_click: {
        Args: { product_id_input: string }
        Returns: undefined
      }
      search_shop_products: {
        Args: { query_text: string; result_limit?: number }
        Returns: {
          product_id: string
          relevance: number
        }[]
      }
    }
    Enums: {
      activity_type:
        | "resource_viewed"
        | "resource_saved"
        | "resource_shared"
        | "milestone_completed"
        | "milestone_uncompleted"
        | "question_asked"
        | "tip_viewed"
        | "search_performed"
        | "category_filtered"
      feeding_preference: "breastfeeding" | "formula" | "mixed"
      gender: "male" | "female" | "other"
      milestone_type: "physical" | "cognitive" | "social" | "emotional"
      parenting_stage:
        | "expecting"
        | "newborn"
        | "infant"
        | "toddler"
        | "preschool"
        | "school"
      recommendation_section:
        | "for_you"
        | "chat_based"
        | "age_based"
        | "recipe_based"
        | "milestone_based"
        | "category_spotlight"
        | "top_rated"
        | "popular"
        | "search"
        | "saved"
      shop_category:
        | "feeding"
        | "sleep"
        | "safety"
        | "toys"
        | "health"
        | "clothing"
        | "travel"
        | "nursery"
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
    Enums: {
      activity_type: [
        "resource_viewed",
        "resource_saved",
        "resource_shared",
        "milestone_completed",
        "milestone_uncompleted",
        "question_asked",
        "tip_viewed",
        "search_performed",
        "category_filtered",
      ],
      feeding_preference: ["breastfeeding", "formula", "mixed"],
      gender: ["male", "female", "other"],
      milestone_type: ["physical", "cognitive", "social", "emotional"],
      parenting_stage: [
        "expecting",
        "newborn",
        "infant",
        "toddler",
        "preschool",
        "school",
      ],
      recommendation_section: [
        "for_you",
        "chat_based",
        "age_based",
        "recipe_based",
        "milestone_based",
        "category_spotlight",
        "top_rated",
        "popular",
        "search",
        "saved",
      ],
      shop_category: [
        "feeding",
        "sleep",
        "safety",
        "toys",
        "health",
        "clothing",
        "travel",
        "nursery",
      ],
    },
  },
} as const

