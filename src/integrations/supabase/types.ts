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
      audit_logs: {
        Row: {
          created_at: string
          details: Json | null
          event_type: string
          id: string
          ip_address: string | null
          metadata: Json | null
          resource_id: string | null
          resource_type: string
          staff_id: string | null
          timestamp: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          details?: Json | null
          event_type: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          resource_id?: string | null
          resource_type: string
          staff_id?: string | null
          timestamp?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          details?: Json | null
          event_type?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          resource_id?: string | null
          resource_type?: string
          staff_id?: string | null
          timestamp?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      campaign_recipients: {
        Row: {
          campaign_id: string
          created_at: string
          error_message: string | null
          id: string
          sent_at: string | null
          status: string | null
          user_id: string
        }
        Insert: {
          campaign_id: string
          created_at?: string
          error_message?: string | null
          id?: string
          sent_at?: string | null
          status?: string | null
          user_id: string
        }
        Update: {
          campaign_id?: string
          created_at?: string
          error_message?: string | null
          id?: string
          sent_at?: string | null
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_recipients_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          channel: string
          created_at: string
          created_by: string | null
          id: string
          message: string
          scheduled_for: string | null
          segment_filter: Json | null
          sent_at: string | null
          status: string | null
          title: string
        }
        Insert: {
          channel: string
          created_at?: string
          created_by?: string | null
          id?: string
          message: string
          scheduled_for?: string | null
          segment_filter?: Json | null
          sent_at?: string | null
          status?: string | null
          title: string
        }
        Update: {
          channel?: string
          created_at?: string
          created_by?: string | null
          id?: string
          message?: string
          scheduled_for?: string | null
          segment_filter?: Json | null
          sent_at?: string | null
          status?: string | null
          title?: string
        }
        Relationships: []
      }
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
          estimated_wait_minutes: number | null
          hold_expires_at: string | null
          id: string
          list_id: string
          notified_at: string | null
          position: number
          user_id: string
        }
        Insert: {
          checkin_status?: string | null
          created_at?: string
          estimated_wait_minutes?: number | null
          hold_expires_at?: string | null
          id?: string
          list_id: string
          notified_at?: string | null
          position: number
          user_id: string
        }
        Update: {
          checkin_status?: string | null
          created_at?: string
          estimated_wait_minutes?: number | null
          hold_expires_at?: string | null
          id?: string
          list_id?: string
          notified_at?: string | null
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
          notes: string | null
          redeem_window_end: string | null
          redeem_window_start: string | null
          redeemed_at: string | null
          redeemed_by_staff_id: string | null
          status: string | null
          stripe_payment_intent_id: string | null
          tourney_id: string | null
          user_id: string
          voucher_type: string
        }
        Insert: {
          amount: number
          barcode?: string | null
          barcode_format?: string | null
          created_at?: string
          fee?: number | null
          id?: string
          notes?: string | null
          redeem_window_end?: string | null
          redeem_window_start?: string | null
          redeemed_at?: string | null
          redeemed_by_staff_id?: string | null
          status?: string | null
          stripe_payment_intent_id?: string | null
          tourney_id?: string | null
          user_id: string
          voucher_type?: string
        }
        Update: {
          amount?: number
          barcode?: string | null
          barcode_format?: string | null
          created_at?: string
          fee?: number | null
          id?: string
          notes?: string | null
          redeem_window_end?: string | null
          redeem_window_start?: string | null
          redeemed_at?: string | null
          redeemed_by_staff_id?: string | null
          status?: string | null
          stripe_payment_intent_id?: string | null
          tourney_id?: string | null
          user_id?: string
          voucher_type?: string
        }
        Relationships: []
      }
      dining_vendors: {
        Row: {
          accepts_mobile_orders: boolean | null
          active: boolean | null
          hours: Json | null
          id: string
          is_open: boolean | null
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
          is_open?: boolean | null
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
          is_open?: boolean | null
          location?: string
          menu_url?: string | null
          name?: string
          pickup_counter_code?: string | null
          prep_minutes?: number | null
        }
        Relationships: []
      }
      etg_tables: {
        Row: {
          floor_zone: string | null
          game: string
          id: string
          max_seats: number | null
          open_seats: number | null
          players: number | null
          stakes: string
          status: string | null
          updated_at: string
        }
        Insert: {
          floor_zone?: string | null
          game: string
          id: string
          max_seats?: number | null
          open_seats?: number | null
          players?: number | null
          stakes: string
          status?: string | null
          updated_at?: string
        }
        Update: {
          floor_zone?: string | null
          game?: string
          id?: string
          max_seats?: number | null
          open_seats?: number | null
          players?: number | null
          stakes?: string
          status?: string | null
          updated_at?: string
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
          redeemed_at: string | null
          redeemed_by_staff_id: string | null
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
          redeemed_at?: string | null
          redeemed_by_staff_id?: string | null
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
          redeemed_at?: string | null
          redeemed_by_staff_id?: string | null
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
      game_history: {
        Row: {
          bet_amount: number | null
          game_data: Json | null
          game_type: string
          id: string
          outcome: string | null
          payout_amount: number | null
          played_at: string
          session_id: string | null
          table_id: string | null
          user_id: string
        }
        Insert: {
          bet_amount?: number | null
          game_data?: Json | null
          game_type: string
          id?: string
          outcome?: string | null
          payout_amount?: number | null
          played_at?: string
          session_id?: string | null
          table_id?: string | null
          user_id: string
        }
        Update: {
          bet_amount?: number | null
          game_data?: Json | null
          game_type?: string
          id?: string
          outcome?: string | null
          payout_amount?: number | null
          played_at?: string
          session_id?: string | null
          table_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_history_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "player_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      jai_alai_streams: {
        Row: {
          age_limit: string | null
          created_at: string
          end_time: string | null
          hls_url: string | null
          id: string
          notes: string | null
          poster_img: string | null
          start_time: string | null
          status: string | null
          title: string
        }
        Insert: {
          age_limit?: string | null
          created_at?: string
          end_time?: string | null
          hls_url?: string | null
          id: string
          notes?: string | null
          poster_img?: string | null
          start_time?: string | null
          status?: string | null
          title: string
        }
        Update: {
          age_limit?: string | null
          created_at?: string
          end_time?: string | null
          hls_url?: string | null
          id?: string
          notes?: string | null
          poster_img?: string | null
          start_time?: string | null
          status?: string | null
          title?: string
        }
        Relationships: []
      }
      loyalty_transactions: {
        Row: {
          created_at: string
          description: string | null
          id: string
          points_change: number
          reference_id: string | null
          transaction_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          points_change: number
          reference_id?: string | null
          transaction_type: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          points_change?: number
          reference_id?: string | null
          transaction_type?: string
          user_id?: string
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
          stock_qty: number | null
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
          stock_qty?: number | null
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
          stock_qty?: number | null
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
      notifications: {
        Row: {
          created_at: string
          data: Json | null
          id: string
          message: string
          read_at: string | null
          reference_id: string | null
          reference_type: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data?: Json | null
          id?: string
          message: string
          read_at?: string | null
          reference_id?: string | null
          reference_type?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          data?: Json | null
          id?: string
          message?: string
          read_at?: string | null
          reference_id?: string | null
          reference_type?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          id: string
          menu_item_id: string
          name_cache: string | null
          notes: string | null
          order_id: string
          qty: number
        }
        Insert: {
          id?: string
          menu_item_id: string
          name_cache?: string | null
          notes?: string | null
          order_id: string
          qty?: number
        }
        Update: {
          id?: string
          menu_item_id?: string
          name_cache?: string | null
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
          dest_seat: string | null
          dest_table: string | null
          fee: number | null
          id: string
          picked_up_at: string | null
          picked_up_by_staff_id: string | null
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
          dest_seat?: string | null
          dest_table?: string | null
          fee?: number | null
          id?: string
          picked_up_at?: string | null
          picked_up_by_staff_id?: string | null
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
          dest_seat?: string | null
          dest_table?: string | null
          fee?: number | null
          id?: string
          picked_up_at?: string | null
          picked_up_by_staff_id?: string | null
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
      player_achievements: {
        Row: {
          achievement_description: string | null
          achievement_name: string
          achievement_type: string
          earned_at: string
          icon: string | null
          id: string
          metadata: Json | null
          points_awarded: number | null
          user_id: string
        }
        Insert: {
          achievement_description?: string | null
          achievement_name: string
          achievement_type: string
          earned_at?: string
          icon?: string | null
          id?: string
          metadata?: Json | null
          points_awarded?: number | null
          user_id: string
        }
        Update: {
          achievement_description?: string | null
          achievement_name?: string
          achievement_type?: string
          earned_at?: string
          icon?: string | null
          id?: string
          metadata?: Json | null
          points_awarded?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "player_achievements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      player_activity_log: {
        Row: {
          activity_data: Json | null
          activity_type: string
          created_at: string
          id: string
          location: string | null
          user_id: string | null
        }
        Insert: {
          activity_data?: Json | null
          activity_type: string
          created_at?: string
          id?: string
          location?: string | null
          user_id?: string | null
        }
        Update: {
          activity_data?: Json | null
          activity_type?: string
          created_at?: string
          id?: string
          location?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      player_preferences: {
        Row: {
          auto_rebuy: boolean | null
          created_at: string
          default_tip_percentage: number | null
          id: string
          notification_settings: Json | null
          privacy_settings: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          auto_rebuy?: boolean | null
          created_at?: string
          default_tip_percentage?: number | null
          id?: string
          notification_settings?: Json | null
          privacy_settings?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          auto_rebuy?: boolean | null
          created_at?: string
          default_tip_percentage?: number | null
          id?: string
          notification_settings?: Json | null
          privacy_settings?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      player_sessions: {
        Row: {
          created_at: string
          game_type: string
          id: string
          session_end: string | null
          session_start: string
          status: string | null
          table_id: string | null
          total_buy_in: number | null
          total_cash_out: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          game_type: string
          id?: string
          session_end?: string | null
          session_start?: string
          status?: string | null
          table_id?: string | null
          total_buy_in?: number | null
          total_cash_out?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          game_type?: string
          id?: string
          session_end?: string | null
          session_start?: string
          status?: string | null
          table_id?: string | null
          total_buy_in?: number | null
          total_cash_out?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
      poker_seats: {
        Row: {
          created_at: string | null
          id: string
          seat_no: number
          status: string | null
          table_id: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          seat_no: number
          status?: string | null
          table_id: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          seat_no?: number
          status?: string | null
          table_id?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "poker_seats_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "poker_tables"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "poker_seats_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      poker_table_players: {
        Row: {
          id: string
          joined_at: string
          seat: number
          stack: number | null
          status: string | null
          table_id: string
          user_id: string
        }
        Insert: {
          id: string
          joined_at?: string
          seat: number
          stack?: number | null
          status?: string | null
          table_id: string
          user_id: string
        }
        Update: {
          id?: string
          joined_at?: string
          seat?: number
          stack?: number | null
          status?: string | null
          table_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "poker_table_players_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "poker_tables"
            referencedColumns: ["id"]
          },
        ]
      }
      poker_tables: {
        Row: {
          floor_zone: string | null
          game: string
          id: string
          max_seats: number | null
          name: string
          open_seats: number | null
          players: number | null
          seated_player_ids: string[] | null
          stakes: string
          status: string | null
          updated_at: string
          wait_count: number | null
        }
        Insert: {
          floor_zone?: string | null
          game: string
          id: string
          max_seats?: number | null
          name: string
          open_seats?: number | null
          players?: number | null
          seated_player_ids?: string[] | null
          stakes: string
          status?: string | null
          updated_at?: string
          wait_count?: number | null
        }
        Update: {
          floor_zone?: string | null
          game?: string
          id?: string
          max_seats?: number | null
          name?: string
          open_seats?: number | null
          players?: number | null
          seated_player_ids?: string[] | null
          stakes?: string
          status?: string | null
          updated_at?: string
          wait_count?: number | null
        }
        Relationships: []
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
          email: string | null
          external_player_id: string | null
          full_name: string | null
          id: string
          kyc_status: string | null
          marketing_opt_in: boolean
          name: string | null
          phone: string | null
          points: number | null
          tier: Database["public"]["Enums"]["user_role"] | null
          updated_at: string
        }
        Insert: {
          age_verified?: boolean | null
          created_at?: string
          dob?: string | null
          email?: string | null
          external_player_id?: string | null
          full_name?: string | null
          id: string
          kyc_status?: string | null
          marketing_opt_in?: boolean
          name?: string | null
          phone?: string | null
          points?: number | null
          tier?: Database["public"]["Enums"]["user_role"] | null
          updated_at?: string
        }
        Update: {
          age_verified?: boolean | null
          created_at?: string
          dob?: string | null
          email?: string | null
          external_player_id?: string | null
          full_name?: string | null
          id?: string
          kyc_status?: string | null
          marketing_opt_in?: boolean
          name?: string | null
          phone?: string | null
          points?: number | null
          tier?: Database["public"]["Enums"]["user_role"] | null
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
      rewards_catalog: {
        Row: {
          active: boolean | null
          created_at: string
          description: string | null
          id: string
          image: string | null
          min_tier: string | null
          monetary_value: number | null
          points_cost: number
          reward_type: string
          stock_qty: number | null
          title: string
        }
        Insert: {
          active?: boolean | null
          created_at?: string
          description?: string | null
          id?: string
          image?: string | null
          min_tier?: string | null
          monetary_value?: number | null
          points_cost: number
          reward_type: string
          stock_qty?: number | null
          title: string
        }
        Update: {
          active?: boolean | null
          created_at?: string
          description?: string | null
          id?: string
          image?: string | null
          min_tier?: string | null
          monetary_value?: number | null
          points_cost?: number
          reward_type?: string
          stock_qty?: number | null
          title?: string
        }
        Relationships: []
      }
      rewards_redemptions: {
        Row: {
          id: string
          points_spent: number
          redeemed_at: string
          reward_id: string
          status: string | null
          tournament_entry_id: string | null
          user_id: string
          voucher_id: string | null
        }
        Insert: {
          id?: string
          points_spent: number
          redeemed_at?: string
          reward_id: string
          status?: string | null
          tournament_entry_id?: string | null
          user_id: string
          voucher_id?: string | null
        }
        Update: {
          id?: string
          points_spent?: number
          redeemed_at?: string
          reward_id?: string
          status?: string | null
          tournament_entry_id?: string | null
          user_id?: string
          voucher_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rewards_redemptions_reward_id_fkey"
            columns: ["reward_id"]
            isOneToOne: false
            referencedRelation: "rewards_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rewards_redemptions_tournament_entry_id_fkey"
            columns: ["tournament_entry_id"]
            isOneToOne: false
            referencedRelation: "poker_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rewards_redemptions_voucher_id_fkey"
            columns: ["voucher_id"]
            isOneToOne: false
            referencedRelation: "chip_vouchers"
            referencedColumns: ["id"]
          },
        ]
      }
      seat_holds: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          seat_no: number
          table_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          seat_no: number
          table_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          seat_no?: number
          table_id?: string
          user_id?: string
        }
        Relationships: []
      }
      seating_maps: {
        Row: {
          created_at: string
          event_id: string | null
          id: string
          image_url: string
          notes: string | null
        }
        Insert: {
          created_at?: string
          event_id?: string | null
          id?: string
          image_url: string
          notes?: string | null
        }
        Update: {
          created_at?: string
          event_id?: string | null
          id?: string
          image_url?: string
          notes?: string | null
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
      shifts: {
        Row: {
          created_at: string
          end_time: string
          id: string
          notes: string | null
          role: string
          shift_date: string
          staff_id: string
          start_time: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          end_time: string
          id?: string
          notes?: string | null
          role: string
          shift_date: string
          staff_id: string
          start_time: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          end_time?: string
          id?: string
          notes?: string | null
          role?: string
          shift_date?: string
          staff_id?: string
          start_time?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shifts_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      slot_banks: {
        Row: {
          bank: string
          free_slots: number
          id: string
          lat: number | null
          lng: number | null
          room: string | null
          total_slots: number
          updated_at: string
        }
        Insert: {
          bank: string
          free_slots?: number
          id?: string
          lat?: number | null
          lng?: number | null
          room?: string | null
          total_slots?: number
          updated_at?: string
        }
        Update: {
          bank?: string
          free_slots?: number
          id?: string
          lat?: number | null
          lng?: number | null
          room?: string | null
          total_slots?: number
          updated_at?: string
        }
        Relationships: []
      }
      slots: {
        Row: {
          bank: string
          denom: string
          device_id: string | null
          game_title: string
          id: string
          last_session_end: string | null
          lat: number | null
          lng: number | null
          position: number
          room: string
          status: string | null
          updated_at: string
        }
        Insert: {
          bank: string
          denom: string
          device_id?: string | null
          game_title: string
          id: string
          last_session_end?: string | null
          lat?: number | null
          lng?: number | null
          position: number
          room: string
          status?: string | null
          updated_at?: string
        }
        Update: {
          bank?: string
          denom?: string
          device_id?: string | null
          game_title?: string
          id?: string
          last_session_end?: string | null
          lat?: number | null
          lng?: number | null
          position?: number
          room?: string
          status?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      staff: {
        Row: {
          auth_user_id: string | null
          created_at: string
          email: string | null
          full_name: string
          id: string
          pin_code: string | null
          role: string
          updated_at: string
        }
        Insert: {
          auth_user_id?: string | null
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          pin_code?: string | null
          role: string
          updated_at?: string
        }
        Update: {
          auth_user_id?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          pin_code?: string | null
          role?: string
          updated_at?: string
        }
        Relationships: []
      }
      stripe_events: {
        Row: {
          id: string
          processed_at: string | null
        }
        Insert: {
          id: string
          processed_at?: string | null
        }
        Update: {
          id?: string
          processed_at?: string | null
        }
        Relationships: []
      }
      support_messages: {
        Row: {
          created_at: string
          id: string
          message: string
          read_at: string | null
          sender_id: string
          sender_type: string
          ticket_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          read_at?: string | null
          sender_id: string
          sender_type: string
          ticket_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          read_at?: string | null
          sender_id?: string
          sender_type?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          assigned_to_staff_id: string | null
          created_at: string
          description: string
          id: string
          priority: string | null
          resolved_at: string | null
          status: string | null
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_to_staff_id?: string | null
          created_at?: string
          description: string
          id?: string
          priority?: string | null
          resolved_at?: string | null
          status?: string | null
          subject: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_to_staff_id?: string | null
          created_at?: string
          description?: string
          id?: string
          priority?: string | null
          resolved_at?: string | null
          status?: string | null
          subject?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tier_benefits: {
        Row: {
          benefit_description: string | null
          benefit_name: string
          benefit_type: string
          benefit_value: Json | null
          created_at: string
          id: string
          is_active: boolean | null
          tier: string
        }
        Insert: {
          benefit_description?: string | null
          benefit_name: string
          benefit_type: string
          benefit_value?: Json | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          tier: string
        }
        Update: {
          benefit_description?: string | null
          benefit_name?: string
          benefit_type?: string
          benefit_value?: Json | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          tier?: string
        }
        Relationships: []
      }
      tier_thresholds: {
        Row: {
          created_at: string | null
          id: string
          min_play_hours: number | null
          min_points: number
          min_sessions: number | null
          tier: Database["public"]["Enums"]["user_role"]
        }
        Insert: {
          created_at?: string | null
          id?: string
          min_play_hours?: number | null
          min_points: number
          min_sessions?: number | null
          tier: Database["public"]["Enums"]["user_role"]
        }
        Update: {
          created_at?: string | null
          id?: string
          min_play_hours?: number | null
          min_points?: number
          min_sessions?: number | null
          tier?: Database["public"]["Enums"]["user_role"]
        }
        Relationships: []
      }
      time_entries: {
        Row: {
          break_end: string | null
          break_start: string | null
          clock_in: string
          clock_out: string | null
          created_at: string
          id: string
          notes: string | null
          shift_id: string | null
          staff_id: string
          total_hours: number | null
        }
        Insert: {
          break_end?: string | null
          break_start?: string | null
          clock_in: string
          clock_out?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          shift_id?: string | null
          staff_id: string
          total_hours?: number | null
        }
        Update: {
          break_end?: string | null
          break_start?: string | null
          clock_in?: string
          clock_out?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          shift_id?: string | null
          staff_id?: string
          total_hours?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "time_entries_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_brackets: {
        Row: {
          created_at: string
          id: string
          match_number: number
          player1_chips: number | null
          player1_id: string | null
          player2_chips: number | null
          player2_id: string | null
          round_number: number
          status: string | null
          tourney_id: string
          updated_at: string
          winner_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          match_number: number
          player1_chips?: number | null
          player1_id?: string | null
          player2_chips?: number | null
          player2_id?: string | null
          round_number: number
          status?: string | null
          tourney_id: string
          updated_at?: string
          winner_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          match_number?: number
          player1_chips?: number | null
          player1_id?: string | null
          player2_chips?: number | null
          player2_id?: string | null
          round_number?: number
          status?: string | null
          tourney_id?: string
          updated_at?: string
          winner_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tournament_brackets_player1_id_fkey"
            columns: ["player1_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_brackets_player2_id_fkey"
            columns: ["player2_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_brackets_tourney_id_fkey"
            columns: ["tourney_id"]
            isOneToOne: false
            referencedRelation: "poker_tourneys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_brackets_winner_id_fkey"
            columns: ["winner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_matches: {
        Row: {
          created_at: string | null
          id: string
          match_number: number
          player1_id: string | null
          player1_seed: number | null
          player2_id: string | null
          player2_seed: number | null
          round_number: number
          scheduled_time: string | null
          status: string | null
          table_id: string | null
          tourney_id: string
          updated_at: string | null
          winner_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          match_number: number
          player1_id?: string | null
          player1_seed?: number | null
          player2_id?: string | null
          player2_seed?: number | null
          round_number: number
          scheduled_time?: string | null
          status?: string | null
          table_id?: string | null
          tourney_id: string
          updated_at?: string | null
          winner_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          match_number?: number
          player1_id?: string | null
          player1_seed?: number | null
          player2_id?: string | null
          player2_seed?: number | null
          round_number?: number
          scheduled_time?: string | null
          status?: string | null
          table_id?: string | null
          tourney_id?: string
          updated_at?: string | null
          winner_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tournament_matches_player1_id_fkey"
            columns: ["player1_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_matches_player2_id_fkey"
            columns: ["player2_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_matches_tourney_id_fkey"
            columns: ["tourney_id"]
            isOneToOne: false
            referencedRelation: "poker_tourneys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_matches_winner_id_fkey"
            columns: ["winner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_standings: {
        Row: {
          created_at: string
          eliminated_at: string | null
          final_chips: number | null
          id: string
          prize_amount: number | null
          rank: number
          tourney_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          eliminated_at?: string | null
          final_chips?: number | null
          id?: string
          prize_amount?: number | null
          rank: number
          tourney_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          eliminated_at?: string | null
          final_chips?: number | null
          id?: string
          prize_amount?: number | null
          rank?: number
          tourney_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tournament_standings_tourney_id_fkey"
            columns: ["tourney_id"]
            isOneToOne: false
            referencedRelation: "poker_tourneys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_standings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      wallet_transactions: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          id: string
          processed_at: string | null
          reference_id: string | null
          status: string | null
          transaction_type: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string | null
          id?: string
          processed_at?: string | null
          reference_id?: string | null
          status?: string | null
          transaction_type: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          id?: string
          processed_at?: string | null
          reference_id?: string | null
          status?: string | null
          transaction_type?: string
          user_id?: string
        }
        Relationships: []
      }
      webhook_events: {
        Row: {
          event_type: string | null
          id: string
          processed: boolean | null
          received_at: string
        }
        Insert: {
          event_type?: string | null
          id: string
          processed?: boolean | null
          received_at?: string
        }
        Update: {
          event_type?: string | null
          id?: string
          processed?: boolean | null
          received_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      adjust_player_points: {
        Args: {
          p_admin_id: string
          p_points_change: number
          p_reason: string
          p_user_id: string
        }
        Returns: undefined
      }
      adjust_player_tier: {
        Args: {
          p_admin_id: string
          p_new_tier: Database["public"]["Enums"]["user_role"]
          p_reason: string
          p_user_id: string
        }
        Returns: undefined
      }
      calculate_tournament_payouts: {
        Args: { p_prize_structure: Json; p_tourney_id: string }
        Returns: Json
      }
      calculate_wait_time: { Args: { p_list_id: string }; Returns: number }
      check_tier_upgrade: { Args: { p_user_id: string }; Returns: undefined }
      check_user_permission: {
        Args: {
          required_role: Database["public"]["Enums"]["app_role"]
          resource_user_id?: string
        }
        Returns: boolean
      }
      claim_cash_seat: {
        Args: {
          p_hold_id: string
          p_seat_no: number
          p_table_id: string
          p_user_id: string
        }
        Returns: undefined
      }
      create_notification: {
        Args: {
          notification_data?: Json
          notification_message: string
          notification_title: string
          notification_type: string
          ref_id?: string
          ref_type?: string
          target_user_id: string
        }
        Returns: string
      }
      create_poker_seat_hold: {
        Args: {
          p_hold_duration_minutes?: number
          p_seat_no: number
          p_table_id: string
          p_user_id: string
        }
        Returns: string
      }
      create_seat_hold: {
        Args: { p_queue_id: string; p_seat_no: number; p_table_id: string }
        Returns: string
      }
      generate_tournament_bracket: {
        Args: { p_tourney_id: string }
        Returns: Json
      }
      get_poker_tables_with_seats: {
        Args: never
        Returns: {
          game: string
          max_seats: number
          occupied_seats: number
          open_seats: number
          queue_length: number
          stakes: string
          status: string
          table_id: string
          table_name: string
        }[]
      }
      get_public_poker_tables: {
        Args: never
        Returns: {
          floor_zone: string
          game: string
          id: string
          max_seats: number
          name: string
          open_seats: number
          players: number
          stakes: string
          status: string
          updated_at: string
          wait_count: number
        }[]
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      join_poker_queue: { Args: { p_table_id: string }; Returns: string }
      log_sensitive_action: {
        Args: {
          action_type: string
          details?: Json
          resource_id: string
          resource_type: string
        }
        Returns: undefined
      }
      notify_wallet_update: {
        Args: { event_data: Json; target_user_id: string }
        Returns: undefined
      }
      process_order: {
        Args: { p_new_status: string; p_order_id: string; p_staff_id?: string }
        Returns: Json
      }
      redeem_chip_voucher: {
        Args: { p_barcode: string; p_staff_id: string }
        Returns: Json
      }
      redeem_ticket: { Args: { p_barcode: string }; Returns: Json }
      release_expired_seat_holds: { Args: never; Returns: number }
      sanitize_text: { Args: { input_text: string }; Returns: string }
      update_queue_positions: {
        Args: { p_list_id: string }
        Returns: undefined
      }
      update_slot_bank_aggregate: {
        Args: { p_bank: string; p_room: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "User" | "Staff" | "Admin"
      user_role: "User" | "Staff" | "Admin"
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
      app_role: ["User", "Staff", "Admin"],
      user_role: ["User", "Staff", "Admin"],
    },
  },
} as const
