import {
  Squad,
  MatchSettings,
  TournamentStats,
  TournamentStage,
  MatchFixture,
  InningState,
  MatchState,
} from '../types';

export const DEFAULT_SQUADS: Squad[] = [
  {
    id: 'squad-dgt',
    teamName: 'Deziglo Tigers',
    shortCode: 'DGT',
    themeColor: '#f59e0b', // Amber
    players: [
      { id: 'p-1', name: 'Pathum Nissanka', jerseyNumber: 18, role: 'Batsman', isCaptain: false, isWicketKeeper: false },
      { id: 'p-2', name: 'Kusal Mendis', jerseyNumber: 13, role: 'Wicket-Keeper', isCaptain: false, isWicketKeeper: true },
      { id: 'p-3', name: 'Charith Asalanka', jerseyNumber: 72, role: 'Batsman', isCaptain: true, isWicketKeeper: false },
      { id: 'p-4', name: 'Kamindu Mendis', jerseyNumber: 21, role: 'All-Rounder', isCaptain: false, isWicketKeeper: false },
      { id: 'p-5', name: 'Dasun Shanaka', jerseyNumber: 7, role: 'All-Rounder', isCaptain: false, isWicketKeeper: false },
      { id: 'p-6', name: 'Wanindu Hasaranga', jerseyNumber: 49, role: 'All-Rounder', isCaptain: false, isWicketKeeper: false },
      { id: 'p-7', name: 'Dunith Wellalage', jerseyNumber: 27, role: 'All-Rounder', isCaptain: false, isWicketKeeper: false },
      { id: 'p-8', name: 'Maheesh Theekshana', jerseyNumber: 61, role: 'Bowler', isCaptain: false, isWicketKeeper: false },
      { id: 'p-9', name: 'Matheesha Pathirana', jerseyNumber: 81, role: 'Bowler', isCaptain: false, isWicketKeeper: false },
      { id: 'p-10', name: 'Dilshan Madushanka', jerseyNumber: 98, role: 'Bowler', isCaptain: false, isWicketKeeper: false },
      { id: 'p-11', name: 'Asitha Fernando', jerseyNumber: 78, role: 'Bowler', isCaptain: false, isWicketKeeper: false },
    ],
  },
  {
    id: 'squad-rys',
    teamName: 'Royal Strikers',
    shortCode: 'RYS',
    themeColor: '#ef4444', // Red
    players: [
      { id: 'p-21', name: 'Rohit Sharma', jerseyNumber: 45, role: 'Batsman', isCaptain: true, isWicketKeeper: false },
      { id: 'p-22', name: 'Shubman Gill', jerseyNumber: 77, role: 'Batsman', isCaptain: false, isWicketKeeper: false },
      { id: 'p-23', name: 'Virat Kohli', jerseyNumber: 18, role: 'Batsman', isCaptain: false, isWicketKeeper: false },
      { id: 'p-24', name: 'Suryakumar Yadav', jerseyNumber: 63, role: 'Batsman', isCaptain: false, isWicketKeeper: false },
      { id: 'p-25', name: 'Rishabh Pant', jerseyNumber: 17, role: 'Wicket-Keeper', isCaptain: false, isWicketKeeper: true },
      { id: 'p-26', name: 'Hardik Pandya', jerseyNumber: 33, role: 'All-Rounder', isCaptain: false, isWicketKeeper: false },
      { id: 'p-27', name: 'Ravindra Jadeja', jerseyNumber: 8, role: 'All-Rounder', isCaptain: false, isWicketKeeper: false },
      { id: 'p-28', name: 'Axar Patel', jerseyNumber: 20, role: 'All-Rounder', isCaptain: false, isWicketKeeper: false },
      { id: 'p-29', name: 'Kuldeep Yadav', jerseyNumber: 23, role: 'Bowler', isCaptain: false, isWicketKeeper: false },
      { id: 'p-30', name: 'Jasprit Bumrah', jerseyNumber: 93, role: 'Bowler', isCaptain: false, isWicketKeeper: false },
      { id: 'p-31', name: 'Arshdeep Singh', jerseyNumber: 2, role: 'Bowler', isCaptain: false, isWicketKeeper: false },
    ],
  },
  {
    id: 'squad-clk',
    teamName: 'Colombo Kings',
    shortCode: 'CLK',
    themeColor: '#3b82f6', // Blue
    players: [
      { id: 'p-41', name: 'Babar Azam', jerseyNumber: 56, role: 'Batsman', isCaptain: true, isWicketKeeper: false },
      { id: 'p-42', name: 'Mohammad Rizwan', jerseyNumber: 16, role: 'Wicket-Keeper', isCaptain: false, isWicketKeeper: true },
      { id: 'p-43', name: 'Fakhar Zaman', jerseyNumber: 39, role: 'Batsman', isCaptain: false, isWicketKeeper: false },
      { id: 'p-44', name: 'Iftikhar Ahmed', jerseyNumber: 95, role: 'All-Rounder', isCaptain: false, isWicketKeeper: false },
      { id: 'p-45', name: 'Shadab Khan', jerseyNumber: 7, role: 'All-Rounder', isCaptain: false, isWicketKeeper: false },
      { id: 'p-46', name: 'Imad Wasim', jerseyNumber: 9, role: 'All-Rounder', isCaptain: false, isWicketKeeper: false },
      { id: 'p-47', name: 'Shaheen Afridi', jerseyNumber: 10, role: 'Bowler', isCaptain: false, isWicketKeeper: false },
      { id: 'p-48', name: 'Naseem Shah', jerseyNumber: 71, role: 'Bowler', isCaptain: false, isWicketKeeper: false },
      { id: 'p-49', name: 'Haris Rauf', jerseyNumber: 15, role: 'Bowler', isCaptain: false, isWicketKeeper: false },
      { id: 'p-50', name: 'Abrar Ahmed', jerseyNumber: 24, role: 'Bowler', isCaptain: false, isWicketKeeper: false },
      { id: 'p-51', name: 'Mohammad Amir', jerseyNumber: 5, role: 'Bowler', isCaptain: false, isWicketKeeper: false },
    ],
  },
  {
    id: 'squad-kdw',
    teamName: 'Kandy Warriors',
    shortCode: 'KDW',
    themeColor: '#8b5cf6', // Violet
    players: [
      { id: 'p-61', name: 'Travis Head', jerseyNumber: 62, role: 'Batsman', isCaptain: false, isWicketKeeper: false },
      { id: 'p-62', name: 'David Warner', jerseyNumber: 31, role: 'Batsman', isCaptain: false, isWicketKeeper: false },
      { id: 'p-63', name: 'Mitchell Marsh', jerseyNumber: 8, role: 'All-Rounder', isCaptain: true, isWicketKeeper: false },
      { id: 'p-64', name: 'Glenn Maxwell', jerseyNumber: 32, role: 'All-Rounder', isCaptain: false, isWicketKeeper: false },
      { id: 'p-65', name: 'Marcus Stoinis', jerseyNumber: 17, role: 'All-Rounder', isCaptain: false, isWicketKeeper: false },
      { id: 'p-66', name: 'Tim David', jerseyNumber: 85, role: 'Batsman', isCaptain: false, isWicketKeeper: false },
      { id: 'p-67', name: 'Matthew Wade', jerseyNumber: 13, role: 'Wicket-Keeper', isCaptain: false, isWicketKeeper: true },
      { id: 'p-68', name: 'Pat Cummins', jerseyNumber: 30, role: 'Bowler', isCaptain: false, isWicketKeeper: false },
      { id: 'p-69', name: 'Mitchell Starc', jerseyNumber: 56, role: 'Bowler', isCaptain: false, isWicketKeeper: false },
      { id: 'p-70', name: 'Adam Zampa', jerseyNumber: 88, role: 'Bowler', isCaptain: false, isWicketKeeper: false },
      { id: 'p-71', name: 'Josh Hazlewood', jerseyNumber: 38, role: 'Bowler', isCaptain: false, isWicketKeeper: false },
    ],
  },
];

