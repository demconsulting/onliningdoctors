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
          user_id: string | null
        }
        Insert: {
          channel?: string | null
          created_at?: string
          id?: string
          session_id: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          channel?: string | null
          created_at?: string
          id?: string
          session_id?: string
          status?: string
          updated_at?: string
          user_id?: string | null
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
          cancellation_reason: string | null
          created_at: string
          dependent_id: string | null
          doctor_id: string
          duration_minutes: number
          id: string
          notes: string | null
          patient_id: string
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
          cancellation_reason?: string | null
          created_at?: string
          dependent_id?: string | null
          doctor_id: string
          duration_minutes?: number
          id?: string
          notes?: string | null
          patient_id: string
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
          cancellation_reason?: string | null
          created_at?: string
          dependent_id?: string | null
          doctor_id?: string
          duration_minutes?: number
          id?: string
          notes?: string | null
          patient_id?: string
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
      doctors: {
        Row: {
          auto_weekly_payout: boolean
          bio: string | null
          consultation_category_id: string | null
          consultation_fee: number | null
          created_at: string
          education: string | null
          experience_years: number | null
          hospital_affiliation: string | null
          id: string
          is_available: boolean | null
          is_suspended: boolean
          is_verified: boolean
          languages: string[] | null
          license_document_path: string | null
          license_number: string | null
          practice_email: string | null
          practice_id: string | null
          practice_logo_url: string | null
          practice_name: string | null
          practice_phone: string | null
          profile_id: string
          rating: number | null
          specialty_id: string | null
          suspension_reason: string | null
          title: string | null
          total_reviews: number | null
          updated_at: string
        }
        Insert: {
          auto_weekly_payout?: boolean
          bio?: string | null
          consultation_category_id?: string | null
          consultation_fee?: number | null
          created_at?: string
          education?: string | null
          experience_years?: number | null
          hospital_affiliation?: string | null
          id?: string
          is_available?: boolean | null
          is_suspended?: boolean
          is_verified?: boolean
          languages?: string[] | null
          license_document_path?: string | null
          license_number?: string | null
          practice_email?: string | null
          practice_id?: string | null
          practice_logo_url?: string | null
          practice_name?: string | null
          practice_phone?: string | null
          profile_id: string
          rating?: number | null
          specialty_id?: string | null
          suspension_reason?: string | null
          title?: string | null
          total_reviews?: number | null
          updated_at?: string
        }
        Update: {
          auto_weekly_payout?: boolean
          bio?: string | null
          consultation_category_id?: string | null
          consultation_fee?: number | null
          created_at?: string
          education?: string | null
          experience_years?: number | null
          hospital_affiliation?: string | null
          id?: string
          is_available?: boolean | null
          is_suspended?: boolean
          is_verified?: boolean
          languages?: string[] | null
          license_document_path?: string | null
          license_number?: string | null
          practice_email?: string | null
          practice_id?: string | null
          practice_logo_url?: string | null
          practice_name?: string | null
          practice_phone?: string | null
          profile_id?: string
          rating?: number | null
          specialty_id?: string | null
          suspension_reason?: string | null
          title?: string | null
          total_reviews?: number | null
          updated_at?: string
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
      notifications: {
        Row: {
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
          file_name: string
          file_path: string
          file_size: number | null
          id: string
          mime_type: string | null
          patient_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          document_type?: string | null
          file_name: string
          file_path: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          patient_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          document_type?: string | null
          file_name?: string
          file_path?: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          patient_id?: string
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
      payments: {
        Row: {
          amount: number
          appointment_id: string | null
          created_at: string
          currency: string
          doctor_id: string
          fee_amount: number | null
          fee_bearer: string | null
          id: string
          metadata: Json | null
          paid_at: string | null
          patient_id: string
          payment_method: string | null
          paystack_access_code: string | null
          paystack_reference: string | null
          status: string
          transaction_type: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          appointment_id?: string | null
          created_at?: string
          currency?: string
          doctor_id: string
          fee_amount?: number | null
          fee_bearer?: string | null
          id?: string
          metadata?: Json | null
          paid_at?: string | null
          patient_id: string
          payment_method?: string | null
          paystack_access_code?: string | null
          paystack_reference?: string | null
          status?: string
          transaction_type?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          appointment_id?: string | null
          created_at?: string
          currency?: string
          doctor_id?: string
          fee_amount?: number | null
          fee_bearer?: string | null
          id?: string
          metadata?: Json | null
          paid_at?: string | null
          patient_id?: string
          payment_method?: string | null
          paystack_access_code?: string | null
          paystack_reference?: string | null
          status?: string
          transaction_type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
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
          created_at: string
          dependent_id: string | null
          diagnosis: string | null
          doctor_id: string
          doctor_logo_url: string | null
          doctor_signature_url: string | null
          follow_up_date: string | null
          id: string
          medications: Json
          patient_id: string
          pharmacy_notes: string | null
          refill_count: number | null
          updated_at: string
          warnings: string | null
        }
        Insert: {
          allergies_noted?: string | null
          appointment_id: string
          created_at?: string
          dependent_id?: string | null
          diagnosis?: string | null
          doctor_id: string
          doctor_logo_url?: string | null
          doctor_signature_url?: string | null
          follow_up_date?: string | null
          id?: string
          medications?: Json
          patient_id: string
          pharmacy_notes?: string | null
          refill_count?: number | null
          updated_at?: string
          warnings?: string | null
        }
        Update: {
          allergies_noted?: string | null
          appointment_id?: string
          created_at?: string
          dependent_id?: string | null
          diagnosis?: string | null
          doctor_id?: string
          doctor_logo_url?: string | null
          doctor_signature_url?: string | null
          follow_up_date?: string | null
          id?: string
          medications?: Json
          patient_id?: string
          pharmacy_notes?: string | null
          refill_count?: number | null
          updated_at?: string
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
          address: string | null
          avatar_url: string | null
          city: string | null
          country: string | null
          created_at: string
          date_of_birth: string | null
          full_name: string | null
          gender: string | null
          id: string
          is_suspended: boolean
          phone: string | null
          state: string | null
          suspension_reason: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          date_of_birth?: string | null
          full_name?: string | null
          gender?: string | null
          id: string
          is_suspended?: boolean
          phone?: string | null
          state?: string | null
          suspension_reason?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          date_of_birth?: string | null
          full_name?: string | null
          gender?: string | null
          id?: string
          is_suspended?: boolean
          phone?: string | null
          state?: string | null
          suspension_reason?: string | null
          updated_at?: string
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
      support_tickets: {
        Row: {
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
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
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
          is_suspended: boolean | null
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
      expire_stale_payments: { Args: never; Returns: undefined }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_practice_manager: {
        Args: { _practice_id: string; _user_id: string }
        Returns: boolean
      }
      is_practice_member: {
        Args: { _practice_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "patient" | "doctor"
      practice_member_status: "invited" | "active" | "suspended"
      practice_role:
        | "owner"
        | "doctor"
        | "nurse"
        | "receptionist"
        | "practice_admin"
      pricing_tier_type: "private" | "medical_aid" | "follow_up" | "specialist"
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
      app_role: ["admin", "patient", "doctor"],
      practice_member_status: ["invited", "active", "suspended"],
      practice_role: [
        "owner",
        "doctor",
        "nurse",
        "receptionist",
        "practice_admin",
      ],
      pricing_tier_type: ["private", "medical_aid", "follow_up", "specialist"],
    },
  },
} as const
