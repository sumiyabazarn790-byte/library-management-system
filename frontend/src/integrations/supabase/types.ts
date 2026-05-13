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
      books: {
        Row: {
          author: string
          available_copies: number
          borrow_currency: string
          borrow_price: number
          cover_url: string | null
          created_at: string
          description: string
          embedding: string | null
          genre: string
          id: string
          is_public_readable: boolean
          language: string
          reading_content: string[] | null
          title: string
          total_copies: number
        }
        Insert: {
          author: string
          available_copies?: number
          borrow_currency?: string
          borrow_price?: number
          cover_url?: string | null
          created_at?: string
          description?: string
          embedding?: string | null
          genre: string
          id?: string
          is_public_readable?: boolean
          language?: string
          reading_content?: string[] | null
          title: string
          total_copies?: number
        }
        Update: {
          author?: string
          available_copies?: number
          borrow_currency?: string
          borrow_price?: number
          cover_url?: string | null
          created_at?: string
          description?: string
          embedding?: string | null
          genre?: string
          id?: string
          is_public_readable?: boolean
          language?: string
          reading_content?: string[] | null
          title?: string
          total_copies?: number
        }
        Relationships: []
      }
      borrow_payments: {
        Row: {
          amount: number
          book_id: string
          created_at: string
          currency: string
          id: string
          loan_id: string
          user_id: string
        }
        Insert: {
          amount: number
          book_id: string
          created_at?: string
          currency?: string
          id?: string
          loan_id: string
          user_id: string
        }
        Update: {
          amount?: number
          book_id?: string
          created_at?: string
          currency?: string
          id?: string
          loan_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "borrow_payments_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "borrow_payments_loan_id_fkey"
            columns: ["loan_id"]
            isOneToOne: false
            referencedRelation: "loans"
            referencedColumns: ["id"]
          },
        ]
      }
      loans: {
        Row: {
          book_id: string
          due_date: string
          id: string
          loaned_at: string
          returned_at: string | null
          status: Database["public"]["Enums"]["loan_status"]
          user_id: string
        }
        Insert: {
          book_id: string
          due_date?: string
          id?: string
          loaned_at?: string
          returned_at?: string | null
          status?: Database["public"]["Enums"]["loan_status"]
          user_id: string
        }
        Update: {
          book_id?: string
          due_date?: string
          id?: string
          loaned_at?: string
          returned_at?: string | null
          status?: Database["public"]["Enums"]["loan_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "loans_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
        ]
      }
      newsletter_subscribers: {
        Row: {
          created_at: string
          email: string
          id: string
          source: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          source?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          source?: string | null
        }
        Relationships: []
      }
      sale_listings: {
        Row: {
          book_id: string
          created_at: string
          currency: string
          id: string
          note: string | null
          price: number
          status: Database["public"]["Enums"]["sale_listing_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          book_id: string
          created_at?: string
          currency?: string
          id?: string
          note?: string | null
          price: number
          status?: Database["public"]["Enums"]["sale_listing_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          book_id?: string
          created_at?: string
          currency?: string
          id?: string
          note?: string | null
          price?: number
          status?: Database["public"]["Enums"]["sale_listing_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sale_listings_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_books: {
        Row: {
          book_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          book_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          book_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_books_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          preferred_genres: string[] | null
          role: Database["public"]["Enums"]["profile_role"]
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          preferred_genres?: string[] | null
          role?: Database["public"]["Enums"]["profile_role"]
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          preferred_genres?: string[] | null
          role?: Database["public"]["Enums"]["profile_role"]
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_update_loan_status: {
        Args: {
          p_loan_id: string
          p_next_status: Database["public"]["Enums"]["loan_status"]
        }
        Returns: {
          book_id: string
          due_date: string
          id: string
          loaned_at: string
          returned_at: string | null
          status: Database["public"]["Enums"]["loan_status"]
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "loans"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      borrow_book: {
        Args: { p_book_id: string }
        Returns: {
          book_id: string
          due_date: string
          id: string
          loaned_at: string
          returned_at: string | null
          status: Database["public"]["Enums"]["loan_status"]
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "loans"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      pay_and_borrow_book: {
        Args: { p_book_id: string }
        Returns: {
          book_id: string
          due_date: string
          id: string
          loaned_at: string
          returned_at: string | null
          status: Database["public"]["Enums"]["loan_status"]
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "loans"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      match_books: {
        Args: { match_count?: number; query_embedding: string }
        Returns: {
          author: string
          available_copies: number
          cover_url: string
          description: string
          genre: string
          id: string
          language: string
          similarity: number
          title: string
          total_copies: number
        }[]
      }
      request_book: {
        Args: { p_book_id: string }
        Returns: {
          book_id: string
          due_date: string
          id: string
          loaned_at: string
          returned_at: string | null
          status: Database["public"]["Enums"]["loan_status"]
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "loans"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      sell_book: {
        Args: { p_book_id: string; p_note?: string; p_price: number }
        Returns: {
          book_id: string
          created_at: string
          currency: string
          id: string
          note: string | null
          price: number
          status: Database["public"]["Enums"]["sale_listing_status"]
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "sale_listings"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      return_book: {
        Args: { p_loan_id: string }
        Returns: {
          book_id: string
          due_date: string
          id: string
          loaned_at: string
          returned_at: string | null
          status: Database["public"]["Enums"]["loan_status"]
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "loans"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      search_books_fuzzy: {
        Args: { lim?: number; q: string }
        Returns: {
          author: string
          available_copies: number
          borrow_currency: string
          borrow_price: number
          cover_url: string | null
          created_at: string
          description: string
          embedding: string | null
          genre: string
          id: string
          is_public_readable: boolean
          language: string
          reading_content: string[] | null
          title: string
          total_copies: number
        }[]
        SetofOptions: {
          from: "*"
          to: "books"
          isOneToOne: false
          isSetofReturn: true
        }
      }
    }
    Enums: {
      loan_status: "requested" | "active" | "returned" | "cancelled"
      profile_role: "member" | "admin"
      sale_listing_status: "active" | "sold" | "cancelled"
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
      loan_status: ["requested", "active", "returned", "cancelled"],
      profile_role: ["member", "admin"],
      sale_listing_status: ["active", "sold", "cancelled"],
    },
  },
} as const
