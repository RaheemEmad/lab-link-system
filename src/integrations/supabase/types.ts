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
      lab_performance_metrics: {
        Row: {
          approval_rate: number | null
          average_turnaround_days: number | null
          completed_orders: number
          id: string
          lab_id: string
          last_calculated_at: string
          on_time_deliveries: number
          total_orders: number
        }
        Insert: {
          approval_rate?: number | null
          average_turnaround_days?: number | null
          completed_orders?: number
          id?: string
          lab_id: string
          last_calculated_at?: string
          on_time_deliveries?: number
          total_orders?: number
        }
        Update: {
          approval_rate?: number | null
          average_turnaround_days?: number | null
          completed_orders?: number
          id?: string
          lab_id?: string
          last_calculated_at?: string
          on_time_deliveries?: number
          total_orders?: number
        }
        Relationships: [
          {
            foreignKeyName: "lab_performance_metrics_lab_id_fkey"
            columns: ["lab_id"]
            isOneToOne: true
            referencedRelation: "labs"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_photos: {
        Row: {
          caption: string | null
          created_at: string | null
          display_order: number | null
          id: string
          lab_id: string
          photo_url: string
          updated_at: string | null
        }
        Insert: {
          caption?: string | null
          created_at?: string | null
          display_order?: number | null
          id?: string
          lab_id: string
          photo_url: string
          updated_at?: string | null
        }
        Update: {
          caption?: string | null
          created_at?: string | null
          display_order?: number | null
          id?: string
          lab_id?: string
          photo_url?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lab_photos_lab_id_fkey"
            columns: ["lab_id"]
            isOneToOne: false
            referencedRelation: "labs"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_reviews: {
        Row: {
          created_at: string | null
          dentist_id: string
          id: string
          lab_id: string
          order_id: string | null
          rating: number
          review_text: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          dentist_id: string
          id?: string
          lab_id: string
          order_id?: string | null
          rating: number
          review_text?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          dentist_id?: string
          id?: string
          lab_id?: string
          order_id?: string | null
          rating?: number
          review_text?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lab_reviews_dentist_id_fkey"
            columns: ["dentist_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_reviews_lab_id_fkey"
            columns: ["lab_id"]
            isOneToOne: false
            referencedRelation: "labs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_reviews_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_specializations: {
        Row: {
          created_at: string
          expertise_level: Database["public"]["Enums"]["expertise_level"]
          id: string
          is_preferred: boolean
          lab_id: string
          restoration_type: Database["public"]["Enums"]["restoration_type"]
          turnaround_days: number
        }
        Insert: {
          created_at?: string
          expertise_level?: Database["public"]["Enums"]["expertise_level"]
          id?: string
          is_preferred?: boolean
          lab_id: string
          restoration_type: Database["public"]["Enums"]["restoration_type"]
          turnaround_days: number
        }
        Update: {
          created_at?: string
          expertise_level?: Database["public"]["Enums"]["expertise_level"]
          id?: string
          is_preferred?: boolean
          lab_id?: string
          restoration_type?: Database["public"]["Enums"]["restoration_type"]
          turnaround_days?: number
        }
        Relationships: [
          {
            foreignKeyName: "lab_specializations_lab_id_fkey"
            columns: ["lab_id"]
            isOneToOne: false
            referencedRelation: "labs"
            referencedColumns: ["id"]
          },
        ]
      }
      labs: {
        Row: {
          address: string | null
          contact_email: string
          contact_phone: string | null
          created_at: string
          current_load: number
          description: string | null
          id: string
          is_active: boolean
          logo_url: string | null
          max_capacity: number
          name: string
          performance_score: number | null
          pricing_tier: Database["public"]["Enums"]["pricing_tier"]
          standard_sla_days: number
          updated_at: string
          urgent_sla_days: number
          website_url: string | null
        }
        Insert: {
          address?: string | null
          contact_email: string
          contact_phone?: string | null
          created_at?: string
          current_load?: number
          description?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          max_capacity?: number
          name: string
          performance_score?: number | null
          pricing_tier?: Database["public"]["Enums"]["pricing_tier"]
          standard_sla_days?: number
          updated_at?: string
          urgent_sla_days?: number
          website_url?: string | null
        }
        Update: {
          address?: string | null
          contact_email?: string
          contact_phone?: string | null
          created_at?: string
          current_load?: number
          description?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          max_capacity?: number
          name?: string
          performance_score?: number | null
          pricing_tier?: Database["public"]["Enums"]["pricing_tier"]
          standard_sla_days?: number
          updated_at?: string
          urgent_sla_days?: number
          website_url?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          message: string
          order_id: string
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          order_id: string
          read?: boolean
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          order_id?: string
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_assignments: {
        Row: {
          assigned_at: string
          assigned_by: string
          id: string
          order_id: string
          user_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by: string
          id?: string
          order_id: string
          user_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string
          id?: string
          order_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_assignments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_notes: {
        Row: {
          created_at: string
          id: string
          note_text: string
          order_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          note_text: string
          order_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          note_text?: string
          order_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_notes_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_notes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      order_status_history: {
        Row: {
          changed_at: string
          changed_by: string
          id: string
          new_status: Database["public"]["Enums"]["order_status"]
          notes: string | null
          old_status: Database["public"]["Enums"]["order_status"] | null
          order_id: string
        }
        Insert: {
          changed_at?: string
          changed_by: string
          id?: string
          new_status: Database["public"]["Enums"]["order_status"]
          notes?: string | null
          old_status?: Database["public"]["Enums"]["order_status"] | null
          order_id: string
        }
        Update: {
          changed_at?: string
          changed_by?: string
          id?: string
          new_status?: Database["public"]["Enums"]["order_status"]
          notes?: string | null
          old_status?: Database["public"]["Enums"]["order_status"] | null
          order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_status_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          actual_delivery_date: string | null
          approval_notes: string | null
          assigned_lab_id: string | null
          biological_notes: string | null
          created_at: string
          delivery_date: string | null
          design_approved: boolean | null
          design_file_url: string | null
          doctor_id: string | null
          doctor_name: string
          expected_delivery_date: string | null
          html_export: string | null
          id: string
          order_number: string
          patient_name: string
          photos_link: string | null
          price: number | null
          restoration_type: Database["public"]["Enums"]["restoration_type"]
          shade_system: string | null
          shipment_tracking: string | null
          status: Database["public"]["Enums"]["order_status"]
          status_updated_at: string | null
          teeth_number: string
          teeth_shade: string
          timestamp: string
          updated_at: string
          urgency: Database["public"]["Enums"]["urgency_level"]
        }
        Insert: {
          actual_delivery_date?: string | null
          approval_notes?: string | null
          assigned_lab_id?: string | null
          biological_notes?: string | null
          created_at?: string
          delivery_date?: string | null
          design_approved?: boolean | null
          design_file_url?: string | null
          doctor_id?: string | null
          doctor_name: string
          expected_delivery_date?: string | null
          html_export?: string | null
          id?: string
          order_number: string
          patient_name: string
          photos_link?: string | null
          price?: number | null
          restoration_type: Database["public"]["Enums"]["restoration_type"]
          shade_system?: string | null
          shipment_tracking?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          status_updated_at?: string | null
          teeth_number: string
          teeth_shade: string
          timestamp?: string
          updated_at?: string
          urgency?: Database["public"]["Enums"]["urgency_level"]
        }
        Update: {
          actual_delivery_date?: string | null
          approval_notes?: string | null
          assigned_lab_id?: string | null
          biological_notes?: string | null
          created_at?: string
          delivery_date?: string | null
          design_approved?: boolean | null
          design_file_url?: string | null
          doctor_id?: string | null
          doctor_name?: string
          expected_delivery_date?: string | null
          html_export?: string | null
          id?: string
          order_number?: string
          patient_name?: string
          photos_link?: string | null
          price?: number | null
          restoration_type?: Database["public"]["Enums"]["restoration_type"]
          shade_system?: string | null
          shipment_tracking?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          status_updated_at?: string | null
          teeth_number?: string
          teeth_shade?: string
          timestamp?: string
          updated_at?: string
          urgency?: Database["public"]["Enums"]["urgency_level"]
        }
        Relationships: [
          {
            foreignKeyName: "orders_assigned_lab_id_fkey"
            columns: ["assigned_lab_id"]
            isOneToOne: false
            referencedRelation: "labs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      preferred_labs: {
        Row: {
          created_at: string
          dentist_id: string
          id: string
          lab_id: string
          priority_order: number
        }
        Insert: {
          created_at?: string
          dentist_id: string
          id?: string
          lab_id: string
          priority_order?: number
        }
        Update: {
          created_at?: string
          dentist_id?: string
          id?: string
          lab_id?: string
          priority_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "preferred_labs_lab_id_fkey"
            columns: ["lab_id"]
            isOneToOne: false
            referencedRelation: "labs"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          business_address: string | null
          clinic_name: string | null
          created_at: string
          email: string
          email_notifications: boolean | null
          full_name: string | null
          id: string
          lab_license_number: string | null
          lab_name: string | null
          notification_new_notes: boolean | null
          notification_status_change: boolean | null
          onboarding_completed: boolean | null
          phone: string | null
          sms_notifications: boolean | null
          specialty: string | null
          tax_id: string | null
          updated_at: string
        }
        Insert: {
          business_address?: string | null
          clinic_name?: string | null
          created_at?: string
          email: string
          email_notifications?: boolean | null
          full_name?: string | null
          id: string
          lab_license_number?: string | null
          lab_name?: string | null
          notification_new_notes?: boolean | null
          notification_status_change?: boolean | null
          onboarding_completed?: boolean | null
          phone?: string | null
          sms_notifications?: boolean | null
          specialty?: string | null
          tax_id?: string | null
          updated_at?: string
        }
        Update: {
          business_address?: string | null
          clinic_name?: string | null
          created_at?: string
          email?: string
          email_notifications?: boolean | null
          full_name?: string | null
          id?: string
          lab_license_number?: string | null
          lab_name?: string | null
          notification_new_notes?: boolean | null
          notification_status_change?: boolean | null
          onboarding_completed?: boolean | null
          phone?: string | null
          sms_notifications?: boolean | null
          specialty?: string | null
          tax_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          created_at: string
          id: string
          subscription: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          subscription: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          subscription?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      qc_checklist_items: {
        Row: {
          completed_at: string | null
          completed_by: string | null
          created_at: string
          id: string
          is_completed: boolean
          item_description: string | null
          item_name: string
          notes: string | null
          order_id: string
          photo_url: string | null
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          id?: string
          is_completed?: boolean
          item_description?: string | null
          item_name: string
          notes?: string | null
          order_id: string
          photo_url?: string | null
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          id?: string
          is_completed?: boolean
          item_description?: string | null
          item_name?: string
          notes?: string | null
          order_id?: string
          photo_url?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "qc_checklist_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_limits: {
        Row: {
          created_at: string | null
          endpoint: string
          id: string
          identifier: string
          request_count: number | null
          window_start: string
        }
        Insert: {
          created_at?: string | null
          endpoint: string
          id?: string
          identifier: string
          request_count?: number | null
          window_start?: string
        }
        Update: {
          created_at?: string | null
          endpoint?: string
          id?: string
          identifier?: string
          request_count?: number | null
          window_start?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          lab_id: string | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          lab_id?: string | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          lab_id?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_lab_id_fkey"
            columns: ["lab_id"]
            isOneToOne: false
            referencedRelation: "labs"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cleanup_old_rate_limits: { Args: never; Returns: undefined }
      complete_doctor_onboarding: {
        Args: {
          clinic_name_param: string
          phone_param: string
          specialty_param: string
          user_id_param: string
        }
        Returns: undefined
      }
      complete_lab_onboarding: {
        Args: {
          address_param: string
          lab_license_param: string
          lab_name_param: string
          phone_param: string
          tax_id_param: string
          user_id_param: string
        }
        Returns: undefined
      }
      complete_onboarding: {
        Args: {
          clinic_name_param: string
          phone_param: string
          specialty_param: string
          user_id_param: string
        }
        Returns: undefined
      }
      generate_order_number: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      initialize_qc_checklist: {
        Args: { order_id_param: string }
        Returns: undefined
      }
      set_user_role: {
        Args: {
          role_param: Database["public"]["Enums"]["app_role"]
          user_id_param: string
        }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "lab_staff" | "doctor"
      expertise_level: "basic" | "intermediate" | "expert"
      order_status:
        | "Pending"
        | "In Progress"
        | "Ready for QC"
        | "Ready for Delivery"
        | "Delivered"
      pricing_tier: "budget" | "standard" | "premium"
      restoration_type:
        | "Zirconia"
        | "E-max"
        | "PFM"
        | "Metal"
        | "Acrylic"
        | "Crown"
        | "Bridge"
        | "Zirconia Layer"
        | "Zirco-Max"
      urgency_level: "Normal" | "Urgent"
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
      app_role: ["admin", "lab_staff", "doctor"],
      expertise_level: ["basic", "intermediate", "expert"],
      order_status: [
        "Pending",
        "In Progress",
        "Ready for QC",
        "Ready for Delivery",
        "Delivered",
      ],
      pricing_tier: ["budget", "standard", "premium"],
      restoration_type: [
        "Zirconia",
        "E-max",
        "PFM",
        "Metal",
        "Acrylic",
        "Crown",
        "Bridge",
        "Zirconia Layer",
        "Zirco-Max",
      ],
      urgency_level: ["Normal", "Urgent"],
    },
  },
} as const
