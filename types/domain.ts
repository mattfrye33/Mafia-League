export type PermissionLevel = "player" | "narrator" | "admin";

export const PERMISSION_LEVELS: PermissionLevel[] = ["player", "narrator", "admin"];

export type PlayerYear =
  | "freshman"
  | "sophomore"
  | "junior"
  | "senior"
  | "graduate"
  | "other";

export const PLAYER_YEARS: PlayerYear[] = [
  "freshman",
  "sophomore",
  "junior",
  "senior",
  "graduate",
  "other",
];

export const YEAR_LABELS: Record<PlayerYear, string> = {
  freshman: "Freshman",
  sophomore: "Sophomore",
  junior: "Junior",
  senior: "Senior",
  graduate: "Graduate",
  other: "Other",
};

export type Alignment = "civilian" | "mafia";

export type GameStatus = "draft" | "active" | "paused" | "completed" | "cancelled" | "test";

export type DeathReason = "vote" | "mafia_kill" | "snipe" | "kamikaze" | "manual" | "other";

export const DEATH_REASONS: DeathReason[] = ["vote", "mafia_kill", "snipe", "kamikaze", "manual", "other"];

export const DEATH_REASON_LABELS: Record<DeathReason, string> = {
  vote: "Voted Out",
  mafia_kill: "Mafia Kill",
  snipe: "Sniped",
  kamikaze: "Kamikaze",
  manual: "Manual",
  other: "Other",
};

export type GamePhase = "night_godfather" | "night_cop" | "night_medic" | "night_silencer" | "night_resolve" | "day";

export interface Profile {
  id: string;
  full_name: string;
  nickname: string;
  year: PlayerYear;
  avatar_url: string | null;
  bio: string | null;
  permission_level: PermissionLevel;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export const BIO_MAX_LENGTH = 200;

export interface Badge {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: string;
  sort_order: number;
  active: boolean;
}

export interface Role {
  id: string;
  name: string;
  slug: string;
  description: string;
  default_alignment: Alignment;
  acts_at_night: boolean;
  ability_type: string | null;
  uses_per_game: number | null;
  can_be_recruited: boolean;
  active: boolean;
  sort_order: number;
}

export interface RulesSection {
  section: string;
  body: string;
}

export interface RulesVersion {
  id: string;
  version: string;
  content: RulesSection[];
  is_current: boolean;
  created_at: string;
  created_by: string | null;
}

export interface LeaguePublicInfo {
  league_name: string;
  current_season: string;
}

export interface Game {
  id: string;
  league_number: number | null;
  status: GameStatus;
  narrator_id: string;
  rules_version_id: string | null;
  current_round: number;
  winner_alignment: Alignment | null;
  started_at: string | null;
  ended_at: string | null;
  total_paused_seconds: number;
  official_duration_seconds: number | null;
  godfather_recruits_allowed: number;
  godfather_recruits_used: number;
  is_test: boolean;
  phase: GamePhase;
  /** The Godfather's held kill target for the current night, resolved (or not) at night_resolve. */
  pending_mafia_kill_game_player_id: string | null;
  /** The Medic's protect target for the current night. */
  pending_medic_protect_game_player_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface GamePlayerRow {
  id: string;
  game_id: string;
  /** Exactly one of player_id / test_player_id is ever set. */
  player_id: string | null;
  test_player_id: string | null;
  base_role_id: string;
  original_alignment: Alignment;
  current_alignment: Alignment;
  alive: boolean;
  death_reason: DeathReason | null;
  died_round: number | null;
  recruited: boolean;
  /** References another game_players.id — the recruiting Godfather may be a test player. */
  recruited_by_game_player_id: string | null;
  role_ability_used: boolean;
  silenced_until_round: number | null;
  godfather_check_count: number;
  self_save_count: number;
  created_at: string;
}

export interface GamePlayerWithDetails extends GamePlayerRow {
  profile: Pick<Profile, "id" | "full_name" | "nickname" | "avatar_url"> | null;
  test_player: Pick<TestPlayer, "id" | "full_name" | "nickname"> | null;
  role: Pick<Role, "id" | "name" | "slug" | "default_alignment">;
}

/** Login-less fake participant, usable only in Test Games. */
export interface TestPlayer {
  id: string;
  full_name: string;
  nickname: string | null;
  created_by: string | null;
  created_at: string;
}

/** Player-facing setup counts. godfatherRecruits is independent — it's not a
 * role slot, so it's deliberately excluded from the "assigned == selected" sum.
 * There is no `mafia` count: at game start the only Mafia-aligned player is
 * the Godfather — additional Mafia only happen via Phase 3 recruitment. */
export interface RoleCounts {
  godfather: number;
  cop: number;
  medic: number;
  priest: number;
  kamikaze: number;
  silencer: number;
  civilian: number;
  godfatherRecruits: number;
}

/** Career statistics derived from completed games. All zero until Phase 3/4 write game data. */
export interface PlayerCareerStats {
  gamesPlayed: number;
  wins: number;
  losses: number;
  winPct: number;
  mafiaGames: number;
  mafiaWins: number;
  civilianGames: number;
  civilianWins: number;
  godfatherGames: number;
  godfatherWins: number;
  successfulRecruits: number;
  successfulSnipes: number;
  timesRecruited: number;
  medicSaves: number;
  priestUses: number;
  kamikazeKills: number;
  timesSilenced: number;
  totalMafiaHoursSeconds: number;
  avgGameDurationSeconds: number;
}

export const EMPTY_CAREER_STATS: PlayerCareerStats = {
  gamesPlayed: 0,
  wins: 0,
  losses: 0,
  winPct: 0,
  mafiaGames: 0,
  mafiaWins: 0,
  civilianGames: 0,
  civilianWins: 0,
  godfatherGames: 0,
  godfatherWins: 0,
  successfulRecruits: 0,
  successfulSnipes: 0,
  timesRecruited: 0,
  medicSaves: 0,
  priestUses: 0,
  kamikazeKills: 0,
  timesSilenced: 0,
  totalMafiaHoursSeconds: 0,
  avgGameDurationSeconds: 0,
};
