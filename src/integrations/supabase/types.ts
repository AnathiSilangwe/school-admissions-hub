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
      applicants: {
        Row: {
          academic_average: number
          address: string
          age: number
          application_number: string
          application_status: string
          applying_grade_id: string
          created_at: string
          current_grade: string
          date_of_birth: string
          email: string
          first_name: string
          gender: string
          id: string
          id_number: string
          last_name: string
          parent_email: string
          parent_name: string
          parent_phone: string
          parent_relationship: string
          phone: string
          previous_school: string
        }
        Insert: {
          academic_average: number
          address: string
          age: number
          application_number: string
          application_status?: string
          applying_grade_id: string
          created_at?: string
          current_grade: string
          date_of_birth: string
          email: string
          first_name: string
          gender: string
          id?: string
          id_number: string
          last_name: string
          parent_email: string
          parent_name: string
          parent_phone: string
          parent_relationship: string
          phone: string
          previous_school: string
        }
        Update: {
          academic_average?: number
          address?: string
          age?: number
          application_number?: string
          application_status?: string
          applying_grade_id?: string
          created_at?: string
          current_grade?: string
          date_of_birth?: string
          email?: string
          first_name?: string
          gender?: string
          id?: string
          id_number?: string
          last_name?: string
          parent_email?: string
          parent_name?: string
          parent_phone?: string
          parent_relationship?: string
          phone?: string
          previous_school?: string
        }
        Relationships: [
          {
            foreignKeyName: "applicants_applying_grade_id_fkey"
            columns: ["applying_grade_id"]
            isOneToOne: false
            referencedRelation: "grades"
            referencedColumns: ["id"]
          },
        ]
      }
      appointments: {
        Row: {
          applicant_id: string
          appointment_date: string
          appointment_time: string
          created_at: string
          fee_paid: boolean
          id: string
          venue: string
        }
        Insert: {
          applicant_id: string
          appointment_date: string
          appointment_time: string
          created_at?: string
          fee_paid?: boolean
          id?: string
          venue?: string
        }
        Update: {
          applicant_id?: string
          appointment_date?: string
          appointment_time?: string
          created_at?: string
          fee_paid?: boolean
          id?: string
          venue?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_applicant_id_fkey"
            columns: ["applicant_id"]
            isOneToOne: false
            referencedRelation: "applicants"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_email: string | null
          actor_id: string | null
          applicant_id: string | null
          created_at: string
          description: string | null
          details: Json
          grade_id: string | null
          id: string
          target_user_id: string | null
        }
        Insert: {
          action: string
          actor_email?: string | null
          actor_id?: string | null
          applicant_id?: string | null
          created_at?: string
          description?: string | null
          details?: Json
          grade_id?: string | null
          id?: string
          target_user_id?: string | null
        }
        Update: {
          action?: string
          actor_email?: string | null
          actor_id?: string | null
          applicant_id?: string | null
          created_at?: string
          description?: string | null
          details?: Json
          grade_id?: string | null
          id?: string
          target_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_applicant_id_fkey"
            columns: ["applicant_id"]
            isOneToOne: false
            referencedRelation: "applicants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_grade_id_fkey"
            columns: ["grade_id"]
            isOneToOne: false
            referencedRelation: "grades"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          applicant_id: string
          birth_certificate_path: string | null
          created_at: string
          id: string
          id_copy_path: string
          previous_results_path: string
          proof_residence_path: string
        }
        Insert: {
          applicant_id: string
          birth_certificate_path?: string | null
          created_at?: string
          id?: string
          id_copy_path: string
          previous_results_path: string
          proof_residence_path: string
        }
        Update: {
          applicant_id?: string
          birth_certificate_path?: string | null
          created_at?: string
          id?: string
          id_copy_path?: string
          previous_results_path?: string
          proof_residence_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_applicant_id_fkey"
            columns: ["applicant_id"]
            isOneToOne: false
            referencedRelation: "applicants"
            referencedColumns: ["id"]
          },
        ]
      }
      email_outbox: {
        Row: {
          applicant_id: string | null
          attempts: number
          body_text: string
          created_at: string
          id: string
          last_error: string | null
          sent_at: string | null
          status: string
          subject: string
          to_email: string
          updated_at: string
        }
        Insert: {
          applicant_id?: string | null
          attempts?: number
          body_text: string
          created_at?: string
          id?: string
          last_error?: string | null
          sent_at?: string | null
          status?: string
          subject: string
          to_email: string
          updated_at?: string
        }
        Update: {
          applicant_id?: string | null
          attempts?: number
          body_text?: string
          created_at?: string
          id?: string
          last_error?: string | null
          sent_at?: string | null
          status?: string
          subject?: string
          to_email?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_outbox_applicant_id_fkey"
            columns: ["applicant_id"]
            isOneToOne: false
            referencedRelation: "applicants"
            referencedColumns: ["id"]
          },
        ]
      }
      grades: {
        Row: {
          capacity: number
          grade_number: number
          id: string
          name: string
          occupied: number
        }
        Insert: {
          capacity: number
          grade_number: number
          id?: string
          name: string
          occupied?: number
        }
        Update: {
          capacity?: number
          grade_number?: number
          id?: string
          name?: string
          occupied?: number
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
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
      admin_set_application_status: {
        Args: { _applicant_id: string; _status: string }
        Returns: {
          academic_average: number
          address: string
          age: number
          application_number: string
          application_status: string
          applying_grade_id: string
          created_at: string
          current_grade: string
          date_of_birth: string
          email: string
          first_name: string
          gender: string
          id: string
          id_number: string
          last_name: string
          parent_email: string
          parent_name: string
          parent_phone: string
          parent_relationship: string
          phone: string
          previous_school: string
        }
        SetofOptions: {
          from: "*"
          to: "applicants"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_set_grade_capacity: {
        Args: { _capacity: number; _grade_id: string }
        Returns: {
          capacity: number
          grade_number: number
          id: string
          name: string
          occupied: number
        }
        SetofOptions: {
          from: "*"
          to: "grades"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      claim_grade_seat: {
        Args: { _grade_id: string }
        Returns: {
          capacity: number
          grade_number: number
          id: string
          name: string
          occupied: number
        }
        SetofOptions: {
          from: "*"
          to: "grades"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      next_application_number: { Args: never; Returns: string }
      submit_application: {
        Args: {
          _academic_average: number
          _address: string
          _age: number
          _applying_grade_id: string
          _birth_certificate_path?: string
          _current_grade: string
          _date_of_birth: string
          _email: string
          _first_name: string
          _gender: string
          _id_copy_path: string
          _id_number: string
          _last_name: string
          _parent_email: string
          _parent_name: string
          _parent_phone: string
          _parent_relationship: string
          _phone: string
          _previous_results_path: string
          _previous_school: string
          _proof_residence_path: string
        }
        Returns: {
          application_number: string
          appointment_date: string
          appointment_time: string
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "admissions_officer"
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
      app_role: ["admin", "admissions_officer"],
    },
  },
} as const
