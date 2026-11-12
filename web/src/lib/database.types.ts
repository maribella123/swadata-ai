
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "annotations": {
                  Row: {
                    "annotator_id": string,"contribution_id": string,"created_at": string,"end_offset": number | null,"id": string,"label": string,"note": string,"start_offset": number | null,"text_version": number | null,"value": string
                  }
                  ComputedFields: never
                  Insert: {
                    "annotator_id": string,"contribution_id": string,"created_at"?: string,"end_offset"?: number | null,"id"?: string,"label": string,"note"?: string,"start_offset"?: number | null,"text_version"?: number | null,"value"?: string
                  }
                  Update: {
                    "annotator_id"?: string,"contribution_id"?: string,"created_at"?: string,"end_offset"?: number | null,"id"?: string,"label"?: string,"note"?: string,"start_offset"?: number | null,"text_version"?: number | null,"value"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "annotations_annotator_id_fkey"
      columns: ["annotator_id"]
isOneToOne: false
      referencedRelation: "users"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "annotations_contribution_id_fkey"
      columns: ["contribution_id"]
isOneToOne: false
      referencedRelation: "contributions"
      referencedColumns: ["id"]
    }
                  ]
                },"audio_assets": {
                  Row: {
                    "analysis_status": Database["public"]['Enums']["processing_status"],"channels": number | null,"checksum_sha256": string | null,"codec": string | null,"consent_ai_training": boolean,"consent_recording": boolean,"contribution_id": string,"created_at": string,"duration_seconds": number | null,"file_size_bytes": number,"id": string,"mime_type": string,"original_filename": string,"prompt_text": string,"recording_environment": string,"recording_method": string,"sample_rate": number | null,"speaker_age_band": string,"speaker_gender": string,"speaker_pseudonym": string,"storage_bucket": string,"storage_path": string,"transcript": string,"transcript_source": string,"transcription_model": string | null,"transcription_status": Database["public"]['Enums']["processing_status"],"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "analysis_status"?: Database["public"]['Enums']["processing_status"],"channels"?: number | null,"checksum_sha256"?: string | null,"codec"?: string | null,"consent_ai_training"?: boolean,"consent_recording": boolean,"contribution_id": string,"created_at"?: string,"duration_seconds"?: number | null,"file_size_bytes": number,"id"?: string,"mime_type": string,"original_filename"?: string,"prompt_text"?: string,"recording_environment"?: string,"recording_method"?: string,"sample_rate"?: number | null,"speaker_age_band"?: string,"speaker_gender"?: string,"speaker_pseudonym": string,"storage_bucket"?: string,"storage_path": string,"transcript"?: string,"transcript_source"?: string,"transcription_model"?: string | null,"transcription_status"?: Database["public"]['Enums']["processing_status"],"updated_at"?: string
                  }
                  Update: {
                    "analysis_status"?: Database["public"]['Enums']["processing_status"],"channels"?: number | null,"checksum_sha256"?: string | null,"codec"?: string | null,"consent_ai_training"?: boolean,"consent_recording"?: boolean,"contribution_id"?: string,"created_at"?: string,"duration_seconds"?: number | null,"file_size_bytes"?: number,"id"?: string,"mime_type"?: string,"original_filename"?: string,"prompt_text"?: string,"recording_environment"?: string,"recording_method"?: string,"sample_rate"?: number | null,"speaker_age_band"?: string,"speaker_gender"?: string,"speaker_pseudonym"?: string,"storage_bucket"?: string,"storage_path"?: string,"transcript"?: string,"transcript_source"?: string,"transcription_model"?: string | null,"transcription_status"?: Database["public"]['Enums']["processing_status"],"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "audio_assets_contribution_id_fkey"
      columns: ["contribution_id"]
isOneToOne: true
      referencedRelation: "contributions"
      referencedColumns: ["id"]
    }
                  ]
                },"audit_logs": {
                  Row: {
                    "action": string,"actor_id": string | null,"created_at": string,"details": NonNullable<Json>,"entity_id": string | null,"entity_type": string,"id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "action": string,"actor_id"?: string | null,"created_at"?: string,"details"?: NonNullable<Json>,"entity_id"?: string | null,"entity_type": string,"id"?: string
                  }
                  Update: {
                    "action"?: string,"actor_id"?: string | null,"created_at"?: string,"details"?: NonNullable<Json>,"entity_id"?: string | null,"entity_type"?: string,"id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"consents": {
                  Row: {
                    "consent_type": Database["public"]['Enums']["consent_type"],"created_at": string,"granted": boolean,"granted_at": string,"id": string,"policy_version": string,"revoked_at": string | null,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "consent_type": Database["public"]['Enums']["consent_type"],"created_at"?: string,"granted": boolean,"granted_at"?: string,"id"?: string,"policy_version"?: string,"revoked_at"?: string | null,"user_id": string
                  }
                  Update: {
                    "consent_type"?: Database["public"]['Enums']["consent_type"],"created_at"?: string,"granted"?: boolean,"granted_at"?: string,"id"?: string,"policy_version"?: string,"revoked_at"?: string | null,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "consents_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "users"
      referencedColumns: ["id"]
    }
                  ]
                },"contact_messages": {
                  Row: {
                    "created_at": string,"email": string,"id": string,"message": string,"name": string,"organisation": string,"status": string,"topic": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"email": string,"id"?: string,"message": string,"name": string,"organisation"?: string,"status"?: string,"topic"?: string
                  }
                  Update: {
                    "created_at"?: string,"email"?: string,"id"?: string,"message"?: string,"name"?: string,"organisation"?: string,"status"?: string,"topic"?: string
                  }
                  Relationships: [
                    
                  ]
                },"content_categories": {
                  Row: {
                    "applies_to": (Database["public"]['Enums']["contribution_type"])[],"created_at": string,"description": string,"id": string,"is_active": boolean,"key": string,"name": string,"sort_order": number
                  }
                  ComputedFields: never
                  Insert: {
                    "applies_to"?: (Database["public"]['Enums']["contribution_type"])[],"created_at"?: string,"description"?: string,"id"?: string,"is_active"?: boolean,"key": string,"name": string,"sort_order"?: number
                  }
                  Update: {
                    "applies_to"?: (Database["public"]['Enums']["contribution_type"])[],"created_at"?: string,"description"?: string,"id"?: string,"is_active"?: boolean,"key"?: string,"name"?: string,"sort_order"?: number
                  }
                  Relationships: [
                    
                  ]
                },"contribution_permissions": {
                  Row: {
                    "allow_ai_training": boolean,"allow_collection": boolean,"allow_commercial": boolean,"allow_public_release": boolean,"allow_research": boolean,"contribution_id": string,"declaration_text": string,"declared_at": string,"declared_by": string,"id": string,"rights_holder": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "allow_ai_training"?: boolean,"allow_collection": boolean,"allow_commercial"?: boolean,"allow_public_release"?: boolean,"allow_research"?: boolean,"contribution_id": string,"declaration_text"?: string,"declared_at"?: string,"declared_by": string,"id"?: string,"rights_holder"?: string,"updated_at"?: string
                  }
                  Update: {
                    "allow_ai_training"?: boolean,"allow_collection"?: boolean,"allow_commercial"?: boolean,"allow_public_release"?: boolean,"allow_research"?: boolean,"contribution_id"?: string,"declaration_text"?: string,"declared_at"?: string,"declared_by"?: string,"id"?: string,"rights_holder"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "contribution_permissions_contribution_id_fkey"
      columns: ["contribution_id"]
isOneToOne: true
      referencedRelation: "contributions"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "contribution_permissions_declared_by_fkey"
      columns: ["declared_by"]
isOneToOne: false
      referencedRelation: "users"
      referencedColumns: ["id"]
    }
                  ]
                },"contributions": {
                  Row: {
                    "category_id": string | null,"content_hash": string | null,"contributor_id": string,"created_at": string,"data_layer": Database["public"]['Enums']["data_layer"],"id": string,"is_original": boolean,"language_id": string,"license_id": string | null,"metadata": NonNullable<Json>,"reviewed_at": string | null,"sensitivity": Database["public"]['Enums']["sensitivity_level"],"source_reference": string,"source_type": string,"status": Database["public"]['Enums']["contribution_status"],"submitted_at": string | null,"title": string,"type": Database["public"]['Enums']["contribution_type"],"updated_at": string,"variety_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "category_id"?: string | null,"content_hash"?: string | null,"contributor_id": string,"created_at"?: string,"data_layer"?: Database["public"]['Enums']["data_layer"],"id"?: string,"is_original"?: boolean,"language_id": string,"license_id"?: string | null,"metadata"?: NonNullable<Json>,"reviewed_at"?: string | null,"sensitivity"?: Database["public"]['Enums']["sensitivity_level"],"source_reference"?: string,"source_type"?: string,"status"?: Database["public"]['Enums']["contribution_status"],"submitted_at"?: string | null,"title"?: string,"type": Database["public"]['Enums']["contribution_type"],"updated_at"?: string,"variety_id"?: string | null
                  }
                  Update: {
                    "category_id"?: string | null,"content_hash"?: string | null,"contributor_id"?: string,"created_at"?: string,"data_layer"?: Database["public"]['Enums']["data_layer"],"id"?: string,"is_original"?: boolean,"language_id"?: string,"license_id"?: string | null,"metadata"?: NonNullable<Json>,"reviewed_at"?: string | null,"sensitivity"?: Database["public"]['Enums']["sensitivity_level"],"source_reference"?: string,"source_type"?: string,"status"?: Database["public"]['Enums']["contribution_status"],"submitted_at"?: string | null,"title"?: string,"type"?: Database["public"]['Enums']["contribution_type"],"updated_at"?: string,"variety_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "contributions_category_id_fkey"
      columns: ["category_id"]
isOneToOne: false
      referencedRelation: "content_categories"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "contributions_contributor_id_fkey"
      columns: ["contributor_id"]
isOneToOne: false
      referencedRelation: "users"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "contributions_language_id_fkey"
      columns: ["language_id"]
isOneToOne: false
      referencedRelation: "languages"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "contributions_license_id_fkey"
      columns: ["license_id"]
isOneToOne: false
      referencedRelation: "data_licenses"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "contributions_variety_id_fkey"
      columns: ["variety_id"]
isOneToOne: false
      referencedRelation: "language_varieties"
      referencedColumns: ["id"]
    }
                  ]
                },"conversation_messages": {
                  Row: {
                    "contribution_id": string,"created_at": string,"gloss_en": string,"id": string,"seq": number,"speaker_label": string,"speaker_role": string,"text": string
                  }
                  ComputedFields: never
                  Insert: {
                    "contribution_id": string,"created_at"?: string,"gloss_en"?: string,"id"?: string,"seq": number,"speaker_label"?: string,"speaker_role": string,"text": string
                  }
                  Update: {
                    "contribution_id"?: string,"created_at"?: string,"gloss_en"?: string,"id"?: string,"seq"?: number,"speaker_label"?: string,"speaker_role"?: string,"text"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "conversation_messages_contribution_id_fkey"
      columns: ["contribution_id"]
isOneToOne: false
      referencedRelation: "contributions"
      referencedColumns: ["id"]
    }
                  ]
                },"cultural_metadata": {
                  Row: {
                    "access_notes": string,"community_origin": string,"contribution_id": string,"created_at": string,"id": string,"kind": Database["public"]['Enums']["cultural_kind"],"literal_translation": string,"meaning": string,"original_expression": string,"region_origin": string,"updated_at": string,"usage_context": string
                  }
                  ComputedFields: never
                  Insert: {
                    "access_notes"?: string,"community_origin"?: string,"contribution_id": string,"created_at"?: string,"id"?: string,"kind": Database["public"]['Enums']["cultural_kind"],"literal_translation"?: string,"meaning"?: string,"original_expression": string,"region_origin"?: string,"updated_at"?: string,"usage_context"?: string
                  }
                  Update: {
                    "access_notes"?: string,"community_origin"?: string,"contribution_id"?: string,"created_at"?: string,"id"?: string,"kind"?: Database["public"]['Enums']["cultural_kind"],"literal_translation"?: string,"meaning"?: string,"original_expression"?: string,"region_origin"?: string,"updated_at"?: string,"usage_context"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "cultural_metadata_contribution_id_fkey"
      columns: ["contribution_id"]
isOneToOne: true
      referencedRelation: "contributions"
      referencedColumns: ["id"]
    }
                  ]
                },"data_licenses": {
                  Row: {
                    "allows_commercial": boolean,"code": string,"created_at": string,"description": string,"id": string,"is_active": boolean,"name": string,"requires_attribution": boolean,"share_alike": boolean,"url": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "allows_commercial"?: boolean,"code": string,"created_at"?: string,"description"?: string,"id"?: string,"is_active"?: boolean,"name": string,"requires_attribution"?: boolean,"share_alike"?: boolean,"url"?: string | null
                  }
                  Update: {
                    "allows_commercial"?: boolean,"code"?: string,"created_at"?: string,"description"?: string,"id"?: string,"is_active"?: boolean,"name"?: string,"requires_attribution"?: boolean,"share_alike"?: boolean,"url"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"dataset_access_requests": {
                  Row: {
                    "created_at": string,"dataset_id": string,"decided_at": string | null,"decided_by": string | null,"decision_note": string,"ethics_reference": string,"expires_at": string | null,"id": string,"institution": string,"purpose": string,"requester_id": string,"status": Database["public"]['Enums']["request_status"]
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"dataset_id": string,"decided_at"?: string | null,"decided_by"?: string | null,"decision_note"?: string,"ethics_reference"?: string,"expires_at"?: string | null,"id"?: string,"institution": string,"purpose": string,"requester_id": string,"status"?: Database["public"]['Enums']["request_status"]
                  }
                  Update: {
                    "created_at"?: string,"dataset_id"?: string,"decided_at"?: string | null,"decided_by"?: string | null,"decision_note"?: string,"ethics_reference"?: string,"expires_at"?: string | null,"id"?: string,"institution"?: string,"purpose"?: string,"requester_id"?: string,"status"?: Database["public"]['Enums']["request_status"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "dataset_access_requests_dataset_id_fkey"
      columns: ["dataset_id"]
isOneToOne: false
      referencedRelation: "datasets"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "dataset_access_requests_decided_by_fkey"
      columns: ["decided_by"]
isOneToOne: false
      referencedRelation: "users"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "dataset_access_requests_requester_id_fkey"
      columns: ["requester_id"]
isOneToOne: false
      referencedRelation: "users"
      referencedColumns: ["id"]
    }
                  ]
                },"dataset_exports": {
                  Row: {
                    "checksum_sha256": string | null,"completed_at": string | null,"created_at": string,"error": string | null,"file_size_bytes": number | null,"format": Database["public"]['Enums']["export_format"],"id": string,"record_count": number | null,"release_id": string,"requested_by": string | null,"status": Database["public"]['Enums']["processing_status"],"storage_bucket": string,"storage_path": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "checksum_sha256"?: string | null,"completed_at"?: string | null,"created_at"?: string,"error"?: string | null,"file_size_bytes"?: number | null,"format": Database["public"]['Enums']["export_format"],"id"?: string,"record_count"?: number | null,"release_id": string,"requested_by"?: string | null,"status"?: Database["public"]['Enums']["processing_status"],"storage_bucket"?: string,"storage_path"?: string | null
                  }
                  Update: {
                    "checksum_sha256"?: string | null,"completed_at"?: string | null,"created_at"?: string,"error"?: string | null,"file_size_bytes"?: number | null,"format"?: Database["public"]['Enums']["export_format"],"id"?: string,"record_count"?: number | null,"release_id"?: string,"requested_by"?: string | null,"status"?: Database["public"]['Enums']["processing_status"],"storage_bucket"?: string,"storage_path"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "dataset_exports_release_id_fkey"
      columns: ["release_id"]
isOneToOne: false
      referencedRelation: "dataset_releases"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "dataset_exports_requested_by_fkey"
      columns: ["requested_by"]
isOneToOne: false
      referencedRelation: "users"
      referencedColumns: ["id"]
    }
                  ]
                },"dataset_items": {
                  Row: {
                    "contribution_id": string,"created_at": string,"id": string,"item_ref": string,"language_code": string,"record": NonNullable<Json>,"release_id": string,"split": Database["public"]['Enums']["data_split"]
                  }
                  ComputedFields: never
                  Insert: {
                    "contribution_id": string,"created_at"?: string,"id"?: string,"item_ref"?: string,"language_code": string,"record": NonNullable<Json>,"release_id": string,"split": Database["public"]['Enums']["data_split"]
                  }
                  Update: {
                    "contribution_id"?: string,"created_at"?: string,"id"?: string,"item_ref"?: string,"language_code"?: string,"record"?: NonNullable<Json>,"release_id"?: string,"split"?: Database["public"]['Enums']["data_split"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "dataset_items_contribution_id_fkey"
      columns: ["contribution_id"]
isOneToOne: false
      referencedRelation: "contributions"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "dataset_items_release_id_fkey"
      columns: ["release_id"]
isOneToOne: false
      referencedRelation: "dataset_releases"
      referencedColumns: ["id"]
    }
                  ]
                },"dataset_releases": {
                  Row: {
                    "approved_at": string | null,"approved_by": string | null,"build_error": string | null,"build_status": Database["public"]['Enums']["processing_status"],"collection_end": string | null,"collection_start": string | null,"created_at": string,"created_by": string | null,"dataset_id": string,"id": string,"language_codes": (string)[],"notes": string,"provenance": NonNullable<Json>,"published_at": string | null,"quality_summary": NonNullable<Json>,"record_count": number,"split_config": NonNullable<Json>,"stats": NonNullable<Json>,"status": Database["public"]['Enums']["release_status"],"updated_at": string,"version": string
                  }
                  ComputedFields: never
                  Insert: {
                    "approved_at"?: string | null,"approved_by"?: string | null,"build_error"?: string | null,"build_status"?: Database["public"]['Enums']["processing_status"],"collection_end"?: string | null,"collection_start"?: string | null,"created_at"?: string,"created_by"?: string | null,"dataset_id": string,"id"?: string,"language_codes"?: (string)[],"notes"?: string,"provenance"?: NonNullable<Json>,"published_at"?: string | null,"quality_summary"?: NonNullable<Json>,"record_count"?: number,"split_config"?: NonNullable<Json>,"stats"?: NonNullable<Json>,"status"?: Database["public"]['Enums']["release_status"],"updated_at"?: string,"version": string
                  }
                  Update: {
                    "approved_at"?: string | null,"approved_by"?: string | null,"build_error"?: string | null,"build_status"?: Database["public"]['Enums']["processing_status"],"collection_end"?: string | null,"collection_start"?: string | null,"created_at"?: string,"created_by"?: string | null,"dataset_id"?: string,"id"?: string,"language_codes"?: (string)[],"notes"?: string,"provenance"?: NonNullable<Json>,"published_at"?: string | null,"quality_summary"?: NonNullable<Json>,"record_count"?: number,"split_config"?: NonNullable<Json>,"stats"?: NonNullable<Json>,"status"?: Database["public"]['Enums']["release_status"],"updated_at"?: string,"version"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "dataset_releases_approved_by_fkey"
      columns: ["approved_by"]
isOneToOne: false
      referencedRelation: "users"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "dataset_releases_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "users"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "dataset_releases_dataset_id_fkey"
      columns: ["dataset_id"]
isOneToOne: false
      referencedRelation: "datasets"
      referencedColumns: ["id"]
    }
                  ]
                },"datasets": {
                  Row: {
                    "access_level": Database["public"]['Enums']["access_level"],"created_at": string,"created_by": string | null,"dataset_type": Database["public"]['Enums']["dataset_type"],"description": string,"id": string,"intended_use": string,"is_active": boolean,"is_benchmark": boolean,"license_id": string | null,"limitations": string,"name": string,"processing_methodology": string,"slug": string,"summary": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "access_level"?: Database["public"]['Enums']["access_level"],"created_at"?: string,"created_by"?: string | null,"dataset_type": Database["public"]['Enums']["dataset_type"],"description"?: string,"id"?: string,"intended_use"?: string,"is_active"?: boolean,"is_benchmark"?: boolean,"license_id"?: string | null,"limitations"?: string,"name": string,"processing_methodology"?: string,"slug": string,"summary"?: string,"updated_at"?: string
                  }
                  Update: {
                    "access_level"?: Database["public"]['Enums']["access_level"],"created_at"?: string,"created_by"?: string | null,"dataset_type"?: Database["public"]['Enums']["dataset_type"],"description"?: string,"id"?: string,"intended_use"?: string,"is_active"?: boolean,"is_benchmark"?: boolean,"license_id"?: string | null,"limitations"?: string,"name"?: string,"processing_methodology"?: string,"slug"?: string,"summary"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "datasets_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "users"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "datasets_license_id_fkey"
      columns: ["license_id"]
isOneToOne: false
      referencedRelation: "data_licenses"
      referencedColumns: ["id"]
    }
                  ]
                },"document_extractions": {
                  Row: {
                    "created_at": string,"document_id": string,"duplicate_of": string | null,"id": string,"is_duplicate": boolean,"kind": Database["public"]['Enums']["extraction_kind"],"metadata": NonNullable<Json>,"normalized_hash": string | null,"ocr_confidence": number | null,"page_number": number | null,"paragraph_index": number | null,"reviewed_at": string | null,"reviewed_by": string | null,"seq": number,"status": Database["public"]['Enums']["item_review_status"],"text": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"document_id": string,"duplicate_of"?: string | null,"id"?: string,"is_duplicate"?: boolean,"kind": Database["public"]['Enums']["extraction_kind"],"metadata"?: NonNullable<Json>,"normalized_hash"?: never,"ocr_confidence"?: number | null,"page_number"?: number | null,"paragraph_index"?: number | null,"reviewed_at"?: string | null,"reviewed_by"?: string | null,"seq": number,"status"?: Database["public"]['Enums']["item_review_status"],"text": string
                  }
                  Update: {
                    "created_at"?: string,"document_id"?: string,"duplicate_of"?: string | null,"id"?: string,"is_duplicate"?: boolean,"kind"?: Database["public"]['Enums']["extraction_kind"],"metadata"?: NonNullable<Json>,"normalized_hash"?: never,"ocr_confidence"?: number | null,"page_number"?: number | null,"paragraph_index"?: number | null,"reviewed_at"?: string | null,"reviewed_by"?: string | null,"seq"?: number,"status"?: Database["public"]['Enums']["item_review_status"],"text"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "document_extractions_document_id_fkey"
      columns: ["document_id"]
isOneToOne: false
      referencedRelation: "documents"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "document_extractions_reviewed_by_fkey"
      columns: ["reviewed_by"]
isOneToOne: false
      referencedRelation: "users"
      referencedColumns: ["id"]
    }
                  ]
                },"documents": {
                  Row: {
                    "author": string,"checksum_sha256": string | null,"contribution_id": string,"copyright_status": Database["public"]['Enums']["copyright_status"],"created_at": string,"extracted_at": string | null,"extraction_error": string | null,"extraction_stats": NonNullable<Json>,"extraction_status": Database["public"]['Enums']["processing_status"],"file_size_bytes": number,"file_type": string,"genre": string,"id": string,"is_poetry": boolean,"is_scanned": boolean,"isbn": string,"license_id": string | null,"mime_type": string,"original_filename": string,"page_count": number | null,"permission_ai_training": boolean,"permission_to_digitise": boolean,"publication_year": number | null,"publisher": string,"rights_notes": string,"rights_status": Database["public"]['Enums']["rights_status"],"rights_verified_at": string | null,"rights_verified_by": string | null,"source": string,"storage_bucket": string,"storage_path": string,"title": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "author"?: string,"checksum_sha256"?: string | null,"contribution_id": string,"copyright_status"?: Database["public"]['Enums']["copyright_status"],"created_at"?: string,"extracted_at"?: string | null,"extraction_error"?: string | null,"extraction_stats"?: NonNullable<Json>,"extraction_status"?: Database["public"]['Enums']["processing_status"],"file_size_bytes": number,"file_type": string,"genre"?: string,"id"?: string,"is_poetry"?: boolean,"is_scanned"?: boolean,"isbn"?: string,"license_id"?: string | null,"mime_type": string,"original_filename": string,"page_count"?: number | null,"permission_ai_training"?: boolean,"permission_to_digitise"?: boolean,"publication_year"?: number | null,"publisher"?: string,"rights_notes"?: string,"rights_status"?: Database["public"]['Enums']["rights_status"],"rights_verified_at"?: string | null,"rights_verified_by"?: string | null,"source"?: string,"storage_bucket"?: string,"storage_path": string,"title": string,"updated_at"?: string
                  }
                  Update: {
                    "author"?: string,"checksum_sha256"?: string | null,"contribution_id"?: string,"copyright_status"?: Database["public"]['Enums']["copyright_status"],"created_at"?: string,"extracted_at"?: string | null,"extraction_error"?: string | null,"extraction_stats"?: NonNullable<Json>,"extraction_status"?: Database["public"]['Enums']["processing_status"],"file_size_bytes"?: number,"file_type"?: string,"genre"?: string,"id"?: string,"is_poetry"?: boolean,"is_scanned"?: boolean,"isbn"?: string,"license_id"?: string | null,"mime_type"?: string,"original_filename"?: string,"page_count"?: number | null,"permission_ai_training"?: boolean,"permission_to_digitise"?: boolean,"publication_year"?: number | null,"publisher"?: string,"rights_notes"?: string,"rights_status"?: Database["public"]['Enums']["rights_status"],"rights_verified_at"?: string | null,"rights_verified_by"?: string | null,"source"?: string,"storage_bucket"?: string,"storage_path"?: string,"title"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "documents_contribution_id_fkey"
      columns: ["contribution_id"]
isOneToOne: true
      referencedRelation: "contributions"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "documents_license_id_fkey"
      columns: ["license_id"]
isOneToOne: false
      referencedRelation: "data_licenses"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "documents_rights_verified_by_fkey"
      columns: ["rights_verified_by"]
isOneToOne: false
      referencedRelation: "users"
      referencedColumns: ["id"]
    }
                  ]
                },"evaluations": {
                  Row: {
                    "benchmark_dataset_id": string | null,"benchmark_name": string,"created_at": string,"created_by": string | null,"id": string,"language_code": string,"metrics": NonNullable<Json>,"model_id": string,"notes": string,"training_run_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "benchmark_dataset_id"?: string | null,"benchmark_name": string,"created_at"?: string,"created_by"?: string | null,"id"?: string,"language_code": string,"metrics"?: NonNullable<Json>,"model_id": string,"notes"?: string,"training_run_id"?: string | null
                  }
                  Update: {
                    "benchmark_dataset_id"?: string | null,"benchmark_name"?: string,"created_at"?: string,"created_by"?: string | null,"id"?: string,"language_code"?: string,"metrics"?: NonNullable<Json>,"model_id"?: string,"notes"?: string,"training_run_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "evaluations_benchmark_dataset_id_fkey"
      columns: ["benchmark_dataset_id"]
isOneToOne: false
      referencedRelation: "datasets"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "evaluations_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "users"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "evaluations_model_id_fkey"
      columns: ["model_id"]
isOneToOne: false
      referencedRelation: "models"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "evaluations_training_run_id_fkey"
      columns: ["training_run_id"]
isOneToOne: false
      referencedRelation: "training_runs"
      referencedColumns: ["id"]
    }
                  ]
                },"language_varieties": {
                  Row: {
                    "code": string,"created_at": string,"description": string,"id": string,"is_active": boolean,"language_id": string,"name": string,"region": string
                  }
                  ComputedFields: never
                  Insert: {
                    "code": string,"created_at"?: string,"description"?: string,"id"?: string,"is_active"?: boolean,"language_id": string,"name": string,"region"?: string
                  }
                  Update: {
                    "code"?: string,"created_at"?: string,"description"?: string,"id"?: string,"is_active"?: boolean,"language_id"?: string,"name"?: string,"region"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "language_varieties_language_id_fkey"
      columns: ["language_id"]
isOneToOne: false
      referencedRelation: "languages"
      referencedColumns: ["id"]
    }
                  ]
                },"languages": {
                  Row: {
                    "code": string,"countries": (string)[],"created_at": string,"description": string,"family": string,"id": string,"is_active": boolean,"is_official_za": boolean,"is_priority": boolean,"iso639_3": string,"name": string,"native_name": string,"region": string,"script": string,"sort_order": number,"speakers_note": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "code": string,"countries"?: (string)[],"created_at"?: string,"description"?: string,"family"?: string,"id"?: string,"is_active"?: boolean,"is_official_za"?: boolean,"is_priority"?: boolean,"iso639_3": string,"name": string,"native_name": string,"region"?: string,"script"?: string,"sort_order"?: number,"speakers_note"?: string,"updated_at"?: string
                  }
                  Update: {
                    "code"?: string,"countries"?: (string)[],"created_at"?: string,"description"?: string,"family"?: string,"id"?: string,"is_active"?: boolean,"is_official_za"?: boolean,"is_priority"?: boolean,"iso639_3"?: string,"name"?: string,"native_name"?: string,"region"?: string,"script"?: string,"sort_order"?: number,"speakers_note"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"models": {
                  Row: {
                    "architecture": string,"base_model": string,"created_at": string,"created_by": string | null,"description": string,"hf_repo": string,"id": string,"language_codes": (string)[],"name": string,"parameter_count": number | null,"slug": string,"status": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "architecture"?: string,"base_model"?: string,"created_at"?: string,"created_by"?: string | null,"description"?: string,"hf_repo"?: string,"id"?: string,"language_codes"?: (string)[],"name": string,"parameter_count"?: number | null,"slug": string,"status"?: string,"updated_at"?: string
                  }
                  Update: {
                    "architecture"?: string,"base_model"?: string,"created_at"?: string,"created_by"?: string | null,"description"?: string,"hf_repo"?: string,"id"?: string,"language_codes"?: (string)[],"name"?: string,"parameter_count"?: number | null,"slug"?: string,"status"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "models_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "users"
      referencedColumns: ["id"]
    }
                  ]
                },"processing_jobs": {
                  Row: {
                    "attempts": number,"created_at": string,"created_by": string | null,"entity_id": string,"error": string | null,"finished_at": string | null,"id": string,"job_type": Database["public"]['Enums']["job_type"],"locked_at": string | null,"max_attempts": number,"payload": NonNullable<Json>,"result": NonNullable<Json>,"started_at": string | null,"status": Database["public"]['Enums']["processing_status"]
                  }
                  ComputedFields: never
                  Insert: {
                    "attempts"?: number,"created_at"?: string,"created_by"?: string | null,"entity_id": string,"error"?: string | null,"finished_at"?: string | null,"id"?: string,"job_type": Database["public"]['Enums']["job_type"],"locked_at"?: string | null,"max_attempts"?: number,"payload"?: NonNullable<Json>,"result"?: NonNullable<Json>,"started_at"?: string | null,"status"?: Database["public"]['Enums']["processing_status"]
                  }
                  Update: {
                    "attempts"?: number,"created_at"?: string,"created_by"?: string | null,"entity_id"?: string,"error"?: string | null,"finished_at"?: string | null,"id"?: string,"job_type"?: Database["public"]['Enums']["job_type"],"locked_at"?: string | null,"max_attempts"?: number,"payload"?: NonNullable<Json>,"result"?: NonNullable<Json>,"started_at"?: string | null,"status"?: Database["public"]['Enums']["processing_status"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "processing_jobs_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "users"
      referencedColumns: ["id"]
    }
                  ]
                },"quality_checks": {
                  Row: {
                    "check_type": string,"checked_by": string | null,"contribution_id": string,"created_at": string,"details": NonNullable<Json>,"id": string,"passed": boolean,"score": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "check_type": string,"checked_by"?: string | null,"contribution_id": string,"created_at"?: string,"details"?: NonNullable<Json>,"id"?: string,"passed": boolean,"score"?: number | null
                  }
                  Update: {
                    "check_type"?: string,"checked_by"?: string | null,"contribution_id"?: string,"created_at"?: string,"details"?: NonNullable<Json>,"id"?: string,"passed"?: boolean,"score"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "quality_checks_checked_by_fkey"
      columns: ["checked_by"]
isOneToOne: false
      referencedRelation: "users"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "quality_checks_contribution_id_fkey"
      columns: ["contribution_id"]
isOneToOne: false
      referencedRelation: "contributions"
      referencedColumns: ["id"]
    }
                  ]
                },"rate_limits": {
                  Row: {
                    "bucket": string,"hits": number,"id": string,"window_start": string
                  }
                  ComputedFields: never
                  Insert: {
                    "bucket": string,"hits"?: number,"id"?: string,"window_start"?: string
                  }
                  Update: {
                    "bucket"?: string,"hits"?: number,"id"?: string,"window_start"?: string
                  }
                  Relationships: [
                    
                  ]
                },"review_assignments": {
                  Row: {
                    "assigned_by": string | null,"completed_at": string | null,"contribution_id": string,"created_at": string,"id": string,"reviewer_id": string,"status": string
                  }
                  ComputedFields: never
                  Insert: {
                    "assigned_by"?: string | null,"completed_at"?: string | null,"contribution_id": string,"created_at"?: string,"id"?: string,"reviewer_id": string,"status"?: string
                  }
                  Update: {
                    "assigned_by"?: string | null,"completed_at"?: string | null,"contribution_id"?: string,"created_at"?: string,"id"?: string,"reviewer_id"?: string,"status"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "review_assignments_assigned_by_fkey"
      columns: ["assigned_by"]
isOneToOne: false
      referencedRelation: "users"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "review_assignments_contribution_id_fkey"
      columns: ["contribution_id"]
isOneToOne: false
      referencedRelation: "contributions"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "review_assignments_reviewer_id_fkey"
      columns: ["reviewer_id"]
isOneToOne: false
      referencedRelation: "users"
      referencedColumns: ["id"]
    }
                  ]
                },"reviews": {
                  Row: {
                    "comment": string,"contribution_id": string,"created_at": string,"decision": Database["public"]['Enums']["review_decision"],"id": string,"new_status": Database["public"]['Enums']["contribution_status"] | null,"previous_status": Database["public"]['Enums']["contribution_status"] | null,"reviewer_id": string,"scores": NonNullable<Json>,"text_version": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "comment"?: string,"contribution_id": string,"created_at"?: string,"decision": Database["public"]['Enums']["review_decision"],"id"?: string,"new_status"?: Database["public"]['Enums']["contribution_status"] | null,"previous_status"?: Database["public"]['Enums']["contribution_status"] | null,"reviewer_id": string,"scores"?: NonNullable<Json>,"text_version"?: number | null
                  }
                  Update: {
                    "comment"?: string,"contribution_id"?: string,"created_at"?: string,"decision"?: Database["public"]['Enums']["review_decision"],"id"?: string,"new_status"?: Database["public"]['Enums']["contribution_status"] | null,"previous_status"?: Database["public"]['Enums']["contribution_status"] | null,"reviewer_id"?: string,"scores"?: NonNullable<Json>,"text_version"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "reviews_contribution_id_fkey"
      columns: ["contribution_id"]
isOneToOne: false
      referencedRelation: "contributions"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "reviews_reviewer_id_fkey"
      columns: ["reviewer_id"]
isOneToOne: false
      referencedRelation: "users"
      referencedColumns: ["id"]
    }
                  ]
                },"roles": {
                  Row: {
                    "created_at": string,"description": string,"id": string,"key": Database["public"]['Enums']["app_role"],"name": string,"rank": number
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"description"?: string,"id"?: string,"key": Database["public"]['Enums']["app_role"],"name": string,"rank"?: number
                  }
                  Update: {
                    "created_at"?: string,"description"?: string,"id"?: string,"key"?: Database["public"]['Enums']["app_role"],"name"?: string,"rank"?: number
                  }
                  Relationships: [
                    
                  ]
                },"system_settings": {
                  Row: {
                    "description": string,"id": string,"is_public": boolean,"key": string,"updated_at": string,"updated_by": string | null,"value": NonNullable<Json>
                  }
                  ComputedFields: never
                  Insert: {
                    "description"?: string,"id"?: string,"is_public"?: boolean,"key": string,"updated_at"?: string,"updated_by"?: string | null,"value": NonNullable<Json>
                  }
                  Update: {
                    "description"?: string,"id"?: string,"is_public"?: boolean,"key"?: string,"updated_at"?: string,"updated_by"?: string | null,"value"?: NonNullable<Json>
                  }
                  Relationships: [
                    {
      foreignKeyName: "system_settings_updated_by_fkey"
      columns: ["updated_by"]
isOneToOne: false
      referencedRelation: "users"
      referencedColumns: ["id"]
    }
                  ]
                },"text_content": {
                  Row: {
                    "body": string,"change_note": string,"char_count": number | null,"context": string,"contribution_id": string,"created_at": string,"created_by": string,"id": string,"is_original": boolean,"normalized_hash": string | null,"version": number,"word_count": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "body": string,"change_note"?: string,"char_count"?: never,"context"?: string,"contribution_id": string,"created_at"?: string,"created_by": string,"id"?: string,"is_original"?: boolean,"normalized_hash"?: never,"version": number,"word_count"?: never
                  }
                  Update: {
                    "body"?: string,"change_note"?: string,"char_count"?: never,"context"?: string,"contribution_id"?: string,"created_at"?: string,"created_by"?: string,"id"?: string,"is_original"?: boolean,"normalized_hash"?: never,"version"?: number,"word_count"?: never
                  }
                  Relationships: [
                    {
      foreignKeyName: "text_content_contribution_id_fkey"
      columns: ["contribution_id"]
isOneToOne: false
      referencedRelation: "contributions"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "text_content_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "users"
      referencedColumns: ["id"]
    }
                  ]
                },"training_runs": {
                  Row: {
                    "compute_notes": string,"config": NonNullable<Json>,"created_at": string,"created_by": string | null,"dataset_release_id": string | null,"finished_at": string | null,"id": string,"method": string,"metrics": NonNullable<Json>,"model_id": string,"started_at": string | null,"status": string
                  }
                  ComputedFields: never
                  Insert: {
                    "compute_notes"?: string,"config"?: NonNullable<Json>,"created_at"?: string,"created_by"?: string | null,"dataset_release_id"?: string | null,"finished_at"?: string | null,"id"?: string,"method"?: string,"metrics"?: NonNullable<Json>,"model_id": string,"started_at"?: string | null,"status"?: string
                  }
                  Update: {
                    "compute_notes"?: string,"config"?: NonNullable<Json>,"created_at"?: string,"created_by"?: string | null,"dataset_release_id"?: string | null,"finished_at"?: string | null,"id"?: string,"method"?: string,"metrics"?: NonNullable<Json>,"model_id"?: string,"started_at"?: string | null,"status"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "training_runs_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "users"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "training_runs_dataset_release_id_fkey"
      columns: ["dataset_release_id"]
isOneToOne: false
      referencedRelation: "dataset_releases"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "training_runs_model_id_fkey"
      columns: ["model_id"]
isOneToOne: false
      referencedRelation: "models"
      referencedColumns: ["id"]
    }
                  ]
                },"translation_sources": {
                  Row: {
                    "created_at": string,"created_by": string | null,"domain": string,"id": string,"is_active": boolean,"language_id": string,"notes": string,"text": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"created_by"?: string | null,"domain"?: string,"id"?: string,"is_active"?: boolean,"language_id": string,"notes"?: string,"text": string
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string | null,"domain"?: string,"id"?: string,"is_active"?: boolean,"language_id"?: string,"notes"?: string,"text"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "translation_sources_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "users"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "translation_sources_language_id_fkey"
      columns: ["language_id"]
isOneToOne: false
      referencedRelation: "languages"
      referencedColumns: ["id"]
    }
                  ]
                },"translations": {
                  Row: {
                    "contribution_id": string,"created_at": string,"domain": string,"id": string,"notes": string,"source_hash": string | null,"source_id": string | null,"source_language_id": string,"source_text": string,"target_language_id": string,"target_text": string
                  }
                  ComputedFields: never
                  Insert: {
                    "contribution_id": string,"created_at"?: string,"domain"?: string,"id"?: string,"notes"?: string,"source_hash"?: never,"source_id"?: string | null,"source_language_id": string,"source_text": string,"target_language_id": string,"target_text": string
                  }
                  Update: {
                    "contribution_id"?: string,"created_at"?: string,"domain"?: string,"id"?: string,"notes"?: string,"source_hash"?: never,"source_id"?: string | null,"source_language_id"?: string,"source_text"?: string,"target_language_id"?: string,"target_text"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "translations_contribution_id_fkey"
      columns: ["contribution_id"]
isOneToOne: true
      referencedRelation: "contributions"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "translations_source_id_fkey"
      columns: ["source_id"]
isOneToOne: false
      referencedRelation: "translation_sources"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "translations_source_language_id_fkey"
      columns: ["source_language_id"]
isOneToOne: false
      referencedRelation: "languages"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "translations_target_language_id_fkey"
      columns: ["target_language_id"]
isOneToOne: false
      referencedRelation: "languages"
      referencedColumns: ["id"]
    }
                  ]
                },"user_languages": {
                  Row: {
                    "created_at": string,"id": string,"language_id": string,"proficiency": Database["public"]['Enums']["proficiency_level"],"user_id": string,"variety_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"language_id": string,"proficiency"?: Database["public"]['Enums']["proficiency_level"],"user_id": string,"variety_id"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"language_id"?: string,"proficiency"?: Database["public"]['Enums']["proficiency_level"],"user_id"?: string,"variety_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "user_languages_language_id_fkey"
      columns: ["language_id"]
isOneToOne: false
      referencedRelation: "languages"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "user_languages_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "users"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "user_languages_variety_id_fkey"
      columns: ["variety_id"]
isOneToOne: false
      referencedRelation: "language_varieties"
      referencedColumns: ["id"]
    }
                  ]
                },"user_roles": {
                  Row: {
                    "created_at": string,"granted_by": string | null,"id": string,"role_id": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"granted_by"?: string | null,"id"?: string,"role_id": string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"granted_by"?: string | null,"id"?: string,"role_id"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "user_roles_granted_by_fkey"
      columns: ["granted_by"]
isOneToOne: false
      referencedRelation: "users"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "user_roles_role_id_fkey"
      columns: ["role_id"]
isOneToOne: false
      referencedRelation: "roles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "user_roles_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "users"
      referencedColumns: ["id"]
    }
                  ]
                },"users": {
                  Row: {
                    "affiliation": string,"bio": string,"country_code": string,"created_at": string,"display_name": string,"id": string,"is_active": boolean,"onboarded_at": string | null,"public_handle": string | null,"region": string,"show_in_recognition": boolean,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "affiliation"?: string,"bio"?: string,"country_code"?: string,"created_at"?: string,"display_name"?: string,"id": string,"is_active"?: boolean,"onboarded_at"?: string | null,"public_handle"?: string | null,"region"?: string,"show_in_recognition"?: boolean,"updated_at"?: string
                  }
                  Update: {
                    "affiliation"?: string,"bio"?: string,"country_code"?: string,"created_at"?: string,"display_name"?: string,"id"?: string,"is_active"?: boolean,"onboarded_at"?: string | null,"public_handle"?: string | null,"region"?: string,"show_in_recognition"?: boolean,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "admin_activity_series":
{ Args: { "p_days"?: number }; Returns: {
              "approvals": number,"day": string,"reviews": number,"signups": number,"submissions": number
            }[]
                           },
"admin_list_users":
{ Args: { "p_limit"?: number,"p_offset"?: number,"p_search"?: string }; Returns: {
              "affiliation": string,"contribution_count": number,"created_at": string,"display_name": string,"email": string,"email_confirmed": boolean,"id": string,"is_active": boolean,"last_sign_in_at": string,"roles": (Database["public"]['Enums']["app_role"])[],"total_count": number
            }[]
                           },
"approve_release":
{ Args: { "p_publish"?: boolean,"p_release_id": string }; Returns: undefined
                           },
"assign_reviewer":
{ Args: { "p_contribution_id": string,"p_reviewer_id": string }; Returns: undefined
                           },
"can_access_dataset":
{ Args: { "p_dataset_id": string }; Returns: boolean
                           },
"can_see_restricted":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"can_view_contribution":
{ Args: { "cid": string }; Returns: boolean
                           },
"check_rate_limit":
{ Args: { "p_bucket": string,"p_max": number,"p_window_seconds": number }; Returns: boolean
                           },
"claim_next_job":
{ Args: { "p_types"?: (Database["public"]['Enums']["job_type"])[] }; Returns: {
              "attempts": number,
"created_at": string,
"created_by": string | null,
"entity_id": string,
"error": string | null,
"finished_at": string | null,
"id": string,
"job_type": Database["public"]['Enums']["job_type"],
"locked_at": string | null,
"max_attempts": number,
"payload": NonNullable<Json>,
"result": NonNullable<Json>,
"started_at": string | null,
"status": Database["public"]['Enums']["processing_status"]
            }
                          SetofOptions: {
        from: "*"
        to: "processing_jobs"
        isOneToOne: true
        isSetofReturn: false
      } },
"claim_review":
{ Args: { "p_contribution_id": string }; Returns: undefined
                           },
"content_hash":
{ Args: { "input": string }; Returns: string
                           },
"current_roles":
{ Args: Record<PropertyKey, never>; Returns: (Database["public"]['Enums']["app_role"])[]
                           },
"decide_access_request":
{ Args: { "p_days"?: number,"p_note": string,"p_request_id": string,"p_status": Database["public"]['Enums']["request_status"] }; Returns: undefined
                           },
"has_any_role":
{ Args: { "wanted": (Database["public"]['Enums']["app_role"])[] }; Returns: boolean
                           },
"has_role":
{ Args: { "wanted": Database["public"]['Enums']["app_role"] }; Returns: boolean
                           },
"is_admin":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"is_privileged_context":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"is_researcher":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"is_reviewer":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"language_stats":
{ Args: Record<PropertyKey, never>; Returns: {
              "approved": number,"audio_seconds": number,"code": string,"name": string,"submissions": number
            }[]
                           },
"owns_open_contribution":
{ Args: { "cid": string }; Returns: boolean
                           },
"platform_stats":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"resubmit_contribution":
{ Args: { "p_body": string,"p_contribution_id": string,"p_note"?: string }; Returns: number
                           },
"retire_release":
{ Args: { "p_release_id": string }; Returns: undefined
                           },
"review_extractions":
{ Args: { "p_ids": (string)[],"p_status": Database["public"]['Enums']["item_review_status"] }; Returns: number
                           },
"reviewer_workload":
{ Args: Record<PropertyKey, never>; Returns: {
              "active_assignments": number,"approvals_30d": number,"display_name": string,"reviewer_id": string,"reviews_30d": number
            }[]
                           },
"set_user_active":
{ Args: { "p_active": boolean,"p_user_id": string }; Returns: undefined
                           },
"set_user_role":
{ Args: { "p_grant": boolean,"p_role": Database["public"]['Enums']["app_role"],"p_user_id": string }; Returns: undefined
                           },
"submit_contribution":
{ Args: { "p": Json }; Returns: string
                           },
"submit_review":
{ Args: { "p_comment"?: string,"p_contribution_id": string,"p_corrected_text"?: string,"p_decision": Database["public"]['Enums']["review_decision"],"p_scores"?: Json,"p_sensitivity"?: Database["public"]['Enums']["sensitivity_level"] }; Returns: string
                           },
"top_contributors":
{ Args: { "p_limit"?: number }; Returns: {
              "approved": number,"display_name": string,"languages": (string)[],"public_handle": string
            }[]
                           },
"verify_document_rights":
{ Args: { "p_ai_training"?: boolean,"p_copyright"?: Database["public"]['Enums']["copyright_status"],"p_document_id": string,"p_license"?: string,"p_notes": string,"p_status": Database["public"]['Enums']["rights_status"] }; Returns: undefined
                           },
"word_count":
{ Args: { "input": string }; Returns: number
                           },
"write_audit":
{ Args: { "p_action": string,"p_details"?: Json,"p_entity": string,"p_entity_id": string }; Returns: undefined
                           }
          }
          Enums: {
            "access_level": "public"|"registered"|"restricted","app_role": "contributor"|"translator"|"reviewer"|"linguist"|"researcher"|"admin"|"super_admin","consent_type": "platform_terms"|"data_collection"|"research_use"|"public_publication"|"ai_training"|"commercial_use"|"audio_recording","contribution_status": "draft"|"submitted"|"in_review"|"changes_requested"|"approved"|"rejected"|"withdrawn","contribution_type": "text"|"document"|"audio"|"translation"|"conversation"|"cultural","copyright_status": "own_work"|"public_domain"|"open_licence"|"copyrighted_with_permission"|"copyrighted_no_permission"|"unknown","cultural_kind": "proverb"|"idiom"|"folklore"|"traditional_story"|"greeting"|"historical_expression"|"indigenous_term"|"oral_history","data_layer": "raw"|"validated"|"curated"|"model_ready","data_split": "train"|"validation"|"test","dataset_type": "monolingual_text"|"parallel_text"|"conversation"|"instruction"|"cultural"|"speech","export_format": "csv"|"json"|"jsonl"|"txt"|"parquet"|"wav","extraction_kind": "heading"|"paragraph"|"sentence"|"stanza"|"line","item_review_status": "pending"|"approved"|"rejected","job_type": "document_extract"|"audio_analyze"|"audio_transcribe"|"dataset_build"|"dataset_export","processing_status": "pending"|"queued"|"processing"|"completed"|"failed"|"not_applicable","proficiency_level": "native"|"fluent"|"intermediate"|"learner","release_status": "draft"|"pending_approval"|"approved"|"published"|"retired","request_status": "pending"|"approved"|"rejected"|"revoked","review_decision": "approve"|"reject"|"request_changes"|"comment","rights_status": "unverified"|"pending_verification"|"verified"|"rejected","sensitivity_level": "public"|"community"|"restricted"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            "access_level": ["public", "registered", "restricted"],"app_role": ["contributor", "translator", "reviewer", "linguist", "researcher", "admin", "super_admin"],"consent_type": ["platform_terms", "data_collection", "research_use", "public_publication", "ai_training", "commercial_use", "audio_recording"],"contribution_status": ["draft", "submitted", "in_review", "changes_requested", "approved", "rejected", "withdrawn"],"contribution_type": ["text", "document", "audio", "translation", "conversation", "cultural"],"copyright_status": ["own_work", "public_domain", "open_licence", "copyrighted_with_permission", "copyrighted_no_permission", "unknown"],"cultural_kind": ["proverb", "idiom", "folklore", "traditional_story", "greeting", "historical_expression", "indigenous_term", "oral_history"],"data_layer": ["raw", "validated", "curated", "model_ready"],"data_split": ["train", "validation", "test"],"dataset_type": ["monolingual_text", "parallel_text", "conversation", "instruction", "cultural", "speech"],"export_format": ["csv", "json", "jsonl", "txt", "parquet", "wav"],"extraction_kind": ["heading", "paragraph", "sentence", "stanza", "line"],"item_review_status": ["pending", "approved", "rejected"],"job_type": ["document_extract", "audio_analyze", "audio_transcribe", "dataset_build", "dataset_export"],"processing_status": ["pending", "queued", "processing", "completed", "failed", "not_applicable"],"proficiency_level": ["native", "fluent", "intermediate", "learner"],"release_status": ["draft", "pending_approval", "approved", "published", "retired"],"request_status": ["pending", "approved", "rejected", "revoked"],"review_decision": ["approve", "reject", "request_changes", "comment"],"rights_status": ["unverified", "pending_verification", "verified", "rejected"],"sensitivity_level": ["public", "community", "restricted"]
          }
        }
} as const
