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
      city_tour_details: {
        Row: {
          custom_notes: string | null
          duration_minutes: number
          region: string
          ride_id: string
          tour_style: string
        }
        Insert: {
          custom_notes?: string | null
          duration_minutes: number
          region: string
          ride_id: string
          tour_style: string
        }
        Update: {
          custom_notes?: string | null
          duration_minutes?: number
          region?: string
          ride_id?: string
          tour_style?: string
        }
        Relationships: [
          {
            foreignKeyName: "city_tour_details_ride_id_fkey"
            columns: ["ride_id"]
            isOneToOne: true
            referencedRelation: "rides"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_applications: {
        Row: {
          admin_note: string | null
          application_note: string | null
          created_at: string
          id: string
          languages: string[]
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["application_status"]
          user_id: string
        }
        Insert: {
          admin_note?: string | null
          application_note?: string | null
          created_at?: string
          id?: string
          languages?: string[]
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["application_status"]
          user_id: string
        }
        Update: {
          admin_note?: string | null
          application_note?: string | null
          created_at?: string
          id?: string
          languages?: string[]
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["application_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "driver_applications_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_applications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_profiles: {
        Row: {
          availability_status: Database["public"]["Enums"]["driver_availability"]
          created_at: string
          languages: string[]
          notes: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          availability_status?: Database["public"]["Enums"]["driver_availability"]
          created_at?: string
          languages?: string[]
          notes?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          availability_status?: Database["public"]["Enums"]["driver_availability"]
          created_at?: string
          languages?: string[]
          notes?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "driver_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_unavailability: {
        Row: {
          created_at: string
          driver_id: string
          ends_at: string
          id: string
          notes: string | null
          reason: string
          starts_at: string
        }
        Insert: {
          created_at?: string
          driver_id: string
          ends_at: string
          id?: string
          notes?: string | null
          reason: string
          starts_at: string
        }
        Update: {
          created_at?: string
          driver_id?: string
          ends_at?: string
          id?: string
          notes?: string | null
          reason?: string
          starts_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "driver_unavailability_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      hourly_concierge_details: {
        Row: {
          duration_minutes: number
          hourly_rate_snapshot: number
          included_kilometers_snapshot: number
          purpose: string
          ride_id: string
        }
        Insert: {
          duration_minutes: number
          hourly_rate_snapshot: number
          included_kilometers_snapshot: number
          purpose: string
          ride_id: string
        }
        Update: {
          duration_minutes?: number
          hourly_rate_snapshot?: number
          included_kilometers_snapshot?: number
          purpose?: string
          ride_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hourly_concierge_details_ride_id_fkey"
            columns: ["ride_id"]
            isOneToOne: true
            referencedRelation: "rides"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          message: string
          read_at: string | null
          ride_id: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          read_at?: string | null
          ride_id?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          read_at?: string | null
          ride_id?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_ride_id_fkey"
            columns: ["ride_id"]
            isOneToOne: false
            referencedRelation: "rides"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      passenger_preferences: {
        Row: {
          music: string | null
          name_sign: boolean
          notes: string | null
          passenger_id: string
          ride_atmosphere: string | null
          temperature: number | null
          updated_at: string
          water: string | null
        }
        Insert: {
          music?: string | null
          name_sign?: boolean
          notes?: string | null
          passenger_id: string
          ride_atmosphere?: string | null
          temperature?: number | null
          updated_at?: string
          water?: string | null
        }
        Update: {
          music?: string | null
          name_sign?: boolean
          notes?: string | null
          passenger_id?: string
          ride_atmosphere?: string | null
          temperature?: number | null
          updated_at?: string
          water?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "passenger_preferences_passenger_id_fkey"
            columns: ["passenger_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          first_name: string
          id: string
          last_name: string
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          first_name?: string
          id: string
          last_name?: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          first_name?: string
          id?: string
          last_name?: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: []
      }
      ride_activity: {
        Row: {
          actor_id: string | null
          created_at: string
          event_type: string
          id: string
          message: string
          metadata: Json
          ride_id: string
          visibility: Database["public"]["Enums"]["note_visibility"]
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          event_type: string
          id?: string
          message: string
          metadata?: Json
          ride_id: string
          visibility?: Database["public"]["Enums"]["note_visibility"]
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          event_type?: string
          id?: string
          message?: string
          metadata?: Json
          ride_id?: string
          visibility?: Database["public"]["Enums"]["note_visibility"]
        }
        Relationships: [
          {
            foreignKeyName: "ride_activity_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ride_activity_ride_id_fkey"
            columns: ["ride_id"]
            isOneToOne: false
            referencedRelation: "rides"
            referencedColumns: ["id"]
          },
        ]
      }
      ride_notes: {
        Row: {
          author_id: string
          created_at: string
          id: string
          note: string
          ride_id: string
          visibility: Database["public"]["Enums"]["note_visibility"]
        }
        Insert: {
          author_id: string
          created_at?: string
          id?: string
          note: string
          ride_id: string
          visibility: Database["public"]["Enums"]["note_visibility"]
        }
        Update: {
          author_id?: string
          created_at?: string
          id?: string
          note?: string
          ride_id?: string
          visibility?: Database["public"]["Enums"]["note_visibility"]
        }
        Relationships: [
          {
            foreignKeyName: "ride_notes_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ride_notes_ride_id_fkey"
            columns: ["ride_id"]
            isOneToOne: false
            referencedRelation: "rides"
            referencedColumns: ["id"]
          },
        ]
      }
      ride_stops: {
        Row: {
          address: string
          created_at: string
          id: string
          latitude: number | null
          longitude: number | null
          name: string
          position: number
          ride_id: string
        }
        Insert: {
          address: string
          created_at?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          name: string
          position: number
          ride_id: string
        }
        Update: {
          address?: string
          created_at?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          name?: string
          position?: number
          ride_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ride_stops_ride_id_fkey"
            columns: ["ride_id"]
            isOneToOne: false
            referencedRelation: "rides"
            referencedColumns: ["id"]
          },
        ]
      }
      rides: {
        Row: {
          booking_source: Database["public"]["Enums"]["booking_source"]
          created_at: string
          currency: string
          customer_email: string
          customer_name: string
          customer_phone: string
          destination_address: string | null
          destination_latitude: number | null
          destination_longitude: number | null
          destination_name: string | null
          driver_id: string | null
          duration_minutes: number | null
          estimated_price: number | null
          final_price: number | null
          flight_number: string | null
          id: string
          luggage: string | null
          passenger_count: number
          passenger_id: string | null
          payment_status: Database["public"]["Enums"]["payment_status"]
          pickup_address: string
          pickup_latitude: number | null
          pickup_longitude: number | null
          pickup_name: string
          requested_vehicle_class: string | null
          requested_vehicle_id: string | null
          scheduled_end_at: string | null
          scheduled_start_at: string
          service_type: Database["public"]["Enums"]["service_type"]
          special_requests: string | null
          status: Database["public"]["Enums"]["ride_status"]
          updated_at: string
          vehicle_id: string | null
        }
        Insert: {
          booking_source?: Database["public"]["Enums"]["booking_source"]
          created_at?: string
          currency?: string
          customer_email: string
          customer_name: string
          customer_phone: string
          destination_address?: string | null
          destination_latitude?: number | null
          destination_longitude?: number | null
          destination_name?: string | null
          driver_id?: string | null
          duration_minutes?: number | null
          estimated_price?: number | null
          final_price?: number | null
          flight_number?: string | null
          id?: string
          luggage?: string | null
          passenger_count?: number
          passenger_id?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          pickup_address: string
          pickup_latitude?: number | null
          pickup_longitude?: number | null
          pickup_name: string
          requested_vehicle_class?: string | null
          requested_vehicle_id?: string | null
          scheduled_end_at?: string | null
          scheduled_start_at: string
          service_type: Database["public"]["Enums"]["service_type"]
          special_requests?: string | null
          status?: Database["public"]["Enums"]["ride_status"]
          updated_at?: string
          vehicle_id?: string | null
        }
        Update: {
          booking_source?: Database["public"]["Enums"]["booking_source"]
          created_at?: string
          currency?: string
          customer_email?: string
          customer_name?: string
          customer_phone?: string
          destination_address?: string | null
          destination_latitude?: number | null
          destination_longitude?: number | null
          destination_name?: string | null
          driver_id?: string | null
          duration_minutes?: number | null
          estimated_price?: number | null
          final_price?: number | null
          flight_number?: string | null
          id?: string
          luggage?: string | null
          passenger_count?: number
          passenger_id?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          pickup_address?: string
          pickup_latitude?: number | null
          pickup_longitude?: number | null
          pickup_name?: string
          requested_vehicle_class?: string | null
          requested_vehicle_id?: string | null
          scheduled_end_at?: string | null
          scheduled_start_at?: string
          service_type?: Database["public"]["Enums"]["service_type"]
          special_requests?: string | null
          status?: Database["public"]["Enums"]["ride_status"]
          updated_at?: string
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rides_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rides_passenger_id_fkey"
            columns: ["passenger_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rides_requested_vehicle_id_fkey"
            columns: ["requested_vehicle_id"]
            isOneToOne: false
            referencedRelation: "public_vehicle_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rides_requested_vehicle_id_fkey"
            columns: ["requested_vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rides_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "public_vehicle_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rides_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_unavailability: {
        Row: {
          created_at: string
          ends_at: string
          id: string
          notes: string | null
          reason: Database["public"]["Enums"]["vehicle_unavailability_reason"]
          starts_at: string
          vehicle_id: string
        }
        Insert: {
          created_at?: string
          ends_at: string
          id?: string
          notes?: string | null
          reason: Database["public"]["Enums"]["vehicle_unavailability_reason"]
          starts_at: string
          vehicle_id: string
        }
        Update: {
          created_at?: string
          ends_at?: string
          id?: string
          notes?: string | null
          reason?: Database["public"]["Enums"]["vehicle_unavailability_reason"]
          starts_at?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_unavailability_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "public_vehicle_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_unavailability_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicles: {
        Row: {
          active: boolean
          brand: string
          category: string
          created_at: string
          display_name: string
          id: string
          image_url: string | null
          luggage_capacity: string | null
          model: string
          operational_status: Database["public"]["Enums"]["vehicle_operational_status"]
          plate: string | null
          seat_capacity: number | null
          slug: string
          updated_at: string
          year: number
        }
        Insert: {
          active?: boolean
          brand: string
          category: string
          created_at?: string
          display_name: string
          id?: string
          image_url?: string | null
          luggage_capacity?: string | null
          model: string
          operational_status?: Database["public"]["Enums"]["vehicle_operational_status"]
          plate?: string | null
          seat_capacity?: number | null
          slug: string
          updated_at?: string
          year: number
        }
        Update: {
          active?: boolean
          brand?: string
          category?: string
          created_at?: string
          display_name?: string
          id?: string
          image_url?: string | null
          luggage_capacity?: string | null
          model?: string
          operational_status?: Database["public"]["Enums"]["vehicle_operational_status"]
          plate?: string | null
          seat_capacity?: number | null
          slug?: string
          updated_at?: string
          year?: number
        }
        Relationships: []
      }
    }
    Views: {
      public_vehicle_catalog: {
        Row: {
          brand: string | null
          category: string | null
          display_name: string | null
          id: string | null
          image_url: string | null
          luggage_capacity: string | null
          model: string | null
          seat_capacity: number | null
          slug: string | null
          year: number | null
        }
        Insert: {
          brand?: string | null
          category?: string | null
          display_name?: string | null
          id?: string | null
          image_url?: string | null
          luggage_capacity?: string | null
          model?: string | null
          seat_capacity?: number | null
          slug?: string | null
          year?: number | null
        }
        Update: {
          brand?: string | null
          category?: string | null
          display_name?: string | null
          id?: string | null
          image_url?: string | null
          luggage_capacity?: string | null
          model?: string | null
          seat_capacity?: number | null
          slug?: string | null
          year?: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      admin_assign_ride: {
        Args: { p_driver?: string; p_ride: string; p_vehicle?: string }
        Returns: undefined
      }
      admin_create_ride: { Args: { payload: Json }; Returns: string }
      admin_review_driver_application: {
        Args: {
          application_id: string
          decision: Database["public"]["Enums"]["application_status"]
          note?: string
        }
        Returns: undefined
      }
      admin_send_offer: {
        Args: { final_price: number; note?: string; ride_id: string }
        Returns: undefined
      }
      admin_set_user_role: {
        Args: {
          new_role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Returns: undefined
      }
      admin_update_ride: {
        Args: {
          p_payment?: Database["public"]["Enums"]["payment_status"]
          p_ride: string
          p_status?: Database["public"]["Enums"]["ride_status"]
        }
        Returns: undefined
      }
      check_driver_conflict: {
        Args: {
          p_driver: string
          p_end: string
          p_exclude?: string
          p_start: string
        }
        Returns: boolean
      }
      check_vehicle_conflict: {
        Args: {
          p_end: string
          p_exclude?: string
          p_start: string
          p_vehicle: string
        }
        Returns: boolean
      }
      claim_my_guest_rides: { Args: never; Returns: number }
      driver_update_ride_status: {
        Args: {
          ride_id: string
          target_status: Database["public"]["Enums"]["ride_status"]
        }
        Returns: undefined
      }
      is_admin: { Args: never; Returns: boolean }
      is_driver: { Args: never; Returns: boolean }
      passenger_accept_offer: { Args: { ride_id: string }; Returns: undefined }
      submit_driver_application: {
        Args: { application_note?: string; languages: string[] }
        Returns: string
      }
      submit_ride_request: { Args: { payload: Json }; Returns: string }
    }
    Enums: {
      application_status: "pending" | "approved" | "rejected"
      booking_source:
        | "website"
        | "phone"
        | "whatsapp"
        | "hotel"
        | "business"
        | "admin"
      driver_availability: "available" | "busy" | "offline" | "unavailable"
      note_visibility: "internal_admin" | "driver" | "passenger" | "shared"
      payment_status: "unpaid" | "deposit_paid" | "paid" | "invoice" | "cash"
      ride_status:
        | "request_received"
        | "under_review"
        | "offer_sent"
        | "confirmed"
        | "driver_assigned"
        | "driver_on_the_way"
        | "driver_arrived"
        | "passenger_onboard"
        | "completed"
        | "cancelled"
        | "declined"
      service_type: "transfer" | "city_tour" | "hourly_concierge"
      user_role: "passenger" | "driver" | "admin"
      vehicle_operational_status: "available" | "unavailable" | "service"
      vehicle_unavailability_reason:
        | "service"
        | "cleaning"
        | "private_use"
        | "issue"
        | "other"
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
      application_status: ["pending", "approved", "rejected"],
      booking_source: [
        "website",
        "phone",
        "whatsapp",
        "hotel",
        "business",
        "admin",
      ],
      driver_availability: ["available", "busy", "offline", "unavailable"],
      note_visibility: ["internal_admin", "driver", "passenger", "shared"],
      payment_status: ["unpaid", "deposit_paid", "paid", "invoice", "cash"],
      ride_status: [
        "request_received",
        "under_review",
        "offer_sent",
        "confirmed",
        "driver_assigned",
        "driver_on_the_way",
        "driver_arrived",
        "passenger_onboard",
        "completed",
        "cancelled",
        "declined",
      ],
      service_type: ["transfer", "city_tour", "hourly_concierge"],
      user_role: ["passenger", "driver", "admin"],
      vehicle_operational_status: ["available", "unavailable", "service"],
      vehicle_unavailability_reason: [
        "service",
        "cleaning",
        "private_use",
        "issue",
        "other",
      ],
    },
  },
} as const
