export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      app_sessions: {
        Row: {
          assurance_level: string
          auth_session_id: string
          created_at: string
          device_label: string | null
          expires_at: string
          id: string
          ip_prefix_hash: string | null
          last_seen_at: string
          profile_id: string
          revoked_at: string | null
          revoked_by: string | null
          revoked_reason: string | null
          user_agent_summary: string | null
        }
        Insert: {
          assurance_level: string
          auth_session_id: string
          created_at?: string
          device_label?: string | null
          expires_at: string
          id?: string
          ip_prefix_hash?: string | null
          last_seen_at?: string
          profile_id: string
          revoked_at?: string | null
          revoked_by?: string | null
          revoked_reason?: string | null
          user_agent_summary?: string | null
        }
        Update: {
          assurance_level?: string
          auth_session_id?: string
          created_at?: string
          device_label?: string | null
          expires_at?: string
          id?: string
          ip_prefix_hash?: string | null
          last_seen_at?: string
          profile_id?: string
          revoked_at?: string | null
          revoked_by?: string | null
          revoked_reason?: string | null
          user_agent_summary?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "app_sessions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "app_sessions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "staff_customer_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "app_sessions_revoked_by_fkey"
            columns: ["revoked_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "app_sessions_revoked_by_fkey"
            columns: ["revoked_by"]
            isOneToOne: false
            referencedRelation: "staff_customer_directory"
            referencedColumns: ["id"]
          },
        ]
      }
      assisted_suggestions: {
        Row: {
          batch_id: string
          created_at: string
          decided_at: string | null
          decided_by: string | null
          id: string
          ingestion_file_id: string | null
          locale: Database["public"]["Enums"]["app_locale"] | null
          model_key: string
          payload: Json
          product_id: string | null
          provider_key: string
          requested_by: string | null
          schema_version: string
          status: Database["public"]["Enums"]["suggestion_decision_status"]
          suggestion_kind: string
          updated_at: string
          version: number
        }
        Insert: {
          batch_id: string
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          id?: string
          ingestion_file_id?: string | null
          locale?: Database["public"]["Enums"]["app_locale"] | null
          model_key: string
          payload: Json
          product_id?: string | null
          provider_key: string
          requested_by?: string | null
          schema_version: string
          status?: Database["public"]["Enums"]["suggestion_decision_status"]
          suggestion_kind: string
          updated_at?: string
          version?: number
        }
        Update: {
          batch_id?: string
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          id?: string
          ingestion_file_id?: string | null
          locale?: Database["public"]["Enums"]["app_locale"] | null
          model_key?: string
          payload?: Json
          product_id?: string | null
          provider_key?: string
          requested_by?: string | null
          schema_version?: string
          status?: Database["public"]["Enums"]["suggestion_decision_status"]
          suggestion_kind?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "assisted_suggestions_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "ingestion_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assisted_suggestions_ingestion_file_id_fkey"
            columns: ["ingestion_file_id"]
            isOneToOne: false
            referencedRelation: "ingestion_files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assisted_suggestions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "catalog_export_rows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assisted_suggestions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assisted_suggestions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "public_catalog_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assisted_suggestions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "staff_catalog_products"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_event_archives: {
        Row: {
          action: string
          actor_class: string
          actor_profile_id: string | null
          archived_at: string
          contains_personal_data: boolean
          correlation_id: string
          entity_id: string | null
          entity_type: string
          id: number
          occurred_at: string
          purge_after: string
          result: string
          retention_class: string
          source: string
          summary: Json
        }
        Insert: {
          action: string
          actor_class: string
          actor_profile_id?: string | null
          archived_at?: string
          contains_personal_data: boolean
          correlation_id: string
          entity_id?: string | null
          entity_type: string
          id: number
          occurred_at: string
          purge_after: string
          result: string
          retention_class: string
          source: string
          summary: Json
        }
        Update: {
          action?: string
          actor_class?: string
          actor_profile_id?: string | null
          archived_at?: string
          contains_personal_data?: boolean
          correlation_id?: string
          entity_id?: string | null
          entity_type?: string
          id?: number
          occurred_at?: string
          purge_after?: string
          result?: string
          retention_class?: string
          source?: string
          summary?: Json
        }
        Relationships: []
      }
      audit_events: {
        Row: {
          action: string
          actor_class: string
          actor_profile_id: string | null
          contains_personal_data: boolean
          correlation_id: string
          entity_id: string | null
          entity_type: string
          id: number
          occurred_at: string
          result: string
          retention_class: string
          source: string
          summary: Json
        }
        Insert: {
          action: string
          actor_class: string
          actor_profile_id?: string | null
          contains_personal_data?: boolean
          correlation_id: string
          entity_id?: string | null
          entity_type: string
          id?: never
          occurred_at?: string
          result: string
          retention_class?: string
          source: string
          summary?: Json
        }
        Update: {
          action?: string
          actor_class?: string
          actor_profile_id?: string | null
          contains_personal_data?: boolean
          correlation_id?: string
          entity_id?: string | null
          entity_type?: string
          id?: never
          occurred_at?: string
          result?: string
          retention_class?: string
          source?: string
          summary?: Json
        }
        Relationships: [
          {
            foreignKeyName: "audit_events_actor_profile_id_fkey"
            columns: ["actor_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_events_actor_profile_id_fkey"
            columns: ["actor_profile_id"]
            isOneToOne: false
            referencedRelation: "staff_customer_directory"
            referencedColumns: ["id"]
          },
        ]
      }
      backup_restore_evidence: {
        Row: {
          artifact_reference: string | null
          backup_as_of: string | null
          checks: Json
          completed_at: string | null
          correlation_id: string
          created_at: string
          environment: string
          evidence_type: string
          id: string
          rpo_seconds: number | null
          rto_seconds: number | null
          started_at: string
          status: string
        }
        Insert: {
          artifact_reference?: string | null
          backup_as_of?: string | null
          checks?: Json
          completed_at?: string | null
          correlation_id: string
          created_at?: string
          environment: string
          evidence_type: string
          id?: string
          rpo_seconds?: number | null
          rto_seconds?: number | null
          started_at: string
          status: string
        }
        Update: {
          artifact_reference?: string | null
          backup_as_of?: string | null
          checks?: Json
          completed_at?: string | null
          correlation_id?: string
          created_at?: string
          environment?: string
          evidence_type?: string
          id?: string
          rpo_seconds?: number | null
          rto_seconds?: number | null
          started_at?: string
          status?: string
        }
        Relationships: []
      }
      bank_transfer_reviews: {
        Row: {
          amount_minor: number | null
          created_at: string
          currency: string | null
          evidence_path: string | null
          id: string
          order_id: string
          review_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          transfer_reference: string | null
          updated_at: string
          version: number
        }
        Insert: {
          amount_minor?: number | null
          created_at?: string
          currency?: string | null
          evidence_path?: string | null
          id?: string
          order_id: string
          review_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status: string
          transfer_reference?: string | null
          updated_at?: string
          version?: number
        }
        Update: {
          amount_minor?: number | null
          created_at?: string
          currency?: string | null
          evidence_path?: string | null
          id?: string
          order_id?: string
          review_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          transfer_reference?: string | null
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "bank_transfer_reviews_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_transfer_reviews_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "staff_order_operations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_transfer_reviews_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "staff_order_summaries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_transfer_reviews_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_transfer_reviews_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "staff_customer_directory"
            referencedColumns: ["id"]
          },
        ]
      }
      business_settings: {
        Row: {
          created_at: string
          key: string
          sensitive: boolean
          updated_at: string
          updated_by: string | null
          value: Json
          value_schema_version: number
          version: number
        }
        Insert: {
          created_at?: string
          key: string
          sensitive?: boolean
          updated_at?: string
          updated_by?: string | null
          value?: Json
          value_schema_version?: number
          version?: number
        }
        Update: {
          created_at?: string
          key?: string
          sensitive?: boolean
          updated_at?: string
          updated_by?: string | null
          value?: Json
          value_schema_version?: number
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "business_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "staff_customer_directory"
            referencedColumns: ["id"]
          },
        ]
      }
      cart_items: {
        Row: {
          cart_id: string
          created_at: string
          id: string
          observed_currency: string | null
          observed_product_version: number | null
          observed_unit_amount_minor: number | null
          product_id: string
          quantity: number
          updated_at: string
          version: number
        }
        Insert: {
          cart_id: string
          created_at?: string
          id?: string
          observed_currency?: string | null
          observed_product_version?: number | null
          observed_unit_amount_minor?: number | null
          product_id: string
          quantity: number
          updated_at?: string
          version?: number
        }
        Update: {
          cart_id?: string
          created_at?: string
          id?: string
          observed_currency?: string | null
          observed_product_version?: number | null
          observed_unit_amount_minor?: number | null
          product_id?: string
          quantity?: number
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "cart_items_cart_id_fkey"
            columns: ["cart_id"]
            isOneToOne: false
            referencedRelation: "carts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "catalog_export_rows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "public_catalog_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "staff_catalog_products"
            referencedColumns: ["id"]
          },
        ]
      }
      carts: {
        Row: {
          created_at: string
          currency: string
          customer_profile_id: string | null
          discount_code: string | null
          expires_at: string
          guest_session_id: string | null
          id: string
          reconciled_at: string | null
          status: Database["public"]["Enums"]["cart_status"]
          updated_at: string
          version: number
        }
        Insert: {
          created_at?: string
          currency: string
          customer_profile_id?: string | null
          discount_code?: string | null
          expires_at?: string
          guest_session_id?: string | null
          id?: string
          reconciled_at?: string | null
          status?: Database["public"]["Enums"]["cart_status"]
          updated_at?: string
          version?: number
        }
        Update: {
          created_at?: string
          currency?: string
          customer_profile_id?: string | null
          discount_code?: string | null
          expires_at?: string
          guest_session_id?: string | null
          id?: string
          reconciled_at?: string | null
          status?: Database["public"]["Enums"]["cart_status"]
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "carts_customer_profile_id_fkey"
            columns: ["customer_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "carts_customer_profile_id_fkey"
            columns: ["customer_profile_id"]
            isOneToOne: false
            referencedRelation: "staff_customer_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "carts_guest_session_id_fkey"
            columns: ["guest_session_id"]
            isOneToOne: false
            referencedRelation: "guest_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      catalog_bulk_actions: {
        Row: {
          action: string
          actor_profile_id: string | null
          collection_id: string | null
          correlation_id: string
          created_at: string
          id: string
          idempotency_key: string
          requested_product_ids: string[]
          result: Json
        }
        Insert: {
          action: string
          actor_profile_id?: string | null
          collection_id?: string | null
          correlation_id: string
          created_at?: string
          id?: string
          idempotency_key: string
          requested_product_ids: string[]
          result: Json
        }
        Update: {
          action?: string
          actor_profile_id?: string | null
          collection_id?: string | null
          correlation_id?: string
          created_at?: string
          id?: string
          idempotency_key?: string
          requested_product_ids?: string[]
          result?: Json
        }
        Relationships: [
          {
            foreignKeyName: "catalog_bulk_actions_actor_profile_id_fkey"
            columns: ["actor_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catalog_bulk_actions_actor_profile_id_fkey"
            columns: ["actor_profile_id"]
            isOneToOne: false
            referencedRelation: "staff_customer_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catalog_bulk_actions_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
        ]
      }
      catalog_import_batches: {
        Row: {
          applied_row_count: number
          completed_at: string | null
          created_at: string
          created_by: string | null
          error_report_path: string | null
          header_mapping: Json
          id: string
          invalid_row_count: number
          original_filename: string
          row_count: number
          safe_error_code: string | null
          source_bucket: string
          source_checksum: string
          source_path: string
          status: Database["public"]["Enums"]["catalog_import_status"]
          updated_at: string
          valid_row_count: number
          version: number
        }
        Insert: {
          applied_row_count?: number
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          error_report_path?: string | null
          header_mapping?: Json
          id?: string
          invalid_row_count?: number
          original_filename: string
          row_count?: number
          safe_error_code?: string | null
          source_bucket?: string
          source_checksum: string
          source_path: string
          status?: Database["public"]["Enums"]["catalog_import_status"]
          updated_at?: string
          valid_row_count?: number
          version?: number
        }
        Update: {
          applied_row_count?: number
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          error_report_path?: string | null
          header_mapping?: Json
          id?: string
          invalid_row_count?: number
          original_filename?: string
          row_count?: number
          safe_error_code?: string | null
          source_bucket?: string
          source_checksum?: string
          source_path?: string
          status?: Database["public"]["Enums"]["catalog_import_status"]
          updated_at?: string
          valid_row_count?: number
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "catalog_import_batches_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catalog_import_batches_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "staff_customer_directory"
            referencedColumns: ["id"]
          },
        ]
      }
      catalog_import_rows: {
        Row: {
          applied_at: string | null
          batch_id: string
          created_at: string
          id: string
          normalized_record: Json | null
          product_id: string | null
          row_number: number
          safe_error_code: string | null
          source_record: Json
          status: Database["public"]["Enums"]["catalog_import_row_status"]
          validation_errors: Json
        }
        Insert: {
          applied_at?: string | null
          batch_id: string
          created_at?: string
          id?: string
          normalized_record?: Json | null
          product_id?: string | null
          row_number: number
          safe_error_code?: string | null
          source_record: Json
          status: Database["public"]["Enums"]["catalog_import_row_status"]
          validation_errors?: Json
        }
        Update: {
          applied_at?: string | null
          batch_id?: string
          created_at?: string
          id?: string
          normalized_record?: Json | null
          product_id?: string | null
          row_number?: number
          safe_error_code?: string | null
          source_record?: Json
          status?: Database["public"]["Enums"]["catalog_import_row_status"]
          validation_errors?: Json
        }
        Relationships: [
          {
            foreignKeyName: "catalog_import_rows_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "catalog_import_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catalog_import_rows_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "catalog_export_rows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catalog_import_rows_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catalog_import_rows_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "public_catalog_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catalog_import_rows_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "staff_catalog_products"
            referencedColumns: ["id"]
          },
        ]
      }
      catalog_revisions: {
        Row: {
          actor_profile_id: string | null
          changed_fields: string[]
          correlation_id: string
          created_at: string
          entity_id: string
          entity_type: string
          entity_version: number
          id: number
          note: string | null
          revision_kind: Database["public"]["Enums"]["catalog_revision_kind"]
          snapshot: Json
        }
        Insert: {
          actor_profile_id?: string | null
          changed_fields?: string[]
          correlation_id: string
          created_at?: string
          entity_id: string
          entity_type: string
          entity_version: number
          id?: never
          note?: string | null
          revision_kind: Database["public"]["Enums"]["catalog_revision_kind"]
          snapshot: Json
        }
        Update: {
          actor_profile_id?: string | null
          changed_fields?: string[]
          correlation_id?: string
          created_at?: string
          entity_id?: string
          entity_type?: string
          entity_version?: number
          id?: never
          note?: string | null
          revision_kind?: Database["public"]["Enums"]["catalog_revision_kind"]
          snapshot?: Json
        }
        Relationships: [
          {
            foreignKeyName: "catalog_revisions_actor_profile_id_fkey"
            columns: ["actor_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catalog_revisions_actor_profile_id_fkey"
            columns: ["actor_profile_id"]
            isOneToOne: false
            referencedRelation: "staff_customer_directory"
            referencedColumns: ["id"]
          },
        ]
      }
      checkout_sessions: {
        Row: {
          accepted_at: string | null
          accepted_order_id: string | null
          cart_id: string
          created_at: string
          expires_at: string
          id: string
          quote_id: string
          reservation_version: string
          status: Database["public"]["Enums"]["checkout_status"]
        }
        Insert: {
          accepted_at?: string | null
          accepted_order_id?: string | null
          cart_id: string
          created_at?: string
          expires_at: string
          id?: string
          quote_id: string
          reservation_version: string
          status?: Database["public"]["Enums"]["checkout_status"]
        }
        Update: {
          accepted_at?: string | null
          accepted_order_id?: string | null
          cart_id?: string
          created_at?: string
          expires_at?: string
          id?: string
          quote_id?: string
          reservation_version?: string
          status?: Database["public"]["Enums"]["checkout_status"]
        }
        Relationships: [
          {
            foreignKeyName: "checkout_sessions_cart_id_fkey"
            columns: ["cart_id"]
            isOneToOne: false
            referencedRelation: "carts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checkout_sessions_order_fk"
            columns: ["accepted_order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checkout_sessions_order_fk"
            columns: ["accepted_order_id"]
            isOneToOne: false
            referencedRelation: "staff_order_operations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checkout_sessions_order_fk"
            columns: ["accepted_order_id"]
            isOneToOne: false
            referencedRelation: "staff_order_summaries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checkout_sessions_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "delivery_quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      collection_products: {
        Row: {
          active_from: string
          active_until: string
          collection_id: string
          featured: boolean
          position: number
          product_id: string
        }
        Insert: {
          active_from?: string
          active_until?: string
          collection_id: string
          featured?: boolean
          position?: number
          product_id: string
        }
        Update: {
          active_from?: string
          active_until?: string
          collection_id?: string
          featured?: boolean
          position?: number
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "collection_products_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collection_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "catalog_export_rows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collection_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collection_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "public_catalog_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collection_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "staff_catalog_products"
            referencedColumns: ["id"]
          },
        ]
      }
      collection_translations: {
        Row: {
          collection_id: string
          created_at: string
          description: string | null
          id: string
          locale: Database["public"]["Enums"]["app_locale"]
          name: string
          seo_description: string | null
          seo_title: string | null
          slug: string
          status: Database["public"]["Enums"]["translation_status"]
          updated_at: string
          version: number
        }
        Insert: {
          collection_id: string
          created_at?: string
          description?: string | null
          id?: string
          locale: Database["public"]["Enums"]["app_locale"]
          name: string
          seo_description?: string | null
          seo_title?: string | null
          slug: string
          status?: Database["public"]["Enums"]["translation_status"]
          updated_at?: string
          version?: number
        }
        Update: {
          collection_id?: string
          created_at?: string
          description?: string | null
          id?: string
          locale?: Database["public"]["Enums"]["app_locale"]
          name?: string
          seo_description?: string | null
          seo_title?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["translation_status"]
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "collection_translations_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
        ]
      }
      collections: {
        Row: {
          archive_reason: string | null
          archived_by: string | null
          code: string
          collection_type: string
          created_at: string
          hero_media_asset_id: string | null
          id: string
          order_strategy: string
          published_at: string | null
          scheduled_at: string | null
          status: Database["public"]["Enums"]["collection_status"]
          updated_at: string
          version: number
        }
        Insert: {
          archive_reason?: string | null
          archived_by?: string | null
          code: string
          collection_type?: string
          created_at?: string
          hero_media_asset_id?: string | null
          id?: string
          order_strategy?: string
          published_at?: string | null
          scheduled_at?: string | null
          status?: Database["public"]["Enums"]["collection_status"]
          updated_at?: string
          version?: number
        }
        Update: {
          archive_reason?: string | null
          archived_by?: string | null
          code?: string
          collection_type?: string
          created_at?: string
          hero_media_asset_id?: string | null
          id?: string
          order_strategy?: string
          published_at?: string | null
          scheduled_at?: string | null
          status?: Database["public"]["Enums"]["collection_status"]
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "collections_archived_by_fkey"
            columns: ["archived_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collections_archived_by_fkey"
            columns: ["archived_by"]
            isOneToOne: false
            referencedRelation: "staff_customer_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collections_hero_media_asset_fk"
            columns: ["hero_media_asset_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      commerce_configuration_revisions: {
        Row: {
          area: string
          changed_by: string
          correlation_id: string
          created_at: string
          id: number
          reason: string
          snapshot: Json
          subject_key: string
          version: number
        }
        Insert: {
          area: string
          changed_by: string
          correlation_id: string
          created_at?: string
          id?: never
          reason: string
          snapshot: Json
          subject_key: string
          version: number
        }
        Update: {
          area?: string
          changed_by?: string
          correlation_id?: string
          created_at?: string
          id?: never
          reason?: string
          snapshot?: Json
          subject_key?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "commerce_configuration_revisions_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commerce_configuration_revisions_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "staff_customer_directory"
            referencedColumns: ["id"]
          },
        ]
      }
      consent_records: {
        Row: {
          choice: Database["public"]["Enums"]["consent_choice"]
          correlation_id: string
          disclosure_version: string
          guest_subject_hash: string | null
          id: string
          locale: Database["public"]["Enums"]["app_locale"]
          preference_metadata: Json
          profile_id: string | null
          purpose: string
          recorded_at: string
          source: string
          supersedes_id: string | null
          withdrawal_effective_at: string | null
        }
        Insert: {
          choice: Database["public"]["Enums"]["consent_choice"]
          correlation_id?: string
          disclosure_version: string
          guest_subject_hash?: string | null
          id?: string
          locale: Database["public"]["Enums"]["app_locale"]
          preference_metadata?: Json
          profile_id?: string | null
          purpose: string
          recorded_at?: string
          source: string
          supersedes_id?: string | null
          withdrawal_effective_at?: string | null
        }
        Update: {
          choice?: Database["public"]["Enums"]["consent_choice"]
          correlation_id?: string
          disclosure_version?: string
          guest_subject_hash?: string | null
          id?: string
          locale?: Database["public"]["Enums"]["app_locale"]
          preference_metadata?: Json
          profile_id?: string | null
          purpose?: string
          recorded_at?: string
          source?: string
          supersedes_id?: string | null
          withdrawal_effective_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "consent_records_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consent_records_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "staff_customer_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consent_records_supersedes_id_fkey"
            columns: ["supersedes_id"]
            isOneToOne: false
            referencedRelation: "consent_records"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_channels: {
        Row: {
          channel_key: string
          channel_type: string
          configuration_status: string
          created_at: string
          enabled: boolean
          id: string
          labels_i18n: Json
          public_value: string
          updated_at: string
          updated_by: string | null
          verified_at: string | null
          version: number
        }
        Insert: {
          channel_key: string
          channel_type: string
          configuration_status?: string
          created_at?: string
          enabled?: boolean
          id?: string
          labels_i18n: Json
          public_value: string
          updated_at?: string
          updated_by?: string | null
          verified_at?: string | null
          version?: number
        }
        Update: {
          channel_key?: string
          channel_type?: string
          configuration_status?: string
          created_at?: string
          enabled?: boolean
          id?: string
          labels_i18n?: Json
          public_value?: string
          updated_at?: string
          updated_by?: string | null
          verified_at?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "contact_channels_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_channels_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "staff_customer_directory"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_submission_events: {
        Row: {
          actor_profile_id: string | null
          contact_submission_id: string
          correlation_id: string
          created_at: string
          event_type: string
          from_status: string | null
          id: number
          idempotency_key_hash: string
          safe_note: string | null
          to_status: string | null
        }
        Insert: {
          actor_profile_id?: string | null
          contact_submission_id: string
          correlation_id: string
          created_at?: string
          event_type: string
          from_status?: string | null
          id?: never
          idempotency_key_hash: string
          safe_note?: string | null
          to_status?: string | null
        }
        Update: {
          actor_profile_id?: string | null
          contact_submission_id?: string
          correlation_id?: string
          created_at?: string
          event_type?: string
          from_status?: string | null
          id?: never
          idempotency_key_hash?: string
          safe_note?: string | null
          to_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contact_submission_events_actor_profile_id_fkey"
            columns: ["actor_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_submission_events_actor_profile_id_fkey"
            columns: ["actor_profile_id"]
            isOneToOne: false
            referencedRelation: "staff_customer_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_submission_events_contact_submission_id_fkey"
            columns: ["contact_submission_id"]
            isOneToOne: false
            referencedRelation: "contact_submissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_submission_events_contact_submission_id_fkey"
            columns: ["contact_submission_id"]
            isOneToOne: false
            referencedRelation: "staff_contact_queue"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_submissions: {
        Row: {
          channel_key: string | null
          contact_email: string
          correlation_id: string
          created_at: string
          disclosure_version: string
          full_name: string
          guest_proof_hash: string | null
          guest_subject_hash: string
          id: string
          idempotency_key_hash: string
          locale: Database["public"]["Enums"]["app_locale"]
          message: string
          message_fingerprint: string
          notification_state: string
          order_reference: string | null
          profile_id: string | null
          reference: string
          retention_due_at: string
          status: string
          subject: string
          updated_at: string
          version: number
        }
        Insert: {
          channel_key?: string | null
          contact_email: string
          correlation_id?: string
          created_at?: string
          disclosure_version: string
          full_name: string
          guest_proof_hash?: string | null
          guest_subject_hash: string
          id?: string
          idempotency_key_hash: string
          locale: Database["public"]["Enums"]["app_locale"]
          message: string
          message_fingerprint: string
          notification_state?: string
          order_reference?: string | null
          profile_id?: string | null
          reference?: string
          retention_due_at?: string
          status?: string
          subject: string
          updated_at?: string
          version?: number
        }
        Update: {
          channel_key?: string | null
          contact_email?: string
          correlation_id?: string
          created_at?: string
          disclosure_version?: string
          full_name?: string
          guest_proof_hash?: string | null
          guest_subject_hash?: string
          id?: string
          idempotency_key_hash?: string
          locale?: Database["public"]["Enums"]["app_locale"]
          message?: string
          message_fingerprint?: string
          notification_state?: string
          order_reference?: string | null
          profile_id?: string | null
          reference?: string
          retention_due_at?: string
          status?: string
          subject?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "contact_submissions_channel_key_fkey"
            columns: ["channel_key"]
            isOneToOne: false
            referencedRelation: "contact_channels"
            referencedColumns: ["channel_key"]
          },
          {
            foreignKeyName: "contact_submissions_channel_key_fkey"
            columns: ["channel_key"]
            isOneToOne: false
            referencedRelation: "published_contact_channels"
            referencedColumns: ["channel_key"]
          },
          {
            foreignKeyName: "contact_submissions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_submissions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "staff_customer_directory"
            referencedColumns: ["id"]
          },
        ]
      }
      content_entries: {
        Row: {
          archived_at: string | null
          content_type: string
          created_at: string
          created_by: string | null
          entry_key: string
          fallback_policy: string
          id: string
          legal_status: string
          publish_at: string | null
          published_at: string | null
          status: string
          unpublish_at: string | null
          updated_at: string
          updated_by: string | null
          version: number
        }
        Insert: {
          archived_at?: string | null
          content_type: string
          created_at?: string
          created_by?: string | null
          entry_key: string
          fallback_policy?: string
          id?: string
          legal_status?: string
          publish_at?: string | null
          published_at?: string | null
          status?: string
          unpublish_at?: string | null
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Update: {
          archived_at?: string | null
          content_type?: string
          created_at?: string
          created_by?: string | null
          entry_key?: string
          fallback_policy?: string
          id?: string
          legal_status?: string
          publish_at?: string | null
          published_at?: string | null
          status?: string
          unpublish_at?: string | null
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "content_entries_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_entries_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "staff_customer_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_entries_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_entries_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "staff_customer_directory"
            referencedColumns: ["id"]
          },
        ]
      }
      content_menu_items: {
        Row: {
          created_at: string
          destination_path: string
          enabled: boolean
          id: string
          item_key: string
          labels_i18n: Json
          menu_id: string
          position: number
          updated_at: string
          version: number
          visible_from: string
          visible_until: string
        }
        Insert: {
          created_at?: string
          destination_path: string
          enabled?: boolean
          id?: string
          item_key: string
          labels_i18n: Json
          menu_id: string
          position: number
          updated_at?: string
          version?: number
          visible_from?: string
          visible_until?: string
        }
        Update: {
          created_at?: string
          destination_path?: string
          enabled?: boolean
          id?: string
          item_key?: string
          labels_i18n?: Json
          menu_id?: string
          position?: number
          updated_at?: string
          version?: number
          visible_from?: string
          visible_until?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_menu_items_menu_id_fkey"
            columns: ["menu_id"]
            isOneToOne: false
            referencedRelation: "content_menus"
            referencedColumns: ["id"]
          },
        ]
      }
      content_menu_revisions: {
        Row: {
          actor_profile_id: string | null
          correlation_id: string
          created_at: string
          id: number
          menu_id: string
          reason: string
          snapshot: Json
          version: number
        }
        Insert: {
          actor_profile_id?: string | null
          correlation_id: string
          created_at?: string
          id?: never
          menu_id: string
          reason: string
          snapshot: Json
          version: number
        }
        Update: {
          actor_profile_id?: string | null
          correlation_id?: string
          created_at?: string
          id?: never
          menu_id?: string
          reason?: string
          snapshot?: Json
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "content_menu_revisions_actor_profile_id_fkey"
            columns: ["actor_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_menu_revisions_actor_profile_id_fkey"
            columns: ["actor_profile_id"]
            isOneToOne: false
            referencedRelation: "staff_customer_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_menu_revisions_menu_id_fkey"
            columns: ["menu_id"]
            isOneToOne: false
            referencedRelation: "content_menus"
            referencedColumns: ["id"]
          },
        ]
      }
      content_menus: {
        Row: {
          created_at: string
          id: string
          menu_key: string
          published_at: string | null
          status: string
          updated_at: string
          updated_by: string | null
          version: number
        }
        Insert: {
          created_at?: string
          id?: string
          menu_key: string
          published_at?: string | null
          status?: string
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Update: {
          created_at?: string
          id?: string
          menu_key?: string
          published_at?: string | null
          status?: string
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "content_menus_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_menus_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "staff_customer_directory"
            referencedColumns: ["id"]
          },
        ]
      }
      content_preview_tokens: {
        Row: {
          content_entry_id: string
          created_at: string
          created_by: string
          expires_at: string
          id: string
          revoked_at: string | null
          token_hash: string
        }
        Insert: {
          content_entry_id: string
          created_at?: string
          created_by: string
          expires_at: string
          id?: string
          revoked_at?: string | null
          token_hash: string
        }
        Update: {
          content_entry_id?: string
          created_at?: string
          created_by?: string
          expires_at?: string
          id?: string
          revoked_at?: string | null
          token_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_preview_tokens_content_entry_id_fkey"
            columns: ["content_entry_id"]
            isOneToOne: false
            referencedRelation: "content_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_preview_tokens_content_entry_id_fkey"
            columns: ["content_entry_id"]
            isOneToOne: false
            referencedRelation: "staff_content_queue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_preview_tokens_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_preview_tokens_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "staff_customer_directory"
            referencedColumns: ["id"]
          },
        ]
      }
      content_redirects: {
        Row: {
          active_from: string
          active_until: string
          created_at: string
          destination_path: string
          http_status: number
          id: string
          source_path: string
          status: string
          updated_at: string
          updated_by: string | null
          version: number
        }
        Insert: {
          active_from?: string
          active_until?: string
          created_at?: string
          destination_path: string
          http_status?: number
          id?: string
          source_path: string
          status?: string
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Update: {
          active_from?: string
          active_until?: string
          created_at?: string
          destination_path?: string
          http_status?: number
          id?: string
          source_path?: string
          status?: string
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "content_redirects_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_redirects_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "staff_customer_directory"
            referencedColumns: ["id"]
          },
        ]
      }
      content_revisions: {
        Row: {
          actor_profile_id: string | null
          content_entry_id: string
          correlation_id: string
          created_at: string
          id: number
          operation: string
          reason: string
          snapshot: Json
          version: number
        }
        Insert: {
          actor_profile_id?: string | null
          content_entry_id: string
          correlation_id: string
          created_at?: string
          id?: never
          operation: string
          reason: string
          snapshot: Json
          version: number
        }
        Update: {
          actor_profile_id?: string | null
          content_entry_id?: string
          correlation_id?: string
          created_at?: string
          id?: never
          operation?: string
          reason?: string
          snapshot?: Json
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "content_revisions_actor_profile_id_fkey"
            columns: ["actor_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_revisions_actor_profile_id_fkey"
            columns: ["actor_profile_id"]
            isOneToOne: false
            referencedRelation: "staff_customer_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_revisions_content_entry_id_fkey"
            columns: ["content_entry_id"]
            isOneToOne: false
            referencedRelation: "content_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_revisions_content_entry_id_fkey"
            columns: ["content_entry_id"]
            isOneToOne: false
            referencedRelation: "staff_content_queue"
            referencedColumns: ["id"]
          },
        ]
      }
      content_translations: {
        Row: {
          blocks: Json
          content_entry_id: string
          created_at: string
          id: string
          locale: Database["public"]["Enums"]["app_locale"]
          meta_description: string | null
          meta_title: string | null
          review_status: string
          slug: string
          social_image_url: string | null
          summary: string | null
          title: string
          updated_at: string
          version: number
        }
        Insert: {
          blocks?: Json
          content_entry_id: string
          created_at?: string
          id?: string
          locale: Database["public"]["Enums"]["app_locale"]
          meta_description?: string | null
          meta_title?: string | null
          review_status?: string
          slug: string
          social_image_url?: string | null
          summary?: string | null
          title: string
          updated_at?: string
          version?: number
        }
        Update: {
          blocks?: Json
          content_entry_id?: string
          created_at?: string
          id?: string
          locale?: Database["public"]["Enums"]["app_locale"]
          meta_description?: string | null
          meta_title?: string | null
          review_status?: string
          slug?: string
          social_image_url?: string | null
          summary?: string | null
          title?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "content_translations_content_entry_id_fkey"
            columns: ["content_entry_id"]
            isOneToOne: false
            referencedRelation: "content_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_translations_content_entry_id_fkey"
            columns: ["content_entry_id"]
            isOneToOne: false
            referencedRelation: "staff_content_queue"
            referencedColumns: ["id"]
          },
        ]
      }
      currency_settings: {
        Row: {
          approved_rate_reference: string | null
          checkout_enabled: boolean
          configuration_status: string
          created_at: string
          currency: string
          display_order: number
          enabled: boolean
          is_default: boolean
          price_source_mode: Database["public"]["Enums"]["price_source_mode"]
          updated_at: string
          version: number
        }
        Insert: {
          approved_rate_reference?: string | null
          checkout_enabled?: boolean
          configuration_status?: string
          created_at?: string
          currency: string
          display_order?: number
          enabled?: boolean
          is_default?: boolean
          price_source_mode?: Database["public"]["Enums"]["price_source_mode"]
          updated_at?: string
          version?: number
        }
        Update: {
          approved_rate_reference?: string | null
          checkout_enabled?: boolean
          configuration_status?: string
          created_at?: string
          currency?: string
          display_order?: number
          enabled?: boolean
          is_default?: boolean
          price_source_mode?: Database["public"]["Enums"]["price_source_mode"]
          updated_at?: string
          version?: number
        }
        Relationships: []
      }
      customer_accounts: {
        Row: {
          closed_at: string | null
          closure_reason_code: string | null
          created_at: string
          deletion_requested_at: string | null
          profile_id: string
          status: Database["public"]["Enums"]["customer_account_status"]
          updated_at: string
          verified_at: string | null
          version: number
        }
        Insert: {
          closed_at?: string | null
          closure_reason_code?: string | null
          created_at?: string
          deletion_requested_at?: string | null
          profile_id: string
          status?: Database["public"]["Enums"]["customer_account_status"]
          updated_at?: string
          verified_at?: string | null
          version?: number
        }
        Update: {
          closed_at?: string | null
          closure_reason_code?: string | null
          created_at?: string
          deletion_requested_at?: string | null
          profile_id?: string
          status?: Database["public"]["Enums"]["customer_account_status"]
          updated_at?: string
          verified_at?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "customer_accounts_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_accounts_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "staff_customer_directory"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_addresses: {
        Row: {
          city: string
          country_code: string
          created_at: string
          full_name: string
          id: string
          instructions: string | null
          is_default: boolean
          label: string
          line1: string
          line2: string | null
          organization: string | null
          phone: string | null
          postal_code: string | null
          profile_id: string
          region: string | null
          updated_at: string
          version: number
        }
        Insert: {
          city: string
          country_code: string
          created_at?: string
          full_name: string
          id?: string
          instructions?: string | null
          is_default?: boolean
          label: string
          line1: string
          line2?: string | null
          organization?: string | null
          phone?: string | null
          postal_code?: string | null
          profile_id: string
          region?: string | null
          updated_at?: string
          version?: number
        }
        Update: {
          city?: string
          country_code?: string
          created_at?: string
          full_name?: string
          id?: string
          instructions?: string | null
          is_default?: boolean
          label?: string
          line1?: string
          line2?: string | null
          organization?: string | null
          phone?: string | null
          postal_code?: string | null
          profile_id?: string
          region?: string | null
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "customer_addresses_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_addresses_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "staff_customer_directory"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_merge_records: {
        Row: {
          cart_items_merged: number
          completed_at: string
          correlation_id: string
          customer_profile_id: string
          guest_session_id: string
          id: string
          idempotency_key_hash: string
          orders_claimed: number
          wishlist_items_merged: number
        }
        Insert: {
          cart_items_merged?: number
          completed_at?: string
          correlation_id: string
          customer_profile_id: string
          guest_session_id: string
          id?: string
          idempotency_key_hash: string
          orders_claimed?: number
          wishlist_items_merged?: number
        }
        Update: {
          cart_items_merged?: number
          completed_at?: string
          correlation_id?: string
          customer_profile_id?: string
          guest_session_id?: string
          id?: string
          idempotency_key_hash?: string
          orders_claimed?: number
          wishlist_items_merged?: number
        }
        Relationships: [
          {
            foreignKeyName: "customer_merge_records_customer_profile_id_fkey"
            columns: ["customer_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_merge_records_customer_profile_id_fkey"
            columns: ["customer_profile_id"]
            isOneToOne: false
            referencedRelation: "staff_customer_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_merge_records_guest_session_id_fkey"
            columns: ["guest_session_id"]
            isOneToOne: false
            referencedRelation: "guest_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_quotes: {
        Row: {
          breakdown: Json
          cart_id: string
          cart_version: number
          country_code: string
          created_at: string
          currency: string
          delivery_minor: number
          discount_minor: number
          expires_at: string
          id: string
          manual_quote: boolean
          method_id: string | null
          pricing_version: string
          subtotal_minor: number
          tax_minor: number
          total_minor: number
        }
        Insert: {
          breakdown: Json
          cart_id: string
          cart_version: number
          country_code: string
          created_at?: string
          currency: string
          delivery_minor: number
          discount_minor: number
          expires_at: string
          id?: string
          manual_quote?: boolean
          method_id?: string | null
          pricing_version: string
          subtotal_minor: number
          tax_minor: number
          total_minor: number
        }
        Update: {
          breakdown?: Json
          cart_id?: string
          cart_version?: number
          country_code?: string
          created_at?: string
          currency?: string
          delivery_minor?: number
          discount_minor?: number
          expires_at?: string
          id?: string
          manual_quote?: boolean
          method_id?: string | null
          pricing_version?: string
          subtotal_minor?: number
          tax_minor?: number
          total_minor?: number
        }
        Relationships: [
          {
            foreignKeyName: "delivery_quotes_cart_id_fkey"
            columns: ["cart_id"]
            isOneToOne: false
            referencedRelation: "carts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_quotes_method_id_fkey"
            columns: ["method_id"]
            isOneToOne: false
            referencedRelation: "shipping_methods"
            referencedColumns: ["id"]
          },
        ]
      }
      disclosure_versions: {
        Row: {
          copy_i18n: Json
          created_at: string
          created_by: string | null
          id: string
          published_at: string | null
          purpose: string
          retired_at: string | null
          status: string
          version_key: string
        }
        Insert: {
          copy_i18n: Json
          created_at?: string
          created_by?: string | null
          id?: string
          published_at?: string | null
          purpose: string
          retired_at?: string | null
          status?: string
          version_key: string
        }
        Update: {
          copy_i18n?: Json
          created_at?: string
          created_by?: string | null
          id?: string
          published_at?: string | null
          purpose?: string
          retired_at?: string | null
          status?: string
          version_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "disclosure_versions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disclosure_versions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "staff_customer_directory"
            referencedColumns: ["id"]
          },
        ]
      }
      discount_redemptions: {
        Row: {
          amount_minor: number
          created_at: string
          currency: string
          customer_profile_id: string | null
          discount_id: string
          guest_session_id: string | null
          id: string
          order_id: string
        }
        Insert: {
          amount_minor: number
          created_at?: string
          currency: string
          customer_profile_id?: string | null
          discount_id: string
          guest_session_id?: string | null
          id?: string
          order_id: string
        }
        Update: {
          amount_minor?: number
          created_at?: string
          currency?: string
          customer_profile_id?: string | null
          discount_id?: string
          guest_session_id?: string | null
          id?: string
          order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "discount_redemptions_customer_profile_id_fkey"
            columns: ["customer_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discount_redemptions_customer_profile_id_fkey"
            columns: ["customer_profile_id"]
            isOneToOne: false
            referencedRelation: "staff_customer_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discount_redemptions_discount_id_fkey"
            columns: ["discount_id"]
            isOneToOne: false
            referencedRelation: "discounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discount_redemptions_discount_id_fkey"
            columns: ["discount_id"]
            isOneToOne: false
            referencedRelation: "published_promotions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discount_redemptions_guest_session_id_fkey"
            columns: ["guest_session_id"]
            isOneToOne: false
            referencedRelation: "guest_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discount_redemptions_order_fk"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discount_redemptions_order_fk"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "staff_order_operations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discount_redemptions_order_fk"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "staff_order_summaries"
            referencedColumns: ["id"]
          },
        ]
      }
      discount_scopes: {
        Row: {
          collection_id: string | null
          discount_id: string
          id: string
          product_id: string | null
        }
        Insert: {
          collection_id?: string | null
          discount_id: string
          id?: string
          product_id?: string | null
        }
        Update: {
          collection_id?: string | null
          discount_id?: string
          id?: string
          product_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "discount_scopes_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discount_scopes_discount_id_fkey"
            columns: ["discount_id"]
            isOneToOne: false
            referencedRelation: "discounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discount_scopes_discount_id_fkey"
            columns: ["discount_id"]
            isOneToOne: false
            referencedRelation: "published_promotions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discount_scopes_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "catalog_export_rows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discount_scopes_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discount_scopes_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "public_catalog_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discount_scopes_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "staff_catalog_products"
            referencedColumns: ["id"]
          },
        ]
      }
      discounts: {
        Row: {
          code: string
          combinability: string
          configuration_status: string
          created_at: string
          currency: string | null
          description_i18n: Json | null
          enabled: boolean
          ends_at: string
          fixed_amount_minor: number | null
          id: string
          kind: Database["public"]["Enums"]["discount_kind"]
          maximum_discount_minor: number | null
          minimum_subtotal_minor: number
          per_subject_limit: number
          percentage_basis_points: number | null
          priority: number
          public_name_i18n: Json | null
          stacking_group: string | null
          starts_at: string
          updated_at: string
          usage_limit: number | null
          used_count: number
          version: number
        }
        Insert: {
          code: string
          combinability?: string
          configuration_status?: string
          created_at?: string
          currency?: string | null
          description_i18n?: Json | null
          enabled?: boolean
          ends_at?: string
          fixed_amount_minor?: number | null
          id?: string
          kind: Database["public"]["Enums"]["discount_kind"]
          maximum_discount_minor?: number | null
          minimum_subtotal_minor?: number
          per_subject_limit?: number
          percentage_basis_points?: number | null
          priority?: number
          public_name_i18n?: Json | null
          stacking_group?: string | null
          starts_at?: string
          updated_at?: string
          usage_limit?: number | null
          used_count?: number
          version?: number
        }
        Update: {
          code?: string
          combinability?: string
          configuration_status?: string
          created_at?: string
          currency?: string | null
          description_i18n?: Json | null
          enabled?: boolean
          ends_at?: string
          fixed_amount_minor?: number | null
          id?: string
          kind?: Database["public"]["Enums"]["discount_kind"]
          maximum_discount_minor?: number | null
          minimum_subtotal_minor?: number
          per_subject_limit?: number
          percentage_basis_points?: number | null
          priority?: number
          public_name_i18n?: Json | null
          stacking_group?: string | null
          starts_at?: string
          updated_at?: string
          usage_limit?: number | null
          used_count?: number
          version?: number
        }
        Relationships: []
      }
      export_jobs: {
        Row: {
          available_at: string
          completed_at: string | null
          correlation_id: string
          created_at: string
          download_name: string | null
          expires_at: string | null
          export_format: string
          export_type: string
          id: string
          lease_expires_at: string | null
          lease_owner: string | null
          object_path: string | null
          requested_by: string
          row_count: number | null
          safe_error_code: string | null
          scope: Json
          status: Database["public"]["Enums"]["work_status"]
        }
        Insert: {
          available_at?: string
          completed_at?: string | null
          correlation_id: string
          created_at?: string
          download_name?: string | null
          expires_at?: string | null
          export_format?: string
          export_type: string
          id?: string
          lease_expires_at?: string | null
          lease_owner?: string | null
          object_path?: string | null
          requested_by: string
          row_count?: number | null
          safe_error_code?: string | null
          scope?: Json
          status?: Database["public"]["Enums"]["work_status"]
        }
        Update: {
          available_at?: string
          completed_at?: string | null
          correlation_id?: string
          created_at?: string
          download_name?: string | null
          expires_at?: string | null
          export_format?: string
          export_type?: string
          id?: string
          lease_expires_at?: string | null
          lease_owner?: string | null
          object_path?: string | null
          requested_by?: string
          row_count?: number | null
          safe_error_code?: string | null
          scope?: Json
          status?: Database["public"]["Enums"]["work_status"]
        }
        Relationships: [
          {
            foreignKeyName: "export_jobs_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "export_jobs_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "staff_customer_directory"
            referencedColumns: ["id"]
          },
        ]
      }
      fulfillments: {
        Row: {
          carrier: string
          created_at: string
          created_by: string | null
          delivered_at: string | null
          dispatched_at: string | null
          id: string
          order_id: string
          service_level: string | null
          status: string
          tracking_reference: string
          tracking_url: string | null
          updated_at: string
          version: number
        }
        Insert: {
          carrier: string
          created_at?: string
          created_by?: string | null
          delivered_at?: string | null
          dispatched_at?: string | null
          id?: string
          order_id: string
          service_level?: string | null
          status?: string
          tracking_reference: string
          tracking_url?: string | null
          updated_at?: string
          version?: number
        }
        Update: {
          carrier?: string
          created_at?: string
          created_by?: string | null
          delivered_at?: string | null
          dispatched_at?: string | null
          id?: string
          order_id?: string
          service_level?: string | null
          status?: string
          tracking_reference?: string
          tracking_url?: string | null
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "fulfillments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fulfillments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "staff_customer_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fulfillments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fulfillments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "staff_order_operations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fulfillments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "staff_order_summaries"
            referencedColumns: ["id"]
          },
        ]
      }
      guest_sessions: {
        Row: {
          created_at: string
          currency: string
          customer_profile_id: string | null
          expires_at: string
          id: string
          last_seen_at: string
          locale: Database["public"]["Enums"]["app_locale"]
          previous_secret_hash: string | null
          revoked_at: string | null
          rotated_at: string | null
          secret_hash: string
          version: number
        }
        Insert: {
          created_at?: string
          currency: string
          customer_profile_id?: string | null
          expires_at?: string
          id?: string
          last_seen_at?: string
          locale: Database["public"]["Enums"]["app_locale"]
          previous_secret_hash?: string | null
          revoked_at?: string | null
          rotated_at?: string | null
          secret_hash: string
          version?: number
        }
        Update: {
          created_at?: string
          currency?: string
          customer_profile_id?: string | null
          expires_at?: string
          id?: string
          last_seen_at?: string
          locale?: Database["public"]["Enums"]["app_locale"]
          previous_secret_hash?: string | null
          revoked_at?: string | null
          rotated_at?: string | null
          secret_hash?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "guest_sessions_customer_profile_id_fkey"
            columns: ["customer_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guest_sessions_customer_profile_id_fkey"
            columns: ["customer_profile_id"]
            isOneToOne: false
            referencedRelation: "staff_customer_directory"
            referencedColumns: ["id"]
          },
        ]
      }
      health_snapshots: {
        Row: {
          checks: Json
          correlation_id: string
          environment: string
          id: number
          overall: string
          recorded_at: string
          release: string
        }
        Insert: {
          checks: Json
          correlation_id: string
          environment: string
          id?: never
          overall: string
          recorded_at?: string
          release: string
        }
        Update: {
          checks?: Json
          correlation_id?: string
          environment?: string
          id?: never
          overall?: string
          recorded_at?: string
          release?: string
        }
        Relationships: []
      }
      idempotency_keys: {
        Row: {
          actor_fingerprint: string
          completed_at: string | null
          created_at: string
          expires_at: string
          id: string
          key_hash: string
          locked_until: string | null
          request_hash: string
          response: Json | null
          scope: string
          status: string
        }
        Insert: {
          actor_fingerprint: string
          completed_at?: string | null
          created_at?: string
          expires_at: string
          id?: string
          key_hash: string
          locked_until?: string | null
          request_hash: string
          response?: Json | null
          scope: string
          status?: string
        }
        Update: {
          actor_fingerprint?: string
          completed_at?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          key_hash?: string
          locked_until?: string | null
          request_hash?: string
          response?: Json | null
          scope?: string
          status?: string
        }
        Relationships: []
      }
      ingestion_batches: {
        Row: {
          completed_at: string | null
          correlation_id: string
          created_at: string
          created_by: string | null
          duplicate_file_count: number
          expected_file_count: number | null
          failed_file_count: number
          id: string
          product_id: string | null
          ready_file_count: number
          registered_file_count: number
          status: Database["public"]["Enums"]["ingestion_batch_status"]
          title: string
          updated_at: string
          version: number
        }
        Insert: {
          completed_at?: string | null
          correlation_id?: string
          created_at?: string
          created_by?: string | null
          duplicate_file_count?: number
          expected_file_count?: number | null
          failed_file_count?: number
          id?: string
          product_id?: string | null
          ready_file_count?: number
          registered_file_count?: number
          status?: Database["public"]["Enums"]["ingestion_batch_status"]
          title: string
          updated_at?: string
          version?: number
        }
        Update: {
          completed_at?: string | null
          correlation_id?: string
          created_at?: string
          created_by?: string | null
          duplicate_file_count?: number
          expected_file_count?: number | null
          failed_file_count?: number
          id?: string
          product_id?: string | null
          ready_file_count?: number
          registered_file_count?: number
          status?: Database["public"]["Enums"]["ingestion_batch_status"]
          title?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "ingestion_batches_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "catalog_export_rows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ingestion_batches_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ingestion_batches_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "public_catalog_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ingestion_batches_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "staff_catalog_products"
            referencedColumns: ["id"]
          },
        ]
      }
      ingestion_files: {
        Row: {
          actual_byte_size: number | null
          actual_checksum_sha256: string | null
          actual_mime: string | null
          batch_id: string
          client_file_id: string
          created_at: string
          expected_byte_size: number
          expected_checksum_sha256: string | null
          expected_mime: string
          id: string
          media_asset_id: string | null
          orientation: number | null
          original_filename: string
          pixel_height: number | null
          pixel_width: number | null
          processing_completed_at: string | null
          recipe_version: number
          safe_error_code: string | null
          safe_error_summary: string | null
          status: Database["public"]["Enums"]["ingestion_file_status"]
          storage_bucket: string
          storage_path: string
          updated_at: string
          upload_completed_at: string | null
          uploaded_by: string | null
          version: number
        }
        Insert: {
          actual_byte_size?: number | null
          actual_checksum_sha256?: string | null
          actual_mime?: string | null
          batch_id: string
          client_file_id: string
          created_at?: string
          expected_byte_size: number
          expected_checksum_sha256?: string | null
          expected_mime: string
          id?: string
          media_asset_id?: string | null
          orientation?: number | null
          original_filename: string
          pixel_height?: number | null
          pixel_width?: number | null
          processing_completed_at?: string | null
          recipe_version?: number
          safe_error_code?: string | null
          safe_error_summary?: string | null
          status?: Database["public"]["Enums"]["ingestion_file_status"]
          storage_bucket?: string
          storage_path: string
          updated_at?: string
          upload_completed_at?: string | null
          uploaded_by?: string | null
          version?: number
        }
        Update: {
          actual_byte_size?: number | null
          actual_checksum_sha256?: string | null
          actual_mime?: string | null
          batch_id?: string
          client_file_id?: string
          created_at?: string
          expected_byte_size?: number
          expected_checksum_sha256?: string | null
          expected_mime?: string
          id?: string
          media_asset_id?: string | null
          orientation?: number | null
          original_filename?: string
          pixel_height?: number | null
          pixel_width?: number | null
          processing_completed_at?: string | null
          recipe_version?: number
          safe_error_code?: string | null
          safe_error_summary?: string | null
          status?: Database["public"]["Enums"]["ingestion_file_status"]
          storage_bucket?: string
          storage_path?: string
          updated_at?: string
          upload_completed_at?: string | null
          uploaded_by?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "ingestion_files_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "ingestion_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ingestion_files_media_asset_id_fkey"
            columns: ["media_asset_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_configs: {
        Row: {
          capabilities: string[]
          created_at: string
          key: string
          last_checked_at: string | null
          mode: Database["public"]["Enums"]["integration_mode"]
          safe_reason: string | null
          secret_configured: boolean
          updated_at: string
          updated_by: string | null
          version: number
        }
        Insert: {
          capabilities?: string[]
          created_at?: string
          key: string
          last_checked_at?: string | null
          mode?: Database["public"]["Enums"]["integration_mode"]
          safe_reason?: string | null
          secret_configured?: boolean
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Update: {
          capabilities?: string[]
          created_at?: string
          key?: string
          last_checked_at?: string | null
          mode?: Database["public"]["Enums"]["integration_mode"]
          safe_reason?: string | null
          secret_configured?: boolean
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "integration_configs_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integration_configs_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "staff_customer_directory"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_adjustments: {
        Row: {
          actor_profile_id: string | null
          correlation_id: string
          created_at: string
          id: string
          idempotency_key: string
          inventory_item_id: string
          previous_on_hand: number
          quantity_delta: number
          reason: string
          resulting_on_hand: number
        }
        Insert: {
          actor_profile_id?: string | null
          correlation_id: string
          created_at?: string
          id?: string
          idempotency_key: string
          inventory_item_id: string
          previous_on_hand: number
          quantity_delta: number
          reason: string
          resulting_on_hand: number
        }
        Update: {
          actor_profile_id?: string | null
          correlation_id?: string
          created_at?: string
          id?: string
          idempotency_key?: string
          inventory_item_id?: string
          previous_on_hand?: number
          quantity_delta?: number
          reason?: string
          resulting_on_hand?: number
        }
        Relationships: [
          {
            foreignKeyName: "inventory_adjustments_actor_profile_id_fkey"
            columns: ["actor_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_adjustments_actor_profile_id_fkey"
            columns: ["actor_profile_id"]
            isOneToOne: false
            referencedRelation: "staff_customer_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_adjustments_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_events: {
        Row: {
          actor_profile_id: string | null
          correlation_id: string
          event_type: string
          id: number
          inventory_item_id: string
          occurred_at: string
          quantity_delta: number
          reason: string
          reservation_id: string | null
        }
        Insert: {
          actor_profile_id?: string | null
          correlation_id: string
          event_type: string
          id?: never
          inventory_item_id: string
          occurred_at?: string
          quantity_delta: number
          reason: string
          reservation_id?: string | null
        }
        Update: {
          actor_profile_id?: string | null
          correlation_id?: string
          event_type?: string
          id?: never
          inventory_item_id?: string
          occurred_at?: string
          quantity_delta?: number
          reason?: string
          reservation_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_events_actor_profile_id_fkey"
            columns: ["actor_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_events_actor_profile_id_fkey"
            columns: ["actor_profile_id"]
            isOneToOne: false
            referencedRelation: "staff_customer_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_events_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_events_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "inventory_reservations"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_items: {
        Row: {
          available_quantity: number | null
          created_at: string
          id: string
          low_stock_threshold: number
          on_hand_quantity: number
          product_id: string
          reserved_quantity: number
          stock_model: Database["public"]["Enums"]["stock_model"]
          updated_at: string
          version: number
        }
        Insert: {
          available_quantity?: number | null
          created_at?: string
          id?: string
          low_stock_threshold?: number
          on_hand_quantity?: number
          product_id: string
          reserved_quantity?: number
          stock_model: Database["public"]["Enums"]["stock_model"]
          updated_at?: string
          version?: number
        }
        Update: {
          available_quantity?: number | null
          created_at?: string
          id?: string
          low_stock_threshold?: number
          on_hand_quantity?: number
          product_id?: string
          reserved_quantity?: number
          stock_model?: Database["public"]["Enums"]["stock_model"]
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "inventory_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: true
            referencedRelation: "catalog_export_rows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: true
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: true
            referencedRelation: "public_catalog_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: true
            referencedRelation: "staff_catalog_products"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_reservations: {
        Row: {
          cart_id: string
          checkout_session_id: string
          converted_at: string | null
          created_at: string
          expires_at: string
          id: string
          order_id: string | null
          product_id: string
          quantity: number
          release_reason: string | null
          released_at: string | null
          status: Database["public"]["Enums"]["inventory_reservation_status"]
        }
        Insert: {
          cart_id: string
          checkout_session_id: string
          converted_at?: string | null
          created_at?: string
          expires_at: string
          id?: string
          order_id?: string | null
          product_id: string
          quantity: number
          release_reason?: string | null
          released_at?: string | null
          status?: Database["public"]["Enums"]["inventory_reservation_status"]
        }
        Update: {
          cart_id?: string
          checkout_session_id?: string
          converted_at?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          order_id?: string | null
          product_id?: string
          quantity?: number
          release_reason?: string | null
          released_at?: string | null
          status?: Database["public"]["Enums"]["inventory_reservation_status"]
        }
        Relationships: [
          {
            foreignKeyName: "inventory_reservations_cart_id_fkey"
            columns: ["cart_id"]
            isOneToOne: false
            referencedRelation: "carts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_reservations_checkout_session_id_fkey"
            columns: ["checkout_session_id"]
            isOneToOne: false
            referencedRelation: "checkout_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_reservations_order_fk"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_reservations_order_fk"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "staff_order_operations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_reservations_order_fk"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "staff_order_summaries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_reservations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "catalog_export_rows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_reservations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_reservations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "public_catalog_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_reservations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "staff_catalog_products"
            referencedColumns: ["id"]
          },
        ]
      }
      manual_quote_events: {
        Row: {
          actor_class: string
          actor_profile_id: string | null
          buyer_message: string | null
          correlation_id: string
          event_type: string
          from_status: Database["public"]["Enums"]["manual_quote_status"] | null
          id: number
          idempotency_key_hash: string | null
          manual_quote_id: string
          occurred_at: string
          to_status: Database["public"]["Enums"]["manual_quote_status"]
        }
        Insert: {
          actor_class: string
          actor_profile_id?: string | null
          buyer_message?: string | null
          correlation_id: string
          event_type: string
          from_status?:
            | Database["public"]["Enums"]["manual_quote_status"]
            | null
          id?: never
          idempotency_key_hash?: string | null
          manual_quote_id: string
          occurred_at?: string
          to_status: Database["public"]["Enums"]["manual_quote_status"]
        }
        Update: {
          actor_class?: string
          actor_profile_id?: string | null
          buyer_message?: string | null
          correlation_id?: string
          event_type?: string
          from_status?:
            | Database["public"]["Enums"]["manual_quote_status"]
            | null
          id?: never
          idempotency_key_hash?: string | null
          manual_quote_id?: string
          occurred_at?: string
          to_status?: Database["public"]["Enums"]["manual_quote_status"]
        }
        Relationships: [
          {
            foreignKeyName: "manual_quote_events_actor_profile_id_fkey"
            columns: ["actor_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manual_quote_events_actor_profile_id_fkey"
            columns: ["actor_profile_id"]
            isOneToOne: false
            referencedRelation: "staff_customer_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manual_quote_events_manual_quote_id_fkey"
            columns: ["manual_quote_id"]
            isOneToOne: false
            referencedRelation: "manual_quote_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manual_quote_events_manual_quote_id_fkey"
            columns: ["manual_quote_id"]
            isOneToOne: false
            referencedRelation: "staff_manual_quote_queue"
            referencedColumns: ["id"]
          },
        ]
      }
      manual_quote_requests: {
        Row: {
          address: Json
          buyer_message: string | null
          buyer_note: string | null
          cart_id: string | null
          cart_snapshot: Json
          contact_email: string
          contact_phone: string | null
          correlation_id: string
          created_at: string
          currency: string
          customer_profile_id: string | null
          customs_snapshot: Json | null
          destination_country_code: string
          estimate_max_days: number | null
          estimate_min_days: number | null
          expires_at: string | null
          guest_proof_hash: string | null
          guest_session_id: string | null
          id: string
          idempotency_key_hash: string
          locale: Database["public"]["Enums"]["app_locale"]
          quoted_amount_minor: number | null
          quoted_at: string | null
          quoted_by: string | null
          quoted_currency: string | null
          quoted_method_i18n: Json | null
          reference: string
          staff_note: string | null
          status: Database["public"]["Enums"]["manual_quote_status"]
          updated_at: string
          version: number
        }
        Insert: {
          address: Json
          buyer_message?: string | null
          buyer_note?: string | null
          cart_id?: string | null
          cart_snapshot: Json
          contact_email: string
          contact_phone?: string | null
          correlation_id?: string
          created_at?: string
          currency: string
          customer_profile_id?: string | null
          customs_snapshot?: Json | null
          destination_country_code: string
          estimate_max_days?: number | null
          estimate_min_days?: number | null
          expires_at?: string | null
          guest_proof_hash?: string | null
          guest_session_id?: string | null
          id?: string
          idempotency_key_hash: string
          locale: Database["public"]["Enums"]["app_locale"]
          quoted_amount_minor?: number | null
          quoted_at?: string | null
          quoted_by?: string | null
          quoted_currency?: string | null
          quoted_method_i18n?: Json | null
          reference?: string
          staff_note?: string | null
          status?: Database["public"]["Enums"]["manual_quote_status"]
          updated_at?: string
          version?: number
        }
        Update: {
          address?: Json
          buyer_message?: string | null
          buyer_note?: string | null
          cart_id?: string | null
          cart_snapshot?: Json
          contact_email?: string
          contact_phone?: string | null
          correlation_id?: string
          created_at?: string
          currency?: string
          customer_profile_id?: string | null
          customs_snapshot?: Json | null
          destination_country_code?: string
          estimate_max_days?: number | null
          estimate_min_days?: number | null
          expires_at?: string | null
          guest_proof_hash?: string | null
          guest_session_id?: string | null
          id?: string
          idempotency_key_hash?: string
          locale?: Database["public"]["Enums"]["app_locale"]
          quoted_amount_minor?: number | null
          quoted_at?: string | null
          quoted_by?: string | null
          quoted_currency?: string | null
          quoted_method_i18n?: Json | null
          reference?: string
          staff_note?: string | null
          status?: Database["public"]["Enums"]["manual_quote_status"]
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "manual_quote_requests_cart_id_fkey"
            columns: ["cart_id"]
            isOneToOne: false
            referencedRelation: "carts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manual_quote_requests_customer_profile_id_fkey"
            columns: ["customer_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manual_quote_requests_customer_profile_id_fkey"
            columns: ["customer_profile_id"]
            isOneToOne: false
            referencedRelation: "staff_customer_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manual_quote_requests_guest_session_id_fkey"
            columns: ["guest_session_id"]
            isOneToOne: false
            referencedRelation: "guest_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manual_quote_requests_quoted_by_fkey"
            columns: ["quoted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manual_quote_requests_quoted_by_fkey"
            columns: ["quoted_by"]
            isOneToOne: false
            referencedRelation: "staff_customer_directory"
            referencedColumns: ["id"]
          },
        ]
      }
      market_settings: {
        Row: {
          country_code: string
          created_at: string
          customs_copy_i18n: Json
          customs_responsibility: string
          default_currency: string
          enabled: boolean
          id: string
          legal_status: string
          market_code: string
          tax_display_mode: Database["public"]["Enums"]["tax_display_mode"]
          tax_registration_reference: string | null
          updated_at: string
          version: number
        }
        Insert: {
          country_code: string
          created_at?: string
          customs_copy_i18n: Json
          customs_responsibility?: string
          default_currency: string
          enabled?: boolean
          id?: string
          legal_status?: string
          market_code: string
          tax_display_mode?: Database["public"]["Enums"]["tax_display_mode"]
          tax_registration_reference?: string | null
          updated_at?: string
          version?: number
        }
        Update: {
          country_code?: string
          created_at?: string
          customs_copy_i18n?: Json
          customs_responsibility?: string
          default_currency?: string
          enabled?: boolean
          id?: string
          legal_status?: string
          market_code?: string
          tax_display_mode?: Database["public"]["Enums"]["tax_display_mode"]
          tax_registration_reference?: string | null
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "market_settings_default_currency_fkey"
            columns: ["default_currency"]
            isOneToOne: false
            referencedRelation: "currency_settings"
            referencedColumns: ["currency"]
          },
          {
            foreignKeyName: "market_settings_default_currency_fkey"
            columns: ["default_currency"]
            isOneToOne: false
            referencedRelation: "published_currency_settings"
            referencedColumns: ["currency"]
          },
        ]
      }
      media_assets: {
        Row: {
          actual_mime: string
          approval_status: Database["public"]["Enums"]["media_approval_status"]
          byte_size: number
          checksum_sha256: string
          created_at: string
          id: string
          orientation: number
          original_bucket: string
          original_path: string
          pixel_height: number
          pixel_width: number
          protected: boolean
          purpose: string
          recipe_version: number
          updated_at: string
          uploaded_by: string | null
          version: number
        }
        Insert: {
          actual_mime: string
          approval_status?: Database["public"]["Enums"]["media_approval_status"]
          byte_size: number
          checksum_sha256: string
          created_at?: string
          id?: string
          orientation?: number
          original_bucket?: string
          original_path: string
          pixel_height: number
          pixel_width: number
          protected?: boolean
          purpose: string
          recipe_version?: number
          updated_at?: string
          uploaded_by?: string | null
          version?: number
        }
        Update: {
          actual_mime?: string
          approval_status?: Database["public"]["Enums"]["media_approval_status"]
          byte_size?: number
          checksum_sha256?: string
          created_at?: string
          id?: string
          orientation?: number
          original_bucket?: string
          original_path?: string
          pixel_height?: number
          pixel_width?: number
          protected?: boolean
          purpose?: string
          recipe_version?: number
          updated_at?: string
          uploaded_by?: string | null
          version?: number
        }
        Relationships: []
      }
      media_jobs: {
        Row: {
          attempt: number
          completed_at: string | null
          correlation_id: string
          id: string
          job_type: string
          lease_expires_at: string | null
          lease_owner: string | null
          max_attempts: number
          next_attempt_at: string
          progress_stage: string | null
          queued_at: string
          recipe_version: string | null
          safe_error_code: string | null
          safe_error_summary: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["job_status"]
          subject_id: string | null
        }
        Insert: {
          attempt?: number
          completed_at?: string | null
          correlation_id: string
          id?: string
          job_type: string
          lease_expires_at?: string | null
          lease_owner?: string | null
          max_attempts?: number
          next_attempt_at?: string
          progress_stage?: string | null
          queued_at?: string
          recipe_version?: string | null
          safe_error_code?: string | null
          safe_error_summary?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["job_status"]
          subject_id?: string | null
        }
        Update: {
          attempt?: number
          completed_at?: string | null
          correlation_id?: string
          id?: string
          job_type?: string
          lease_expires_at?: string | null
          lease_owner?: string | null
          max_attempts?: number
          next_attempt_at?: string
          progress_stage?: string | null
          queued_at?: string
          recipe_version?: string | null
          safe_error_code?: string | null
          safe_error_summary?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["job_status"]
          subject_id?: string | null
        }
        Relationships: []
      }
      media_licenses: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          asset_id: string
          created_at: string
          creator_source: string | null
          evidence_private_reference: string | null
          expires_at: string | null
          id: string
          ownership_basis: string
          status: Database["public"]["Enums"]["media_license_status"]
          territory: string | null
          updated_at: string
          usage_url: string | null
          version: number
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          asset_id: string
          created_at?: string
          creator_source?: string | null
          evidence_private_reference?: string | null
          expires_at?: string | null
          id?: string
          ownership_basis: string
          status?: Database["public"]["Enums"]["media_license_status"]
          territory?: string | null
          updated_at?: string
          usage_url?: string | null
          version?: number
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          asset_id?: string
          created_at?: string
          creator_source?: string | null
          evidence_private_reference?: string | null
          expires_at?: string | null
          id?: string
          ownership_basis?: string
          status?: Database["public"]["Enums"]["media_license_status"]
          territory?: string | null
          updated_at?: string
          usage_url?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "media_licenses_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: true
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      media_links: {
        Row: {
          alt_text: string | null
          approved_crop_version: number | null
          asset_id: string
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          locale: Database["public"]["Enums"]["app_locale"] | null
          position: number
          primary_link: boolean
          purpose: string
        }
        Insert: {
          alt_text?: string | null
          approved_crop_version?: number | null
          asset_id: string
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          locale?: Database["public"]["Enums"]["app_locale"] | null
          position?: number
          primary_link?: boolean
          purpose: string
        }
        Update: {
          alt_text?: string | null
          approved_crop_version?: number | null
          asset_id?: string
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          locale?: Database["public"]["Enums"]["app_locale"] | null
          position?: number
          primary_link?: boolean
          purpose?: string
        }
        Relationships: [
          {
            foreignKeyName: "media_links_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      media_variants: {
        Row: {
          asset_id: string
          bucket: string
          byte_size: number
          checksum_sha256: string
          created_at: string
          crop_x: number | null
          crop_y: number | null
          focal_x: number | null
          focal_y: number | null
          format: string
          height: number
          id: string
          path: string
          recipe_version: number
          role: string
          status: Database["public"]["Enums"]["media_variant_status"]
          updated_at: string
          version: number
          width: number
        }
        Insert: {
          asset_id: string
          bucket?: string
          byte_size: number
          checksum_sha256: string
          created_at?: string
          crop_x?: number | null
          crop_y?: number | null
          focal_x?: number | null
          focal_y?: number | null
          format: string
          height: number
          id?: string
          path: string
          recipe_version: number
          role: string
          status?: Database["public"]["Enums"]["media_variant_status"]
          updated_at?: string
          version?: number
          width: number
        }
        Update: {
          asset_id?: string
          bucket?: string
          byte_size?: number
          checksum_sha256?: string
          created_at?: string
          crop_x?: number | null
          crop_y?: number | null
          focal_x?: number | null
          focal_y?: number | null
          format?: string
          height?: number
          id?: string
          path?: string
          recipe_version?: number
          role?: string
          status?: Database["public"]["Enums"]["media_variant_status"]
          updated_at?: string
          version?: number
          width?: number
        }
        Relationships: [
          {
            foreignKeyName: "media_variants_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      merchandising_slots: {
        Row: {
          active_from: string
          active_until: string
          collection_id: string | null
          created_at: string
          id: string
          locale: Database["public"]["Enums"]["app_locale"] | null
          market_code: string | null
          placement: string
          position: number
          product_id: string | null
          status: Database["public"]["Enums"]["collection_status"]
          updated_at: string
          version: number
        }
        Insert: {
          active_from?: string
          active_until?: string
          collection_id?: string | null
          created_at?: string
          id?: string
          locale?: Database["public"]["Enums"]["app_locale"] | null
          market_code?: string | null
          placement: string
          position?: number
          product_id?: string | null
          status?: Database["public"]["Enums"]["collection_status"]
          updated_at?: string
          version?: number
        }
        Update: {
          active_from?: string
          active_until?: string
          collection_id?: string | null
          created_at?: string
          id?: string
          locale?: Database["public"]["Enums"]["app_locale"] | null
          market_code?: string | null
          placement?: string
          position?: number
          product_id?: string | null
          status?: Database["public"]["Enums"]["collection_status"]
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "merchandising_slots_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "merchandising_slots_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "catalog_export_rows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "merchandising_slots_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "merchandising_slots_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "public_catalog_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "merchandising_slots_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "staff_catalog_products"
            referencedColumns: ["id"]
          },
        ]
      }
      newsletter_subscriptions: {
        Row: {
          consent_record_id: string
          disclosure_version: string
          email: string
          guest_subject_hash: string
          id: string
          locale: Database["public"]["Enums"]["app_locale"]
          manage_proof_hash: string
          profile_id: string | null
          reference: string
          status: string
          subscribed_at: string
          updated_at: string
          version: number
          withdrawn_at: string | null
        }
        Insert: {
          consent_record_id: string
          disclosure_version: string
          email: string
          guest_subject_hash: string
          id?: string
          locale: Database["public"]["Enums"]["app_locale"]
          manage_proof_hash: string
          profile_id?: string | null
          reference?: string
          status?: string
          subscribed_at?: string
          updated_at?: string
          version?: number
          withdrawn_at?: string | null
        }
        Update: {
          consent_record_id?: string
          disclosure_version?: string
          email?: string
          guest_subject_hash?: string
          id?: string
          locale?: Database["public"]["Enums"]["app_locale"]
          manage_proof_hash?: string
          profile_id?: string | null
          reference?: string
          status?: string
          subscribed_at?: string
          updated_at?: string
          version?: number
          withdrawn_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "newsletter_subscriptions_consent_record_id_fkey"
            columns: ["consent_record_id"]
            isOneToOne: false
            referencedRelation: "consent_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "newsletter_subscriptions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "newsletter_subscriptions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "staff_customer_directory"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_attempts: {
        Row: {
          attempt_number: number
          completed_at: string | null
          id: number
          notification_id: string
          order_id: string | null
          outcome: string
          provider: string
          provider_event_inbox_id: string | null
          provider_reference: string | null
          safe_error_code: string | null
          started_at: string
        }
        Insert: {
          attempt_number: number
          completed_at?: string | null
          id?: never
          notification_id: string
          order_id?: string | null
          outcome: string
          provider: string
          provider_event_inbox_id?: string | null
          provider_reference?: string | null
          safe_error_code?: string | null
          started_at: string
        }
        Update: {
          attempt_number?: number
          completed_at?: string | null
          id?: never
          notification_id?: string
          order_id?: string | null
          outcome?: string
          provider?: string
          provider_event_inbox_id?: string | null
          provider_reference?: string | null
          safe_error_code?: string | null
          started_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_attempts_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_attempts_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_attempts_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "staff_order_operations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_attempts_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "staff_order_summaries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_attempts_provider_event_inbox_id_fkey"
            columns: ["provider_event_inbox_id"]
            isOneToOne: false
            referencedRelation: "provider_event_inbox"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          attempt_count: number
          available_at: string
          correlation_id: string
          created_at: string
          id: string
          idempotency_key: string
          last_error_code: string | null
          lease_expires_at: string | null
          lease_owner: string | null
          locale: Database["public"]["Enums"]["app_locale"]
          max_attempts: number
          payload: Json
          purpose: string
          recipient_hash: string
          status: Database["public"]["Enums"]["notification_status"]
          template_key: string
          updated_at: string
          version: number
        }
        Insert: {
          attempt_count?: number
          available_at?: string
          correlation_id: string
          created_at?: string
          id?: string
          idempotency_key: string
          last_error_code?: string | null
          lease_expires_at?: string | null
          lease_owner?: string | null
          locale: Database["public"]["Enums"]["app_locale"]
          max_attempts?: number
          payload?: Json
          purpose: string
          recipient_hash: string
          status?: Database["public"]["Enums"]["notification_status"]
          template_key: string
          updated_at?: string
          version?: number
        }
        Update: {
          attempt_count?: number
          available_at?: string
          correlation_id?: string
          created_at?: string
          id?: string
          idempotency_key?: string
          last_error_code?: string | null
          lease_expires_at?: string | null
          lease_owner?: string | null
          locale?: Database["public"]["Enums"]["app_locale"]
          max_attempts?: number
          payload?: Json
          purpose?: string
          recipient_hash?: string
          status?: Database["public"]["Enums"]["notification_status"]
          template_key?: string
          updated_at?: string
          version?: number
        }
        Relationships: []
      }
      operational_alert_occurrences: {
        Row: {
          alert_id: string
          correlation_id: string | null
          id: number
          observed_at: string
          safe_context: Json
        }
        Insert: {
          alert_id: string
          correlation_id?: string | null
          id?: never
          observed_at?: string
          safe_context?: Json
        }
        Update: {
          alert_id?: string
          correlation_id?: string | null
          id?: never
          observed_at?: string
          safe_context?: Json
        }
        Relationships: [
          {
            foreignKeyName: "operational_alert_occurrences_alert_id_fkey"
            columns: ["alert_id"]
            isOneToOne: false
            referencedRelation: "operational_alerts"
            referencedColumns: ["id"]
          },
        ]
      }
      operational_alerts: {
        Row: {
          acknowledged_by: string | null
          category: string
          correlation_id: string | null
          fingerprint: string
          first_seen_at: string
          id: string
          last_seen_at: string
          occurrence_count: number
          order_id: string | null
          payment_attempt_id: string | null
          refund_record_id: string | null
          resolved_at: string | null
          return_request_id: string | null
          safe_summary: string
          severity: string
          status: string
        }
        Insert: {
          acknowledged_by?: string | null
          category: string
          correlation_id?: string | null
          fingerprint: string
          first_seen_at?: string
          id?: string
          last_seen_at?: string
          occurrence_count?: number
          order_id?: string | null
          payment_attempt_id?: string | null
          refund_record_id?: string | null
          resolved_at?: string | null
          return_request_id?: string | null
          safe_summary: string
          severity: string
          status?: string
        }
        Update: {
          acknowledged_by?: string | null
          category?: string
          correlation_id?: string | null
          fingerprint?: string
          first_seen_at?: string
          id?: string
          last_seen_at?: string
          occurrence_count?: number
          order_id?: string | null
          payment_attempt_id?: string | null
          refund_record_id?: string | null
          resolved_at?: string | null
          return_request_id?: string | null
          safe_summary?: string
          severity?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "operational_alerts_acknowledged_by_fkey"
            columns: ["acknowledged_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operational_alerts_acknowledged_by_fkey"
            columns: ["acknowledged_by"]
            isOneToOne: false
            referencedRelation: "staff_customer_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operational_alerts_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operational_alerts_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "staff_order_operations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operational_alerts_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "staff_order_summaries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operational_alerts_payment_attempt_id_fkey"
            columns: ["payment_attempt_id"]
            isOneToOne: false
            referencedRelation: "payment_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operational_alerts_refund_record_id_fkey"
            columns: ["refund_record_id"]
            isOneToOne: false
            referencedRelation: "refund_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operational_alerts_return_request_id_fkey"
            columns: ["return_request_id"]
            isOneToOne: false
            referencedRelation: "return_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operational_alerts_return_request_id_fkey"
            columns: ["return_request_id"]
            isOneToOne: false
            referencedRelation: "staff_return_queue"
            referencedColumns: ["id"]
          },
        ]
      }
      order_addresses: {
        Row: {
          address_type: string
          city: string
          country_code: string
          full_name: string
          id: string
          instructions: string | null
          line1: string
          line2: string | null
          order_id: string
          organization: string | null
          postal_code: string | null
          region: string | null
        }
        Insert: {
          address_type: string
          city: string
          country_code: string
          full_name: string
          id?: string
          instructions?: string | null
          line1: string
          line2?: string | null
          order_id: string
          organization?: string | null
          postal_code?: string | null
          region?: string | null
        }
        Update: {
          address_type?: string
          city?: string
          country_code?: string
          full_name?: string
          id?: string
          instructions?: string | null
          line1?: string
          line2?: string | null
          order_id?: string
          organization?: string | null
          postal_code?: string | null
          region?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_addresses_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_addresses_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "staff_order_operations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_addresses_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "staff_order_summaries"
            referencedColumns: ["id"]
          },
        ]
      }
      order_adjustments: {
        Row: {
          adjustment_type: string
          amount_minor: number
          code: string | null
          currency: string
          id: string
          label: string
          metadata: Json
          order_id: string
        }
        Insert: {
          adjustment_type: string
          amount_minor: number
          code?: string | null
          currency: string
          id?: string
          label: string
          metadata?: Json
          order_id: string
        }
        Update: {
          adjustment_type?: string
          amount_minor?: number
          code?: string | null
          currency?: string
          id?: string
          label?: string
          metadata?: Json
          order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_adjustments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_adjustments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "staff_order_operations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_adjustments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "staff_order_summaries"
            referencedColumns: ["id"]
          },
        ]
      }
      order_events: {
        Row: {
          actor_class: string
          actor_profile_id: string | null
          correlation_id: string
          event_type: string
          from_status: Database["public"]["Enums"]["order_status"] | null
          id: number
          occurred_at: string
          order_id: string
          safe_metadata: Json
          to_status: Database["public"]["Enums"]["order_status"] | null
        }
        Insert: {
          actor_class: string
          actor_profile_id?: string | null
          correlation_id: string
          event_type: string
          from_status?: Database["public"]["Enums"]["order_status"] | null
          id?: never
          occurred_at?: string
          order_id: string
          safe_metadata?: Json
          to_status?: Database["public"]["Enums"]["order_status"] | null
        }
        Update: {
          actor_class?: string
          actor_profile_id?: string | null
          correlation_id?: string
          event_type?: string
          from_status?: Database["public"]["Enums"]["order_status"] | null
          id?: never
          occurred_at?: string
          order_id?: string
          safe_metadata?: Json
          to_status?: Database["public"]["Enums"]["order_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "order_events_actor_profile_id_fkey"
            columns: ["actor_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_events_actor_profile_id_fkey"
            columns: ["actor_profile_id"]
            isOneToOne: false
            referencedRelation: "staff_customer_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "staff_order_operations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "staff_order_summaries"
            referencedColumns: ["id"]
          },
        ]
      }
      order_internal_notes: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          note: string
          order_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          note: string
          order_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string
          order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_internal_notes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_internal_notes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "staff_customer_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_internal_notes_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_internal_notes_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "staff_order_operations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_internal_notes_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "staff_order_summaries"
            referencedColumns: ["id"]
          },
        ]
      }
      order_lines: {
        Row: {
          discount_minor: number
          fulfillment_snapshot: Json
          id: string
          localized_name: string
          order_id: string
          product_id: string
          product_snapshot: Json
          quantity: number
          sku: string
          subtotal_minor: number
          tax_minor: number
          total_minor: number
          unit_amount_minor: number
        }
        Insert: {
          discount_minor?: number
          fulfillment_snapshot: Json
          id?: string
          localized_name: string
          order_id: string
          product_id: string
          product_snapshot: Json
          quantity: number
          sku: string
          subtotal_minor: number
          tax_minor?: number
          total_minor: number
          unit_amount_minor: number
        }
        Update: {
          discount_minor?: number
          fulfillment_snapshot?: Json
          id?: string
          localized_name?: string
          order_id?: string
          product_id?: string
          product_snapshot?: Json
          quantity?: number
          sku?: string
          subtotal_minor?: number
          tax_minor?: number
          total_minor?: number
          unit_amount_minor?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_lines_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_lines_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "staff_order_operations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_lines_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "staff_order_summaries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_lines_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "catalog_export_rows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_lines_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_lines_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "public_catalog_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_lines_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "staff_catalog_products"
            referencedColumns: ["id"]
          },
        ]
      }
      order_notification_links: {
        Row: {
          notification_id: string
          order_id: string
          purpose: string
        }
        Insert: {
          notification_id: string
          order_id: string
          purpose: string
        }
        Update: {
          notification_id?: string
          order_id?: string
          purpose?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_notification_links_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_notification_links_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_notification_links_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "staff_order_operations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_notification_links_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "staff_order_summaries"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          accepted_at: string
          bank_transfer_due_at: string | null
          checkout_session_id: string
          contact_email: string
          contact_phone: string | null
          currency: string
          customer_profile_id: string | null
          delivery_minor: number
          discount_minor: number
          guest_proof_expires_at: string | null
          guest_proof_hash: string | null
          guest_session_id: string | null
          id: string
          idempotency_key_hash: string
          locale: Database["public"]["Enums"]["app_locale"]
          payment_method: Database["public"]["Enums"]["payment_method_kind"]
          payment_status: Database["public"]["Enums"]["payment_status"]
          pricing_version: string
          reference: string
          request_hash: string
          status: Database["public"]["Enums"]["order_status"]
          subtotal_minor: number
          tax_minor: number
          terms_version: string
          total_minor: number
          updated_at: string
          version: number
        }
        Insert: {
          accepted_at?: string
          bank_transfer_due_at?: string | null
          checkout_session_id: string
          contact_email: string
          contact_phone?: string | null
          currency: string
          customer_profile_id?: string | null
          delivery_minor: number
          discount_minor: number
          guest_proof_expires_at?: string | null
          guest_proof_hash?: string | null
          guest_session_id?: string | null
          id?: string
          idempotency_key_hash: string
          locale: Database["public"]["Enums"]["app_locale"]
          payment_method: Database["public"]["Enums"]["payment_method_kind"]
          payment_status: Database["public"]["Enums"]["payment_status"]
          pricing_version: string
          reference: string
          request_hash: string
          status: Database["public"]["Enums"]["order_status"]
          subtotal_minor: number
          tax_minor: number
          terms_version: string
          total_minor: number
          updated_at?: string
          version?: number
        }
        Update: {
          accepted_at?: string
          bank_transfer_due_at?: string | null
          checkout_session_id?: string
          contact_email?: string
          contact_phone?: string | null
          currency?: string
          customer_profile_id?: string | null
          delivery_minor?: number
          discount_minor?: number
          guest_proof_expires_at?: string | null
          guest_proof_hash?: string | null
          guest_session_id?: string | null
          id?: string
          idempotency_key_hash?: string
          locale?: Database["public"]["Enums"]["app_locale"]
          payment_method?: Database["public"]["Enums"]["payment_method_kind"]
          payment_status?: Database["public"]["Enums"]["payment_status"]
          pricing_version?: string
          reference?: string
          request_hash?: string
          status?: Database["public"]["Enums"]["order_status"]
          subtotal_minor?: number
          tax_minor?: number
          terms_version?: string
          total_minor?: number
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "orders_checkout_session_id_fkey"
            columns: ["checkout_session_id"]
            isOneToOne: true
            referencedRelation: "checkout_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_customer_profile_id_fkey"
            columns: ["customer_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_customer_profile_id_fkey"
            columns: ["customer_profile_id"]
            isOneToOne: false
            referencedRelation: "staff_customer_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_guest_session_id_fkey"
            columns: ["guest_session_id"]
            isOneToOne: false
            referencedRelation: "guest_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_attempts: {
        Row: {
          amount_minor: number
          created_at: string
          currency: string
          due_at: string | null
          id: string
          idempotency_key: string
          method: Database["public"]["Enums"]["payment_method_kind"]
          order_id: string
          provider: string
          provider_reference: string | null
          status: Database["public"]["Enums"]["payment_status"]
          updated_at: string
          version: number
        }
        Insert: {
          amount_minor: number
          created_at?: string
          currency: string
          due_at?: string | null
          id?: string
          idempotency_key: string
          method: Database["public"]["Enums"]["payment_method_kind"]
          order_id: string
          provider: string
          provider_reference?: string | null
          status: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
          version?: number
        }
        Update: {
          amount_minor?: number
          created_at?: string
          currency?: string
          due_at?: string | null
          id?: string
          idempotency_key?: string
          method?: Database["public"]["Enums"]["payment_method_kind"]
          order_id?: string
          provider?: string
          provider_reference?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "payment_attempts_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_attempts_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "staff_order_operations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_attempts_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "staff_order_summaries"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_events: {
        Row: {
          correlation_id: string
          event_type: string
          from_status: Database["public"]["Enums"]["payment_status"] | null
          id: number
          occurred_at: string
          payment_attempt_id: string
          provider_event_key: string | null
          safe_metadata: Json
          to_status: Database["public"]["Enums"]["payment_status"]
        }
        Insert: {
          correlation_id: string
          event_type: string
          from_status?: Database["public"]["Enums"]["payment_status"] | null
          id?: never
          occurred_at?: string
          payment_attempt_id: string
          provider_event_key?: string | null
          safe_metadata?: Json
          to_status: Database["public"]["Enums"]["payment_status"]
        }
        Update: {
          correlation_id?: string
          event_type?: string
          from_status?: Database["public"]["Enums"]["payment_status"] | null
          id?: never
          occurred_at?: string
          payment_attempt_id?: string
          provider_event_key?: string | null
          safe_metadata?: Json
          to_status?: Database["public"]["Enums"]["payment_status"]
        }
        Relationships: [
          {
            foreignKeyName: "payment_events_payment_attempt_id_fkey"
            columns: ["payment_attempt_id"]
            isOneToOne: false
            referencedRelation: "payment_attempts"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_reconciliations: {
        Row: {
          amount_minor: number | null
          confirmed_at: string | null
          confirmed_by: string | null
          created_at: string
          currency: string | null
          evidence_path: string | null
          external_reference: string | null
          first_reviewed_at: string | null
          first_reviewed_by: string | null
          id: string
          order_id: string
          payment_attempt_id: string
          provider_event_inbox_id: string | null
          reconciliation_kind: string
          safe_reason: string | null
          status: string
          updated_at: string
          version: number
        }
        Insert: {
          amount_minor?: number | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          currency?: string | null
          evidence_path?: string | null
          external_reference?: string | null
          first_reviewed_at?: string | null
          first_reviewed_by?: string | null
          id?: string
          order_id: string
          payment_attempt_id: string
          provider_event_inbox_id?: string | null
          reconciliation_kind: string
          safe_reason?: string | null
          status?: string
          updated_at?: string
          version?: number
        }
        Update: {
          amount_minor?: number | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          currency?: string | null
          evidence_path?: string | null
          external_reference?: string | null
          first_reviewed_at?: string | null
          first_reviewed_by?: string | null
          id?: string
          order_id?: string
          payment_attempt_id?: string
          provider_event_inbox_id?: string | null
          reconciliation_kind?: string
          safe_reason?: string | null
          status?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "payment_reconciliations_confirmed_by_fkey"
            columns: ["confirmed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_reconciliations_confirmed_by_fkey"
            columns: ["confirmed_by"]
            isOneToOne: false
            referencedRelation: "staff_customer_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_reconciliations_first_reviewed_by_fkey"
            columns: ["first_reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_reconciliations_first_reviewed_by_fkey"
            columns: ["first_reviewed_by"]
            isOneToOne: false
            referencedRelation: "staff_customer_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_reconciliations_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_reconciliations_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "staff_order_operations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_reconciliations_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "staff_order_summaries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_reconciliations_payment_attempt_id_fkey"
            columns: ["payment_attempt_id"]
            isOneToOne: false
            referencedRelation: "payment_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_reconciliations_provider_event_inbox_id_fkey"
            columns: ["provider_event_inbox_id"]
            isOneToOne: false
            referencedRelation: "provider_event_inbox"
            referencedColumns: ["id"]
          },
        ]
      }
      privacy_requests: {
        Row: {
          completed_at: string | null
          correlation_id: string
          created_at: string
          id: string
          reason: string
          request_type: Database["public"]["Enums"]["privacy_request_type"]
          requested_by: string
          safe_result_code: string | null
          status: Database["public"]["Enums"]["privacy_request_status"]
          subject_profile_id: string
          updated_at: string
          verified_at: string | null
          version: number
        }
        Insert: {
          completed_at?: string | null
          correlation_id: string
          created_at?: string
          id?: string
          reason: string
          request_type: Database["public"]["Enums"]["privacy_request_type"]
          requested_by: string
          safe_result_code?: string | null
          status?: Database["public"]["Enums"]["privacy_request_status"]
          subject_profile_id: string
          updated_at?: string
          verified_at?: string | null
          version?: number
        }
        Update: {
          completed_at?: string | null
          correlation_id?: string
          created_at?: string
          id?: string
          reason?: string
          request_type?: Database["public"]["Enums"]["privacy_request_type"]
          requested_by?: string
          safe_result_code?: string | null
          status?: Database["public"]["Enums"]["privacy_request_status"]
          subject_profile_id?: string
          updated_at?: string
          verified_at?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "privacy_requests_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "privacy_requests_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "staff_customer_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "privacy_requests_subject_profile_id_fkey"
            columns: ["subject_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "privacy_requests_subject_profile_id_fkey"
            columns: ["subject_profile_id"]
            isOneToOne: false
            referencedRelation: "staff_customer_directory"
            referencedColumns: ["id"]
          },
        ]
      }
      product_prices: {
        Row: {
          active_from: string
          active_until: string
          amount_minor: number
          created_at: string
          currency: string
          enabled: boolean
          id: string
          market_code: string | null
          product_id: string
          source: string
          source_reference: string | null
          updated_at: string
          version: number
        }
        Insert: {
          active_from?: string
          active_until?: string
          amount_minor: number
          created_at?: string
          currency: string
          enabled?: boolean
          id?: string
          market_code?: string | null
          product_id: string
          source?: string
          source_reference?: string | null
          updated_at?: string
          version?: number
        }
        Update: {
          active_from?: string
          active_until?: string
          amount_minor?: number
          created_at?: string
          currency?: string
          enabled?: boolean
          id?: string
          market_code?: string | null
          product_id?: string
          source?: string
          source_reference?: string | null
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_prices_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "catalog_export_rows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_prices_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_prices_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "public_catalog_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_prices_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "staff_catalog_products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_relations: {
        Row: {
          position: number
          relation_type: Database["public"]["Enums"]["catalog_relation_type"]
          source_product_id: string
          target_product_id: string
        }
        Insert: {
          position?: number
          relation_type: Database["public"]["Enums"]["catalog_relation_type"]
          source_product_id: string
          target_product_id: string
        }
        Update: {
          position?: number
          relation_type?: Database["public"]["Enums"]["catalog_relation_type"]
          source_product_id?: string
          target_product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_relations_source_product_id_fkey"
            columns: ["source_product_id"]
            isOneToOne: false
            referencedRelation: "catalog_export_rows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_relations_source_product_id_fkey"
            columns: ["source_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_relations_source_product_id_fkey"
            columns: ["source_product_id"]
            isOneToOne: false
            referencedRelation: "public_catalog_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_relations_source_product_id_fkey"
            columns: ["source_product_id"]
            isOneToOne: false
            referencedRelation: "staff_catalog_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_relations_target_product_id_fkey"
            columns: ["target_product_id"]
            isOneToOne: false
            referencedRelation: "catalog_export_rows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_relations_target_product_id_fkey"
            columns: ["target_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_relations_target_product_id_fkey"
            columns: ["target_product_id"]
            isOneToOne: false
            referencedRelation: "public_catalog_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_relations_target_product_id_fkey"
            columns: ["target_product_id"]
            isOneToOne: false
            referencedRelation: "staff_catalog_products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_tags: {
        Row: {
          product_id: string
          tag_id: string
        }
        Insert: {
          product_id: string
          tag_id: string
        }
        Update: {
          product_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_tags_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "catalog_export_rows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_tags_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_tags_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "public_catalog_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_tags_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "staff_catalog_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      product_translations: {
        Row: {
          alt_text_ready: boolean
          assisted_source: boolean
          care_text: string | null
          created_at: string
          id: string
          locale: Database["public"]["Enums"]["app_locale"]
          long_description: string | null
          name: string
          product_id: string
          published_by: string | null
          reviewed_by: string | null
          search_text: string
          seo_description: string | null
          seo_title: string | null
          short_description: string | null
          slug: string
          status: Database["public"]["Enums"]["translation_status"]
          updated_at: string
          version: number
        }
        Insert: {
          alt_text_ready?: boolean
          assisted_source?: boolean
          care_text?: string | null
          created_at?: string
          id?: string
          locale: Database["public"]["Enums"]["app_locale"]
          long_description?: string | null
          name: string
          product_id: string
          published_by?: string | null
          reviewed_by?: string | null
          search_text?: string
          seo_description?: string | null
          seo_title?: string | null
          short_description?: string | null
          slug: string
          status?: Database["public"]["Enums"]["translation_status"]
          updated_at?: string
          version?: number
        }
        Update: {
          alt_text_ready?: boolean
          assisted_source?: boolean
          care_text?: string | null
          created_at?: string
          id?: string
          locale?: Database["public"]["Enums"]["app_locale"]
          long_description?: string | null
          name?: string
          product_id?: string
          published_by?: string | null
          reviewed_by?: string | null
          search_text?: string
          seo_description?: string | null
          seo_title?: string | null
          short_description?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["translation_status"]
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_translations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "catalog_export_rows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_translations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_translations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "public_catalog_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_translations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "staff_catalog_products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          age_max_year: number | null
          age_min_year: number | null
          age_verified: boolean
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          care_code: string | null
          category: string | null
          colors: string[]
          condition: string | null
          construction: string | null
          created_at: string
          created_by: string | null
          delivery_class: string | null
          diameter_mm: number | null
          entered_length: number | null
          entered_unit: string | null
          entered_width: number | null
          handmade: boolean | null
          handmade_verified: boolean
          id: string
          length_mm: number | null
          materials: string[]
          origin: string | null
          origin_verified: boolean
          pile: string | null
          pile_verified: boolean
          primary_media_asset_id: string | null
          provenance_summary: string | null
          provenance_verified: boolean
          published_at: string | null
          published_by: string | null
          readiness_passed: boolean
          readiness_version: number
          reviewed_by: string | null
          scheduled_at: string | null
          search_visible: boolean
          shape: string | null
          sku: string
          status: Database["public"]["Enums"]["product_status"]
          structured_data_eligible: boolean
          styles: string[]
          unpublished_at: string | null
          updated_at: string
          updated_by: string | null
          version: number
          width_mm: number | null
        }
        Insert: {
          age_max_year?: number | null
          age_min_year?: number | null
          age_verified?: boolean
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          care_code?: string | null
          category?: string | null
          colors?: string[]
          condition?: string | null
          construction?: string | null
          created_at?: string
          created_by?: string | null
          delivery_class?: string | null
          diameter_mm?: number | null
          entered_length?: number | null
          entered_unit?: string | null
          entered_width?: number | null
          handmade?: boolean | null
          handmade_verified?: boolean
          id?: string
          length_mm?: number | null
          materials?: string[]
          origin?: string | null
          origin_verified?: boolean
          pile?: string | null
          pile_verified?: boolean
          primary_media_asset_id?: string | null
          provenance_summary?: string | null
          provenance_verified?: boolean
          published_at?: string | null
          published_by?: string | null
          readiness_passed?: boolean
          readiness_version?: number
          reviewed_by?: string | null
          scheduled_at?: string | null
          search_visible?: boolean
          shape?: string | null
          sku: string
          status?: Database["public"]["Enums"]["product_status"]
          structured_data_eligible?: boolean
          styles?: string[]
          unpublished_at?: string | null
          updated_at?: string
          updated_by?: string | null
          version?: number
          width_mm?: number | null
        }
        Update: {
          age_max_year?: number | null
          age_min_year?: number | null
          age_verified?: boolean
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          care_code?: string | null
          category?: string | null
          colors?: string[]
          condition?: string | null
          construction?: string | null
          created_at?: string
          created_by?: string | null
          delivery_class?: string | null
          diameter_mm?: number | null
          entered_length?: number | null
          entered_unit?: string | null
          entered_width?: number | null
          handmade?: boolean | null
          handmade_verified?: boolean
          id?: string
          length_mm?: number | null
          materials?: string[]
          origin?: string | null
          origin_verified?: boolean
          pile?: string | null
          pile_verified?: boolean
          primary_media_asset_id?: string | null
          provenance_summary?: string | null
          provenance_verified?: boolean
          published_at?: string | null
          published_by?: string | null
          readiness_passed?: boolean
          readiness_version?: number
          reviewed_by?: string | null
          scheduled_at?: string | null
          search_visible?: boolean
          shape?: string | null
          sku?: string
          status?: Database["public"]["Enums"]["product_status"]
          structured_data_eligible?: boolean
          styles?: string[]
          unpublished_at?: string | null
          updated_at?: string
          updated_by?: string | null
          version?: number
          width_mm?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "products_archived_by_fkey"
            columns: ["archived_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_archived_by_fkey"
            columns: ["archived_by"]
            isOneToOne: false
            referencedRelation: "staff_customer_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_primary_media_asset_fk"
            columns: ["primary_media_asset_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_currency: string
          display_name: string | null
          id: string
          locale: Database["public"]["Enums"]["app_locale"]
          marketing_status: Database["public"]["Enums"]["consent_choice"] | null
          profile_kind: Database["public"]["Enums"]["profile_kind"]
          updated_at: string
          version: number
        }
        Insert: {
          created_at?: string
          display_currency?: string
          display_name?: string | null
          id: string
          locale?: Database["public"]["Enums"]["app_locale"]
          marketing_status?:
            | Database["public"]["Enums"]["consent_choice"]
            | null
          profile_kind?: Database["public"]["Enums"]["profile_kind"]
          updated_at?: string
          version?: number
        }
        Update: {
          created_at?: string
          display_currency?: string
          display_name?: string | null
          id?: string
          locale?: Database["public"]["Enums"]["app_locale"]
          marketing_status?:
            | Database["public"]["Enums"]["consent_choice"]
            | null
          profile_kind?: Database["public"]["Enums"]["profile_kind"]
          updated_at?: string
          version?: number
        }
        Relationships: []
      }
      protected_operations: {
        Row: {
          actor_profile_id: string
          assurance_level: string
          completed_at: string
          correlation_id: string
          entity_id: string
          entity_type: string
          exact_confirmation: string
          id: string
          impact_summary: string
          operation_type: string
          reason: string
        }
        Insert: {
          actor_profile_id: string
          assurance_level: string
          completed_at?: string
          correlation_id: string
          entity_id: string
          entity_type: string
          exact_confirmation: string
          id?: string
          impact_summary: string
          operation_type: string
          reason: string
        }
        Update: {
          actor_profile_id?: string
          assurance_level?: string
          completed_at?: string
          correlation_id?: string
          entity_id?: string
          entity_type?: string
          exact_confirmation?: string
          id?: string
          impact_summary?: string
          operation_type?: string
          reason?: string
        }
        Relationships: [
          {
            foreignKeyName: "protected_operations_actor_profile_id_fkey"
            columns: ["actor_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "protected_operations_actor_profile_id_fkey"
            columns: ["actor_profile_id"]
            isOneToOne: false
            referencedRelation: "staff_customer_directory"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_event_inbox: {
        Row: {
          attempt_count: number
          completed_at: string | null
          correlation_id: string
          event_key: string
          event_type: string
          id: string
          lease_expires_at: string | null
          lease_owner: string | null
          next_attempt_at: string
          payload_hash: string
          provider: string
          received_at: string
          safe_error_code: string | null
          safe_metadata: Json
          signature_valid: boolean
          status: string
          subject_reference: string | null
        }
        Insert: {
          attempt_count?: number
          completed_at?: string | null
          correlation_id?: string
          event_key: string
          event_type: string
          id?: string
          lease_expires_at?: string | null
          lease_owner?: string | null
          next_attempt_at?: string
          payload_hash: string
          provider: string
          received_at?: string
          safe_error_code?: string | null
          safe_metadata?: Json
          signature_valid: boolean
          status?: string
          subject_reference?: string | null
        }
        Update: {
          attempt_count?: number
          completed_at?: string | null
          correlation_id?: string
          event_key?: string
          event_type?: string
          id?: string
          lease_expires_at?: string | null
          lease_owner?: string | null
          next_attempt_at?: string
          payload_hash?: string
          provider?: string
          received_at?: string
          safe_error_code?: string | null
          safe_metadata?: Json
          signature_valid?: boolean
          status?: string
          subject_reference?: string | null
        }
        Relationships: []
      }
      rate_limit_windows: {
        Row: {
          expires_at: string
          request_count: number
          request_limit: number
          scope: string
          subject_hash: string
          window_seconds: number
          window_started_at: string
        }
        Insert: {
          expires_at: string
          request_count?: number
          request_limit: number
          scope: string
          subject_hash: string
          window_seconds: number
          window_started_at: string
        }
        Update: {
          expires_at?: string
          request_count?: number
          request_limit?: number
          scope?: string
          subject_hash?: string
          window_seconds?: number
          window_started_at?: string
        }
        Relationships: []
      }
      readiness_assessments: {
        Row: {
          blockers: string[]
          correlation_id: string
          decision: string
          environment: string
          evaluated_at: string
          gates: Json
          id: string
          release_record_id: string | null
          stage: string
        }
        Insert: {
          blockers?: string[]
          correlation_id: string
          decision: string
          environment: string
          evaluated_at?: string
          gates: Json
          id?: string
          release_record_id?: string | null
          stage: string
        }
        Update: {
          blockers?: string[]
          correlation_id?: string
          decision?: string
          environment?: string
          evaluated_at?: string
          gates?: Json
          id?: string
          release_record_id?: string | null
          stage?: string
        }
        Relationships: [
          {
            foreignKeyName: "readiness_assessments_release_record_id_fkey"
            columns: ["release_record_id"]
            isOneToOne: false
            referencedRelation: "release_records"
            referencedColumns: ["id"]
          },
        ]
      }
      refund_records: {
        Row: {
          amount_minor: number
          correlation_id: string
          currency: string
          id: string
          idempotency_key: string
          order_id: string
          payment_attempt_id: string
          processed_at: string | null
          processed_by: string | null
          provider_reference: string | null
          reason: string
          requested_at: string
          requested_by: string | null
          safe_error_code: string | null
          status: string
          version: number
        }
        Insert: {
          amount_minor: number
          correlation_id?: string
          currency: string
          id?: string
          idempotency_key: string
          order_id: string
          payment_attempt_id: string
          processed_at?: string | null
          processed_by?: string | null
          provider_reference?: string | null
          reason: string
          requested_at?: string
          requested_by?: string | null
          safe_error_code?: string | null
          status?: string
          version?: number
        }
        Update: {
          amount_minor?: number
          correlation_id?: string
          currency?: string
          id?: string
          idempotency_key?: string
          order_id?: string
          payment_attempt_id?: string
          processed_at?: string | null
          processed_by?: string | null
          provider_reference?: string | null
          reason?: string
          requested_at?: string
          requested_by?: string | null
          safe_error_code?: string | null
          status?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "refund_records_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refund_records_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "staff_order_operations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refund_records_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "staff_order_summaries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refund_records_payment_attempt_id_fkey"
            columns: ["payment_attempt_id"]
            isOneToOne: false
            referencedRelation: "payment_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refund_records_processed_by_fkey"
            columns: ["processed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refund_records_processed_by_fkey"
            columns: ["processed_by"]
            isOneToOne: false
            referencedRelation: "staff_customer_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refund_records_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refund_records_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "staff_customer_directory"
            referencedColumns: ["id"]
          },
        ]
      }
      release_records: {
        Row: {
          commit_sha: string
          correlation_id: string
          created_at: string
          environment: string
          evidence: Json
          id: string
          netlify_deploy_id: string | null
          previous_release_id: string | null
          release_id: string
          rollback_reason_code: string | null
          schema_version: string
          stage: string
          status: string
        }
        Insert: {
          commit_sha: string
          correlation_id: string
          created_at?: string
          environment: string
          evidence?: Json
          id?: string
          netlify_deploy_id?: string | null
          previous_release_id?: string | null
          release_id: string
          rollback_reason_code?: string | null
          schema_version: string
          stage: string
          status: string
        }
        Update: {
          commit_sha?: string
          correlation_id?: string
          created_at?: string
          environment?: string
          evidence?: Json
          id?: string
          netlify_deploy_id?: string | null
          previous_release_id?: string | null
          release_id?: string
          rollback_reason_code?: string | null
          schema_version?: string
          stage?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "release_records_previous_release_id_fkey"
            columns: ["previous_release_id"]
            isOneToOne: false
            referencedRelation: "release_records"
            referencedColumns: ["id"]
          },
        ]
      }
      return_decisions: {
        Row: {
          actor_class: string
          correlation_id: string
          created_at: string
          decided_by: string | null
          decision: string
          id: string
          idempotency_key: string
          reason: string
          return_request_id: string
        }
        Insert: {
          actor_class: string
          correlation_id: string
          created_at?: string
          decided_by?: string | null
          decision: string
          id?: string
          idempotency_key: string
          reason: string
          return_request_id: string
        }
        Update: {
          actor_class?: string
          correlation_id?: string
          created_at?: string
          decided_by?: string | null
          decision?: string
          id?: string
          idempotency_key?: string
          reason?: string
          return_request_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "return_decisions_decided_by_fkey"
            columns: ["decided_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "return_decisions_decided_by_fkey"
            columns: ["decided_by"]
            isOneToOne: false
            referencedRelation: "staff_customer_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "return_decisions_return_request_id_fkey"
            columns: ["return_request_id"]
            isOneToOne: false
            referencedRelation: "return_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "return_decisions_return_request_id_fkey"
            columns: ["return_request_id"]
            isOneToOne: false
            referencedRelation: "staff_return_queue"
            referencedColumns: ["id"]
          },
        ]
      }
      return_events: {
        Row: {
          actor_class: string
          actor_profile_id: string | null
          correlation_id: string
          event_type: string
          from_status:
            | Database["public"]["Enums"]["return_request_status"]
            | null
          id: number
          occurred_at: string
          return_request_id: string
          safe_metadata: Json
          to_status: Database["public"]["Enums"]["return_request_status"]
        }
        Insert: {
          actor_class: string
          actor_profile_id?: string | null
          correlation_id: string
          event_type: string
          from_status?:
            | Database["public"]["Enums"]["return_request_status"]
            | null
          id?: never
          occurred_at?: string
          return_request_id: string
          safe_metadata?: Json
          to_status: Database["public"]["Enums"]["return_request_status"]
        }
        Update: {
          actor_class?: string
          actor_profile_id?: string | null
          correlation_id?: string
          event_type?: string
          from_status?:
            | Database["public"]["Enums"]["return_request_status"]
            | null
          id?: never
          occurred_at?: string
          return_request_id?: string
          safe_metadata?: Json
          to_status?: Database["public"]["Enums"]["return_request_status"]
        }
        Relationships: [
          {
            foreignKeyName: "return_events_actor_profile_id_fkey"
            columns: ["actor_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "return_events_actor_profile_id_fkey"
            columns: ["actor_profile_id"]
            isOneToOne: false
            referencedRelation: "staff_customer_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "return_events_return_request_id_fkey"
            columns: ["return_request_id"]
            isOneToOne: false
            referencedRelation: "return_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "return_events_return_request_id_fkey"
            columns: ["return_request_id"]
            isOneToOne: false
            referencedRelation: "staff_return_queue"
            referencedColumns: ["id"]
          },
        ]
      }
      return_evidence: {
        Row: {
          attached_at: string | null
          bucket: string
          byte_size: number
          checksum: string
          content_type: string
          created_at: string
          id: string
          original_filename: string
          removed_at: string | null
          retention_until: string
          return_request_id: string
          status: Database["public"]["Enums"]["return_evidence_status"]
          storage_path: string
        }
        Insert: {
          attached_at?: string | null
          bucket?: string
          byte_size: number
          checksum: string
          content_type: string
          created_at?: string
          id?: string
          original_filename: string
          removed_at?: string | null
          retention_until: string
          return_request_id: string
          status?: Database["public"]["Enums"]["return_evidence_status"]
          storage_path: string
        }
        Update: {
          attached_at?: string | null
          bucket?: string
          byte_size?: number
          checksum?: string
          content_type?: string
          created_at?: string
          id?: string
          original_filename?: string
          removed_at?: string | null
          retention_until?: string
          return_request_id?: string
          status?: Database["public"]["Enums"]["return_evidence_status"]
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "return_evidence_return_request_id_fkey"
            columns: ["return_request_id"]
            isOneToOne: false
            referencedRelation: "return_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "return_evidence_return_request_id_fkey"
            columns: ["return_request_id"]
            isOneToOne: false
            referencedRelation: "staff_return_queue"
            referencedColumns: ["id"]
          },
        ]
      }
      return_inspections: {
        Row: {
          correlation_id: string
          id: string
          inspected_at: string
          inspected_by: string
          received_package_condition: string | null
          return_request_id: string
          summary: string
        }
        Insert: {
          correlation_id: string
          id?: string
          inspected_at?: string
          inspected_by: string
          received_package_condition?: string | null
          return_request_id: string
          summary: string
        }
        Update: {
          correlation_id?: string
          id?: string
          inspected_at?: string
          inspected_by?: string
          received_package_condition?: string | null
          return_request_id?: string
          summary?: string
        }
        Relationships: [
          {
            foreignKeyName: "return_inspections_inspected_by_fkey"
            columns: ["inspected_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "return_inspections_inspected_by_fkey"
            columns: ["inspected_by"]
            isOneToOne: false
            referencedRelation: "staff_customer_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "return_inspections_return_request_id_fkey"
            columns: ["return_request_id"]
            isOneToOne: true
            referencedRelation: "return_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "return_inspections_return_request_id_fkey"
            columns: ["return_request_id"]
            isOneToOne: true
            referencedRelation: "staff_return_queue"
            referencedColumns: ["id"]
          },
        ]
      }
      return_items: {
        Row: {
          condition: Database["public"]["Enums"]["return_item_condition"]
          created_at: string
          id: string
          inspection_note: string | null
          order_line_id: string
          quantity: number
          refund_amount_minor: number | null
          restock_decision: Database["public"]["Enums"]["restock_decision"]
          return_request_id: string
          updated_at: string
          version: number
        }
        Insert: {
          condition?: Database["public"]["Enums"]["return_item_condition"]
          created_at?: string
          id?: string
          inspection_note?: string | null
          order_line_id: string
          quantity: number
          refund_amount_minor?: number | null
          restock_decision?: Database["public"]["Enums"]["restock_decision"]
          return_request_id: string
          updated_at?: string
          version?: number
        }
        Update: {
          condition?: Database["public"]["Enums"]["return_item_condition"]
          created_at?: string
          id?: string
          inspection_note?: string | null
          order_line_id?: string
          quantity?: number
          refund_amount_minor?: number | null
          restock_decision?: Database["public"]["Enums"]["restock_decision"]
          return_request_id?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "return_items_order_line_id_fkey"
            columns: ["order_line_id"]
            isOneToOne: false
            referencedRelation: "order_lines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "return_items_return_request_id_fkey"
            columns: ["return_request_id"]
            isOneToOne: false
            referencedRelation: "return_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "return_items_return_request_id_fkey"
            columns: ["return_request_id"]
            isOneToOne: false
            referencedRelation: "staff_return_queue"
            referencedColumns: ["id"]
          },
        ]
      }
      return_messages: {
        Row: {
          actor_class: string
          audience: string
          body: string
          created_at: string
          created_by: string | null
          id: string
          return_request_id: string
        }
        Insert: {
          actor_class: string
          audience: string
          body: string
          created_at?: string
          created_by?: string | null
          id?: string
          return_request_id: string
        }
        Update: {
          actor_class?: string
          audience?: string
          body?: string
          created_at?: string
          created_by?: string | null
          id?: string
          return_request_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "return_messages_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "return_messages_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "staff_customer_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "return_messages_return_request_id_fkey"
            columns: ["return_request_id"]
            isOneToOne: false
            referencedRelation: "return_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "return_messages_return_request_id_fkey"
            columns: ["return_request_id"]
            isOneToOne: false
            referencedRelation: "staff_return_queue"
            referencedColumns: ["id"]
          },
        ]
      }
      return_policies: {
        Row: {
          active: boolean
          allowed_evidence_types: string[]
          allowed_reasons: string[]
          buyer_copy: Json
          cancellation_window_hours: number
          created_at: string
          created_by: string | null
          effective_at: string | null
          id: string
          legal_status: Database["public"]["Enums"]["return_legal_status"]
          max_evidence_bytes: number
          max_evidence_files: number
          restock_mode: string
          return_window_days: number
          updated_at: string
          version: string
          version_number: number
        }
        Insert: {
          active?: boolean
          allowed_evidence_types: string[]
          allowed_reasons: string[]
          buyer_copy: Json
          cancellation_window_hours: number
          created_at?: string
          created_by?: string | null
          effective_at?: string | null
          id?: string
          legal_status?: Database["public"]["Enums"]["return_legal_status"]
          max_evidence_bytes: number
          max_evidence_files: number
          restock_mode: string
          return_window_days: number
          updated_at?: string
          version: string
          version_number?: number
        }
        Update: {
          active?: boolean
          allowed_evidence_types?: string[]
          allowed_reasons?: string[]
          buyer_copy?: Json
          cancellation_window_hours?: number
          created_at?: string
          created_by?: string | null
          effective_at?: string | null
          id?: string
          legal_status?: Database["public"]["Enums"]["return_legal_status"]
          max_evidence_bytes?: number
          max_evidence_files?: number
          restock_mode?: string
          return_window_days?: number
          updated_at?: string
          version?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "return_policies_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "return_policies_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "staff_customer_directory"
            referencedColumns: ["id"]
          },
        ]
      }
      return_refund_links: {
        Row: {
          created_at: string
          id: string
          idempotency_key: string
          refund_record_id: string
          return_request_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          idempotency_key: string
          refund_record_id: string
          return_request_id: string
        }
        Update: {
          created_at?: string
          id?: string
          idempotency_key?: string
          refund_record_id?: string
          return_request_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "return_refund_links_refund_record_id_fkey"
            columns: ["refund_record_id"]
            isOneToOne: true
            referencedRelation: "refund_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "return_refund_links_return_request_id_fkey"
            columns: ["return_request_id"]
            isOneToOne: false
            referencedRelation: "return_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "return_refund_links_return_request_id_fkey"
            columns: ["return_request_id"]
            isOneToOne: false
            referencedRelation: "staff_return_queue"
            referencedColumns: ["id"]
          },
        ]
      }
      return_requests: {
        Row: {
          buyer_locale: Database["public"]["Enums"]["app_locale"]
          buyer_note: string | null
          closed_at: string | null
          correlation_id: string
          created_at: string
          customer_profile_id: string | null
          decided_at: string | null
          decision_by: string | null
          decision_reason: string | null
          eligibility_snapshot: Json
          expires_at: string
          guest_session_id: string | null
          id: string
          idempotency_key_hash: string
          inspected_at: string | null
          order_id: string
          policy_id: string
          policy_snapshot: Json
          policy_version: string
          reason_code: string
          received_at: string | null
          reference: string
          refunded_at: string | null
          request_kind: Database["public"]["Enums"]["return_request_kind"]
          status: Database["public"]["Enums"]["return_request_status"]
          updated_at: string
          version: number
        }
        Insert: {
          buyer_locale: Database["public"]["Enums"]["app_locale"]
          buyer_note?: string | null
          closed_at?: string | null
          correlation_id?: string
          created_at?: string
          customer_profile_id?: string | null
          decided_at?: string | null
          decision_by?: string | null
          decision_reason?: string | null
          eligibility_snapshot: Json
          expires_at: string
          guest_session_id?: string | null
          id?: string
          idempotency_key_hash: string
          inspected_at?: string | null
          order_id: string
          policy_id: string
          policy_snapshot: Json
          policy_version: string
          reason_code: string
          received_at?: string | null
          reference: string
          refunded_at?: string | null
          request_kind: Database["public"]["Enums"]["return_request_kind"]
          status?: Database["public"]["Enums"]["return_request_status"]
          updated_at?: string
          version?: number
        }
        Update: {
          buyer_locale?: Database["public"]["Enums"]["app_locale"]
          buyer_note?: string | null
          closed_at?: string | null
          correlation_id?: string
          created_at?: string
          customer_profile_id?: string | null
          decided_at?: string | null
          decision_by?: string | null
          decision_reason?: string | null
          eligibility_snapshot?: Json
          expires_at?: string
          guest_session_id?: string | null
          id?: string
          idempotency_key_hash?: string
          inspected_at?: string | null
          order_id?: string
          policy_id?: string
          policy_snapshot?: Json
          policy_version?: string
          reason_code?: string
          received_at?: string | null
          reference?: string
          refunded_at?: string | null
          request_kind?: Database["public"]["Enums"]["return_request_kind"]
          status?: Database["public"]["Enums"]["return_request_status"]
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "return_requests_customer_profile_id_fkey"
            columns: ["customer_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "return_requests_customer_profile_id_fkey"
            columns: ["customer_profile_id"]
            isOneToOne: false
            referencedRelation: "staff_customer_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "return_requests_decision_by_fkey"
            columns: ["decision_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "return_requests_decision_by_fkey"
            columns: ["decision_by"]
            isOneToOne: false
            referencedRelation: "staff_customer_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "return_requests_guest_session_id_fkey"
            columns: ["guest_session_id"]
            isOneToOne: false
            referencedRelation: "guest_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "return_requests_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "return_requests_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "staff_order_operations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "return_requests_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "staff_order_summaries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "return_requests_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "return_policies"
            referencedColumns: ["id"]
          },
        ]
      }
      return_restock_links: {
        Row: {
          applied_at: string
          applied_by: string | null
          id: string
          idempotency_key: string
          inventory_adjustment_id: string
          return_item_id: string
          return_request_id: string
        }
        Insert: {
          applied_at?: string
          applied_by?: string | null
          id?: string
          idempotency_key: string
          inventory_adjustment_id: string
          return_item_id: string
          return_request_id: string
        }
        Update: {
          applied_at?: string
          applied_by?: string | null
          id?: string
          idempotency_key?: string
          inventory_adjustment_id?: string
          return_item_id?: string
          return_request_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "return_restock_links_applied_by_fkey"
            columns: ["applied_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "return_restock_links_applied_by_fkey"
            columns: ["applied_by"]
            isOneToOne: false
            referencedRelation: "staff_customer_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "return_restock_links_inventory_adjustment_id_fkey"
            columns: ["inventory_adjustment_id"]
            isOneToOne: true
            referencedRelation: "inventory_adjustments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "return_restock_links_return_item_id_fkey"
            columns: ["return_item_id"]
            isOneToOne: true
            referencedRelation: "return_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "return_restock_links_return_request_id_fkey"
            columns: ["return_request_id"]
            isOneToOne: false
            referencedRelation: "return_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "return_restock_links_return_request_id_fkey"
            columns: ["return_request_id"]
            isOneToOne: false
            referencedRelation: "staff_return_queue"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_admin_views: {
        Row: {
          created_at: string
          filters: Json
          id: string
          name: string
          owner_profile_id: string
          sort: Json
          updated_at: string
          view_type: string
        }
        Insert: {
          created_at?: string
          filters?: Json
          id?: string
          name: string
          owner_profile_id: string
          sort?: Json
          updated_at?: string
          view_type: string
        }
        Update: {
          created_at?: string
          filters?: Json
          id?: string
          name?: string
          owner_profile_id?: string
          sort?: Json
          updated_at?: string
          view_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_admin_views_owner_profile_id_fkey"
            columns: ["owner_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_admin_views_owner_profile_id_fkey"
            columns: ["owner_profile_id"]
            isOneToOne: false
            referencedRelation: "staff_customer_directory"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduled_action_runs: {
        Row: {
          attempt_number: number
          completed_at: string | null
          correlation_id: string
          duration_ms: number | null
          heartbeat_at: string
          id: string
          lease_expires_at: string
          leased_at: string
          result_summary: Json
          run_key: string
          safe_error_code: string | null
          scheduled_action_id: string
          scheduled_for: string
          status: string
          worker_id: string
        }
        Insert: {
          attempt_number: number
          completed_at?: string | null
          correlation_id: string
          duration_ms?: number | null
          heartbeat_at?: string
          id?: string
          lease_expires_at: string
          leased_at?: string
          result_summary?: Json
          run_key: string
          safe_error_code?: string | null
          scheduled_action_id: string
          scheduled_for: string
          status: string
          worker_id: string
        }
        Update: {
          attempt_number?: number
          completed_at?: string | null
          correlation_id?: string
          duration_ms?: number | null
          heartbeat_at?: string
          id?: string
          lease_expires_at?: string
          leased_at?: string
          result_summary?: Json
          run_key?: string
          safe_error_code?: string | null
          scheduled_action_id?: string
          scheduled_for?: string
          status?: string
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_action_runs_scheduled_action_id_fkey"
            columns: ["scheduled_action_id"]
            isOneToOne: false
            referencedRelation: "scheduled_actions"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduled_actions: {
        Row: {
          action_type: string
          attempt_count: number
          completed_at: string | null
          correlation_id: string
          created_at: string
          due_at: string
          id: string
          idempotency_key: string
          last_run_id: string | null
          lease_expires_at: string | null
          lease_heartbeat_at: string | null
          lease_owner: string | null
          max_attempts: number
          safe_error_code: string | null
          status: Database["public"]["Enums"]["work_status"]
          subject_id: string | null
          subject_type: string
        }
        Insert: {
          action_type: string
          attempt_count?: number
          completed_at?: string | null
          correlation_id: string
          created_at?: string
          due_at: string
          id?: string
          idempotency_key: string
          last_run_id?: string | null
          lease_expires_at?: string | null
          lease_heartbeat_at?: string | null
          lease_owner?: string | null
          max_attempts?: number
          safe_error_code?: string | null
          status?: Database["public"]["Enums"]["work_status"]
          subject_id?: string | null
          subject_type: string
        }
        Update: {
          action_type?: string
          attempt_count?: number
          completed_at?: string | null
          correlation_id?: string
          created_at?: string
          due_at?: string
          id?: string
          idempotency_key?: string
          last_run_id?: string | null
          lease_expires_at?: string | null
          lease_heartbeat_at?: string | null
          lease_owner?: string | null
          max_attempts?: number
          safe_error_code?: string | null
          status?: Database["public"]["Enums"]["work_status"]
          subject_id?: string | null
          subject_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_actions_last_run_fk"
            columns: ["last_run_id"]
            isOneToOne: false
            referencedRelation: "scheduled_action_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      shipment_events: {
        Row: {
          actor_class: string
          actor_profile_id: string | null
          correlation_id: string
          event_key: string
          event_type: string
          fulfillment_id: string
          id: number
          occurred_at: string
          safe_location: string | null
          safe_metadata: Json
        }
        Insert: {
          actor_class: string
          actor_profile_id?: string | null
          correlation_id?: string
          event_key: string
          event_type: string
          fulfillment_id: string
          id?: never
          occurred_at?: string
          safe_location?: string | null
          safe_metadata?: Json
        }
        Update: {
          actor_class?: string
          actor_profile_id?: string | null
          correlation_id?: string
          event_key?: string
          event_type?: string
          fulfillment_id?: string
          id?: never
          occurred_at?: string
          safe_location?: string | null
          safe_metadata?: Json
        }
        Relationships: [
          {
            foreignKeyName: "shipment_events_actor_profile_id_fkey"
            columns: ["actor_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipment_events_actor_profile_id_fkey"
            columns: ["actor_profile_id"]
            isOneToOne: false
            referencedRelation: "staff_customer_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipment_events_fulfillment_id_fkey"
            columns: ["fulfillment_id"]
            isOneToOne: false
            referencedRelation: "fulfillments"
            referencedColumns: ["id"]
          },
        ]
      }
      shipping_methods: {
        Row: {
          code: string
          configuration_status: string
          created_at: string
          customs_copy_i18n: Json | null
          enabled: boolean
          estimate_max_days: number | null
          estimate_min_days: number | null
          id: string
          manual_quote: boolean
          name_i18n: Json
          service_level_i18n: Json | null
          updated_at: string
          version: number
        }
        Insert: {
          code: string
          configuration_status?: string
          created_at?: string
          customs_copy_i18n?: Json | null
          enabled?: boolean
          estimate_max_days?: number | null
          estimate_min_days?: number | null
          id?: string
          manual_quote?: boolean
          name_i18n: Json
          service_level_i18n?: Json | null
          updated_at?: string
          version?: number
        }
        Update: {
          code?: string
          configuration_status?: string
          created_at?: string
          customs_copy_i18n?: Json | null
          enabled?: boolean
          estimate_max_days?: number | null
          estimate_min_days?: number | null
          id?: string
          manual_quote?: boolean
          name_i18n?: Json
          service_level_i18n?: Json | null
          updated_at?: string
          version?: number
        }
        Relationships: []
      }
      shipping_rate_rules: {
        Row: {
          amount_minor: number
          currency: string
          delivery_classes: string[]
          enabled: boolean
          ends_at: string
          free_threshold_minor: number | null
          id: string
          maximum_subtotal_minor: number | null
          method_id: string
          minimum_subtotal_minor: number
          priority: number
          starts_at: string
          version: number
          zone_id: string
        }
        Insert: {
          amount_minor: number
          currency: string
          delivery_classes?: string[]
          enabled?: boolean
          ends_at?: string
          free_threshold_minor?: number | null
          id?: string
          maximum_subtotal_minor?: number | null
          method_id: string
          minimum_subtotal_minor?: number
          priority?: number
          starts_at?: string
          version?: number
          zone_id: string
        }
        Update: {
          amount_minor?: number
          currency?: string
          delivery_classes?: string[]
          enabled?: boolean
          ends_at?: string
          free_threshold_minor?: number | null
          id?: string
          maximum_subtotal_minor?: number | null
          method_id?: string
          minimum_subtotal_minor?: number
          priority?: number
          starts_at?: string
          version?: number
          zone_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shipping_rate_rules_method_id_fkey"
            columns: ["method_id"]
            isOneToOne: false
            referencedRelation: "shipping_methods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipping_rate_rules_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "shipping_zones"
            referencedColumns: ["id"]
          },
        ]
      }
      shipping_zone_countries: {
        Row: {
          country_code: string
          zone_id: string
        }
        Insert: {
          country_code: string
          zone_id: string
        }
        Update: {
          country_code?: string
          zone_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shipping_zone_countries_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "shipping_zones"
            referencedColumns: ["id"]
          },
        ]
      }
      shipping_zones: {
        Row: {
          code: string
          configuration_status: string
          created_at: string
          enabled: boolean
          id: string
          legal_status: string
          name: string
          priority: number
          updated_at: string
          version: number
        }
        Insert: {
          code: string
          configuration_status?: string
          created_at?: string
          enabled?: boolean
          id?: string
          legal_status?: string
          name: string
          priority?: number
          updated_at?: string
          version?: number
        }
        Update: {
          code?: string
          configuration_status?: string
          created_at?: string
          enabled?: boolean
          id?: string
          legal_status?: string
          name?: string
          priority?: number
          updated_at?: string
          version?: number
        }
        Relationships: []
      }
      staff_invitations: {
        Row: {
          accepted_at: string | null
          auth_user_id: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          revoked_at: string | null
          role: Database["public"]["Enums"]["staff_role"]
          status: Database["public"]["Enums"]["staff_invitation_status"]
          updated_at: string
          version: number
        }
        Insert: {
          accepted_at?: string | null
          auth_user_id?: string | null
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by: string
          revoked_at?: string | null
          role: Database["public"]["Enums"]["staff_role"]
          status?: Database["public"]["Enums"]["staff_invitation_status"]
          updated_at?: string
          version?: number
        }
        Update: {
          accepted_at?: string | null
          auth_user_id?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          revoked_at?: string | null
          role?: Database["public"]["Enums"]["staff_role"]
          status?: Database["public"]["Enums"]["staff_invitation_status"]
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "staff_invitations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_invitations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "staff_customer_directory"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_members: {
        Row: {
          activated_at: string | null
          active: boolean
          created_at: string
          deactivated_at: string | null
          deactivation_reason: string | null
          invited_by: string | null
          mfa_required: boolean
          profile_id: string
          role: Database["public"]["Enums"]["staff_role"]
          role_changed_at: string | null
          role_changed_by: string | null
          updated_at: string
          version: number
        }
        Insert: {
          activated_at?: string | null
          active?: boolean
          created_at?: string
          deactivated_at?: string | null
          deactivation_reason?: string | null
          invited_by?: string | null
          mfa_required?: boolean
          profile_id: string
          role: Database["public"]["Enums"]["staff_role"]
          role_changed_at?: string | null
          role_changed_by?: string | null
          updated_at?: string
          version?: number
        }
        Update: {
          activated_at?: string | null
          active?: boolean
          created_at?: string
          deactivated_at?: string | null
          deactivation_reason?: string | null
          invited_by?: string | null
          mfa_required?: boolean
          profile_id?: string
          role?: Database["public"]["Enums"]["staff_role"]
          role_changed_at?: string | null
          role_changed_by?: string | null
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "staff_members_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_members_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "staff_customer_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_members_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_members_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "staff_customer_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_members_role_changed_by_fkey"
            columns: ["role_changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_members_role_changed_by_fkey"
            columns: ["role_changed_by"]
            isOneToOne: false
            referencedRelation: "staff_customer_directory"
            referencedColumns: ["id"]
          },
        ]
      }
      tag_translations: {
        Row: {
          label: string
          locale: Database["public"]["Enums"]["app_locale"]
          slug: string
          tag_id: string
        }
        Insert: {
          label: string
          locale: Database["public"]["Enums"]["app_locale"]
          slug: string
          tag_id: string
        }
        Update: {
          label?: string
          locale?: Database["public"]["Enums"]["app_locale"]
          slug?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tag_translations_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      tags: {
        Row: {
          code: string
          created_at: string
          filter_visible: boolean
          id: string
          tag_type: string
        }
        Insert: {
          code: string
          created_at?: string
          filter_visible?: boolean
          id?: string
          tag_type: string
        }
        Update: {
          code?: string
          created_at?: string
          filter_visible?: boolean
          id?: string
          tag_type?: string
        }
        Relationships: []
      }
      tax_rules: {
        Row: {
          country_code: string
          currency: string
          enabled: boolean
          ends_at: string
          id: string
          prices_include_tax: boolean
          priority: number
          rate_basis_points: number
          starts_at: string
          version: number
        }
        Insert: {
          country_code: string
          currency: string
          enabled?: boolean
          ends_at?: string
          id?: string
          prices_include_tax?: boolean
          priority?: number
          rate_basis_points: number
          starts_at?: string
          version?: number
        }
        Update: {
          country_code?: string
          currency?: string
          enabled?: boolean
          ends_at?: string
          id?: string
          prices_include_tax?: boolean
          priority?: number
          rate_basis_points?: number
          starts_at?: string
          version?: number
        }
        Relationships: []
      }
      webhook_receipts: {
        Row: {
          completed_at: string | null
          correlation_id: string
          event_key: string
          id: string
          payload_hash: string
          provider: string
          received_at: string
          safe_error_code: string | null
          signature_valid: boolean
          status: string
        }
        Insert: {
          completed_at?: string | null
          correlation_id: string
          event_key: string
          id?: string
          payload_hash: string
          provider: string
          received_at?: string
          safe_error_code?: string | null
          signature_valid: boolean
          status: string
        }
        Update: {
          completed_at?: string | null
          correlation_id?: string
          event_key?: string
          id?: string
          payload_hash?: string
          provider?: string
          received_at?: string
          safe_error_code?: string | null
          signature_valid?: boolean
          status?: string
        }
        Relationships: []
      }
      wishlist_items: {
        Row: {
          added_at: string
          id: string
          product_id: string
          wishlist_id: string
        }
        Insert: {
          added_at?: string
          id?: string
          product_id: string
          wishlist_id: string
        }
        Update: {
          added_at?: string
          id?: string
          product_id?: string
          wishlist_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wishlist_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "catalog_export_rows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wishlist_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wishlist_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "public_catalog_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wishlist_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "staff_catalog_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wishlist_items_wishlist_id_fkey"
            columns: ["wishlist_id"]
            isOneToOne: false
            referencedRelation: "wishlists"
            referencedColumns: ["id"]
          },
        ]
      }
      wishlist_merge_events: {
        Row: {
          id: number
          item_count: number
          merge_record_id: string
          occurred_at: string
          source_wishlist_id: string | null
          target_wishlist_id: string
        }
        Insert: {
          id?: never
          item_count: number
          merge_record_id: string
          occurred_at?: string
          source_wishlist_id?: string | null
          target_wishlist_id: string
        }
        Update: {
          id?: never
          item_count?: number
          merge_record_id?: string
          occurred_at?: string
          source_wishlist_id?: string | null
          target_wishlist_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wishlist_merge_events_merge_record_id_fkey"
            columns: ["merge_record_id"]
            isOneToOne: true
            referencedRelation: "customer_merge_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wishlist_merge_events_source_wishlist_id_fkey"
            columns: ["source_wishlist_id"]
            isOneToOne: false
            referencedRelation: "wishlists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wishlist_merge_events_target_wishlist_id_fkey"
            columns: ["target_wishlist_id"]
            isOneToOne: false
            referencedRelation: "wishlists"
            referencedColumns: ["id"]
          },
        ]
      }
      wishlists: {
        Row: {
          created_at: string
          customer_profile_id: string | null
          guest_session_id: string | null
          id: string
          merged_into_id: string | null
          status: Database["public"]["Enums"]["wishlist_status"]
          updated_at: string
          version: number
        }
        Insert: {
          created_at?: string
          customer_profile_id?: string | null
          guest_session_id?: string | null
          id?: string
          merged_into_id?: string | null
          status?: Database["public"]["Enums"]["wishlist_status"]
          updated_at?: string
          version?: number
        }
        Update: {
          created_at?: string
          customer_profile_id?: string | null
          guest_session_id?: string | null
          id?: string
          merged_into_id?: string | null
          status?: Database["public"]["Enums"]["wishlist_status"]
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "wishlists_customer_profile_id_fkey"
            columns: ["customer_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wishlists_customer_profile_id_fkey"
            columns: ["customer_profile_id"]
            isOneToOne: false
            referencedRelation: "staff_customer_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wishlists_guest_session_id_fkey"
            columns: ["guest_session_id"]
            isOneToOne: false
            referencedRelation: "guest_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wishlists_merged_into_id_fkey"
            columns: ["merged_into_id"]
            isOneToOne: false
            referencedRelation: "wishlists"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      catalog_export_rows: {
        Row: {
          amount_minor: number | null
          currency: string | null
          id: string | null
          locale: string | null
          name: string | null
          on_hand_quantity: number | null
          reserved_quantity: number | null
          sku: string | null
          slug: string | null
          status: string | null
          stock_model: string | null
          updated_at: string | null
        }
        Relationships: []
      }
      integration_status_safe: {
        Row: {
          capabilities: string[] | null
          key: string | null
          last_checked_at: string | null
          mode: Database["public"]["Enums"]["integration_mode"] | null
          safe_reason: string | null
          secret_configured: boolean | null
          updated_at: string | null
          version: number | null
        }
        Insert: {
          capabilities?: string[] | null
          key?: string | null
          last_checked_at?: string | null
          mode?: Database["public"]["Enums"]["integration_mode"] | null
          safe_reason?: string | null
          secret_configured?: boolean | null
          updated_at?: string | null
          version?: number | null
        }
        Update: {
          capabilities?: string[] | null
          key?: string | null
          last_checked_at?: string | null
          mode?: Database["public"]["Enums"]["integration_mode"] | null
          safe_reason?: string | null
          secret_configured?: boolean | null
          updated_at?: string | null
          version?: number | null
        }
        Relationships: []
      }
      public_catalog_products: {
        Row: {
          age_max_year: number | null
          age_min_year: number | null
          amount_minor: number | null
          available_quantity: number | null
          care_code: string | null
          care_text: string | null
          category: string | null
          colors: string[] | null
          condition: string | null
          construction: string | null
          currency: string | null
          delivery_class: string | null
          diameter_mm: number | null
          handmade: boolean | null
          id: string | null
          length_mm: number | null
          locale: Database["public"]["Enums"]["app_locale"] | null
          long_description: string | null
          materials: string[] | null
          name: string | null
          origin: string | null
          pile: string | null
          primary_image_path: string | null
          provenance_summary: string | null
          published_at: string | null
          search_text: string | null
          shape: string | null
          short_description: string | null
          sku: string | null
          slug: string | null
          stock_model: Database["public"]["Enums"]["stock_model"] | null
          structured_data_eligible: boolean | null
          styles: string[] | null
          updated_at: string | null
          width_mm: number | null
        }
        Relationships: []
      }
      published_contact_channels: {
        Row: {
          channel_key: string | null
          channel_type: string | null
          labels_i18n: Json | null
          public_value: string | null
        }
        Insert: {
          channel_key?: string | null
          channel_type?: string | null
          labels_i18n?: Json | null
          public_value?: string | null
        }
        Update: {
          channel_key?: string | null
          channel_type?: string | null
          labels_i18n?: Json | null
          public_value?: string | null
        }
        Relationships: []
      }
      published_content_menu_items: {
        Row: {
          destination_path: string | null
          item_key: string | null
          labels_i18n: Json | null
          menu_key: string | null
          position: number | null
        }
        Relationships: []
      }
      published_content_projection: {
        Row: {
          blocks: Json | null
          content_type: string | null
          entry_key: string | null
          fallback_policy: string | null
          legal_status: string | null
          locale: Database["public"]["Enums"]["app_locale"] | null
          meta_description: string | null
          meta_title: string | null
          published_at: string | null
          slug: string | null
          social_image_url: string | null
          summary: string | null
          title: string | null
        }
        Relationships: []
      }
      published_content_redirects: {
        Row: {
          destination_path: string | null
          http_status: number | null
          source_path: string | null
        }
        Insert: {
          destination_path?: string | null
          http_status?: number | null
          source_path?: string | null
        }
        Update: {
          destination_path?: string | null
          http_status?: number | null
          source_path?: string | null
        }
        Relationships: []
      }
      published_currency_settings: {
        Row: {
          checkout_enabled: boolean | null
          currency: string | null
          display_order: number | null
          is_default: boolean | null
          price_source_mode:
            | Database["public"]["Enums"]["price_source_mode"]
            | null
        }
        Insert: {
          checkout_enabled?: boolean | null
          currency?: string | null
          display_order?: number | null
          is_default?: boolean | null
          price_source_mode?:
            | Database["public"]["Enums"]["price_source_mode"]
            | null
        }
        Update: {
          checkout_enabled?: boolean | null
          currency?: string | null
          display_order?: number | null
          is_default?: boolean | null
          price_source_mode?:
            | Database["public"]["Enums"]["price_source_mode"]
            | null
        }
        Relationships: []
      }
      published_delivery_options: {
        Row: {
          amount_minor: number | null
          country_code: string | null
          currency: string | null
          customs_copy_i18n: Json | null
          delivery_classes: string[] | null
          estimate_max_days: number | null
          estimate_min_days: number | null
          free_threshold_minor: number | null
          manual_quote: boolean | null
          maximum_subtotal_minor: number | null
          method_code: string | null
          minimum_subtotal_minor: number | null
          name_i18n: Json | null
          rate_priority: number | null
          service_level_i18n: Json | null
          zone_code: string | null
          zone_priority: number | null
        }
        Relationships: []
      }
      published_disclosure_versions: {
        Row: {
          copy_i18n: Json | null
          published_at: string | null
          purpose: string | null
          version_key: string | null
        }
        Insert: {
          copy_i18n?: Json | null
          published_at?: string | null
          purpose?: string | null
          version_key?: string | null
        }
        Update: {
          copy_i18n?: Json | null
          published_at?: string | null
          purpose?: string | null
          version_key?: string | null
        }
        Relationships: []
      }
      published_market_settings: {
        Row: {
          country_code: string | null
          customs_copy_i18n: Json | null
          customs_responsibility: string | null
          default_currency: string | null
          legal_status: string | null
          market_code: string | null
          tax_display_mode:
            | Database["public"]["Enums"]["tax_display_mode"]
            | null
        }
        Insert: {
          country_code?: string | null
          customs_copy_i18n?: Json | null
          customs_responsibility?: string | null
          default_currency?: string | null
          legal_status?: string | null
          market_code?: string | null
          tax_display_mode?:
            | Database["public"]["Enums"]["tax_display_mode"]
            | null
        }
        Update: {
          country_code?: string | null
          customs_copy_i18n?: Json | null
          customs_responsibility?: string | null
          default_currency?: string | null
          legal_status?: string | null
          market_code?: string | null
          tax_display_mode?:
            | Database["public"]["Enums"]["tax_display_mode"]
            | null
        }
        Relationships: [
          {
            foreignKeyName: "market_settings_default_currency_fkey"
            columns: ["default_currency"]
            isOneToOne: false
            referencedRelation: "currency_settings"
            referencedColumns: ["currency"]
          },
          {
            foreignKeyName: "market_settings_default_currency_fkey"
            columns: ["default_currency"]
            isOneToOne: false
            referencedRelation: "published_currency_settings"
            referencedColumns: ["currency"]
          },
        ]
      }
      published_promotions: {
        Row: {
          code: string | null
          combinability: string | null
          currency: string | null
          description_i18n: Json | null
          ends_at: string | null
          fixed_amount_minor: number | null
          id: string | null
          kind: Database["public"]["Enums"]["discount_kind"] | null
          maximum_discount_minor: number | null
          minimum_subtotal_minor: number | null
          percentage_basis_points: number | null
          priority: number | null
          public_name_i18n: Json | null
          stacking_group: string | null
          starts_at: string | null
          usage_limit: number | null
          used_count: number | null
        }
        Insert: {
          code?: string | null
          combinability?: string | null
          currency?: string | null
          description_i18n?: Json | null
          ends_at?: string | null
          fixed_amount_minor?: number | null
          id?: string | null
          kind?: Database["public"]["Enums"]["discount_kind"] | null
          maximum_discount_minor?: number | null
          minimum_subtotal_minor?: number | null
          percentage_basis_points?: number | null
          priority?: number | null
          public_name_i18n?: Json | null
          stacking_group?: string | null
          starts_at?: string | null
          usage_limit?: number | null
          used_count?: number | null
        }
        Update: {
          code?: string | null
          combinability?: string | null
          currency?: string | null
          description_i18n?: Json | null
          ends_at?: string | null
          fixed_amount_minor?: number | null
          id?: string | null
          kind?: Database["public"]["Enums"]["discount_kind"] | null
          maximum_discount_minor?: number | null
          minimum_subtotal_minor?: number | null
          percentage_basis_points?: number | null
          priority?: number | null
          public_name_i18n?: Json | null
          stacking_group?: string | null
          starts_at?: string | null
          usage_limit?: number | null
          used_count?: number | null
        }
        Relationships: []
      }
      staff_catalog_products: {
        Row: {
          archive_reason: string | null
          archived_at: string | null
          available_quantity: number | null
          display_name: string | null
          gel_amount_minor: number | null
          id: string | null
          inventory_version: number | null
          missing_locales: string[] | null
          on_hand_quantity: number | null
          reserved_quantity: number | null
          sku: string | null
          status: Database["public"]["Enums"]["product_status"] | null
          stock_model: Database["public"]["Enums"]["stock_model"] | null
          translation_statuses: Json | null
          updated_at: string | null
          version: number | null
        }
        Relationships: []
      }
      staff_contact_queue: {
        Row: {
          created_at: string | null
          id: string | null
          locale: Database["public"]["Enums"]["app_locale"] | null
          masked_email: string | null
          notification_state: string | null
          order_reference: string | null
          reference: string | null
          status: string | null
          subject_preview: string | null
          updated_at: string | null
          version: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string | null
          locale?: Database["public"]["Enums"]["app_locale"] | null
          masked_email?: never
          notification_state?: string | null
          order_reference?: string | null
          reference?: string | null
          status?: string | null
          subject_preview?: never
          updated_at?: string | null
          version?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string | null
          locale?: Database["public"]["Enums"]["app_locale"] | null
          masked_email?: never
          notification_state?: string | null
          order_reference?: string | null
          reference?: string | null
          status?: string | null
          subject_preview?: never
          updated_at?: string | null
          version?: number | null
        }
        Relationships: []
      }
      staff_content_queue: {
        Row: {
          approved_translation_count: number | null
          content_type: string | null
          entry_key: string | null
          fallback_policy: string | null
          id: string | null
          legal_status: string | null
          publish_at: string | null
          published_at: string | null
          status: string | null
          translation_count: number | null
          unpublish_at: string | null
          updated_at: string | null
          version: number | null
        }
        Relationships: []
      }
      staff_customer_directory: {
        Row: {
          created_at: string | null
          display_name: string | null
          id: string | null
          locale: Database["public"]["Enums"]["app_locale"] | null
          status: Database["public"]["Enums"]["customer_account_status"] | null
          updated_at: string | null
        }
        Relationships: []
      }
      staff_manual_quote_queue: {
        Row: {
          created_at: string | null
          currency: string | null
          destination_country_code: string | null
          expires_at: string | null
          id: string | null
          item_count: number | null
          masked_email: string | null
          quoted_amount_minor: number | null
          quoted_currency: string | null
          reference: string | null
          status: Database["public"]["Enums"]["manual_quote_status"] | null
          updated_at: string | null
          version: number | null
        }
        Insert: {
          created_at?: string | null
          currency?: string | null
          destination_country_code?: string | null
          expires_at?: string | null
          id?: string | null
          item_count?: never
          masked_email?: never
          quoted_amount_minor?: number | null
          quoted_currency?: string | null
          reference?: string | null
          status?: Database["public"]["Enums"]["manual_quote_status"] | null
          updated_at?: string | null
          version?: number | null
        }
        Update: {
          created_at?: string | null
          currency?: string | null
          destination_country_code?: string | null
          expires_at?: string | null
          id?: string | null
          item_count?: never
          masked_email?: never
          quoted_amount_minor?: number | null
          quoted_currency?: string | null
          reference?: string | null
          status?: Database["public"]["Enums"]["manual_quote_status"] | null
          updated_at?: string | null
          version?: number | null
        }
        Relationships: []
      }
      staff_newsletter_queue: {
        Row: {
          id: string | null
          locale: Database["public"]["Enums"]["app_locale"] | null
          masked_email: string | null
          reference: string | null
          status: string | null
          subscribed_at: string | null
          version: number | null
          withdrawn_at: string | null
        }
        Insert: {
          id?: string | null
          locale?: Database["public"]["Enums"]["app_locale"] | null
          masked_email?: never
          reference?: string | null
          status?: string | null
          subscribed_at?: string | null
          version?: number | null
          withdrawn_at?: string | null
        }
        Update: {
          id?: string | null
          locale?: Database["public"]["Enums"]["app_locale"] | null
          masked_email?: never
          reference?: string | null
          status?: string | null
          subscribed_at?: string | null
          version?: number | null
          withdrawn_at?: string | null
        }
        Relationships: []
      }
      staff_order_operations: {
        Row: {
          accepted_at: string | null
          carrier: string | null
          currency: string | null
          delivered_at: string | null
          dispatched_at: string | null
          fulfillment_status: string | null
          id: string | null
          masked_email: string | null
          payment_attempt_status:
            | Database["public"]["Enums"]["payment_status"]
            | null
          payment_method:
            | Database["public"]["Enums"]["payment_method_kind"]
            | null
          payment_status: Database["public"]["Enums"]["payment_status"] | null
          provider: string | null
          provider_reference: string | null
          reference: string | null
          status: Database["public"]["Enums"]["order_status"] | null
          total_minor: number | null
          tracking_reference: string | null
          updated_at: string | null
          version: number | null
        }
        Relationships: []
      }
      staff_order_summaries: {
        Row: {
          accepted_at: string | null
          currency: string | null
          id: string | null
          masked_email: string | null
          payment_status: Database["public"]["Enums"]["payment_status"] | null
          reference: string | null
          status: Database["public"]["Enums"]["order_status"] | null
          total_minor: number | null
          updated_at: string | null
        }
        Insert: {
          accepted_at?: string | null
          currency?: string | null
          id?: string | null
          masked_email?: never
          payment_status?: Database["public"]["Enums"]["payment_status"] | null
          reference?: string | null
          status?: Database["public"]["Enums"]["order_status"] | null
          total_minor?: number | null
          updated_at?: string | null
        }
        Update: {
          accepted_at?: string | null
          currency?: string | null
          id?: string | null
          masked_email?: never
          payment_status?: Database["public"]["Enums"]["payment_status"] | null
          reference?: string | null
          status?: Database["public"]["Enums"]["order_status"] | null
          total_minor?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      staff_return_queue: {
        Row: {
          created_at: string | null
          currency: string | null
          evidence_count: number | null
          expires_at: string | null
          id: string | null
          item_count: number | null
          masked_email: string | null
          order_id: string | null
          order_reference: string | null
          policy_version: string | null
          proposed_refund_minor: number | null
          reason_code: string | null
          reference: string | null
          request_kind:
            | Database["public"]["Enums"]["return_request_kind"]
            | null
          status: Database["public"]["Enums"]["return_request_status"] | null
          updated_at: string | null
          version: number | null
        }
        Relationships: [
          {
            foreignKeyName: "return_requests_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "return_requests_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "staff_order_operations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "return_requests_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "staff_order_summaries"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      accept_guest_order: {
        Args: {
          p_accept_changes: boolean
          p_address: Json
          p_checkout_session_id: string
          p_contact_email: string
          p_contact_phone: string
          p_expected_total_minor: number
          p_guest_proof_hash: string
          p_idempotency_key_hash: string
          p_payment_method: Database["public"]["Enums"]["payment_method_kind"]
          p_request_hash: string
          p_secret_hash: string
          p_terms_version: string
        }
        Returns: {
          accepted_at: string
          bank_transfer_due_at: string | null
          checkout_session_id: string
          contact_email: string
          contact_phone: string | null
          currency: string
          customer_profile_id: string | null
          delivery_minor: number
          discount_minor: number
          guest_proof_expires_at: string | null
          guest_proof_hash: string | null
          guest_session_id: string | null
          id: string
          idempotency_key_hash: string
          locale: Database["public"]["Enums"]["app_locale"]
          payment_method: Database["public"]["Enums"]["payment_method_kind"]
          payment_status: Database["public"]["Enums"]["payment_status"]
          pricing_version: string
          reference: string
          request_hash: string
          status: Database["public"]["Enums"]["order_status"]
          subtotal_minor: number
          tax_minor: number
          terms_version: string
          total_minor: number
          updated_at: string
          version: number
        }
        SetofOptions: {
          from: "*"
          to: "orders"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      add_guest_cart_item: {
        Args: {
          p_product_id: string
          p_quantity?: number
          p_secret_hash: string
        }
        Returns: string
      }
      add_order_note: {
        Args: { p_note: string; p_order_id: string }
        Returns: {
          created_at: string
          created_by: string | null
          id: string
          note: string
          order_id: string
        }
        SetofOptions: {
          from: "*"
          to: "order_internal_notes"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      adjust_catalog_inventory: {
        Args: {
          p_expected_inventory_version: number
          p_idempotency_key: string
          p_product_id: string
          p_quantity_delta: number
          p_reason: string
        }
        Returns: {
          available_quantity: number | null
          created_at: string
          id: string
          low_stock_threshold: number
          on_hand_quantity: number
          product_id: string
          reserved_quantity: number
          stock_model: Database["public"]["Enums"]["stock_model"]
          updated_at: string
          version: number
        }
        SetofOptions: {
          from: "*"
          to: "inventory_items"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      apply_catalog_import: {
        Args: { p_batch_id: string }
        Returns: {
          applied_row_count: number
          completed_at: string | null
          created_at: string
          created_by: string | null
          error_report_path: string | null
          header_mapping: Json
          id: string
          invalid_row_count: number
          original_filename: string
          row_count: number
          safe_error_code: string | null
          source_bucket: string
          source_checksum: string
          source_path: string
          status: Database["public"]["Enums"]["catalog_import_status"]
          updated_at: string
          valid_row_count: number
          version: number
        }
        SetofOptions: {
          from: "*"
          to: "catalog_import_batches"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      apply_guest_cart_discount: {
        Args: { p_code: string; p_secret_hash: string }
        Returns: boolean
      }
      apply_return_restock: {
        Args: { p_idempotency_key: string; p_return_request_id: string }
        Returns: number
      }
      approve_ingestion_media: {
        Args: {
          p_alt_text: string
          p_creator_source: string
          p_expected_asset_version: number
          p_file_id: string
          p_focal_x: number
          p_focal_y: number
          p_ownership_basis: string
        }
        Returns: {
          actual_mime: string
          approval_status: Database["public"]["Enums"]["media_approval_status"]
          byte_size: number
          checksum_sha256: string
          created_at: string
          id: string
          orientation: number
          original_bucket: string
          original_path: string
          pixel_height: number
          pixel_width: number
          protected: boolean
          purpose: string
          recipe_version: number
          updated_at: string
          uploaded_by: string | null
          version: number
        }
        SetofOptions: {
          from: "*"
          to: "media_assets"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      attach_hosted_payment: {
        Args: {
          p_order_id: string
          p_provider: string
          p_provider_reference: string
        }
        Returns: {
          amount_minor: number
          created_at: string
          currency: string
          due_at: string | null
          id: string
          idempotency_key: string
          method: Database["public"]["Enums"]["payment_method_kind"]
          order_id: string
          provider: string
          provider_reference: string | null
          status: Database["public"]["Enums"]["payment_status"]
          updated_at: string
          version: number
        }
        SetofOptions: {
          from: "*"
          to: "payment_attempts"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      attach_return_evidence: {
        Args: {
          p_byte_size: number
          p_checksum: string
          p_content_type: string
          p_guest_proof_hash?: string
          p_original_filename: string
          p_return_request_id: string
          p_storage_path: string
        }
        Returns: {
          attached_at: string | null
          bucket: string
          byte_size: number
          checksum: string
          content_type: string
          created_at: string
          id: string
          original_filename: string
          removed_at: string | null
          retention_until: string
          return_request_id: string
          status: Database["public"]["Enums"]["return_evidence_status"]
          storage_path: string
        }
        SetofOptions: {
          from: "*"
          to: "return_evidence"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      bulk_catalog_action: {
        Args: {
          p_action: string
          p_collection_id?: string
          p_idempotency_key: string
          p_product_ids: string[]
          p_reason: string
        }
        Returns: Json
      }
      cancel_buyer_return_request: {
        Args: {
          p_expected_version: number
          p_guest_proof_hash?: string
          p_idempotency_key: string
          p_reason: string
          p_return_request_id: string
        }
        Returns: {
          buyer_locale: Database["public"]["Enums"]["app_locale"]
          buyer_note: string | null
          closed_at: string | null
          correlation_id: string
          created_at: string
          customer_profile_id: string | null
          decided_at: string | null
          decision_by: string | null
          decision_reason: string | null
          eligibility_snapshot: Json
          expires_at: string
          guest_session_id: string | null
          id: string
          idempotency_key_hash: string
          inspected_at: string | null
          order_id: string
          policy_id: string
          policy_snapshot: Json
          policy_version: string
          reason_code: string
          received_at: string | null
          reference: string
          refunded_at: string | null
          request_kind: Database["public"]["Enums"]["return_request_kind"]
          status: Database["public"]["Enums"]["return_request_status"]
          updated_at: string
          version: number
        }
        SetofOptions: {
          from: "*"
          to: "return_requests"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      cancel_catalog_import: {
        Args: { p_batch_id: string }
        Returns: {
          applied_row_count: number
          completed_at: string | null
          created_at: string
          created_by: string | null
          error_report_path: string | null
          header_mapping: Json
          id: string
          invalid_row_count: number
          original_filename: string
          row_count: number
          safe_error_code: string | null
          source_bucket: string
          source_checksum: string
          source_path: string
          status: Database["public"]["Enums"]["catalog_import_status"]
          updated_at: string
          valid_row_count: number
          version: number
        }
        SetofOptions: {
          from: "*"
          to: "catalog_import_batches"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      cancel_ingestion_batch: {
        Args: { p_batch_id: string }
        Returns: {
          completed_at: string | null
          correlation_id: string
          created_at: string
          created_by: string | null
          duplicate_file_count: number
          expected_file_count: number | null
          failed_file_count: number
          id: string
          product_id: string | null
          ready_file_count: number
          registered_file_count: number
          status: Database["public"]["Enums"]["ingestion_batch_status"]
          title: string
          updated_at: string
          version: number
        }
        SetofOptions: {
          from: "*"
          to: "ingestion_batches"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      catalog_facets: {
        Args: {
          p_collection_slug?: string
          p_currency: unknown
          p_locale: Database["public"]["Enums"]["app_locale"]
        }
        Returns: {
          filter_key: string
          product_count: number
          value: string
        }[]
      }
      checkpoint_ingestion_job: {
        Args: {
          p_extend_seconds?: number
          p_job_id: string
          p_progress_stage: string
          p_worker_id: string
        }
        Returns: boolean
      }
      claim_due_scheduled_actions: {
        Args: {
          p_lease_seconds?: number
          p_limit?: number
          p_worker_id: string
        }
        Returns: {
          action_id: string
          action_type: string
          attempt_number: number
          correlation_id: string
          run_id: string
          scheduled_for: string
          subject_id: string
          subject_type: string
        }[]
      }
      claim_guest_order_for_customer: {
        Args: {
          p_customer_profile_id: string
          p_order_id: string
          p_secret_hash: string
        }
        Returns: boolean
      }
      claim_ingestion_jobs: {
        Args: {
          p_claim_limit?: number
          p_lease_seconds?: number
          p_worker_id: string
        }
        Returns: {
          attempt: number
          completed_at: string | null
          correlation_id: string
          id: string
          job_type: string
          lease_expires_at: string | null
          lease_owner: string | null
          max_attempts: number
          next_attempt_at: string
          progress_stage: string | null
          queued_at: string
          recipe_version: string | null
          safe_error_code: string | null
          safe_error_summary: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["job_status"]
          subject_id: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "media_jobs"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      claim_notification_outbox: {
        Args: {
          p_claim_limit?: number
          p_lease_seconds?: number
          p_worker_id: string
        }
        Returns: {
          attempt_count: number
          available_at: string
          correlation_id: string
          created_at: string
          id: string
          idempotency_key: string
          last_error_code: string | null
          lease_expires_at: string | null
          lease_owner: string | null
          locale: Database["public"]["Enums"]["app_locale"]
          max_attempts: number
          payload: Json
          purpose: string
          recipient_hash: string
          status: Database["public"]["Enums"]["notification_status"]
          template_key: string
          updated_at: string
          version: number
        }[]
        SetofOptions: {
          from: "*"
          to: "notifications"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      claim_provider_events: {
        Args: {
          p_claim_limit?: number
          p_lease_seconds?: number
          p_worker_id: string
        }
        Returns: {
          attempt_count: number
          completed_at: string | null
          correlation_id: string
          event_key: string
          event_type: string
          id: string
          lease_expires_at: string | null
          lease_owner: string | null
          next_attempt_at: string
          payload_hash: string
          provider: string
          received_at: string
          safe_error_code: string | null
          safe_metadata: Json
          signature_valid: boolean
          status: string
          subject_reference: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "provider_event_inbox"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      claim_scheduled_action: {
        Args: {
          p_action_id: string
          p_lease_seconds?: number
          p_worker_id: string
        }
        Returns: {
          action_id: string
          action_type: string
          attempt_number: number
          correlation_id: string
          run_id: string
          scheduled_for: string
          subject_id: string
          subject_type: string
        }[]
      }
      cleanup_abandoned_return_evidence: {
        Args: { p_limit?: number }
        Returns: {
          evidence_id: string
          storage_path: string
        }[]
      }
      close_return_request: {
        Args: {
          p_expected_version: number
          p_idempotency_key: string
          p_reason: string
          p_return_request_id: string
        }
        Returns: {
          buyer_locale: Database["public"]["Enums"]["app_locale"]
          buyer_note: string | null
          closed_at: string | null
          correlation_id: string
          created_at: string
          customer_profile_id: string | null
          decided_at: string | null
          decision_by: string | null
          decision_reason: string | null
          eligibility_snapshot: Json
          expires_at: string
          guest_session_id: string | null
          id: string
          idempotency_key_hash: string
          inspected_at: string | null
          order_id: string
          policy_id: string
          policy_snapshot: Json
          policy_version: string
          reason_code: string
          received_at: string | null
          reference: string
          refunded_at: string | null
          request_kind: Database["public"]["Enums"]["return_request_kind"]
          status: Database["public"]["Enums"]["return_request_status"]
          updated_at: string
          version: number
        }
        SetofOptions: {
          from: "*"
          to: "return_requests"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      complete_ingestion_job: {
        Args: { p_job_id: string; p_worker_id: string }
        Returns: boolean
      }
      complete_ingestion_upload: {
        Args: {
          p_actual_byte_size: number
          p_actual_checksum_sha256: string
          p_actual_mime: string
          p_file_id: string
          p_orientation?: number
          p_pixel_height: number
          p_pixel_width: number
        }
        Returns: {
          actual_byte_size: number | null
          actual_checksum_sha256: string | null
          actual_mime: string | null
          batch_id: string
          client_file_id: string
          created_at: string
          expected_byte_size: number
          expected_checksum_sha256: string | null
          expected_mime: string
          id: string
          media_asset_id: string | null
          orientation: number | null
          original_filename: string
          pixel_height: number | null
          pixel_width: number | null
          processing_completed_at: string | null
          recipe_version: number
          safe_error_code: string | null
          safe_error_summary: string | null
          status: Database["public"]["Enums"]["ingestion_file_status"]
          storage_bucket: string
          storage_path: string
          updated_at: string
          upload_completed_at: string | null
          uploaded_by: string | null
          version: number
        }
        SetofOptions: {
          from: "*"
          to: "ingestion_files"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      complete_notification_attempt: {
        Args: {
          p_notification_id: string
          p_outcome: string
          p_provider: string
          p_provider_reference?: string
          p_safe_error_code?: string
          p_worker_id: string
        }
        Returns: {
          attempt_count: number
          available_at: string
          correlation_id: string
          created_at: string
          id: string
          idempotency_key: string
          last_error_code: string | null
          lease_expires_at: string | null
          lease_owner: string | null
          locale: Database["public"]["Enums"]["app_locale"]
          max_attempts: number
          payload: Json
          purpose: string
          recipient_hash: string
          status: Database["public"]["Enums"]["notification_status"]
          template_key: string
          updated_at: string
          version: number
        }
        SetofOptions: {
          from: "*"
          to: "notifications"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      complete_scheduled_action: {
        Args: {
          p_action_id: string
          p_result_summary?: Json
          p_run_id: string
          p_safe_error_code?: string
          p_success: boolean
          p_worker_id: string
        }
        Returns: {
          action_type: string
          attempt_count: number
          completed_at: string | null
          correlation_id: string
          created_at: string
          due_at: string
          id: string
          idempotency_key: string
          last_run_id: string | null
          lease_expires_at: string | null
          lease_heartbeat_at: string | null
          lease_owner: string | null
          max_attempts: number
          safe_error_code: string | null
          status: Database["public"]["Enums"]["work_status"]
          subject_id: string | null
          subject_type: string
        }
        SetofOptions: {
          from: "*"
          to: "scheduled_actions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      configure_contact_channel: {
        Args: {
          p_channel_id?: string
          p_channel_key?: string
          p_channel_type?: string
          p_configuration_status?: string
          p_enabled?: boolean
          p_expected_version?: number
          p_labels_i18n?: Json
          p_public_value?: string
          p_reason?: string
          p_verified?: boolean
        }
        Returns: {
          channel_key: string
          channel_type: string
          configuration_status: string
          created_at: string
          enabled: boolean
          id: string
          labels_i18n: Json
          public_value: string
          updated_at: string
          updated_by: string | null
          verified_at: string | null
          version: number
        }
        SetofOptions: {
          from: "*"
          to: "contact_channels"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      configure_content_redirect: {
        Args: {
          p_active_from?: string
          p_active_until?: string
          p_destination_path?: string
          p_expected_version?: number
          p_http_status?: number
          p_reason?: string
          p_redirect_id?: string
          p_source_path?: string
          p_status?: string
        }
        Returns: {
          active_from: string
          active_until: string
          created_at: string
          destination_path: string
          http_status: number
          id: string
          source_path: string
          status: string
          updated_at: string
          updated_by: string | null
          version: number
        }
        SetofOptions: {
          from: "*"
          to: "content_redirects"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      configure_currency_setting: {
        Args: {
          p_approved_rate_reference: string
          p_checkout_enabled: boolean
          p_configuration_status: string
          p_currency: unknown
          p_display_order: number
          p_enabled: boolean
          p_expected_version: number
          p_is_default: boolean
          p_price_source_mode: Database["public"]["Enums"]["price_source_mode"]
          p_reason: string
        }
        Returns: {
          approved_rate_reference: string | null
          checkout_enabled: boolean
          configuration_status: string
          created_at: string
          currency: string
          display_order: number
          enabled: boolean
          is_default: boolean
          price_source_mode: Database["public"]["Enums"]["price_source_mode"]
          updated_at: string
          version: number
        }
        SetofOptions: {
          from: "*"
          to: "currency_settings"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      configure_market_setting: {
        Args: {
          p_country_code: string
          p_customs_copy_i18n: Json
          p_customs_responsibility: string
          p_default_currency: unknown
          p_enabled: boolean
          p_expected_version: number
          p_legal_status: string
          p_market_code: string
          p_reason: string
          p_tax_display_mode: Database["public"]["Enums"]["tax_display_mode"]
          p_tax_registration_reference: string
        }
        Returns: {
          country_code: string
          created_at: string
          customs_copy_i18n: Json
          customs_responsibility: string
          default_currency: string
          enabled: boolean
          id: string
          legal_status: string
          market_code: string
          tax_display_mode: Database["public"]["Enums"]["tax_display_mode"]
          tax_registration_reference: string | null
          updated_at: string
          version: number
        }
        SetofOptions: {
          from: "*"
          to: "market_settings"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      configure_promotion: {
        Args: {
          p_code?: string
          p_combinability?: string
          p_configuration_status?: string
          p_currency?: unknown
          p_description_i18n?: Json
          p_discount_id?: string
          p_ends_at?: string
          p_expected_version?: number
          p_fixed_amount_minor?: number
          p_kind?: Database["public"]["Enums"]["discount_kind"]
          p_maximum_discount_minor?: number
          p_minimum_subtotal_minor?: number
          p_per_subject_limit?: number
          p_percentage_basis_points?: number
          p_priority?: number
          p_public_name_i18n?: Json
          p_reason?: string
          p_stacking_group?: string
          p_starts_at?: string
          p_usage_limit?: number
        }
        Returns: {
          code: string
          combinability: string
          configuration_status: string
          created_at: string
          currency: string | null
          description_i18n: Json | null
          enabled: boolean
          ends_at: string
          fixed_amount_minor: number | null
          id: string
          kind: Database["public"]["Enums"]["discount_kind"]
          maximum_discount_minor: number | null
          minimum_subtotal_minor: number
          per_subject_limit: number
          percentage_basis_points: number | null
          priority: number
          public_name_i18n: Json | null
          stacking_group: string | null
          starts_at: string
          updated_at: string
          usage_limit: number | null
          used_count: number
          version: number
        }
        SetofOptions: {
          from: "*"
          to: "discounts"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      configure_return_policy: {
        Args: {
          p_allowed_reasons: string[]
          p_cancellation_window_hours: number
          p_max_evidence_bytes: number
          p_max_evidence_files: number
          p_restock_mode: string
          p_return_window_days: number
          p_version: string
        }
        Returns: {
          active: boolean
          allowed_evidence_types: string[]
          allowed_reasons: string[]
          buyer_copy: Json
          cancellation_window_hours: number
          created_at: string
          created_by: string | null
          effective_at: string | null
          id: string
          legal_status: Database["public"]["Enums"]["return_legal_status"]
          max_evidence_bytes: number
          max_evidence_files: number
          restock_mode: string
          return_window_days: number
          updated_at: string
          version: string
          version_number: number
        }
        SetofOptions: {
          from: "*"
          to: "return_policies"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      configure_shipping_method: {
        Args: {
          p_code?: string
          p_configuration_status?: string
          p_customs_copy_i18n?: Json
          p_estimate_max_days?: number
          p_estimate_min_days?: number
          p_expected_version?: number
          p_manual_quote?: boolean
          p_method_id?: string
          p_name_i18n?: Json
          p_reason?: string
          p_service_level_i18n?: Json
        }
        Returns: {
          code: string
          configuration_status: string
          created_at: string
          customs_copy_i18n: Json | null
          enabled: boolean
          estimate_max_days: number | null
          estimate_min_days: number | null
          id: string
          manual_quote: boolean
          name_i18n: Json
          service_level_i18n: Json | null
          updated_at: string
          version: number
        }
        SetofOptions: {
          from: "*"
          to: "shipping_methods"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      configure_shipping_rate: {
        Args: {
          p_amount_minor?: number
          p_currency?: unknown
          p_delivery_classes?: string[]
          p_enabled?: boolean
          p_ends_at?: string
          p_expected_version?: number
          p_free_threshold_minor?: number
          p_maximum_subtotal_minor?: number
          p_method_id?: string
          p_minimum_subtotal_minor?: number
          p_priority?: number
          p_rate_id?: string
          p_reason?: string
          p_starts_at?: string
          p_zone_id?: string
        }
        Returns: {
          amount_minor: number
          currency: string
          delivery_classes: string[]
          enabled: boolean
          ends_at: string
          free_threshold_minor: number | null
          id: string
          maximum_subtotal_minor: number | null
          method_id: string
          minimum_subtotal_minor: number
          priority: number
          starts_at: string
          version: number
          zone_id: string
        }
        SetofOptions: {
          from: "*"
          to: "shipping_rate_rules"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      configure_shipping_zone: {
        Args: {
          p_code?: string
          p_configuration_status?: string
          p_country_codes?: string[]
          p_expected_version?: number
          p_legal_status?: string
          p_name?: string
          p_priority?: number
          p_reason?: string
          p_zone_id?: string
        }
        Returns: {
          code: string
          configuration_status: string
          created_at: string
          enabled: boolean
          id: string
          legal_status: string
          name: string
          priority: number
          updated_at: string
          version: number
        }
        SetofOptions: {
          from: "*"
          to: "shipping_zones"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      consume_rate_limit: {
        Args: {
          p_operation_scope: string
          p_request_limit: number
          p_subject_hash: string
          p_window_seconds: number
        }
        Returns: {
          allowed: boolean
          remaining: number
          retry_after_seconds: number
        }[]
      }
      convert_order_reservations: {
        Args: { p_order_id: string }
        Returns: boolean
      }
      create_content_preview_token: {
        Args: {
          p_content_entry_id: string
          p_token_hash: string
          p_ttl_minutes?: number
        }
        Returns: {
          content_entry_id: string
          created_at: string
          created_by: string
          expires_at: string
          id: string
          revoked_at: string | null
          token_hash: string
        }
        SetofOptions: {
          from: "*"
          to: "content_preview_tokens"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_guest_context: {
        Args: {
          p_currency: unknown
          p_locale: Database["public"]["Enums"]["app_locale"]
          p_secret_hash: string
          p_ttl?: string
        }
        Returns: {
          cart_id: string
          expires_at: string
          guest_session_id: string
        }[]
      }
      create_ingestion_batch: {
        Args: {
          p_correlation_id?: string
          p_expected_file_count?: number
          p_product_id?: string
          p_title: string
        }
        Returns: {
          completed_at: string | null
          correlation_id: string
          created_at: string
          created_by: string | null
          duplicate_file_count: number
          expected_file_count: number | null
          failed_file_count: number
          id: string
          product_id: string | null
          ready_file_count: number
          registered_file_count: number
          status: Database["public"]["Enums"]["ingestion_batch_status"]
          title: string
          updated_at: string
          version: number
        }
        SetofOptions: {
          from: "*"
          to: "ingestion_batches"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_shipment: {
        Args: {
          p_carrier: string
          p_expected_version: number
          p_idempotency_key: string
          p_order_id: string
          p_service_level: string
          p_tracking_reference: string
          p_tracking_url: string
        }
        Returns: {
          carrier: string
          created_at: string
          created_by: string | null
          delivered_at: string | null
          dispatched_at: string | null
          id: string
          order_id: string
          service_level: string | null
          status: string
          tracking_reference: string
          tracking_url: string | null
          updated_at: string
          version: number
        }
        SetofOptions: {
          from: "*"
          to: "fulfillments"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      decide_return_request: {
        Args: {
          p_approve: boolean
          p_expected_version: number
          p_idempotency_key: string
          p_reason: string
          p_return_request_id: string
        }
        Returns: {
          buyer_locale: Database["public"]["Enums"]["app_locale"]
          buyer_note: string | null
          closed_at: string | null
          correlation_id: string
          created_at: string
          customer_profile_id: string | null
          decided_at: string | null
          decision_by: string | null
          decision_reason: string | null
          eligibility_snapshot: Json
          expires_at: string
          guest_session_id: string | null
          id: string
          idempotency_key_hash: string
          inspected_at: string | null
          order_id: string
          policy_id: string
          policy_snapshot: Json
          policy_version: string
          reason_code: string
          received_at: string | null
          reference: string
          refunded_at: string | null
          request_kind: Database["public"]["Enums"]["return_request_kind"]
          status: Database["public"]["Enums"]["return_request_status"]
          updated_at: string
          version: number
        }
        SetofOptions: {
          from: "*"
          to: "return_requests"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      delete_customer_address: {
        Args: { p_address_id: string; p_expected_version: number }
        Returns: boolean
      }
      enqueue_scheduled_catch_up: {
        Args: {
          p_action_type: string
          p_correlation_id: string
          p_idempotency_key: string
          p_scheduled_for: string
          p_subject_type: string
        }
        Returns: {
          action_type: string
          attempt_count: number
          completed_at: string | null
          correlation_id: string
          created_at: string
          due_at: string
          id: string
          idempotency_key: string
          last_run_id: string | null
          lease_expires_at: string | null
          lease_heartbeat_at: string | null
          lease_owner: string | null
          max_attempts: number
          safe_error_code: string | null
          status: Database["public"]["Enums"]["work_status"]
          subject_id: string | null
          subject_type: string
        }
        SetofOptions: {
          from: "*"
          to: "scheduled_actions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      ensure_guest_wishlist: {
        Args: { p_secret_hash: string }
        Returns: string
      }
      evaluate_product_readiness: {
        Args: { p_product_id: string }
        Returns: Json
      }
      evaluate_return_eligibility: {
        Args: {
          p_order_id: string
          p_request_kind: Database["public"]["Enums"]["return_request_kind"]
        }
        Returns: Json
      }
      expire_due_checkout_work: { Args: { p_limit?: number }; Returns: number }
      expire_manual_quotes: { Args: { p_limit?: number }; Returns: number }
      fail_ingestion_job: {
        Args: {
          p_job_id: string
          p_safe_error_code: string
          p_safe_error_summary: string
          p_worker_id: string
        }
        Returns: Database["public"]["Enums"]["job_status"]
      }
      fail_provider_event: {
        Args: {
          p_provider_event_id: string
          p_safe_error_code: string
          p_worker_id: string
        }
        Returns: {
          attempt_count: number
          completed_at: string | null
          correlation_id: string
          event_key: string
          event_type: string
          id: string
          lease_expires_at: string | null
          lease_owner: string | null
          next_attempt_at: string
          payload_hash: string
          provider: string
          received_at: string
          safe_error_code: string | null
          safe_metadata: Json
          signature_valid: boolean
          status: string
          subject_reference: string | null
        }
        SetofOptions: {
          from: "*"
          to: "provider_event_inbox"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      has_auth_assurance: { Args: { required_aal: string }; Returns: boolean }
      heartbeat_scheduled_action: {
        Args: {
          p_action_id: string
          p_extend_seconds?: number
          p_run_id: string
          p_worker_id: string
        }
        Returns: boolean
      }
      initialize_customer_profile: {
        Args: {
          p_currency?: unknown
          p_display_name?: string
          p_locale?: Database["public"]["Enums"]["app_locale"]
        }
        Returns: {
          created_at: string
          display_currency: string
          display_name: string | null
          id: string
          locale: Database["public"]["Enums"]["app_locale"]
          marketing_status: Database["public"]["Enums"]["consent_choice"] | null
          profile_kind: Database["public"]["Enums"]["profile_kind"]
          updated_at: string
          version: number
        }
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      inspect_return_request: {
        Args: {
          p_expected_version: number
          p_idempotency_key: string
          p_items: Json
          p_package_condition: string
          p_return_request_id: string
          p_summary: string
        }
        Returns: {
          buyer_locale: Database["public"]["Enums"]["app_locale"]
          buyer_note: string | null
          closed_at: string | null
          correlation_id: string
          created_at: string
          customer_profile_id: string | null
          decided_at: string | null
          decision_by: string | null
          decision_reason: string | null
          eligibility_snapshot: Json
          expires_at: string
          guest_session_id: string | null
          id: string
          idempotency_key_hash: string
          inspected_at: string | null
          order_id: string
          policy_id: string
          policy_snapshot: Json
          policy_version: string
          reason_code: string
          received_at: string | null
          reference: string
          refunded_at: string | null
          request_kind: Database["public"]["Enums"]["return_request_kind"]
          status: Database["public"]["Enums"]["return_request_status"]
          updated_at: string
          version: number
        }
        SetofOptions: {
          from: "*"
          to: "return_requests"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      is_active_staff: {
        Args: { required_role?: Database["public"]["Enums"]["staff_role"] }
        Returns: boolean
      }
      issue_refund: {
        Args: {
          p_amount_minor: number
          p_idempotency_key: string
          p_order_id: string
          p_provider_reference: string
          p_reason: string
        }
        Returns: {
          amount_minor: number
          correlation_id: string
          currency: string
          id: string
          idempotency_key: string
          order_id: string
          payment_attempt_id: string
          processed_at: string | null
          processed_by: string | null
          provider_reference: string | null
          reason: string
          requested_at: string
          requested_by: string | null
          safe_error_code: string | null
          status: string
          version: number
        }
        SetofOptions: {
          from: "*"
          to: "refund_records"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      list_staff_catalog_products: {
        Args: {
          p_page?: number
          p_page_size?: number
          p_query?: string
          p_sort?: string
          p_status?: string
          p_stock?: string
          p_translation?: string
        }
        Returns: Json
      }
      manage_staff_member: {
        Args: {
          p_active: boolean
          p_expected_version: number
          p_profile_id: string
          p_reason: string
          p_role: Database["public"]["Enums"]["staff_role"]
        }
        Returns: {
          activated_at: string | null
          active: boolean
          created_at: string
          deactivated_at: string | null
          deactivation_reason: string | null
          invited_by: string | null
          mfa_required: boolean
          profile_id: string
          role: Database["public"]["Enums"]["staff_role"]
          role_changed_at: string | null
          role_changed_by: string | null
          updated_at: string
          version: number
        }
        SetofOptions: {
          from: "*"
          to: "staff_members"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      mark_contact_notification_failed: {
        Args: { p_contact_submission_id: string; p_safe_error_code: string }
        Returns: {
          channel_key: string | null
          contact_email: string
          correlation_id: string
          created_at: string
          disclosure_version: string
          full_name: string
          guest_proof_hash: string | null
          guest_subject_hash: string
          id: string
          idempotency_key_hash: string
          locale: Database["public"]["Enums"]["app_locale"]
          message: string
          message_fingerprint: string
          notification_state: string
          order_reference: string | null
          profile_id: string | null
          reference: string
          retention_due_at: string
          status: string
          subject: string
          updated_at: string
          version: number
        }
        SetofOptions: {
          from: "*"
          to: "contact_submissions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      mark_ingestion_uploading: {
        Args: { p_file_id: string }
        Returns: {
          actual_byte_size: number | null
          actual_checksum_sha256: string | null
          actual_mime: string | null
          batch_id: string
          client_file_id: string
          created_at: string
          expected_byte_size: number
          expected_checksum_sha256: string | null
          expected_mime: string
          id: string
          media_asset_id: string | null
          orientation: number | null
          original_filename: string
          pixel_height: number | null
          pixel_width: number | null
          processing_completed_at: string | null
          recipe_version: number
          safe_error_code: string | null
          safe_error_summary: string | null
          status: Database["public"]["Enums"]["ingestion_file_status"]
          storage_bucket: string
          storage_path: string
          updated_at: string
          upload_completed_at: string | null
          uploaded_by: string | null
          version: number
        }
        SetofOptions: {
          from: "*"
          to: "ingestion_files"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      mark_return_in_transit: {
        Args: {
          p_expected_version: number
          p_idempotency_key: string
          p_note: string
          p_return_request_id: string
        }
        Returns: {
          buyer_locale: Database["public"]["Enums"]["app_locale"]
          buyer_note: string | null
          closed_at: string | null
          correlation_id: string
          created_at: string
          customer_profile_id: string | null
          decided_at: string | null
          decision_by: string | null
          decision_reason: string | null
          eligibility_snapshot: Json
          expires_at: string
          guest_session_id: string | null
          id: string
          idempotency_key_hash: string
          inspected_at: string | null
          order_id: string
          policy_id: string
          policy_snapshot: Json
          policy_version: string
          reason_code: string
          received_at: string | null
          reference: string
          refunded_at: string | null
          request_kind: Database["public"]["Enums"]["return_request_kind"]
          status: Database["public"]["Enums"]["return_request_status"]
          updated_at: string
          version: number
        }
        SetofOptions: {
          from: "*"
          to: "return_requests"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      merge_customer_guest_data: {
        Args: {
          p_customer_profile_id: string
          p_idempotency_key_hash: string
          p_new_secret_hash: string
          p_secret_hash: string
        }
        Returns: Json
      }
      merge_visitor_consent: {
        Args: { p_guest_subject_hash: string; p_profile_id: string }
        Returns: number
      }
      process_due_catalog_publications: {
        Args: { p_limit?: number }
        Returns: Json
      }
      process_return_refund: {
        Args: {
          p_expected_version: number
          p_idempotency_key: string
          p_provider_reference: string
          p_reason: string
          p_return_request_id: string
        }
        Returns: {
          buyer_locale: Database["public"]["Enums"]["app_locale"]
          buyer_note: string | null
          closed_at: string | null
          correlation_id: string
          created_at: string
          customer_profile_id: string | null
          decided_at: string | null
          decision_by: string | null
          decision_reason: string | null
          eligibility_snapshot: Json
          expires_at: string
          guest_session_id: string | null
          id: string
          idempotency_key_hash: string
          inspected_at: string | null
          order_id: string
          policy_id: string
          policy_snapshot: Json
          policy_version: string
          reason_code: string
          received_at: string | null
          reference: string
          refunded_at: string | null
          request_kind: Database["public"]["Enums"]["return_request_kind"]
          status: Database["public"]["Enums"]["return_request_status"]
          updated_at: string
          version: number
        }
        SetofOptions: {
          from: "*"
          to: "return_requests"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      publish_content_menu: {
        Args: {
          p_expected_version: number
          p_items: Json
          p_menu_key: string
          p_reason: string
          p_status: string
        }
        Returns: {
          created_at: string
          id: string
          menu_key: string
          published_at: string | null
          status: string
          updated_at: string
          updated_by: string | null
          version: number
        }
        SetofOptions: {
          from: "*"
          to: "content_menus"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      publish_disclosure_version: {
        Args: {
          p_copy_i18n: Json
          p_purpose: string
          p_reason: string
          p_version_key: string
        }
        Returns: {
          copy_i18n: Json
          created_at: string
          created_by: string | null
          id: string
          published_at: string | null
          purpose: string
          retired_at: string | null
          status: string
          version_key: string
        }
        SetofOptions: {
          from: "*"
          to: "disclosure_versions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      publish_product: {
        Args: {
          p_confirm: boolean
          p_expected_version: number
          p_product_id: string
        }
        Returns: {
          age_max_year: number | null
          age_min_year: number | null
          age_verified: boolean
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          care_code: string | null
          category: string | null
          colors: string[]
          condition: string | null
          construction: string | null
          created_at: string
          created_by: string | null
          delivery_class: string | null
          diameter_mm: number | null
          entered_length: number | null
          entered_unit: string | null
          entered_width: number | null
          handmade: boolean | null
          handmade_verified: boolean
          id: string
          length_mm: number | null
          materials: string[]
          origin: string | null
          origin_verified: boolean
          pile: string | null
          pile_verified: boolean
          primary_media_asset_id: string | null
          provenance_summary: string | null
          provenance_verified: boolean
          published_at: string | null
          published_by: string | null
          readiness_passed: boolean
          readiness_version: number
          reviewed_by: string | null
          scheduled_at: string | null
          search_visible: boolean
          shape: string | null
          sku: string
          status: Database["public"]["Enums"]["product_status"]
          structured_data_eligible: boolean
          styles: string[]
          unpublished_at: string | null
          updated_at: string
          updated_by: string | null
          version: number
          width_mm: number | null
        }
        SetofOptions: {
          from: "*"
          to: "products"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      quote_guest_cart: {
        Args: {
          p_country_code: string
          p_method_code?: string
          p_secret_hash: string
        }
        Returns: {
          breakdown: Json
          cart_id: string
          cart_version: number
          country_code: string
          created_at: string
          currency: string
          delivery_minor: number
          discount_minor: number
          expires_at: string
          id: string
          manual_quote: boolean
          method_id: string | null
          pricing_version: string
          subtotal_minor: number
          tax_minor: number
          total_minor: number
        }
        SetofOptions: {
          from: "*"
          to: "delivery_quotes"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      quote_guest_cart_v1: {
        Args: {
          p_country_code: string
          p_method_code?: string
          p_secret_hash: string
        }
        Returns: {
          breakdown: Json
          cart_id: string
          cart_version: number
          country_code: string
          created_at: string
          currency: string
          delivery_minor: number
          discount_minor: number
          expires_at: string
          id: string
          manual_quote: boolean
          method_id: string | null
          pricing_version: string
          subtotal_minor: number
          tax_minor: number
          total_minor: number
        }
        SetofOptions: {
          from: "*"
          to: "delivery_quotes"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      read_contact_message_status: {
        Args: { p_guest_proof_hash: string; p_reference: string }
        Returns: Json
      }
      read_content_preview: {
        Args: {
          p_locale: Database["public"]["Enums"]["app_locale"]
          p_token_hash: string
        }
        Returns: Json
      }
      read_guest_cart: { Args: { p_secret_hash: string }; Returns: Json }
      read_guest_wishlist: { Args: { p_secret_hash: string }; Returns: Json }
      read_manual_quote: {
        Args: { p_proof_hash?: string; p_reference: string }
        Returns: Json
      }
      read_operational_report: {
        Args: { p_currency: unknown; p_from: string; p_to: string }
        Returns: Json
      }
      read_order_operations_summary: { Args: never; Returns: Json }
      read_published_content: {
        Args: {
          p_entry_key: string
          p_locale: Database["public"]["Enums"]["app_locale"]
        }
        Returns: Json
      }
      read_published_disclosures: {
        Args: { p_locale: Database["public"]["Enums"]["app_locale"] }
        Returns: Json
      }
      read_visitor_consent: {
        Args: { p_guest_subject_hash: string }
        Returns: Json
      }
      reconcile_payment: {
        Args: {
          p_amount_minor: number
          p_currency: string
          p_order_id: string
          p_provider_event_inbox_id?: string
          p_provider_event_key: string
          p_provider_reference?: string
          p_target_status: Database["public"]["Enums"]["payment_status"]
        }
        Returns: {
          accepted_at: string
          bank_transfer_due_at: string | null
          checkout_session_id: string
          contact_email: string
          contact_phone: string | null
          currency: string
          customer_profile_id: string | null
          delivery_minor: number
          discount_minor: number
          guest_proof_expires_at: string | null
          guest_proof_hash: string | null
          guest_session_id: string | null
          id: string
          idempotency_key_hash: string
          locale: Database["public"]["Enums"]["app_locale"]
          payment_method: Database["public"]["Enums"]["payment_method_kind"]
          payment_status: Database["public"]["Enums"]["payment_status"]
          pricing_version: string
          reference: string
          request_hash: string
          status: Database["public"]["Enums"]["order_status"]
          subtotal_minor: number
          tax_minor: number
          terms_version: string
          total_minor: number
          updated_at: string
          version: number
        }
        SetofOptions: {
          from: "*"
          to: "orders"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      record_current_session: {
        Args: {
          p_assurance_level: string
          p_auth_session_id: string
          p_device_label?: string
          p_expires_at: string
          p_ip_prefix_hash: string
          p_user_agent_summary: string
        }
        Returns: {
          assurance_level: string
          auth_session_id: string
          created_at: string
          device_label: string | null
          expires_at: string
          id: string
          ip_prefix_hash: string | null
          last_seen_at: string
          profile_id: string
          revoked_at: string | null
          revoked_by: string | null
          revoked_reason: string | null
          user_agent_summary: string | null
        }
        SetofOptions: {
          from: "*"
          to: "app_sessions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      record_delivery_event: {
        Args: {
          p_event_key: string
          p_fulfillment_id: string
          p_safe_location?: string
        }
        Returns: {
          carrier: string
          created_at: string
          created_by: string | null
          delivered_at: string | null
          dispatched_at: string | null
          id: string
          order_id: string
          service_level: string | null
          status: string
          tracking_reference: string
          tracking_url: string | null
          updated_at: string
          version: number
        }
        SetofOptions: {
          from: "*"
          to: "fulfillments"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      record_health_snapshot: {
        Args: {
          p_checks: Json
          p_correlation_id: string
          p_environment: string
          p_overall: string
          p_release: string
        }
        Returns: {
          checks: Json
          correlation_id: string
          environment: string
          id: number
          overall: string
          recorded_at: string
          release: string
        }
        SetofOptions: {
          from: "*"
          to: "health_snapshots"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      record_notification_delivery: {
        Args: {
          p_event_key: string
          p_outcome: string
          p_payload_hash: string
          p_provider: string
          p_provider_reference: string
        }
        Returns: {
          attempt_count: number
          available_at: string
          correlation_id: string
          created_at: string
          id: string
          idempotency_key: string
          last_error_code: string | null
          lease_expires_at: string | null
          lease_owner: string | null
          locale: Database["public"]["Enums"]["app_locale"]
          max_attempts: number
          payload: Json
          purpose: string
          recipient_hash: string
          status: Database["public"]["Enums"]["notification_status"]
          template_key: string
          updated_at: string
          version: number
        }
        SetofOptions: {
          from: "*"
          to: "notifications"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      record_operational_alert: {
        Args: {
          p_category: string
          p_correlation_id?: string
          p_fingerprint: string
          p_safe_context?: Json
          p_safe_summary: string
          p_severity: string
        }
        Returns: {
          acknowledged_by: string | null
          category: string
          correlation_id: string | null
          fingerprint: string
          first_seen_at: string
          id: string
          last_seen_at: string
          occurrence_count: number
          order_id: string | null
          payment_attempt_id: string | null
          refund_record_id: string | null
          resolved_at: string | null
          return_request_id: string | null
          safe_summary: string
          severity: string
          status: string
        }
        SetofOptions: {
          from: "*"
          to: "operational_alerts"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      record_protected_operation: {
        Args: {
          p_confirmation: string
          p_entity_id: string
          p_entity_type: string
          p_operation_type: string
          p_reason: string
        }
        Returns: {
          actor_profile_id: string
          assurance_level: string
          completed_at: string
          correlation_id: string
          entity_id: string
          entity_type: string
          exact_confirmation: string
          id: string
          impact_summary: string
          operation_type: string
          reason: string
        }
        SetofOptions: {
          from: "*"
          to: "protected_operations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      record_provider_event: {
        Args: {
          p_event_key: string
          p_event_type: string
          p_payload_hash: string
          p_provider: string
          p_safe_metadata?: Json
          p_signature_valid: boolean
          p_subject_reference: string
        }
        Returns: {
          attempt_count: number
          completed_at: string | null
          correlation_id: string
          event_key: string
          event_type: string
          id: string
          lease_expires_at: string | null
          lease_owner: string | null
          next_attempt_at: string
          payload_hash: string
          provider: string
          received_at: string
          safe_error_code: string | null
          safe_metadata: Json
          signature_valid: boolean
          status: string
          subject_reference: string | null
        }
        SetofOptions: {
          from: "*"
          to: "provider_event_inbox"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      record_readiness_assessment: {
        Args: {
          p_blockers: string[]
          p_correlation_id: string
          p_decision: string
          p_environment: string
          p_gates: Json
          p_release_record_id: string
          p_stage: string
        }
        Returns: {
          blockers: string[]
          correlation_id: string
          decision: string
          environment: string
          evaluated_at: string
          gates: Json
          id: string
          release_record_id: string | null
          stage: string
        }
        SetofOptions: {
          from: "*"
          to: "readiness_assessments"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      record_return_receipt: {
        Args: {
          p_expected_version: number
          p_idempotency_key: string
          p_note: string
          p_return_request_id: string
        }
        Returns: {
          buyer_locale: Database["public"]["Enums"]["app_locale"]
          buyer_note: string | null
          closed_at: string | null
          correlation_id: string
          created_at: string
          customer_profile_id: string | null
          decided_at: string | null
          decision_by: string | null
          decision_reason: string | null
          eligibility_snapshot: Json
          expires_at: string
          guest_session_id: string | null
          id: string
          idempotency_key_hash: string
          inspected_at: string | null
          order_id: string
          policy_id: string
          policy_snapshot: Json
          policy_version: string
          reason_code: string
          received_at: string | null
          reference: string
          refunded_at: string | null
          request_kind: Database["public"]["Enums"]["return_request_kind"]
          status: Database["public"]["Enums"]["return_request_status"]
          updated_at: string
          version: number
        }
        SetofOptions: {
          from: "*"
          to: "return_requests"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      record_visitor_consent: {
        Args: {
          p_choices: Json
          p_disclosure_versions: Json
          p_guest_subject_hash: string
          p_locale: Database["public"]["Enums"]["app_locale"]
          p_preference_metadata?: Json
          p_source?: string
        }
        Returns: Json
      }
      recover_stale_ingestion_jobs: {
        Args: { p_limit?: number }
        Returns: number
      }
      register_ingestion_file: {
        Args: {
          p_batch_id: string
          p_client_file_id: string
          p_expected_byte_size: number
          p_expected_checksum_sha256?: string
          p_expected_mime: string
          p_original_filename: string
          p_recipe_version?: number
        }
        Returns: {
          actual_byte_size: number | null
          actual_checksum_sha256: string | null
          actual_mime: string | null
          batch_id: string
          client_file_id: string
          created_at: string
          expected_byte_size: number
          expected_checksum_sha256: string | null
          expected_mime: string
          id: string
          media_asset_id: string | null
          orientation: number | null
          original_filename: string
          pixel_height: number | null
          pixel_width: number | null
          processing_completed_at: string | null
          recipe_version: number
          safe_error_code: string | null
          safe_error_summary: string | null
          status: Database["public"]["Enums"]["ingestion_file_status"]
          storage_bucket: string
          storage_path: string
          updated_at: string
          upload_completed_at: string | null
          uploaded_by: string | null
          version: number
        }
        SetofOptions: {
          from: "*"
          to: "ingestion_files"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      release_checkout_session: {
        Args: {
          p_checkout_session_id: string
          p_expired?: boolean
          p_reason?: string
        }
        Returns: boolean
      }
      release_order_reservations: {
        Args: { p_expired?: boolean; p_order_id: string; p_reason?: string }
        Returns: boolean
      }
      remove_return_evidence: {
        Args: { p_evidence_id: string; p_guest_proof_hash?: string }
        Returns: {
          attached_at: string | null
          bucket: string
          byte_size: number
          checksum: string
          content_type: string
          created_at: string
          id: string
          original_filename: string
          removed_at: string | null
          retention_until: string
          return_request_id: string
          status: Database["public"]["Enums"]["return_evidence_status"]
          storage_path: string
        }
        SetofOptions: {
          from: "*"
          to: "return_evidence"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      reorder_catalog_collection: {
        Args: {
          p_collection_id: string
          p_expected_version: number
          p_featured_product_id?: string
          p_ordered_product_ids: string[]
        }
        Returns: {
          archive_reason: string | null
          archived_by: string | null
          code: string
          collection_type: string
          created_at: string
          hero_media_asset_id: string | null
          id: string
          order_strategy: string
          published_at: string | null
          scheduled_at: string | null
          status: Database["public"]["Enums"]["collection_status"]
          updated_at: string
          version: number
        }
        SetofOptions: {
          from: "*"
          to: "collections"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      request_audit_export: {
        Args: { p_download_name: string; p_scope: Json }
        Returns: {
          available_at: string
          completed_at: string | null
          correlation_id: string
          created_at: string
          download_name: string | null
          expires_at: string | null
          export_format: string
          export_type: string
          id: string
          lease_expires_at: string | null
          lease_owner: string | null
          object_path: string | null
          requested_by: string
          row_count: number | null
          safe_error_code: string | null
          scope: Json
          status: Database["public"]["Enums"]["work_status"]
        }
        SetofOptions: {
          from: "*"
          to: "export_jobs"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      request_catalog_export: {
        Args: { p_download_name: string; p_scope: Json }
        Returns: {
          available_at: string
          completed_at: string | null
          correlation_id: string
          created_at: string
          download_name: string | null
          expires_at: string | null
          export_format: string
          export_type: string
          id: string
          lease_expires_at: string | null
          lease_owner: string | null
          object_path: string | null
          requested_by: string
          row_count: number | null
          safe_error_code: string | null
          scope: Json
          status: Database["public"]["Enums"]["work_status"]
        }
        SetofOptions: {
          from: "*"
          to: "export_jobs"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      request_customer_privacy: {
        Args: {
          p_reason: string
          p_request_type: Database["public"]["Enums"]["privacy_request_type"]
        }
        Returns: {
          completed_at: string | null
          correlation_id: string
          created_at: string
          id: string
          reason: string
          request_type: Database["public"]["Enums"]["privacy_request_type"]
          requested_by: string
          safe_result_code: string | null
          status: Database["public"]["Enums"]["privacy_request_status"]
          subject_profile_id: string
          updated_at: string
          verified_at: string | null
          version: number
        }
        SetofOptions: {
          from: "*"
          to: "privacy_requests"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      request_manual_quote_information: {
        Args: {
          p_buyer_message: string
          p_expected_version: number
          p_idempotency_key_hash: string
          p_quote_id: string
        }
        Returns: {
          address: Json
          buyer_message: string | null
          buyer_note: string | null
          cart_id: string | null
          cart_snapshot: Json
          contact_email: string
          contact_phone: string | null
          correlation_id: string
          created_at: string
          currency: string
          customer_profile_id: string | null
          customs_snapshot: Json | null
          destination_country_code: string
          estimate_max_days: number | null
          estimate_min_days: number | null
          expires_at: string | null
          guest_proof_hash: string | null
          guest_session_id: string | null
          id: string
          idempotency_key_hash: string
          locale: Database["public"]["Enums"]["app_locale"]
          quoted_amount_minor: number | null
          quoted_at: string | null
          quoted_by: string | null
          quoted_currency: string | null
          quoted_method_i18n: Json | null
          reference: string
          staff_note: string | null
          status: Database["public"]["Enums"]["manual_quote_status"]
          updated_at: string
          version: number
        }
        SetofOptions: {
          from: "*"
          to: "manual_quote_requests"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      request_operational_report_export: {
        Args: { p_currency: unknown; p_from: string; p_to: string }
        Returns: {
          available_at: string
          completed_at: string | null
          correlation_id: string
          created_at: string
          download_name: string | null
          expires_at: string | null
          export_format: string
          export_type: string
          id: string
          lease_expires_at: string | null
          lease_owner: string | null
          object_path: string | null
          requested_by: string
          row_count: number | null
          safe_error_code: string | null
          scope: Json
          status: Database["public"]["Enums"]["work_status"]
        }
        SetofOptions: {
          from: "*"
          to: "export_jobs"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      request_privacy_operation: {
        Args: {
          p_reason: string
          p_request_type: Database["public"]["Enums"]["privacy_request_type"]
          p_subject_profile_id: string
        }
        Returns: {
          completed_at: string | null
          correlation_id: string
          created_at: string
          id: string
          reason: string
          request_type: Database["public"]["Enums"]["privacy_request_type"]
          requested_by: string
          safe_result_code: string | null
          status: Database["public"]["Enums"]["privacy_request_status"]
          subject_profile_id: string
          updated_at: string
          verified_at: string | null
          version: number
        }
        SetofOptions: {
          from: "*"
          to: "privacy_requests"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      request_return_information: {
        Args: {
          p_expected_version: number
          p_idempotency_key: string
          p_message: string
          p_return_request_id: string
        }
        Returns: {
          buyer_locale: Database["public"]["Enums"]["app_locale"]
          buyer_note: string | null
          closed_at: string | null
          correlation_id: string
          created_at: string
          customer_profile_id: string | null
          decided_at: string | null
          decision_by: string | null
          decision_reason: string | null
          eligibility_snapshot: Json
          expires_at: string
          guest_session_id: string | null
          id: string
          idempotency_key_hash: string
          inspected_at: string | null
          order_id: string
          policy_id: string
          policy_snapshot: Json
          policy_version: string
          reason_code: string
          received_at: string | null
          reference: string
          refunded_at: string | null
          request_kind: Database["public"]["Enums"]["return_request_kind"]
          status: Database["public"]["Enums"]["return_request_status"]
          updated_at: string
          version: number
        }
        SetofOptions: {
          from: "*"
          to: "return_requests"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      reserve_guest_checkout: {
        Args: {
          p_country_code: string
          p_method_code?: string
          p_secret_hash: string
        }
        Returns: {
          accepted_at: string | null
          accepted_order_id: string | null
          cart_id: string
          created_at: string
          expires_at: string
          id: string
          quote_id: string
          reservation_version: string
          status: Database["public"]["Enums"]["checkout_status"]
        }
        SetofOptions: {
          from: "*"
          to: "checkout_sessions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      resolve_manual_quote: {
        Args: {
          p_amount_minor: number
          p_buyer_message: string
          p_currency: unknown
          p_customs_snapshot: Json
          p_estimate_max_days: number
          p_estimate_min_days: number
          p_expected_version: number
          p_expires_at: string
          p_idempotency_key_hash: string
          p_method_i18n: Json
          p_quote_id: string
          p_staff_note: string
        }
        Returns: {
          address: Json
          buyer_message: string | null
          buyer_note: string | null
          cart_id: string | null
          cart_snapshot: Json
          contact_email: string
          contact_phone: string | null
          correlation_id: string
          created_at: string
          currency: string
          customer_profile_id: string | null
          customs_snapshot: Json | null
          destination_country_code: string
          estimate_max_days: number | null
          estimate_min_days: number | null
          expires_at: string | null
          guest_proof_hash: string | null
          guest_session_id: string | null
          id: string
          idempotency_key_hash: string
          locale: Database["public"]["Enums"]["app_locale"]
          quoted_amount_minor: number | null
          quoted_at: string | null
          quoted_by: string | null
          quoted_currency: string | null
          quoted_method_i18n: Json | null
          reference: string
          staff_note: string | null
          status: Database["public"]["Enums"]["manual_quote_status"]
          updated_at: string
          version: number
        }
        SetofOptions: {
          from: "*"
          to: "manual_quote_requests"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      resolve_product_price: {
        Args: {
          p_currency: unknown
          p_market_code?: string
          p_product_id: string
        }
        Returns: {
          active_from: string
          active_until: string
          amount_minor: number
          created_at: string
          currency: string
          enabled: boolean
          id: string
          market_code: string | null
          product_id: string
          source: string
          source_reference: string | null
          updated_at: string
          version: number
        }
        SetofOptions: {
          from: "*"
          to: "product_prices"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      respond_manual_quote: {
        Args: {
          p_accept: boolean
          p_expected_version: number
          p_idempotency_key_hash: string
          p_proof_hash: string
          p_quote_id: string
        }
        Returns: {
          address: Json
          buyer_message: string | null
          buyer_note: string | null
          cart_id: string | null
          cart_snapshot: Json
          contact_email: string
          contact_phone: string | null
          correlation_id: string
          created_at: string
          currency: string
          customer_profile_id: string | null
          customs_snapshot: Json | null
          destination_country_code: string
          estimate_max_days: number | null
          estimate_min_days: number | null
          expires_at: string | null
          guest_proof_hash: string | null
          guest_session_id: string | null
          id: string
          idempotency_key_hash: string
          locale: Database["public"]["Enums"]["app_locale"]
          quoted_amount_minor: number | null
          quoted_at: string | null
          quoted_by: string | null
          quoted_currency: string | null
          quoted_method_i18n: Json | null
          reference: string
          staff_note: string | null
          status: Database["public"]["Enums"]["manual_quote_status"]
          updated_at: string
          version: number
        }
        SetofOptions: {
          from: "*"
          to: "manual_quote_requests"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      retry_ingestion_file: {
        Args: { p_file_id: string }
        Returns: {
          attempt: number
          completed_at: string | null
          correlation_id: string
          id: string
          job_type: string
          lease_expires_at: string | null
          lease_owner: string | null
          max_attempts: number
          next_attempt_at: string
          progress_stage: string | null
          queued_at: string
          recipe_version: string | null
          safe_error_code: string | null
          safe_error_summary: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["job_status"]
          subject_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "media_jobs"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      retry_notification: {
        Args: { p_notification_id: string }
        Returns: {
          attempt_count: number
          available_at: string
          correlation_id: string
          created_at: string
          id: string
          idempotency_key: string
          last_error_code: string | null
          lease_expires_at: string | null
          lease_owner: string | null
          locale: Database["public"]["Enums"]["app_locale"]
          max_attempts: number
          payload: Json
          purpose: string
          recipient_hash: string
          status: Database["public"]["Enums"]["notification_status"]
          template_key: string
          updated_at: string
          version: number
        }
        SetofOptions: {
          from: "*"
          to: "notifications"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      review_bank_transfer: {
        Args: {
          p_amount_minor: number
          p_currency: string
          p_decision: string
          p_evidence_path: string
          p_order_id: string
          p_reconciliation_id?: string
          p_transfer_reference: string
        }
        Returns: {
          amount_minor: number | null
          confirmed_at: string | null
          confirmed_by: string | null
          created_at: string
          currency: string | null
          evidence_path: string | null
          external_reference: string | null
          first_reviewed_at: string | null
          first_reviewed_by: string | null
          id: string
          order_id: string
          payment_attempt_id: string
          provider_event_inbox_id: string | null
          reconciliation_kind: string
          safe_reason: string | null
          status: string
          updated_at: string
          version: number
        }
        SetofOptions: {
          from: "*"
          to: "payment_reconciliations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      revoke_app_sessions: {
        Args: {
          p_keep_auth_session_id?: string
          p_profile_id: string
          p_reason?: string
        }
        Returns: number
      }
      revoke_current_session: { Args: { p_reason: string }; Returns: boolean }
      rotate_guest_context: {
        Args: { p_current_secret_hash: string; p_new_secret_hash: string }
        Returns: string
      }
      run_content_contact_consent_maintenance: {
        Args: { p_delete_limit?: number }
        Returns: Json
      }
      run_security_maintenance: { Args: never; Returns: Json }
      run_worldwide_selling_maintenance: {
        Args: { p_limit?: number }
        Returns: Json
      }
      save_catalog_admin_view: {
        Args: {
          p_filters: Json
          p_name: string
          p_sort: Json
          p_view_type: string
        }
        Returns: {
          created_at: string
          filters: Json
          id: string
          name: string
          owner_profile_id: string
          sort: Json
          updated_at: string
          view_type: string
        }
        SetofOptions: {
          from: "*"
          to: "saved_admin_views"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      save_catalog_collection: {
        Args: {
          p_code: string
          p_collection_id?: string
          p_expected_version?: number
          p_note: string
          p_order_strategy: string
          p_scheduled_at?: string
          p_status: Database["public"]["Enums"]["collection_status"]
          p_translations: Json
        }
        Returns: {
          archive_reason: string | null
          archived_by: string | null
          code: string
          collection_type: string
          created_at: string
          hero_media_asset_id: string | null
          id: string
          order_strategy: string
          published_at: string | null
          scheduled_at: string | null
          status: Database["public"]["Enums"]["collection_status"]
          updated_at: string
          version: number
        }
        SetofOptions: {
          from: "*"
          to: "collections"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      save_catalog_product: {
        Args: {
          p_change_note: string
          p_expected_version?: number
          p_facts: Json
          p_on_hand_quantity: number
          p_prices: Json
          p_product_id?: string
          p_sku: string
          p_stock_model: Database["public"]["Enums"]["stock_model"]
          p_translations: Json
        }
        Returns: {
          age_max_year: number | null
          age_min_year: number | null
          age_verified: boolean
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          care_code: string | null
          category: string | null
          colors: string[]
          condition: string | null
          construction: string | null
          created_at: string
          created_by: string | null
          delivery_class: string | null
          diameter_mm: number | null
          entered_length: number | null
          entered_unit: string | null
          entered_width: number | null
          handmade: boolean | null
          handmade_verified: boolean
          id: string
          length_mm: number | null
          materials: string[]
          origin: string | null
          origin_verified: boolean
          pile: string | null
          pile_verified: boolean
          primary_media_asset_id: string | null
          provenance_summary: string | null
          provenance_verified: boolean
          published_at: string | null
          published_by: string | null
          readiness_passed: boolean
          readiness_version: number
          reviewed_by: string | null
          scheduled_at: string | null
          search_visible: boolean
          shape: string | null
          sku: string
          status: Database["public"]["Enums"]["product_status"]
          structured_data_eligible: boolean
          styles: string[]
          unpublished_at: string | null
          updated_at: string
          updated_by: string | null
          version: number
          width_mm: number | null
        }
        SetofOptions: {
          from: "*"
          to: "products"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      save_content_entry: {
        Args: {
          p_content_entry_id?: string
          p_content_type?: string
          p_entry_key?: string
          p_expected_version?: number
          p_fallback_policy?: string
          p_legal_status?: string
          p_reason?: string
          p_translations?: Json
        }
        Returns: {
          archived_at: string | null
          content_type: string
          created_at: string
          created_by: string | null
          entry_key: string
          fallback_policy: string
          id: string
          legal_status: string
          publish_at: string | null
          published_at: string | null
          status: string
          unpublish_at: string | null
          updated_at: string
          updated_by: string | null
          version: number
        }
        SetofOptions: {
          from: "*"
          to: "content_entries"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      save_customer_address: {
        Args: {
          p_address_id: string
          p_city: string
          p_country_code: string
          p_expected_version: number
          p_full_name: string
          p_instructions: string
          p_is_default: boolean
          p_label: string
          p_line1: string
          p_line2: string
          p_organization: string
          p_phone: string
          p_postal_code: string
          p_region: string
        }
        Returns: {
          city: string
          country_code: string
          created_at: string
          full_name: string
          id: string
          instructions: string | null
          is_default: boolean
          label: string
          line1: string
          line2: string | null
          organization: string | null
          phone: string | null
          postal_code: string | null
          profile_id: string
          region: string | null
          updated_at: string
          version: number
        }
        SetofOptions: {
          from: "*"
          to: "customer_addresses"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      save_ingestion_product_review: {
        Args: {
          p_amount_minor: number
          p_batch_id: string
          p_currency: unknown
          p_expected_version: number
          p_facts: Json
          p_on_hand_quantity: number
          p_translations: Json
        }
        Returns: {
          age_max_year: number | null
          age_min_year: number | null
          age_verified: boolean
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          care_code: string | null
          category: string | null
          colors: string[]
          condition: string | null
          construction: string | null
          created_at: string
          created_by: string | null
          delivery_class: string | null
          diameter_mm: number | null
          entered_length: number | null
          entered_unit: string | null
          entered_width: number | null
          handmade: boolean | null
          handmade_verified: boolean
          id: string
          length_mm: number | null
          materials: string[]
          origin: string | null
          origin_verified: boolean
          pile: string | null
          pile_verified: boolean
          primary_media_asset_id: string | null
          provenance_summary: string | null
          provenance_verified: boolean
          published_at: string | null
          published_by: string | null
          readiness_passed: boolean
          readiness_version: number
          reviewed_by: string | null
          scheduled_at: string | null
          search_visible: boolean
          shape: string | null
          sku: string
          status: Database["public"]["Enums"]["product_status"]
          structured_data_eligible: boolean
          styles: string[]
          unpublished_at: string | null
          updated_at: string
          updated_by: string | null
          version: number
          width_mm: number | null
        }
        SetofOptions: {
          from: "*"
          to: "products"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      save_product_market_price: {
        Args: {
          p_active_from?: string
          p_active_until?: string
          p_amount_minor?: number
          p_currency: unknown
          p_enabled?: boolean
          p_expected_version?: number
          p_market_code?: string
          p_product_id: string
          p_reason?: string
          p_source?: string
          p_source_reference?: string
        }
        Returns: {
          active_from: string
          active_until: string
          amount_minor: number
          created_at: string
          currency: string
          enabled: boolean
          id: string
          market_code: string | null
          product_id: string
          source: string
          source_reference: string | null
          updated_at: string
          version: number
        }
        SetofOptions: {
          from: "*"
          to: "product_prices"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      schedule_catalog_product: {
        Args: {
          p_expected_version: number
          p_product_id: string
          p_reason: string
          p_scheduled_at: string
        }
        Returns: {
          age_max_year: number | null
          age_min_year: number | null
          age_verified: boolean
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          care_code: string | null
          category: string | null
          colors: string[]
          condition: string | null
          construction: string | null
          created_at: string
          created_by: string | null
          delivery_class: string | null
          diameter_mm: number | null
          entered_length: number | null
          entered_unit: string | null
          entered_width: number | null
          handmade: boolean | null
          handmade_verified: boolean
          id: string
          length_mm: number | null
          materials: string[]
          origin: string | null
          origin_verified: boolean
          pile: string | null
          pile_verified: boolean
          primary_media_asset_id: string | null
          provenance_summary: string | null
          provenance_verified: boolean
          published_at: string | null
          published_by: string | null
          readiness_passed: boolean
          readiness_version: number
          reviewed_by: string | null
          scheduled_at: string | null
          search_visible: boolean
          shape: string | null
          sku: string
          status: Database["public"]["Enums"]["product_status"]
          structured_data_eligible: boolean
          styles: string[]
          unpublished_at: string | null
          updated_at: string
          updated_by: string | null
          version: number
          width_mm: number | null
        }
        SetofOptions: {
          from: "*"
          to: "products"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      search_catalog: {
        Args: {
          p_collection_slug?: string
          p_colors?: string[]
          p_currency: unknown
          p_in_stock?: boolean
          p_limit?: number
          p_locale: Database["public"]["Enums"]["app_locale"]
          p_materials?: string[]
          p_offset?: number
          p_query: string
          p_sort?: string
        }
        Returns: {
          amount_minor: unknown
          available_quantity: number
          colors: string[]
          content_locale: Database["public"]["Enums"]["app_locale"]
          currency: unknown
          id: string
          length_mm: number
          materials: string[]
          name: string
          primary_image_path: string
          requested_locale: Database["public"]["Enums"]["app_locale"]
          short_description: string
          sku: string
          slug: string
          total_count: number
          width_mm: number
        }[]
      }
      set_guest_cart_item_quantity: {
        Args: { p_item_id: string; p_quantity: number; p_secret_hash: string }
        Returns: boolean
      }
      stage_catalog_import: {
        Args: {
          p_error_report_path?: string
          p_header_mapping: Json
          p_original_filename: string
          p_rows: Json
          p_source_checksum: string
          p_source_path: string
        }
        Returns: {
          applied_row_count: number
          completed_at: string | null
          created_at: string
          created_by: string | null
          error_report_path: string | null
          header_mapping: Json
          id: string
          invalid_row_count: number
          original_filename: string
          row_count: number
          safe_error_code: string | null
          source_bucket: string
          source_checksum: string
          source_path: string
          status: Database["public"]["Enums"]["catalog_import_status"]
          updated_at: string
          valid_row_count: number
          version: number
        }
        SetofOptions: {
          from: "*"
          to: "catalog_import_batches"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      submit_contact_message: {
        Args: {
          p_contact_email: string
          p_disclosure_version: string
          p_full_name: string
          p_guest_proof_hash: string
          p_guest_subject_hash: string
          p_idempotency_key_hash: string
          p_locale: Database["public"]["Enums"]["app_locale"]
          p_message: string
          p_message_fingerprint: string
          p_order_reference: string
          p_subject: string
        }
        Returns: {
          channel_key: string | null
          contact_email: string
          correlation_id: string
          created_at: string
          disclosure_version: string
          full_name: string
          guest_proof_hash: string | null
          guest_subject_hash: string
          id: string
          idempotency_key_hash: string
          locale: Database["public"]["Enums"]["app_locale"]
          message: string
          message_fingerprint: string
          notification_state: string
          order_reference: string | null
          profile_id: string | null
          reference: string
          retention_due_at: string
          status: string
          subject: string
          updated_at: string
          version: number
        }
        SetofOptions: {
          from: "*"
          to: "contact_submissions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      submit_manual_quote: {
        Args: {
          p_address: Json
          p_buyer_note: string
          p_contact_email: string
          p_contact_phone: string
          p_country_code: string
          p_idempotency_key_hash: string
          p_quote_proof_hash: string
          p_secret_hash: string
        }
        Returns: {
          address: Json
          buyer_message: string | null
          buyer_note: string | null
          cart_id: string | null
          cart_snapshot: Json
          contact_email: string
          contact_phone: string | null
          correlation_id: string
          created_at: string
          currency: string
          customer_profile_id: string | null
          customs_snapshot: Json | null
          destination_country_code: string
          estimate_max_days: number | null
          estimate_min_days: number | null
          expires_at: string | null
          guest_proof_hash: string | null
          guest_session_id: string | null
          id: string
          idempotency_key_hash: string
          locale: Database["public"]["Enums"]["app_locale"]
          quoted_amount_minor: number | null
          quoted_at: string | null
          quoted_by: string | null
          quoted_currency: string | null
          quoted_method_i18n: Json | null
          reference: string
          staff_note: string | null
          status: Database["public"]["Enums"]["manual_quote_status"]
          updated_at: string
          version: number
        }
        SetofOptions: {
          from: "*"
          to: "manual_quote_requests"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      submit_return_request: {
        Args: {
          p_buyer_note: string
          p_guest_proof_hash?: string
          p_idempotency_key_hash: string
          p_line_items: Json
          p_order_id: string
          p_reason_code: string
          p_request_kind: Database["public"]["Enums"]["return_request_kind"]
        }
        Returns: {
          buyer_locale: Database["public"]["Enums"]["app_locale"]
          buyer_note: string | null
          closed_at: string | null
          correlation_id: string
          created_at: string
          customer_profile_id: string | null
          decided_at: string | null
          decision_by: string | null
          decision_reason: string | null
          eligibility_snapshot: Json
          expires_at: string
          guest_session_id: string | null
          id: string
          idempotency_key_hash: string
          inspected_at: string | null
          order_id: string
          policy_id: string
          policy_snapshot: Json
          policy_version: string
          reason_code: string
          received_at: string | null
          reference: string
          refunded_at: string | null
          request_kind: Database["public"]["Enums"]["return_request_kind"]
          status: Database["public"]["Enums"]["return_request_status"]
          updated_at: string
          version: number
        }
        SetofOptions: {
          from: "*"
          to: "return_requests"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      subscribe_newsletter: {
        Args: {
          p_disclosure_version: string
          p_email: string
          p_guest_subject_hash: string
          p_locale: Database["public"]["Enums"]["app_locale"]
          p_manage_proof_hash: string
        }
        Returns: {
          consent_record_id: string
          disclosure_version: string
          email: string
          guest_subject_hash: string
          id: string
          locale: Database["public"]["Enums"]["app_locale"]
          manage_proof_hash: string
          profile_id: string | null
          reference: string
          status: string
          subscribed_at: string
          updated_at: string
          version: number
          withdrawn_at: string | null
        }
        SetofOptions: {
          from: "*"
          to: "newsletter_subscriptions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      sync_customer_cart_from_guest: {
        Args: { p_customer_profile_id: string; p_secret_hash: string }
        Returns: number
      }
      toggle_customer_wishlist_item: {
        Args: { p_product_id: string }
        Returns: boolean
      }
      toggle_guest_wishlist_item: {
        Args: { p_product_id: string; p_secret_hash: string }
        Returns: boolean
      }
      transition_contact_message: {
        Args: {
          p_contact_submission_id: string
          p_expected_version: number
          p_idempotency_key_hash: string
          p_safe_note: string
          p_target_status: string
        }
        Returns: {
          channel_key: string | null
          contact_email: string
          correlation_id: string
          created_at: string
          disclosure_version: string
          full_name: string
          guest_proof_hash: string | null
          guest_subject_hash: string
          id: string
          idempotency_key_hash: string
          locale: Database["public"]["Enums"]["app_locale"]
          message: string
          message_fingerprint: string
          notification_state: string
          order_reference: string | null
          profile_id: string | null
          reference: string
          retention_due_at: string
          status: string
          subject: string
          updated_at: string
          version: number
        }
        SetofOptions: {
          from: "*"
          to: "contact_submissions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      transition_content_entry: {
        Args: {
          p_content_entry_id: string
          p_expected_version?: number
          p_publish_at?: string
          p_reason?: string
          p_target_status: string
          p_unpublish_at?: string
        }
        Returns: {
          archived_at: string | null
          content_type: string
          created_at: string
          created_by: string | null
          entry_key: string
          fallback_policy: string
          id: string
          legal_status: string
          publish_at: string | null
          published_at: string | null
          status: string
          unpublish_at: string | null
          updated_at: string
          updated_by: string | null
          version: number
        }
        SetofOptions: {
          from: "*"
          to: "content_entries"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      transition_order: {
        Args: {
          p_expected_version: number
          p_idempotency_key: string
          p_order_id: string
          p_reason: string
          p_target_status: Database["public"]["Enums"]["order_status"]
        }
        Returns: {
          accepted_at: string
          bank_transfer_due_at: string | null
          checkout_session_id: string
          contact_email: string
          contact_phone: string | null
          currency: string
          customer_profile_id: string | null
          delivery_minor: number
          discount_minor: number
          guest_proof_expires_at: string | null
          guest_proof_hash: string | null
          guest_session_id: string | null
          id: string
          idempotency_key_hash: string
          locale: Database["public"]["Enums"]["app_locale"]
          payment_method: Database["public"]["Enums"]["payment_method_kind"]
          payment_status: Database["public"]["Enums"]["payment_status"]
          pricing_version: string
          reference: string
          request_hash: string
          status: Database["public"]["Enums"]["order_status"]
          subtotal_minor: number
          tax_minor: number
          terms_version: string
          total_minor: number
          updated_at: string
          version: number
        }
        SetofOptions: {
          from: "*"
          to: "orders"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      verify_critical_data_integrity: { Args: never; Returns: Json }
      verify_guest_order_proof: {
        Args: { p_proof_hash: string; p_reference: string }
        Returns: boolean
      }
      withdraw_newsletter: {
        Args: {
          p_email: string
          p_locale: Database["public"]["Enums"]["app_locale"]
          p_manage_proof_hash: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_locale: "ka" | "en" | "de" | "ru"
      cart_status: "active" | "converted" | "abandoned" | "expired"
      catalog_import_row_status: "valid" | "invalid" | "applied" | "failed"
      catalog_import_status:
        | "uploaded"
        | "validating"
        | "ready"
        | "applying"
        | "complete"
        | "failed"
        | "cancelled"
      catalog_relation_type: "related" | "similar" | "companion"
      catalog_revision_kind:
        | "created"
        | "updated"
        | "imported"
        | "published"
        | "archived"
        | "restored"
        | "inventory"
        | "merchandising"
      checkout_status: "reserved" | "accepted" | "expired" | "cancelled"
      collection_status: "draft" | "scheduled" | "published" | "archived"
      consent_choice: "granted" | "refused" | "withdrawn"
      customer_account_status:
        | "active"
        | "deletion_requested"
        | "restricted"
        | "closed"
      discount_kind: "percentage" | "fixed"
      ingestion_batch_status:
        | "draft"
        | "uploading"
        | "processing"
        | "review"
        | "ready"
        | "published"
        | "failed"
        | "cancelled"
      ingestion_file_status:
        | "registered"
        | "uploading"
        | "uploaded"
        | "processing"
        | "ready"
        | "failed"
        | "cancelled"
        | "duplicate"
      integration_mode: "disabled" | "fixture" | "sandbox" | "live" | "degraded"
      inventory_reservation_status:
        | "active"
        | "converted"
        | "released"
        | "expired"
      job_status:
        | "queued"
        | "uploading"
        | "processing"
        | "needs_review"
        | "failed"
        | "retrying"
        | "cancelled"
        | "complete"
      manual_quote_status:
        | "submitted"
        | "needs_information"
        | "quoted"
        | "accepted"
        | "declined"
        | "expired"
        | "cancelled"
      media_approval_status: "pending" | "approved" | "rejected"
      media_license_status: "pending" | "approved" | "rejected" | "expired"
      media_variant_status: "processing" | "approved" | "failed" | "retired"
      notification_status:
        | "pending"
        | "leased"
        | "sent"
        | "delivered"
        | "failed"
        | "bounced"
        | "cancelled"
      order_status:
        | "bank_transfer_pending"
        | "payment_pending"
        | "confirmed"
        | "cancelled"
        | "expired"
        | "refunded"
        | "partially_refunded"
        | "processing"
        | "shipped"
        | "delivered"
      payment_method_kind: "bank_transfer" | "hosted_payment"
      payment_status:
        | "pending"
        | "bank_transfer_review"
        | "authorized"
        | "paid"
        | "failed"
        | "expired"
        | "cancelled"
        | "refunded"
        | "partially_refunded"
        | "uncertain"
        | "reconciliation_required"
      price_source_mode: "explicit_only" | "approved_rate_snapshot"
      privacy_request_status:
        | "requested"
        | "verified"
        | "processing"
        | "complete"
        | "rejected"
        | "cancelled"
      privacy_request_type: "access" | "export" | "correction" | "deletion"
      product_status:
        | "draft"
        | "in_review"
        | "scheduled"
        | "published"
        | "unpublished"
        | "archived"
      profile_kind: "customer" | "staff"
      restock_decision: "pending" | "restock" | "do_not_restock"
      return_evidence_status: "pending" | "attached" | "removed" | "expired"
      return_item_condition:
        | "unreported"
        | "unopened"
        | "like_new"
        | "used"
        | "damaged"
        | "missing"
      return_legal_status: "draft_unapproved" | "approved"
      return_request_kind: "cancellation" | "return"
      return_request_status:
        | "requested"
        | "needs_information"
        | "approved"
        | "rejected"
        | "in_transit"
        | "received"
        | "inspected"
        | "refund_pending"
        | "refunded"
        | "closed"
        | "cancelled"
      staff_invitation_status: "pending" | "accepted" | "expired" | "revoked"
      staff_role: "owner" | "manager"
      stock_model: "unique" | "stocked"
      suggestion_decision_status: "pending" | "accepted" | "edited" | "rejected"
      tax_display_mode:
        | "included"
        | "added_at_checkout"
        | "not_applicable"
        | "pending_legal_review"
      translation_status: "draft" | "reviewed" | "published"
      wishlist_status: "active" | "merged" | "abandoned"
      work_status: "pending" | "leased" | "complete" | "failed" | "cancelled"
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
      app_locale: ["ka", "en", "de", "ru"],
      cart_status: ["active", "converted", "abandoned", "expired"],
      catalog_import_row_status: ["valid", "invalid", "applied", "failed"],
      catalog_import_status: [
        "uploaded",
        "validating",
        "ready",
        "applying",
        "complete",
        "failed",
        "cancelled",
      ],
      catalog_relation_type: ["related", "similar", "companion"],
      catalog_revision_kind: [
        "created",
        "updated",
        "imported",
        "published",
        "archived",
        "restored",
        "inventory",
        "merchandising",
      ],
      checkout_status: ["reserved", "accepted", "expired", "cancelled"],
      collection_status: ["draft", "scheduled", "published", "archived"],
      consent_choice: ["granted", "refused", "withdrawn"],
      customer_account_status: [
        "active",
        "deletion_requested",
        "restricted",
        "closed",
      ],
      discount_kind: ["percentage", "fixed"],
      ingestion_batch_status: [
        "draft",
        "uploading",
        "processing",
        "review",
        "ready",
        "published",
        "failed",
        "cancelled",
      ],
      ingestion_file_status: [
        "registered",
        "uploading",
        "uploaded",
        "processing",
        "ready",
        "failed",
        "cancelled",
        "duplicate",
      ],
      integration_mode: ["disabled", "fixture", "sandbox", "live", "degraded"],
      inventory_reservation_status: [
        "active",
        "converted",
        "released",
        "expired",
      ],
      job_status: [
        "queued",
        "uploading",
        "processing",
        "needs_review",
        "failed",
        "retrying",
        "cancelled",
        "complete",
      ],
      manual_quote_status: [
        "submitted",
        "needs_information",
        "quoted",
        "accepted",
        "declined",
        "expired",
        "cancelled",
      ],
      media_approval_status: ["pending", "approved", "rejected"],
      media_license_status: ["pending", "approved", "rejected", "expired"],
      media_variant_status: ["processing", "approved", "failed", "retired"],
      notification_status: [
        "pending",
        "leased",
        "sent",
        "delivered",
        "failed",
        "bounced",
        "cancelled",
      ],
      order_status: [
        "bank_transfer_pending",
        "payment_pending",
        "confirmed",
        "cancelled",
        "expired",
        "refunded",
        "partially_refunded",
        "processing",
        "shipped",
        "delivered",
      ],
      payment_method_kind: ["bank_transfer", "hosted_payment"],
      payment_status: [
        "pending",
        "bank_transfer_review",
        "authorized",
        "paid",
        "failed",
        "expired",
        "cancelled",
        "refunded",
        "partially_refunded",
        "uncertain",
        "reconciliation_required",
      ],
      price_source_mode: ["explicit_only", "approved_rate_snapshot"],
      privacy_request_status: [
        "requested",
        "verified",
        "processing",
        "complete",
        "rejected",
        "cancelled",
      ],
      privacy_request_type: ["access", "export", "correction", "deletion"],
      product_status: [
        "draft",
        "in_review",
        "scheduled",
        "published",
        "unpublished",
        "archived",
      ],
      profile_kind: ["customer", "staff"],
      restock_decision: ["pending", "restock", "do_not_restock"],
      return_evidence_status: ["pending", "attached", "removed", "expired"],
      return_item_condition: [
        "unreported",
        "unopened",
        "like_new",
        "used",
        "damaged",
        "missing",
      ],
      return_legal_status: ["draft_unapproved", "approved"],
      return_request_kind: ["cancellation", "return"],
      return_request_status: [
        "requested",
        "needs_information",
        "approved",
        "rejected",
        "in_transit",
        "received",
        "inspected",
        "refund_pending",
        "refunded",
        "closed",
        "cancelled",
      ],
      staff_invitation_status: ["pending", "accepted", "expired", "revoked"],
      staff_role: ["owner", "manager"],
      stock_model: ["unique", "stocked"],
      suggestion_decision_status: ["pending", "accepted", "edited", "rejected"],
      tax_display_mode: [
        "included",
        "added_at_checkout",
        "not_applicable",
        "pending_legal_review",
      ],
      translation_status: ["draft", "reviewed", "published"],
      wishlist_status: ["active", "merged", "abandoned"],
      work_status: ["pending", "leased", "complete", "failed", "cancelled"],
    },
  },
} as const
