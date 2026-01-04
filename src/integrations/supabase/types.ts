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
      account_holdings: {
        Row: {
          bank_account_id: string
          created_at: string
          id: string
          quantity: number
          symbol: string
          user_id: string
        }
        Insert: {
          bank_account_id: string
          created_at?: string
          id?: string
          quantity?: number
          symbol: string
          user_id: string
        }
        Update: {
          bank_account_id?: string
          created_at?: string
          id?: string
          quantity?: number
          symbol?: string
          user_id?: string
        }
        Relationships: []
      }
      asset_prices: {
        Row: {
          close_price: number
          created_at: string
          high_price: number | null
          id: string
          low_price: number | null
          open_price: number | null
          price_date: string
          symbol: string
        }
        Insert: {
          close_price: number
          created_at?: string
          high_price?: number | null
          id?: string
          low_price?: number | null
          open_price?: number | null
          price_date: string
          symbol: string
        }
        Update: {
          close_price?: number
          created_at?: string
          high_price?: number | null
          id?: string
          low_price?: number | null
          open_price?: number | null
          price_date?: string
          symbol?: string
        }
        Relationships: []
      }
      asset_transactions: {
        Row: {
          asset_type: string | null
          category_id: string | null
          created_at: string
          dca_portfolio_id: string | null
          id: string
          notes: string | null
          price_eur: number
          quantity: number
          side: string
          symbol: string
          transaction_date: string
          user_id: string
          value_date: string | null
        }
        Insert: {
          asset_type?: string | null
          category_id?: string | null
          created_at?: string
          dca_portfolio_id?: string | null
          id?: string
          notes?: string | null
          price_eur: number
          quantity: number
          side: string
          symbol: string
          transaction_date?: string
          user_id: string
          value_date?: string | null
        }
        Update: {
          asset_type?: string | null
          category_id?: string | null
          created_at?: string
          dca_portfolio_id?: string | null
          id?: string
          notes?: string | null
          price_eur?: number
          quantity?: number
          side?: string
          symbol?: string
          transaction_date?: string
          user_id?: string
          value_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "asset_transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_transactions_dca_portfolio_id_fkey"
            columns: ["dca_portfolio_id"]
            isOneToOne: false
            referencedRelation: "dca_portfolios"
            referencedColumns: ["id"]
          },
        ]
      }
      balance_snapshots: {
        Row: {
          balance: number
          bank_account_id: string
          created_at: string
          id: string
          snapshot_date: string
          user_id: string
        }
        Insert: {
          balance: number
          bank_account_id: string
          created_at?: string
          id?: string
          snapshot_date?: string
          user_id: string
        }
        Update: {
          balance?: number
          bank_account_id?: string
          created_at?: string
          id?: string
          snapshot_date?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "balance_snapshots_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_accounts: {
        Row: {
          category_id: string | null
          created_at: string | null
          currency: string
          id: string
          initial_balance: number
          is_archived: boolean
          name: string
          sort_order: number | null
          user_id: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string | null
          currency?: string
          id?: string
          initial_balance?: number
          is_archived?: boolean
          name: string
          sort_order?: number | null
          user_id: string
        }
        Update: {
          category_id?: string | null
          created_at?: string | null
          currency?: string
          id?: string
          initial_balance?: number
          is_archived?: boolean
          name?: string
          sort_order?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bank_accounts_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_transactions: {
        Row: {
          amount_eur: number
          category: string | null
          created_at: string
          description: string | null
          id: string
          transaction_date: string
          type: string
          user_id: string
        }
        Insert: {
          amount_eur: number
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          transaction_date?: string
          type: string
          user_id: string
        }
        Update: {
          amount_eur?: number
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          transaction_date?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string | null
          id: string
          is_archived: boolean
          name: string
          scope: string
          sort_order: number | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_archived?: boolean
          name: string
          scope: string
          sort_order?: number | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_archived?: boolean
          name?: string
          scope?: string
          sort_order?: number | null
          user_id?: string
        }
        Relationships: []
      }
      crypto_assets: {
        Row: {
          asset_type: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          symbol: string
          user_id: string
        }
        Insert: {
          asset_type?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          symbol: string
          user_id: string
        }
        Update: {
          asset_type?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          symbol?: string
          user_id?: string
        }
        Relationships: []
      }
      dca_portfolios: {
        Row: {
          asset_type: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          symbol: string
          user_id: string
        }
        Insert: {
          asset_type?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          symbol: string
          user_id: string
        }
        Update: {
          asset_type?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          symbol?: string
          user_id?: string
        }
        Relationships: []
      }
      fx_rates: {
        Row: {
          as_of: string
          id: string
          pair: string
          rate: number
          source: string
        }
        Insert: {
          as_of: string
          id?: string
          pair: string
          rate: number
          source?: string
        }
        Update: {
          as_of?: string
          id?: string
          pair?: string
          rate?: number
          source?: string
        }
        Relationships: []
      }
      loans: {
        Row: {
          bank_account_id: string | null
          category_id: string | null
          created_at: string | null
          currency: string
          end_date: string
          id: string
          is_active: boolean
          monthly_payment: number
          name: string
          next_payment_date: string
          notes: string | null
          paid_installments: number
          start_date: string
          total_amount: number
          total_installments: number
          user_id: string
        }
        Insert: {
          bank_account_id?: string | null
          category_id?: string | null
          created_at?: string | null
          currency?: string
          end_date: string
          id?: string
          is_active?: boolean
          monthly_payment: number
          name: string
          next_payment_date: string
          notes?: string | null
          paid_installments?: number
          start_date: string
          total_amount: number
          total_installments: number
          user_id: string
        }
        Update: {
          bank_account_id?: string | null
          category_id?: string | null
          created_at?: string | null
          currency?: string
          end_date?: string
          id?: string
          is_active?: boolean
          monthly_payment?: number
          name?: string
          next_payment_date?: string
          notes?: string | null
          paid_installments?: number
          start_date?: string
          total_amount?: number
          total_installments?: number
          user_id?: string
        }
        Relationships: []
      }
      recurring_confirmations: {
        Row: {
          confirmed_at: string | null
          id: string
          occurrence_date: string
          recurring_id: string
          transaction_id: string | null
          user_id: string
        }
        Insert: {
          confirmed_at?: string | null
          id?: string
          occurrence_date: string
          recurring_id: string
          transaction_id?: string | null
          user_id: string
        }
        Update: {
          confirmed_at?: string | null
          id?: string
          occurrence_date?: string
          recurring_id?: string
          transaction_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recurring_confirmations_recurring_id_fkey"
            columns: ["recurring_id"]
            isOneToOne: false
            referencedRelation: "recurring_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_confirmations_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      recurring_transactions: {
        Row: {
          amount: number
          amount_to: number | null
          bank_account_id: string | null
          cadence: string
          category_id: string | null
          created_at: string | null
          currency: string
          currency_to: string | null
          from_account_id: string | null
          id: string
          is_active: boolean
          name: string
          next_occurrence_date: string
          notes: string | null
          start_date: string
          to_account_id: string | null
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          amount_to?: number | null
          bank_account_id?: string | null
          cadence: string
          category_id?: string | null
          created_at?: string | null
          currency?: string
          currency_to?: string | null
          from_account_id?: string | null
          id?: string
          is_active?: boolean
          name: string
          next_occurrence_date: string
          notes?: string | null
          start_date: string
          to_account_id?: string | null
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          amount_to?: number | null
          bank_account_id?: string | null
          cadence?: string
          category_id?: string | null
          created_at?: string | null
          currency?: string
          currency_to?: string | null
          from_account_id?: string | null
          id?: string
          is_active?: boolean
          name?: string
          next_occurrence_date?: string
          notes?: string | null
          start_date?: string
          to_account_id?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recurring_transactions_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      settings: {
        Row: {
          base_currency: string
          created_at: string | null
          timezone: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          base_currency?: string
          created_at?: string | null
          timezone?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          base_currency?: string
          created_at?: string | null
          timezone?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      subscription_charges: {
        Row: {
          charge_date: string
          created_at: string | null
          id: string
          subscription_id: string
          transaction_id: string | null
          user_id: string
        }
        Insert: {
          charge_date: string
          created_at?: string | null
          id?: string
          subscription_id: string
          transaction_id?: string | null
          user_id: string
        }
        Update: {
          charge_date?: string
          created_at?: string | null
          id?: string
          subscription_id?: string
          transaction_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_charges_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_charges_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          amount: number
          bank_account_id: string | null
          cadence: string
          category_id: string | null
          created_at: string | null
          currency: string
          id: string
          is_active: boolean
          name: string
          next_charge_date: string
          notes: string | null
          start_date: string
          user_id: string
        }
        Insert: {
          amount: number
          bank_account_id?: string | null
          cadence: string
          category_id?: string | null
          created_at?: string | null
          currency?: string
          id?: string
          is_active?: boolean
          name: string
          next_charge_date: string
          notes?: string | null
          start_date: string
          user_id: string
        }
        Update: {
          amount?: number
          bank_account_id?: string | null
          cadence?: string
          category_id?: string | null
          created_at?: string | null
          currency?: string
          id?: string
          is_active?: boolean
          name?: string
          next_charge_date?: string
          notes?: string | null
          start_date?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          bank_account_id: string | null
          category_id: string | null
          created_at: string | null
          currency: string
          date: string
          description: string | null
          id: string
          is_validated: boolean
          type: string
          user_id: string
          value_date: string | null
        }
        Insert: {
          amount: number
          bank_account_id?: string | null
          category_id?: string | null
          created_at?: string | null
          currency?: string
          date: string
          description?: string | null
          id?: string
          is_validated?: boolean
          type: string
          user_id: string
          value_date?: string | null
        }
        Update: {
          amount?: number
          bank_account_id?: string | null
          category_id?: string | null
          created_at?: string | null
          currency?: string
          date?: string
          description?: string | null
          id?: string
          is_validated?: boolean
          type?: string
          user_id?: string
          value_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      transfers: {
        Row: {
          amount_from: number
          amount_to: number
          created_at: string | null
          currency_from: string
          currency_to: string
          date: string
          description: string | null
          from_account_id: string
          fx_rate: number | null
          id: string
          is_validated: boolean
          to_account_id: string
          user_id: string
          value_date: string | null
        }
        Insert: {
          amount_from: number
          amount_to: number
          created_at?: string | null
          currency_from: string
          currency_to: string
          date: string
          description?: string | null
          from_account_id: string
          fx_rate?: number | null
          id?: string
          is_validated?: boolean
          to_account_id: string
          user_id: string
          value_date?: string | null
        }
        Update: {
          amount_from?: number
          amount_to?: number
          created_at?: string | null
          currency_from?: string
          currency_to?: string
          date?: string
          description?: string | null
          from_account_id?: string
          fx_rate?: number | null
          id?: string
          is_validated?: boolean
          to_account_id?: string
          user_id?: string
          value_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transfers_from_account_id_fkey"
            columns: ["from_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfers_to_account_id_fkey"
            columns: ["to_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
