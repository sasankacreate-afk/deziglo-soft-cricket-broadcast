import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import {
  MatchState,
  Squad,
  MatchSettings,
  TournamentStats,
  TournamentStage,
  MatchFixture,
  OverlayConfig,
  DismissalType,
  ExtraType,
  Delivery,
  MilestonePopup,
  SuperOverState,
  InningState,
} from '../types';
import {
  DEFAULT_SQUADS,
  DEFAULT_SETTINGS,
  INITIAL_TOURNAMENT_STATS,
  INITIAL_TOURNAMENT_STAGES,
  INITIAL_FIXTURES,
  createInitialMatch,
  createEmptyInning,
} from '../data/mockData';

interface AddDeliveryParams {
  runs: number;
  isBoundaryFour?: boolean;
  isBoundarySix?: boolean;
  extraType?: ExtraType;
  extraRuns?: number;
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
  customComment?: string;
  newBatterId?: string; // If wicket falls, incoming batsman
}

interface CricketContextType {
  match: MatchState;
  squads: Squad[];
  tournamentStats: TournamentStats;
  stages: TournamentStage[];
  fixtures: MatchFixture[];
  overlayConfig: OverlayConfig;
  milestonePopup: MilestonePopup | null;
  historyStack: MatchState[];
  isMobileDevice: boolean;
  isConnectedLive: boolean;
  
  // Actions
  recordDelivery: (params: AddDeliveryParams) => void;
  undoLastDelivery: () => void;
  setStriker: (playerId: string) => void;
  setNonStriker: (playerId: string) => void;
  setBowler: (playerId: string) => void;
  swapStrikers: () => void;
  updateMatchSettings: (settings: Partial<MatchSettings>) => void;
  updateOverlayConfig: (config: Partial<OverlayConfig>) => void;
  switchInning: () => void;
  startSuperOver: (ballsPerOver?: number) => void;
  dismissSuperOverPrompt: () => void;
  resetMatch: () => void;
  loadMatchFixture: (fixtureId: string) => void;

  // Reset options
  resetMatchForNextSquads: (teamAId: string, teamBId: string, options?: { matchTitle?: string; tossWinnerId?: string; tossDecision?: 'bat' | 'bowl' }) => void;
  clearScoresKeepTeams: () => void;
  fullWipeAll: () => void;

  // Match setup & toss
  assignTeamsAndToss: (teamAId: string, teamBId: string, tossWinnerId: string, tossDecision: 'bat' | 'bowl') => void;

  // Match completion & points table
  finishMatchAndRecordPoints: () => void;

  // Over tracking
  currentOverDeliveries: Delivery[];
  showOverCompletedModal: boolean;
  dismissOverCompletedModal: () => void;
  startNextOver: (newBowlerId: string) => void;

  // Inning break & match completion modals
  showInningBreakModal: boolean;
  dismissInningBreakModal: () => void;
  showMatchFinishedModal: boolean;
  dismissMatchFinishedModal: () => void;
  
  // Squads & Players management
  addSquad: (squad: Squad) => void;
  updateSquad: (squad: Squad) => void;
  deleteSquad: (squadId: string) => void;
  getTeamLogo: (teamId?: string, teamCode?: string) => string | undefined;
  
  // Tournament management
  completedMatches: MatchState[];
  archiveCurrentMatch: () => void;
  deleteCompletedMatch: (matchId: string) => void;
  updateStages: (stages: TournamentStage[]) => void;
  addFixture: (fixture: MatchFixture) => void;
  updateFixture: (fixture: MatchFixture) => void;
  deleteFixture: (fixtureId: string) => void;
  updateTournamentStats: (stats: Partial<TournamentStats>) => void;
}

const CricketContext = createContext<CricketContextType | null>(null);

const STORAGE_KEY = 'deziglo_cricket_state_v1';
const BROADCAST_CHANNEL_NAME = 'deziglo_cricket_broadcast';

// Deduplicate matches so each match ID is processed at most once
export function getUniqueTournamentMatches(
  currentMatch: MatchState | null | undefined,
  completedMatches: MatchState[] | null | undefined
): MatchState[] {
  const matchMap = new Map<string, MatchState>();
  if (Array.isArray(completedMatches)) {
    for (const m of completedMatches) {
      if (m && m.id) {
        matchMap.set(m.id, m);
      }
    }
  }
  if (currentMatch && currentMatch.id) {
    matchMap.set(currentMatch.id, currentMatch);
  }
  return Array.from(matchMap.values());
}

