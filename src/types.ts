export type PlayerRole = 'Batsman' | 'Bowler' | 'All-Rounder' | 'Wicket-Keeper';

export interface Player {
  id: string;
  name: string;
  jerseyNumber: number | string;
  role: PlayerRole;
  isCaptain: boolean;
  isWicketKeeper: boolean;
}

export interface Squad {
  id: string;
  teamName: string;
  shortCode: string;
  logoUrl?: string;
  themeColor?: string;
  players: Player[];
}

export type DismissalType =
  | 'Bowled'
  | 'Caught'
  | 'LBW'
  | 'Hit Wicket'
  | 'Stumped'
  | 'Run Out'
  | 'Retired Out'
  | 'Hurt Retired';

export type ExtraType = 'wide' | 'noBall' | 'bye' | 'legBye' | null;

export interface Delivery {
  id: string;
  overIndex: number; // 0-based
  ballInOver: number; // 1 to ballsPerOver for legal balls
  displayOver: string; // e.g. "3.2"
  strikerId: string;
  strikerName: string;
  nonStrikerId: string;
  nonStrikerName: string;
  bowlerId: string;
  bowlerName: string;
  runsScored: number; // batsman runs (0, 1, 2, 3, 4, 5, 6)
  isBoundaryFour: boolean;
  isBoundarySix: boolean;
  extraType?: ExtraType;
  extraRuns: number;
  totalRunsOnBall: number;
  isLegalBall: boolean;
  dismissal?: {
    type: DismissalType;
    playerOutId: string;
    playerOutName: string;
    fielderName?: string;
    extraRunsWithDismissal?: number;
    wasWide?: boolean;
    wasNoBall?: boolean;
    commentary?: string;
  };
  commentary?: string;
  timestamp: number;
}

export interface BatsmanInningStats {
  playerId: string;
  name: string;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  dots: number;
  isOut: boolean;
  dismissalText?: string;
  strikeRate: number;
}

export interface BowlerInningStats {
  playerId: string;
  name: string;
  overs: number;
  legalBalls: number;
  maidens: number;
  runsConceded: number;
  wickets: number;
  dots: number;
  wides: number;
  noBalls: number;
  economy: number;
}

export interface FallOfWicket {
  wicketNumber: number;
  runs: number;
  overs: string;
  playerOutName: string;
}

export interface InningState {
  inningNumber: 1 | 2;
  battingTeamId: string;
  battingTeamName: string;
  battingTeamCode: string;
  bowlingTeamId: string;
  bowlingTeamName: string;
  bowlingTeamCode: string;
  totalRuns: number;
  wickets: number;
  legalBalls: number;
  oversFormatted: string; // e.g. "12.4"
  extras: {
    wides: number;
    noBalls: number;
    byes: number;
    legByes: number;
    total: number;
  };
  strikerId: string;
  nonStrikerId: string;
  currentBowlerId: string;
  batsmen: Record<string, BatsmanInningStats>;
  bowlers: Record<string, BowlerInningStats>;
  fallOfWickets: FallOfWicket[];
  currentPartnership: {
    runs: number;
    balls: number;
    player1Id: string;
    player1Runs: number;
    player2Id: string;
    player2Runs: number;
  };
  deliveries: Delivery[];
  isCompleted: boolean;
}

export interface SuperOverState {
  active: boolean;
  ballsPerOver: number;
  maxWickets: number; // 2 wickets all out in super over
  teamAId: string;
  teamBId: string;
  currentInning: 1 | 2;
  inning1: InningState;
  inning2: InningState;
  targetRuns?: number;
  winnerTeamId?: string;
  resultText?: string;
  isCompleted: boolean;
}

export interface MatchSettings {
  tournamentName: string;
  venue: string;
  matchTitle: string;
  date: string;
  playersPerSide: number; // 6 to 11
  allOutWickets: number; // e.g. 5 for 6-a-side
  totalOvers: number;
  ballsPerOver: number; // default 6, custom 4, 5, 8
}

