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
          permission_level?: string;
          active?: boolean;
        };
        Update: {
          full_name?: string;
          nickname?: string;
          year?: string;
          avatar_url?: string | null;
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
        Relationships: [];
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
        Relationships: [];
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
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