export const DEFAULT_SETTINGS: MatchSettings = {
  tournamentName: 'DEZIGLO PREMIER LEAGUE 2026',
  venue: 'R. Premadasa International Stadium, Colombo',
  matchTitle: 'Match 01 - Group A',
  date: new Date().toISOString().split('T')[0],
  playersPerSide: 11,
  allOutWickets: 10,
  totalOvers: 20,
  ballsPerOver: 6,
};

export function createEmptyInning(
  inningNumber: 1 | 2,
  battingSquad: Squad,
  bowlingSquad: Squad,
  strikerId: string,
  nonStrikerId: string,
  bowlerId: string
): InningState {
  const batsmen: Record<string, any> = {};
  battingSquad.players.forEach((p) => {
    batsmen[p.id] = {
      playerId: p.id,
      name: p.name,
      runs: 0,
      balls: 0,
      fours: 0,
      sixes: 0,
      dots: 0,
      isOut: false,
      strikeRate: 0,
    };
  });

  const bowlers: Record<string, any> = {};
  bowlingSquad.players.forEach((p) => {
    bowlers[p.id] = {
      playerId: p.id,
      name: p.name,
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
  });

  return {
    inningNumber,
    battingTeamId: battingSquad.id,
    battingTeamName: battingSquad.teamName,
    battingTeamCode: battingSquad.shortCode,
    bowlingTeamId: bowlingSquad.id,
    bowlingTeamName: bowlingSquad.teamName,
    bowlingTeamCode: bowlingSquad.shortCode,
    totalRuns: 0,
    wickets: 0,
    legalBalls: 0,
    oversFormatted: '0.0',
    extras: {
      wides: 0,
      noBalls: 0,
      byes: 0,
      legByes: 0,
      total: 0,
    },
    strikerId,
    nonStrikerId,
    currentBowlerId: bowlerId,
    batsmen,
    bowlers,
    fallOfWickets: [],
    currentPartnership: {
      runs: 0,
      balls: 0,
      player1Id: strikerId,
      player1Runs: 0,
      player2Id: nonStrikerId,
      player2Runs: 0,
    },
    deliveries: [],
    isCompleted: false,
  };
}

export function createInitialMatch(): MatchState {
  const teamA = DEFAULT_SQUADS[0];
  const teamB = DEFAULT_SQUADS[1];
  const playingXiA = teamA.players.map((p) => p.id);
  const playingXiB = teamB.players.map((p) => p.id);

  const inning1 = createEmptyInning(1, teamA, teamB, teamA.players[0].id, teamA.players[1].id, teamB.players[9].id);
  const inning2 = createEmptyInning(2, teamB, teamA, teamB.players[0].id, teamB.players[1].id, teamA.players[8].id);

  // Pre-seed a few exciting deliveries so that opening the app gives an instant live broadcast feel!
  // Inning 1 sample initial state
  inning1.totalRuns = 42;
  inning1.wickets = 1;
  inning1.legalBalls = 26; // 4.2 overs
  inning1.oversFormatted = '4.2';
  inning1.extras = { wides: 2, noBalls: 1, byes: 0, legByes: 1, total: 4 };

  const striker = teamA.players[0]; // Pathum Nissanka
  const nonStriker = teamA.players[2]; // Charith Asalanka
  const outBatter = teamA.players[1]; // Kusal Mendis
  const bowler = teamB.players[9]; // Jasprit Bumrah

  inning1.batsmen[striker.id] = {
    playerId: striker.id,
    name: striker.name,
    runs: 26,
    balls: 16,
    fours: 3,
    sixes: 1,
    dots: 7,
    isOut: false,
    strikeRate: 162.5,
  };

  inning1.batsmen[nonStriker.id] = {
    playerId: nonStriker.id,
    name: nonStriker.name,
    runs: 6,
    balls: 4,
    fours: 1,
    sixes: 0,
    dots: 2,
    isOut: false,
    strikeRate: 150.0,
  };

  inning1.batsmen[outBatter.id] = {
    playerId: outBatter.id,
    name: outBatter.name,
    runs: 6,
    balls: 7,
    fours: 1,
    sixes: 0,
    dots: 4,
    isOut: true,
    dismissalText: 'c Pant b Bumrah',
    strikeRate: 85.7,
  };

  inning1.bowlers[bowler.id] = {
    playerId: bowler.id,
    name: bowler.name,
    overs: 2.2,
    legalBalls: 14,
    maidens: 0,
    runsConceded: 18,
    wickets: 1,
    dots: 6,
    wides: 1,
    noBalls: 0,
    economy: 7.71,
  };

  inning1.fallOfWickets = [
    { wicketNumber: 1, runs: 28, overs: '3.1', playerOutName: 'Kusal Mendis' },
  ];

  inning1.currentPartnership = {
    runs: 14,
    balls: 7,
    player1Id: striker.id,
    player1Runs: 8,
    player2Id: nonStriker.id,
    player2Runs: 6,
  };

  inning1.strikerId = striker.id;
  inning1.nonStrikerId = nonStriker.id;
  inning1.currentBowlerId = bowler.id;

  // Recent deliveries
  inning1.deliveries = [
    {
      id: 'd-1',
      overIndex: 3,
      ballInOver: 5,
      displayOver: '3.5',
      strikerId: striker.id,
      strikerName: striker.name,
      nonStrikerId: nonStriker.id,
      nonStrikerName: nonStriker.name,
      bowlerId: bowler.id,
      bowlerName: bowler.name,
      runsScored: 4,
      isBoundaryFour: true,
      isBoundarySix: false,
      totalRunsOnBall: 4,
      extraRuns: 0,
      isLegalBall: true,
      timestamp: Date.now() - 60000,
    },
    {
      id: 'd-2',
      overIndex: 3,
      ballInOver: 6,
      displayOver: '3.6',
      strikerId: striker.id,
      strikerName: striker.name,
      nonStrikerId: nonStriker.id,
      nonStrikerName: nonStriker.name,
      bowlerId: bowler.id,
      bowlerName: bowler.name,
      runsScored: 1,
      isBoundaryFour: false,
      isBoundarySix: false,
      totalRunsOnBall: 1,
      extraRuns: 0,
      isLegalBall: true,
      timestamp: Date.now() - 45000,
    },
    {
      id: 'd-3',
      overIndex: 4,
      ballInOver: 1,
      displayOver: '4.1',
      strikerId: nonStriker.id,
      strikerName: nonStriker.name,
      nonStrikerId: striker.id,
      nonStrikerName: striker.name,
      bowlerId: bowler.id,
      bowlerName: bowler.name,
      runsScored: 0,
      isBoundaryFour: false,
      isBoundarySix: false,
      totalRunsOnBall: 0,
      extraRuns: 0,
      isLegalBall: true,
      timestamp: Date.now() - 30000,
    },
    {
      id: 'd-4',
      overIndex: 4,
      ballInOver: 2,
      displayOver: '4.2',
      strikerId: nonStriker.id,
      strikerName: nonStriker.name,
      nonStrikerId: striker.id,
      nonStrikerName: striker.name,
      bowlerId: bowler.id,
      bowlerName: bowler.name,
      runsScored: 6,
      isBoundaryFour: false,
      isBoundarySix: true,
      totalRunsOnBall: 6,
      extraRuns: 0,
      isLegalBall: true,
      timestamp: Date.now() - 15000,
    },
  ];

  return {
    id: 'match-01',
    settings: DEFAULT_SETTINGS,
    teamA,
    teamB,
    playingXiA,
    playingXiB,
    tossWinnerId: teamA.id,
    tossDecision: 'bat',
    status: 'innings1',
    currentInningIndex: 1,
    inning1,
    inning2,
    targetRuns: 0,
  };
}

export const INITIAL_TOURNAMENT_STATS: TournamentStats = {
  totalSixes: 0,
  totalFours: 0,
  totalDots: 0,
  mostRuns: [],
  mostWickets: [],
  mostSixes: [],
  mostFours: [],
  bestFielders: [],
};

export const INITIAL_TOURNAMENT_STAGES: TournamentStage[] = [
  {
    id: 'stage-group',
    name: 'Group Stage',
    type: 'group_stage',
    groups: [
      {
        id: 'group-a',
        name: 'Group A',
        standings: [
          {
            teamId: 'squad-dgt',
            teamName: 'Deziglo Tigers',
            shortCode: 'DGT',
            played: 3,
            won: 2,
            lost: 1,
            tied: 0,
            noResult: 0,
            points: 4,
            nrr: 0.852,
            runsFor: 520,
            oversFor: 58.4,
            runsAgainst: 472,
            oversAgainst: 60.0,
            form: ['W', 'L', 'W'],
          },
          {
            teamId: 'squad-rys',
            teamName: 'Royal Strikers',
            shortCode: 'RYS',
            played: 3,
            won: 2,
            lost: 1,
            tied: 0,
            noResult: 0,
            points: 4,
            nrr: 0.618,
            runsFor: 495,
            oversFor: 59.2,
            runsAgainst: 458,
            oversAgainst: 60.0,
            form: ['W', 'W', 'L'],
          },
          {
            teamId: 'squad-clk',
            teamName: 'Colombo Kings',
            shortCode: 'CLK',
            played: 3,
            won: 1,
            lost: 2,
            tied: 0,
            noResult: 0,
            points: 2,
            nrr: -0.421,
            runsFor: 460,
            oversFor: 60.0,
            runsAgainst: 485,
            oversAgainst: 58.2,
            form: ['L', 'W', 'L'],
          },
          {
            teamId: 'squad-kdw',
            teamName: 'Kandy Warriors',
            shortCode: 'KDW',
            played: 3,
            won: 1,
            lost: 2,
            tied: 0,
            noResult: 0,
            points: 2,
            nrr: -1.045,
            runsFor: 440,
            oversFor: 60.0,
            runsAgainst: 500,
            oversAgainst: 59.4,
            form: ['L', 'L', 'W'],
          },
        ],
      },
    ],
  },
  {
    id: 'stage-super-4',
    name: 'Super 4 Round',
    type: 'super_4',
    groups: [
      {
        id: 'group-super-4',
        name: 'Super 4 Table',
        standings: [],
      },
    ],
  },
  {
    id: 'stage-finals',
    name: 'Playoffs & Final',
    type: 'final',
    groups: [
      {
        id: 'group-finals',
        name: 'Grand Final',
        standings: [],
      },
    ],
  },
];

export const INITIAL_FIXTURES: MatchFixture[] = [
  {
    id: 'fix-1',
    stageId: 'stage-group',
    matchNumber: 1,
    title: 'Match 1 - Group A',
    teamAId: 'squad-dgt',
    teamAName: 'Deziglo Tigers',
    teamACode: 'DGT',
    teamBId: 'squad-rys',
    teamBName: 'Royal Strikers',
    teamBCode: 'RYS',
    date: '2026-09-20',
    venue: 'R. Premadasa International Stadium, Colombo',
    status: 'live',
    scoresSummary: 'DGT 42/1 (4.2 ov) vs RYS',
    hasScorecard: true,
  },
  {
    id: 'fix-2',
    stageId: 'stage-group',
    matchNumber: 2,
    title: 'Match 2 - Group A',
    teamAId: 'squad-clk',
    teamAName: 'Colombo Kings',
    teamACode: 'CLK',
    teamBId: 'squad-kdw',
    teamBName: 'Kandy Warriors',
    teamBCode: 'KDW',
    date: '2026-09-21',
    venue: 'Pallekele International Cricket Stadium, Kandy',
    status: 'upcoming',
    hasScorecard: false,
  },
  {
    id: 'fix-3',
    stageId: 'stage-group',
    matchNumber: 3,
    title: 'Match 3 - Group A',
    teamAId: 'squad-dgt',
    teamAName: 'Deziglo Tigers',
    teamACode: 'DGT',
    teamBId: 'squad-kdw',
    teamBName: 'Kandy Warriors',
    teamBCode: 'KDW',
    date: '2026-09-22',
    venue: 'R. Premadasa International Stadium, Colombo',
    status: 'upcoming',
    hasScorecard: false,
  },
  {
    id: 'fix-4',
    stageId: 'stage-super-4',
    matchNumber: 4,
    title: 'Super 4 Match 1',
    teamAId: 'squad-dgt',
    teamAName: 'Deziglo Tigers',
    teamACode: 'DGT',
    teamBId: 'squad-rys',
    teamBName: 'Royal Strikers',
    teamBCode: 'RYS',
    date: '2026-09-25',
    venue: 'R. Premadasa International Stadium, Colombo',
    status: 'upcoming',
    hasScorecard: false,
  },
];
