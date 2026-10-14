export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: {
          extensions?: Json;
          operationName?: string;
          query?: string;
          variables?: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      books: {
        Row: {
          author_id: string;
          author_name: string;
          binding: string;
          cover_finish: string;
          cover_path: string | null;
          created_at: string;
          description: string | null;
          genre: string | null;
          id: string;
          interior: string;
          isbn: string | null;
          language: string;
          manuscript_path: string | null;
          mrp: number | null;
          page_count: number | null;
          paper: string;
          print_cost: number | null;
          published_at: string | null;
          review_note: string | null;
          reviewed_at: string | null;
          reviewed_by: string | null;
          slug: string;
          status: Database["public"]["Enums"]["book_status"];
          submitted_at: string | null;
          subtitle: string | null;
          title: string;
          trim_size: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          author_id: string;
          author_name: string;
          binding?: string;
          cover_finish?: string;
          cover_path?: string | null;
          created_at?: string;
          description?: string | null;
          genre?: string | null;
          id?: string;
          interior?: string;
          isbn?: string | null;
          language?: string;
          manuscript_path?: string | null;
          mrp?: number | null;
          page_count?: number | null;
          paper?: string;
          print_cost?: number | null;
          published_at?: string | null;
          review_note?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          slug: string;
          status?: Database["public"]["Enums"]["book_status"];
          submitted_at?: string | null;
          subtitle?: string | null;
          title: string;
          trim_size?: string;
          updated_at?: string;
        };
        Update: {
          author_id?: string;
          author_name?: string;
          binding?: string;
          cover_finish?: string;
          cover_path?: string | null;
          created_at?: string;
          description?: string | null;
          genre?: string | null;
          id?: string;
          interior?: string;
          isbn?: string | null;
          language?: string;
          manuscript_path?: string | null;
          mrp?: number | null;
          page_count?: number | null;
          paper?: string;
          print_cost?: number | null;
          published_at?: string | null;
          review_note?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          slug?: string;
          status?: Database["public"]["Enums"]["book_status"];
          submitted_at?: string | null;
          subtitle?: string | null;
          title?: string;
          trim_size?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "books_author_id_fkey";
            columns: ["author_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "books_reviewed_by_fkey";
            columns: ["reviewed_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      order_items: {
        Row: {
          author_earning: number;
          author_id: string;
          book_id: string;
          created_at: string;
          id: string;
          order_id: string;
          payment_fee: number;
          platform_fee: number;
          print_cost: number;
          quantity: number;
          unit_price: number;
        };
        ComputedFields: never;
        Insert: {
          author_earning: number;
          author_id: string;
          book_id: string;
          created_at?: string;
          id?: string;
          order_id: string;
          payment_fee: number;
          platform_fee: number;
          print_cost: number;
          quantity: number;
          unit_price: number;
        };
        Update: {
          author_earning?: number;
          author_id?: string;
          book_id?: string;
          created_at?: string;
          id?: string;
          order_id?: string;
          payment_fee?: number;
          platform_fee?: number;
          print_cost?: number;
          quantity?: number;
          unit_price?: number;
        };
        Relationships: [
          {
            foreignKeyName: "order_items_author_id_fkey";
            columns: ["author_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "order_items_book_id_fkey";
            columns: ["book_id"];
            isOneToOne: false;
            referencedRelation: "books";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "order_items_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
        ];
      };
      orders: {
        Row: {
          buyer_id: string;
          courier: string | null;
          created_at: string;
          delivered_at: string | null;
          id: string;
          order_number: string;
          paid_at: string | null;
          printed_at: string | null;
          printer_id: string | null;
          razorpay_order_id: string | null;
          razorpay_payment_id: string | null;
          ship_city: string;
          ship_line1: string;
          ship_line2: string | null;
          ship_name: string;
          ship_phone: string;
          ship_pincode: string;
          ship_state: string;
          shipped_at: string | null;
          shipping: number;
          status: Database["public"]["Enums"]["order_status"];
          subtotal: number;
          total: number;
          tracking_number: string | null;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          buyer_id: string;
          courier?: string | null;
          created_at?: string;
          delivered_at?: string | null;
          id?: string;
          order_number?: string;
          paid_at?: string | null;
          printed_at?: string | null;
          printer_id?: string | null;
          razorpay_order_id?: string | null;
          razorpay_payment_id?: string | null;
          ship_city: string;
          ship_line1: string;
          ship_line2?: string | null;
          ship_name: string;
          ship_phone: string;
          ship_pincode: string;
          ship_state: string;
          shipped_at?: string | null;
          shipping?: number;
          status?: Database["public"]["Enums"]["order_status"];
          subtotal: number;
          total: number;
          tracking_number?: string | null;
          updated_at?: string;
        };
        Update: {
          buyer_id?: string;
          courier?: string | null;
          created_at?: string;
          delivered_at?: string | null;
          id?: string;
          order_number?: string;
          paid_at?: string | null;
          printed_at?: string | null;
          printer_id?: string | null;
          razorpay_order_id?: string | null;
          razorpay_payment_id?: string | null;
          ship_city?: string;
          ship_line1?: string;
          ship_line2?: string | null;
          ship_name?: string;
          ship_phone?: string;
          ship_pincode?: string;
          ship_state?: string;
          shipped_at?: string | null;
          shipping?: number;
          status?: Database["public"]["Enums"]["order_status"];
          subtotal?: number;
          total?: number;
          tracking_number?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "orders_buyer_id_fkey";
            columns: ["buyer_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "orders_printer_id_fkey";
            columns: ["printer_id"];
            isOneToOne: false;
            referencedRelation: "printers";
            referencedColumns: ["id"];
          },
        ];
      };
      payouts: {
        Row: {
          amount: number;
          author_id: string;
          created_at: string;
          created_by: string | null;
          id: string;
          note: string | null;
          paid_at: string | null;
          period_end: string | null;
          period_start: string | null;
          reference: string | null;
          status: Database["public"]["Enums"]["payout_status"];
        };
        ComputedFields: never;
        Insert: {
          amount: number;
          author_id: string;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          note?: string | null;
          paid_at?: string | null;
          period_end?: string | null;
          period_start?: string | null;
          reference?: string | null;
          status?: Database["public"]["Enums"]["payout_status"];
        };
        Update: {
          amount?: number;
          author_id?: string;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          note?: string | null;
          paid_at?: string | null;
          period_end?: string | null;
          period_start?: string | null;
          reference?: string | null;
          status?: Database["public"]["Enums"]["payout_status"];
        };
        Relationships: [
          {
            foreignKeyName: "payouts_author_id_fkey";
            columns: ["author_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payouts_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      printers: {
        Row: {
          active: boolean;
          address: string | null;
          city: string;
          contact_name: string | null;
          created_at: string;
          id: string;
          name: string;
          phone: string;
          pincode: string | null;
          rate_overrides: Json | null;
          state: string;
          updated_at: string;
          user_id: string | null;
        };
        ComputedFields: never;
        Insert: {
          active?: boolean;
          address?: string | null;
          city: string;
          contact_name?: string | null;
          created_at?: string;
          id?: string;
          name: string;
          phone: string;
          pincode?: string | null;
          rate_overrides?: Json | null;
          state: string;
          updated_at?: string;
          user_id?: string | null;
        };
        Update: {
          active?: boolean;
          address?: string | null;
          city?: string;
          contact_name?: string | null;
          created_at?: string;
          id?: string;
          name?: string;
          phone?: string;
          pincode?: string | null;
          rate_overrides?: Json | null;
          state?: string;
          updated_at?: string;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "printers_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          city: string | null;
          created_at: string;
          full_name: string | null;
          id: string;
          payout_upi: string | null;
          phone: string | null;
          pincode: string | null;
          role: Database["public"]["Enums"]["app_role"];
          state: string | null;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          city?: string | null;
          created_at?: string;
          full_name?: string | null;
          id: string;
          payout_upi?: string | null;
          phone?: string | null;
          pincode?: string | null;
          role?: Database["public"]["Enums"]["app_role"];
          state?: string | null;
          updated_at?: string;
        };
        Update: {
          city?: string | null;
          created_at?: string;
          full_name?: string | null;
          id?: string;
          payout_upi?: string | null;
          phone?: string | null;
          pincode?: string | null;
          role?: Database["public"]["Enums"]["app_role"];
          state?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      role_invites: {
        Row: {
          created_at: string;
          note: string | null;
          phone: string;
          role: Database["public"]["Enums"]["app_role"];
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          note?: string | null;
          phone: string;
          role: Database["public"]["Enums"]["app_role"];
        };
        Update: {
          created_at?: string;
          note?: string | null;
          phone?: string;
          role?: Database["public"]["Enums"]["app_role"];
        };
        Relationships: [];
      };
      settings: {
        Row: {
          description: string | null;
          key: string;
          updated_at: string;
          updated_by: string | null;
          value: NonNullable<Json>;
        };
        ComputedFields: never;
        Insert: {
          description?: string | null;
          key: string;
          updated_at?: string;
          updated_by?: string | null;
          value: NonNullable<Json>;
        };
        Update: {
          description?: string | null;
          key?: string;
          updated_at?: string;
          updated_by?: string | null;
          value?: NonNullable<Json>;
        };
        Relationships: [
          {
            foreignKeyName: "settings_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      is_admin: { Args: Record<PropertyKey, never>; Returns: boolean };
      my_role: {
        Args: Record<PropertyKey, never>;
        Returns: Database["public"]["Enums"]["app_role"];
      };
    };
    Enums: {
      app_role: "reader" | "author" | "printer" | "admin";
      book_status:
        | "draft"
        | "in_review"
        | "changes_requested"
        | "published"
        | "unpublished";
      order_status:
        | "pending_payment"
        | "paid"
        | "printing"
        | "printed"
        | "shipped"
        | "delivered"
        | "cancelled";
      payout_status: "pending" | "paid" | "cancelled";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      app_role: ["reader", "author", "printer", "admin"],
      book_status: [
        "draft",
        "in_review",
        "changes_requested",
        "published",
        "unpublished",
      ],
      order_status: [
        "pending_payment",
        "paid",
        "printing",
        "printed",
        "shipped",
        "delivered",
        "cancelled",
      ],
      payout_status: ["pending", "paid", "cancelled"],
    },
  },
} as const;
