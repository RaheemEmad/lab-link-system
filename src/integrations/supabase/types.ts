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
      admin_notifications: {
        Row: {
          category: string
          created_at: string
          id: string
          message: string
          metadata: Json | null
          read: boolean
          severity: string
          title: string
        }
        Insert: {
          category: string
          created_at?: string
          id?: string
          message: string
          metadata?: Json | null
          read?: boolean
          severity: string
          title: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          message?: string
          metadata?: Json | null
          read?: boolean
          severity?: string
          title?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action_type: string
          created_at: string
          id: string
          ip_address: string | null
          metadata: Json | null
          new_values: Json | null
          old_values: Json | null
          record_id: string | null
          table_name: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action_type: string
          created_at?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string | null
          table_name: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action_type?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string | null
          table_name?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      lab_application_audit: {
        Row: {
          action: string
          created_at: string
          id: string
          lab_id: string
          metadata: Json | null
          order_id: string
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          lab_id: string
          metadata?: Json | null
          order_id: string
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          lab_id?: string
          metadata?: Json | null
          order_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lab_application_audit_lab_id_fkey"
            columns: ["lab_id"]
            isOneToOne: false
            referencedRelation: "labs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_application_audit_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
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
      lab_work_requests: {
        Row: {
          created_at: string
          id: string
          lab_id: string
          order_id: string
          requested_by_user_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          lab_id: string
          order_id: string
          requested_by_user_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          lab_id?: string
          order_id?: string
          requested_by_user_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lab_work_requests_lab_id_fkey"
            columns: ["lab_id"]
            isOneToOne: false
            referencedRelation: "labs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_work_requests_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
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
      login_attempts: {
        Row: {
          attempted_at: string
          email: string
          id: string
          ip_address: string | null
          success: boolean
          user_agent: string | null
        }
        Insert: {
          attempted_at?: string
          email: string
          id?: string
          ip_address?: string | null
          success?: boolean
          user_agent?: string | null
        }
        Update: {
          attempted_at?: string
          email?: string
          id?: string
          ip_address?: string | null
          success?: boolean
          user_agent?: string | null
        }
        Relationships: []
      }
      note_likes: {
        Row: {
          created_at: string | null
          id: string
          note_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          note_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          note_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "note_likes_note_id_fkey"
            columns: ["note_id"]
            isOneToOne: false
            referencedRelation: "order_notes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "note_likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
      order_attachments: {
        Row: {
          attachment_category: string
          created_at: string | null
          file_name: string
          file_path: string
          file_size: number
          file_type: string
          id: string
          order_id: string
          updated_at: string | null
          uploaded_by: string
        }
        Insert: {
          attachment_category: string
          created_at?: string | null
          file_name: string
          file_path: string
          file_size: number
          file_type: string
          id?: string
          order_id: string
          updated_at?: string | null
          uploaded_by: string
        }
        Update: {
          attachment_category?: string
          created_at?: string | null
          file_name?: string
          file_path?: string
          file_size?: number
          file_type?: string
          id?: string
          order_id?: string
          updated_at?: string | null
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_attachments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      order_edit_history: {
        Row: {
          change_summary: string | null
          changed_at: string
          changed_by: string
          changed_fields: Json
          id: string
          order_id: string
        }
        Insert: {
          change_summary?: string | null
          changed_at?: string
          changed_by: string
          changed_fields: Json
          id?: string
          order_id: string
        }
        Update: {
          change_summary?: string | null
          changed_at?: string
          changed_by?: string
          changed_fields?: Json
          id?: string
          order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_changed_by"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_edit_history_order_id_fkey"
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
            foreignKeyName: "fk_changed_by_profile"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
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
          auto_assign_pending: boolean | null
          biological_notes: string | null
          carrier_name: string | null
          carrier_phone: string | null
          created_at: string
          delivery_date: string | null
          delivery_date_comment: string | null
          design_approved: boolean | null
          design_file_url: string | null
          desired_delivery_date: string | null
          doctor_id: string | null
          doctor_name: string
          driver_name: string | null
          driver_phone_whatsapp: string | null
          expected_delivery_date: string | null
          handling_instructions: string | null
          html_export: string | null
          id: string
          order_number: string
          patient_name: string
          photos_link: string | null
          pickup_time: string | null
          price: number | null
          proposed_delivery_date: string | null
          restoration_type: Database["public"]["Enums"]["restoration_type"]
          screenshot_url: string | null
          shade_system: string | null
          shipment_notes: string | null
          shipment_tracking: string | null
          status: Database["public"]["Enums"]["order_status"]
          status_updated_at: string | null
          teeth_number: string
          teeth_shade: string
          timestamp: string
          tracking_location: string | null
          updated_at: string
          urgency: Database["public"]["Enums"]["urgency_level"]
        }
        Insert: {
          actual_delivery_date?: string | null
          approval_notes?: string | null
          assigned_lab_id?: string | null
          auto_assign_pending?: boolean | null
          biological_notes?: string | null
          carrier_name?: string | null
          carrier_phone?: string | null
          created_at?: string
          delivery_date?: string | null
          delivery_date_comment?: string | null
          design_approved?: boolean | null
          design_file_url?: string | null
          desired_delivery_date?: string | null
          doctor_id?: string | null
          doctor_name: string
          driver_name?: string | null
          driver_phone_whatsapp?: string | null
          expected_delivery_date?: string | null
          handling_instructions?: string | null
          html_export?: string | null
          id?: string
          order_number: string
          patient_name: string
          photos_link?: string | null
          pickup_time?: string | null
          price?: number | null
          proposed_delivery_date?: string | null
          restoration_type: Database["public"]["Enums"]["restoration_type"]
          screenshot_url?: string | null
          shade_system?: string | null
          shipment_notes?: string | null
          shipment_tracking?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          status_updated_at?: string | null
          teeth_number: string
          teeth_shade: string
          timestamp?: string
          tracking_location?: string | null
          updated_at?: string
          urgency?: Database["public"]["Enums"]["urgency_level"]
        }
        Update: {
          actual_delivery_date?: string | null
          approval_notes?: string | null
          assigned_lab_id?: string | null
          auto_assign_pending?: boolean | null
          biological_notes?: string | null
          carrier_name?: string | null
          carrier_phone?: string | null
          created_at?: string
          delivery_date?: string | null
          delivery_date_comment?: string | null
          design_approved?: boolean | null
          design_file_url?: string | null
          desired_delivery_date?: string | null
          doctor_id?: string | null
          doctor_name?: string
          driver_name?: string | null
          driver_phone_whatsapp?: string | null
          expected_delivery_date?: string | null
          handling_instructions?: string | null
          html_export?: string | null
          id?: string
          order_number?: string
          patient_name?: string
          photos_link?: string | null
          pickup_time?: string | null
          price?: number | null
          proposed_delivery_date?: string | null
          restoration_type?: Database["public"]["Enums"]["restoration_type"]
          screenshot_url?: string | null
          shade_system?: string | null
          shipment_notes?: string | null
          shipment_tracking?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          status_updated_at?: string | null
          teeth_number?: string
          teeth_shade?: string
          timestamp?: string
          tracking_location?: string | null
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
      security_alerts: {
        Row: {
          alert_type: string
          created_at: string | null
          description: string
          id: string
          ip_address: string | null
          metadata: Json | null
          resolved: boolean | null
          resolved_at: string | null
          resolved_by: string | null
          severity: Database["public"]["Enums"]["alert_severity"]
          title: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          alert_type: string
          created_at?: string | null
          description: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          resolved?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity: Database["public"]["Enums"]["alert_severity"]
          title: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          alert_type?: string
          created_at?: string | null
          description?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          resolved?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: Database["public"]["Enums"]["alert_severity"]
          title?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      sensitive_data_access_log: {
        Row: {
          access_type: string
          accessed_record_id: string | null
          accessed_table: string
          created_at: string | null
          id: string
          ip_address: string | null
          query_details: Json | null
          records_count: number | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          access_type: string
          accessed_record_id?: string | null
          accessed_table: string
          created_at?: string | null
          id?: string
          ip_address?: string | null
          query_details?: Json | null
          records_count?: number | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          access_type?: string
          accessed_record_id?: string | null
          accessed_table?: string
          created_at?: string | null
          id?: string
          ip_address?: string | null
          query_details?: Json | null
          records_count?: number | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      user_achievements: {
        Row: {
          achievement_id: string
          earned_at: string
          id: string
          metadata: Json | null
          user_id: string
        }
        Insert: {
          achievement_id: string
          earned_at?: string
          id?: string
          metadata?: Json | null
          user_id: string
        }
        Update: {
          achievement_id?: string
          earned_at?: string
          id?: string
          metadata?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      user_badges: {
        Row: {
          badge_id: string
          earned_at: string
          id: string
          tier: string
          user_id: string
        }
        Insert: {
          badge_id: string
          earned_at?: string
          id?: string
          tier: string
          user_id: string
        }
        Update: {
          badge_id?: string
          earned_at?: string
          id?: string
          tier?: string
          user_id?: string
        }
        Relationships: []
      }
      user_challenges: {
        Row: {
          challenge_id: string
          challenge_type: string
          completed: boolean
          completed_at: string | null
          created_at: string
          expires_at: string
          id: string
          progress: number
          target: number
          user_id: string
        }
        Insert: {
          challenge_id: string
          challenge_type: string
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          expires_at: string
          id?: string
          progress?: number
          target: number
          user_id: string
        }
        Update: {
          challenge_id?: string
          challenge_type?: string
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          progress?: number
          target?: number
          user_id?: string
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
      check_and_award_achievement: {
        Args: { achievement_id_param: string; user_id_param?: string }
        Returns: boolean
      }
      check_and_award_badge: {
        Args: {
          p_badge_id: string
          p_required_count: number
          p_tier: string
          p_user_id: string
        }
        Returns: undefined
      }
      cleanup_old_login_attempts: { Args: never; Returns: undefined }
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
        Returns: string
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
      create_admin_notification: {
        Args: {
          category_param: string
          message_param: string
          metadata_param?: Json
          severity_param: string
          title_param: string
        }
        Returns: string
      }
      create_daily_challenges: { Args: never; Returns: undefined }
      create_monthly_challenges: { Args: never; Returns: undefined }
      create_security_alert: {
        Args: {
          alert_type_param: string
          description_param: string
          ip_address_param?: string
          metadata_param?: Json
          severity_param: Database["public"]["Enums"]["alert_severity"]
          title_param: string
          user_agent_param?: string
          user_id_param?: string
        }
        Returns: string
      }
      create_weekly_challenges: { Args: never; Returns: undefined }
      detect_suspicious_login_pattern: {
        Args: { ip_address_param: string; user_email_param: string }
        Returns: boolean
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
      is_account_locked: { Args: { user_email: string }; Returns: boolean }
      lab_was_refused_for_order: {
        Args: { _order_id: string; _user_id: string }
        Returns: boolean
      }
      log_audit_event: {
        Args: {
          action_type_param: string
          ip_address_param?: string
          metadata_param?: Json
          record_id_param?: string
          table_name_param: string
          user_agent_param?: string
        }
        Returns: string
      }
      log_sensitive_access: {
        Args: {
          access_type_param: string
          accessed_record_id_param?: string
          accessed_table_param: string
          ip_address_param?: string
          query_details_param?: Json
          records_count_param?: number
          user_agent_param?: string
        }
        Returns: string
      }
      set_user_role: {
        Args: {
          role_param: Database["public"]["Enums"]["app_role"]
          user_id_param: string
        }
        Returns: undefined
      }
      user_onboarding_completed: {
        Args: { _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      alert_severity: "low" | "medium" | "high" | "critical"
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
      alert_severity: ["low", "medium", "high", "critical"],
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
