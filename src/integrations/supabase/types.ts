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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      cash_game_lists: {
        Row: {
          game: string
          id: string
          list_status: string | null
          notes: string | null
          open_seats: number | null
          table_max: number | null
          updated_at: string
          wait_count: number | null
        }
        Insert: {
          game: string
          id?: string
          list_status?: string | null
          notes?: string | null
          open_seats?: number | null
          table_max?: number | null
          updated_at?: string
          wait_count?: number | null
        }
        Update: {
          game?: string
          id?: string
          list_status?: string | null
          notes?: string | null
          open_seats?: number | null
          table_max?: number | null
          updated_at?: string
          wait_count?: number | null
        }
        Relationships: []
      }
      cash_game_queue: {
        Row: {
          checkin_status: string | null
          created_at: string
          hold_expires_at: string | null
          id: string
          list_id: string
          position: number
          user_id: string
        }
        Insert: {
          checkin_status?: string | null
          created_at?: string
          hold_expires_at?: string | null
          id?: string
          list_id: string
          position: number
          user_id: string
        }
        Update: {
          checkin_status?: string | null
          created_at?: string
          hold_expires_at?: string | null
          id?: string
          list_id?: string
          position?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cash_game_queue_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "cash_game_lists"
            referencedColumns: ["id"]
          },
        ]
      }
      chip_vouchers: {
        Row: {
          amount: number
          barcode: string | null
          barcode_format: string | null
          created_at: string
          fee: number | null
          id: string
          redeem_window_end: string | null
          redeem_window_start: string | null
          status: string | null
          stripe_payment_intent_id: string | null
          user_id: string
        }
        Insert: {
          amount: number
          barcode?: string | null
          barcode_format?: string | null
          created_at?: string
          fee?: number | null
          id?: string
          redeem_window_end?: string | null
          redeem_window_start?: string | null
          status?: string | null
          stripe_payment_intent_id?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          barcode?: string | null
          barcode_format?: string | null
          created_at?: string
          fee?: number | null
          id?: string
          redeem_window_end?: string | null
          redeem_window_start?: string | null
          status?: string | null
          stripe_payment_intent_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      dining_vendors: {
        Row: {
          accepts_mobile_orders: boolean | null
          active: boolean | null
          hours: Json | null
          id: string
          location: string
          menu_url: string | null
          name: string
          pickup_counter_code: string | null
          prep_minutes: number | null
        }
        Insert: {
          accepts_mobile_orders?: boolean | null
          active?: boolean | null
          hours?: Json | null
          id?: string
          location: string
          menu_url?: string | null
          name: string
          pickup_counter_code?: string | null
          prep_minutes?: number | null
        }
        Update: {
          accepts_mobile_orders?: boolean | null
          active?: boolean | null
          hours?: Json | null
          id?: string
          location?: string
          menu_url?: string | null
          name?: string
          pickup_counter_code?: string | null
          prep_minutes?: number | null
        }
        Relationships: []
      }
      event_tickets: {
        Row: {
          amount: number
          barcode: string | null
          barcode_format: string | null
          event_id: string
          id: string
          issued_at: string
          qty: number
          status: string | null
          stripe_payment_intent_id: string | null
          user_id: string
        }
        Insert: {
          amount: number
          barcode?: string | null
          barcode_format?: string | null
          event_id: string
          id?: string
          issued_at?: string
          qty?: number
          status?: string | null
          stripe_payment_intent_id?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          barcode?: string | null
          barcode_format?: string | null
          event_id?: string
          id?: string
          issued_at?: string
          qty?: number
          status?: string | null
          stripe_payment_intent_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_tickets_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          category: string
          created_at: string
          description: string | null
          event_date: string
          event_time: string
          fee: number | null
          hero_img: string | null
          id: string
          inventory: number
          onsale: boolean | null
          price: number
          title: string
          venue: string
        }
        Insert: {
          category: string
          created_at?: string
          description?: string | null
          event_date: string
          event_time: string
          fee?: number | null
          hero_img?: string | null
          id?: string
          inventory: number
          onsale?: boolean | null
          price: number
          title: string
          venue: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          event_date?: string
          event_time?: string
          fee?: number | null
          hero_img?: string | null
          id?: string
          inventory?: number
          onsale?: boolean | null
          price?: number
          title?: string
          venue?: string
        }
        Relationships: []
      }
      map_pins: {
        Row: {
          id: string
          info: string | null
          lat: number | null
          lng: number | null
          title: string
          type: string
        }
        Insert: {
          id?: string
          info?: string | null
          lat?: number | null
          lng?: number | null
          title: string
          type: string
        }
        Update: {
          id?: string
          info?: string | null
          lat?: number | null
          lng?: number | null
          title?: string
          type?: string
        }
        Relationships: []
      }
      menu_items: {
        Row: {
          created_at: string
          description: string | null
          id: string
          image: string | null
          is_active: boolean | null
          name: string
          price: number
          tags: string[] | null
          vendor_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          image?: string | null
          is_active?: boolean | null
          name: string
          price: number
          tags?: string[] | null
          vendor_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          image?: string | null
          is_active?: boolean | null
          name?: string
          price?: number
          tags?: string[] | null
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "menu_items_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "dining_vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          id: string
          menu_item_id: string
          notes: string | null
          order_id: string
          qty: number
        }
        Insert: {
          id?: string
          menu_item_id: string
          notes?: string | null
          order_id: string
          qty?: number
        }
        Update: {
          id?: string
          menu_item_id?: string
          notes?: string | null
          order_id?: string
          qty?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          fee: number | null
          id: string
          pickup_code: string | null
          pickup_eta: string | null
          placed_at: string
          status: string | null
          stripe_payment_intent_id: string | null
          subtotal: number
          tax: number | null
          tip: number | null
          total: number
          user_id: string
          vendor_id: string
        }
        Insert: {
          fee?: number | null
          id?: string
          pickup_code?: string | null
          pickup_eta?: string | null
          placed_at?: string
          status?: string | null
          stripe_payment_intent_id?: string | null
          subtotal: number
          tax?: number | null
          tip?: number | null
          total: number
          user_id: string
          vendor_id: string
        }
        Update: {
          fee?: number | null
          id?: string
          pickup_code?: string | null
          pickup_eta?: string | null
          placed_at?: string
          status?: string | null
          stripe_payment_intent_id?: string | null
          subtotal?: number
          tax?: number | null
          tip?: number | null
          total?: number
          user_id?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "dining_vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      poker_entries: {
        Row: {
          amount: number
          barcode: string | null
          barcode_format: string | null
          id: string
          issued_at: string
          status: string | null
          stripe_payment_intent_id: string | null
          tourney_id: string
          user_id: string
          will_call_window_end: string | null
          will_call_window_start: string | null
        }
        Insert: {
          amount: number
          barcode?: string | null
          barcode_format?: string | null
          id?: string
          issued_at?: string
          status?: string | null
          stripe_payment_intent_id?: string | null
          tourney_id: string
          user_id: string
          will_call_window_end?: string | null
          will_call_window_start?: string | null
        }
        Update: {
          amount?: number
          barcode?: string | null
          barcode_format?: string | null
          id?: string
          issued_at?: string
          status?: string | null
          stripe_payment_intent_id?: string | null
          tourney_id?: string
          user_id?: string
          will_call_window_end?: string | null
          will_call_window_start?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "poker_entries_tourney_id_fkey"
            columns: ["tourney_id"]
            isOneToOne: false
            referencedRelation: "poker_tourneys"
            referencedColumns: ["id"]
          },
        ]
      }
      poker_tourneys: {
        Row: {
          active: boolean | null
          buyin: number
          created_at: string
          description: string | null
          fee: number | null
          id: string
          late_reg_until: string | null
          name: string
          seats_left: number
          seats_total: number
          structure_pdf: string | null
          tournament_date: string
          tournament_time: string
        }
        Insert: {
          active?: boolean | null
          buyin: number
          created_at?: string
          description?: string | null
          fee?: number | null
          id?: string
          late_reg_until?: string | null
          name: string
          seats_left: number
          seats_total: number
          structure_pdf?: string | null
          tournament_date: string
          tournament_time: string
        }
        Update: {
          active?: boolean | null
          buyin?: number
          created_at?: string
          description?: string | null
          fee?: number | null
          id?: string
          late_reg_until?: string | null
          name?: string
          seats_left?: number
          seats_total?: number
          structure_pdf?: string | null
          tournament_date?: string
          tournament_time?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          age_verified: boolean | null
          created_at: string
          dob: string | null
          id: string
          kyc_status: string | null
          name: string | null
          phone: string | null
          points: number | null
          tier: string | null
          updated_at: string
        }
        Insert: {
          age_verified?: boolean | null
          created_at?: string
          dob?: string | null
          id: string
          kyc_status?: string | null
          name?: string | null
          phone?: string | null
          points?: number | null
          tier?: string | null
          updated_at?: string
        }
        Update: {
          age_verified?: boolean | null
          created_at?: string
          dob?: string | null
          id?: string
          kyc_status?: string | null
          name?: string | null
          phone?: string | null
          points?: number | null
          tier?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      promos: {
        Row: {
          created_at: string
          details: string | null
          end_date: string
          id: string
          image: string | null
          is_active: boolean | null
          segments: string[] | null
          start_date: string
          terms_url: string | null
          title: string
        }
        Insert: {
          created_at?: string
          details?: string | null
          end_date: string
          id?: string
          image?: string | null
          is_active?: boolean | null
          segments?: string[] | null
          start_date: string
          terms_url?: string | null
          title: string
        }
        Update: {
          created_at?: string
          details?: string | null
          end_date?: string
          id?: string
          image?: string | null
          is_active?: boolean | null
          segments?: string[] | null
          start_date?: string
          terms_url?: string | null
          title?: string
        }
        Relationships: []
      }
      settings: {
        Row: {
          cash_game_hold_minutes: number | null
          hotline_text: string | null
          id: string
          max_chip_voucher: number | null
          min_chip_voucher: number | null
          privacy_url: string | null
          rg_url: string | null
          support_phone: string | null
          terms_url: string | null
          updated_at: string
        }
        Insert: {
          cash_game_hold_minutes?: number | null
          hotline_text?: string | null
          id?: string
          max_chip_voucher?: number | null
          min_chip_voucher?: number | null
          privacy_url?: string | null
          rg_url?: string | null
          support_phone?: string | null
          terms_url?: string | null
          updated_at?: string
        }
        Update: {
          cash_game_hold_minutes?: number | null
          hotline_text?: string | null
          id?: string
          max_chip_voucher?: number | null
          min_chip_voucher?: number | null
          privacy_url?: string | null
          rg_url?: string | null
          support_phone?: string | null
          terms_url?: string | null
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
  public: {
    Enums: {},
  },
} as const