export type MatchStatus =
  | 'not_started'
  | 'innings1'
  | 'innings_break'
  | 'innings2'
  | 'tied'
  | 'super_over'
  | 'completed';

export interface MatchState {
  id: string;
  settings: MatchSettings;
  teamA: Squad;
  teamB: Squad;
  playingXiA: string[]; // player IDs
  playingXiB: string[]; // player IDs
  tossWinnerId: string;
  tossDecision: 'bat' | 'bowl';
  status: MatchStatus;
  currentInningIndex: 1 | 2;
  inning1: InningState;
  inning2: InningState;
  targetRuns: number; // Target for inning 2
  superOver?: SuperOverState;
  winnerTeamId?: string;
  winDescription?: string;
  isPointsRecorded?: boolean;
}

export type OverlayType =
  | 'scoreboard'
  | 'inning1_summary'
  | 'inning2_summary'
  | 'full_match'
  | 'partnership'
  | 'target_need'
  | 'toss_card'
  | 'super_over_card'
  | 'most_runs'
  | 'most_wickets'
  | 'welcome'
  | 'team1_lineup'
  | 'team2_lineup'
  | 'match_summary'
  | 'match_winner'
  | 'last_over'
  | 'none';

export type ChromaKey = 'transparent' | 'green' | 'blue' | 'magenta';

export interface OverlayConfig {
  activeOverlay: OverlayType;
  chromaKey: ChromaKey;
  visible?: boolean;
  sponsorName?: string;
  customBannerText?: string;
  themeColor: string;
  // Integrated broadcast-studio features from the second application
  showTicker?: boolean;
  tickerText?: string;
  customAdUrl?: string;
  customAdMediaType?: 'auto' | 'image' | 'video' | 'youtube';
  customAdTitle?: string;
  customAdVideoMuted?: boolean;
  customAdVideoLoop?: boolean;
  timeoutTimerSeconds?: number;
  timeoutTimerActive?: boolean;
  showTargetEquation?: boolean;
}

export interface TournamentPlayerStat {
  id: string;
  name: string;
  teamCode: string;
  teamId?: string;
  value: number;
  secondaryValue?: string;
}

export interface TournamentStats {
  totalSixes: number;
  totalFours: number;
  totalDots: number;
  mostRuns: TournamentPlayerStat[];
  mostWickets: TournamentPlayerStat[];
  mostSixes: TournamentPlayerStat[];
  mostFours: TournamentPlayerStat[];
  bestFielders: TournamentPlayerStat[];
}

export interface StandingRow {
  teamId: string;
  teamName: string;
  shortCode: string;
  played: number;
  won: number;
  lost: number;
  tied: number;
  noResult: number;
  points: number;
  nrr: number;
  runsFor: number;
  oversFor: number;
  runsAgainst: number;
  oversAgainst: number;
  form: ('W' | 'L' | 'T' | 'NR')[];
}

export interface TournamentGroup {
  id: string;
  name: string; // e.g. "Group A"
  standings: StandingRow[];
}

export type TournamentStageType =
  | 'group_stage'
  | 'super_10'
  | 'super_8'
  | 'super_4'
  | 'semifinal'
  | 'final';

export interface TournamentStage {
  id: string;
  name: string;
  type: TournamentStageType;
  groups: TournamentGroup[];
}

export interface MatchFixture {
  id: string;
  stageId: string;
  matchNumber: number;
  title: string;
  teamAId: string;
  teamAName: string;
  teamACode: string;
  teamBId: string;
  teamBName: string;
  teamBCode: string;
  date: string;
  venue: string;
  status: 'upcoming' | 'live' | 'completed';
  resultText?: string;
  scoresSummary?: string;
  hasScorecard: boolean;
}

export interface MilestonePopup {
  type: 'six' | 'four' | 'dot';
  totalCount: number;
  timestamp: number;
}