// Pure mathematical aggregation of tournament stats across all unique matches
export function calculateTournamentStats(
  matches: MatchState[],
  squads: Squad[],
  manualBaseline?: { totalSixes?: number; totalFours?: number; totalDots?: number }
): TournamentStats {
  // 1. Deduplicate input matches strictly by match ID
  const uniqueMatchesMap = new Map<string, MatchState>();
  for (const m of matches || []) {
    if (m && m.id) {
      uniqueMatchesMap.set(m.id, m);
    }
  }
  const uniqueMatches = Array.from(uniqueMatchesMap.values());

  const playerMapRuns = new Map<
    string,
    { id: string; name: string; teamCode: string; teamId?: string; runs: number; balls: number; fours: number; sixes: number }
  >();

  const bowlersMap = new Map<
    string,
    { id: string; name: string; teamCode: string; teamId?: string; wickets: number; runsConceded: number; legalBalls: number }
  >();

  const fieldersMap = new Map<
    string,
    { id: string; name: string; teamCode: string; catches: number; runOuts: number; stumpings: number }
  >();

  let totalSixes = manualBaseline?.totalSixes || 0;
  let totalFours = manualBaseline?.totalFours || 0;
  let totalDots = manualBaseline?.totalDots || 0;

  const findTeamCode = (playerId: string, currentMatch: MatchState): string => {
    for (const sq of squads || []) {
      if (sq.players.some((p) => p.id === playerId)) return sq.shortCode;
    }
    return currentMatch.teamA?.players?.some((p) => p.id === playerId)
      ? currentMatch.teamA.shortCode
      : currentMatch.teamB?.shortCode || 'TEAM';
  };

  const findTeamId = (playerId: string, currentMatch: MatchState): string | undefined => {
    for (const sq of squads || []) {
      if (sq.players.some((p) => p.id === playerId)) return sq.id;
    }
    if (currentMatch.teamA?.players?.some((p) => p.id === playerId)) return currentMatch.teamA.id;
    if (currentMatch.teamB?.players?.some((p) => p.id === playerId)) return currentMatch.teamB.id;
    return undefined;
  };

  const isBowlerCreditedDismissal = (type?: string): boolean => {
    if (!type) return false;
    const lower = type.toLowerCase();
    return (
      lower.includes('bowled') ||
      lower.includes('caught') ||
      lower.includes('lbw') ||
      lower.includes('stump') ||
      lower.includes('hit wicket')
    );
  };

  // 2. Iterate each unique match exactly once
  for (const m of uniqueMatches) {
    if (!m) continue;
    const matchInnings = [m.inning1, m.inning2];
    if (m.superOver?.active) {
      if (m.superOver.inning1) matchInnings.push(m.superOver.inning1);
      if (m.superOver.inning2) matchInnings.push(m.superOver.inning2);
    }

    for (const inn of matchInnings) {
      if (!inn) continue;

      // Check if we have delivery-level event stream for accurate calculation
      if (inn.deliveries && inn.deliveries.length > 0) {
        const seenDelIds = new Set<string>();

        for (let delIdx = 0; delIdx < inn.deliveries.length; delIdx++) {
          const d = inn.deliveries[delIdx];
          const delKey = d.id || `inn-${inn.inningNumber || 1}-del-${delIdx}-${d.displayOver || d.ballInOver || delIdx}`;
          if (seenDelIds.has(delKey)) continue;
          seenDelIds.add(delKey);

          // Batting calculations:
          // Rule: Most Runs must count only batter runs.
          // Byes, leg-byes, and wides MUST NOT count as batter runs.
          const isWide = d.extraType === 'wide';
          const isBye = d.extraType === 'bye';
          const isLegBye = d.extraType === 'legBye';
          const isNoBall = d.extraType === 'noBall';

          const batRuns = (isWide || isBye || isLegBye) ? 0 : (d.runsScored || 0);
          const isBallFaced = !isWide && !isNoBall; // Wides and no-balls do not count as balls faced by batter
          const isSix = (d.isBoundarySix || batRuns === 6) && batRuns === 6;
          const isFour = (d.isBoundaryFour || batRuns === 4) && batRuns === 4;

          if (isSix) totalSixes++;
          if (isFour) totalFours++;
          if (batRuns === 0 && d.isLegalBall && !d.dismissal && (!d.extraRuns || d.extraRuns === 0)) totalDots++;

          // Accumulate batter stats
          if (d.strikerName && d.strikerName.trim()) {
            const bKey = d.strikerName.trim().toLowerCase();
            const bTeamCode = findTeamCode(d.strikerId, m) || inn.battingTeamCode;
            const bTeamId = findTeamId(d.strikerId, m) || inn.battingTeamId;
            const existingB = playerMapRuns.get(bKey);
            if (existingB) {
              existingB.runs += batRuns;
              if (isBallFaced) existingB.balls += 1;
              if (isFour) existingB.fours += 1;
              if (isSix) existingB.sixes += 1;
            } else {
              playerMapRuns.set(bKey, {
                id: d.strikerId || `p-${bKey}`,
                name: d.strikerName.trim(),
                teamCode: bTeamCode,
                teamId: bTeamId,
                runs: batRuns,
                balls: isBallFaced ? 1 : 0,
                fours: isFour ? 1 : 0,
                sixes: isSix ? 1 : 0,
              });
            }
          }

          // Accumulate bowler stats
          // Rule: Most Wickets only bowler-credited wickets
          if (d.bowlerName && d.bowlerName.trim()) {
            const boKey = d.bowlerName.trim().toLowerCase();
            const boTeamCode = findTeamCode(d.bowlerId, m) || inn.bowlingTeamCode;
            const boTeamId = findTeamId(d.bowlerId, m) || inn.bowlingTeamId;
            const isCreditedWicket = isBowlerCreditedDismissal(d.dismissal?.type);
            // Runs conceded: Byes and leg-byes are fielding extras, NOT charged to bowler
            let runsConcededOnBall = 0;
            if (!isBye && !isLegBye) {
              runsConcededOnBall += batRuns;
              if (isWide || isNoBall) {
                runsConcededOnBall += (d.extraRuns || 1);
              }
            }

            const existingBo = bowlersMap.get(boKey);
            if (existingBo) {
              if (isCreditedWicket) existingBo.wickets += 1;
              existingBo.runsConceded += runsConcededOnBall;
              if (d.isLegalBall) existingBo.legalBalls += 1;
            } else {
              bowlersMap.set(boKey, {
                id: d.bowlerId || `bw-${boKey}`,
                name: d.bowlerName.trim(),
                teamCode: boTeamCode,
                teamId: boTeamId,
                wickets: isCreditedWicket ? 1 : 0,
                runsConceded: runsConcededOnBall,
                legalBalls: d.isLegalBall ? 1 : 0,
              });
            }
          }

          // Accumulate fielding stats:
          // Rule: catches, run-outs, and stumpings must be calculated separately from bowling wickets
          if (d.dismissal?.fielderName && d.dismissal.fielderName.trim()) {
            const fName = d.dismissal.fielderName.trim();
            const fKey = fName.toLowerCase();
            const isRunOut = d.dismissal.type === 'Run Out';
            const isStumped = d.dismissal.type === 'Stumped';
            const isCatch = d.dismissal.type === 'Caught';

            const existingF = fieldersMap.get(fKey);
            if (existingF) {
              if (isRunOut) existingF.runOuts += 1;
              else if (isStumped) existingF.stumpings += 1;
              else if (isCatch) existingF.catches += 1;
            } else {
              fieldersMap.set(fKey, {
                id: `f-${fKey}`,
                name: fName,
                teamCode: inn.bowlingTeamCode,
                catches: isCatch ? 1 : 0,
                runOuts: isRunOut ? 1 : 0,
                stumpings: isStumped ? 1 : 0,
              });
            }
          }
        }
      } else {
        // Fallback if match has summary batsmen / bowlers without delivery stream
        for (const b of Object.values(inn.batsmen || {})) {
          if (!b.name || (b.runs === 0 && b.balls === 0 && !b.isOut)) continue;
          const key = b.name.trim().toLowerCase();
          const code = findTeamCode(b.playerId, m) || inn.battingTeamCode;
          const teamId = findTeamId(b.playerId, m) || inn.battingTeamId;
          const existing = playerMapRuns.get(key);
          if (existing) {
            existing.runs += b.runs;
            existing.balls += b.balls;
            existing.fours += b.fours;
            existing.sixes += b.sixes;
          } else {
            playerMapRuns.set(key, {
              id: b.playerId || `p-${key}`,
              name: b.name.trim(),
              teamCode: code,
              teamId,
              runs: b.runs,
              balls: b.balls,
              fours: b.fours,
              sixes: b.sixes,
            });
          }
          totalSixes += (b.sixes || 0);
          totalFours += (b.fours || 0);
        }

        for (const bo of Object.values(inn.bowlers || {})) {
          if (!bo.name || (bo.legalBalls === 0 && bo.runsConceded === 0 && bo.wickets === 0)) continue;
          const key = bo.name.trim().toLowerCase();
          const code = findTeamCode(bo.playerId, m) || inn.bowlingTeamCode;
          const teamId = findTeamId(bo.playerId, m) || inn.bowlingTeamId;
          const existing = bowlersMap.get(key);
          if (existing) {
            existing.wickets += bo.wickets;
            existing.runsConceded += bo.runsConceded;
            existing.legalBalls += bo.legalBalls;
          } else {
            bowlersMap.set(key, {
              id: bo.playerId || `bw-${key}`,
              name: bo.name.trim(),
              teamCode: code,
              teamId,
              wickets: bo.wickets,
              runsConceded: bo.runsConceded,
              legalBalls: bo.legalBalls,
            });
          }
        }
      }
    }
  }

  // Top 10 Most Runs (Leaderboard)
  const sortedRuns = Array.from(playerMapRuns.values())
    .filter((p) => p.runs > 0 || p.balls > 0)
    .sort((a, b) => b.runs - a.runs || (b.runs / (b.balls || 1)) - (a.runs / (a.balls || 1)))
    .slice(0, 10)
    .map((p, idx) => {
      const sr = p.balls > 0 ? ((p.runs / p.balls) * 100).toFixed(1) : '0.0';
      return {
        id: `tr-${idx + 1}-${p.id}`,
        name: p.name,
        teamCode: p.teamCode,
        teamId: p.teamId,
        value: p.runs,
        secondaryValue: `SR: ${sr}`,
      };
    });

  // Top 10 Most Wickets (Leaderboard)
  const sortedWickets = Array.from(bowlersMap.values())
    .filter((bo) => bo.wickets > 0 || bo.legalBalls > 0)
    .sort((a, b) => {
      if (b.wickets !== a.wickets) return b.wickets - a.wickets;
      const econA = a.legalBalls > 0 ? a.runsConceded / (a.legalBalls / 6) : 99;
      const econB = b.legalBalls > 0 ? b.runsConceded / (b.legalBalls / 6) : 99;
      return econA - econB;
    })
    .slice(0, 10)
    .map((bo, idx) => {
      const oversNum = bo.legalBalls / 6;
      const econ = oversNum > 0 ? (bo.runsConceded / oversNum).toFixed(2) : '0.00';
      return {
        id: `tw-${idx + 1}-${bo.id}`,
        name: bo.name,
        teamCode: bo.teamCode,
        teamId: bo.teamId,
        value: bo.wickets,
        secondaryValue: `Econ: ${econ}`,
      };
    });

  // Top 10 Most Sixes
  const sortedSixes = Array.from(playerMapRuns.values())
    .filter((p) => p.sixes > 0)
    .sort((a, b) => b.sixes - a.sixes || b.runs - a.runs)
    .slice(0, 10)
    .map((p, idx) => ({
      id: `ts-${idx + 1}-${p.id}`,
      name: p.name,
      teamCode: p.teamCode,
      value: p.sixes,
    }));

  // Top 10 Most Fours
  const sortedFours = Array.from(playerMapRuns.values())
    .filter((p) => p.fours > 0)
    .sort((a, b) => b.fours - a.fours || b.runs - a.runs)
    .slice(0, 10)
    .map((p, idx) => ({
      id: `tf-${idx + 1}-${p.id}`,
      name: p.name,
      teamCode: p.teamCode,
      value: p.fours,
    }));

  // Top 10 Best Fielders (Catches, Run-Outs, Stumpings)
  const sortedFielders = Array.from(fieldersMap.values())
    .map((f) => ({
      ...f,
      total: f.catches + f.runOuts + f.stumpings,
    }))
    .filter((f) => f.total > 0)
    .sort((a, b) => b.total - a.total)
    .slice(0, 10)
    .map((f, idx) => {
      const parts: string[] = [];
      if (f.catches > 0) parts.push(`${f.catches} Ct`);
      if (f.runOuts > 0) parts.push(`${f.runOuts} RO`);
      if (f.stumpings > 0) parts.push(`${f.stumpings} St`);
      return {
        id: `tfi-${idx + 1}-${f.id}`,
        name: f.name,
        teamCode: f.teamCode,
        value: f.total,
        secondaryValue: parts.join(', ') || undefined,
      };
    });

  return {
    totalSixes,
    totalFours,
    totalDots,
    mostRuns: sortedRuns,
    mostWickets: sortedWickets,
    mostSixes: sortedSixes,
    mostFours: sortedFours,
    bestFielders: sortedFielders,
  };
}

// Backward compatibility helper
export function updateStatsWithMatch(
  _prevStats: TournamentStats,
  match: MatchState,
  squads: Squad[]
): TournamentStats {
  return calculateTournamentStats([match], squads);
}

