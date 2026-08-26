/**
 * Hand-written to match supabase/migrations/0001_init.sql.
 * If you have the Supabase CLI linked to your project, you can regenerate
 * this instead with:
 *   npx supabase gen types typescript --project-id <ref> > types/database.types.ts
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string;
          nickname: string;
          year: string;
          avatar_url: string | null;
          bio: string | null;
          permission_level: string;
          active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name: string;
          nickname: string;
          year?: string;
          avatar_url?: string | null;
          bio?: string | null;
          permission_level?: string;
          active?: boolean;
        };
        Update: {
          full_name?: string;
          nickname?: string;
          year?: string;
          avatar_url?: string | null;
          bio?: string | null;
          permission_level?: string;
          active?: boolean;
        };
        Relationships: [];
      };
      league_settings: {
        Row: {
          id: number;
          league_name: string;
          access_code: string;
          current_season: string;
          updated_at: string;
        };
        Insert: {
          id?: number;
          league_name?: string;
          access_code: string;
          current_season?: string;
        };
        Update: {
          league_name?: string;
          access_code?: string;
          current_season?: string;
        };
        Relationships: [];
      };
      roles: {
        Row: {
          id: string;
          name: string;
          slug: string;
          description: string;
          default_alignment: string;
          acts_at_night: boolean;
          ability_type: string | null;
          uses_per_game: number | null;
          can_be_recruited: boolean;
          active: boolean;
          sort_order: number;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          description?: string;
          default_alignment: string;
          acts_at_night?: boolean;
          ability_type?: string | null;
          uses_per_game?: number | null;
          can_be_recruited?: boolean;
          active?: boolean;
          sort_order?: number;
        };
        Update: {
          name?: string;
          slug?: string;
          description?: string;
          default_alignment?: string;
          acts_at_night?: boolean;
          ability_type?: string | null;
          uses_per_game?: number | null;
          can_be_recruited?: boolean;
          active?: boolean;
          sort_order?: number;
        };
        Relationships: [];
      };
      rules_versions: {
        Row: {
          id: string;
          version: string;
          content: Json;
          is_current: boolean;
          created_at: string;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          version: string;
          content: Json;
          is_current?: boolean;
          created_by?: string | null;
        };
        Update: {
          version?: string;
          content?: Json;
          is_current?: boolean;
          created_by?: string | null;
        };
        Relationships: [];
      };
      games: {
        Row: {
          id: string;
          league_number: number | null;
          status: string;
          narrator_id: string;
          rules_version_id: string | null;
          current_round: number;
          winner_alignment: string | null;
          started_at: string | null;
          ended_at: string | null;
          total_paused_seconds: number;
          official_duration_seconds: number | null;
          godfather_recruits_allowed: number;
          godfather_recruits_used: number;
          is_test: boolean;
          phase: string;
          pending_mafia_kill_game_player_id: string | null;
          pending_medic_protect_game_player_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          league_number?: number | null;
          status?: string;
          narrator_id: string;
          rules_version_id?: string | null;
          current_round?: number;
          winner_alignment?: string | null;
          started_at?: string | null;
          ended_at?: string | null;
          total_paused_seconds?: number;
          official_duration_seconds?: number | null;
          godfather_recruits_allowed?: number;
          godfather_recruits_used?: number;
          is_test?: boolean;
          phase?: string;
          pending_mafia_kill_game_player_id?: string | null;
          pending_medic_protect_game_player_id?: string | null;
        };
        Update: {
          league_number?: number | null;
          status?: string;
          is_test?: boolean;
          rules_version_id?: string | null;
          current_round?: number;
          winner_alignment?: string | null;
          started_at?: string | null;
          ended_at?: string | null;
          total_paused_seconds?: number;
          official_duration_seconds?: number | null;
          godfather_recruits_allowed?: number;
          godfather_recruits_used?: number;
          phase?: string;
          pending_mafia_kill_game_player_id?: string | null;
          pending_medic_protect_game_player_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "games_narrator_id_fkey";
            columns: ["narrator_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "games_rules_version_id_fkey";
            columns: ["rules_version_id"];
            isOneToOne: false;
            referencedRelation: "rules_versions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "games_pending_mafia_kill_game_player_id_fkey";
            columns: ["pending_mafia_kill_game_player_id"];
            isOneToOne: false;
            referencedRelation: "game_players";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "games_pending_medic_protect_game_player_id_fkey";
            columns: ["pending_medic_protect_game_player_id"];
            isOneToOne: false;
            referencedRelation: "game_players";
            referencedColumns: ["id"];
          },
        ];
      };
      game_players: {
        Row: {
          id: string;
          game_id: string;
          player_id: string | null;
          test_player_id: string | null;
          base_role_id: string;
          original_alignment: string;
          current_alignment: string;
          alive: boolean;
          death_reason: string | null;
          died_round: number | null;
          recruited: boolean;
          recruited_by_game_player_id: string | null;
          role_ability_used: boolean;
          silenced_until_round: number | null;
          godfather_check_count: number;
          self_save_count: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          game_id: string;
          player_id?: string | null;
          test_player_id?: string | null;
          base_role_id: string;
          original_alignment: string;
          current_alignment: string;
          alive?: boolean;
          death_reason?: string | null;
          died_round?: number | null;
          recruited?: boolean;
          recruited_by_game_player_id?: string | null;
          role_ability_used?: boolean;
          silenced_until_round?: number | null;
          godfather_check_count?: number;
          self_save_count?: number;
        };
        Update: {
          base_role_id?: string;
          original_alignment?: string;
          alive?: boolean;
          current_alignment?: string;
          death_reason?: string | null;
          died_round?: number | null;
          recruited?: boolean;
          recruited_by_game_player_id?: string | null;
          role_ability_used?: boolean;
          silenced_until_round?: number | null;
          godfather_check_count?: number;
          self_save_count?: number;
        };
        Relationships: [
          {
            foreignKeyName: "game_players_game_id_fkey";
            columns: ["game_id"];
            isOneToOne: false;
            referencedRelation: "games";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "game_players_player_id_fkey";
            columns: ["player_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "game_players_test_player_id_fkey";
            columns: ["test_player_id"];
            isOneToOne: false;
            referencedRelation: "test_players";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "game_players_base_role_id_fkey";
            columns: ["base_role_id"];
            isOneToOne: false;
            referencedRelation: "roles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "game_players_recruited_by_game_player_id_fkey";
            columns: ["recruited_by_game_player_id"];
            isOneToOne: false;
            referencedRelation: "game_players";
            referencedColumns: ["id"];
          },
        ];
      };
      test_players: {
        Row: {
          id: string;
          full_name: string;
          nickname: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          full_name: string;
          nickname?: string | null;
          created_by?: string | null;
        };
        Update: {
          full_name?: string;
          nickname?: string | null;
        };
        Relationships: [];
      };
      badges: {
        Row: {
          id: string;
          slug: string;
          name: string;
          description: string;
          category: string;
          sort_order: number;
          active: boolean;
        };
        Insert: {
          id?: string;
          slug: string;
          name: string;
          description: string;
          category?: string;
          sort_order?: number;
          active?: boolean;
        };
        Update: {
          name?: string;
          description?: string;
          category?: string;
          sort_order?: number;
          active?: boolean;
        };
        Relationships: [];
      };
      profile_featured_badges: {
        Row: {
          profile_id: string;
          badge_id: string;
          position: number;
          created_at: string;
        };
        Insert: {
          profile_id: string;
          badge_id: string;
          position: number;
        };
        Update: {
          position?: number;
        };
        Relationships: [
          {
            foreignKeyName: "profile_featured_badges_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "profile_featured_badges_badge_id_fkey";
            columns: ["badge_id"];
            isOneToOne: false;
            referencedRelation: "badges";
            referencedColumns: ["id"];
          },
        ];
      };
      game_actions: {
        Row: {
          id: string;
          game_id: string;
          round: number;
          phase: string | null;
          action_type: string;
          actor_game_player_id: string | null;
          target_game_player_id: string | null;
          payload: Json;
          undone: boolean;
          created_at: string;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          game_id: string;
          round?: number;
          phase?: string | null;
          action_type: string;
          actor_game_player_id?: string | null;
          target_game_player_id?: string | null;
          payload?: Json;
          undone?: boolean;
          created_by?: string | null;
        };
        Update: {
          undone?: boolean;
          payload?: Json;
        };
        Relationships: [];
      };
      game_pauses: {
        Row: {
          id: string;
          game_id: string;
          paused_at: string;
          resumed_at: string | null;
        };
        Insert: {
          id?: string;
          game_id: string;
          paused_at?: string;
          resumed_at?: string | null;
        };
        Update: {
          resumed_at?: string | null;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      get_league_public_info: {
        Args: Record<string, never>;
        Returns: { league_name: string; current_season: string }[];
      };
      verify_access_code: {
        Args: { code: string };
        Returns: boolean;
      };
      get_player_stat_actions: {
        Args: { target_player_id: string };
        Returns: {
          game_id: string;
          round: number;
          action_type: string;
          actor_game_player_id: string | null;
          target_game_player_id: string | null;
          payload: Json;
        }[];
      };
      get_official_game_actions: {
        Args: { target_game_id: string };
        Returns: {
          round: number;
          action_type: string;
          actor_game_player_id: string | null;
          target_game_player_id: string | null;
          payload: Json;
        }[];
      };
      get_official_actions_for_stats: {
        Args: Record<string, never>;
        Returns: {
          game_id: string;
          round: number;
          action_type: string;
          actor_game_player_id: string | null;
          target_game_player_id: string | null;
          payload: Json;
        }[];
      };
      repair_official_game_numbers: {
        Args: Record<string, never>;
        Returns: number;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
