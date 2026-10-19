
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
            "account_restrictions": {
                  Row: {
                    "created_at": string,"created_by": string | null,"reason": string,"until": string | null,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"created_by"?: string | null,"reason": string,"until"?: string | null,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string | null,"reason"?: string,"until"?: string | null,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "account_restrictions_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "author_balances"
      referencedColumns: ["author_id"]
    },{
      foreignKeyName: "account_restrictions_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "account_restrictions_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "public_authors"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "account_restrictions_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "account_restrictions_user_id_fkey"
      columns: ["user_id"]
isOneToOne: true
      referencedRelation: "author_balances"
      referencedColumns: ["author_id"]
    },{
      foreignKeyName: "account_restrictions_user_id_fkey"
      columns: ["user_id"]
isOneToOne: true
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "account_restrictions_user_id_fkey"
      columns: ["user_id"]
isOneToOne: true
      referencedRelation: "public_authors"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "account_restrictions_user_id_fkey"
      columns: ["user_id"]
isOneToOne: true
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"article_book_clicks": {
                  Row: {
                    "article_id": string,"book_id": string | null,"day": string,"viewer_key": string
                  }
                  ComputedFields: never
                  Insert: {
                    "article_id": string,"book_id"?: string | null,"day"?: string,"viewer_key": string
                  }
                  Update: {
                    "article_id"?: string,"book_id"?: string | null,"day"?: string,"viewer_key"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "article_book_clicks_article_id_fkey"
      columns: ["article_id"]
isOneToOne: false
      referencedRelation: "articles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "article_book_clicks_book_id_fkey"
      columns: ["book_id"]
isOneToOne: false
      referencedRelation: "books"
      referencedColumns: ["id"]
    }
                  ]
                },"article_bookmarks": {
                  Row: {
                    "article_id": string,"created_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "article_id": string,"created_at"?: string,"user_id": string
                  }
                  Update: {
                    "article_id"?: string,"created_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "article_bookmarks_article_id_fkey"
      columns: ["article_id"]
isOneToOne: false
      referencedRelation: "articles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "article_bookmarks_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "author_balances"
      referencedColumns: ["author_id"]
    },{
      foreignKeyName: "article_bookmarks_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "article_bookmarks_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "public_authors"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "article_bookmarks_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"article_comments": {
                  Row: {
                    "article_id": string,"body": string,"created_at": string,"edited_at": string | null,"id": string,"moderation": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "article_id": string,"body": string,"created_at"?: string,"edited_at"?: string | null,"id"?: string,"moderation"?: string,"user_id": string
                  }
                  Update: {
                    "article_id"?: string,"body"?: string,"created_at"?: string,"edited_at"?: string | null,"id"?: string,"moderation"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "article_comments_article_id_fkey"
      columns: ["article_id"]
isOneToOne: false
      referencedRelation: "articles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "article_comments_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "author_balances"
      referencedColumns: ["author_id"]
    },{
      foreignKeyName: "article_comments_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "article_comments_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "public_authors"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "article_comments_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"article_likes": {
                  Row: {
                    "article_id": string,"created_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "article_id": string,"created_at"?: string,"user_id": string
                  }
                  Update: {
                    "article_id"?: string,"created_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "article_likes_article_id_fkey"
      columns: ["article_id"]
isOneToOne: false
      referencedRelation: "articles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "article_likes_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "author_balances"
      referencedColumns: ["author_id"]
    },{
      foreignKeyName: "article_likes_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "article_likes_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "public_authors"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "article_likes_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"article_views": {
                  Row: {
                    "article_id": string,"day": string,"viewer_key": string
                  }
                  ComputedFields: never
                  Insert: {
                    "article_id": string,"day"?: string,"viewer_key": string
                  }
                  Update: {
                    "article_id"?: string,"day"?: string,"viewer_key"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "article_views_article_id_fkey"
      columns: ["article_id"]
isOneToOne: false
      referencedRelation: "articles"
      referencedColumns: ["id"]
    }
                  ]
                },"articles": {
                  Row: {
                    "author_id": string,"body": NonNullable<Json>,"body_md": string,"content_updated_at": string | null,"cover_alt": string | null,"cover_path": string | null,"created_at": string,"excerpt": string,"first_published_at": string | null,"id": string,"language": string,"moderation": string,"moderation_reason": string | null,"published_at": string | null,"related_book_id": string | null,"rights_confirmed_at": string | null,"short_id": string,"slug": string,"status": string,"tags": (string)[],"title": string,"topic": string | null,"updated_at": string,"word_count": number
                  }
                  ComputedFields: never
                  Insert: {
                    "author_id": string,"body"?: NonNullable<Json>,"body_md"?: string,"content_updated_at"?: string | null,"cover_alt"?: string | null,"cover_path"?: string | null,"created_at"?: string,"excerpt"?: string,"first_published_at"?: string | null,"id"?: string,"language"?: string,"moderation"?: string,"moderation_reason"?: string | null,"published_at"?: string | null,"related_book_id"?: string | null,"rights_confirmed_at"?: string | null,"short_id"?: string,"slug"?: string,"status"?: string,"tags"?: (string)[],"title"?: string,"topic"?: string | null,"updated_at"?: string,"word_count"?: number
                  }
                  Update: {
                    "author_id"?: string,"body"?: NonNullable<Json>,"body_md"?: string,"content_updated_at"?: string | null,"cover_alt"?: string | null,"cover_path"?: string | null,"created_at"?: string,"excerpt"?: string,"first_published_at"?: string | null,"id"?: string,"language"?: string,"moderation"?: string,"moderation_reason"?: string | null,"published_at"?: string | null,"related_book_id"?: string | null,"rights_confirmed_at"?: string | null,"short_id"?: string,"slug"?: string,"status"?: string,"tags"?: (string)[],"title"?: string,"topic"?: string | null,"updated_at"?: string,"word_count"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "articles_author_id_fkey"
      columns: ["author_id"]
isOneToOne: false
      referencedRelation: "author_balances"
      referencedColumns: ["author_id"]
    },{
      foreignKeyName: "articles_author_id_fkey"
      columns: ["author_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "articles_author_id_fkey"
      columns: ["author_id"]
isOneToOne: false
      referencedRelation: "public_authors"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "articles_author_id_fkey"
      columns: ["author_id"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "articles_related_book_id_fkey"
      columns: ["related_book_id"]
isOneToOne: false
      referencedRelation: "books"
      referencedColumns: ["id"]
    }
                  ]
                },"audit_log": {
                  Row: {
                    "action": string,"actor_id": string | null,"created_at": string,"details": NonNullable<Json>,"entity": string,"entity_id": string | null,"id": number
                  }
                  ComputedFields: never
                  Insert: {
                    "action": string,"actor_id"?: string | null,"created_at"?: string,"details"?: NonNullable<Json>,"entity": string,"entity_id"?: string | null,"id"?: number
                  }
                  Update: {
                    "action"?: string,"actor_id"?: string | null,"created_at"?: string,"details"?: NonNullable<Json>,"entity"?: string,"entity_id"?: string | null,"id"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "audit_log_actor_id_fkey"
      columns: ["actor_id"]
isOneToOne: false
      referencedRelation: "author_balances"
      referencedColumns: ["author_id"]
    },{
      foreignKeyName: "audit_log_actor_id_fkey"
      columns: ["actor_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "audit_log_actor_id_fkey"
      columns: ["actor_id"]
isOneToOne: false
      referencedRelation: "public_authors"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "audit_log_actor_id_fkey"
      columns: ["actor_id"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"author_applications": {
                  Row: {
                    "bio": string,"created_at": string,"decision_note": string | null,"evidence": string,"id": string,"language": string,"pen_name": string,"reviewed_at": string | null,"reviewed_by": string | null,"status": string,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "bio": string,"created_at"?: string,"decision_note"?: string | null,"evidence": string,"id"?: string,"language": string,"pen_name": string,"reviewed_at"?: string | null,"reviewed_by"?: string | null,"status"?: string,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "bio"?: string,"created_at"?: string,"decision_note"?: string | null,"evidence"?: string,"id"?: string,"language"?: string,"pen_name"?: string,"reviewed_at"?: string | null,"reviewed_by"?: string | null,"status"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "author_applications_reviewed_by_fkey"
      columns: ["reviewed_by"]
isOneToOne: false
      referencedRelation: "author_balances"
      referencedColumns: ["author_id"]
    },{
      foreignKeyName: "author_applications_reviewed_by_fkey"
      columns: ["reviewed_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "author_applications_reviewed_by_fkey"
      columns: ["reviewed_by"]
isOneToOne: false
      referencedRelation: "public_authors"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "author_applications_reviewed_by_fkey"
      columns: ["reviewed_by"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "author_applications_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "author_balances"
      referencedColumns: ["author_id"]
    },{
      foreignKeyName: "author_applications_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "author_applications_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "public_authors"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "author_applications_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"author_verification_events": {
                  Row: {
                    "actor_id": string | null,"application_id": string | null,"created_at": string,"id": number,"note": string | null,"status": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "actor_id"?: string | null,"application_id"?: string | null,"created_at"?: string,"id"?: number,"note"?: string | null,"status": string,"user_id": string
                  }
                  Update: {
                    "actor_id"?: string | null,"application_id"?: string | null,"created_at"?: string,"id"?: number,"note"?: string | null,"status"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "author_verification_events_actor_id_fkey"
      columns: ["actor_id"]
isOneToOne: false
      referencedRelation: "author_balances"
      referencedColumns: ["author_id"]
    },{
      foreignKeyName: "author_verification_events_actor_id_fkey"
      columns: ["actor_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "author_verification_events_actor_id_fkey"
      columns: ["actor_id"]
isOneToOne: false
      referencedRelation: "public_authors"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "author_verification_events_actor_id_fkey"
      columns: ["actor_id"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "author_verification_events_application_id_fkey"
      columns: ["application_id"]
isOneToOne: false
      referencedRelation: "author_applications"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "author_verification_events_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "author_balances"
      referencedColumns: ["author_id"]
    },{
      foreignKeyName: "author_verification_events_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "author_verification_events_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "public_authors"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "author_verification_events_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"book_file_versions": {
                  Row: {
                    "book_id": string,"created_at": string,"height_in": number | null,"id": string,"kind": string,"page_count": number | null,"path": string,"uploaded_by": string | null,"version": number,"width_in": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "book_id": string,"created_at"?: string,"height_in"?: number | null,"id"?: string,"kind": string,"page_count"?: number | null,"path": string,"uploaded_by"?: string | null,"version": number,"width_in"?: number | null
                  }
                  Update: {
                    "book_id"?: string,"created_at"?: string,"height_in"?: number | null,"id"?: string,"kind"?: string,"page_count"?: number | null,"path"?: string,"uploaded_by"?: string | null,"version"?: number,"width_in"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "book_file_versions_book_id_fkey"
      columns: ["book_id"]
isOneToOne: false
      referencedRelation: "books"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "book_file_versions_uploaded_by_fkey"
      columns: ["uploaded_by"]
isOneToOne: false
      referencedRelation: "author_balances"
      referencedColumns: ["author_id"]
    },{
      foreignKeyName: "book_file_versions_uploaded_by_fkey"
      columns: ["uploaded_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "book_file_versions_uploaded_by_fkey"
      columns: ["uploaded_by"]
isOneToOne: false
      referencedRelation: "public_authors"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "book_file_versions_uploaded_by_fkey"
      columns: ["uploaded_by"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"book_reviews": {
                  Row: {
                    "author_response": string | null,"author_response_at": string | null,"body": string | null,"book_id": string,"created_at": string,"edited_at": string | null,"id": string,"moderation": string,"rating": number,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "author_response"?: string | null,"author_response_at"?: string | null,"body"?: string | null,"book_id": string,"created_at"?: string,"edited_at"?: string | null,"id"?: string,"moderation"?: string,"rating": number,"user_id": string
                  }
                  Update: {
                    "author_response"?: string | null,"author_response_at"?: string | null,"body"?: string | null,"book_id"?: string,"created_at"?: string,"edited_at"?: string | null,"id"?: string,"moderation"?: string,"rating"?: number,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "book_reviews_book_id_fkey"
      columns: ["book_id"]
isOneToOne: false
      referencedRelation: "books"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "book_reviews_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "author_balances"
      referencedColumns: ["author_id"]
    },{
      foreignKeyName: "book_reviews_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "book_reviews_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "public_authors"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "book_reviews_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"books": {
                  Row: {
                    "approved_files": Json | null,"approved_files_at": string | null,"author_id": string,"author_name": string,"binding": string,"cover_finish": string,"cover_path": string | null,"created_at": string,"description": string | null,"edition_label": string | null,"eeid": string | null,"eeid_assigned_at": string | null,"eeid_assigned_by": string | null,"files_confirmed_at": string | null,"genre": string | null,"id": string,"interior": string,"isbn": string | null,"language": string,"manuscript_height_in": number | null,"manuscript_path": string | null,"manuscript_width_in": number | null,"mrp": number | null,"page_count": number | null,"paper": string,"print_cost": number | null,"print_cover_height_in": number | null,"print_cover_path": string | null,"print_cover_width_in": number | null,"print_review_requested_at": string | null,"published_at": string | null,"removed_at": string | null,"removed_reason": string | null,"review_note": string | null,"reviewed_at": string | null,"reviewed_by": string | null,"sample_approved_at": string | null,"sample_draft_from": number | null,"sample_draft_path": string | null,"sample_draft_source": string | null,"sample_draft_to": number | null,"sample_from": number | null,"sample_manuscript_version": number | null,"sample_path": string | null,"sample_source": string | null,"sample_to": number | null,"slug": string,"status": Database["public"]['Enums']["book_status"],"submitted_at": string | null,"subtitle": string | null,"title": string,"trim_size": string,"updated_at": string,"work_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "approved_files"?: Json | null,"approved_files_at"?: string | null,"author_id": string,"author_name": string,"binding"?: string,"cover_finish"?: string,"cover_path"?: string | null,"created_at"?: string,"description"?: string | null,"edition_label"?: string | null,"eeid"?: string | null,"eeid_assigned_at"?: string | null,"eeid_assigned_by"?: string | null,"files_confirmed_at"?: string | null,"genre"?: string | null,"id"?: string,"interior"?: string,"isbn"?: string | null,"language"?: string,"manuscript_height_in"?: number | null,"manuscript_path"?: string | null,"manuscript_width_in"?: number | null,"mrp"?: number | null,"page_count"?: number | null,"paper"?: string,"print_cost"?: number | null,"print_cover_height_in"?: number | null,"print_cover_path"?: string | null,"print_cover_width_in"?: number | null,"print_review_requested_at"?: string | null,"published_at"?: string | null,"removed_at"?: string | null,"removed_reason"?: string | null,"review_note"?: string | null,"reviewed_at"?: string | null,"reviewed_by"?: string | null,"sample_approved_at"?: string | null,"sample_draft_from"?: number | null,"sample_draft_path"?: string | null,"sample_draft_source"?: string | null,"sample_draft_to"?: number | null,"sample_from"?: number | null,"sample_manuscript_version"?: number | null,"sample_path"?: string | null,"sample_source"?: string | null,"sample_to"?: number | null,"slug": string,"status"?: Database["public"]['Enums']["book_status"],"submitted_at"?: string | null,"subtitle"?: string | null,"title": string,"trim_size"?: string,"updated_at"?: string,"work_id"?: string
                  }
                  Update: {
                    "approved_files"?: Json | null,"approved_files_at"?: string | null,"author_id"?: string,"author_name"?: string,"binding"?: string,"cover_finish"?: string,"cover_path"?: string | null,"created_at"?: string,"description"?: string | null,"edition_label"?: string | null,"eeid"?: string | null,"eeid_assigned_at"?: string | null,"eeid_assigned_by"?: string | null,"files_confirmed_at"?: string | null,"genre"?: string | null,"id"?: string,"interior"?: string,"isbn"?: string | null,"language"?: string,"manuscript_height_in"?: number | null,"manuscript_path"?: string | null,"manuscript_width_in"?: number | null,"mrp"?: number | null,"page_count"?: number | null,"paper"?: string,"print_cost"?: number | null,"print_cover_height_in"?: number | null,"print_cover_path"?: string | null,"print_cover_width_in"?: number | null,"print_review_requested_at"?: string | null,"published_at"?: string | null,"removed_at"?: string | null,"removed_reason"?: string | null,"review_note"?: string | null,"reviewed_at"?: string | null,"reviewed_by"?: string | null,"sample_approved_at"?: string | null,"sample_draft_from"?: number | null,"sample_draft_path"?: string | null,"sample_draft_source"?: string | null,"sample_draft_to"?: number | null,"sample_from"?: number | null,"sample_manuscript_version"?: number | null,"sample_path"?: string | null,"sample_source"?: string | null,"sample_to"?: number | null,"slug"?: string,"status"?: Database["public"]['Enums']["book_status"],"submitted_at"?: string | null,"subtitle"?: string | null,"title"?: string,"trim_size"?: string,"updated_at"?: string,"work_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "books_author_id_fkey"
      columns: ["author_id"]
isOneToOne: false
      referencedRelation: "author_balances"
      referencedColumns: ["author_id"]
    },{
      foreignKeyName: "books_author_id_fkey"
      columns: ["author_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "books_author_id_fkey"
      columns: ["author_id"]
isOneToOne: false
      referencedRelation: "public_authors"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "books_author_id_fkey"
      columns: ["author_id"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "books_eeid_assigned_by_fkey"
      columns: ["eeid_assigned_by"]
isOneToOne: false
      referencedRelation: "author_balances"
      referencedColumns: ["author_id"]
    },{
      foreignKeyName: "books_eeid_assigned_by_fkey"
      columns: ["eeid_assigned_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "books_eeid_assigned_by_fkey"
      columns: ["eeid_assigned_by"]
isOneToOne: false
      referencedRelation: "public_authors"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "books_eeid_assigned_by_fkey"
      columns: ["eeid_assigned_by"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "books_reviewed_by_fkey"
      columns: ["reviewed_by"]
isOneToOne: false
      referencedRelation: "author_balances"
      referencedColumns: ["author_id"]
    },{
      foreignKeyName: "books_reviewed_by_fkey"
      columns: ["reviewed_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "books_reviewed_by_fkey"
      columns: ["reviewed_by"]
isOneToOne: false
      referencedRelation: "public_authors"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "books_reviewed_by_fkey"
      columns: ["reviewed_by"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"campaign_clicks": {
                  Row: {
                    "clicked_at": string,"id": number,"link_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "clicked_at"?: string,"id"?: number,"link_id": string
                  }
                  Update: {
                    "clicked_at"?: string,"id"?: number,"link_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "campaign_clicks_link_id_fkey"
      columns: ["link_id"]
isOneToOne: false
      referencedRelation: "campaign_links"
      referencedColumns: ["id"]
    }
                  ]
                },"campaign_links": {
                  Row: {
                    "archived": boolean,"author_id": string,"book_id": string,"code": string,"created_at": string,"id": string,"label": string
                  }
                  ComputedFields: never
                  Insert: {
                    "archived"?: boolean,"author_id": string,"book_id": string,"code": string,"created_at"?: string,"id"?: string,"label": string
                  }
                  Update: {
                    "archived"?: boolean,"author_id"?: string,"book_id"?: string,"code"?: string,"created_at"?: string,"id"?: string,"label"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "campaign_links_author_id_fkey"
      columns: ["author_id"]
isOneToOne: false
      referencedRelation: "author_balances"
      referencedColumns: ["author_id"]
    },{
      foreignKeyName: "campaign_links_author_id_fkey"
      columns: ["author_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "campaign_links_author_id_fkey"
      columns: ["author_id"]
isOneToOne: false
      referencedRelation: "public_authors"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "campaign_links_author_id_fkey"
      columns: ["author_id"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "campaign_links_book_id_fkey"
      columns: ["book_id"]
isOneToOne: false
      referencedRelation: "books"
      referencedColumns: ["id"]
    }
                  ]
                },"content_reports": {
                  Row: {
                    "created_at": string,"details": string | null,"id": string,"reason": string,"reporter_id": string,"resolved_at": string | null,"resolved_by": string | null,"status": string,"target_id": string,"target_type": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"details"?: string | null,"id"?: string,"reason": string,"reporter_id": string,"resolved_at"?: string | null,"resolved_by"?: string | null,"status"?: string,"target_id": string,"target_type": string
                  }
                  Update: {
                    "created_at"?: string,"details"?: string | null,"id"?: string,"reason"?: string,"reporter_id"?: string,"resolved_at"?: string | null,"resolved_by"?: string | null,"status"?: string,"target_id"?: string,"target_type"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "content_reports_reporter_id_fkey"
      columns: ["reporter_id"]
isOneToOne: false
      referencedRelation: "author_balances"
      referencedColumns: ["author_id"]
    },{
      foreignKeyName: "content_reports_reporter_id_fkey"
      columns: ["reporter_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "content_reports_reporter_id_fkey"
      columns: ["reporter_id"]
isOneToOne: false
      referencedRelation: "public_authors"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "content_reports_reporter_id_fkey"
      columns: ["reporter_id"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "content_reports_resolved_by_fkey"
      columns: ["resolved_by"]
isOneToOne: false
      referencedRelation: "author_balances"
      referencedColumns: ["author_id"]
    },{
      foreignKeyName: "content_reports_resolved_by_fkey"
      columns: ["resolved_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "content_reports_resolved_by_fkey"
      columns: ["resolved_by"]
isOneToOne: false
      referencedRelation: "public_authors"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "content_reports_resolved_by_fkey"
      columns: ["resolved_by"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"distribution_requests": {
                  Row: {
                    "author_id": string,"author_replied_at": string | null,"author_reply": string,"book_id": string,"channel": string,"created_at": string,"id": string,"markets": string,"residence_country": string,"review_note": string,"reviewed_at": string | null,"reviewed_by": string | null,"rights_confirmed": boolean,"status": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "author_id": string,"author_replied_at"?: string | null,"author_reply"?: string,"book_id": string,"channel": string,"created_at"?: string,"id"?: string,"markets": string,"residence_country": string,"review_note"?: string,"reviewed_at"?: string | null,"reviewed_by"?: string | null,"rights_confirmed": boolean,"status"?: string,"updated_at"?: string
                  }
                  Update: {
                    "author_id"?: string,"author_replied_at"?: string | null,"author_reply"?: string,"book_id"?: string,"channel"?: string,"created_at"?: string,"id"?: string,"markets"?: string,"residence_country"?: string,"review_note"?: string,"reviewed_at"?: string | null,"reviewed_by"?: string | null,"rights_confirmed"?: boolean,"status"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "distribution_requests_author_id_fkey"
      columns: ["author_id"]
isOneToOne: false
      referencedRelation: "author_balances"
      referencedColumns: ["author_id"]
    },{
      foreignKeyName: "distribution_requests_author_id_fkey"
      columns: ["author_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "distribution_requests_author_id_fkey"
      columns: ["author_id"]
isOneToOne: false
      referencedRelation: "public_authors"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "distribution_requests_author_id_fkey"
      columns: ["author_id"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "distribution_requests_book_id_fkey"
      columns: ["book_id"]
isOneToOne: false
      referencedRelation: "books"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "distribution_requests_reviewed_by_fkey"
      columns: ["reviewed_by"]
isOneToOne: false
      referencedRelation: "author_balances"
      referencedColumns: ["author_id"]
    },{
      foreignKeyName: "distribution_requests_reviewed_by_fkey"
      columns: ["reviewed_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "distribution_requests_reviewed_by_fkey"
      columns: ["reviewed_by"]
isOneToOne: false
      referencedRelation: "public_authors"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "distribution_requests_reviewed_by_fkey"
      columns: ["reviewed_by"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"edition_ids": {
                  Row: {
                    "assigned_at": string,"assigned_by": string | null,"assigned_via": string,"book_id": string | null,"eeid": string
                  }
                  ComputedFields: never
                  Insert: {
                    "assigned_at"?: string,"assigned_by"?: string | null,"assigned_via": string,"book_id"?: string | null,"eeid": string
                  }
                  Update: {
                    "assigned_at"?: string,"assigned_by"?: string | null,"assigned_via"?: string,"book_id"?: string | null,"eeid"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "edition_ids_assigned_by_fkey"
      columns: ["assigned_by"]
isOneToOne: false
      referencedRelation: "author_balances"
      referencedColumns: ["author_id"]
    },{
      foreignKeyName: "edition_ids_assigned_by_fkey"
      columns: ["assigned_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "edition_ids_assigned_by_fkey"
      columns: ["assigned_by"]
isOneToOne: false
      referencedRelation: "public_authors"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "edition_ids_assigned_by_fkey"
      columns: ["assigned_by"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "edition_ids_book_id_fkey"
      columns: ["book_id"]
isOneToOne: true
      referencedRelation: "books"
      referencedColumns: ["id"]
    }
                  ]
                },"follows": {
                  Row: {
                    "author_id": string,"created_at": string,"follower_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "author_id": string,"created_at"?: string,"follower_id": string
                  }
                  Update: {
                    "author_id"?: string,"created_at"?: string,"follower_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "follows_author_id_fkey"
      columns: ["author_id"]
isOneToOne: false
      referencedRelation: "author_balances"
      referencedColumns: ["author_id"]
    },{
      foreignKeyName: "follows_author_id_fkey"
      columns: ["author_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "follows_author_id_fkey"
      columns: ["author_id"]
isOneToOne: false
      referencedRelation: "public_authors"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "follows_author_id_fkey"
      columns: ["author_id"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "follows_follower_id_fkey"
      columns: ["follower_id"]
isOneToOne: false
      referencedRelation: "author_balances"
      referencedColumns: ["author_id"]
    },{
      foreignKeyName: "follows_follower_id_fkey"
      columns: ["follower_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "follows_follower_id_fkey"
      columns: ["follower_id"]
isOneToOne: false
      referencedRelation: "public_authors"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "follows_follower_id_fkey"
      columns: ["follower_id"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"moderation_actions": {
                  Row: {
                    "action": string,"actor_id": string | null,"created_at": string,"id": string,"reason": string,"target_id": string,"target_type": string
                  }
                  ComputedFields: never
                  Insert: {
                    "action": string,"actor_id"?: string | null,"created_at"?: string,"id"?: string,"reason": string,"target_id": string,"target_type": string
                  }
                  Update: {
                    "action"?: string,"actor_id"?: string | null,"created_at"?: string,"id"?: string,"reason"?: string,"target_id"?: string,"target_type"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "moderation_actions_actor_id_fkey"
      columns: ["actor_id"]
isOneToOne: false
      referencedRelation: "author_balances"
      referencedColumns: ["author_id"]
    },{
      foreignKeyName: "moderation_actions_actor_id_fkey"
      columns: ["actor_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "moderation_actions_actor_id_fkey"
      columns: ["actor_id"]
isOneToOne: false
      referencedRelation: "public_authors"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "moderation_actions_actor_id_fkey"
      columns: ["actor_id"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"notifications": {
                  Row: {
                    "actor_id": string | null,"article_id": string | null,"created_at": string,"id": string,"kind": string,"link": string,"post_id": string | null,"read_at": string | null,"ref_id": string | null,"title": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "actor_id"?: string | null,"article_id"?: string | null,"created_at"?: string,"id"?: string,"kind": string,"link": string,"post_id"?: string | null,"read_at"?: string | null,"ref_id"?: string | null,"title": string,"user_id": string
                  }
                  Update: {
                    "actor_id"?: string | null,"article_id"?: string | null,"created_at"?: string,"id"?: string,"kind"?: string,"link"?: string,"post_id"?: string | null,"read_at"?: string | null,"ref_id"?: string | null,"title"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "notifications_actor_id_fkey"
      columns: ["actor_id"]
isOneToOne: false
      referencedRelation: "author_balances"
      referencedColumns: ["author_id"]
    },{
      foreignKeyName: "notifications_actor_id_fkey"
      columns: ["actor_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "notifications_actor_id_fkey"
      columns: ["actor_id"]
isOneToOne: false
      referencedRelation: "public_authors"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "notifications_actor_id_fkey"
      columns: ["actor_id"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "notifications_article_id_fkey"
      columns: ["article_id"]
isOneToOne: false
      referencedRelation: "articles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "notifications_post_id_fkey"
      columns: ["post_id"]
isOneToOne: false
      referencedRelation: "posts"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "notifications_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "author_balances"
      referencedColumns: ["author_id"]
    },{
      foreignKeyName: "notifications_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "notifications_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "public_authors"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "notifications_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"order_issues": {
                  Row: {
                    "buyer_id": string | null,"created_at": string,"description": string,"id": string,"kind": string,"order_id": string,"photo_paths": (string)[],"refund_paise": number | null,"replacement_order_id": string | null,"resolution_note": string | null,"resolved_at": string | null,"resolved_by": string | null,"status": string
                  }
                  ComputedFields: never
                  Insert: {
                    "buyer_id"?: string | null,"created_at"?: string,"description": string,"id"?: string,"kind": string,"order_id": string,"photo_paths"?: (string)[],"refund_paise"?: number | null,"replacement_order_id"?: string | null,"resolution_note"?: string | null,"resolved_at"?: string | null,"resolved_by"?: string | null,"status"?: string
                  }
                  Update: {
                    "buyer_id"?: string | null,"created_at"?: string,"description"?: string,"id"?: string,"kind"?: string,"order_id"?: string,"photo_paths"?: (string)[],"refund_paise"?: number | null,"replacement_order_id"?: string | null,"resolution_note"?: string | null,"resolved_at"?: string | null,"resolved_by"?: string | null,"status"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "order_issues_buyer_id_fkey"
      columns: ["buyer_id"]
isOneToOne: false
      referencedRelation: "author_balances"
      referencedColumns: ["author_id"]
    },{
      foreignKeyName: "order_issues_buyer_id_fkey"
      columns: ["buyer_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "order_issues_buyer_id_fkey"
      columns: ["buyer_id"]
isOneToOne: false
      referencedRelation: "public_authors"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "order_issues_buyer_id_fkey"
      columns: ["buyer_id"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "order_issues_order_id_fkey"
      columns: ["order_id"]
isOneToOne: false
      referencedRelation: "orders"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "order_issues_replacement_order_id_fkey"
      columns: ["replacement_order_id"]
isOneToOne: false
      referencedRelation: "orders"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "order_issues_resolved_by_fkey"
      columns: ["resolved_by"]
isOneToOne: false
      referencedRelation: "author_balances"
      referencedColumns: ["author_id"]
    },{
      foreignKeyName: "order_issues_resolved_by_fkey"
      columns: ["resolved_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "order_issues_resolved_by_fkey"
      columns: ["resolved_by"]
isOneToOne: false
      referencedRelation: "public_authors"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "order_issues_resolved_by_fkey"
      columns: ["resolved_by"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"order_items": {
                  Row: {
                    "author_discount": number,"author_earning": number,"author_earning_total": number | null,"author_id": string,"author_plan": string | null,"book_id": string,"commission": number | null,"commission_gst": number | null,"commission_rule": Json | null,"created_at": string,"file_snapshot": Json | null,"gateway_allocated": number | null,"id": string,"order_id": string,"payment_fee": number,"platform_discount": number,"platform_fee": number,"print_cost": number,"print_cost_total": number | null,"quantity": number,"reversal_reason": string | null,"reversed_at": string | null,"sale_channel": string,"unit_price": number,"line_earning": number | null
                  }
                  ComputedFields: "line_earning"
                  Insert: {
                    "author_discount"?: number,"author_earning": number,"author_earning_total"?: number | null,"author_id": string,"author_plan"?: string | null,"book_id": string,"commission"?: number | null,"commission_gst"?: number | null,"commission_rule"?: Json | null,"created_at"?: string,"file_snapshot"?: Json | null,"gateway_allocated"?: number | null,"id"?: string,"order_id": string,"payment_fee": number,"platform_discount"?: number,"platform_fee": number,"print_cost": number,"print_cost_total"?: number | null,"quantity": number,"reversal_reason"?: string | null,"reversed_at"?: string | null,"sale_channel"?: string,"unit_price": number
                  }
                  Update: {
                    "author_discount"?: number,"author_earning"?: number,"author_earning_total"?: number | null,"author_id"?: string,"author_plan"?: string | null,"book_id"?: string,"commission"?: number | null,"commission_gst"?: number | null,"commission_rule"?: Json | null,"created_at"?: string,"file_snapshot"?: Json | null,"gateway_allocated"?: number | null,"id"?: string,"order_id"?: string,"payment_fee"?: number,"platform_discount"?: number,"platform_fee"?: number,"print_cost"?: number,"print_cost_total"?: number | null,"quantity"?: number,"reversal_reason"?: string | null,"reversed_at"?: string | null,"sale_channel"?: string,"unit_price"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "order_items_author_id_fkey"
      columns: ["author_id"]
isOneToOne: false
      referencedRelation: "author_balances"
      referencedColumns: ["author_id"]
    },{
      foreignKeyName: "order_items_author_id_fkey"
      columns: ["author_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "order_items_author_id_fkey"
      columns: ["author_id"]
isOneToOne: false
      referencedRelation: "public_authors"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "order_items_author_id_fkey"
      columns: ["author_id"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "order_items_book_id_fkey"
      columns: ["book_id"]
isOneToOne: false
      referencedRelation: "books"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "order_items_order_id_fkey"
      columns: ["order_id"]
isOneToOne: false
      referencedRelation: "orders"
      referencedColumns: ["id"]
    }
                  ]
                },"order_status_history": {
                  Row: {
                    "actor_id": string | null,"created_at": string,"from_status": Database["public"]['Enums']["order_status"] | null,"id": number,"order_id": string,"to_status": Database["public"]['Enums']["order_status"]
                  }
                  ComputedFields: never
                  Insert: {
                    "actor_id"?: string | null,"created_at"?: string,"from_status"?: Database["public"]['Enums']["order_status"] | null,"id"?: number,"order_id": string,"to_status": Database["public"]['Enums']["order_status"]
                  }
                  Update: {
                    "actor_id"?: string | null,"created_at"?: string,"from_status"?: Database["public"]['Enums']["order_status"] | null,"id"?: number,"order_id"?: string,"to_status"?: Database["public"]['Enums']["order_status"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "order_status_history_order_id_fkey"
      columns: ["order_id"]
isOneToOne: false
      referencedRelation: "orders"
      referencedColumns: ["id"]
    }
                  ]
                },"orders": {
                  Row: {
                    "accepted_at": string | null,"buyer_id": string | null,"campaign_link_id": string | null,"cancel_reason": string | null,"cancelled_at": string | null,"cancelled_by": string | null,"courier": string | null,"created_at": string,"delivered_at": string | null,"gateway_fee": number | null,"gateway_fee_source": string | null,"id": string,"order_number": string,"packed_at": string | null,"paid_at": string | null,"payment_mode": string | null,"printed_at": string | null,"printer_id": string | null,"printing_at": string | null,"razorpay_order_id": string | null,"razorpay_payment_id": string | null,"refund_amount": number | null,"refund_id": string | null,"refund_status": string | null,"refunded_at": string | null,"replacement_of": string | null,"ship_city": string,"ship_line1": string,"ship_line2": string | null,"ship_name": string,"ship_phone": string,"ship_pincode": string,"ship_state": string,"shipped_at": string | null,"shipping": number,"shipping_discount": number,"shipping_promotion_id": string | null,"shipping_quote": Json | null,"status": Database["public"]['Enums']["order_status"],"subtotal": number,"total": number,"tracking_number": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "accepted_at"?: string | null,"buyer_id"?: string | null,"campaign_link_id"?: string | null,"cancel_reason"?: string | null,"cancelled_at"?: string | null,"cancelled_by"?: string | null,"courier"?: string | null,"created_at"?: string,"delivered_at"?: string | null,"gateway_fee"?: number | null,"gateway_fee_source"?: string | null,"id"?: string,"order_number"?: string,"packed_at"?: string | null,"paid_at"?: string | null,"payment_mode"?: string | null,"printed_at"?: string | null,"printer_id"?: string | null,"printing_at"?: string | null,"razorpay_order_id"?: string | null,"razorpay_payment_id"?: string | null,"refund_amount"?: number | null,"refund_id"?: string | null,"refund_status"?: string | null,"refunded_at"?: string | null,"replacement_of"?: string | null,"ship_city": string,"ship_line1": string,"ship_line2"?: string | null,"ship_name": string,"ship_phone": string,"ship_pincode": string,"ship_state": string,"shipped_at"?: string | null,"shipping"?: number,"shipping_discount"?: number,"shipping_promotion_id"?: string | null,"shipping_quote"?: Json | null,"status"?: Database["public"]['Enums']["order_status"],"subtotal": number,"total": number,"tracking_number"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "accepted_at"?: string | null,"buyer_id"?: string | null,"campaign_link_id"?: string | null,"cancel_reason"?: string | null,"cancelled_at"?: string | null,"cancelled_by"?: string | null,"courier"?: string | null,"created_at"?: string,"delivered_at"?: string | null,"gateway_fee"?: number | null,"gateway_fee_source"?: string | null,"id"?: string,"order_number"?: string,"packed_at"?: string | null,"paid_at"?: string | null,"payment_mode"?: string | null,"printed_at"?: string | null,"printer_id"?: string | null,"printing_at"?: string | null,"razorpay_order_id"?: string | null,"razorpay_payment_id"?: string | null,"refund_amount"?: number | null,"refund_id"?: string | null,"refund_status"?: string | null,"refunded_at"?: string | null,"replacement_of"?: string | null,"ship_city"?: string,"ship_line1"?: string,"ship_line2"?: string | null,"ship_name"?: string,"ship_phone"?: string,"ship_pincode"?: string,"ship_state"?: string,"shipped_at"?: string | null,"shipping"?: number,"shipping_discount"?: number,"shipping_promotion_id"?: string | null,"shipping_quote"?: Json | null,"status"?: Database["public"]['Enums']["order_status"],"subtotal"?: number,"total"?: number,"tracking_number"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "orders_buyer_id_fkey"
      columns: ["buyer_id"]
isOneToOne: false
      referencedRelation: "author_balances"
      referencedColumns: ["author_id"]
    },{
      foreignKeyName: "orders_buyer_id_fkey"
      columns: ["buyer_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "orders_buyer_id_fkey"
      columns: ["buyer_id"]
isOneToOne: false
      referencedRelation: "public_authors"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "orders_buyer_id_fkey"
      columns: ["buyer_id"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "orders_campaign_link_id_fkey"
      columns: ["campaign_link_id"]
isOneToOne: false
      referencedRelation: "campaign_links"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "orders_printer_id_fkey"
      columns: ["printer_id"]
isOneToOne: false
      referencedRelation: "printer_load"
      referencedColumns: ["printer_id"]
    },{
      foreignKeyName: "orders_printer_id_fkey"
      columns: ["printer_id"]
isOneToOne: false
      referencedRelation: "printers"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "orders_replacement_of_fkey"
      columns: ["replacement_of"]
isOneToOne: false
      referencedRelation: "orders"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "orders_shipping_promotion_id_fkey"
      columns: ["shipping_promotion_id"]
isOneToOne: false
      referencedRelation: "shipping_promotions"
      referencedColumns: ["id"]
    }
                  ]
                },"payment_refunds": {
                  Row: {
                    "amount_paise": number,"created_at": string,"created_by": string | null,"error": string | null,"id": string,"payment_id": string,"processed_at": string | null,"razorpay_refund_id": string | null,"reason": string,"status": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "amount_paise": number,"created_at"?: string,"created_by"?: string | null,"error"?: string | null,"id"?: string,"payment_id": string,"processed_at"?: string | null,"razorpay_refund_id"?: string | null,"reason"?: string,"status"?: string,"updated_at"?: string
                  }
                  Update: {
                    "amount_paise"?: number,"created_at"?: string,"created_by"?: string | null,"error"?: string | null,"id"?: string,"payment_id"?: string,"processed_at"?: string | null,"razorpay_refund_id"?: string | null,"reason"?: string,"status"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "payment_refunds_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "author_balances"
      referencedColumns: ["author_id"]
    },{
      foreignKeyName: "payment_refunds_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "payment_refunds_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "public_authors"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "payment_refunds_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "payment_refunds_payment_id_fkey"
      columns: ["payment_id"]
isOneToOne: false
      referencedRelation: "payments"
      referencedColumns: ["id"]
    }
                  ]
                },"payments": {
                  Row: {
                    "amount_paise": number,"base_paise": number,"created_at": string,"description": string,"fee_paise": number | null,"gst_paise": number,"gst_percent": number,"id": string,"mode": string,"paid_at": string | null,"payer_id": string | null,"purpose": string,"razorpay_order_id": string | null,"razorpay_payment_id": string | null,"receipt_number": string | null,"refund_id": string | null,"refunded_at": string | null,"refunded_paise": number,"service_quote_id": string | null,"status": string
                  }
                  ComputedFields: never
                  Insert: {
                    "amount_paise": number,"base_paise": number,"created_at"?: string,"description": string,"fee_paise"?: number | null,"gst_paise"?: number,"gst_percent"?: number,"id"?: string,"mode": string,"paid_at"?: string | null,"payer_id"?: string | null,"purpose": string,"razorpay_order_id"?: string | null,"razorpay_payment_id"?: string | null,"receipt_number"?: string | null,"refund_id"?: string | null,"refunded_at"?: string | null,"refunded_paise"?: number,"service_quote_id"?: string | null,"status"?: string
                  }
                  Update: {
                    "amount_paise"?: number,"base_paise"?: number,"created_at"?: string,"description"?: string,"fee_paise"?: number | null,"gst_paise"?: number,"gst_percent"?: number,"id"?: string,"mode"?: string,"paid_at"?: string | null,"payer_id"?: string | null,"purpose"?: string,"razorpay_order_id"?: string | null,"razorpay_payment_id"?: string | null,"receipt_number"?: string | null,"refund_id"?: string | null,"refunded_at"?: string | null,"refunded_paise"?: number,"service_quote_id"?: string | null,"status"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "payments_payer_id_fkey"
      columns: ["payer_id"]
isOneToOne: false
      referencedRelation: "author_balances"
      referencedColumns: ["author_id"]
    },{
      foreignKeyName: "payments_payer_id_fkey"
      columns: ["payer_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "payments_payer_id_fkey"
      columns: ["payer_id"]
isOneToOne: false
      referencedRelation: "public_authors"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "payments_payer_id_fkey"
      columns: ["payer_id"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "payments_service_quote_id_fkey"
      columns: ["service_quote_id"]
isOneToOne: true
      referencedRelation: "service_quotes"
      referencedColumns: ["id"]
    }
                  ]
                },"payouts": {
                  Row: {
                    "amount": number,"author_id": string,"created_at": string,"created_by": string | null,"id": string,"note": string | null,"paid_at": string | null,"period_end": string | null,"period_start": string | null,"reference": string | null,"status": Database["public"]['Enums']["payout_status"]
                  }
                  ComputedFields: never
                  Insert: {
                    "amount": number,"author_id": string,"created_at"?: string,"created_by"?: string | null,"id"?: string,"note"?: string | null,"paid_at"?: string | null,"period_end"?: string | null,"period_start"?: string | null,"reference"?: string | null,"status"?: Database["public"]['Enums']["payout_status"]
                  }
                  Update: {
                    "amount"?: number,"author_id"?: string,"created_at"?: string,"created_by"?: string | null,"id"?: string,"note"?: string | null,"paid_at"?: string | null,"period_end"?: string | null,"period_start"?: string | null,"reference"?: string | null,"status"?: Database["public"]['Enums']["payout_status"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "payouts_author_id_fkey"
      columns: ["author_id"]
isOneToOne: false
      referencedRelation: "author_balances"
      referencedColumns: ["author_id"]
    },{
      foreignKeyName: "payouts_author_id_fkey"
      columns: ["author_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "payouts_author_id_fkey"
      columns: ["author_id"]
isOneToOne: false
      referencedRelation: "public_authors"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "payouts_author_id_fkey"
      columns: ["author_id"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "payouts_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "author_balances"
      referencedColumns: ["author_id"]
    },{
      foreignKeyName: "payouts_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "payouts_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "public_authors"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "payouts_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"plan_versions": {
                  Row: {
                    "commission_gst_percent": number,"commission_min_paise": number,"commission_percent": number,"created_at": string,"created_by": string | null,"credits_per_period": number,"effective_from": string,"gst_percent": number,"id": string,"note": string | null,"plan": string,"price_paise": number,"version": number
                  }
                  ComputedFields: never
                  Insert: {
                    "commission_gst_percent"?: number,"commission_min_paise"?: number,"commission_percent": number,"created_at"?: string,"created_by"?: string | null,"credits_per_period"?: number,"effective_from"?: string,"gst_percent"?: number,"id"?: string,"note"?: string | null,"plan": string,"price_paise"?: number,"version": number
                  }
                  Update: {
                    "commission_gst_percent"?: number,"commission_min_paise"?: number,"commission_percent"?: number,"created_at"?: string,"created_by"?: string | null,"credits_per_period"?: number,"effective_from"?: string,"gst_percent"?: number,"id"?: string,"note"?: string | null,"plan"?: string,"price_paise"?: number,"version"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "plan_versions_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "author_balances"
      referencedColumns: ["author_id"]
    },{
      foreignKeyName: "plan_versions_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "plan_versions_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "public_authors"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "plan_versions_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"post_bookmarks": {
                  Row: {
                    "created_at": string,"post_id": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"post_id": string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"post_id"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "post_bookmarks_post_id_fkey"
      columns: ["post_id"]
isOneToOne: false
      referencedRelation: "posts"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "post_bookmarks_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "author_balances"
      referencedColumns: ["author_id"]
    },{
      foreignKeyName: "post_bookmarks_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "post_bookmarks_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "public_authors"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "post_bookmarks_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"post_comments": {
                  Row: {
                    "body": string,"created_at": string,"edited_at": string | null,"id": string,"moderation": string,"parent_id": string | null,"post_id": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "body": string,"created_at"?: string,"edited_at"?: string | null,"id"?: string,"moderation"?: string,"parent_id"?: string | null,"post_id": string,"user_id": string
                  }
                  Update: {
                    "body"?: string,"created_at"?: string,"edited_at"?: string | null,"id"?: string,"moderation"?: string,"parent_id"?: string | null,"post_id"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "post_comments_parent_id_fkey"
      columns: ["parent_id"]
isOneToOne: false
      referencedRelation: "post_comments"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "post_comments_post_id_fkey"
      columns: ["post_id"]
isOneToOne: false
      referencedRelation: "posts"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "post_comments_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "author_balances"
      referencedColumns: ["author_id"]
    },{
      foreignKeyName: "post_comments_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "post_comments_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "public_authors"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "post_comments_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"post_likes": {
                  Row: {
                    "created_at": string,"post_id": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"post_id": string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"post_id"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "post_likes_post_id_fkey"
      columns: ["post_id"]
isOneToOne: false
      referencedRelation: "posts"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "post_likes_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "author_balances"
      referencedColumns: ["author_id"]
    },{
      foreignKeyName: "post_likes_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "post_likes_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "public_authors"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "post_likes_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"posts": {
                  Row: {
                    "author_id": string,"body": string,"created_at": string,"edited_at": string | null,"first_published_at": string | null,"id": string,"image_alt": string | null,"image_path": string | null,"moderation": string,"moderation_reason": string | null,"published_at": string | null,"related_book_id": string | null,"status": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "author_id": string,"body"?: string,"created_at"?: string,"edited_at"?: string | null,"first_published_at"?: string | null,"id"?: string,"image_alt"?: string | null,"image_path"?: string | null,"moderation"?: string,"moderation_reason"?: string | null,"published_at"?: string | null,"related_book_id"?: string | null,"status"?: string,"updated_at"?: string
                  }
                  Update: {
                    "author_id"?: string,"body"?: string,"created_at"?: string,"edited_at"?: string | null,"first_published_at"?: string | null,"id"?: string,"image_alt"?: string | null,"image_path"?: string | null,"moderation"?: string,"moderation_reason"?: string | null,"published_at"?: string | null,"related_book_id"?: string | null,"status"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "posts_author_id_fkey"
      columns: ["author_id"]
isOneToOne: false
      referencedRelation: "author_balances"
      referencedColumns: ["author_id"]
    },{
      foreignKeyName: "posts_author_id_fkey"
      columns: ["author_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "posts_author_id_fkey"
      columns: ["author_id"]
isOneToOne: false
      referencedRelation: "public_authors"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "posts_author_id_fkey"
      columns: ["author_id"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "posts_related_book_id_fkey"
      columns: ["related_book_id"]
isOneToOne: false
      referencedRelation: "books"
      referencedColumns: ["id"]
    }
                  ]
                },"printers": {
                  Row: {
                    "active": boolean,"address": string | null,"city": string,"contact_name": string | null,"created_at": string,"id": string,"name": string,"phone": string,"pincode": string | null,"rate_overrides": Json | null,"state": string,"updated_at": string,"user_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"address"?: string | null,"city": string,"contact_name"?: string | null,"created_at"?: string,"id"?: string,"name": string,"phone": string,"pincode"?: string | null,"rate_overrides"?: Json | null,"state": string,"updated_at"?: string,"user_id"?: string | null
                  }
                  Update: {
                    "active"?: boolean,"address"?: string | null,"city"?: string,"contact_name"?: string | null,"created_at"?: string,"id"?: string,"name"?: string,"phone"?: string,"pincode"?: string | null,"rate_overrides"?: Json | null,"state"?: string,"updated_at"?: string,"user_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "printers_user_id_fkey"
      columns: ["user_id"]
isOneToOne: true
      referencedRelation: "author_balances"
      referencedColumns: ["author_id"]
    },{
      foreignKeyName: "printers_user_id_fkey"
      columns: ["user_id"]
isOneToOne: true
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "printers_user_id_fkey"
      columns: ["user_id"]
isOneToOne: true
      referencedRelation: "public_authors"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "printers_user_id_fkey"
      columns: ["user_id"]
isOneToOne: true
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"pro_credit_ledger": {
                  Row: {
                    "actor_id": string | null,"author_id": string,"created_at": string,"delta": number,"id": string,"note": string | null,"period_id": string,"reason": string,"service_order_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "actor_id"?: string | null,"author_id": string,"created_at"?: string,"delta": number,"id"?: string,"note"?: string | null,"period_id": string,"reason": string,"service_order_id"?: string | null
                  }
                  Update: {
                    "actor_id"?: string | null,"author_id"?: string,"created_at"?: string,"delta"?: number,"id"?: string,"note"?: string | null,"period_id"?: string,"reason"?: string,"service_order_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "pro_credit_ledger_actor_id_fkey"
      columns: ["actor_id"]
isOneToOne: false
      referencedRelation: "author_balances"
      referencedColumns: ["author_id"]
    },{
      foreignKeyName: "pro_credit_ledger_actor_id_fkey"
      columns: ["actor_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "pro_credit_ledger_actor_id_fkey"
      columns: ["actor_id"]
isOneToOne: false
      referencedRelation: "public_authors"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "pro_credit_ledger_actor_id_fkey"
      columns: ["actor_id"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "pro_credit_ledger_author_id_fkey"
      columns: ["author_id"]
isOneToOne: false
      referencedRelation: "author_balances"
      referencedColumns: ["author_id"]
    },{
      foreignKeyName: "pro_credit_ledger_author_id_fkey"
      columns: ["author_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "pro_credit_ledger_author_id_fkey"
      columns: ["author_id"]
isOneToOne: false
      referencedRelation: "public_authors"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "pro_credit_ledger_author_id_fkey"
      columns: ["author_id"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "pro_credit_ledger_period_id_fkey"
      columns: ["period_id"]
isOneToOne: false
      referencedRelation: "subscription_periods"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "author_terms_accepted_at": string | null,"author_terms_version": string | null,"avatar_path": string | null,"bio": string | null,"city": string | null,"created_at": string,"full_name": string | null,"handle": string | null,"id": string,"notify_followers": boolean,"notify_new_articles": boolean,"notify_new_posts": boolean,"notify_replies": boolean,"payout_upi": string | null,"phone": string | null,"pincode": string | null,"role": Database["public"]['Enums']["app_role"],"state": string | null,"updated_at": string,"verified_author_at": string | null,"verified_author_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "author_terms_accepted_at"?: string | null,"author_terms_version"?: string | null,"avatar_path"?: string | null,"bio"?: string | null,"city"?: string | null,"created_at"?: string,"full_name"?: string | null,"handle"?: string | null,"id": string,"notify_followers"?: boolean,"notify_new_articles"?: boolean,"notify_new_posts"?: boolean,"notify_replies"?: boolean,"payout_upi"?: string | null,"phone"?: string | null,"pincode"?: string | null,"role"?: Database["public"]['Enums']["app_role"],"state"?: string | null,"updated_at"?: string,"verified_author_at"?: string | null,"verified_author_by"?: string | null
                  }
                  Update: {
                    "author_terms_accepted_at"?: string | null,"author_terms_version"?: string | null,"avatar_path"?: string | null,"bio"?: string | null,"city"?: string | null,"created_at"?: string,"full_name"?: string | null,"handle"?: string | null,"id"?: string,"notify_followers"?: boolean,"notify_new_articles"?: boolean,"notify_new_posts"?: boolean,"notify_replies"?: boolean,"payout_upi"?: string | null,"phone"?: string | null,"pincode"?: string | null,"role"?: Database["public"]['Enums']["app_role"],"state"?: string | null,"updated_at"?: string,"verified_author_at"?: string | null,"verified_author_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "profiles_verified_author_by_fkey"
      columns: ["verified_author_by"]
isOneToOne: false
      referencedRelation: "author_balances"
      referencedColumns: ["author_id"]
    },{
      foreignKeyName: "profiles_verified_author_by_fkey"
      columns: ["verified_author_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "profiles_verified_author_by_fkey"
      columns: ["verified_author_by"]
isOneToOne: false
      referencedRelation: "public_authors"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "profiles_verified_author_by_fkey"
      columns: ["verified_author_by"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"role_invites": {
                  Row: {
                    "created_at": string,"note": string | null,"phone": string,"role": Database["public"]['Enums']["app_role"]
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"note"?: string | null,"phone": string,"role": Database["public"]['Enums']["app_role"]
                  }
                  Update: {
                    "created_at"?: string,"note"?: string | null,"phone"?: string,"role"?: Database["public"]['Enums']["app_role"]
                  }
                  Relationships: [
                    
                  ]
                },"service_catalog": {
                  Row: {
                    "active": boolean,"code": string,"created_at": string,"created_by": string | null,"deliverables": (string)[],"exclusions": (string)[],"gst_percent": number,"id": string,"max_paise": number | null,"min_paise": number | null,"name": string,"price_paise": number | null,"pricing": string,"requires": (string)[],"revision_rounds": number,"scope": string,"sort": number,"version": number
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"code": string,"created_at"?: string,"created_by"?: string | null,"deliverables"?: (string)[],"exclusions"?: (string)[],"gst_percent"?: number,"id"?: string,"max_paise"?: number | null,"min_paise"?: number | null,"name": string,"price_paise"?: number | null,"pricing": string,"requires"?: (string)[],"revision_rounds"?: number,"scope": string,"sort"?: number,"version": number
                  }
                  Update: {
                    "active"?: boolean,"code"?: string,"created_at"?: string,"created_by"?: string | null,"deliverables"?: (string)[],"exclusions"?: (string)[],"gst_percent"?: number,"id"?: string,"max_paise"?: number | null,"min_paise"?: number | null,"name"?: string,"price_paise"?: number | null,"pricing"?: string,"requires"?: (string)[],"revision_rounds"?: number,"scope"?: string,"sort"?: number,"version"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "service_catalog_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "author_balances"
      referencedColumns: ["author_id"]
    },{
      foreignKeyName: "service_catalog_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "service_catalog_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "public_authors"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "service_catalog_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"service_events": {
                  Row: {
                    "actor_id": string | null,"created_at": string,"from_status": Database["public"]['Enums']["service_status"] | null,"id": number,"note": string | null,"service_order_id": string,"to_status": Database["public"]['Enums']["service_status"] | null
                  }
                  ComputedFields: never
                  Insert: {
                    "actor_id"?: string | null,"created_at"?: string,"from_status"?: Database["public"]['Enums']["service_status"] | null,"id"?: number,"note"?: string | null,"service_order_id": string,"to_status"?: Database["public"]['Enums']["service_status"] | null
                  }
                  Update: {
                    "actor_id"?: string | null,"created_at"?: string,"from_status"?: Database["public"]['Enums']["service_status"] | null,"id"?: number,"note"?: string | null,"service_order_id"?: string,"to_status"?: Database["public"]['Enums']["service_status"] | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "service_events_actor_id_fkey"
      columns: ["actor_id"]
isOneToOne: false
      referencedRelation: "author_balances"
      referencedColumns: ["author_id"]
    },{
      foreignKeyName: "service_events_actor_id_fkey"
      columns: ["actor_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "service_events_actor_id_fkey"
      columns: ["actor_id"]
isOneToOne: false
      referencedRelation: "public_authors"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "service_events_actor_id_fkey"
      columns: ["actor_id"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "service_events_service_order_id_fkey"
      columns: ["service_order_id"]
isOneToOne: false
      referencedRelation: "service_orders"
      referencedColumns: ["id"]
    }
                  ]
                },"service_files": {
                  Row: {
                    "created_at": string,"file_name": string,"id": string,"kind": string,"note": string | null,"path": string,"service_order_id": string,"size_bytes": number | null,"uploaded_by": string | null,"version": number
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"file_name": string,"id"?: string,"kind": string,"note"?: string | null,"path": string,"service_order_id": string,"size_bytes"?: number | null,"uploaded_by"?: string | null,"version"?: number
                  }
                  Update: {
                    "created_at"?: string,"file_name"?: string,"id"?: string,"kind"?: string,"note"?: string | null,"path"?: string,"service_order_id"?: string,"size_bytes"?: number | null,"uploaded_by"?: string | null,"version"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "service_files_service_order_id_fkey"
      columns: ["service_order_id"]
isOneToOne: false
      referencedRelation: "service_orders"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "service_files_uploaded_by_fkey"
      columns: ["uploaded_by"]
isOneToOne: false
      referencedRelation: "author_balances"
      referencedColumns: ["author_id"]
    },{
      foreignKeyName: "service_files_uploaded_by_fkey"
      columns: ["uploaded_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "service_files_uploaded_by_fkey"
      columns: ["uploaded_by"]
isOneToOne: false
      referencedRelation: "public_authors"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "service_files_uploaded_by_fkey"
      columns: ["uploaded_by"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"service_orders": {
                  Row: {
                    "author_id": string,"book_id": string | null,"cancel_reason": string | null,"cancelled_at": string | null,"catalog_id": string | null,"completed_at": string | null,"created_at": string,"id": string,"kind": string,"order_number": string,"pro_period_id": string | null,"qc": Json | null,"requirements": NonNullable<Json>,"revisions_allowed": number,"revisions_used": number,"rights_confirmed": boolean,"started_at": string | null,"status": Database["public"]['Enums']["service_status"],"submitted_at": string | null,"updated_at": string,"upgrade_from": (string)[] | null
                  }
                  ComputedFields: never
                  Insert: {
                    "author_id": string,"book_id"?: string | null,"cancel_reason"?: string | null,"cancelled_at"?: string | null,"catalog_id"?: string | null,"completed_at"?: string | null,"created_at"?: string,"id"?: string,"kind": string,"order_number"?: string,"pro_period_id"?: string | null,"qc"?: Json | null,"requirements"?: NonNullable<Json>,"revisions_allowed"?: number,"revisions_used"?: number,"rights_confirmed"?: boolean,"started_at"?: string | null,"status"?: Database["public"]['Enums']["service_status"],"submitted_at"?: string | null,"updated_at"?: string,"upgrade_from"?: (string)[] | null
                  }
                  Update: {
                    "author_id"?: string,"book_id"?: string | null,"cancel_reason"?: string | null,"cancelled_at"?: string | null,"catalog_id"?: string | null,"completed_at"?: string | null,"created_at"?: string,"id"?: string,"kind"?: string,"order_number"?: string,"pro_period_id"?: string | null,"qc"?: Json | null,"requirements"?: NonNullable<Json>,"revisions_allowed"?: number,"revisions_used"?: number,"rights_confirmed"?: boolean,"started_at"?: string | null,"status"?: Database["public"]['Enums']["service_status"],"submitted_at"?: string | null,"updated_at"?: string,"upgrade_from"?: (string)[] | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "service_orders_author_id_fkey"
      columns: ["author_id"]
isOneToOne: false
      referencedRelation: "author_balances"
      referencedColumns: ["author_id"]
    },{
      foreignKeyName: "service_orders_author_id_fkey"
      columns: ["author_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "service_orders_author_id_fkey"
      columns: ["author_id"]
isOneToOne: false
      referencedRelation: "public_authors"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "service_orders_author_id_fkey"
      columns: ["author_id"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "service_orders_book_id_fkey"
      columns: ["book_id"]
isOneToOne: false
      referencedRelation: "books"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "service_orders_catalog_id_fkey"
      columns: ["catalog_id"]
isOneToOne: false
      referencedRelation: "current_service_catalog"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "service_orders_catalog_id_fkey"
      columns: ["catalog_id"]
isOneToOne: false
      referencedRelation: "service_catalog"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "service_orders_pro_period_id_fkey"
      columns: ["pro_period_id"]
isOneToOne: false
      referencedRelation: "subscription_periods"
      referencedColumns: ["id"]
    }
                  ]
                },"service_quotes": {
                  Row: {
                    "accepted_at": string | null,"base_paise": number,"deliverables": (string)[],"delivery_by": string,"gst_paise": number,"gst_percent": number,"id": string,"issued_at": string,"issued_by": string | null,"kind": string,"line_items": Json | null,"notes": string | null,"payment_id": string | null,"revisions": number,"service_order_id": string,"status": string,"total_paise": number
                  }
                  ComputedFields: never
                  Insert: {
                    "accepted_at"?: string | null,"base_paise": number,"deliverables"?: (string)[],"delivery_by": string,"gst_paise": number,"gst_percent": number,"id"?: string,"issued_at"?: string,"issued_by"?: string | null,"kind"?: string,"line_items"?: Json | null,"notes"?: string | null,"payment_id"?: string | null,"revisions"?: number,"service_order_id": string,"status"?: string,"total_paise": number
                  }
                  Update: {
                    "accepted_at"?: string | null,"base_paise"?: number,"deliverables"?: (string)[],"delivery_by"?: string,"gst_paise"?: number,"gst_percent"?: number,"id"?: string,"issued_at"?: string,"issued_by"?: string | null,"kind"?: string,"line_items"?: Json | null,"notes"?: string | null,"payment_id"?: string | null,"revisions"?: number,"service_order_id"?: string,"status"?: string,"total_paise"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "service_quotes_issued_by_fkey"
      columns: ["issued_by"]
isOneToOne: false
      referencedRelation: "author_balances"
      referencedColumns: ["author_id"]
    },{
      foreignKeyName: "service_quotes_issued_by_fkey"
      columns: ["issued_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "service_quotes_issued_by_fkey"
      columns: ["issued_by"]
isOneToOne: false
      referencedRelation: "public_authors"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "service_quotes_issued_by_fkey"
      columns: ["issued_by"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "service_quotes_payment_id_fkey"
      columns: ["payment_id"]
isOneToOne: false
      referencedRelation: "payments"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "service_quotes_service_order_id_fkey"
      columns: ["service_order_id"]
isOneToOne: false
      referencedRelation: "service_orders"
      referencedColumns: ["id"]
    }
                  ]
                },"settings": {
                  Row: {
                    "description": string | null,"key": string,"updated_at": string,"updated_by": string | null,"value": NonNullable<Json>
                  }
                  ComputedFields: never
                  Insert: {
                    "description"?: string | null,"key": string,"updated_at"?: string,"updated_by"?: string | null,"value": NonNullable<Json>
                  }
                  Update: {
                    "description"?: string | null,"key"?: string,"updated_at"?: string,"updated_by"?: string | null,"value"?: NonNullable<Json>
                  }
                  Relationships: [
                    {
      foreignKeyName: "settings_updated_by_fkey"
      columns: ["updated_by"]
isOneToOne: false
      referencedRelation: "author_balances"
      referencedColumns: ["author_id"]
    },{
      foreignKeyName: "settings_updated_by_fkey"
      columns: ["updated_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "settings_updated_by_fkey"
      columns: ["updated_by"]
isOneToOne: false
      referencedRelation: "public_authors"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "settings_updated_by_fkey"
      columns: ["updated_by"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"shipping_promotions": {
                  Row: {
                    "active": boolean,"amount_paise": number,"created_at": string,"created_by": string | null,"ends_at": string | null,"funded_by": string,"id": string,"kind": string,"min_books_paise": number,"name": string,"starts_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"amount_paise"?: number,"created_at"?: string,"created_by"?: string | null,"ends_at"?: string | null,"funded_by"?: string,"id"?: string,"kind": string,"min_books_paise"?: number,"name": string,"starts_at"?: string
                  }
                  Update: {
                    "active"?: boolean,"amount_paise"?: number,"created_at"?: string,"created_by"?: string | null,"ends_at"?: string | null,"funded_by"?: string,"id"?: string,"kind"?: string,"min_books_paise"?: number,"name"?: string,"starts_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "shipping_promotions_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "author_balances"
      referencedColumns: ["author_id"]
    },{
      foreignKeyName: "shipping_promotions_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "shipping_promotions_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "public_authors"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "shipping_promotions_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"shipping_rates": {
                  Row: {
                    "id": string,"max_weight_g": number,"price_paise": number,"zone_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "id"?: string,"max_weight_g": number,"price_paise": number,"zone_id": string
                  }
                  Update: {
                    "id"?: string,"max_weight_g"?: number,"price_paise"?: number,"zone_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "shipping_rates_zone_id_fkey"
      columns: ["zone_id"]
isOneToOne: false
      referencedRelation: "shipping_zones"
      referencedColumns: ["id"]
    }
                  ]
                },"shipping_zones": {
                  Row: {
                    "active": boolean,"created_at": string,"extra_per_500g_paise": number,"id": string,"is_sample": boolean,"name": string,"pincode_prefixes": (string)[]
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"created_at"?: string,"extra_per_500g_paise"?: number,"id"?: string,"is_sample"?: boolean,"name": string,"pincode_prefixes": (string)[]
                  }
                  Update: {
                    "active"?: boolean,"created_at"?: string,"extra_per_500g_paise"?: number,"id"?: string,"is_sample"?: boolean,"name"?: string,"pincode_prefixes"?: (string)[]
                  }
                  Relationships: [
                    
                  ]
                },"subscription_periods": {
                  Row: {
                    "author_id": string,"created_at": string,"credits_granted": number,"ends_at": string | null,"id": string,"payment_id": string | null,"plan_version_id": string,"refund_note": string | null,"refunded_at": string | null,"starts_at": string | null,"status": string
                  }
                  ComputedFields: never
                  Insert: {
                    "author_id": string,"created_at"?: string,"credits_granted"?: number,"ends_at"?: string | null,"id"?: string,"payment_id"?: string | null,"plan_version_id": string,"refund_note"?: string | null,"refunded_at"?: string | null,"starts_at"?: string | null,"status"?: string
                  }
                  Update: {
                    "author_id"?: string,"created_at"?: string,"credits_granted"?: number,"ends_at"?: string | null,"id"?: string,"payment_id"?: string | null,"plan_version_id"?: string,"refund_note"?: string | null,"refunded_at"?: string | null,"starts_at"?: string | null,"status"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "subscription_periods_author_id_fkey"
      columns: ["author_id"]
isOneToOne: false
      referencedRelation: "author_balances"
      referencedColumns: ["author_id"]
    },{
      foreignKeyName: "subscription_periods_author_id_fkey"
      columns: ["author_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "subscription_periods_author_id_fkey"
      columns: ["author_id"]
isOneToOne: false
      referencedRelation: "public_authors"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "subscription_periods_author_id_fkey"
      columns: ["author_id"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "subscription_periods_payment_id_fkey"
      columns: ["payment_id"]
isOneToOne: true
      referencedRelation: "payments"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "subscription_periods_plan_version_id_fkey"
      columns: ["plan_version_id"]
isOneToOne: false
      referencedRelation: "plan_versions"
      referencedColumns: ["id"]
    }
                  ]
                },"user_blocks": {
                  Row: {
                    "blocked_id": string,"blocker_id": string,"created_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "blocked_id": string,"blocker_id": string,"created_at"?: string
                  }
                  Update: {
                    "blocked_id"?: string,"blocker_id"?: string,"created_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "user_blocks_blocked_id_fkey"
      columns: ["blocked_id"]
isOneToOne: false
      referencedRelation: "author_balances"
      referencedColumns: ["author_id"]
    },{
      foreignKeyName: "user_blocks_blocked_id_fkey"
      columns: ["blocked_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "user_blocks_blocked_id_fkey"
      columns: ["blocked_id"]
isOneToOne: false
      referencedRelation: "public_authors"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "user_blocks_blocked_id_fkey"
      columns: ["blocked_id"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "user_blocks_blocker_id_fkey"
      columns: ["blocker_id"]
isOneToOne: false
      referencedRelation: "author_balances"
      referencedColumns: ["author_id"]
    },{
      foreignKeyName: "user_blocks_blocker_id_fkey"
      columns: ["blocker_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "user_blocks_blocker_id_fkey"
      columns: ["blocker_id"]
isOneToOne: false
      referencedRelation: "public_authors"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "user_blocks_blocker_id_fkey"
      columns: ["blocker_id"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            "author_balances": {
                  Row: {
                    "author_id": string | null,"balance": number | null,"copies_sold": number | null,"earned": number | null,"full_name": string | null,"paid": number | null,"payout_upi": string | null,"phone": string | null
                  }
                  ComputedFields: never
                  Relationships: [
                    
                  ]
                },"current_service_catalog": {
                  Row: {
                    "active": boolean | null,"code": string | null,"created_at": string | null,"created_by": string | null,"deliverables": (string)[] | null,"exclusions": (string)[] | null,"gst_percent": number | null,"id": string | null,"max_paise": number | null,"min_paise": number | null,"name": string | null,"price_paise": number | null,"pricing": string | null,"requires": (string)[] | null,"revision_rounds": number | null,"scope": string | null,"sort": number | null,"version": number | null
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "service_catalog_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "author_balances"
      referencedColumns: ["author_id"]
    },{
      foreignKeyName: "service_catalog_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "service_catalog_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "public_authors"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "service_catalog_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"printer_load": {
                  Row: {
                    "active": boolean | null,"open_jobs": number | null,"printer_id": string | null,"state": string | null
                  }
                  ComputedFields: never
                  Relationships: [
                    
                  ]
                },"public_authors": {
                  Row: {
                    "avatar_path": string | null,"bio": string | null,"full_name": string | null,"handle": string | null,"id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                           "avatar_path"?: string | null,"bio"?: string | null,"full_name"?: string | null,"handle"?: string | null,"id"?: string | null
                         }
                        Update: {
                           "avatar_path"?: string | null,"bio"?: string | null,"full_name"?: string | null,"handle"?: string | null,"id"?: string | null
                         }
                        Relationships: [
                    
                  ]
                },"public_profiles": {
                  Row: {
                    "avatar_path": string | null,"bio": string | null,"full_name": string | null,"handle": string | null,"id": string | null,"is_author": boolean | null,"verified_author": boolean | null
                  }
                  ComputedFields: never
                  Insert: {
                           "avatar_path"?: string | null,"bio"?: string | null,"full_name"?: string | null,"handle"?: string | null,"id"?: string | null,"is_author"?: never,"verified_author"?: never
                         }
                        Update: {
                           "avatar_path"?: string | null,"bio"?: string | null,"full_name"?: string | null,"handle"?: string | null,"id"?: string | null,"is_author"?: never,"verified_author"?: never
                         }
                        Relationships: [
                    
                  ]
                }
          }
          Functions: {
            "activate_subscription":
{ Args: { "p_fee_paise"?: number,"p_payment": string,"p_razorpay_payment_id": string }; Returns: {
              "author_id": string,
"created_at": string,
"credits_granted": number,
"ends_at": string | null,
"id": string,
"payment_id": string | null,
"plan_version_id": string,
"refund_note": string | null,
"refunded_at": string | null,
"starts_at": string | null,
"status": string
            }
                          SetofOptions: {
        from: "*"
        to: "subscription_periods"
        isOneToOne: true
        isSetofReturn: false
      } },
"active_pro_period":
{ Args: { "p_at"?: string,"p_author": string }; Returns: {
              "author_id": string,
"created_at": string,
"credits_granted": number,
"ends_at": string | null,
"id": string,
"payment_id": string | null,
"plan_version_id": string,
"refund_note": string | null,
"refunded_at": string | null,
"starts_at": string | null,
"status": string
            }
                          SetofOptions: {
        from: "*"
        to: "subscription_periods"
        isOneToOne: true
        isSetofReturn: false
      } },
"admin_finance":
{ Args: { "p_from": string,"p_to": string }; Returns: Json
                           },
"article_is_public":
{ Args: { "p_article": string }; Returns: boolean
                           },
"assign_eeid":
{ Args: { "p_admin": string,"p_book": string,"p_via"?: string }; Returns: string
                           },
"author_commission_rule":
{ Args: { "p_at"?: string,"p_author": string }; Returns: {
              "commission_gst_percent": number,
"commission_min_paise": number,
"commission_percent": number,
"created_at": string,
"created_by": string | null,
"credits_per_period": number,
"effective_from": string,
"gst_percent": number,
"id": string,
"note": string | null,
"plan": string,
"price_paise": number,
"version": number
            }
                          SetofOptions: {
        from: "*"
        to: "plan_versions"
        isOneToOne: true
        isSetofReturn: false
      } },
"begin_payment_refund":
{ Args: { "p_actor": string,"p_amount": number,"p_payment": string,"p_reason": string,"p_retry"?: string }; Returns: string
                           },
"can_add_live_print_cover":
{ Args: { "object_name": string }; Returns: boolean
                           },
"can_edit_book_files":
{ Args: { "object_name": string }; Returns: boolean
                           },
"can_request_distribution":
{ Args: { "target": string }; Returns: boolean
                           },
"has_active_pro":
{ Args: { "p_author": string }; Returns: boolean
                           },
"is_admin":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"is_earning_status":
{ Args: { "s": Database["public"]['Enums']["order_status"] }; Returns: boolean
                           },
"line_earning":
{ Args: { "oi": Omit<Database["public"]['Tables']["order_items"]['Row'], Database["public"]['Tables']["order_items"]['ComputedFields']> }; Returns: number
                           },
"my_balance":
{ Args: Record<PropertyKey, never>; Returns: {
              "balance": number,"copies_sold": number,"earned": number,"paid": number
            }[]
                           },
"my_book_orders":
{ Args: { "max_rows"?: number,"skip"?: number }; Returns: {
              "book_title": string,"delivered_at": string,"earning": number,"order_item_id": string,"order_number": string,"paid_at": string,"quantity": number,"ship_city": string,"ship_state": string,"shipped_at": string,"status": Database["public"]['Enums']["order_status"],"total_count": number
            }[]
                           },
"my_campaign_stats":
{ Args: Record<PropertyKey, never>; Returns: {
              "archived": boolean,"book_id": string,"clicks": number,"code": string,"copies": number,"created_at": string,"label": string,"link_id": string,"orders": number
            }[]
                           },
"my_role":
{ Args: Record<PropertyKey, never>; Returns: Database["public"]['Enums']["app_role"]
                           },
"my_sales_by_book":
{ Args: Record<PropertyKey, never>; Returns: {
              "book_id": string,"copies": number,"earnings": number
            }[]
                           },
"my_sales_by_city":
{ Args: { "since"?: string }; Returns: {
              "city": string,"copies": number,"earnings": number,"state": string
            }[]
                           },
"my_sales_by_month":
{ Args: { "months"?: number }; Returns: {
              "copies": number,"earnings": number,"month": string
            }[]
                           },
"my_sales_series":
{ Args: { "p_from": string,"p_grain"?: string,"p_to": string }; Returns: {
              "book_id": string,"copies": number,"earnings": number,"period": string
            }[]
                           },
"owns_service_order":
{ Args: { "object_name": string }; Returns: boolean
                           },
"pay_service_quote":
{ Args: { "p_fee_paise"?: number,"p_payment": string,"p_razorpay_payment_id": string }; Returns: {
              "author_id": string,
"book_id": string | null,
"cancel_reason": string | null,
"cancelled_at": string | null,
"catalog_id": string | null,
"completed_at": string | null,
"created_at": string,
"id": string,
"kind": string,
"order_number": string,
"pro_period_id": string | null,
"qc": Json | null,
"requirements": NonNullable<Json>,
"revisions_allowed": number,
"revisions_used": number,
"rights_confirmed": boolean,
"started_at": string | null,
"status": Database["public"]['Enums']["service_status"],
"submitted_at": string | null,
"updated_at": string,
"upgrade_from": (string)[] | null
            }
                          SetofOptions: {
        from: "*"
        to: "service_orders"
        isOneToOne: true
        isSetofReturn: false
      } },
"period_credit_balance":
{ Args: { "p_period": string }; Returns: number
                           },
"plan_version_at":
{ Args: { "p_at"?: string,"p_plan": string }; Returns: {
              "commission_gst_percent": number,
"commission_min_paise": number,
"commission_percent": number,
"created_at": string,
"created_by": string | null,
"credits_per_period": number,
"effective_from": string,
"gst_percent": number,
"id": string,
"note": string | null,
"plan": string,
"price_paise": number,
"version": number
            }
                          SetofOptions: {
        from: "*"
        to: "plan_versions"
        isOneToOne: true
        isSetofReturn: false
      } },
"post_is_public":
{ Args: { "p": string }; Returns: boolean
                           },
"publish_article":
{ Args: { "p_article": string,"p_author": string }; Returns: {
              "first_time": boolean,"notified": number
            }[]
                           },
"publish_post":
{ Args: { "p_author": string,"p_post": string }; Returns: {
              "first_time": boolean,"notified": number
            }[]
                           },
"reply_to_distribution_review":
{ Args: { "p_id": string,"p_markets": string,"p_previous": string,"p_reply": string,"p_residence": string }; Returns: boolean
                           },
"review_is_verified":
{ Args: { "p_book": string,"p_user": string }; Returns: boolean
                           },
"settle_payment_refund":
{ Args: { "p_error"?: string,"p_razorpay_id"?: string,"p_refund": string,"p_status": string }; Returns: undefined
                           },
"use_pro_credit":
{ Args: { "p_author": string,"p_service_order": string }; Returns: string
                           }
          }
          Enums: {
            "app_role": "reader"|"author"|"printer"|"admin","book_status": "draft"|"in_review"|"changes_requested"|"published"|"unpublished","order_status": "pending_payment"|"paid"|"accepted"|"printing"|"printed"|"packed"|"shipped"|"delivered"|"cancelled","payout_status": "pending"|"paid"|"cancelled","service_status": "requirements_pending"|"scope_review"|"quote_awaiting_acceptance"|"payment_pending"|"queued"|"in_progress"|"author_review"|"revision_requested"|"completed"|"cancelled"|"refunded"
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
            "app_role": ["reader", "author", "printer", "admin"],"book_status": ["draft", "in_review", "changes_requested", "published", "unpublished"],"order_status": ["pending_payment", "paid", "accepted", "printing", "printed", "packed", "shipped", "delivered", "cancelled"],"payout_status": ["pending", "paid", "cancelled"],"service_status": ["requirements_pending", "scope_review", "quote_awaiting_acceptance", "payment_pending", "queued", "in_progress", "author_review", "revision_requested", "completed", "cancelled", "refunded"]
          }
        }
} as const