export const CricketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [squads, setSquads] = useState<Squad[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_squads`);
      return saved ? JSON.parse(saved) : DEFAULT_SQUADS;
    } catch {
      return DEFAULT_SQUADS;
    }
  });

  const [tournamentStats, setTournamentStats] = useState<TournamentStats>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_stats`);
      if (saved) {
        const parsed = JSON.parse(saved);
        const hasMockData =
          parsed.mostRuns?.some((r: any) => r.name === 'Pathum Nissanka' || r.name === 'Virat Kohli') ||
          parsed.mostWickets?.some((w: any) => w.name === 'Jasprit Bumrah');
        if (!hasMockData) return parsed;
      }
    } catch {
      return INITIAL_TOURNAMENT_STATS;
    }
    return INITIAL_TOURNAMENT_STATS;
  });

  const [completedMatches, setCompletedMatches] = useState<MatchState[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_completed_matches`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [stages, setStages] = useState<TournamentStage[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_stages`);
      return saved ? JSON.parse(saved) : INITIAL_TOURNAMENT_STAGES;
    } catch {
      return INITIAL_TOURNAMENT_STAGES;
    }
  });

  const [fixtures, setFixtures] = useState<MatchFixture[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_fixtures`);
      return saved ? JSON.parse(saved) : INITIAL_FIXTURES;
    } catch {
      return INITIAL_FIXTURES;
    }
  });

  const [match, setMatch] = useState<MatchState>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_match`);
      return saved ? JSON.parse(saved) : createInitialMatch();
    } catch {
      return createInitialMatch();
    }
  });

  const [historyStack, setHistoryStack] = useState<MatchState[]>([]);

  const [overlayConfig, setOverlayConfig] = useState<OverlayConfig>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_overlay`);
      return saved
        ? JSON.parse(saved)
        : {
            activeOverlay: 'scoreboard',
            chromaKey: 'transparent',
            sponsorName: 'DEZIGLO BROADCAST',
            themeColor: '#f59e0b',
          };
    } catch {
      return {
        activeOverlay: 'scoreboard',
        chromaKey: 'transparent',
        sponsorName: 'DEZIGLO BROADCAST',
        themeColor: '#f59e0b',
      };
    }
  });

  const [milestonePopup, setMilestonePopup] = useState<MilestonePopup | null>(null);
  const milestonePopupRef = useRef<MilestonePopup | null>(null);
  const [isConnectedLive, setIsConnectedLive] = useState(true);

  // Modal triggers for live scoring workflow
  const [showOverCompletedModal, setShowOverCompletedModal] = useState(false);
  const [showInningBreakModal, setShowInningBreakModal] = useState(false);
  const [showMatchFinishedModal, setShowMatchFinishedModal] = useState(false);

  const dismissOverCompletedModal = useCallback(() => setShowOverCompletedModal(false), []);
  const dismissInningBreakModal = useCallback(() => setShowInningBreakModal(false), []);
  const dismissMatchFinishedModal = useCallback(() => setShowMatchFinishedModal(false), []);
  const milestoneTimeoutRef = useRef<any>(null);
  const channelRef = useRef<BroadcastChannel | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // Unique client session ID to prevent echo loops
  const clientSessionId = useRef<string>(
    typeof window !== 'undefined'
      ? 'client_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now().toString(36)
      : 'server_client'
  );
  const lastRemoteTimestampRef = useRef<number>(0);
  const lastRemoteSeqRef = useRef<number>(0);

  // Detect mobile
  const isMobileDevice = typeof window !== 'undefined' && window.innerWidth <= 768;

  // Persist to LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem(`${STORAGE_KEY}_match`, JSON.stringify(match));
      localStorage.setItem(`${STORAGE_KEY}_squads`, JSON.stringify(squads));
      localStorage.setItem(`${STORAGE_KEY}_stats`, JSON.stringify(tournamentStats));
      localStorage.setItem(`${STORAGE_KEY}_completed_matches`, JSON.stringify(completedMatches));
      localStorage.setItem(`${STORAGE_KEY}_stages`, JSON.stringify(stages));
      localStorage.setItem(`${STORAGE_KEY}_fixtures`, JSON.stringify(fixtures));
      localStorage.setItem(`${STORAGE_KEY}_overlay`, JSON.stringify(overlayConfig));
    } catch (e) {
      console.warn('Storage sync error:', e);
    }
  }, [match, squads, tournamentStats, completedMatches, stages, fixtures, overlayConfig]);

  // Central receiver for incoming state from BroadcastChannel, WebSocket, SSE, or Polling
  const applyRemotePayload = useCallback((payload: any) => {
    if (!payload) return;
    if (payload.sourceId && payload.sourceId === clientSessionId.current) return;

    // Sequence check (monotonically increasing on server, eliminates client clock skew)
    if (typeof payload.seq === 'number' && payload.seq > 0) {
      if (payload.seq <= lastRemoteSeqRef.current) return;
      lastRemoteSeqRef.current = payload.seq;
    } else if (payload.timestamp) {
      if (payload.timestamp <= lastRemoteTimestampRef.current) return;
      lastRemoteTimestampRef.current = payload.timestamp;
    }

    if (payload.match) {
      setMatch(payload.match);
    }
    if (payload.overlay) {
      setOverlayConfig(payload.overlay);
    }
    if (payload.stats) {
      setTournamentStats(payload.stats);
    }
    if (payload.squads && Array.isArray(payload.squads) && payload.squads.length > 0) {
      setSquads(payload.squads);
    }
    if (payload.milestonePopup !== undefined) {
      setMilestonePopup(payload.milestonePopup);
      milestonePopupRef.current = payload.milestonePopup;
      if (payload.milestonePopup) {
        if (milestoneTimeoutRef.current) clearTimeout(milestoneTimeoutRef.current);
        const age = Date.now() - (payload.milestonePopup.timestamp || Date.now());
        const remaining = Math.max(1000, 5000 - age);
        milestoneTimeoutRef.current = setTimeout(() => {
          setMilestonePopup(null);
          milestonePopupRef.current = null;
        }, remaining);
      }
    }
  }, []);

  // BroadcastChannel for instant zero-latency same-device tabs / OBS browser source sync
  useEffect(() => {
    if (typeof BroadcastChannel !== 'undefined') {
      const channel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
      channelRef.current = channel;

      channel.onmessage = (event) => {
        if (event.data?.type === 'SYNC_STATE' && event.data.payload) {
          applyRemotePayload(event.data.payload);
        }
      };

      return () => {
        channel.close();
      };
    }
  }, [applyRemotePayload]);

  // Broadcast to other tabs and the server. WebSocket is the single primary
  // transport; HTTP is used only when the socket is unavailable. Sending the
  // same state through WS + HTTP at the same time caused duplicate sequence
  // numbers, duplicate React renders and visible lag on OBS/mobile.
  const broadcastCurrentState = useCallback(
    (
      newMatch: MatchState,
      newOverlay?: OverlayConfig,
      newStats?: TournamentStats,
      newSquads?: Squad[],
      newMilestone?: MilestonePopup | null
    ) => {
      const payload = {
        sourceId: clientSessionId.current,
        match: newMatch,
        overlay: newOverlay || overlayConfig,
        stats: newStats || tournamentStats,
        squads: newSquads || squads,
        milestonePopup: newMilestone !== undefined ? newMilestone : milestonePopupRef.current,
        timestamp: Date.now(),
      };

      try {
        channelRef.current?.postMessage({ type: 'SYNC_STATE', payload });
      } catch {}

      const socket = wsRef.current;
      if (socket?.readyState === WebSocket.OPEN) {
        try {
          socket.send(JSON.stringify({ type: 'UPDATE_STATE', payload }));
          return;
        } catch {}
      }

      // Reliable fallback only when WebSocket is unavailable.
      fetch('/api/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify(payload),
        keepalive: true,
      }).catch(() => {});
    },
    [overlayConfig, tournamentStats, squads]
  );

  // WebSocket is the primary real-time transport. SSE is kept as a fallback,
  // while polling is reduced to a slow recovery check instead of hammering the
  // server every 200ms from every connected device.
  useEffect(() => {
    let ws: WebSocket | null = null;
    let eventSource: EventSource | null = null;
    let isSubscribed = true;
    let wsReconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let fallbackPollTimer: ReturnType<typeof setInterval> | null = null;
    let lastWsMessageAt = Date.now();

    const scheduleWsReconnect = (delay: number) => {
      if (!isSubscribed || wsReconnectTimer) return;
      wsReconnectTimer = setTimeout(() => {
        wsReconnectTimer = null;
        initWebSocket();
      }, delay);
    };

    const initWebSocket = () => {
      if (!isSubscribed) return;
      try {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}`;
        ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          if (!isSubscribed) return;
          lastWsMessageAt = Date.now();
          setIsConnectedLive(true);
        };

        ws.onmessage = (event) => {
          if (!isSubscribed) return;
          lastWsMessageAt = Date.now();
          try {
            const data = JSON.parse(event.data);
            if (data && (data.type === 'STATE_UPDATE' || data.type === 'INIT_STATE') && data.state) {
              const state = { ...data.state, seq: data.seq, timestamp: data.timestamp };
              applyRemotePayload(state);
              setIsConnectedLive(true);
            }
          } catch {}
        };

        ws.onclose = () => {
          if (!isSubscribed) return;
          wsRef.current = null;
          setIsConnectedLive(false);
          scheduleWsReconnect(1000);
        };

        ws.onerror = () => {
          setIsConnectedLive(false);
          try { ws?.close(); } catch {}
        };
      } catch {
        setIsConnectedLive(false);
        scheduleWsReconnect(2000);
      }
    };

    initWebSocket();

    // SSE fallback is only opened when WebSocket has been quiet/disconnected.
    const ensureSseFallback = () => {
      if (!isSubscribed || wsRef.current?.readyState === WebSocket.OPEN || eventSource) return;
      try {
        eventSource = new EventSource('/api/stream');
        eventSource.onmessage = (event) => {
          if (!isSubscribed) return;
          try {
            if (!event.data || event.data.startsWith(':')) return;
            const data = JSON.parse(event.data);
            if (data?.state) {
              applyRemotePayload({ ...data.state, seq: data.seq, timestamp: data.timestamp });
              setIsConnectedLive(true);
            }
          } catch {}
        };
        eventSource.onerror = () => {
          eventSource?.close();
          eventSource = null;
        };
      } catch {}
    };

    fallbackPollTimer = setInterval(async () => {
      if (!isSubscribed) return;
      const wsOpen = wsRef.current?.readyState === WebSocket.OPEN;
      if (wsOpen) {
        if (eventSource) { eventSource.close(); eventSource = null; }
        return;
      }

      ensureSseFallback();
      try {
        const res = await fetch(`/api/state?sinceSeq=${lastRemoteSeqRef.current}&_t=${Date.now()}`, {
          cache: 'no-store',
        });
        if (res.ok) {
          const data = await res.json();
          if (data?.state) {
            applyRemotePayload({ ...data.state, seq: data.seq, timestamp: data.timestamp });
            setIsConnectedLive(true);
          }
        }
      } catch {
        setIsConnectedLive(false);
      }
    }, 2000);

    return () => {
      isSubscribed = false;
      if (wsReconnectTimer) clearTimeout(wsReconnectTimer);
      if (fallbackPollTimer) clearInterval(fallbackPollTimer);
      ws?.close();
      wsRef.current = null;
      eventSource?.close();
    };
  }, [applyRemotePayload]);

  // Helper to retrieve team logo from squads or active match
  const getTeamLogo = useCallback(
    (teamId?: string, teamCode?: string): string | undefined => {
      if (!teamId && !teamCode) return undefined;
      const normalizedCode = teamCode?.trim().toUpperCase();
      const squad = squads.find(
        (s) =>
          (teamId && s.id === teamId) ||
          (normalizedCode &&
            (s.shortCode.trim().toUpperCase() === normalizedCode ||
              s.teamName.trim().toUpperCase() === normalizedCode))
      );
      if (squad?.logoUrl) return squad.logoUrl;

      if (
        match.teamA &&
        ((teamId && match.teamA.id === teamId) ||
          (normalizedCode && match.teamA.shortCode?.trim().toUpperCase() === normalizedCode)) &&
        match.teamA.logoUrl
      ) {
        return match.teamA.logoUrl;
      }

      if (
        match.teamB &&
        ((teamId && match.teamB.id === teamId) ||
          (normalizedCode && match.teamB.shortCode?.trim().toUpperCase() === normalizedCode)) &&
        match.teamB.logoUrl
      ) {
        return match.teamB.logoUrl;
      }

      return undefined;
    },
    [squads, match.teamA, match.teamB]
  );

  // Milestone popup helper (pops up for ~5 seconds as requested)
  const triggerMilestone = useCallback((type: 'six' | 'four' | 'dot', count: number): MilestonePopup => {
    if (milestoneTimeoutRef.current) {
      clearTimeout(milestoneTimeoutRef.current);
    }
    const newPopup: MilestonePopup = { type, totalCount: count, timestamp: Date.now() };
    milestonePopupRef.current = newPopup;
    setMilestonePopup(newPopup);
    milestoneTimeoutRef.current = setTimeout(() => {
      setMilestonePopup(null);
      milestonePopupRef.current = null;
    }, 5000); // exactly ~5 seconds
    return newPopup;
  }, []);

  // Record a delivery with full cricket rules!
  const recordDelivery = useCallback(
    (params: AddDeliveryParams) => {
      setMatch((prev) => {
        // Prevent bowling balls if match or super over is already completed
        if (prev.status === 'completed' || (prev.superOver?.active && prev.superOver?.isCompleted)) {
          return prev;
        }

        // Save to undo history stack (limit to last 20 actions)
        setHistoryStack((prevStack) => [...prevStack.slice(-19), prev]);

        const next = JSON.parse(JSON.stringify(prev)) as MatchState;
        const currentInning = next.currentInningIndex === 1 ? next.inning1 : next.inning2;

        const ballsPerOver = next.settings.ballsPerOver || 6;
        const allOutWickets = next.settings.allOutWickets || (next.settings.playersPerSide - 1);

        // Check if super over is active
        const isSuperOver = next.superOver?.active;
        const superOverInning = isSuperOver
          ? next.superOver!.currentInning === 1
            ? next.superOver!.inning1
            : next.superOver!.inning2
          : null;

        const targetInning = isSuperOver ? superOverInning! : currentInning;

        const strikerId = targetInning.strikerId;
        const nonStrikerId = targetInning.nonStrikerId;
        const bowlerId = targetInning.currentBowlerId;

        // Ensure batsman and bowler objects exist
        if (!targetInning.batsmen[strikerId]) {
          targetInning.batsmen[strikerId] = {
            playerId: strikerId,
            name: 'Striker',
            runs: 0,
            balls: 0,
            fours: 0,
            sixes: 0,
            dots: 0,
            isOut: false,
            strikeRate: 0,
          };
        }
        if (!targetInning.batsmen[nonStrikerId]) {
          targetInning.batsmen[nonStrikerId] = {
            playerId: nonStrikerId,
            name: 'Non-Striker',
            runs: 0,
            balls: 0,
            fours: 0,
            sixes: 0,
            dots: 0,
            isOut: false,
            strikeRate: 0,
          };
        }
        if (!targetInning.bowlers[bowlerId]) {
          targetInning.bowlers[bowlerId] = {
            playerId: bowlerId,
            name: 'Bowler',
            overs: 0,
            legalBalls: 0,
            maidens: 0,
            runsConceded: 0,
            wickets: 0,
            dots: 0,
            wides: 0,
            noBalls: 0,
            economy: 0,
          };
        }

        const striker = targetInning.batsmen[strikerId];
        const bowler = targetInning.bowlers[bowlerId];

        const isWide = params.extraType === 'wide' || !!params.dismissal?.wasWide;
        const isNoBall = params.extraType === 'noBall' || !!params.dismissal?.wasNoBall;
        const isBye = params.extraType === 'bye';
        const isLegBye = params.extraType === 'legBye';
        const isLegal = !isWide && !isNoBall;

        // Runs calculation
        const batRuns = params.runs || 0;
        let extraRuns = params.extraRuns || 0;

        if (isWide && extraRuns === 0) extraRuns = 1;
        if (isNoBall) extraRuns = 1; // 1-run penalty is always an extra

        if (params.dismissal?.extraRunsWithDismissal) {
          extraRuns += params.dismissal.extraRunsWithDismissal;
        }

        const totalRunsThisBall = batRuns + extraRuns;

        // Update Inning totals
        targetInning.totalRuns += totalRunsThisBall;

        if (isWide) {
          targetInning.extras.wides += extraRuns;
          targetInning.extras.total += extraRuns;
          bowler.wides += 1;
          bowler.runsConceded += extraRuns;
        } else if (isNoBall) {
          targetInning.extras.noBalls += extraRuns;
          targetInning.extras.total += extraRuns;
          bowler.noBalls += 1;
          bowler.runsConceded += (batRuns + extraRuns);
        } else if (isBye) {
          targetInning.extras.byes += extraRuns;
          targetInning.extras.total += extraRuns;
          // Byes are NOT charged to the bowler
        } else if (isLegBye) {
          targetInning.extras.legByes += extraRuns;
          targetInning.extras.total += extraRuns;
          // Leg byes are NOT charged to the bowler
        } else {
          bowler.runsConceded += batRuns;
        }

        // Batsman stats update:
        // Rule: Wides and No-Balls do NOT count as balls faced by the batter.
        // Runs hit by the batter on a no-ball are credited to striker's runs, fours, and sixes,
        // but zero balls faced are counted (e.g. striker hitting six on no-ball is credited 6 runs off 0 balls: 6(0)).
        if (!isWide && !isNoBall) {
          striker.balls += 1;
        }

        if (!isWide) {
          striker.runs += batRuns;
          if (params.isBoundaryFour) striker.fours += 1;
          if (params.isBoundarySix) striker.sixes += 1;
          if (batRuns === 0 && !isBye && !isLegBye && !isNoBall && !params.dismissal) striker.dots += 1;
          striker.strikeRate = striker.balls > 0 ? Number(((striker.runs / striker.balls) * 100).toFixed(1)) : 0;
        }

        // Bowler stats update
        if (isLegal) {
          targetInning.legalBalls += 1;
          bowler.legalBalls += 1;
          const completedOvers = Math.floor(bowler.legalBalls / ballsPerOver);
          const ballsLeftInOver = bowler.legalBalls % ballsPerOver;
          bowler.overs = Number(`${completedOvers}.${ballsLeftInOver}`);

          if (totalRunsThisBall === 0 && !params.dismissal) {
            bowler.dots += 1;
          }

          const bowlerCompletedOversFraction = bowler.legalBalls / ballsPerOver;
          bowler.economy =
            bowlerCompletedOversFraction > 0
              ? Number((bowler.runsConceded / bowlerCompletedOversFraction).toFixed(2))
              : 0;
        }

        // Format over display
        const totalCompletedOvers = Math.floor(targetInning.legalBalls / ballsPerOver);
        const ballsThisOver = targetInning.legalBalls % ballsPerOver;
        targetInning.oversFormatted = `${totalCompletedOvers}.${ballsThisOver}`;

        // Partnership update
        targetInning.currentPartnership.runs += totalRunsThisBall;
        if (isLegal || isNoBall) {
          targetInning.currentPartnership.balls += 1;
        }
        if (!isWide) {
          targetInning.currentPartnership.player1Runs += batRuns;
        }

        // Dismissal Handling
        let wicketFell = false;
        if (params.dismissal) {
          // Retired Hurt is an injury/retirement event, NOT a wicket. The batter
          // remains not-out and may return later. It must not affect wicket, FOW,
          // bowler wicket totals, tournament wickets, or dot-ball milestones.
          const isRetiredHurt = params.dismissal.type === 'Hurt Retired';
          wicketFell = !isRetiredHurt;

          const outPlayerId = params.dismissal.playerOutId || strikerId;
          const outPlayer = targetInning.batsmen[outPlayerId] || striker;

          if (isRetiredHurt) {
            outPlayer.isOut = false;
            outPlayer.dismissalText = 'retired hurt';
          } else {
            targetInning.wickets += 1;

            // Bowler gets wicket credit except for Run Out and Retired Out.
            const isBowlerWicket = !['Run Out', 'Retired Out'].includes(params.dismissal.type);
            if (isBowlerWicket) bowler.wickets += 1;
            outPlayer.isOut = true;
          }

          // Format dismissal / retirement string
          let dismissalStr = '';
          switch (params.dismissal.type) {
            case 'Bowled':
              dismissalStr = `b ${bowler.name}`;
              break;
            case 'Caught':
              dismissalStr = params.dismissal.fielderName
                ? `c ${params.dismissal.fielderName} b ${bowler.name}`
                : `c & b ${bowler.name}`;
              break;
            case 'LBW':
              dismissalStr = `lbw b ${bowler.name}`;
              break;
            case 'Hit Wicket':
              dismissalStr = `hit wicket b ${bowler.name}`;
              break;
            case 'Stumped':
              dismissalStr = params.dismissal.fielderName
                ? `st ${params.dismissal.fielderName} b ${bowler.name}`
                : `st b ${bowler.name}`;
              break;
            case 'Run Out':
              dismissalStr = params.dismissal.fielderName
                ? `run out (${params.dismissal.fielderName})`
                : `run out`;
              break;
            case 'Retired Out':
              dismissalStr = 'retired out';
              break;
            case 'Hurt Retired':
              dismissalStr = 'retired hurt';
              break;
          }
          outPlayer.dismissalText = dismissalStr;

          if (!isRetiredHurt) {
            // Fall of wickets record — ONLY real wickets.
            targetInning.fallOfWickets.push({
              wicketNumber: targetInning.wickets,
              runs: targetInning.totalRuns,
              overs: targetInning.oversFormatted,
              playerOutName: outPlayer.name,
            });
          }

          // A retirement (including Retired Hurt) ends the current partnership
          // in the scorer UI, but does not create a wicket unless it is Retired Out.
          targetInning.currentPartnership = {
            runs: 0,
            balls: 0,
            player1Id: outPlayerId === strikerId ? (params.newBatterId || '') : strikerId,
            player1Runs: 0,
            player2Id: outPlayerId === strikerId ? nonStrikerId : (params.newBatterId || ''),
            player2Runs: 0,
          };

          if (params.newBatterId) {
            if (outPlayerId === strikerId) targetInning.strikerId = params.newBatterId;
            else targetInning.nonStrikerId = params.newBatterId;
          }
        }

        // Delivery log record
        const deliveryOverIndex = Math.floor((targetInning.legalBalls - (isLegal ? 1 : 0)) / ballsPerOver);
        const newDelivery: Delivery = {
          id: `del-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          overIndex: deliveryOverIndex,
          ballInOver: isLegal && ballsThisOver === 0 ? ballsPerOver : ballsThisOver || 1,
          displayOver: targetInning.oversFormatted,
          strikerId,
          strikerName: striker.name,
          nonStrikerId,
          nonStrikerName: targetInning.batsmen[nonStrikerId]?.name || 'Non-Striker',
          bowlerId,
          bowlerName: bowler.name,
          runsScored: batRuns,
          isBoundaryFour: !!params.isBoundaryFour,
          isBoundarySix: !!params.isBoundarySix,
          extraType: params.extraType,
          extraRuns,
          totalRunsOnBall: totalRunsThisBall,
          isLegalBall: isLegal,
          dismissal: params.dismissal,
          commentary: params.customComment,
          timestamp: Date.now(),
        };

        targetInning.deliveries.push(newDelivery);

        // Strike rotation logic:
        // Runs off bat or byes/leg-byes: if odd runs scored, batsmen cross!
        let runsCrossed = batRuns;
        if (isBye || isLegBye) {
          runsCrossed = extraRuns;
        } else if (isWide) {
          // WD+1 (2 runs: 1 run ran) or WD+3 (4 runs: 3 runs ran) -> cross
          // WD (1 run), WD+2 (3 runs: 2 runs ran), WD+4 (5 runs: boundary 4) -> do not cross
          runsCrossed = (extraRuns === 2 || extraRuns === 4) ? 1 : 0;
        } else if (isNoBall) {
          // Batter runs: 1 or 3 runs ran -> cross; 0, 2, 4, 6 -> no cross
          runsCrossed = batRuns;
        }

        if (runsCrossed % 2 !== 0 && !wicketFell) {
          const temp = targetInning.strikerId;
          targetInning.strikerId = targetInning.nonStrikerId;
          targetInning.nonStrikerId = temp;
        }

        // End of over strike rotation (if legal ball ended over)
        if (isLegal && ballsThisOver === 0) {
          const temp = targetInning.strikerId;
          targetInning.strikerId = targetInning.nonStrikerId;
          targetInning.nonStrikerId = temp;
        }

        // Check match completion / all-out / tie
        if (isSuperOver) {
          const superMaxWickets = 2; // Super Over standard: max 2 wickets
          const superOversFinished = targetInning.legalBalls >= (next.superOver?.ballsPerOver || ballsPerOver);
          const superAllOut = targetInning.wickets >= superMaxWickets;

          if (next.superOver!.currentInning === 1) {
            if (superOversFinished || superAllOut) {
              targetInning.isCompleted = true;
              next.superOver!.currentInning = 2;
              next.superOver!.targetRuns = targetInning.totalRuns + 1;
              next.winDescription = `SUPER OVER: Target ${next.superOver!.targetRuns} runs (${next.superOver!.inning2.battingTeamName})`;
              setShowInningBreakModal(true);
            }
          } else {
            // Super Over Inning 2 (Chasing)
            const soTarget = next.superOver!.targetRuns || (next.superOver!.inning1.totalRuns + 1);

            // IMMEDIATE CHECK: End immediately when chasing team reaches or exceeds target!
            if (targetInning.totalRuns >= soTarget && soTarget > 0) {
              targetInning.isCompleted = true;
              next.superOver!.isCompleted = true;
              next.status = 'completed';
              next.superOver!.winnerTeamId = targetInning.battingTeamId;
              next.winnerTeamId = targetInning.battingTeamId;
              const wicketsRemaining = superMaxWickets - targetInning.wickets;
              const winMsg = `${targetInning.battingTeamName} won the Super Over by ${wicketsRemaining} wicket${wicketsRemaining !== 1 ? 's' : ''}!`;
              next.superOver!.resultText = winMsg;
              next.winDescription = winMsg;
              setShowMatchFinishedModal(true);
            } else if (superOversFinished || superAllOut) {
              // 2nd innings finished without reaching target
              targetInning.isCompleted = true;
              next.superOver!.isCompleted = true;
              next.status = 'completed';
              const super1Runs = next.superOver!.inning1.totalRuns;
              const super2Runs = targetInning.totalRuns;
              if (super2Runs > super1Runs) {
                next.superOver!.winnerTeamId = targetInning.battingTeamId;
                next.winnerTeamId = targetInning.battingTeamId;
                const winMsg = `${targetInning.battingTeamName} won the Super Over!`;
                next.superOver!.resultText = winMsg;
                next.winDescription = winMsg;
              } else if (super1Runs > super2Runs) {
                next.superOver!.winnerTeamId = next.superOver!.inning1.battingTeamId;
                next.winnerTeamId = next.superOver!.inning1.battingTeamId;
                const marginRuns = super1Runs - super2Runs;
                const winMsg = `${next.superOver!.inning1.battingTeamName} won the Super Over by ${marginRuns} run${marginRuns !== 1 ? 's' : ''}!`;
                next.superOver!.resultText = winMsg;
                next.winDescription = winMsg;
              } else {
                next.superOver!.resultText = 'Super Over Tied!';
                next.winDescription = 'Match & Super Over Tied!';
              }
              setShowMatchFinishedModal(true);
            }
          }
        } else {
          // Regular match checks
          const maxLegalBalls = next.settings.totalOvers * ballsPerOver;
          const isAllOut = targetInning.wickets >= allOutWickets;
          const isOversFinished = targetInning.legalBalls >= maxLegalBalls;

          if (next.currentInningIndex === 1) {
            if (isAllOut || isOversFinished) {
              targetInning.isCompleted = true;
              next.status = 'innings_break';
              next.targetRuns = targetInning.totalRuns + 1;
            }
          } else if (next.currentInningIndex === 2) {
            // Check if chasing team chased target
            if (targetInning.totalRuns >= next.targetRuns && next.targetRuns > 0) {
              targetInning.isCompleted = true;
              next.status = 'completed';
              next.winnerTeamId = targetInning.battingTeamId;
              const wicketsRemaining = allOutWickets - targetInning.wickets;
              next.winDescription = `${targetInning.battingTeamName} won by ${wicketsRemaining} wickets!`;
            } else if (isAllOut || isOversFinished) {
              targetInning.isCompleted = true;
              if (targetInning.totalRuns === next.inning1.totalRuns) {
                // MATCH TIED!
                next.status = 'tied';
                next.winDescription = 'Scores Level - Match Tied!';
              } else if (targetInning.totalRuns < next.inning1.totalRuns) {
                next.status = 'completed';
                next.winnerTeamId = next.inning1.battingTeamId;
                const marginRuns = next.inning1.totalRuns - targetInning.totalRuns;
                next.winDescription = `${next.inning1.battingTeamName} won by ${marginRuns} runs!`;
              }
            }
          }
        }

        // Recalculate tournament statistics safely from unique matches
        const uniqueMatches = getUniqueTournamentMatches(next, completedMatches);
        const freshStats = calculateTournamentStats(uniqueMatches, squads);
        setTournamentStats(freshStats);

        let currentMilestone: MilestonePopup | null = null;
        if (params.isBoundarySix) {
          currentMilestone = triggerMilestone('six', freshStats.totalSixes);
        } else if (params.isBoundaryFour) {
          currentMilestone = triggerMilestone('four', freshStats.totalFours);
        } else if (batRuns === 0 && isLegal && !isBye && !isLegBye && !params.dismissal) {
          currentMilestone = triggerMilestone('dot', freshStats.totalDots);
        }

        // Check for modal popups
        if (next.status === 'innings_break') {
          setShowInningBreakModal(true);
        } else if (next.status === 'completed' || next.status === 'tied') {
          setShowMatchFinishedModal(true);
        } else if (isLegal && ballsThisOver === 0 && !targetInning.isCompleted) {
          // Normal over completion
          setShowOverCompletedModal(true);
        }

        broadcastCurrentState(next, undefined, freshStats, undefined, currentMilestone);
        return next;
      });
    },
    [broadcastCurrentState, triggerMilestone, completedMatches, squads]
  );

  // Undo last delivery
  const undoLastDelivery = useCallback(() => {
    setHistoryStack((prevStack) => {
      if (prevStack.length === 0) return prevStack;
      const previousState = prevStack[prevStack.length - 1];
      setMatch(previousState);
      broadcastCurrentState(previousState);
      return prevStack.slice(0, -1);
    });
  }, [broadcastCurrentState]);

  // Set striker
  const setStriker = useCallback(
    (playerId: string) => {
      setMatch((prev) => {
        const next = JSON.parse(JSON.stringify(prev)) as MatchState;
        const inning = next.superOver?.active
          ? next.superOver.currentInning === 1
            ? next.superOver.inning1
            : next.superOver.inning2
          : next.currentInningIndex === 1
          ? next.inning1
          : next.inning2;

        inning.strikerId = playerId;
        broadcastCurrentState(next);
        return next;
      });
    },
    [broadcastCurrentState]
  );

  // Set non-striker
  const setNonStriker = useCallback(
    (playerId: string) => {
      setMatch((prev) => {
        const next = JSON.parse(JSON.stringify(prev)) as MatchState;
        const inning = next.superOver?.active
          ? next.superOver.currentInning === 1
            ? next.superOver.inning1
            : next.superOver.inning2
          : next.currentInningIndex === 1
          ? next.inning1
          : next.inning2;

        inning.nonStrikerId = playerId;
        broadcastCurrentState(next);
        return next;
      });
    },
    [broadcastCurrentState]
  );

  // Set bowler
  const setBowler = useCallback(
    (playerId: string) => {
      setMatch((prev) => {
        const next = JSON.parse(JSON.stringify(prev)) as MatchState;
        const inning = next.superOver?.active
          ? next.superOver.currentInning === 1
            ? next.superOver.inning1
            : next.superOver.inning2
          : next.currentInningIndex === 1
          ? next.inning1
          : next.inning2;

        inning.currentBowlerId = playerId;
        broadcastCurrentState(next);
        return next;
      });
    },
    [broadcastCurrentState]
  );

  // Swap strikers manually
  const swapStrikers = useCallback(() => {
    setMatch((prev) => {
      const next = JSON.parse(JSON.stringify(prev)) as MatchState;
      const inning = next.superOver?.active
        ? next.superOver.currentInning === 1
          ? next.superOver.inning1
          : next.superOver.inning2
        : next.currentInningIndex === 1
        ? next.inning1
        : next.inning2;

      const temp = inning.strikerId;
      inning.strikerId = inning.nonStrikerId;
      inning.nonStrikerId = temp;
      broadcastCurrentState(next);
      return next;
    });
  }, [broadcastCurrentState]);

  // Switch inning (Inning 1 -> Inning 2)
  const switchInning = useCallback(() => {
    setMatch((prev) => {
      const next = JSON.parse(JSON.stringify(prev)) as MatchState;
      if (next.currentInningIndex === 1) {
        next.currentInningIndex = 2;
        next.status = 'innings2';
        next.targetRuns = next.inning1.totalRuns + 1;
      }
      broadcastCurrentState(next);
      return next;
    });
  }, [broadcastCurrentState]);

  // Start Super Over
  const startSuperOver = useCallback(
    (customBallsPerOver?: number) => {
      setMatch((prev) => {
        const next = JSON.parse(JSON.stringify(prev)) as MatchState;
        const balls = customBallsPerOver || next.settings.ballsPerOver || 6;

        // Inning 1 of Super Over: Team batting second in main match bats first (standard ICC rule), or Team A
        const superBattingSquad1 = next.teamB;
        const superBowlingSquad1 = next.teamA;
        const superBattingSquad2 = next.teamA;
        const superBowlingSquad2 = next.teamB;

        const soInning1 = createEmptyInning(
          1,
          superBattingSquad1,
          superBowlingSquad1,
          superBattingSquad1.players[0].id,
          superBattingSquad1.players[1].id,
          superBowlingSquad1.players[superBowlingSquad1.players.length - 1].id
        );

        const soInning2 = createEmptyInning(
          2,
          superBattingSquad2,
          superBowlingSquad2,
          superBattingSquad2.players[0].id,
          superBattingSquad2.players[1].id,
          superBowlingSquad2.players[superBowlingSquad2.players.length - 1].id
        );

        const superOver: SuperOverState = {
          active: true,
          ballsPerOver: balls,
          maxWickets: 2, // 2 wickets all out
          teamAId: next.teamA.id,
          teamBId: next.teamB.id,
          currentInning: 1,
          inning1: soInning1,
          inning2: soInning2,
          isCompleted: false,
        };

        next.superOver = superOver;
        next.status = 'super_over';
        next.winDescription = 'SUPER OVER IN PROGRESS';

        // Set overlay to super over or scoreboard
        setOverlayConfig((prevCfg) => ({
          ...prevCfg,
          activeOverlay: 'scoreboard',
        }));

        broadcastCurrentState(next);
        return next;
      });
    },
    [broadcastCurrentState]
  );

  const dismissSuperOverPrompt = useCallback(() => {
    setMatch((prev) => {
      const next = { ...prev, status: 'completed' as const, winDescription: 'Match Ended in a Tie' };
      broadcastCurrentState(next);
      return next;
    });
  }, [broadcastCurrentState]);

  // Update match settings
  const updateMatchSettings = useCallback(
    (newSettings: Partial<MatchSettings>) => {
      setMatch((prev) => {
        const nextSettings = { ...prev.settings, ...newSettings };
        // Auto update allOutWickets if playersPerSide changed and allOutWickets not manually customized
        if (newSettings.playersPerSide && !newSettings.allOutWickets) {
          nextSettings.allOutWickets = newSettings.playersPerSide - 1;
        }
        const next = { ...prev, settings: nextSettings };
        broadcastCurrentState(next);
        return next;
      });
    },
    [broadcastCurrentState]
  );

  // Update overlay configuration
  const updateOverlayConfig = useCallback(
    (cfg: Partial<OverlayConfig>) => {
      setOverlayConfig((prev) => {
        const updated = { ...prev, ...cfg };
        broadcastCurrentState(match, updated);
        return updated;
      });
    },
    [broadcastCurrentState, match]
  );

  // Reset match to fresh initial state
  const resetMatch = useCallback(() => {
    const fresh = createInitialMatch();
    setMatch(fresh);
    setHistoryStack([]);
    setShowOverCompletedModal(false);
    setShowInningBreakModal(false);
    setShowMatchFinishedModal(false);
    broadcastCurrentState(fresh);
  }, [broadcastCurrentState]);

  // Option 1: Select squads for next match
  const resetMatchForNextSquads = useCallback(
    (
      teamAId: string,
      teamBId: string,
      options?: { matchTitle?: string; tossWinnerId?: string; tossDecision?: 'bat' | 'bowl' }
    ) => {
      const squadA = squads.find((s) => s.id === teamAId) || squads[0];
      const squadB = squads.find((s) => s.id === teamBId) || squads[1] || squads[0];

      const tossWinId = options?.tossWinnerId || squadA.id;
      const tossDec = options?.tossDecision || 'bat';

      const teamABatsFirst =
        (tossWinId === squadA.id && tossDec === 'bat') ||
        (tossWinId === squadB.id && tossDec === 'bowl');

      const battingFirst = teamABatsFirst ? squadA : squadB;
      const bowlingFirst = teamABatsFirst ? squadB : squadA;

      const freshInning1 = createEmptyInning(
        1,
        battingFirst,
        bowlingFirst,
        battingFirst.players[0]?.id || 'p1',
        battingFirst.players[1]?.id || 'p2',
        bowlingFirst.players[bowlingFirst.players.length - 1]?.id || 'b1'
      );

      const freshInning2 = createEmptyInning(
        2,
        bowlingFirst,
        battingFirst,
        bowlingFirst.players[0]?.id || 'p1',
        bowlingFirst.players[1]?.id || 'p2',
        battingFirst.players[battingFirst.players.length - 1]?.id || 'b1'
      );

      // Safely archive the previous match to completedMatches if it had balls bowled or was finished
      setCompletedMatches((prevCompleted) => {
        const hasBalls =
          (match.inning1?.deliveries?.length || 0) > 0 ||
          (match.inning2?.deliveries?.length || 0) > 0;
        if (hasBalls || match.status === 'completed') {
          const exists = prevCompleted.some((m) => m.id === match.id);
          if (exists) {
            return prevCompleted.map((m) => (m.id === match.id ? match : m));
          }
          const nextList = [...prevCompleted, match];
          const freshStats = calculateTournamentStats(nextList, squads);
          setTournamentStats(freshStats);
          return nextList;
        }
        return prevCompleted;
      });

      setMatch((prev) => {
        const next: MatchState = {
          id: `match-${Date.now()}`,
          settings: {
            ...prev.settings,
            matchTitle: options?.matchTitle || `Match ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
          },
          teamA: squadA,
          teamB: squadB,
          playingXiA: squadA.players.map((p) => p.id),
          playingXiB: squadB.players.map((p) => p.id),
          tossWinnerId: tossWinId,
          tossDecision: tossDec,
          status: 'innings1',
          currentInningIndex: 1,
          inning1: freshInning1,
          inning2: freshInning2,
          targetRuns: 0,
          superOver: undefined,
          winnerTeamId: undefined,
          winDescription: undefined,
          isPointsRecorded: false,
        };
        setHistoryStack([]);
        broadcastCurrentState(next);
        return next;
      });

      setShowOverCompletedModal(false);
      setShowInningBreakModal(false);
      setShowMatchFinishedModal(false);
    },
    [squads, broadcastCurrentState]
  );

  // Option 2: Clear scores & keep current teams
  const clearScoresKeepTeams = useCallback(() => {
    setMatch((prev) => {
      const freshInning1 = createEmptyInning(
        1,
        prev.teamA,
        prev.teamB,
        prev.teamA.players[0]?.id || 'p1',
        prev.teamA.players[1]?.id || 'p2',
        prev.teamB.players[prev.teamB.players.length - 1]?.id || 'b1'
      );
      const freshInning2 = createEmptyInning(
        2,
        prev.teamB,
        prev.teamA,
        prev.teamB.players[0]?.id || 'p1',
        prev.teamB.players[1]?.id || 'p2',
        prev.teamA.players[prev.teamA.players.length - 1]?.id || 'b1'
      );

      const resetMatchState: MatchState = {
        ...prev,
        status: 'innings1',
        currentInningIndex: 1,
        inning1: freshInning1,
        inning2: freshInning2,
        targetRuns: 0,
        superOver: undefined,
        winnerTeamId: undefined,
        winDescription: undefined,
        isPointsRecorded: false,
      };
      setHistoryStack([]);
      broadcastCurrentState(resetMatchState);
      return resetMatchState;
    });

    setShowOverCompletedModal(false);
    setShowInningBreakModal(false);
    setShowMatchFinishedModal(false);
  }, [broadcastCurrentState]);

  // Option 3: Full wipe & restore clean slate (delete all squads, points table, fixtures, stats)
  const fullWipeAll = useCallback(() => {
    try {
      localStorage.removeItem(`${STORAGE_KEY}_squads`);
      localStorage.removeItem(`${STORAGE_KEY}_stats`);
      localStorage.removeItem(`${STORAGE_KEY}_completed_matches`);
      localStorage.removeItem(`${STORAGE_KEY}_stages`);
      localStorage.removeItem(`${STORAGE_KEY}_fixtures`);
      localStorage.removeItem(`${STORAGE_KEY}_match`);
      localStorage.removeItem(`${STORAGE_KEY}_overlay`);
    } catch {
      // Ignored
    }

    setCompletedMatches([]);

    const cleanSquadA: Squad = {
      id: `squad-a-${Date.now()}`,
      teamName: 'Team Alpha',
      shortCode: 'ALP',
      themeColor: '#3b82f6',
      players: [
        { id: 'p1', name: 'Player 1', role: 'Batsman', jerseyNumber: 1, isCaptain: true, isWicketKeeper: false },
        { id: 'p2', name: 'Player 2', role: 'Batsman', jerseyNumber: 2, isCaptain: false, isWicketKeeper: false },
        { id: 'p3', name: 'Player 3', role: 'All-Rounder', jerseyNumber: 3, isCaptain: false, isWicketKeeper: false },
        { id: 'p4', name: 'Player 4', role: 'All-Rounder', jerseyNumber: 4, isCaptain: false, isWicketKeeper: true },
        { id: 'p5', name: 'Player 5', role: 'Bowler', jerseyNumber: 5, isCaptain: false, isWicketKeeper: false },
        { id: 'p6', name: 'Player 6', role: 'Bowler', jerseyNumber: 6, isCaptain: false, isWicketKeeper: false },
      ],
    };

    const cleanSquadB: Squad = {
      id: `squad-b-${Date.now()}`,
      teamName: 'Team Beta',
      shortCode: 'BET',
      themeColor: '#ef4444',
      players: [
        { id: 'p11', name: 'Player A', role: 'Batsman', jerseyNumber: 7, isCaptain: true, isWicketKeeper: false },
        { id: 'p12', name: 'Player B', role: 'Batsman', jerseyNumber: 8, isCaptain: false, isWicketKeeper: false },
        { id: 'p13', name: 'Player C', role: 'All-Rounder', jerseyNumber: 9, isCaptain: false, isWicketKeeper: false },
        { id: 'p14', name: 'Player D', role: 'All-Rounder', jerseyNumber: 10, isCaptain: false, isWicketKeeper: true },
        { id: 'p15', name: 'Player E', role: 'Bowler', jerseyNumber: 11, isCaptain: false, isWicketKeeper: false },
        { id: 'p16', name: 'Player F', role: 'Bowler', jerseyNumber: 12, isCaptain: false, isWicketKeeper: false },
      ],
    };

    const cleanSquads = [cleanSquadA, cleanSquadB];
    const cleanStats: TournamentStats = {
      totalSixes: 0,
      totalFours: 0,
      totalDots: 0,
      mostRuns: [],
      mostWickets: [],
      mostSixes: [],
      mostFours: [],
      bestFielders: [],
    };

    const cleanStage: TournamentStage = {
      id: `stage-${Date.now()}`,
      name: 'Group Stage',
      type: 'group_stage',
      groups: [
        {
          id: 'group-a',
          name: 'Group A',
          standings: [
            { teamId: cleanSquadA.id, teamName: cleanSquadA.teamName, shortCode: cleanSquadA.shortCode, played: 0, won: 0, lost: 0, tied: 0, noResult: 0, points: 0, nrr: 0, runsFor: 0, oversFor: 0, runsAgainst: 0, oversAgainst: 0, form: [] },
            { teamId: cleanSquadB.id, teamName: cleanSquadB.teamName, shortCode: cleanSquadB.shortCode, played: 0, won: 0, lost: 0, tied: 0, noResult: 0, points: 0, nrr: 0, runsFor: 0, oversFor: 0, runsAgainst: 0, oversAgainst: 0, form: [] },
          ],
        },
      ],
    };

    const freshInning1 = createEmptyInning(1, cleanSquadA, cleanSquadB, 'p1', 'p2', 'p16');
    const freshInning2 = createEmptyInning(2, cleanSquadB, cleanSquadA, 'p11', 'p12', 'p6');

    const cleanMatch: MatchState = {
      id: `match-${Date.now()}`,
      settings: {
        tournamentName: 'Tournament Championship',
        venue: 'Main Cricket Ground',
        matchTitle: 'Match 1',
        date: new Date().toISOString().split('T')[0],
        playersPerSide: 6,
        allOutWickets: 5,
        totalOvers: 5,
        ballsPerOver: 6,
      },
      teamA: cleanSquadA,
      teamB: cleanSquadB,
      playingXiA: cleanSquadA.players.map((p) => p.id),
      playingXiB: cleanSquadB.players.map((p) => p.id),
      tossWinnerId: cleanSquadA.id,
      tossDecision: 'bat',
      status: 'innings1',
      currentInningIndex: 1,
      inning1: freshInning1,
      inning2: freshInning2,
      targetRuns: 0,
    };

    setSquads(cleanSquads);
    setTournamentStats(cleanStats);
    setStages([cleanStage]);
    setFixtures([]);
    setMatch(cleanMatch);
    setHistoryStack([]);
    setShowOverCompletedModal(false);
    setShowInningBreakModal(false);
    setShowMatchFinishedModal(false);
    broadcastCurrentState(cleanMatch, overlayConfig, cleanStats);
  }, [overlayConfig, broadcastCurrentState]);

  // Match settings: assign teams and toss
  const assignTeamsAndToss = useCallback(
    (teamAId: string, teamBId: string, tossWinnerId: string, tossDecision: 'bat' | 'bowl') => {
      const squadA = squads.find((s) => s.id === teamAId) || squads[0];
      const squadB = squads.find((s) => s.id === teamBId) || squads[1] || squads[0];

      const teamABatsFirst =
        (tossWinnerId === squadA.id && tossDecision === 'bat') ||
        (tossWinnerId === squadB.id && tossDecision === 'bowl');

      const battingFirst = teamABatsFirst ? squadA : squadB;
      const bowlingFirst = teamABatsFirst ? squadB : squadA;

      setMatch((prev) => {
        const hasDeliveries =
          (prev.inning1?.deliveries?.length || 0) > 0 ||
          (prev.inning2?.deliveries?.length || 0) > 0;

        let inning1 = prev.inning1;
        let inning2 = prev.inning2;

        if (!hasDeliveries) {
          inning1 = createEmptyInning(
            1,
            battingFirst,
            bowlingFirst,
            battingFirst.players[0]?.id || 'p1',
            battingFirst.players[1]?.id || 'p2',
            bowlingFirst.players[bowlingFirst.players.length - 1]?.id || 'b1'
          );
          inning2 = createEmptyInning(
            2,
            bowlingFirst,
            battingFirst,
            bowlingFirst.players[0]?.id || 'p1',
            bowlingFirst.players[1]?.id || 'p2',
            battingFirst.players[battingFirst.players.length - 1]?.id || 'b1'
          );
        }

        const next: MatchState = {
          ...prev,
          teamA: squadA,
          teamB: squadB,
          playingXiA: squadA.players.map((p) => p.id),
          playingXiB: squadB.players.map((p) => p.id),
          tossWinnerId,
          tossDecision,
          inning1,
          inning2,
        };
        broadcastCurrentState(next);
        return next;
      });
    },
    [squads, broadcastCurrentState]
  );

  // Start new over with selected bowler
  const startNextOver = useCallback(
    (newBowlerId: string) => {
      setMatch((prev) => {
        const next = JSON.parse(JSON.stringify(prev)) as MatchState;
        const isSuperOver = !!next.superOver?.active;
        const targetInning = isSuperOver
          ? next.superOver!.currentInning === 1
            ? next.superOver!.inning1
            : next.superOver!.inning2
          : next.currentInningIndex === 1
          ? next.inning1
          : next.inning2;

        targetInning.currentBowlerId = newBowlerId;
        broadcastCurrentState(next);
        return next;
      });
      setShowOverCompletedModal(false);
    },
    [broadcastCurrentState]
  );

  // Finish match and automatically add points to Points Table!
  const finishMatchAndRecordPoints = useCallback(() => {
    setShowMatchFinishedModal(false);

    if (match.isPointsRecorded) {
      return;
    }

    const isSuperOverCompleted = !!match.superOver?.isCompleted;
    const winnerId = match.superOver?.winnerTeamId || match.winnerTeamId;
    const isTie = (!winnerId && match.status === 'tied') || (isSuperOverCompleted && !winnerId);

    const updatedMatch: MatchState = {
      ...match,
      status: 'completed',
      winnerTeamId: winnerId,
      isPointsRecorded: true,
    };

    const allottedOvers = updatedMatch.settings.totalOvers || 20;
    const allOutWickets = updatedMatch.settings.allOutWickets || (updatedMatch.settings.playersPerSide - 1);

    // Inning 1
    const inn1 = updatedMatch.inning1;
    const inn2 = updatedMatch.inning2;

    const team1Id = inn1.battingTeamId;
    const team2Id = inn2.battingTeamId;

    const runs1 = inn1.totalRuns;
    const runs2 = inn2.totalRuns;

    // ICC NRR Rule: If a team is all out before full overs, full quota of overs is used
    const inn1OversFaced =
      inn1.wickets >= allOutWickets
        ? allottedOvers
        : Math.floor(inn1.legalBalls / 6) + (inn1.legalBalls % 6) / 6;

    const inn2OversFaced =
      inn2.wickets >= allOutWickets
        ? allottedOvers
        : Math.floor(inn2.legalBalls / 6) + (inn2.legalBalls % 6) / 6;

    // Set match state cleanly
    setMatch(updatedMatch);

    // Update stages points table with FOR, AGAINST, and NRR
    setStages((prevStages) => {
      return prevStages.map((stage) => {
        return {
          ...stage,
          groups: stage.groups.map((group) => {
            const hasTeamA = group.standings.some((t) => t.teamId === updatedMatch.teamA.id);
            const hasTeamB = group.standings.some((t) => t.teamId === updatedMatch.teamB.id);
            if (!hasTeamA && !hasTeamB) return group;

            return {
              ...group,
              standings: group.standings.map((teamRow) => {
                let isMatchTeam = false;
                let isWinner = false;
                let matchRunsFor = 0;
                let matchOversFor = 0;
                let matchRunsAgainst = 0;
                let matchOversAgainst = 0;

                if (teamRow.teamId === team1Id) {
                  isMatchTeam = true;
                  isWinner = winnerId === team1Id;
                  matchRunsFor = runs1;
                  matchOversFor = inn1OversFaced;
                  matchRunsAgainst = runs2;
                  matchOversAgainst = inn2OversFaced;
                } else if (teamRow.teamId === team2Id) {
                  isMatchTeam = true;
                  isWinner = winnerId === team2Id;
                  matchRunsFor = runs2;
                  matchOversFor = inn2OversFaced;
                  matchRunsAgainst = runs1;
                  matchOversAgainst = inn1OversFaced;
                }

                if (!isMatchTeam) return teamRow;

                const newWon = isTie ? teamRow.won : isWinner ? teamRow.won + 1 : teamRow.won;
                const newLost = isTie ? teamRow.lost : !isWinner ? teamRow.lost + 1 : teamRow.lost;
                const newTied = isTie ? teamRow.tied + 1 : teamRow.tied;
                const newPts = teamRow.points + (isTie ? 1 : isWinner ? 2 : 0);

                // Exactly ONE form result (W, L, or T) appended per match
                const formLetter: 'W' | 'L' | 'T' = isTie ? 'T' : isWinner ? 'W' : 'L';
                const newForm = [...(teamRow.form || []), formLetter].slice(-5) as ('W' | 'L' | 'T' | 'NR')[];

                const totalRunsFor = (teamRow.runsFor || 0) + matchRunsFor;
                const totalOversFor = (teamRow.oversFor || 0) + matchOversFor;
                const totalRunsAgainst = (teamRow.runsAgainst || 0) + matchRunsAgainst;
                const totalOversAgainst = (teamRow.oversAgainst || 0) + matchOversAgainst;

                let calculatedNrr = 0;
                if (totalOversFor > 0 && totalOversAgainst > 0) {
                  const rrFor = totalRunsFor / totalOversFor;
                  const rrAgainst = totalRunsAgainst / totalOversAgainst;
                  calculatedNrr = Number((rrFor - rrAgainst).toFixed(3));
                } else if (totalOversFor > 0) {
                  calculatedNrr = Number((totalRunsFor / totalOversFor).toFixed(3));
                }

                return {
                  ...teamRow,
                  played: teamRow.played + 1,
                  won: newWon,
                  lost: newLost,
                  tied: newTied,
                  points: newPts,
                  form: newForm,
                  runsFor: totalRunsFor,
                  oversFor: Number(totalOversFor.toFixed(1)),
                  runsAgainst: totalRunsAgainst,
                  oversAgainst: Number(totalOversAgainst.toFixed(1)),
                  nrr: calculatedNrr,
                };
              }),
            };
          }),
        };
      });
    });

    // Update fixtures
    setFixtures((prevFixtures) => {
      return prevFixtures.map((fix) => {
        if (
          (fix.teamAId === updatedMatch.teamA.id && fix.teamBId === updatedMatch.teamB.id) ||
          fix.id === updatedMatch.id
        ) {
          return {
            ...fix,
            status: 'completed',
            resultText: updatedMatch.winDescription || 'Match completed',
            scoresSummary: `${inn1.battingTeamCode} ${inn1.totalRuns}/${inn1.wickets} vs ${inn2.battingTeamCode} ${inn2.totalRuns}/${inn2.wickets}`,
          };
        }
        return fix;
      });
    });

    // Auto-update completed matches and tournament stats across all matches
    setCompletedMatches((prevCompleted) => {
      const nextCompleted = [...prevCompleted.filter((m) => m.id !== updatedMatch.id), updatedMatch];
      const freshStats = calculateTournamentStats(nextCompleted, squads);
      setTournamentStats(freshStats);
      broadcastCurrentState(updatedMatch, undefined, freshStats);
      return nextCompleted;
    });
  }, [match, squads, broadcastCurrentState]);

  // Compute deliveries bowled in current over for overlay & scoring display
  // Requirement 2:
  // "In deziglo broadcast overlay scoreboard, ‘this over’ feature-should display only the balls in one over. after finishing one over it should reset and show the scores of next over."
  const currentInningForOver = match.superOver?.active
    ? match.superOver.currentInning === 1
      ? match.superOver.inning1
      : match.superOver.inning2
    : match.currentInningIndex === 1
    ? match.inning1
    : match.inning2;

  const ballsPerOver = match.settings.ballsPerOver || 6;
  const currentLegalBalls = currentInningForOver?.legalBalls || 0;
  // Active over index: 0 for 1st over, 1 for 2nd over, etc.
  // When an over completes (e.g. 6 balls bowled in over 0), totalCompletedOvers becomes 1.
  // The new over has 0 balls bowled so far, so filtering by overIndex === 1 yields [] (over resets cleanly).
  const activeOverIndex = Math.floor(currentLegalBalls / ballsPerOver);
  const currentOverDeliveries = (currentInningForOver?.deliveries || []).filter(
    (d) => d.overIndex === activeOverIndex
  );

  // Load fixture into current match
  const loadMatchFixture = useCallback(
    (fixtureId: string) => {
      const fixture = fixtures.find((f) => f.id === fixtureId);
      if (!fixture) return;
      const squadA = squads.find((s) => s.id === fixture.teamAId) || squads[0];
      const squadB = squads.find((s) => s.id === fixture.teamBId) || squads[1];

      setMatch((prev) => {
        const nextSettings: MatchSettings = {
          ...prev.settings,
          matchTitle: fixture.title,
          venue: fixture.venue,
          date: fixture.date,
        };
        const inning1 = createEmptyInning(1, squadA, squadB, squadA.players[0].id, squadA.players[1].id, squadB.players[squadB.players.length - 1].id);
        const inning2 = createEmptyInning(2, squadB, squadA, squadB.players[0].id, squadB.players[1].id, squadA.players[squadA.players.length - 1].id);

        const next: MatchState = {
          id: fixture.id,
          settings: nextSettings,
          teamA: squadA,
          teamB: squadB,
          playingXiA: squadA.players.map((p) => p.id),
          playingXiB: squadB.players.map((p) => p.id),
          tossWinnerId: squadA.id,
          tossDecision: 'bat',
          status: 'innings1',
          currentInningIndex: 1,
          inning1,
          inning2,
          targetRuns: 0,
        };
        broadcastCurrentState(next);
        return next;
      });
    },
    [fixtures, squads, broadcastCurrentState]
  );

  // Squad management
  const addSquad = useCallback(
    (squad: Squad) => {
      setSquads((prev) => {
        const nextSquads = [...prev, squad];
        broadcastCurrentState(match, undefined, undefined, nextSquads);
        return nextSquads;
      });
    },
    [match, broadcastCurrentState]
  );

  const updateSquad = useCallback(
    (squad: Squad) => {
      let nextSquads: Squad[] = [];
      setSquads((prev) => {
        nextSquads = prev.map((s) => (s.id === squad.id ? squad : s));
        return nextSquads;
      });

      setMatch((prevMatch) => {
        let changed = false;
        let nextTeamA = prevMatch.teamA;
        let nextTeamB = prevMatch.teamB;
        if (prevMatch.teamA?.id === squad.id) {
          nextTeamA = {
            ...prevMatch.teamA,
            logoUrl: squad.logoUrl,
            themeColor: squad.themeColor,
            teamName: squad.teamName,
            shortCode: squad.shortCode,
          };
          changed = true;
        }
        if (prevMatch.teamB?.id === squad.id) {
          nextTeamB = {
            ...prevMatch.teamB,
            logoUrl: squad.logoUrl,
            themeColor: squad.themeColor,
            teamName: squad.teamName,
            shortCode: squad.shortCode,
          };
          changed = true;
        }
        const nextMatch = changed ? { ...prevMatch, teamA: nextTeamA, teamB: nextTeamB } : prevMatch;
        broadcastCurrentState(nextMatch, undefined, undefined, nextSquads);
        return nextMatch;
      });
    },
    [broadcastCurrentState]
  );

  const deleteSquad = useCallback(
    (squadId: string) => {
      setSquads((prev) => {
        const nextSquads = prev.filter((s) => s.id !== squadId);
        broadcastCurrentState(match, undefined, undefined, nextSquads);
        return nextSquads;
      });
    },
    [match, broadcastCurrentState]
  );

  // Stages & Fixtures management
  const updateStages = useCallback((newStages: TournamentStage[]) => {
    setStages(newStages);
  }, []);

  const addFixture = useCallback((fixture: MatchFixture) => {
    setFixtures((prev) => [...prev, fixture]);
  }, []);

  const updateFixture = useCallback((fixture: MatchFixture) => {
    setFixtures((prev) => prev.map((f) => (f.id === fixture.id ? fixture : f)));
  }, []);

  const deleteFixture = useCallback((fixtureId: string) => {
    setFixtures((prev) => prev.filter((f) => f.id !== fixtureId));
  }, []);

  const updateTournamentStats = useCallback((stats: Partial<TournamentStats>) => {
    setTournamentStats((prev) => ({ ...prev, ...stats }));
  }, []);

  const archiveCurrentMatch = useCallback(() => {
    setCompletedMatches((prevCompleted) => {
      const exists = prevCompleted.some((m) => m.id === match.id);
      const nextList = exists
        ? prevCompleted.map((m) => (m.id === match.id ? match : m))
        : [...prevCompleted, match];
      const freshStats = calculateTournamentStats(nextList, squads);
      setTournamentStats(freshStats);
      return nextList;
    });
  }, [match, squads]);

  const deleteCompletedMatch = useCallback((matchId: string) => {
    setCompletedMatches((prev) => {
      const nextList = prev.filter((m) => m.id !== matchId);
      const freshStats = calculateTournamentStats(nextList, squads);
      setTournamentStats(freshStats);
      return nextList;
    });
  }, [squads]);

  return (
    <CricketContext.Provider
      value={{
        match,
        squads,
        tournamentStats,
        completedMatches,
        archiveCurrentMatch,
        deleteCompletedMatch,
        stages,
        fixtures,
        overlayConfig,
        milestonePopup,
        historyStack,
        isMobileDevice,
        isConnectedLive,
        recordDelivery,
        undoLastDelivery,
        setStriker,
        setNonStriker,
        setBowler,
        swapStrikers,
        updateMatchSettings,
        updateOverlayConfig,
        switchInning,
        startSuperOver,
        dismissSuperOverPrompt,
        resetMatch,
        resetMatchForNextSquads,
        clearScoresKeepTeams,
        fullWipeAll,
        assignTeamsAndToss,
        finishMatchAndRecordPoints,
        currentOverDeliveries,
        showOverCompletedModal,
        dismissOverCompletedModal,
        startNextOver,
        showInningBreakModal,
        dismissInningBreakModal,
        showMatchFinishedModal,
        dismissMatchFinishedModal,
        loadMatchFixture,
        addSquad,
        updateSquad,
        deleteSquad,
        getTeamLogo,
        updateStages,
        addFixture,
        updateFixture,
        deleteFixture,
        updateTournamentStats,
      }}
    >
      {children}
    </CricketContext.Provider>
  );
};

export const useCricket = () => {
  const context = useContext(CricketContext);
  if (!context) {
    throw new Error('useCricket must be used within a CricketProvider');
  }
  return context;
};
