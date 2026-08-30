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
      admin_impersonation_logs: {
        Row: {
          admin_user_id: string
          created_at: string
          ended_at: string | null
          id: string
          ip_address: string | null
          reason: string
          started_at: string
          target_user_id: string
          user_agent: string | null
        }
        Insert: {
          admin_user_id: string
          created_at?: string
          ended_at?: string | null
          id?: string
          ip_address?: string | null
          reason: string
          started_at?: string
          target_user_id: string
          user_agent?: string | null
        }
        Update: {
          admin_user_id?: string
          created_at?: string
          ended_at?: string | null
          id?: string
          ip_address?: string | null
          reason?: string
          started_at?: string
          target_user_id?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      admin_user_action_logs: {
        Row: {
          action_type: string
          admin_user_id: string
          created_at: string
          id: string
          ip_address: string | null
          new_status: string | null
          notes: string | null
          previous_status: string | null
          reason: string
          target_user_id: string
          user_agent: string | null
        }
        Insert: {
          action_type: string
          admin_user_id: string
          created_at?: string
          id?: string
          ip_address?: string | null
          new_status?: string | null
          notes?: string | null
          previous_status?: string | null
          reason: string
          target_user_id: string
          user_agent?: string | null
        }
        Update: {
          action_type?: string
          admin_user_id?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          new_status?: string | null
          notes?: string | null
          previous_status?: string | null
          reason?: string
          target_user_id?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      ai_audit_logs: {
        Row: {
          action: string
          conversation_id: string | null
          created_at: string
          details: Json | null
          id: string
          user_id: string | null
        }
        Insert: {
          action: string
          conversation_id?: string | null
          created_at?: string
          details?: Json | null
          id?: string
          user_id?: string | null
        }
        Update: {
          action?: string
          conversation_id?: string | null
          created_at?: string
          details?: Json | null
          id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_audit_logs_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "ai_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_conversations: {
        Row: {
          channel: string | null
          created_at: string
          id: string
          session_id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          channel?: string | null
          created_at?: string
          id?: string
          session_id: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          channel?: string | null
          created_at?: string
          id?: string
          session_id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_handoffs: {
        Row: {
          assigned_to: string | null
          conversation_id: string
          created_at: string
          id: string
          reason: string
          resolved_at: string | null
          status: string
        }
        Insert: {
          assigned_to?: string | null
          conversation_id: string
          created_at?: string
          id?: string
          reason: string
          resolved_at?: string | null
          status?: string
        }
        Update: {
          assigned_to?: string | null
          conversation_id?: string
          created_at?: string
          id?: string
          reason?: string
          resolved_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_handoffs_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "ai_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          role: string
          tool_calls: Json | null
          tool_used: string | null
        }
        Insert: {
          content?: string
          conversation_id: string
          created_at?: string
          id?: string
          role: string
          tool_calls?: Json | null
          tool_used?: string | null
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          role?: string
          tool_calls?: Json | null
          tool_used?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "ai_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      appointments: {
        Row: {
          appointment_type: string
          cancellation_reason: string | null
          created_at: string
          created_by: string | null
          dependent_id: string | null
          doctor_id: string
          duration_minutes: number
          end_time: string | null
          id: string
          medical_aid_request_id: string | null
          notes: string | null
          patient_email: string | null
          patient_id: string | null
          patient_name: string | null
          patient_phone: string | null
          payment_method_type: string | null
          pricing_tier_id: string | null
          pricing_tier_type:
            | Database["public"]["Enums"]["pricing_tier_type"]
            | null
          reason: string | null
          scheduled_at: string
          status: string
          updated_at: string
        }
        Insert: {
          appointment_type?: string
          cancellation_reason?: string | null
          created_at?: string
          created_by?: string | null
          dependent_id?: string | null
          doctor_id: string
          duration_minutes?: number
          end_time?: string | null
          id?: string
          medical_aid_request_id?: string | null
          notes?: string | null
          patient_email?: string | null
          patient_id?: string | null
          patient_name?: string | null
          patient_phone?: string | null
          payment_method_type?: string | null
          pricing_tier_id?: string | null
          pricing_tier_type?:
            | Database["public"]["Enums"]["pricing_tier_type"]
            | null
          reason?: string | null
          scheduled_at: string
          status?: string
          updated_at?: string
        }
        Update: {
          appointment_type?: string
          cancellation_reason?: string | null
          created_at?: string
          created_by?: string | null
          dependent_id?: string | null
          doctor_id?: string
          duration_minutes?: number
          end_time?: string | null
          id?: string
          medical_aid_request_id?: string | null
          notes?: string | null
          patient_email?: string | null
          patient_id?: string | null
          patient_name?: string | null
          patient_phone?: string | null
          payment_method_type?: string | null
          pricing_tier_id?: string | null
          pricing_tier_type?:
            | Database["public"]["Enums"]["pricing_tier_type"]
            | null
          reason?: string | null
          scheduled_at?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_dependent_id_fkey"
            columns: ["dependent_id"]
            isOneToOne: false
            referencedRelation: "dependents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_pricing_tier_id_fkey"
            columns: ["pricing_tier_id"]
            isOneToOne: false
            referencedRelation: "doctor_pricing_tiers"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          business_unit: Database["public"]["Enums"]["business_unit"]
          created_at: string
          details: Json | null
          id: string
          ip_address: string | null
          record_id: string | null
          table_name: string
          user_id: string
        }
        Insert: {
          action: string
          business_unit?: Database["public"]["Enums"]["business_unit"]
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          record_id?: string | null
          table_name: string
          user_id: string
        }
        Update: {
          action?: string
          business_unit?: Database["public"]["Enums"]["business_unit"]
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          record_id?: string | null
          table_name?: string
          user_id?: string
        }
        Relationships: []
      }
      booking_email_log: {
        Row: {
          appointment_id: string
          created_at: string
          email_type: string
          error: string | null
          id: string
          recipient: string
          resend_id: string | null
          status: string
        }
        Insert: {
          appointment_id: string
          created_at?: string
          email_type: string
          error?: string | null
          id?: string
          recipient: string
          resend_id?: string | null
          status?: string
        }
        Update: {
          appointment_id?: string
          created_at?: string
          email_type?: string
          error?: string | null
          id?: string
          recipient?: string
          resend_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_email_log_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
        ]
      }
      business_profiles: {
        Row: {
          address: string | null
          business_unit: Database["public"]["Enums"]["business_unit"]
          city: string | null
          country: string | null
          created_at: string
          doctor_id: string
          email: string | null
          id: string
          legal_name: string
          phone: string | null
          project_id: string | null
          province: string | null
          registration_number: string | null
          trading_name: string | null
          updated_at: string
          vat_number: string | null
          website: string | null
        }
        Insert: {
          address?: string | null
          business_unit?: Database["public"]["Enums"]["business_unit"]
          city?: string | null
          country?: string | null
          created_at?: string
          doctor_id: string
          email?: string | null
          id?: string
          legal_name: string
          phone?: string | null
          project_id?: string | null
          province?: string | null
          registration_number?: string | null
          trading_name?: string | null
          updated_at?: string
          vat_number?: string | null
          website?: string | null
        }
        Update: {
          address?: string | null
          business_unit?: Database["public"]["Enums"]["business_unit"]
          city?: string | null
          country?: string | null
          created_at?: string
          doctor_id?: string
          email?: string | null
          id?: string
          legal_name?: string
          phone?: string | null
          project_id?: string | null
          province?: string | null
          registration_number?: string | null
          trading_name?: string | null
          updated_at?: string
          vat_number?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_profiles_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_profiles_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "public_doctors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_profiles_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "digital_practice_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      consultation_categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          max_price: number
          min_price: number
          name: string
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          max_price: number
          min_price: number
          name: string
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          max_price?: number
          min_price?: number
          name?: string
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      consultation_messages: {
        Row: {
          appointment_id: string
          created_at: string
          id: string
          message: string
          read_at: string | null
          sender_id: string
          sender_role: string
        }
        Insert: {
          appointment_id: string
          created_at?: string
          id?: string
          message: string
          read_at?: string | null
          sender_id: string
          sender_role: string
        }
        Update: {
          appointment_id?: string
          created_at?: string
          id?: string
          message?: string
          read_at?: string | null
          sender_id?: string
          sender_role?: string
        }
        Relationships: [
          {
            foreignKeyName: "consultation_messages_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
        ]
      }
      consultation_notes: {
        Row: {
          appointment_id: string
          content: string
          created_at: string
          dependent_id: string | null
          doctor_id: string
          id: string
          summary: string | null
          updated_at: string
        }
        Insert: {
          appointment_id: string
          content?: string
          created_at?: string
          dependent_id?: string | null
          doctor_id: string
          id?: string
          summary?: string | null
          updated_at?: string
        }
        Update: {
          appointment_id?: string
          content?: string
          created_at?: string
          dependent_id?: string | null
          doctor_id?: string
          id?: string
          summary?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "consultation_notes_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: true
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
        ]
      }
      consultation_outcomes: {
        Row: {
          admin_attention_required: boolean
          appointment_id: string
          conduct_flag: string | null
          created_at: string
          doctor_id: string
          id: string
          internal_note: string | null
          outcome: string | null
          updated_at: string
        }
        Insert: {
          admin_attention_required?: boolean
          appointment_id: string
          conduct_flag?: string | null
          created_at?: string
          doctor_id: string
          id?: string
          internal_note?: string | null
          outcome?: string | null
          updated_at?: string
        }
        Update: {
          admin_attention_required?: boolean
          appointment_id?: string
          conduct_flag?: string | null
          created_at?: string
          doctor_id?: string
          id?: string
          internal_note?: string | null
          outcome?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "consultation_outcomes_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: true
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_enquiries: {
        Row: {
          assigned_to: string | null
          budget_range: string | null
          care_plan_interest: string | null
          company: string | null
          country: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          internal_notes: string | null
          message: string
          metadata: Json
          phone: string | null
          practice_name: string | null
          service_required: string | null
          source_page: string | null
          status: Database["public"]["Enums"]["enquiry_status"]
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          budget_range?: string | null
          care_plan_interest?: string | null
          company?: string | null
          country?: string | null
          created_at?: string
          email: string
          full_name: string
          id?: string
          internal_notes?: string | null
          message: string
          metadata?: Json
          phone?: string | null
          practice_name?: string | null
          service_required?: string | null
          source_page?: string | null
          status?: Database["public"]["Enums"]["enquiry_status"]
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          budget_range?: string | null
          care_plan_interest?: string | null
          company?: string | null
          country?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          internal_notes?: string | null
          message?: string
          metadata?: Json
          phone?: string | null
          practice_name?: string | null
          service_required?: string | null
          source_page?: string | null
          status?: Database["public"]["Enums"]["enquiry_status"]
          updated_at?: string
        }
        Relationships: []
      }
      contact_submissions: {
        Row: {
          created_at: string
          email: string
          id: string
          is_read: boolean
          message: string
          name: string
          subject: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          is_read?: boolean
          message: string
          name: string
          subject?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          is_read?: boolean
          message?: string
          name?: string
          subject?: string | null
        }
        Relationships: []
      }
      content_articles: {
        Row: {
          author_id: string | null
          body: string | null
          business_unit: Database["public"]["Enums"]["business_unit"]
          cover_image_url: string | null
          created_at: string
          excerpt: string | null
          id: string
          project_id: string | null
          published_at: string | null
          slug: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          author_id?: string | null
          body?: string | null
          business_unit?: Database["public"]["Enums"]["business_unit"]
          cover_image_url?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          project_id?: string | null
          published_at?: string | null
          slug: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string | null
          body?: string | null
          business_unit?: Database["public"]["Enums"]["business_unit"]
          cover_image_url?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          project_id?: string | null
          published_at?: string | null
          slug?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_articles_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_articles_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "digital_practice_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      countries: {
        Row: {
          code: string
          created_at: string
          currency_code: string
          currency_symbol: string
          is_active: boolean
          name: string
        }
        Insert: {
          code: string
          created_at?: string
          currency_code: string
          currency_symbol: string
          is_active?: boolean
          name: string
        }
        Update: {
          code?: string
          created_at?: string
          currency_code?: string
          currency_symbol?: string
          is_active?: boolean
          name?: string
        }
        Relationships: []
      }
      dependent_consents: {
        Row: {
          consent_text: string
          consent_type: string
          consent_version: string
          created_at: string
          dependent_id: string
          id: string
          ip_address: string | null
          user_id: string
        }
        Insert: {
          consent_text: string
          consent_type: string
          consent_version?: string
          created_at?: string
          dependent_id: string
          id?: string
          ip_address?: string | null
          user_id: string
        }
        Update: {
          consent_text?: string
          consent_type?: string
          consent_version?: string
          created_at?: string
          dependent_id?: string
          id?: string
          ip_address?: string | null
          user_id?: string
        }
        Relationships: []
      }
      dependents: {
        Row: {
          allergies: string | null
          allow_login: boolean
          chronic_conditions: string | null
          consent_accepted_at: string | null
          consent_version: string | null
          created_at: string
          date_of_birth: string
          email: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          full_name: string
          gender: string | null
          guardian_consent_accepted_at: string
          guardian_id: string
          id: string
          invitation_sent_at: string | null
          invitation_status: string
          invitation_token: string | null
          is_minor: boolean
          linked_user_id: string | null
          medical_notes: string | null
          phone: string | null
          relationship: string
          updated_at: string
        }
        Insert: {
          allergies?: string | null
          allow_login?: boolean
          chronic_conditions?: string | null
          consent_accepted_at?: string | null
          consent_version?: string | null
          created_at?: string
          date_of_birth: string
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          full_name: string
          gender?: string | null
          guardian_consent_accepted_at?: string
          guardian_id: string
          id?: string
          invitation_sent_at?: string | null
          invitation_status?: string
          invitation_token?: string | null
          is_minor?: boolean
          linked_user_id?: string | null
          medical_notes?: string | null
          phone?: string | null
          relationship: string
          updated_at?: string
        }
        Update: {
          allergies?: string | null
          allow_login?: boolean
          chronic_conditions?: string | null
          consent_accepted_at?: string | null
          consent_version?: string | null
          created_at?: string
          date_of_birth?: string
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          full_name?: string
          gender?: string | null
          guardian_consent_accepted_at?: string
          guardian_id?: string
          id?: string
          invitation_sent_at?: string | null
          invitation_status?: string
          invitation_token?: string | null
          is_minor?: boolean
          linked_user_id?: string | null
          medical_notes?: string | null
          phone?: string | null
          relationship?: string
          updated_at?: string
        }
        Relationships: []
      }
      digital_assets: {
        Row: {
          asset_type: string
          bucket: string
          business_unit: Database["public"]["Enums"]["business_unit"]
          created_at: string
          doctor_id: string | null
          id: string
          name: string
          project_id: string | null
          storage_path: string | null
          tags: string[]
          updated_at: string
          url: string | null
        }
        Insert: {
          asset_type?: string
          bucket?: string
          business_unit?: Database["public"]["Enums"]["business_unit"]
          created_at?: string
          doctor_id?: string | null
          id?: string
          name: string
          project_id?: string | null
          storage_path?: string | null
          tags?: string[]
          updated_at?: string
          url?: string | null
        }
        Update: {
          asset_type?: string
          bucket?: string
          business_unit?: Database["public"]["Enums"]["business_unit"]
          created_at?: string
          doctor_id?: string | null
          id?: string
          name?: string
          project_id?: string | null
          storage_path?: string | null
          tags?: string[]
          updated_at?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "digital_assets_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "digital_assets_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "public_doctors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "digital_assets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "digital_practice_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      digital_practice_projects: {
        Row: {
          account_manager: string | null
          business_unit: Database["public"]["Enums"]["business_unit"]
          created_at: string
          currency: string
          doctor_id: string
          id: string
          launch_date: string | null
          monthly_fee: number
          name: string
          notes: string | null
          package: string | null
          setup_fee: number
          start_date: string | null
          status: string
          updated_at: string
        }
        Insert: {
          account_manager?: string | null
          business_unit?: Database["public"]["Enums"]["business_unit"]
          created_at?: string
          currency?: string
          doctor_id: string
          id?: string
          launch_date?: string | null
          monthly_fee?: number
          name: string
          notes?: string | null
          package?: string | null
          setup_fee?: number
          start_date?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          account_manager?: string | null
          business_unit?: Database["public"]["Enums"]["business_unit"]
          created_at?: string
          currency?: string
          doctor_id?: string
          id?: string
          launch_date?: string | null
          monthly_fee?: number
          name?: string
          notes?: string | null
          package?: string | null
          setup_fee?: number
          start_date?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "digital_practice_projects_account_manager_fkey"
            columns: ["account_manager"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "digital_practice_projects_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "digital_practice_projects_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "public_doctors"
            referencedColumns: ["id"]
          },
        ]
      }
      doctor_availability: {
        Row: {
          created_at: string
          day_of_week: number
          doctor_id: string
          end_time: string
          id: string
          is_available: boolean | null
          slot_duration_minutes: number | null
          start_time: string
        }
        Insert: {
          created_at?: string
          day_of_week: number
          doctor_id: string
          end_time: string
          id?: string
          is_available?: boolean | null
          slot_duration_minutes?: number | null
          start_time: string
        }
        Update: {
          created_at?: string
          day_of_week?: number
          doctor_id?: string
          end_time?: string
          id?: string
          is_available?: boolean | null
          slot_duration_minutes?: number | null
          start_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "doctor_availability_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      doctor_billing: {
        Row: {
          account_holder_name: string | null
          account_number: string | null
          account_type: string | null
          bank_name: string | null
          bank_swift_code: string | null
          billing_type: string
          branch_code: string | null
          company_address: string | null
          company_email: string | null
          company_name: string | null
          company_phone: string | null
          company_registration_number: string | null
          company_vat_number: string | null
          created_at: string
          doctor_id: string
          id: string
          updated_at: string
        }
        Insert: {
          account_holder_name?: string | null
          account_number?: string | null
          account_type?: string | null
          bank_name?: string | null
          bank_swift_code?: string | null
          billing_type?: string
          branch_code?: string | null
          company_address?: string | null
          company_email?: string | null
          company_name?: string | null
          company_phone?: string | null
          company_registration_number?: string | null
          company_vat_number?: string | null
          created_at?: string
          doctor_id: string
          id?: string
          updated_at?: string
        }
        Update: {
          account_holder_name?: string | null
          account_number?: string | null
          account_type?: string | null
          bank_name?: string | null
          bank_swift_code?: string | null
          billing_type?: string
          branch_code?: string | null
          company_address?: string | null
          company_email?: string | null
          company_name?: string | null
          company_phone?: string | null
          company_registration_number?: string | null
          company_vat_number?: string | null
          created_at?: string
          doctor_id?: string
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "doctor_billing_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      doctor_blocked_times: {
        Row: {
          block_type: string
          created_at: string
          created_by: string | null
          doctor_id: string
          end_time: string
          id: string
          practice_id: string | null
          reason: string | null
          start_time: string
        }
        Insert: {
          block_type?: string
          created_at?: string
          created_by?: string | null
          doctor_id: string
          end_time: string
          id?: string
          practice_id?: string | null
          reason?: string | null
          start_time: string
        }
        Update: {
          block_type?: string
          created_at?: string
          created_by?: string | null
          doctor_id?: string
          end_time?: string
          id?: string
          practice_id?: string | null
          reason?: string | null
          start_time?: string
        }
        Relationships: []
      }
      doctor_digital_services: {
        Row: {
          completed_at: string | null
          created_at: string
          doctor_profile_id: string
          id: string
          notes: string | null
          requested_at: string
          service_type: string
          status: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          doctor_profile_id: string
          id?: string
          notes?: string | null
          requested_at?: string
          service_type: string
          status?: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          doctor_profile_id?: string
          id?: string
          notes?: string | null
          requested_at?: string
          service_type?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      doctor_medical_aids: {
        Row: {
          consultation_rate: number
          created_at: string
          default_copayment: number
          doctor_id: string
          id: string
          is_active: boolean
          plan: string | null
          requires_authorization: boolean
          scheme_name: string
          updated_at: string
        }
        Insert: {
          consultation_rate: number
          created_at?: string
          default_copayment?: number
          doctor_id: string
          id?: string
          is_active?: boolean
          plan?: string | null
          requires_authorization?: boolean
          scheme_name: string
          updated_at?: string
        }
        Update: {
          consultation_rate?: number
          created_at?: string
          default_copayment?: number
          doctor_id?: string
          id?: string
          is_active?: boolean
          plan?: string | null
          requires_authorization?: boolean
          scheme_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      doctor_onboarding_email_log: {
        Row: {
          clicked_at: string | null
          completed_after_reminder: boolean | null
          created_by: string | null
          delivered_at: string | null
          doctor_name: string | null
          doctor_profile_id: string
          email_type: string
          error: string | null
          id: string
          opened_at: string | null
          recipient: string
          reminder_id: string | null
          resend_id: string | null
          sent_at: string
          status: string
          subject: string
        }
        Insert: {
          clicked_at?: string | null
          completed_after_reminder?: boolean | null
          created_by?: string | null
          delivered_at?: string | null
          doctor_name?: string | null
          doctor_profile_id: string
          email_type: string
          error?: string | null
          id?: string
          opened_at?: string | null
          recipient: string
          reminder_id?: string | null
          resend_id?: string | null
          sent_at?: string
          status?: string
          subject: string
        }
        Update: {
          clicked_at?: string | null
          completed_after_reminder?: boolean | null
          created_by?: string | null
          delivered_at?: string | null
          doctor_name?: string | null
          doctor_profile_id?: string
          email_type?: string
          error?: string | null
          id?: string
          opened_at?: string | null
          recipient?: string
          reminder_id?: string | null
          resend_id?: string | null
          sent_at?: string
          status?: string
          subject?: string
        }
        Relationships: [
          {
            foreignKeyName: "doctor_onboarding_email_log_reminder_id_fkey"
            columns: ["reminder_id"]
            isOneToOne: false
            referencedRelation: "doctor_onboarding_reminders"
            referencedColumns: ["id"]
          },
        ]
      }
      doctor_onboarding_reminders: {
        Row: {
          body: string
          created_at: string
          delay_minutes: number
          id: string
          is_active: boolean
          name: string
          sort_order: number
          subject: string
          updated_at: string
        }
        Insert: {
          body: string
          created_at?: string
          delay_minutes: number
          id?: string
          is_active?: boolean
          name: string
          sort_order?: number
          subject: string
          updated_at?: string
        }
        Update: {
          body?: string
          created_at?: string
          delay_minutes?: number
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number
          subject?: string
          updated_at?: string
        }
        Relationships: []
      }
      doctor_pricing_tiers: {
        Row: {
          created_at: string
          description: string | null
          doctor_id: string
          duration_minutes: number
          id: string
          is_active: boolean | null
          name: string
          price: number
          tier_type: Database["public"]["Enums"]["pricing_tier_type"] | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          doctor_id: string
          duration_minutes?: number
          id?: string
          is_active?: boolean | null
          name: string
          price: number
          tier_type?: Database["public"]["Enums"]["pricing_tier_type"] | null
        }
        Update: {
          created_at?: string
          description?: string | null
          doctor_id?: string
          duration_minutes?: number
          id?: string
          is_active?: boolean | null
          name?: string
          price?: number
          tier_type?: Database["public"]["Enums"]["pricing_tier_type"] | null
        }
        Relationships: [
          {
            foreignKeyName: "doctor_pricing_tiers_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      doctor_profile_changes: {
        Row: {
          created_at: string
          doctor_id: string
          field_name: string
          id: string
          info_request_message: string | null
          new_value: Json | null
          old_value: Json | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["profile_change_status"]
        }
        Insert: {
          created_at?: string
          doctor_id: string
          field_name: string
          id?: string
          info_request_message?: string | null
          new_value?: Json | null
          old_value?: Json | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["profile_change_status"]
        }
        Update: {
          created_at?: string
          doctor_id?: string
          field_name?: string
          id?: string
          info_request_message?: string | null
          new_value?: Json | null
          old_value?: Json | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["profile_change_status"]
        }
        Relationships: []
      }
      doctors: {
        Row: {
          accepted_payment_method: Database["public"]["Enums"]["accepted_payment_method_enum"]
          assigned_business_developer: string | null
          auto_weekly_payout: boolean
          bio: string | null
          consultation_category_id: string | null
          consultation_fee: number | null
          created_at: string
          education: string | null
          experience_years: number | null
          fee_settings_id: string | null
          founding_doctor_since: string | null
          founding_expiry: string | null
          founding_locked: boolean
          founding_pricing_plan_id: string | null
          founding_sequence: number | null
          founding_status: string
          founding_tier: string
          hospital_affiliation: string | null
          id: string
          id_document_path: string | null
          is_available: boolean | null
          is_founding_doctor: boolean
          is_suspended: boolean
          is_verified: boolean
          languages: string[] | null
          license_document_path: string | null
          license_number: string | null
          practice_address: string | null
          practice_email: string | null
          practice_id: string | null
          practice_logo_url: string | null
          practice_name: string | null
          practice_phone: string | null
          practice_signature_url: string | null
          practice_website: string | null
          profile_id: string
          rating: number | null
          recruitment_source: string | null
          specialty_id: string | null
          suspension_reason: string | null
          title: string | null
          total_reviews: number | null
          updated_at: string
          welcome_email_sent_at: string | null
        }
        Insert: {
          accepted_payment_method?: Database["public"]["Enums"]["accepted_payment_method_enum"]
          assigned_business_developer?: string | null
          auto_weekly_payout?: boolean
          bio?: string | null
          consultation_category_id?: string | null
          consultation_fee?: number | null
          created_at?: string
          education?: string | null
          experience_years?: number | null
          fee_settings_id?: string | null
          founding_doctor_since?: string | null
          founding_expiry?: string | null
          founding_locked?: boolean
          founding_pricing_plan_id?: string | null
          founding_sequence?: number | null
          founding_status?: string
          founding_tier?: string
          hospital_affiliation?: string | null
          id?: string
          id_document_path?: string | null
          is_available?: boolean | null
          is_founding_doctor?: boolean
          is_suspended?: boolean
          is_verified?: boolean
          languages?: string[] | null
          license_document_path?: string | null
          license_number?: string | null
          practice_address?: string | null
          practice_email?: string | null
          practice_id?: string | null
          practice_logo_url?: string | null
          practice_name?: string | null
          practice_phone?: string | null
          practice_signature_url?: string | null
          practice_website?: string | null
          profile_id: string
          rating?: number | null
          recruitment_source?: string | null
          specialty_id?: string | null
          suspension_reason?: string | null
          title?: string | null
          total_reviews?: number | null
          updated_at?: string
          welcome_email_sent_at?: string | null
        }
        Update: {
          accepted_payment_method?: Database["public"]["Enums"]["accepted_payment_method_enum"]
          assigned_business_developer?: string | null
          auto_weekly_payout?: boolean
          bio?: string | null
          consultation_category_id?: string | null
          consultation_fee?: number | null
          created_at?: string
          education?: string | null
          experience_years?: number | null
          fee_settings_id?: string | null
          founding_doctor_since?: string | null
          founding_expiry?: string | null
          founding_locked?: boolean
          founding_pricing_plan_id?: string | null
          founding_sequence?: number | null
          founding_status?: string
          founding_tier?: string
          hospital_affiliation?: string | null
          id?: string
          id_document_path?: string | null
          is_available?: boolean | null
          is_founding_doctor?: boolean
          is_suspended?: boolean
          is_verified?: boolean
          languages?: string[] | null
          license_document_path?: string | null
          license_number?: string | null
          practice_address?: string | null
          practice_email?: string | null
          practice_id?: string | null
          practice_logo_url?: string | null
          practice_name?: string | null
          practice_phone?: string | null
          practice_signature_url?: string | null
          practice_website?: string | null
          profile_id?: string
          rating?: number | null
          recruitment_source?: string | null
          specialty_id?: string | null
          suspension_reason?: string | null
          title?: string | null
          total_reviews?: number | null
          updated_at?: string
          welcome_email_sent_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "doctors_consultation_category_id_fkey"
            columns: ["consultation_category_id"]
            isOneToOne: false
            referencedRelation: "consultation_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "doctors_fee_settings_id_fkey"
            columns: ["fee_settings_id"]
            isOneToOne: false
            referencedRelation: "platform_fee_settings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "doctors_founding_pricing_plan_id_fkey"
            columns: ["founding_pricing_plan_id"]
            isOneToOne: false
            referencedRelation: "platform_fee_settings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "doctors_practice_id_fkey"
            columns: ["practice_id"]
            isOneToOne: false
            referencedRelation: "practices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "doctors_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "doctors_specialty_id_fkey"
            columns: ["specialty_id"]
            isOneToOne: false
            referencedRelation: "specialties"
            referencedColumns: ["id"]
          },
        ]
      }
      document_sharing: {
        Row: {
          appointment_id: string
          created_at: string
          doctor_id: string
          id: string
          is_active: boolean
          patient_id: string
        }
        Insert: {
          appointment_id: string
          created_at?: string
          doctor_id: string
          id?: string
          is_active?: boolean
          patient_id: string
        }
        Update: {
          appointment_id?: string
          created_at?: string
          doctor_id?: string
          id?: string
          is_active?: boolean
          patient_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_sharing_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_sharing_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_sharing_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      domain_registrations: {
        Row: {
          annual_fee: number
          auto_renew: boolean
          business_unit: Database["public"]["Enums"]["business_unit"]
          created_at: string
          currency: string
          domain_name: string
          expires_on: string | null
          id: string
          project_id: string
          registered_on: string | null
          registrar: string | null
          status: string
          updated_at: string
        }
        Insert: {
          annual_fee?: number
          auto_renew?: boolean
          business_unit?: Database["public"]["Enums"]["business_unit"]
          created_at?: string
          currency?: string
          domain_name: string
          expires_on?: string | null
          id?: string
          project_id: string
          registered_on?: string | null
          registrar?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          annual_fee?: number
          auto_renew?: boolean
          business_unit?: Database["public"]["Enums"]["business_unit"]
          created_at?: string
          currency?: string
          domain_name?: string
          expires_on?: string | null
          id?: string
          project_id?: string
          registered_on?: string | null
          registrar?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "domain_registrations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "digital_practice_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      email_accounts: {
        Row: {
          business_unit: Database["public"]["Enums"]["business_unit"]
          created_at: string
          email_address: string
          hosting_account_id: string | null
          id: string
          mailbox_size_mb: number
          monthly_fee: number
          project_id: string
          status: string
          updated_at: string
        }
        Insert: {
          business_unit?: Database["public"]["Enums"]["business_unit"]
          created_at?: string
          email_address: string
          hosting_account_id?: string | null
          id?: string
          mailbox_size_mb?: number
          monthly_fee?: number
          project_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          business_unit?: Database["public"]["Enums"]["business_unit"]
          created_at?: string
          email_address?: string
          hosting_account_id?: string | null
          id?: string
          mailbox_size_mb?: number
          monthly_fee?: number
          project_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_accounts_hosting_account_id_fkey"
            columns: ["hosting_account_id"]
            isOneToOne: false
            referencedRelation: "hosting_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_accounts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "digital_practice_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      email_events: {
        Row: {
          created_at: string
          email: string
          event_type: string
          id: string
          message_id: string | null
          metadata: Json | null
        }
        Insert: {
          created_at?: string
          email: string
          event_type: string
          id?: string
          message_id?: string | null
          metadata?: Json | null
        }
        Update: {
          created_at?: string
          email?: string
          event_type?: string
          id?: string
          message_id?: string | null
          metadata?: Json | null
        }
        Relationships: []
      }
      expense_categories: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          parent_group: string
          slug: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          parent_group?: string
          slug: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          parent_group?: string
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount: number
          category_id: string | null
          created_at: string
          created_by: string | null
          currency: string
          description: string
          expense_date: string
          id: string
          notes: string | null
          payment_method: string | null
          receipt_path: string | null
          recurring_expense_id: string | null
          status: string
          supplier: string | null
          tax_deductible: boolean
          updated_at: string
          vat_amount: number
        }
        Insert: {
          amount: number
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          description: string
          expense_date?: string
          id?: string
          notes?: string | null
          payment_method?: string | null
          receipt_path?: string | null
          recurring_expense_id?: string | null
          status?: string
          supplier?: string | null
          tax_deductible?: boolean
          updated_at?: string
          vat_amount?: number
        }
        Update: {
          amount?: number
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          description?: string
          expense_date?: string
          id?: string
          notes?: string | null
          payment_method?: string | null
          receipt_path?: string | null
          recurring_expense_id?: string | null
          status?: string
          supplier?: string | null
          tax_deductible?: boolean
          updated_at?: string
          vat_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "expenses_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "expense_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_recurring_expense_id_fkey"
            columns: ["recurring_expense_id"]
            isOneToOne: false
            referencedRelation: "recurring_expenses"
            referencedColumns: ["id"]
          },
        ]
      }
      faq_articles: {
        Row: {
          answer: string | null
          category: string
          content: string
          created_at: string
          id: string
          is_published: boolean
          keywords: string[] | null
          question: string | null
          slug: string | null
          sort_order: number | null
          title: string
          updated_at: string
        }
        Insert: {
          answer?: string | null
          category?: string
          content: string
          created_at?: string
          id?: string
          is_published?: boolean
          keywords?: string[] | null
          question?: string | null
          slug?: string | null
          sort_order?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          answer?: string | null
          category?: string
          content?: string
          created_at?: string
          id?: string
          is_published?: boolean
          keywords?: string[] | null
          question?: string | null
          slug?: string | null
          sort_order?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      faqs: {
        Row: {
          answer: string
          category: string | null
          created_at: string
          id: string
          question: string
          sort_order: number | null
        }
        Insert: {
          answer: string
          category?: string | null
          created_at?: string
          id?: string
          question: string
          sort_order?: number | null
        }
        Update: {
          answer?: string
          category?: string | null
          created_at?: string
          id?: string
          question?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      financial_currency_conversions: {
        Row: {
          conversion_method: string
          conversion_note: string | null
          converted_amount: number
          converted_by: string | null
          converted_currency: string
          created_at: string
          exchange_rate: number
          id: string
          include_in_totals: boolean
          original_amount: number
          original_currency: string
          payment_id: string
          updated_at: string
        }
        Insert: {
          conversion_method?: string
          conversion_note?: string | null
          converted_amount?: number
          converted_by?: string | null
          converted_currency?: string
          created_at?: string
          exchange_rate?: number
          id?: string
          include_in_totals?: boolean
          original_amount: number
          original_currency: string
          payment_id: string
          updated_at?: string
        }
        Update: {
          conversion_method?: string
          conversion_note?: string | null
          converted_amount?: number
          converted_by?: string | null
          converted_currency?: string
          created_at?: string
          exchange_rate?: number
          id?: string
          include_in_totals?: boolean
          original_amount?: number
          original_currency?: string
          payment_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_currency_conversions_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: true
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_recalculation_logs: {
        Row: {
          admin_user_id: string
          created_at: string
          id: string
          new_processing_fee_percentage: number
          notes: string | null
          old_processing_fee_percentage: number | null
          payment_ids: string[] | null
          payments_updated: number
          recalculation_date: string
          scope: string
        }
        Insert: {
          admin_user_id: string
          created_at?: string
          id?: string
          new_processing_fee_percentage: number
          notes?: string | null
          old_processing_fee_percentage?: number | null
          payment_ids?: string[] | null
          payments_updated?: number
          recalculation_date?: string
          scope: string
        }
        Update: {
          admin_user_id?: string
          created_at?: string
          id?: string
          new_processing_fee_percentage?: number
          notes?: string | null
          old_processing_fee_percentage?: number | null
          payment_ids?: string[] | null
          payments_updated?: number
          recalculation_date?: string
          scope?: string
        }
        Relationships: []
      }
      founding_doctor_applications: {
        Row: {
          availability: string | null
          created_at: string
          doctor_id: string
          id: string
          motivation: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          specialty: string | null
          status: string
          updated_at: string
          years_experience: number | null
        }
        Insert: {
          availability?: string | null
          created_at?: string
          doctor_id: string
          id?: string
          motivation?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          specialty?: string | null
          status?: string
          updated_at?: string
          years_experience?: number | null
        }
        Update: {
          availability?: string | null
          created_at?: string
          doctor_id?: string
          id?: string
          motivation?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          specialty?: string | null
          status?: string
          updated_at?: string
          years_experience?: number | null
        }
        Relationships: []
      }
      founding_doctor_program: {
        Row: {
          applications_open: boolean
          auto_close_founding: boolean
          auto_close_pioneer: boolean
          created_at: string
          default_fee_settings_id: string | null
          founding_copy: string | null
          founding_limit: number
          id: string
          marketing_description: string | null
          marketing_headline: string | null
          max_slots: number
          pioneer_copy: string | null
          pioneer_limit: number
          program_label: string
          programme_enabled: boolean
          updated_at: string
          waiting_list_enabled: boolean
        }
        Insert: {
          applications_open?: boolean
          auto_close_founding?: boolean
          auto_close_pioneer?: boolean
          created_at?: string
          default_fee_settings_id?: string | null
          founding_copy?: string | null
          founding_limit?: number
          id?: string
          marketing_description?: string | null
          marketing_headline?: string | null
          max_slots?: number
          pioneer_copy?: string | null
          pioneer_limit?: number
          program_label?: string
          programme_enabled?: boolean
          updated_at?: string
          waiting_list_enabled?: boolean
        }
        Update: {
          applications_open?: boolean
          auto_close_founding?: boolean
          auto_close_pioneer?: boolean
          created_at?: string
          default_fee_settings_id?: string | null
          founding_copy?: string | null
          founding_limit?: number
          id?: string
          marketing_description?: string | null
          marketing_headline?: string | null
          max_slots?: number
          pioneer_copy?: string | null
          pioneer_limit?: number
          program_label?: string
          programme_enabled?: boolean
          updated_at?: string
          waiting_list_enabled?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "founding_doctor_program_default_fee_settings_id_fkey"
            columns: ["default_fee_settings_id"]
            isOneToOne: false
            referencedRelation: "platform_fee_settings"
            referencedColumns: ["id"]
          },
        ]
      }
      founding_exit_policy: {
        Row: {
          commitment_months: number
          created_at: string
          founding_contribution: number
          id: string
          policy_notes: string | null
          standard_practice_value: number
          updated_at: string
        }
        Insert: {
          commitment_months?: number
          created_at?: string
          founding_contribution?: number
          id?: string
          policy_notes?: string | null
          standard_practice_value?: number
          updated_at?: string
        }
        Update: {
          commitment_months?: number
          created_at?: string
          founding_contribution?: number
          id?: string
          policy_notes?: string | null
          standard_practice_value?: number
          updated_at?: string
        }
        Relationships: []
      }
      founding_programme_pricing: {
        Row: {
          created_at: string
          currency: string
          founding_setup_fee: number
          id: string
          monthly_care_plan: number
          pioneer_setup_fee: number
          standard_setup_fee: number
          updated_at: string
          vat_enabled: boolean
          vat_rate: number
        }
        Insert: {
          created_at?: string
          currency?: string
          founding_setup_fee?: number
          id?: string
          monthly_care_plan?: number
          pioneer_setup_fee?: number
          standard_setup_fee?: number
          updated_at?: string
          vat_enabled?: boolean
          vat_rate?: number
        }
        Update: {
          created_at?: string
          currency?: string
          founding_setup_fee?: number
          id?: string
          monthly_care_plan?: number
          pioneer_setup_fee?: number
          standard_setup_fee?: number
          updated_at?: string
          vat_enabled?: boolean
          vat_rate?: number
        }
        Relationships: []
      }
      google_business_profiles: {
        Row: {
          business_unit: Database["public"]["Enums"]["business_unit"]
          category: string | null
          created_at: string
          id: string
          listing_name: string
          listing_url: string | null
          project_id: string
          rating: number | null
          review_count: number
          updated_at: string
          verification_status: string
        }
        Insert: {
          business_unit?: Database["public"]["Enums"]["business_unit"]
          category?: string | null
          created_at?: string
          id?: string
          listing_name: string
          listing_url?: string | null
          project_id: string
          rating?: number | null
          review_count?: number
          updated_at?: string
          verification_status?: string
        }
        Update: {
          business_unit?: Database["public"]["Enums"]["business_unit"]
          category?: string | null
          created_at?: string
          id?: string
          listing_name?: string
          listing_url?: string | null
          project_id?: string
          rating?: number | null
          review_count?: number
          updated_at?: string
          verification_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "google_business_profiles_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "digital_practice_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      hero_stats: {
        Row: {
          created_at: string
          icon: string | null
          id: string
          label: string
          sort_order: number | null
          value: string
        }
        Insert: {
          created_at?: string
          icon?: string | null
          id?: string
          label: string
          sort_order?: number | null
          value: string
        }
        Update: {
          created_at?: string
          icon?: string | null
          id?: string
          label?: string
          sort_order?: number | null
          value?: string
        }
        Relationships: []
      }
      hosting_accounts: {
        Row: {
          business_unit: Database["public"]["Enums"]["business_unit"]
          created_at: string
          currency: string
          id: string
          monthly_fee: number
          plan: string | null
          project_id: string
          provider: string
          renews_on: string | null
          server: string | null
          status: string
          updated_at: string
          username: string | null
        }
        Insert: {
          business_unit?: Database["public"]["Enums"]["business_unit"]
          created_at?: string
          currency?: string
          id?: string
          monthly_fee?: number
          plan?: string | null
          project_id: string
          provider: string
          renews_on?: string | null
          server?: string | null
          status?: string
          updated_at?: string
          username?: string | null
        }
        Update: {
          business_unit?: Database["public"]["Enums"]["business_unit"]
          created_at?: string
          currency?: string
          id?: string
          monthly_fee?: number
          plan?: string | null
          project_id?: string
          provider?: string
          renews_on?: string | null
          server?: string | null
          status?: string
          updated_at?: string
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hosting_accounts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "digital_practice_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      landing_pages: {
        Row: {
          business_unit: Database["public"]["Enums"]["business_unit"]
          conversion_goal: string | null
          conversions: number
          created_at: string
          id: string
          project_id: string | null
          slug: string
          status: string
          title: string
          updated_at: string
          url: string | null
          views: number
        }
        Insert: {
          business_unit?: Database["public"]["Enums"]["business_unit"]
          conversion_goal?: string | null
          conversions?: number
          created_at?: string
          id?: string
          project_id?: string | null
          slug: string
          status?: string
          title: string
          updated_at?: string
          url?: string | null
          views?: number
        }
        Update: {
          business_unit?: Database["public"]["Enums"]["business_unit"]
          conversion_goal?: string | null
          conversions?: number
          created_at?: string
          id?: string
          project_id?: string | null
          slug?: string
          status?: string
          title?: string
          updated_at?: string
          url?: string | null
          views?: number
        }
        Relationships: [
          {
            foreignKeyName: "landing_pages_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "digital_practice_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_documents: {
        Row: {
          country_code: string | null
          created_at: string
          document_type: string
          heading: string
          id: string
          is_default: boolean
          last_updated: string
          sections: Json
          updated_at: string
        }
        Insert: {
          country_code?: string | null
          created_at?: string
          document_type: string
          heading: string
          id?: string
          is_default?: boolean
          last_updated?: string
          sections?: Json
          updated_at?: string
        }
        Update: {
          country_code?: string | null
          created_at?: string
          document_type?: string
          heading?: string
          id?: string
          is_default?: boolean
          last_updated?: string
          sections?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "legal_documents_country_code_fkey"
            columns: ["country_code"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["code"]
          },
        ]
      }
      maintenance_plans: {
        Row: {
          business_unit: Database["public"]["Enums"]["business_unit"]
          created_at: string
          id: string
          included_hours: number
          monthly_fee: number
          plan_name: string
          project_id: string
          renews_on: string | null
          status: string
          updated_at: string
        }
        Insert: {
          business_unit?: Database["public"]["Enums"]["business_unit"]
          created_at?: string
          id?: string
          included_hours?: number
          monthly_fee?: number
          plan_name: string
          project_id: string
          renews_on?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          business_unit?: Database["public"]["Enums"]["business_unit"]
          created_at?: string
          id?: string
          included_hours?: number
          monthly_fee?: number
          plan_name?: string
          project_id?: string
          renews_on?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_plans_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "digital_practice_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      media_assets: {
        Row: {
          alt_text: string | null
          bucket: string
          created_at: string
          file_name: string
          file_size: number | null
          height: number | null
          id: string
          is_public: boolean
          mime_type: string | null
          path: string
          updated_at: string
          uploaded_by: string | null
          width: number | null
        }
        Insert: {
          alt_text?: string | null
          bucket?: string
          created_at?: string
          file_name: string
          file_size?: number | null
          height?: number | null
          id?: string
          is_public?: boolean
          mime_type?: string | null
          path: string
          updated_at?: string
          uploaded_by?: string | null
          width?: number | null
        }
        Update: {
          alt_text?: string | null
          bucket?: string
          created_at?: string
          file_name?: string
          file_size?: number | null
          height?: number | null
          id?: string
          is_public?: boolean
          mime_type?: string | null
          path?: string
          updated_at?: string
          uploaded_by?: string | null
          width?: number | null
        }
        Relationships: []
      }
      medical_aid_requests: {
        Row: {
          appointment_id: string | null
          approved_rate: number | null
          copayment_amount: number | null
          created_at: string
          dependent_code: string | null
          dependent_id: string | null
          doctor_id: string
          doctor_notes: string | null
          id: string
          main_member_name: string
          membership_number: string
          patient_id: string
          plan: string | null
          scheme_name: string
          status: string
          updated_at: string
        }
        Insert: {
          appointment_id?: string | null
          approved_rate?: number | null
          copayment_amount?: number | null
          created_at?: string
          dependent_code?: string | null
          dependent_id?: string | null
          doctor_id: string
          doctor_notes?: string | null
          id?: string
          main_member_name: string
          membership_number: string
          patient_id: string
          plan?: string | null
          scheme_name: string
          status?: string
          updated_at?: string
        }
        Update: {
          appointment_id?: string | null
          approved_rate?: number | null
          copayment_amount?: number | null
          created_at?: string
          dependent_code?: string | null
          dependent_id?: string | null
          doctor_id?: string
          doctor_notes?: string | null
          id?: string
          main_member_name?: string
          membership_number?: string
          patient_id?: string
          plan?: string | null
          scheme_name?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      nalavation_audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          actor_name: string | null
          created_at: string
          id: string
          ip_address: string | null
          new_values: Json | null
          previous_values: Json | null
          resource_id: string | null
          resource_type: string | null
          user_agent: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_name?: string | null
          created_at?: string
          id?: string
          ip_address?: string | null
          new_values?: Json | null
          previous_values?: Json | null
          resource_id?: string | null
          resource_type?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_name?: string | null
          created_at?: string
          id?: string
          ip_address?: string | null
          new_values?: Json | null
          previous_values?: Json | null
          resource_id?: string | null
          resource_type?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      nalavation_domain_services: {
        Row: {
          annual_amount: number
          auto_renew: boolean
          created_at: string
          domain: string
          expires_on: string | null
          id: string
          notes: string | null
          owner_user_id: string | null
          project_id: string | null
          registrar: string
          status: string
          updated_at: string
        }
        Insert: {
          annual_amount?: number
          auto_renew?: boolean
          created_at?: string
          domain: string
          expires_on?: string | null
          id?: string
          notes?: string | null
          owner_user_id?: string | null
          project_id?: string | null
          registrar?: string
          status?: string
          updated_at?: string
        }
        Update: {
          annual_amount?: number
          auto_renew?: boolean
          created_at?: string
          domain?: string
          expires_on?: string | null
          id?: string
          notes?: string | null
          owner_user_id?: string | null
          project_id?: string | null
          registrar?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "nalavation_domain_services_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "nalavation_website_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      nalavation_hosting_services: {
        Row: {
          created_at: string
          id: string
          monthly_amount: number
          notes: string | null
          owner_user_id: string | null
          plan: string
          practice_name: string
          project_id: string | null
          provider: string
          renews_on: string | null
          ssl_status: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          monthly_amount?: number
          notes?: string | null
          owner_user_id?: string | null
          plan?: string
          practice_name?: string
          project_id?: string | null
          provider?: string
          renews_on?: string | null
          ssl_status?: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          monthly_amount?: number
          notes?: string | null
          owner_user_id?: string | null
          plan?: string
          practice_name?: string
          project_id?: string | null
          provider?: string
          renews_on?: string | null
          ssl_status?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "nalavation_hosting_services_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "nalavation_website_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      nalavation_invoices: {
        Row: {
          context: string
          created_at: string
          currency: string
          customer_email: string
          customer_name: string
          customer_user_id: string | null
          description: string
          due_date: string | null
          id: string
          invoice_number: string
          notes: string | null
          paid_at: string | null
          practice_name: string | null
          project_id: string | null
          request_id: string | null
          status: string
          subtotal: number
          total: number
          updated_at: string
          vat: number
        }
        Insert: {
          context?: string
          created_at?: string
          currency?: string
          customer_email?: string
          customer_name?: string
          customer_user_id?: string | null
          description?: string
          due_date?: string | null
          id?: string
          invoice_number: string
          notes?: string | null
          paid_at?: string | null
          practice_name?: string | null
          project_id?: string | null
          request_id?: string | null
          status?: string
          subtotal?: number
          total?: number
          updated_at?: string
          vat?: number
        }
        Update: {
          context?: string
          created_at?: string
          currency?: string
          customer_email?: string
          customer_name?: string
          customer_user_id?: string | null
          description?: string
          due_date?: string | null
          id?: string
          invoice_number?: string
          notes?: string | null
          paid_at?: string | null
          practice_name?: string | null
          project_id?: string | null
          request_id?: string | null
          status?: string
          subtotal?: number
          total?: number
          updated_at?: string
          vat?: number
        }
        Relationships: [
          {
            foreignKeyName: "nalavation_invoices_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "nalavation_website_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nalavation_invoices_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "nalavation_service_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      nalavation_service_payments: {
        Row: {
          amount: number
          context: string
          created_at: string
          currency: string
          customer_email: string
          customer_name: string
          description: string
          gateway: string
          id: string
          invoice_id: string | null
          m_payment_id: string | null
          mode: string
          paid_at: string | null
          pf_payment_id: string | null
          request_id: string | null
          service_code: string | null
          status: string
          subscription_id: string | null
          updated_at: string
        }
        Insert: {
          amount?: number
          context?: string
          created_at?: string
          currency?: string
          customer_email?: string
          customer_name?: string
          description?: string
          gateway?: string
          id?: string
          invoice_id?: string | null
          m_payment_id?: string | null
          mode?: string
          paid_at?: string | null
          pf_payment_id?: string | null
          request_id?: string | null
          service_code?: string | null
          status?: string
          subscription_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          context?: string
          created_at?: string
          currency?: string
          customer_email?: string
          customer_name?: string
          description?: string
          gateway?: string
          id?: string
          invoice_id?: string | null
          m_payment_id?: string | null
          mode?: string
          paid_at?: string | null
          pf_payment_id?: string | null
          request_id?: string | null
          service_code?: string | null
          status?: string
          subscription_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "nalavation_service_payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "nalavation_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nalavation_service_payments_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "nalavation_service_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nalavation_service_payments_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "payfast_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      nalavation_service_requests: {
        Row: {
          amount: number
          billing_cycle: string
          business_unit: Database["public"]["Enums"]["business_unit"]
          category: string | null
          contact_email: string
          contact_name: string
          contact_phone: string | null
          created_at: string
          currency: string
          external_ref: string | null
          id: string
          notes: string | null
          practice_name: string | null
          project_id: string | null
          requester_user_id: string | null
          service_code: string | null
          service_name: string
          source_platform: string
          status: string
          updated_at: string
        }
        Insert: {
          amount?: number
          billing_cycle?: string
          business_unit?: Database["public"]["Enums"]["business_unit"]
          category?: string | null
          contact_email?: string
          contact_name?: string
          contact_phone?: string | null
          created_at?: string
          currency?: string
          external_ref?: string | null
          id?: string
          notes?: string | null
          practice_name?: string | null
          project_id?: string | null
          requester_user_id?: string | null
          service_code?: string | null
          service_name: string
          source_platform?: string
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          billing_cycle?: string
          business_unit?: Database["public"]["Enums"]["business_unit"]
          category?: string | null
          contact_email?: string
          contact_name?: string
          contact_phone?: string | null
          created_at?: string
          currency?: string
          external_ref?: string | null
          id?: string
          notes?: string | null
          practice_name?: string | null
          project_id?: string | null
          requester_user_id?: string | null
          service_code?: string | null
          service_name?: string
          source_platform?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "nalavation_service_requests_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "digital_practice_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nalavation_service_requests_service_code_fkey"
            columns: ["service_code"]
            isOneToOne: false
            referencedRelation: "nalavation_services"
            referencedColumns: ["code"]
          },
        ]
      }
      nalavation_services: {
        Row: {
          amount: number
          billing_type: string
          category: string
          code: string
          created_at: string
          description: string
          is_active: boolean
          name: string
        }
        Insert: {
          amount?: number
          billing_type?: string
          category: string
          code: string
          created_at?: string
          description?: string
          is_active?: boolean
          name: string
        }
        Update: {
          amount?: number
          billing_type?: string
          category?: string
          code?: string
          created_at?: string
          description?: string
          is_active?: boolean
          name?: string
        }
        Relationships: []
      }
      nalavation_website_projects: {
        Row: {
          contract_value: number
          created_at: string
          domain: string | null
          id: string
          launch_date: string | null
          notes: string | null
          owner_user_id: string | null
          plan_code: string | null
          practice_name: string
          request_id: string | null
          stage: string
          updated_at: string
        }
        Insert: {
          contract_value?: number
          created_at?: string
          domain?: string | null
          id?: string
          launch_date?: string | null
          notes?: string | null
          owner_user_id?: string | null
          plan_code?: string | null
          practice_name: string
          request_id?: string | null
          stage?: string
          updated_at?: string
        }
        Update: {
          contract_value?: number
          created_at?: string
          domain?: string | null
          id?: string
          launch_date?: string | null
          notes?: string | null
          owner_user_id?: string | null
          plan_code?: string | null
          practice_name?: string
          request_id?: string | null
          stage?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "nalavation_website_projects_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "nalavation_service_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          business_unit: Database["public"]["Enums"]["business_unit"]
          created_at: string
          id: string
          is_read: boolean
          link: string | null
          message: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          business_unit?: Database["public"]["Enums"]["business_unit"]
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message: string
          title: string
          type?: string
          user_id: string
        }
        Update: {
          business_unit?: Database["public"]["Enums"]["business_unit"]
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message?: string
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      page_sections: {
        Row: {
          button_text: string | null
          button_url: string | null
          content: string | null
          created_at: string
          display_order: number
          id: string
          image_url: string | null
          is_visible: boolean
          page_id: string
          section_type: Database["public"]["Enums"]["section_type"]
          settings: Json
          subtitle: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          button_text?: string | null
          button_url?: string | null
          content?: string | null
          created_at?: string
          display_order?: number
          id?: string
          image_url?: string | null
          is_visible?: boolean
          page_id: string
          section_type: Database["public"]["Enums"]["section_type"]
          settings?: Json
          subtitle?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          button_text?: string | null
          button_url?: string | null
          content?: string | null
          created_at?: string
          display_order?: number
          id?: string
          image_url?: string | null
          is_visible?: boolean
          page_id?: string
          section_type?: Database["public"]["Enums"]["section_type"]
          settings?: Json
          subtitle?: string | null
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "page_sections_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "pages"
            referencedColumns: ["id"]
          },
        ]
      }
      pages: {
        Row: {
          canonical_url: string | null
          created_at: string
          created_by: string | null
          featured_image: string | null
          id: string
          is_followable: boolean
          is_indexable: boolean
          meta_description: string | null
          meta_title: string | null
          og_description: string | null
          og_image: string | null
          og_title: string | null
          page_type: string
          published_at: string | null
          redirect_url: string | null
          slug: string
          status: Database["public"]["Enums"]["content_status"]
          structured_data: Json | null
          title: string
          twitter_description: string | null
          twitter_image: string | null
          twitter_title: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          canonical_url?: string | null
          created_at?: string
          created_by?: string | null
          featured_image?: string | null
          id?: string
          is_followable?: boolean
          is_indexable?: boolean
          meta_description?: string | null
          meta_title?: string | null
          og_description?: string | null
          og_image?: string | null
          og_title?: string | null
          page_type?: string
          published_at?: string | null
          redirect_url?: string | null
          slug: string
          status?: Database["public"]["Enums"]["content_status"]
          structured_data?: Json | null
          title: string
          twitter_description?: string | null
          twitter_image?: string | null
          twitter_title?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          canonical_url?: string | null
          created_at?: string
          created_by?: string | null
          featured_image?: string | null
          id?: string
          is_followable?: boolean
          is_indexable?: boolean
          meta_description?: string | null
          meta_title?: string | null
          og_description?: string | null
          og_image?: string | null
          og_title?: string | null
          page_type?: string
          published_at?: string | null
          redirect_url?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["content_status"]
          structured_data?: Json | null
          title?: string
          twitter_description?: string | null
          twitter_image?: string | null
          twitter_title?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      patient_consents: {
        Row: {
          consent_text: string
          consent_type: string
          consent_version: string
          created_at: string
          id: string
          ip_address: string | null
          user_id: string
        }
        Insert: {
          consent_text: string
          consent_type: string
          consent_version?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          user_id: string
        }
        Update: {
          consent_text?: string
          consent_type?: string
          consent_version?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          user_id?: string
        }
        Relationships: []
      }
      patient_documents: {
        Row: {
          created_at: string
          description: string | null
          document_type: string | null
          expiry_date: string | null
          file_name: string
          file_path: string
          file_size: number | null
          id: string
          mime_type: string | null
          patient_id: string
          rejection_reason: string | null
          verification_status: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          document_type?: string | null
          expiry_date?: string | null
          file_name: string
          file_path: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          patient_id: string
          rejection_reason?: string | null
          verification_status?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          document_type?: string | null
          expiry_date?: string | null
          file_name?: string
          file_path?: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          patient_id?: string
          rejection_reason?: string | null
          verification_status?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patient_documents_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_medical_info: {
        Row: {
          allergies: string | null
          blood_type: string | null
          chronic_conditions: string | null
          created_at: string
          current_medications: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          height_cm: number | null
          id: string
          patient_id: string
          updated_at: string
          weight_kg: number | null
        }
        Insert: {
          allergies?: string | null
          blood_type?: string | null
          chronic_conditions?: string | null
          created_at?: string
          current_medications?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          height_cm?: number | null
          id?: string
          patient_id: string
          updated_at?: string
          weight_kg?: number | null
        }
        Update: {
          allergies?: string | null
          blood_type?: string | null
          chronic_conditions?: string | null
          created_at?: string
          current_medications?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          height_cm?: number | null
          id?: string
          patient_id?: string
          updated_at?: string
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "patient_medical_info_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payfast_itn_logs: {
        Row: {
          context: string
          created_at: string
          id: string
          m_payment_id: string | null
          mode: string | null
          note: string | null
          payload: Json
          payment_status: string | null
          pf_payment_id: string | null
          signature_valid: boolean
          source_valid: boolean
        }
        Insert: {
          context?: string
          created_at?: string
          id?: string
          m_payment_id?: string | null
          mode?: string | null
          note?: string | null
          payload?: Json
          payment_status?: string | null
          pf_payment_id?: string | null
          signature_valid?: boolean
          source_valid?: boolean
        }
        Update: {
          context?: string
          created_at?: string
          id?: string
          m_payment_id?: string | null
          mode?: string | null
          note?: string | null
          payload?: Json
          payment_status?: string | null
          pf_payment_id?: string | null
          signature_valid?: boolean
          source_valid?: boolean
        }
        Relationships: []
      }
      payfast_reconciliation_runs: {
        Row: {
          checked: number
          created_at: string
          details: Json
          duration_ms: number
          errors: number
          id: string
          mode: string | null
          skipped: number
          trigger: string
          triggered_by: string | null
          updated: number
        }
        Insert: {
          checked?: number
          created_at?: string
          details?: Json
          duration_ms?: number
          errors?: number
          id?: string
          mode?: string | null
          skipped?: number
          trigger?: string
          triggered_by?: string | null
          updated?: number
        }
        Update: {
          checked?: number
          created_at?: string
          details?: Json
          duration_ms?: number
          errors?: number
          id?: string
          mode?: string | null
          skipped?: number
          trigger?: string
          triggered_by?: string | null
          updated?: number
        }
        Relationships: []
      }
      payfast_subscriptions: {
        Row: {
          amount: number
          cancelled_at: string | null
          context: string
          country: string | null
          created_at: string
          customer_email: string
          customer_name: string
          frequency: string
          id: string
          last_payment_at: string | null
          last_reconciled_at: string | null
          m_payment_id: string
          mode: string
          next_run: string | null
          notes: string | null
          pf_payment_id: string | null
          pf_status: string | null
          pf_token: string | null
          phone: string | null
          plan_code: string
          plan_name: string
          practice_name: string | null
          reconcile_note: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount: number
          cancelled_at?: string | null
          context?: string
          country?: string | null
          created_at?: string
          customer_email: string
          customer_name: string
          frequency?: string
          id?: string
          last_payment_at?: string | null
          last_reconciled_at?: string | null
          m_payment_id: string
          mode?: string
          next_run?: string | null
          notes?: string | null
          pf_payment_id?: string | null
          pf_status?: string | null
          pf_token?: string | null
          phone?: string | null
          plan_code: string
          plan_name: string
          practice_name?: string | null
          reconcile_note?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          cancelled_at?: string | null
          context?: string
          country?: string | null
          created_at?: string
          customer_email?: string
          customer_name?: string
          frequency?: string
          id?: string
          last_payment_at?: string | null
          last_reconciled_at?: string | null
          m_payment_id?: string
          mode?: string
          next_run?: string | null
          notes?: string | null
          pf_payment_id?: string | null
          pf_status?: string | null
          pf_token?: string | null
          phone?: string | null
          plan_code?: string
          plan_name?: string
          practice_name?: string | null
          reconcile_note?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      payment_gateway_configs: {
        Row: {
          context: Database["public"]["Enums"]["business_unit"]
          created_at: string
          extra: Json
          fee_bearer: string
          id: string
          is_active: boolean
          mode: string
          payment_methods: string[]
          payment_timing: string
          payouts_enabled: boolean
          platform_commission_percent: number
          provider: string
          public_key_live: string | null
          public_key_test: string | null
          supported_currencies: string[]
          updated_at: string
        }
        Insert: {
          context: Database["public"]["Enums"]["business_unit"]
          created_at?: string
          extra?: Json
          fee_bearer?: string
          id?: string
          is_active?: boolean
          mode?: string
          payment_methods?: string[]
          payment_timing?: string
          payouts_enabled?: boolean
          platform_commission_percent?: number
          provider?: string
          public_key_live?: string | null
          public_key_test?: string | null
          supported_currencies?: string[]
          updated_at?: string
        }
        Update: {
          context?: Database["public"]["Enums"]["business_unit"]
          created_at?: string
          extra?: Json
          fee_bearer?: string
          id?: string
          is_active?: boolean
          mode?: string
          payment_methods?: string[]
          payment_timing?: string
          payouts_enabled?: boolean
          platform_commission_percent?: number
          provider?: string
          public_key_live?: string | null
          public_key_test?: string | null
          supported_currencies?: string[]
          updated_at?: string
        }
        Relationships: []
      }
      payment_gateway_credentials: {
        Row: {
          context: string
          created_at: string
          gateway: string
          id: string
          is_active: boolean
          merchant_id: string
          merchant_key: string
          mode: string
          passphrase: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          context?: string
          created_at?: string
          gateway?: string
          id?: string
          is_active?: boolean
          merchant_id?: string
          merchant_key?: string
          mode: string
          passphrase?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          context?: string
          created_at?: string
          gateway?: string
          id?: string
          is_active?: boolean
          merchant_id?: string
          merchant_key?: string
          mode?: string
          passphrase?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          appointment_id: string | null
          business_unit: Database["public"]["Enums"]["business_unit"]
          created_at: string
          currency: string
          doctor_id: string | null
          doctor_net_amount: number | null
          fee_amount: number | null
          fee_bearer: string | null
          id: string
          last_recalculated_at: string | null
          last_recalculated_by: string | null
          metadata: Json | null
          paid_at: string | null
          patient_id: string | null
          payer_id: string | null
          payment_method: string | null
          paystack_access_code: string | null
          paystack_reference: string | null
          platform_fee_amount: number | null
          processing_fee_amount: number | null
          processing_fee_percentage: number | null
          project_id: string | null
          service_code: string | null
          status: string
          transaction_type: string | null
          updated_at: string
          website_invoice_id: string | null
        }
        Insert: {
          amount: number
          appointment_id?: string | null
          business_unit?: Database["public"]["Enums"]["business_unit"]
          created_at?: string
          currency?: string
          doctor_id?: string | null
          doctor_net_amount?: number | null
          fee_amount?: number | null
          fee_bearer?: string | null
          id?: string
          last_recalculated_at?: string | null
          last_recalculated_by?: string | null
          metadata?: Json | null
          paid_at?: string | null
          patient_id?: string | null
          payer_id?: string | null
          payment_method?: string | null
          paystack_access_code?: string | null
          paystack_reference?: string | null
          platform_fee_amount?: number | null
          processing_fee_amount?: number | null
          processing_fee_percentage?: number | null
          project_id?: string | null
          service_code?: string | null
          status?: string
          transaction_type?: string | null
          updated_at?: string
          website_invoice_id?: string | null
        }
        Update: {
          amount?: number
          appointment_id?: string | null
          business_unit?: Database["public"]["Enums"]["business_unit"]
          created_at?: string
          currency?: string
          doctor_id?: string | null
          doctor_net_amount?: number | null
          fee_amount?: number | null
          fee_bearer?: string | null
          id?: string
          last_recalculated_at?: string | null
          last_recalculated_by?: string | null
          metadata?: Json | null
          paid_at?: string | null
          patient_id?: string | null
          payer_id?: string | null
          payment_method?: string | null
          paystack_access_code?: string | null
          paystack_reference?: string | null
          platform_fee_amount?: number | null
          processing_fee_amount?: number | null
          processing_fee_percentage?: number | null
          project_id?: string | null
          service_code?: string | null
          status?: string
          transaction_type?: string | null
          updated_at?: string
          website_invoice_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "digital_practice_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_website_invoice_id_fkey"
            columns: ["website_invoice_id"]
            isOneToOne: false
            referencedRelation: "website_invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      payout_requests: {
        Row: {
          admin_notes: string | null
          amount: number
          created_at: string
          currency: string
          doctor_id: string
          id: string
          payment_ids: string[] | null
          processed_at: string | null
          processed_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          amount: number
          created_at?: string
          currency?: string
          doctor_id: string
          id?: string
          payment_ids?: string[] | null
          processed_at?: string | null
          processed_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          amount?: number
          created_at?: string
          currency?: string
          doctor_id?: string
          id?: string
          payment_ids?: string[] | null
          processed_at?: string | null
          processed_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      platform_fee_settings: {
        Row: {
          created_at: string
          description: string | null
          fee_bearer: string
          fixed_transaction_fee: number
          id: string
          is_active: boolean
          is_default: boolean
          is_founding_plan: boolean
          minimum_payout: number
          name: string
          payout_schedule: string
          platform_fee_percent: number
          processing_fee_fixed: number
          processing_fee_percent: number
          updated_at: string
          vat_enabled: boolean
          vat_percent: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          fee_bearer?: string
          fixed_transaction_fee?: number
          id?: string
          is_active?: boolean
          is_default?: boolean
          is_founding_plan?: boolean
          minimum_payout?: number
          name: string
          payout_schedule?: string
          platform_fee_percent?: number
          processing_fee_fixed?: number
          processing_fee_percent?: number
          updated_at?: string
          vat_enabled?: boolean
          vat_percent?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          fee_bearer?: string
          fixed_transaction_fee?: number
          id?: string
          is_active?: boolean
          is_default?: boolean
          is_founding_plan?: boolean
          minimum_payout?: number
          name?: string
          payout_schedule?: string
          platform_fee_percent?: number
          processing_fee_fixed?: number
          processing_fee_percent?: number
          updated_at?: string
          vat_enabled?: boolean
          vat_percent?: number
        }
        Relationships: []
      }
      platform_settings: {
        Row: {
          description: string | null
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          description?: string | null
          key: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Update: {
          description?: string | null
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      practice_members: {
        Row: {
          created_at: string
          email: string
          full_name: string
          hpcsa_number: string | null
          id: string
          phone: string | null
          practice_id: string
          role: Database["public"]["Enums"]["practice_role"]
          status: Database["public"]["Enums"]["practice_member_status"]
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          full_name: string
          hpcsa_number?: string | null
          id?: string
          phone?: string | null
          practice_id: string
          role: Database["public"]["Enums"]["practice_role"]
          status?: Database["public"]["Enums"]["practice_member_status"]
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          hpcsa_number?: string | null
          id?: string
          phone?: string | null
          practice_id?: string
          role?: Database["public"]["Enums"]["practice_role"]
          status?: Database["public"]["Enums"]["practice_member_status"]
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "practice_members_practice_id_fkey"
            columns: ["practice_id"]
            isOneToOne: false
            referencedRelation: "practices"
            referencedColumns: ["id"]
          },
        ]
      }
      practice_patient_link_requests: {
        Row: {
          created_at: string
          decided_at: string | null
          id: string
          ip: string | null
          practice_patient_id: string
          reason: string | null
          status: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          decided_at?: string | null
          id?: string
          ip?: string | null
          practice_patient_id: string
          reason?: string | null
          status?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          decided_at?: string | null
          id?: string
          ip?: string | null
          practice_patient_id?: string
          reason?: string | null
          status?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      practice_patients: {
        Row: {
          address: string | null
          allergies: string | null
          chronic_conditions: string | null
          consent_decided_at: string | null
          consent_ip: string | null
          consent_requested_at: string | null
          consent_status: string
          consent_user_agent: string | null
          created_at: string
          created_by: string
          date_of_birth: string | null
          doctor_id: string | null
          email: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          full_name: string
          gender: string | null
          id: string
          id_country_code: string | null
          id_last_four: string | null
          id_number_hash: string | null
          id_type: string | null
          linked_user_id: string | null
          medical_notes: string | null
          phone: string | null
          practice_id: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          allergies?: string | null
          chronic_conditions?: string | null
          consent_decided_at?: string | null
          consent_ip?: string | null
          consent_requested_at?: string | null
          consent_status?: string
          consent_user_agent?: string | null
          created_at?: string
          created_by: string
          date_of_birth?: string | null
          doctor_id?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          full_name: string
          gender?: string | null
          id?: string
          id_country_code?: string | null
          id_last_four?: string | null
          id_number_hash?: string | null
          id_type?: string | null
          linked_user_id?: string | null
          medical_notes?: string | null
          phone?: string | null
          practice_id?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          allergies?: string | null
          chronic_conditions?: string | null
          consent_decided_at?: string | null
          consent_ip?: string | null
          consent_requested_at?: string | null
          consent_status?: string
          consent_user_agent?: string | null
          created_at?: string
          created_by?: string
          date_of_birth?: string | null
          doctor_id?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          full_name?: string
          gender?: string | null
          id?: string
          id_country_code?: string | null
          id_last_four?: string | null
          id_number_hash?: string | null
          id_type?: string | null
          linked_user_id?: string | null
          medical_notes?: string | null
          phone?: string | null
          practice_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      practices: {
        Row: {
          address: string
          created_at: string
          email: string
          id: string
          is_active: boolean
          nurses_can_support_consultations: boolean
          owner_doctor_name: string
          owner_hpcsa_number: string
          owner_id: string
          phone: string
          practice_name: string
          practice_number: string
          updated_at: string
        }
        Insert: {
          address: string
          created_at?: string
          email: string
          id?: string
          is_active?: boolean
          nurses_can_support_consultations?: boolean
          owner_doctor_name: string
          owner_hpcsa_number: string
          owner_id: string
          phone: string
          practice_name: string
          practice_number: string
          updated_at?: string
        }
        Update: {
          address?: string
          created_at?: string
          email?: string
          id?: string
          is_active?: boolean
          nurses_can_support_consultations?: boolean
          owner_doctor_name?: string
          owner_hpcsa_number?: string
          owner_id?: string
          phone?: string
          practice_name?: string
          practice_number?: string
          updated_at?: string
        }
        Relationships: []
      }
      prescription_templates: {
        Row: {
          condition: string | null
          created_at: string
          diagnosis: string | null
          doctor_id: string
          id: string
          medications: Json
          name: string
          pharmacy_notes: string | null
          refill_count: number | null
          updated_at: string
          warnings: string | null
        }
        Insert: {
          condition?: string | null
          created_at?: string
          diagnosis?: string | null
          doctor_id: string
          id?: string
          medications?: Json
          name: string
          pharmacy_notes?: string | null
          refill_count?: number | null
          updated_at?: string
          warnings?: string | null
        }
        Update: {
          condition?: string | null
          created_at?: string
          diagnosis?: string | null
          doctor_id?: string
          id?: string
          medications?: Json
          name?: string
          pharmacy_notes?: string | null
          refill_count?: number | null
          updated_at?: string
          warnings?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prescription_templates_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      prescriptions: {
        Row: {
          allergies_noted: string | null
          appointment_id: string
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          clinical_notes: string | null
          created_at: string
          dependent_id: string | null
          diagnosis: string | null
          doctor_id: string
          doctor_logo_url: string | null
          doctor_signature_url: string | null
          document_type: string
          follow_up_date: string | null
          follow_up_instructions: string | null
          id: string
          medications: Json
          patient_id: string
          pharmacy_notes: string | null
          prescription_number: string | null
          refill_count: number | null
          status: string
          updated_at: string
          verification_token: string
          warnings: string | null
        }
        Insert: {
          allergies_noted?: string | null
          appointment_id: string
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          clinical_notes?: string | null
          created_at?: string
          dependent_id?: string | null
          diagnosis?: string | null
          doctor_id: string
          doctor_logo_url?: string | null
          doctor_signature_url?: string | null
          document_type?: string
          follow_up_date?: string | null
          follow_up_instructions?: string | null
          id?: string
          medications?: Json
          patient_id: string
          pharmacy_notes?: string | null
          prescription_number?: string | null
          refill_count?: number | null
          status?: string
          updated_at?: string
          verification_token?: string
          warnings?: string | null
        }
        Update: {
          allergies_noted?: string | null
          appointment_id?: string
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          clinical_notes?: string | null
          created_at?: string
          dependent_id?: string | null
          diagnosis?: string | null
          doctor_id?: string
          doctor_logo_url?: string | null
          doctor_signature_url?: string | null
          document_type?: string
          follow_up_date?: string | null
          follow_up_instructions?: string | null
          id?: string
          medications?: Json
          patient_id?: string
          pharmacy_notes?: string | null
          prescription_number?: string | null
          refill_count?: number | null
          status?: string
          updated_at?: string
          verification_token?: string
          warnings?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prescriptions_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescriptions_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescriptions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          account_status: string
          address: string | null
          avatar_url: string | null
          business_unit: Database["public"]["Enums"]["business_unit"]
          city: string | null
          country: string | null
          created_at: string
          created_by: string | null
          date_of_birth: string | null
          demo_user: boolean
          email: string | null
          environment: string
          full_name: string | null
          gender: string | null
          id: string
          id_country_code: string | null
          id_number: string | null
          id_number_hash: string | null
          id_type: string | null
          is_suspended: boolean
          last_login_at: string | null
          phone: string | null
          phone_verified: boolean
          state: string | null
          status: Database["public"]["Enums"]["user_status"]
          suspension_reason: string | null
          test_user: boolean
          updated_at: string
        }
        Insert: {
          account_status?: string
          address?: string | null
          avatar_url?: string | null
          business_unit?: Database["public"]["Enums"]["business_unit"]
          city?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          date_of_birth?: string | null
          demo_user?: boolean
          email?: string | null
          environment?: string
          full_name?: string | null
          gender?: string | null
          id: string
          id_country_code?: string | null
          id_number?: string | null
          id_number_hash?: string | null
          id_type?: string | null
          is_suspended?: boolean
          last_login_at?: string | null
          phone?: string | null
          phone_verified?: boolean
          state?: string | null
          status?: Database["public"]["Enums"]["user_status"]
          suspension_reason?: string | null
          test_user?: boolean
          updated_at?: string
        }
        Update: {
          account_status?: string
          address?: string | null
          avatar_url?: string | null
          business_unit?: Database["public"]["Enums"]["business_unit"]
          city?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          date_of_birth?: string | null
          demo_user?: boolean
          email?: string | null
          environment?: string
          full_name?: string | null
          gender?: string | null
          id?: string
          id_country_code?: string | null
          id_number?: string | null
          id_number_hash?: string | null
          id_type?: string | null
          is_suspended?: boolean
          last_login_at?: string | null
          phone?: string | null
          phone_verified?: boolean
          state?: string | null
          status?: Database["public"]["Enums"]["user_status"]
          suspension_reason?: string | null
          test_user?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      project_files: {
        Row: {
          bucket: string
          business_unit: Database["public"]["Enums"]["business_unit"]
          created_at: string
          file_name: string
          file_type: string | null
          id: string
          project_id: string
          size_bytes: number | null
          storage_path: string
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          bucket?: string
          business_unit?: Database["public"]["Enums"]["business_unit"]
          created_at?: string
          file_name: string
          file_type?: string | null
          id?: string
          project_id: string
          size_bytes?: number | null
          storage_path: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          bucket?: string
          business_unit?: Database["public"]["Enums"]["business_unit"]
          created_at?: string
          file_name?: string
          file_type?: string | null
          id?: string
          project_id?: string
          size_bytes?: number | null
          storage_path?: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_files_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "digital_practice_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_files_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      project_notes: {
        Row: {
          author_id: string | null
          business_unit: Database["public"]["Enums"]["business_unit"]
          created_at: string
          id: string
          is_internal: boolean
          note: string
          project_id: string
          updated_at: string
        }
        Insert: {
          author_id?: string | null
          business_unit?: Database["public"]["Enums"]["business_unit"]
          created_at?: string
          id?: string
          is_internal?: boolean
          note: string
          project_id: string
          updated_at?: string
        }
        Update: {
          author_id?: string | null
          business_unit?: Database["public"]["Enums"]["business_unit"]
          created_at?: string
          id?: string
          is_internal?: boolean
          note?: string
          project_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_notes_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_notes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "digital_practice_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      recruitment_activation_events: {
        Row: {
          created_at: string
          created_by: string | null
          doctor_profile_id: string | null
          event_type: string
          id: string
          metadata: Json | null
          occurred_at: string
          prospect_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          doctor_profile_id?: string | null
          event_type: string
          id?: string
          metadata?: Json | null
          occurred_at?: string
          prospect_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          doctor_profile_id?: string | null
          event_type?: string
          id?: string
          metadata?: Json | null
          occurred_at?: string
          prospect_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recruitment_activation_events_prospect_id_fkey"
            columns: ["prospect_id"]
            isOneToOne: false
            referencedRelation: "recruitment_prospects"
            referencedColumns: ["id"]
          },
        ]
      }
      recruitment_activities: {
        Row: {
          activity_type: string
          created_at: string
          created_by: string | null
          description: string | null
          doctor_profile_id: string | null
          id: string
          metadata: Json
          prospect_id: string | null
        }
        Insert: {
          activity_type: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          doctor_profile_id?: string | null
          id?: string
          metadata?: Json
          prospect_id?: string | null
        }
        Update: {
          activity_type?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          doctor_profile_id?: string | null
          id?: string
          metadata?: Json
          prospect_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recruitment_activities_prospect_id_fkey"
            columns: ["prospect_id"]
            isOneToOne: false
            referencedRelation: "recruitment_prospects"
            referencedColumns: ["id"]
          },
        ]
      }
      recruitment_commissions: {
        Row: {
          amount: number
          business_developer: string | null
          created_at: string
          doctor_profile_id: string | null
          id: string
          notes: string | null
          payment_date: string | null
          payment_reference: string | null
          prospect_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount?: number
          business_developer?: string | null
          created_at?: string
          doctor_profile_id?: string | null
          id?: string
          notes?: string | null
          payment_date?: string | null
          payment_reference?: string | null
          prospect_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          business_developer?: string | null
          created_at?: string
          doctor_profile_id?: string | null
          id?: string
          notes?: string | null
          payment_date?: string | null
          payment_reference?: string | null
          prospect_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recruitment_commissions_prospect_id_fkey"
            columns: ["prospect_id"]
            isOneToOne: false
            referencedRelation: "recruitment_prospects"
            referencedColumns: ["id"]
          },
        ]
      }
      recruitment_communications: {
        Row: {
          body: string | null
          channel: string
          created_at: string
          created_by: string | null
          delivery_status: string | null
          direction: string
          id: string
          occurred_at: string
          outcome: string | null
          prospect_id: string
          subject: string | null
          template_key: string | null
        }
        Insert: {
          body?: string | null
          channel: string
          created_at?: string
          created_by?: string | null
          delivery_status?: string | null
          direction?: string
          id?: string
          occurred_at?: string
          outcome?: string | null
          prospect_id: string
          subject?: string | null
          template_key?: string | null
        }
        Update: {
          body?: string | null
          channel?: string
          created_at?: string
          created_by?: string | null
          delivery_status?: string | null
          direction?: string
          id?: string
          occurred_at?: string
          outcome?: string | null
          prospect_id?: string
          subject?: string | null
          template_key?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recruitment_communications_prospect_id_fkey"
            columns: ["prospect_id"]
            isOneToOne: false
            referencedRelation: "recruitment_prospects"
            referencedColumns: ["id"]
          },
        ]
      }
      recruitment_early_access_interest: {
        Row: {
          created_at: string
          created_by: string | null
          doctor_profile_id: string | null
          email: string | null
          feature_key: string
          id: string
          notes: string | null
          prospect_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          doctor_profile_id?: string | null
          email?: string | null
          feature_key: string
          id?: string
          notes?: string | null
          prospect_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          doctor_profile_id?: string | null
          email?: string | null
          feature_key?: string
          id?: string
          notes?: string | null
          prospect_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recruitment_early_access_interest_prospect_id_fkey"
            columns: ["prospect_id"]
            isOneToOne: false
            referencedRelation: "recruitment_prospects"
            referencedColumns: ["id"]
          },
        ]
      }
      recruitment_prospects: {
        Row: {
          activated_at: string | null
          assigned_recruiter: string | null
          business_developer: string | null
          city: string | null
          created_at: string
          created_by: string | null
          email: string | null
          first_consultation_at: string | null
          first_name: string
          hpcsa_number: string | null
          id: string
          last_activity_at: string | null
          last_name: string
          lead_score: number
          linked_doctor_profile_id: string | null
          mobile_number: string | null
          next_follow_up_date: string | null
          notes: string | null
          practice_name: string | null
          priority: string
          province: string | null
          referral_source: string | null
          referrer_doctor_id: string | null
          specialty: string | null
          stage: string
          title: string | null
          updated_at: string
          whatsapp_number: string | null
        }
        Insert: {
          activated_at?: string | null
          assigned_recruiter?: string | null
          business_developer?: string | null
          city?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          first_consultation_at?: string | null
          first_name: string
          hpcsa_number?: string | null
          id?: string
          last_activity_at?: string | null
          last_name: string
          lead_score?: number
          linked_doctor_profile_id?: string | null
          mobile_number?: string | null
          next_follow_up_date?: string | null
          notes?: string | null
          practice_name?: string | null
          priority?: string
          province?: string | null
          referral_source?: string | null
          referrer_doctor_id?: string | null
          specialty?: string | null
          stage?: string
          title?: string | null
          updated_at?: string
          whatsapp_number?: string | null
        }
        Update: {
          activated_at?: string | null
          assigned_recruiter?: string | null
          business_developer?: string | null
          city?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          first_consultation_at?: string | null
          first_name?: string
          hpcsa_number?: string | null
          id?: string
          last_activity_at?: string | null
          last_name?: string
          lead_score?: number
          linked_doctor_profile_id?: string | null
          mobile_number?: string | null
          next_follow_up_date?: string | null
          notes?: string | null
          practice_name?: string | null
          priority?: string
          province?: string | null
          referral_source?: string | null
          referrer_doctor_id?: string | null
          specialty?: string | null
          stage?: string
          title?: string | null
          updated_at?: string
          whatsapp_number?: string | null
        }
        Relationships: []
      }
      recruitment_referrals: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          prospect_id: string | null
          prospect_name: string | null
          referral_date: string
          referrer_doctor_id: string | null
          referrer_name: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          prospect_id?: string | null
          prospect_name?: string | null
          referral_date?: string
          referrer_doctor_id?: string | null
          referrer_name?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          prospect_id?: string | null
          prospect_name?: string | null
          referral_date?: string
          referrer_doctor_id?: string | null
          referrer_name?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recruitment_referrals_prospect_id_fkey"
            columns: ["prospect_id"]
            isOneToOne: false
            referencedRelation: "recruitment_prospects"
            referencedColumns: ["id"]
          },
        ]
      }
      recruitment_source_catalog: {
        Row: {
          created_at: string
          is_active: boolean
          key: string
          label: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          is_active?: boolean
          key: string
          label: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          is_active?: boolean
          key?: string
          label?: string
          sort_order?: number
        }
        Relationships: []
      }
      recruitment_tasks: {
        Row: {
          assigned_to: string | null
          completed_at: string | null
          created_at: string
          created_by: string | null
          due_date: string | null
          id: string
          notes: string | null
          priority: string
          prospect_id: string | null
          status: string
          task_type: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          due_date?: string | null
          id?: string
          notes?: string | null
          priority?: string
          prospect_id?: string | null
          status?: string
          task_type: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          due_date?: string | null
          id?: string
          notes?: string | null
          priority?: string
          prospect_id?: string | null
          status?: string
          task_type?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recruitment_tasks_prospect_id_fkey"
            columns: ["prospect_id"]
            isOneToOne: false
            referencedRelation: "recruitment_prospects"
            referencedColumns: ["id"]
          },
        ]
      }
      recurring_expenses: {
        Row: {
          amount: number
          category_id: string | null
          created_at: string
          created_by: string | null
          currency: string
          description: string
          frequency: string
          id: string
          is_active: boolean
          next_due_date: string
          notes: string | null
          reminder_days: number
          supplier: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          description: string
          frequency?: string
          id?: string
          is_active?: boolean
          next_due_date: string
          notes?: string | null
          reminder_days?: number
          supplier?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          description?: string
          frequency?: string
          id?: string
          is_active?: boolean
          next_due_date?: string
          notes?: string | null
          reminder_days?: number
          supplier?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recurring_expenses_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "expense_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_clicks: {
        Row: {
          code: string
          created_at: string
          id: string
          ip: string | null
          referer: string | null
          user_agent: string | null
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          ip?: string | null
          referer?: string | null
          user_agent?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          ip?: string | null
          referer?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      referral_codes: {
        Row: {
          code: string
          created_at: string
          id: string
          total_clicks: number
          updated_at: string
          user_id: string
          user_type: Database["public"]["Enums"]["referral_user_type"]
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          total_clicks?: number
          updated_at?: string
          user_id: string
          user_type?: Database["public"]["Enums"]["referral_user_type"]
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          total_clicks?: number
          updated_at?: string
          user_id?: string
          user_type?: Database["public"]["Enums"]["referral_user_type"]
        }
        Relationships: []
      }
      referral_fraud_flags: {
        Row: {
          created_at: string
          details: Json
          flag_type: Database["public"]["Enums"]["referral_flag_type"]
          id: string
          referral_id: string
          resolution_notes: string | null
          resolved: boolean
          resolved_at: string | null
          resolved_by: string | null
          severity: Database["public"]["Enums"]["referral_flag_severity"]
        }
        Insert: {
          created_at?: string
          details?: Json
          flag_type: Database["public"]["Enums"]["referral_flag_type"]
          id?: string
          referral_id: string
          resolution_notes?: string | null
          resolved?: boolean
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: Database["public"]["Enums"]["referral_flag_severity"]
        }
        Update: {
          created_at?: string
          details?: Json
          flag_type?: Database["public"]["Enums"]["referral_flag_type"]
          id?: string
          referral_id?: string
          resolution_notes?: string | null
          resolved?: boolean
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: Database["public"]["Enums"]["referral_flag_severity"]
        }
        Relationships: [
          {
            foreignKeyName: "referral_fraud_flags_referral_id_fkey"
            columns: ["referral_id"]
            isOneToOne: false
            referencedRelation: "referrals"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_profitability_simulations: {
        Row: {
          admin_user_id: string
          consultation_fee: number
          created_at: string
          doctors_onlining_keeps: number
          fixed_processing_fee: number
          fixed_reward_amount: number
          id: string
          lifetime_reward_cap: number | null
          monthly_reward_cap: number | null
          net_platform_revenue: number
          notes: string | null
          platform_fee_percentage: number
          platform_revenue: number
          processing_fee: number
          processing_fee_percentage: number
          profit_margin_percentage: number
          referral_type: string
          reward_amount: number
          reward_basis: string
          reward_duration: string | null
          reward_percentage: number
          risk_status: string
        }
        Insert: {
          admin_user_id: string
          consultation_fee?: number
          created_at?: string
          doctors_onlining_keeps?: number
          fixed_processing_fee?: number
          fixed_reward_amount?: number
          id?: string
          lifetime_reward_cap?: number | null
          monthly_reward_cap?: number | null
          net_platform_revenue?: number
          notes?: string | null
          platform_fee_percentage?: number
          platform_revenue?: number
          processing_fee?: number
          processing_fee_percentage?: number
          profit_margin_percentage?: number
          referral_type: string
          reward_amount?: number
          reward_basis: string
          reward_duration?: string | null
          reward_percentage?: number
          risk_status: string
        }
        Update: {
          admin_user_id?: string
          consultation_fee?: number
          created_at?: string
          doctors_onlining_keeps?: number
          fixed_processing_fee?: number
          fixed_reward_amount?: number
          id?: string
          lifetime_reward_cap?: number | null
          monthly_reward_cap?: number | null
          net_platform_revenue?: number
          notes?: string | null
          platform_fee_percentage?: number
          platform_revenue?: number
          processing_fee?: number
          processing_fee_percentage?: number
          profit_margin_percentage?: number
          referral_type?: string
          reward_amount?: number
          reward_basis?: string
          reward_duration?: string | null
          reward_percentage?: number
          risk_status?: string
        }
        Relationships: []
      }
      referral_program_settings: {
        Row: {
          auto_cash_payouts: boolean
          fraud_detection_enabled: boolean
          id: string
          identity_verification_required: boolean
          manual_reward_approval: boolean
          multi_level_enabled: boolean
          tracking_enabled: boolean
          updated_at: string
          updated_by: string | null
          wallet_credits_enabled: boolean
        }
        Insert: {
          auto_cash_payouts?: boolean
          fraud_detection_enabled?: boolean
          id?: string
          identity_verification_required?: boolean
          manual_reward_approval?: boolean
          multi_level_enabled?: boolean
          tracking_enabled?: boolean
          updated_at?: string
          updated_by?: string | null
          wallet_credits_enabled?: boolean
        }
        Update: {
          auto_cash_payouts?: boolean
          fraud_detection_enabled?: boolean
          id?: string
          identity_verification_required?: boolean
          manual_reward_approval?: boolean
          multi_level_enabled?: boolean
          tracking_enabled?: boolean
          updated_at?: string
          updated_by?: string | null
          wallet_credits_enabled?: boolean
        }
        Relationships: []
      }
      referral_reward_calculations: {
        Row: {
          applied_amount: number
          appointment_id: string | null
          basis: Database["public"]["Enums"]["referral_reward_basis"]
          basis_value: number
          computed_amount: number
          created_at: string
          currency: string
          decision: string
          details: Json
          fixed_amount: number
          id: string
          ledger_id: string | null
          lifetime_cap: number | null
          lifetime_used: number
          monthly_cap: number | null
          monthly_used: number
          percentage: number
          reason: string | null
          referral_id: string | null
          referrer_id: string
          setting_id: string | null
          trigger_event: Database["public"]["Enums"]["referral_trigger_event"]
        }
        Insert: {
          applied_amount?: number
          appointment_id?: string | null
          basis: Database["public"]["Enums"]["referral_reward_basis"]
          basis_value?: number
          computed_amount?: number
          created_at?: string
          currency?: string
          decision: string
          details?: Json
          fixed_amount?: number
          id?: string
          ledger_id?: string | null
          lifetime_cap?: number | null
          lifetime_used?: number
          monthly_cap?: number | null
          monthly_used?: number
          percentage?: number
          reason?: string | null
          referral_id?: string | null
          referrer_id: string
          setting_id?: string | null
          trigger_event: Database["public"]["Enums"]["referral_trigger_event"]
        }
        Update: {
          applied_amount?: number
          appointment_id?: string | null
          basis?: Database["public"]["Enums"]["referral_reward_basis"]
          basis_value?: number
          computed_amount?: number
          created_at?: string
          currency?: string
          decision?: string
          details?: Json
          fixed_amount?: number
          id?: string
          ledger_id?: string | null
          lifetime_cap?: number | null
          lifetime_used?: number
          monthly_cap?: number | null
          monthly_used?: number
          percentage?: number
          reason?: string | null
          referral_id?: string | null
          referrer_id?: string
          setting_id?: string | null
          trigger_event?: Database["public"]["Enums"]["referral_trigger_event"]
        }
        Relationships: [
          {
            foreignKeyName: "referral_reward_calculations_ledger_id_fkey"
            columns: ["ledger_id"]
            isOneToOne: false
            referencedRelation: "referral_rewards_ledger"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_reward_calculations_referral_id_fkey"
            columns: ["referral_id"]
            isOneToOne: false
            referencedRelation: "referrals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_reward_calculations_setting_id_fkey"
            columns: ["setting_id"]
            isOneToOne: false
            referencedRelation: "referral_reward_settings"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_reward_settings: {
        Row: {
          amount: number
          country: string
          created_at: string
          currency: string
          id: string
          is_enabled: boolean
          lifetime_reward_cap: number | null
          monthly_reward_cap: number | null
          referred_type: Database["public"]["Enums"]["referral_user_type"]
          referrer_type: Database["public"]["Enums"]["referral_user_type"]
          requires_admin_approval: boolean
          reward_basis: Database["public"]["Enums"]["referral_reward_basis"]
          reward_duration_months: number | null
          reward_percentage: number
          reward_type: Database["public"]["Enums"]["referral_reward_type"]
          trigger_event: Database["public"]["Enums"]["referral_trigger_event"]
          updated_at: string
          updated_by: string | null
          verification_requirements: Json
        }
        Insert: {
          amount?: number
          country?: string
          created_at?: string
          currency?: string
          id?: string
          is_enabled?: boolean
          lifetime_reward_cap?: number | null
          monthly_reward_cap?: number | null
          referred_type: Database["public"]["Enums"]["referral_user_type"]
          referrer_type: Database["public"]["Enums"]["referral_user_type"]
          requires_admin_approval?: boolean
          reward_basis?: Database["public"]["Enums"]["referral_reward_basis"]
          reward_duration_months?: number | null
          reward_percentage?: number
          reward_type?: Database["public"]["Enums"]["referral_reward_type"]
          trigger_event?: Database["public"]["Enums"]["referral_trigger_event"]
          updated_at?: string
          updated_by?: string | null
          verification_requirements?: Json
        }
        Update: {
          amount?: number
          country?: string
          created_at?: string
          currency?: string
          id?: string
          is_enabled?: boolean
          lifetime_reward_cap?: number | null
          monthly_reward_cap?: number | null
          referred_type?: Database["public"]["Enums"]["referral_user_type"]
          referrer_type?: Database["public"]["Enums"]["referral_user_type"]
          requires_admin_approval?: boolean
          reward_basis?: Database["public"]["Enums"]["referral_reward_basis"]
          reward_duration_months?: number | null
          reward_percentage?: number
          reward_type?: Database["public"]["Enums"]["referral_reward_type"]
          trigger_event?: Database["public"]["Enums"]["referral_trigger_event"]
          updated_at?: string
          updated_by?: string | null
          verification_requirements?: Json
        }
        Relationships: []
      }
      referral_rewards_ledger: {
        Row: {
          amount: number
          created_at: string
          currency: string
          entry_type: Database["public"]["Enums"]["referral_ledger_type"]
          id: string
          notes: string | null
          payout_method: string | null
          payout_reference: string | null
          referral_id: string | null
          status: Database["public"]["Enums"]["referral_ledger_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          entry_type?: Database["public"]["Enums"]["referral_ledger_type"]
          id?: string
          notes?: string | null
          payout_method?: string | null
          payout_reference?: string | null
          referral_id?: string | null
          status?: Database["public"]["Enums"]["referral_ledger_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          entry_type?: Database["public"]["Enums"]["referral_ledger_type"]
          id?: string
          notes?: string | null
          payout_method?: string | null
          payout_reference?: string | null
          referral_id?: string | null
          status?: Database["public"]["Enums"]["referral_ledger_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "referral_rewards_ledger_referral_id_fkey"
            columns: ["referral_id"]
            isOneToOne: false
            referencedRelation: "referrals"
            referencedColumns: ["id"]
          },
        ]
      }
      referrals: {
        Row: {
          admin_notes: string | null
          code_used: string
          created_at: string
          device_fingerprint: string | null
          first_consultation_date: string | null
          flagged_reasons: Json
          id: string
          referred_email: string | null
          referred_id: string | null
          referred_type:
            | Database["public"]["Enums"]["referral_user_type"]
            | null
          referrer_id: string
          referrer_type: Database["public"]["Enums"]["referral_user_type"]
          registration_date: string | null
          reward_amount: number | null
          reward_approved_at: string | null
          reward_approved_by: string | null
          reward_currency: string | null
          reward_paid_at: string | null
          reward_type:
            | Database["public"]["Enums"]["referral_reward_type"]
            | null
          signup_ip: string | null
          signup_user_agent: string | null
          status: Database["public"]["Enums"]["referral_status"]
          total_consultations: number
          updated_at: string
          verification_date: string | null
        }
        Insert: {
          admin_notes?: string | null
          code_used: string
          created_at?: string
          device_fingerprint?: string | null
          first_consultation_date?: string | null
          flagged_reasons?: Json
          id?: string
          referred_email?: string | null
          referred_id?: string | null
          referred_type?:
            | Database["public"]["Enums"]["referral_user_type"]
            | null
          referrer_id: string
          referrer_type: Database["public"]["Enums"]["referral_user_type"]
          registration_date?: string | null
          reward_amount?: number | null
          reward_approved_at?: string | null
          reward_approved_by?: string | null
          reward_currency?: string | null
          reward_paid_at?: string | null
          reward_type?:
            | Database["public"]["Enums"]["referral_reward_type"]
            | null
          signup_ip?: string | null
          signup_user_agent?: string | null
          status?: Database["public"]["Enums"]["referral_status"]
          total_consultations?: number
          updated_at?: string
          verification_date?: string | null
        }
        Update: {
          admin_notes?: string | null
          code_used?: string
          created_at?: string
          device_fingerprint?: string | null
          first_consultation_date?: string | null
          flagged_reasons?: Json
          id?: string
          referred_email?: string | null
          referred_id?: string | null
          referred_type?:
            | Database["public"]["Enums"]["referral_user_type"]
            | null
          referrer_id?: string
          referrer_type?: Database["public"]["Enums"]["referral_user_type"]
          registration_date?: string | null
          reward_amount?: number | null
          reward_approved_at?: string | null
          reward_approved_by?: string | null
          reward_currency?: string | null
          reward_paid_at?: string | null
          reward_type?:
            | Database["public"]["Enums"]["referral_reward_type"]
            | null
          signup_ip?: string | null
          signup_user_agent?: string | null
          status?: Database["public"]["Enums"]["referral_status"]
          total_consultations?: number
          updated_at?: string
          verification_date?: string | null
        }
        Relationships: []
      }
      reviews: {
        Row: {
          admin_notes: string | null
          appointment_id: string
          comment: string | null
          created_at: string
          doctor_clear_helpful: boolean | null
          doctor_id: string
          doctor_professional: boolean | null
          flagged_reason: string | null
          id: string
          is_visible: boolean
          moderation_status: string
          patient_id: string
          rating: number
          updated_at: string
          would_recommend: boolean | null
        }
        Insert: {
          admin_notes?: string | null
          appointment_id: string
          comment?: string | null
          created_at?: string
          doctor_clear_helpful?: boolean | null
          doctor_id: string
          doctor_professional?: boolean | null
          flagged_reason?: string | null
          id?: string
          is_visible?: boolean
          moderation_status?: string
          patient_id: string
          rating: number
          updated_at?: string
          would_recommend?: boolean | null
        }
        Update: {
          admin_notes?: string | null
          appointment_id?: string
          comment?: string | null
          created_at?: string
          doctor_clear_helpful?: boolean | null
          doctor_id?: string
          doctor_professional?: boolean | null
          flagged_reason?: string | null
          id?: string
          is_visible?: boolean
          moderation_status?: string
          patient_id?: string
          rating?: number
          updated_at?: string
          would_recommend?: boolean | null
        }
        Relationships: []
      }
      role_permissions: {
        Row: {
          id: string
          permission: Database["public"]["Enums"]["app_permission"]
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          id?: string
          permission: Database["public"]["Enums"]["app_permission"]
          role: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          id?: string
          permission?: Database["public"]["Enums"]["app_permission"]
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: []
      }
      seo_projects: {
        Row: {
          business_unit: Database["public"]["Enums"]["business_unit"]
          created_at: string
          id: string
          last_audit_at: string | null
          monthly_fee: number
          package: string | null
          project_id: string
          ranking_score: number | null
          status: string
          target_keywords: string[]
          updated_at: string
        }
        Insert: {
          business_unit?: Database["public"]["Enums"]["business_unit"]
          created_at?: string
          id?: string
          last_audit_at?: string | null
          monthly_fee?: number
          package?: string | null
          project_id: string
          ranking_score?: number | null
          status?: string
          target_keywords?: string[]
          updated_at?: string
        }
        Update: {
          business_unit?: Database["public"]["Enums"]["business_unit"]
          created_at?: string
          id?: string
          last_audit_at?: string | null
          monthly_fee?: number
          package?: string | null
          project_id?: string
          ranking_score?: number | null
          status?: string
          target_keywords?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "seo_projects_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "digital_practice_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      service_catalogue: {
        Row: {
          billing_cycle: string
          business_unit: Database["public"]["Enums"]["business_unit"]
          category: string
          code: string
          created_at: string
          currency: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          price: number
          updated_at: string
        }
        Insert: {
          billing_cycle?: string
          business_unit?: Database["public"]["Enums"]["business_unit"]
          category?: string
          code: string
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          price?: number
          updated_at?: string
        }
        Update: {
          billing_cycle?: string
          business_unit?: Database["public"]["Enums"]["business_unit"]
          category?: string
          code?: string
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          price?: number
          updated_at?: string
        }
        Relationships: []
      }
      service_subscriptions: {
        Row: {
          amount: number
          billing_cycle: string
          business_unit: Database["public"]["Enums"]["business_unit"]
          cancelled_at: string | null
          created_at: string
          currency: string
          doctor_id: string
          id: string
          name: string
          next_billing_on: string | null
          notes: string | null
          project_id: string | null
          service_code: string | null
          started_on: string
          status: string
          updated_at: string
        }
        Insert: {
          amount?: number
          billing_cycle?: string
          business_unit?: Database["public"]["Enums"]["business_unit"]
          cancelled_at?: string | null
          created_at?: string
          currency?: string
          doctor_id: string
          id?: string
          name: string
          next_billing_on?: string | null
          notes?: string | null
          project_id?: string | null
          service_code?: string | null
          started_on?: string
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          billing_cycle?: string
          business_unit?: Database["public"]["Enums"]["business_unit"]
          cancelled_at?: string | null
          created_at?: string
          currency?: string
          doctor_id?: string
          id?: string
          name?: string
          next_billing_on?: string | null
          notes?: string | null
          project_id?: string | null
          service_code?: string | null
          started_on?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_subscriptions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "digital_practice_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      site_content: {
        Row: {
          id: string
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          is_public: boolean
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          is_public?: boolean
          key: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Update: {
          is_public?: boolean
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      slot_reservations: {
        Row: {
          appointment_id: string | null
          created_at: string
          doctor_id: string
          end_at: string
          expires_at: string
          id: string
          patient_id: string
          released_at: string | null
          start_at: string
        }
        Insert: {
          appointment_id?: string | null
          created_at?: string
          doctor_id: string
          end_at: string
          expires_at?: string
          id?: string
          patient_id: string
          released_at?: string | null
          start_at: string
        }
        Update: {
          appointment_id?: string | null
          created_at?: string
          doctor_id?: string
          end_at?: string
          expires_at?: string
          id?: string
          patient_id?: string
          released_at?: string | null
          start_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "slot_reservations_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
        ]
      }
      social_profiles: {
        Row: {
          business_unit: Database["public"]["Enums"]["business_unit"]
          created_at: string
          followers: number
          handle: string | null
          id: string
          platform: string
          project_id: string
          status: string
          updated_at: string
          url: string | null
        }
        Insert: {
          business_unit?: Database["public"]["Enums"]["business_unit"]
          created_at?: string
          followers?: number
          handle?: string | null
          id?: string
          platform: string
          project_id: string
          status?: string
          updated_at?: string
          url?: string | null
        }
        Update: {
          business_unit?: Database["public"]["Enums"]["business_unit"]
          created_at?: string
          followers?: number
          handle?: string | null
          id?: string
          platform?: string
          project_id?: string
          status?: string
          updated_at?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "social_profiles_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "digital_practice_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      specialties: {
        Row: {
          created_at: string
          description: string | null
          icon: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      ssl_certificates: {
        Row: {
          annual_fee: number
          auto_renew: boolean
          business_unit: Database["public"]["Enums"]["business_unit"]
          created_at: string
          domain: string
          expires_on: string | null
          id: string
          issued_on: string | null
          issuer: string | null
          project_id: string
          status: string
          updated_at: string
        }
        Insert: {
          annual_fee?: number
          auto_renew?: boolean
          business_unit?: Database["public"]["Enums"]["business_unit"]
          created_at?: string
          domain: string
          expires_on?: string | null
          id?: string
          issued_on?: string | null
          issuer?: string | null
          project_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          annual_fee?: number
          auto_renew?: boolean
          business_unit?: Database["public"]["Enums"]["business_unit"]
          created_at?: string
          domain?: string
          expires_on?: string | null
          id?: string
          issued_on?: string | null
          issuer?: string | null
          project_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ssl_certificates_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "digital_practice_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          business_unit: Database["public"]["Enums"]["business_unit"]
          created_at: string
          email: string
          id: string
          message: string
          name: string
          source: string
          status: string
          subject: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          business_unit?: Database["public"]["Enums"]["business_unit"]
          created_at?: string
          email: string
          id?: string
          message: string
          name: string
          source?: string
          status?: string
          subject?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          business_unit?: Database["public"]["Enums"]["business_unit"]
          created_at?: string
          email?: string
          id?: string
          message?: string
          name?: string
          source?: string
          status?: string
          subject?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          granted_by: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          granted_by?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          granted_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      webrtc_signaling_messages: {
        Row: {
          appointment_id: string
          created_at: string
          id: string
          payload: Json
          receiver_id: string
          sender_id: string
          type: string
        }
        Insert: {
          appointment_id: string
          created_at?: string
          id?: string
          payload?: Json
          receiver_id: string
          sender_id: string
          type: string
        }
        Update: {
          appointment_id?: string
          created_at?: string
          id?: string
          payload?: Json
          receiver_id?: string
          sender_id?: string
          type?: string
        }
        Relationships: []
      }
      website_activity: {
        Row: {
          action: string
          actor_id: string | null
          business_unit: Database["public"]["Enums"]["business_unit"]
          created_at: string
          details: Json
          id: string
          project_id: string
          updated_at: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          business_unit?: Database["public"]["Enums"]["business_unit"]
          created_at?: string
          details?: Json
          id?: string
          project_id: string
          updated_at?: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          business_unit?: Database["public"]["Enums"]["business_unit"]
          created_at?: string
          details?: Json
          id?: string
          project_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "website_activity_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "website_activity_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "digital_practice_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      website_invoices: {
        Row: {
          amount: number
          business_unit: Database["public"]["Enums"]["business_unit"]
          category: string
          created_at: string
          currency: string
          description: string | null
          doctor_id: string
          due_on: string | null
          id: string
          invoice_number: string
          is_recurring: boolean
          issued_on: string
          paid_at: string | null
          payment_reference: string | null
          project_id: string | null
          status: string
          tax_amount: number
          total_amount: number
          updated_at: string
        }
        Insert: {
          amount?: number
          business_unit?: Database["public"]["Enums"]["business_unit"]
          category?: string
          created_at?: string
          currency?: string
          description?: string | null
          doctor_id: string
          due_on?: string | null
          id?: string
          invoice_number: string
          is_recurring?: boolean
          issued_on?: string
          paid_at?: string | null
          payment_reference?: string | null
          project_id?: string | null
          status?: string
          tax_amount?: number
          total_amount?: number
          updated_at?: string
        }
        Update: {
          amount?: number
          business_unit?: Database["public"]["Enums"]["business_unit"]
          category?: string
          created_at?: string
          currency?: string
          description?: string | null
          doctor_id?: string
          due_on?: string | null
          id?: string
          invoice_number?: string
          is_recurring?: boolean
          issued_on?: string
          paid_at?: string | null
          payment_reference?: string | null
          project_id?: string | null
          status?: string
          tax_amount?: number
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "website_invoices_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "website_invoices_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "public_doctors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "website_invoices_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "digital_practice_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      website_orders: {
        Row: {
          amount: number
          business_unit: Database["public"]["Enums"]["business_unit"]
          created_at: string
          currency: string
          doctor_id: string
          id: string
          notes: string | null
          ordered_at: string
          project_id: string | null
          quantity: number
          service_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount?: number
          business_unit?: Database["public"]["Enums"]["business_unit"]
          created_at?: string
          currency?: string
          doctor_id: string
          id?: string
          notes?: string | null
          ordered_at?: string
          project_id?: string | null
          quantity?: number
          service_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          business_unit?: Database["public"]["Enums"]["business_unit"]
          created_at?: string
          currency?: string
          doctor_id?: string
          id?: string
          notes?: string | null
          ordered_at?: string
          project_id?: string | null
          quantity?: number
          service_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "website_orders_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "website_orders_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "public_doctors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "website_orders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "digital_practice_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "website_orders_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "service_catalogue"
            referencedColumns: ["id"]
          },
        ]
      }
      website_pages: {
        Row: {
          business_unit: Database["public"]["Enums"]["business_unit"]
          content: string | null
          created_at: string
          id: string
          project_id: string | null
          seo_description: string | null
          seo_title: string | null
          slug: string
          status: string
          title: string
          updated_at: string
          website_id: string
        }
        Insert: {
          business_unit?: Database["public"]["Enums"]["business_unit"]
          content?: string | null
          created_at?: string
          id?: string
          project_id?: string | null
          seo_description?: string | null
          seo_title?: string | null
          slug: string
          status?: string
          title: string
          updated_at?: string
          website_id: string
        }
        Update: {
          business_unit?: Database["public"]["Enums"]["business_unit"]
          content?: string | null
          created_at?: string
          id?: string
          project_id?: string | null
          seo_description?: string | null
          seo_title?: string | null
          slug?: string
          status?: string
          title?: string
          updated_at?: string
          website_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "website_pages_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "digital_practice_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "website_pages_website_id_fkey"
            columns: ["website_id"]
            isOneToOne: false
            referencedRelation: "websites"
            referencedColumns: ["id"]
          },
        ]
      }
      website_tasks: {
        Row: {
          assigned_to: string | null
          business_unit: Database["public"]["Enums"]["business_unit"]
          completed_at: string | null
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          priority: string
          project_id: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          business_unit?: Database["public"]["Enums"]["business_unit"]
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string
          project_id: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          business_unit?: Database["public"]["Enums"]["business_unit"]
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string
          project_id?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "website_tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "website_tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "digital_practice_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      websites: {
        Row: {
          business_unit: Database["public"]["Enums"]["business_unit"]
          created_at: string
          id: string
          launched_on: string | null
          live_url: string | null
          name: string
          platform: string
          primary_domain: string | null
          project_id: string
          staging_url: string | null
          status: string
          updated_at: string
        }
        Insert: {
          business_unit?: Database["public"]["Enums"]["business_unit"]
          created_at?: string
          id?: string
          launched_on?: string | null
          live_url?: string | null
          name: string
          platform?: string
          primary_domain?: string | null
          project_id: string
          staging_url?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          business_unit?: Database["public"]["Enums"]["business_unit"]
          created_at?: string
          id?: string
          launched_on?: string | null
          live_url?: string | null
          name?: string
          platform?: string
          primary_domain?: string | null
          project_id?: string
          staging_url?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "websites_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "digital_practice_projects"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      public_doctors: {
        Row: {
          avatar_url: string | null
          bio: string | null
          city: string | null
          consultation_category_id: string | null
          consultation_fee: number | null
          country: string | null
          education: string | null
          experience_years: number | null
          full_name: string | null
          hospital_affiliation: string | null
          id: string | null
          is_available: boolean | null
          is_verified: boolean | null
          languages: string[] | null
          practice_logo_url: string | null
          practice_name: string | null
          profile_id: string | null
          rating: number | null
          specialty_id: string | null
          title: string | null
          total_reviews: number | null
        }
        Relationships: [
          {
            foreignKeyName: "doctors_consultation_category_id_fkey"
            columns: ["consultation_category_id"]
            isOneToOne: false
            referencedRelation: "consultation_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "doctors_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "doctors_specialty_id_fkey"
            columns: ["specialty_id"]
            isOneToOne: false
            referencedRelation: "specialties"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      admin_approve_patient_document: {
        Args: { _doc_id: string }
        Returns: undefined
      }
      admin_approve_referral_reward: {
        Args: { _referral_id: string }
        Returns: undefined
      }
      admin_doctor_health_score: {
        Args: { _doctor_profile_id: string }
        Returns: Json
      }
      admin_doctor_success_list: {
        Args: never
        Returns: {
          activated_at: string
          doctor_id: string
          email: string
          first_consultation_at: string
          full_name: string
          is_founding_doctor: boolean
          is_suspended: boolean
          is_verified: boolean
          last_activity_at: string
          profile_id: string
          registration_date: string
          status: string
          total_consultations: number
          verification_date: string
        }[]
      }
      admin_first_consultation_pending: {
        Args: never
        Returns: {
          days_since_verified: number
          email: string
          full_name: string
          has_availability: boolean
          last_activity_at: string
          profile_completion_pct: number
          profile_id: string
          verified_at: string
        }[]
      }
      admin_mark_payout_paid: {
        Args: { _ledger_id: string; _reference: string }
        Returns: undefined
      }
      admin_recalculate_processing_fees: {
        Args: {
          _new_pct: number
          _notes?: string
          _payment_ids?: string[]
          _scope: string
        }
        Returns: Json
      }
      admin_recruitment_funnel: {
        Args: never
        Returns: {
          current_count: number
          prior_count: number
          stage: string
        }[]
      }
      admin_recruitment_geo: {
        Args: never
        Returns: {
          city: string
          founding: number
          province: string
          specialty: string
          total: number
          verified: number
        }[]
      }
      admin_recruitment_source_stats: {
        Args: never
        Returns: {
          conversion_pct: number
          registered: number
          source: string
          total: number
          verified: number
        }[]
      }
      admin_referral_overview: { Args: never; Returns: Json }
      admin_referrer_lifetime_value: {
        Args: { _referrer_id: string }
        Returns: Json
      }
      admin_reject_patient_document: {
        Args: { _doc_id: string; _reason: string }
        Returns: undefined
      }
      admin_reject_referral_reward: {
        Args: { _reason: string; _referral_id: string }
        Returns: undefined
      }
      admin_top_referrers: {
        Args: { _limit?: number }
        Returns: {
          approved: number
          full_name: string
          total: number
          total_earned: number
          user_id: string
          user_type: Database["public"]["Enums"]["referral_user_type"]
        }[]
      }
      admin_top_referrers_by_type: {
        Args: {
          _limit?: number
          _role: Database["public"]["Enums"]["referral_user_type"]
        }
        Returns: {
          approved: number
          email: string
          full_name: string
          lifetime_value: number
          paid: number
          total: number
          total_earned: number
          user_id: string
        }[]
      }
      admin_unlink_practice_patient: {
        Args: { _practice_patient_id: string; _reason: string }
        Returns: undefined
      }
      approve_profile_change: {
        Args: { _change_id: string }
        Returns: undefined
      }
      attach_referral_on_signup: {
        Args: { _code: string; _fp?: string; _ip?: string; _ua?: string }
        Returns: string
      }
      can_impersonate: { Args: { _user_id: string }; Returns: boolean }
      check_appointment_conflict: {
        Args: {
          _doctor_id: string
          _end: string
          _exclude_appt_id?: string
          _start: string
        }
        Returns: boolean
      }
      complete_doctor_signup: {
        Args: { _country: string; _license_number: string; _title: string }
        Returns: undefined
      }
      compute_referral_reward_amount: {
        Args: {
          _basis: Database["public"]["Enums"]["referral_reward_basis"]
          _basis_value: number
          _fixed: number
          _percentage: number
        }
        Returns: number
      }
      deny_practice_patient: {
        Args: { _practice_patient_id: string }
        Returns: undefined
      }
      ensure_referral_code: { Args: { _user_id: string }; Returns: string }
      evaluate_referral_eligibility: {
        Args: { _referred_id: string }
        Returns: undefined
      }
      expire_stale_payments: { Args: never; Returns: undefined }
      find_matching_practice_patients: {
        Args: never
        Returns: {
          created_at: string
          date_of_birth_year: number
          doctor_id: string
          doctor_name: string
          id: string
          practice_id: string
          practice_name: string
        }[]
      }
      generate_referral_code: { Args: never; Returns: string }
      get_consultation_summary: {
        Args: { _appointment_id: string }
        Returns: {
          appointment_id: string
          summary: string
          updated_at: string
        }[]
      }
      get_default_platform_fee_percent: { Args: never; Returns: number }
      get_doctor_blocked_slots: {
        Args: { _doctor_id: string }
        Returns: {
          end_time: string
          start_time: string
        }[]
      }
      get_doctor_next_available_slot: {
        Args: { _doctor: string }
        Returns: string
      }
      get_fee_plan_summary: {
        Args: { _plan_id: string }
        Returns: {
          is_default: boolean
          name: string
          platform_fee_percent: number
        }[]
      }
      get_founding_slots: { Args: never; Returns: Json }
      get_my_fee_settings: {
        Args: never
        Returns: {
          created_at: string
          description: string | null
          fee_bearer: string
          fixed_transaction_fee: number
          id: string
          is_active: boolean
          is_default: boolean
          is_founding_plan: boolean
          minimum_payout: number
          name: string
          payout_schedule: string
          platform_fee_percent: number
          processing_fee_fixed: number
          processing_fee_percent: number
          updated_at: string
          vat_enabled: boolean
          vat_percent: number
        }
        SetofOptions: {
          from: "*"
          to: "platform_fee_settings"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      get_patient_id_verification_status: {
        Args: { _user: string }
        Returns: string
      }
      get_payment_gateway_public_config: {
        Args: { _context?: Database["public"]["Enums"]["business_unit"] }
        Returns: Json
      }
      get_public_reviews: {
        Args: { _doctor_id: string }
        Returns: {
          comment: string
          created_at: string
          doctor_clear_helpful: boolean
          doctor_id: string
          doctor_professional: boolean
          id: string
          rating: number
          would_recommend: boolean
        }[]
      }
      get_user_referral_stats: { Args: { _user_id?: string }; Returns: Json }
      has_permission: {
        Args: {
          _permission: Database["public"]["Enums"]["app_permission"]
          _user_id: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      hash_identifier: {
        Args: { _country: string; _id_type: string; _id_value: string }
        Returns: string
      }
      is_doctor_available_now: { Args: { _doctor: string }; Returns: boolean }
      is_identity_verified: { Args: { _user: string }; Returns: boolean }
      is_platform_admin: { Args: { _user_id: string }; Returns: boolean }
      is_practice_manager: {
        Args: { _practice_id: string; _user_id: string }
        Returns: boolean
      }
      is_practice_member: {
        Args: { _practice_id: string; _user_id: string }
        Returns: boolean
      }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
      is_test_or_demo_user: { Args: { _user_id: string }; Returns: boolean }
      link_practice_patient: {
        Args: { _practice_patient_id: string }
        Returns: string
      }
      list_public_doctor_availability: {
        Args: never
        Returns: {
          doctor_id: string
          is_available_now: boolean
          next_available_at: string
        }[]
      }
      log_audit_event_self: {
        Args: { _action: string; _details: Json; _table_name: string }
        Returns: undefined
      }
      my_permissions: {
        Args: never
        Returns: Database["public"]["Enums"]["app_permission"][]
      }
      nalavation_log_audit: {
        Args: {
          _action: string
          _new?: Json
          _previous?: Json
          _resource_id?: string
          _resource_type?: string
        }
        Returns: string
      }
      nalavation_request_service: {
        Args: {
          _contact_email?: string
          _contact_name?: string
          _contact_phone?: string
          _external_ref?: string
          _notes?: string
          _practice_name?: string
          _service_code: string
          _source_platform?: string
        }
        Returns: string
      }
      owns_doctor_record: {
        Args: { _doctor_id: string; _user_id: string }
        Returns: boolean
      }
      owns_np_project: {
        Args: { _project_id: string; _user_id: string }
        Returns: boolean
      }
      process_consultation_referral_reward: {
        Args: { _appointment_id: string }
        Returns: undefined
      }
      reject_profile_change: {
        Args: { _change_id: string; _reason: string }
        Returns: undefined
      }
      release_appointment_slot: {
        Args: { _reservation_id: string }
        Returns: undefined
      }
      request_profile_change_info: {
        Args: { _change_id: string; _message: string }
        Returns: undefined
      }
      reserve_appointment_slot: {
        Args: { _doctor_id: string; _end: string; _start: string }
        Returns: string
      }
      resolve_referral_reward_setting: {
        Args: {
          _country: string
          _referred_type: Database["public"]["Enums"]["referral_user_type"]
          _referrer_type: Database["public"]["Enums"]["referral_user_type"]
        }
        Returns: {
          amount: number
          country: string
          created_at: string
          currency: string
          id: string
          is_enabled: boolean
          lifetime_reward_cap: number | null
          monthly_reward_cap: number | null
          referred_type: Database["public"]["Enums"]["referral_user_type"]
          referrer_type: Database["public"]["Enums"]["referral_user_type"]
          requires_admin_approval: boolean
          reward_basis: Database["public"]["Enums"]["referral_reward_basis"]
          reward_duration_months: number | null
          reward_percentage: number
          reward_type: Database["public"]["Enums"]["referral_reward_type"]
          trigger_event: Database["public"]["Enums"]["referral_trigger_event"]
          updated_at: string
          updated_by: string | null
          verification_requirements: Json
        }
        SetofOptions: {
          from: "*"
          to: "referral_reward_settings"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      user_delete_dependencies: { Args: { _user_id: string }; Returns: Json }
      verify_prescription: {
        Args: { _token: string }
        Returns: {
          doctor_name: string
          document_type: string
          issued_at: string
          patient_name: string
          prescription_number: string
          status: string
        }[]
      }
    }
    Enums: {
      accepted_payment_method_enum: "medical_aid_only" | "card_only" | "both"
      app_permission:
        | "manage_users"
        | "manage_admins"
        | "manage_content"
        | "manage_payments"
        | "manage_payment_gateways"
        | "manage_orders"
        | "manage_media"
        | "manage_settings"
        | "view_reports"
        | "issue_refunds"
        | "view_audit_logs"
        | "manage_enquiries"
      app_role:
        | "admin"
        | "patient"
        | "doctor"
        | "platform_admin"
        | "super_admin"
        | "receptionist"
        | "hospital_admin"
        | "department_admin"
        | "content_editor"
        | "finance_admin"
        | "support_admin"
        | "user"
      business_unit:
        | "doctorsonlining"
        | "nalavation"
        | "onlining_health"
        | "emko"
        | "tenderintel"
      content_status: "draft" | "published" | "unpublished" | "archived"
      enquiry_status:
        | "new"
        | "contacted"
        | "qualified"
        | "proposal_sent"
        | "won"
        | "lost"
        | "archived"
      practice_member_status: "invited" | "active" | "suspended"
      practice_role:
        | "owner"
        | "doctor"
        | "nurse"
        | "receptionist"
        | "practice_admin"
      pricing_tier_type: "private" | "medical_aid" | "follow_up" | "specialist"
      profile_change_status: "pending" | "approved" | "rejected" | "needs_info"
      referral_flag_severity: "block" | "review"
      referral_flag_type:
        | "self_referral"
        | "duplicate_email"
        | "duplicate_phone"
        | "duplicate_id"
        | "same_ip"
        | "same_device"
        | "same_card"
        | "pattern"
      referral_ledger_status:
        | "pending"
        | "approved"
        | "paid"
        | "reversed"
        | "rejected"
      referral_ledger_type: "credit" | "debit" | "payout" | "reversal"
      referral_reward_basis:
        | "fixed_amount"
        | "pct_platform_fee"
        | "pct_consultation_fee"
        | "pct_net_revenue"
      referral_reward_type:
        | "wallet_credit"
        | "cash"
        | "voucher"
        | "promo_credit"
      referral_status:
        | "pending_signup"
        | "pending_verification"
        | "pending_first_consult"
        | "eligible"
        | "approved"
        | "rejected"
        | "fraud_detected"
        | "paid"
      referral_trigger_event:
        | "signup"
        | "email_verified"
        | "identity_verified"
        | "first_consultation_completed"
        | "per_consultation"
      referral_user_type: "doctor" | "patient"
      section_type:
        | "hero"
        | "text"
        | "image_text"
        | "services_grid"
        | "pricing_cards"
        | "features"
        | "statistics"
        | "testimonials"
        | "portfolio_grid"
        | "cta"
        | "faq"
        | "contact_form"
        | "team"
        | "logo_cloud"
        | "video"
        | "rich_text"
      user_status: "active" | "suspended" | "pending" | "deactivated"
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
      accepted_payment_method_enum: ["medical_aid_only", "card_only", "both"],
      app_permission: [
        "manage_users",
        "manage_admins",
        "manage_content",
        "manage_payments",
        "manage_payment_gateways",
        "manage_orders",
        "manage_media",
        "manage_settings",
        "view_reports",
        "issue_refunds",
        "view_audit_logs",
        "manage_enquiries",
      ],
      app_role: [
        "admin",
        "patient",
        "doctor",
        "platform_admin",
        "super_admin",
        "receptionist",
        "hospital_admin",
        "department_admin",
        "content_editor",
        "finance_admin",
        "support_admin",
        "user",
      ],
      business_unit: [
        "doctorsonlining",
        "nalavation",
        "onlining_health",
        "emko",
        "tenderintel",
      ],
      content_status: ["draft", "published", "unpublished", "archived"],
      enquiry_status: [
        "new",
        "contacted",
        "qualified",
        "proposal_sent",
        "won",
        "lost",
        "archived",
      ],
      practice_member_status: ["invited", "active", "suspended"],
      practice_role: [
        "owner",
        "doctor",
        "nurse",
        "receptionist",
        "practice_admin",
      ],
      pricing_tier_type: ["private", "medical_aid", "follow_up", "specialist"],
      profile_change_status: ["pending", "approved", "rejected", "needs_info"],
      referral_flag_severity: ["block", "review"],
      referral_flag_type: [
        "self_referral",
        "duplicate_email",
        "duplicate_phone",
        "duplicate_id",
        "same_ip",
        "same_device",
        "same_card",
        "pattern",
      ],
      referral_ledger_status: [
        "pending",
        "approved",
        "paid",
        "reversed",
        "rejected",
      ],
      referral_ledger_type: ["credit", "debit", "payout", "reversal"],
      referral_reward_basis: [
        "fixed_amount",
        "pct_platform_fee",
        "pct_consultation_fee",
        "pct_net_revenue",
      ],
      referral_reward_type: [
        "wallet_credit",
        "cash",
        "voucher",
        "promo_credit",
      ],
      referral_status: [
        "pending_signup",
        "pending_verification",
        "pending_first_consult",
        "eligible",
        "approved",
        "rejected",
        "fraud_detected",
        "paid",
      ],
      referral_trigger_event: [
        "signup",
        "email_verified",
        "identity_verified",
        "first_consultation_completed",
        "per_consultation",
      ],
      referral_user_type: ["doctor", "patient"],
      section_type: [
        "hero",
        "text",
        "image_text",
        "services_grid",
        "pricing_cards",
        "features",
        "statistics",
        "testimonials",
        "portfolio_grid",
        "cta",
        "faq",
        "contact_form",
        "team",
        "logo_cloud",
        "video",
        "rich_text",
      ],
      user_status: ["active", "suspended", "pending", "deactivated"],
    },
  },
} as const
