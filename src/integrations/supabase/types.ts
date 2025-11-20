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
          biological_notes: string | null
          created_at: string
          delivery_date: string | null
          doctor_id: string | null
          doctor_name: string
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
          biological_notes?: string | null
          created_at?: string
          delivery_date?: string | null
          doctor_id?: string | null
          doctor_name: string
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
          biological_notes?: string | null
          created_at?: string
          delivery_date?: string | null
          doctor_id?: string | null
          doctor_name?: string
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
            foreignKeyName: "orders_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          id: string
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_order_number: { Args: never; Returns: string }
    }
    Enums: {
      order_status:
        | "Pending"
        | "In Progress"
        | "Ready for QC"
        | "Ready for Delivery"
        | "Delivered"
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
      user_role: "doctor" | "lab_staff" | "admin"
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
      order_status: [
        "Pending",
        "In Progress",
        "Ready for QC",
        "Ready for Delivery",
        "Delivered",
      ],
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
      user_role: ["doctor", "lab_staff", "admin"],
    },
  },
} as const
