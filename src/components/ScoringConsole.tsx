import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  RotateCcw,
  RefreshCw,
  Zap,
  Target,
  ArrowRightLeft,
  ChevronDown,
  UserCheck,
  AlertCircle,
  Clock,
  Shield,
  Trophy,
  Layers,
  Tv,
  Eye,
  EyeOff,
  Flame,
  Sparkles,
} from 'lucide-react';
import { useCricket } from '../context/CricketContext';
import { DismissalType, ExtraType, OverlayType } from '../types';

export const ScoringConsole: React.FC = () => {
  const {
    match,
    recordDelivery,
    undoLastDelivery,
    setStriker,
    setNonStriker,
    setBowler,
    swapStrikers,
    switchInning,
    startSuperOver,
    historyStack,
    overlayConfig,
    updateOverlayConfig,
  } = useCricket();

  const isSuperOver = !!match.superOver?.active;
  const currentInning = isSuperOver
    ? match.superOver!.currentInning === 1
      ? match.superOver!.inning1
      : match.superOver!.inning2
    : match.currentInningIndex === 1
    ? match.inning1
    : match.inning2;

  const battingSquad =
    currentInning.battingTeamId === match.teamA.id ? match.teamA : match.teamB;
  const bowlingSquad =
    currentInning.bowlingTeamId === match.teamA.id ? match.teamA : match.teamB;

  // Active players
  const striker = currentInning.batsmen[currentInning.strikerId];
  const nonStriker = currentInning.batsmen[currentInning.nonStrikerId];
  const bowler = currentInning.bowlers[currentInning.currentBowlerId];

  // Dismissal modal state
  const [showWicketModal, setShowWicketModal] = useState(false);
  const [selectedDismissalType, setSelectedDismissalType] = useState<DismissalType>('Bowled');
  const [outPlayerTarget, setOutPlayerTarget] = useState<'striker' | 'nonStriker'>('striker');
  const [fielderName, setFielderName] = useState('');
  const [runOutExtraType, setRunOutExtraType] = useState<'none' | 'wide' | 'noBall'>('none');
  const [runOutRuns, setRunOutRuns] = useState<number>(0);
  const [incomingBatterId, setIncomingBatterId] = useState<string>('');

  // 4 Run Modal: boundary 4 or running 4?
  const [showFourModal, setShowFourModal] = useState(false);

  // 2-second Boundary Popup animation state for 'This Over' box (User Request 7)
  const [boundaryPopup, setBoundaryPopup] = useState<{ id: string; type: 'four' | 'six' } | null>(null);
  const popupTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const triggerBoundaryPopup = (type: 'four' | 'six') => {
    if (popupTimeoutRef.current) {
      clearTimeout(popupTimeoutRef.current);
    }
    setBoundaryPopup({ id: `bp-${Date.now()}`, type });
    popupTimeoutRef.current = setTimeout(() => {
      setBoundaryPopup(null);
    }, 2000); // exactly ~2 seconds as requested
  };

  // Available new batters (not already out and not currently at crease)
  const availableBatters = battingSquad.players.filter((p) => {
    const bStats = currentInning.batsmen[p.id];
    const isAtCrease = p.id === currentInning.strikerId || p.id === currentInning.nonStrikerId;
    return !bStats?.isOut && !isAtCrease;
  });

  // Handle normal runs
  const handleNormalRun = (runs: number, isBoundary: boolean = false) => {
    if (runs === 4) {
      triggerBoundaryPopup('four');
    } else if (runs === 6) {
      triggerBoundaryPopup('six');
    }
    recordDelivery({
      runs,
      isBoundaryFour: isBoundary && runs === 4,
      isBoundarySix: isBoundary && runs === 6,
    });
  };

  // Dedicated Wide Scoring Handler (5 Buttons: WD, WD+1, WD+2, WD+3, WD+4)
  // WD = 1 extra run, WD+1 = 2 total runs, WD+2 = 3 total runs, WD+3 = 4 total runs, WD+4 = 5 total runs
  // All wide runs are extras, not batter runs, and the delivery is not a legal ball
  const handleWide = (extraRuns: number) => {
    recordDelivery({
      runs: 0, // All wide runs are extras, not batter runs
      extraType: 'wide',
      extraRuns, // 1 for WD, 2 for WD+1, 3 for WD+2, 4 for WD+3, 5 for WD+4
      isBoundaryFour: false,
      isBoundarySix: false,
    });
  };

  // Dedicated No-Ball Scoring Handler (6 Buttons: NB, NB+1, NB+2, NB+3, NB+4, NB+6)
  // NB = 1 extra run (1 total run: 1 extra + 0 batter run)
  // NB+1 = 2 total runs (1 extra + 1 batter run)
  // NB+2 = 3 total runs (1 extra + 2 batter runs)
  // NB+3 = 4 total runs (1 extra + 3 batter runs)
  // NB+4 = 5 total runs (1 extra + 4 batter runs, counted as batter's 4 & Tournament 4s)
  // NB+6 = 7 total runs (1 extra + 6 batter runs, counted as batter's 6 & Tournament 6s)
  // 1-run penalty is always an extra, while runs hit by batter are credited to the batter
  const handleNoBall = (totalRuns: number) => {
    const batRuns = totalRuns > 1 ? totalRuns - 1 : 0;
    const isFour = batRuns === 4;
    const isSix = batRuns === 6;

    if (isFour) triggerBoundaryPopup('four');
    if (isSix) triggerBoundaryPopup('six');

    recordDelivery({
      runs: batRuns, // batter runs
      extraType: 'noBall',
      extraRuns: 1, // 1-run penalty is always an extra
      isBoundaryFour: isFour,
      isBoundarySix: isSix,
    });
  };

  // Handle Extras for Byes and Leg-Byes
  const handleExtra = (type: ExtraType, runs: number) => {
    if (type === 'wide') {
      handleWide(runs);
    } else if (type === 'noBall') {
      handleNoBall(runs);
    } else if (type === 'bye') {
      recordDelivery({
        runs: 0,
        extraType: 'bye',
        extraRuns: runs,
      });
    } else if (type === 'legBye') {
      recordDelivery({
        runs: 0,
        extraType: 'legBye',
        extraRuns: runs,
      });
    }
  };

  // Submit Wicket dismissal
  const handleConfirmWicket = () => {
    const outId = outPlayerTarget === 'striker' ? currentInning.strikerId : currentInning.nonStrikerId;
    const outName = outPlayerTarget === 'striker' ? (striker?.name || 'Striker') : (nonStriker?.name || 'Non-Striker');

    recordDelivery({
      runs: selectedDismissalType === 'Run Out' && runOutExtraType === 'none' ? runOutRuns : 0,
      extraType: runOutExtraType === 'wide' ? 'wide' : runOutExtraType === 'noBall' ? 'noBall' : null,
      extraRuns: runOutExtraType === 'wide' ? runOutRuns + 1 : runOutExtraType === 'noBall' ? 1 : 0,
      dismissal: {
        type: selectedDismissalType,
        playerOutId: outId,
        playerOutName: outName,
        fielderName: fielderName.trim() || undefined,
        extraRunsWithDismissal: selectedDismissalType === 'Run Out' && runOutExtraType === 'noBall' ? runOutRuns : undefined,
        wasWide: selectedDismissalType === 'Run Out' && runOutExtraType === 'wide',
        wasNoBall: selectedDismissalType === 'Run Out' && runOutExtraType === 'noBall',
      },
      newBatterId: incomingBatterId || undefined,
    });

    // Reset modal
    setShowWicketModal(false);
    setFielderName('');
    setRunOutRuns(0);
    setRunOutExtraType('none');
    setIncomingBatterId('');
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-5 shadow-xl font-sans-ui">
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <h2 className="font-tech font-bold text-lg text-white tracking-wide uppercase">
              LIVE BALL DELIVERY PANEL
            </h2>
          </div>
          {isSuperOver && (
            <span className="bg-red-600 text-white font-tech font-black text-xs px-2 py-0.5 rounded uppercase tracking-wider animate-bounce">
              ⚡ SUPER OVER (MAX 2 WKTS)
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Undo Button */}
          <button
            onClick={undoLastDelivery}
            disabled={historyStack.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 disabled:opacity-40 disabled:pointer-events-none text-xs font-tech font-bold border border-slate-700 transition"
            title="Undo last delivery"
          >
            <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
            UNDO BALL ({historyStack.length})
          </button>

          {/* Swap Strike */}
          <button
            onClick={swapStrikers}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-tech font-bold border border-slate-700 transition"
            title="Swap striker and non-striker"
          >
            <ArrowRightLeft className="w-3.5 h-3.5 text-sky-400" />
            SWAP STRIKE
          </button>
        </div>
      </div>

      {/* Crease & Bowler Selection Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 my-4">
        {/* Striker Selector */}
        <div className="bg-slate-950/80 p-3 rounded-lg border border-amber-500/50">
          <div className="flex items-center justify-between text-xs font-tech text-amber-400 font-bold mb-1">
            <span className="flex items-center gap-1">
              <span className="text-base">▶</span> ON STRIKE (*)
            </span>
            <span>
              {striker?.runs || 0} ({striker?.balls || 0}b)
            </span>
          </div>
          <select
            value={currentInning.strikerId}
            onChange={(e) => setStriker(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-sm font-tech text-white focus:outline-none focus:border-amber-400"
          >
            {battingSquad.players.map((p) => {
              const b = currentInning.batsmen[p.id];
              return (
                <option key={p.id} value={p.id} disabled={b?.isOut}>
                  #{p.jerseyNumber} {p.name} {p.isCaptain ? '(C)' : ''} {p.isWicketKeeper ? '(WK)' : ''}{' '}
                  {b?.isOut ? '(OUT)' : ''}
                </option>
              );
            })}
          </select>
        </div>

        {/* Non-Striker Selector */}
        <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-800">
          <div className="flex items-center justify-between text-xs font-tech text-slate-400 font-bold mb-1">
            <span>NON-STRIKER</span>
            <span>
              {nonStriker?.runs || 0} ({nonStriker?.balls || 0}b)
            </span>
          </div>
          <select
            value={currentInning.nonStrikerId}
            onChange={(e) => setNonStriker(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-sm font-tech text-white focus:outline-none focus:border-slate-500"
          >
            {battingSquad.players.map((p) => {
              const b = currentInning.batsmen[p.id];
              return (
                <option key={p.id} value={p.id} disabled={b?.isOut}>
                  #{p.jerseyNumber} {p.name} {p.isCaptain ? '(C)' : ''} {p.isWicketKeeper ? '(WK)' : ''}{' '}
                  {b?.isOut ? '(OUT)' : ''}
                </option>
              );
            })}
          </select>
        </div>

        {/* Current Bowler Selector */}
        <div className="bg-slate-950/80 p-3 rounded-lg border border-sky-500/40">
          <div className="flex items-center justify-between text-xs font-tech text-sky-400 font-bold mb-1">
            <span className="flex items-center gap-1">
              <Shield className="w-3.5 h-3.5" /> CURRENT BOWLER
            </span>
            <span>
              {bowler?.wickets || 0}/{bowler?.runsConceded || 0} ({bowler?.overs || 0} ov)
            </span>
          </div>
          <select
            value={currentInning.currentBowlerId}
            onChange={(e) => setBowler(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-sm font-tech text-white focus:outline-none focus:border-sky-400"
          >
            {bowlingSquad.players.map((p) => (
              <option key={p.id} value={p.id}>
                #{p.jerseyNumber} {p.name} ({p.role}) {p.isCaptain ? '(C)' : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* THIS OVER BOX WITH 2-SECOND BOUNDARY 4 & 6 POPUP ANIMATION (User Requests 2 & 7) */}
      {(() => {
        const ballsPerOver = match.settings.ballsPerOver || 6;
        const currentLegalBalls = currentInning.legalBalls || 0;
        const isOverJustFinished = currentLegalBalls > 0 && currentLegalBalls % ballsPerOver === 0;

        const lastDel = currentInning.deliveries[currentInning.deliveries.length - 1];
        const isRecentLastBall = lastDel && Date.now() - lastDel.timestamp < 3000;

        let activeOverIndex = Math.floor(currentLegalBalls / ballsPerOver);
        if (isOverJustFinished && isRecentLastBall) {
          activeOverIndex = Math.floor(currentLegalBalls / ballsPerOver) - 1;
        }

        const thisOverDeliveries = currentInning.deliveries.filter((d) => d.overIndex === activeOverIndex);
        const thisOverRuns = thisOverDeliveries.reduce((sum, d) => sum + d.totalRunsOnBall, 0);
        const thisOverLegalCount = thisOverDeliveries.filter((d) => d.isLegalBall).length;

        return (
          <div
            id="scoring-this-over-box"
            className="relative overflow-hidden bg-slate-950/90 border border-slate-800 rounded-xl p-3 sm:p-4 my-3 shadow-lg"
          >
            {/* 2-SECOND POPUP ANIMATION (DISPLAYED WITHIN THE 'THIS OVER' BOX) */}
            <AnimatePresence>
              {boundaryPopup && (
                <motion.div
                  key={boundaryPopup.id}
                  initial={{ opacity: 0, scale: 0.75, y: 12 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.85, y: -10 }}
                  transition={{ duration: 0.25, ease: 'easeOut' }}
                  className={`absolute inset-0 z-30 flex items-center justify-center p-3 rounded-xl border-2 backdrop-blur-md shadow-2xl ${
                    boundaryPopup.type === 'six'
                      ? 'bg-slate-950/95 border-purple-400 text-white shadow-purple-900/50'
                      : 'bg-slate-950/95 border-emerald-400 text-white shadow-emerald-900/50'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-14 h-14 rounded-2xl flex items-center justify-center font-display font-black text-3xl shadow-lg border-2 ${
                        boundaryPopup.type === 'six'
                          ? 'bg-gradient-to-tr from-purple-700 via-indigo-600 to-purple-500 border-purple-300 text-white animate-bounce'
                          : 'bg-gradient-to-tr from-emerald-600 via-teal-500 to-emerald-400 border-emerald-300 text-slate-950 animate-bounce'
                      }`}
                    >
                      {boundaryPopup.type === 'six' ? '6' : '4'}
                    </div>

                    <div className="text-left">
                      <div className="flex items-center gap-2">
                        <span
                          className={`font-tech font-black text-xl uppercase tracking-wider ${
                            boundaryPopup.type === 'six' ? 'text-purple-300' : 'text-emerald-300'
                          }`}
                        >
                          {boundaryPopup.type === 'six' ? '🔥 MAXIMUM SIX!' : '🏏 BOUNDARY FOUR!'}
                        </span>
                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
                            boundaryPopup.type === 'six'
                              ? 'bg-purple-900/80 text-purple-200 border border-purple-500/60'
                              : 'bg-emerald-900/80 text-emerald-200 border border-emerald-500/60'
                          }`}
                        >
                          THIS OVER
                        </span>
                      </div>
                      <p className="text-xs font-sans-ui text-slate-200 mt-0.5">
                        {boundaryPopup.type === 'six'
                          ? 'Massive hit cleared the boundary ropes! 6 runs added.'
                          : 'Clean boundary stroke to the fence! 4 runs added.'}
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* This Over Header */}
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 mb-2 border-b border-slate-800/80">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <span className="font-tech font-bold text-xs uppercase tracking-wider text-amber-400">
                  THIS OVER (OVER {activeOverIndex + 1})
                </span>
                <span className="text-slate-400 font-mono text-[11px]">
                  [{thisOverLegalCount}/{ballsPerOver} Legal Balls]
                </span>
              </div>

              <div className="flex items-center gap-3 text-xs font-tech">
                <span className="text-slate-400">
                  Runs in over:{' '}
                  <strong className="text-white font-mono text-sm">{thisOverRuns}</strong>
                </span>
                <span className="text-slate-600 font-mono">|</span>
                <span className="text-slate-400">
                  Bowler: <strong className="text-sky-300">{bowler?.name || 'Bowler'}</strong>
                </span>
              </div>
            </div>

            {/* Deliveries Strip for this over */}
            <div className="flex items-center gap-2 overflow-x-auto py-1 min-h-[44px]">
              {thisOverDeliveries.length === 0 ? (
                <span className="text-xs text-slate-500 italic font-tech flex items-center gap-1.5">
                  <span>⚪</span> Over starting • Awaiting first delivery
                </span>
              ) : (
                thisOverDeliveries.map((b, idx) => {
                  let badgeStyle = 'bg-slate-800 text-slate-200 border-slate-700';
                  let label = `${b.runsScored}`;

                  if (b.dismissal && b.dismissal.type === 'Hurt Retired') {
                    badgeStyle = 'bg-orange-700 text-white border-orange-400 font-black';
                    label = 'RH';
                  } else if (b.dismissal) {
                    badgeStyle = 'bg-red-600 text-white border-red-400 font-black';
                    label = 'W';
                  } else if (b.isBoundarySix) {
                    badgeStyle = 'bg-purple-600 text-white border-purple-400 font-black ring-1 ring-purple-400';
                    label = '6';
                  } else if (b.isBoundaryFour) {
                    badgeStyle = 'bg-emerald-600 text-white border-emerald-400 font-black ring-1 ring-emerald-400';
                    label = '4';
                  } else if (b.extraType === 'wide') {
                    badgeStyle = 'bg-amber-600 text-white border-amber-400 font-bold';
                    label = b.extraRuns > 1 ? `WD+${b.extraRuns - 1}` : 'WD';
                  } else if (b.extraType === 'noBall') {
                    badgeStyle = 'bg-orange-600 text-white border-orange-400 font-bold';
                    label = b.runsScored === 4 ? 'N4' : b.runsScored === 6 ? 'N6' : 'NB';
                  } else if (b.extraType === 'bye') {
                    badgeStyle = 'bg-sky-700 text-white border-sky-500 font-bold';
                    label = `B${b.extraRuns}`;
                  } else if (b.extraType === 'legBye') {
                    badgeStyle = 'bg-cyan-700 text-white border-cyan-500 font-bold';
                    label = `Lb${b.extraRuns}`;
                  } else if (b.runsScored === 0) {
                    badgeStyle = 'bg-slate-800 text-slate-400 border-slate-700 font-bold';
                    label = '•';
                  }

                  return (
                    <div
                      key={b.id || idx}
                      className={`min-w-[36px] h-9 px-2.5 rounded-lg border flex flex-col items-center justify-center text-xs font-mono font-bold transition shadow-sm ${badgeStyle}`}
                      title={`${b.displayOver} ov: ${b.strikerName} to ${b.bowlerName} - ${b.totalRunsOnBall} runs`}
                    >
                      <span>{label}</span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        );
      })()}

      {/* SECTION 1: NORMAL BALLS (1, 2, 3, 4 [Boundary or Run], 5, 6 [Boundary], Dot 0) */}
      <div className="my-4">
        <div className="text-xs font-tech font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center justify-between">
          <span>NORMAL BALLS (LEGAL DELIVERIES)</span>
          <span className="text-[11px] text-slate-500 font-mono">Counts to legal balls & bowler figures</span>
        </div>
        <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
          {/* Dot 0 */}
          <button
            onClick={() => handleNormalRun(0)}
            className="h-14 sm:h-16 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 border border-slate-700 font-display text-3xl font-bold flex flex-col items-center justify-center transition shadow-md"
          >
            <span>0</span>
            <span className="text-[10px] font-tech text-slate-400 uppercase -mt-1">DOT</span>
          </button>

          {/* 1 */}
          <button
            onClick={() => handleNormalRun(1)}
            className="h-14 sm:h-16 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-white border border-slate-700 font-display text-3xl font-bold flex flex-col items-center justify-center transition shadow-md"
          >
            <span>1</span>
            <span className="text-[10px] font-tech text-slate-400 uppercase -mt-1">SINGLE</span>
          </button>

          {/* 2 */}
          <button
            onClick={() => handleNormalRun(2)}
            className="h-14 sm:h-16 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-white border border-slate-700 font-display text-3xl font-bold flex flex-col items-center justify-center transition shadow-md"
          >
            <span>2</span>
            <span className="text-[10px] font-tech text-slate-400 uppercase -mt-1">DOUBLE</span>
          </button>

          {/* 3 */}
          <button
            onClick={() => handleNormalRun(3)}
            className="h-14 sm:h-16 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-white border border-slate-700 font-display text-3xl font-bold flex flex-col items-center justify-center transition shadow-md"
          >
            <span>3</span>
            <span className="text-[10px] font-tech text-slate-400 uppercase -mt-1">THREE</span>
          </button>

          {/* 4 (Boundary or Run modal trigger) */}
          <button
            onClick={() => setShowFourModal(true)}
            className="h-14 sm:h-16 rounded-xl bg-emerald-700 hover:bg-emerald-600 active:scale-95 text-white border border-emerald-500 font-display text-3xl font-black flex flex-col items-center justify-center transition shadow-lg relative overflow-hidden"
          >
            <span>4</span>
            <span className="text-[10px] font-tech text-emerald-200 uppercase -mt-1">FOUR (4)</span>
          </button>

          {/* 5 */}
          <button
            onClick={() => handleNormalRun(5)}
            className="h-14 sm:h-16 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-white border border-slate-700 font-display text-3xl font-bold flex flex-col items-center justify-center transition shadow-md"
          >
            <span>5</span>
            <span className="text-[10px] font-tech text-slate-400 uppercase -mt-1">FIVE</span>
          </button>

          {/* 6 (Boundary) */}
          <button
            onClick={() => handleNormalRun(6, true)}
            className="h-14 sm:h-16 rounded-xl bg-purple-700 hover:bg-purple-600 active:scale-95 text-white border border-purple-400 font-display text-3xl font-black flex flex-col items-center justify-center transition shadow-lg col-span-2 sm:col-span-1"
          >
            <span>6</span>
            <span className="text-[10px] font-tech text-purple-200 uppercase -mt-1">SIX (6)</span>
          </button>
        </div>
      </div>

      {/* SECTION 2: EXTRAS DELIVERY OPTIONS (REDUCED SIZE, 1 STRAIGHT LINE ROWS) */}
      <div className="my-3 pt-2.5 border-t border-slate-800">
        {/* ROW 1: WIDE & NO-BALL IN 1 STRAIGHT LINE (11 BUTTONS) */}
        <div className="bg-slate-950/85 p-2 rounded-xl border border-slate-800 mb-2">
          <div className="flex flex-wrap items-center justify-between gap-1 text-[11px] font-tech font-bold uppercase tracking-wider mb-1.5 px-0.5">
            <div className="flex items-center gap-2.5">
              <span className="text-amber-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                WIDE (WD: 1-5 EXTRAS)
              </span>
              <span className="text-slate-600">•</span>
              <span className="text-orange-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                NO-BALL (NB: 1 EX + BAT RUNS, 0 BALL FACED)
              </span>
            </div>
            <span className="text-[10px] text-slate-400 font-mono">11 Buttons in 1 Straight Line</span>
          </div>

          {/* 1 STRAIGHT LINE: 5 WIDE BUTTONS + 6 NO-BALL BUTTONS */}
          <div className="w-full overflow-x-auto scrollbar-thin pb-0.5">
            <div className="flex items-center gap-1 sm:gap-1.5 min-w-[680px] sm:min-w-0 sm:grid sm:grid-cols-11">
              {/* 5 WIDE BUTTONS */}
              {[
                { label: 'WD', runs: 1, sub: '1R' },
                { label: 'WD+1', runs: 2, sub: '2R' },
                { label: 'WD+2', runs: 3, sub: '3R' },
                { label: 'WD+3', runs: 4, sub: '4R' },
                { label: 'WD+4', runs: 5, sub: '5R' },
              ].map((btn) => (
                <button
                  key={btn.label}
                  onClick={() => handleWide(btn.runs)}
                  className="flex-1 min-w-[54px] py-1 px-1 rounded-lg bg-gradient-to-b from-amber-900/50 to-amber-950/80 hover:from-amber-800/70 hover:to-amber-900/90 text-amber-200 border border-amber-600/60 hover:border-amber-400 font-tech font-bold active:scale-95 transition shadow-sm text-center flex flex-col items-center justify-center group"
                  title={`${btn.label}: ${btn.runs} Total Team Extras (Non-legal ball)`}
                >
                  <span className="text-xs sm:text-sm font-display font-black text-white group-hover:text-amber-300 leading-tight">
                    {btn.label}
                  </span>
                  <span className="text-[9px] font-mono text-amber-300 font-bold leading-none">
                    {btn.sub}
                  </span>
                </button>
              ))}

              {/* 6 NO-BALL BUTTONS */}
              {[
                { label: 'NB', runs: 1, sub: '1R', tag: '0b' },
                { label: 'NB+1', runs: 2, sub: '2R', tag: '+1' },
                { label: 'NB+2', runs: 3, sub: '3R', tag: '+2' },
                { label: 'NB+3', runs: 4, sub: '4R', tag: '+3' },
                { label: 'NB+4', runs: 5, sub: '5R', tag: '4s', highlight: 'emerald' },
                { label: 'NB+6', runs: 7, sub: '7R', tag: '6s', highlight: 'purple' },
              ].map((btn) => (
                <button
                  key={btn.label}
                  onClick={() => handleNoBall(btn.runs)}
                  className={`flex-1 min-w-[54px] py-1 px-1 rounded-lg font-tech font-bold active:scale-95 transition shadow-sm text-center flex flex-col items-center justify-center group ${
                    btn.highlight === 'emerald'
                      ? 'bg-gradient-to-b from-emerald-950/70 to-slate-950 hover:from-emerald-800/80 text-emerald-200 border border-emerald-500/70'
                      : btn.highlight === 'purple'
                      ? 'bg-gradient-to-b from-purple-950/70 to-slate-950 hover:from-purple-800/80 text-purple-200 border border-purple-500/70'
                      : 'bg-gradient-to-b from-orange-950/50 to-orange-950/80 hover:from-orange-800/70 text-orange-200 border border-orange-600/60 hover:border-orange-400'
                  }`}
                  title={`${btn.label}: ${btn.runs} Total Runs (1 Extra Penalty + Batter Runs credited, 0 ball faced)`}
                >
                  <span
                    className={`text-xs sm:text-sm font-display font-black leading-tight ${
                      btn.highlight === 'emerald'
                        ? 'text-emerald-300 group-hover:text-white'
                        : btn.highlight === 'purple'
                        ? 'text-purple-300 group-hover:text-white'
                        : 'text-white group-hover:text-orange-300'
                    }`}
                  >
                    {btn.label}
                  </span>
                  <span
                    className={`text-[9px] font-mono font-bold leading-none ${
                      btn.highlight === 'emerald'
                        ? 'text-emerald-400'
                        : btn.highlight === 'purple'
                        ? 'text-purple-400'
                        : 'text-orange-300'
                    }`}
                  >
                    {btn.sub} ({btn.tag})
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ROW 2: BYES & LEG BYES IN 1 STRAIGHT LINE (8 BUTTONS) */}
        <div className="bg-slate-950/85 p-2 rounded-xl border border-slate-800">
          <div className="flex flex-wrap items-center justify-between gap-1 text-[11px] font-tech font-bold uppercase tracking-wider mb-1.5 px-0.5">
            <div className="flex items-center gap-2.5">
              <span className="text-sky-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                BYES (B: 1-4)
              </span>
              <span className="text-slate-600">•</span>
              <span className="text-cyan-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                LEG BYES (LB: 1-4)
              </span>
            </div>
            <span className="text-[10px] text-slate-400 font-mono">Legal Balls • 8 Buttons in 1 Straight Line</span>
          </div>

          {/* 1 STRAIGHT LINE: 4 BYES + 4 LEG BYES */}
          <div className="w-full overflow-x-auto scrollbar-thin pb-0.5">
            <div className="flex items-center gap-1 sm:gap-1.5 min-w-[500px] sm:min-w-0 sm:grid sm:grid-cols-8">
              {/* 4 BYES */}
              {[1, 2, 3, 4].map((b) => (
                <button
                  key={`b-${b}`}
                  onClick={() => handleExtra('bye', b)}
                  className="flex-1 min-w-[54px] py-1 px-1 rounded-lg bg-sky-950/60 hover:bg-sky-800 text-sky-200 border border-sky-600/50 font-tech font-bold text-xs text-center active:scale-95 transition shadow-sm flex flex-col items-center justify-center group"
                  title={`Byes: +${b} runs (Legal ball, not to bowler)`}
                >
                  <span className="text-xs sm:text-sm font-display font-black text-white group-hover:text-sky-300 leading-tight">
                    B+{b}
                  </span>
                  <span className="text-[9px] font-mono text-sky-400 leading-none">
                    {b} {b === 1 ? 'Run' : 'Runs'}
                  </span>
                </button>
              ))}

              {/* 4 LEG BYES */}
              {[1, 2, 3, 4].map((lb) => (
                <button
                  key={`lb-${lb}`}
                  onClick={() => handleExtra('legBye', lb)}
                  className="flex-1 min-w-[54px] py-1 px-1 rounded-lg bg-cyan-950/60 hover:bg-cyan-800 text-cyan-200 border border-cyan-600/50 font-tech font-bold text-xs text-center active:scale-95 transition shadow-sm flex flex-col items-center justify-center group"
                  title={`Leg Byes: +${lb} runs (Legal ball, not to bowler)`}
                >
                  <span className="text-xs sm:text-sm font-display font-black text-white group-hover:text-cyan-300 leading-tight">
                    LB+{lb}
                  </span>
                  <span className="text-[9px] font-mono text-cyan-400 leading-none">
                    {lb} {lb === 1 ? 'Run' : 'Runs'}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 3: STRIKER'S DISMISSALS (REDUCED SIZE, 1 STRAIGHT LINE) */}
      <div className="my-3 pt-2.5 border-t border-slate-800">
        <div className="flex items-center justify-between text-xs font-tech font-bold uppercase tracking-wider text-red-400 mb-1.5">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
            STRIKER'S DISMISSALS / RETIREMENTS
          </span>
          <span className="text-[11px] text-red-300 font-mono">
            {currentInning.wickets}/{match.settings.allOutWickets} Wickets Fallen • 1 Straight Line
          </span>
        </div>

        {/* 1 STRAIGHT LINE: 8 DISMISSAL BUTTONS */}
        <div className="w-full overflow-x-auto scrollbar-thin pb-0.5">
          <div className="flex items-center gap-1 sm:gap-1.5 min-w-[560px] sm:min-w-0 sm:grid sm:grid-cols-8">
            {[
              'Bowled',
              'Caught',
              'LBW',
              'Hit Wicket',
              'Stumped',
              'Run Out',
              'Retired Out',
              'Hurt Retired',
            ].map((dtype) => (
              <button
                key={dtype}
                onClick={() => {
                  setSelectedDismissalType(dtype as DismissalType);
                  setShowWicketModal(true);
                }}
                className="flex-1 min-w-[62px] py-1.5 px-1 rounded-lg bg-red-950/80 hover:bg-red-800 active:scale-95 text-red-200 border border-red-700/60 font-tech font-bold text-xs text-center transition shadow-sm whitespace-nowrap"
                title={dtype === 'Hurt Retired' ? 'Record retired hurt (not a wicket)' : `Record dismissal: ${dtype}`}
              >
                {dtype}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Inning / Match Action Bar */}
      <div className="mt-4 pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs font-tech">
        <div className="flex items-center gap-2">
          {match.currentInningIndex === 1 && (
            <button
              onClick={switchInning}
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold transition flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" /> END 1ST INNING / START CHASE
            </button>
          )}

          {match.status === 'tied' && !isSuperOver && (
            <button
              onClick={() => startSuperOver()}
              className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold transition animate-pulse flex items-center gap-2"
            >
              <Zap className="w-4 h-4" /> START SUPER OVER NOW
            </button>
          )}
        </div>

        <div className="text-slate-400 font-mono">
          Overs: <span className="text-white font-bold">{currentInning.oversFormatted}</span> /{' '}
          {match.settings.totalOvers} | Extras: {currentInning.extras.total} (Wd:{currentInning.extras.wides}, Nb:
          {currentInning.extras.noBalls}, B:{currentInning.extras.byes}, Lb:{currentInning.extras.legByes})
        </div>
      </div>

      {/* SECTION 4: ACTIVE BROADCAST GRAPHIC OVERLAY SELECTOR */}
      <div className="mt-5 pt-4 border-t-2 border-purple-500/40 bg-slate-950/70 p-4 rounded-xl space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs font-tech font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2">
            <Layers className="w-4 h-4 text-purple-400" /> SELECT ACTIVE GRAPHIC OVERLAY TO DISPLAY:
          </div>

          <button
            onClick={() => updateOverlayConfig({ visible: !overlayConfig.visible })}
            className={`px-3 py-1.5 rounded-lg font-tech font-bold text-xs uppercase flex items-center gap-1.5 transition ${
              overlayConfig.visible
                ? 'bg-emerald-600 text-white shadow'
                : 'bg-slate-800 text-slate-400 border border-slate-700'
            }`}
          >
            {overlayConfig.visible ? (
              <>
                <Eye className="w-3.5 h-3.5" /> ON AIR (BROADCASTING)
              </>
            ) : (
              <>
                <EyeOff className="w-3.5 h-3.5" /> OFF AIR (HIDDEN)
              </>
            )}
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-9 gap-2">
          {[
            {
              type: 'scoreboard' as OverlayType,
              label: 'LIVE SCOREBOARD',
              desc: 'Lower-third live score bar',
            },
            {
              type: 'most_runs' as OverlayType,
              label: 'TOP 5 RUNS',
              desc: 'Tournament Most Runs List',
            },
            {
              type: 'most_wickets' as OverlayType,
              label: 'TOP 5 WICKETS',
              desc: 'Tournament Most Wickets List',
            },
            {
              type: 'inning1_summary' as OverlayType,
              label: '1ST INN SUMMARY',
              desc: '4 Strikers & 4 Bowlers',
            },
            {
              type: 'inning2_summary' as OverlayType,
              label: '2ND INN SUMMARY',
              desc: '4 Strikers & 4 Bowlers',
            },
            {
              type: 'full_match' as OverlayType,
              label: 'FULL MATCH',
              desc: 'Both innings & winner',
            },
            {
              type: 'target_need' as OverlayType,
              label: 'TARGET CHASE',
              desc: 'Runs & balls remaining',
            },
            {
              type: 'partnership' as OverlayType,
              label: 'PARTNERSHIP',
              desc: 'Current wicket stand',
            },
            {
              type: 'toss_card' as OverlayType,
              label: 'TOSS CARD',
              desc: 'Toss winner & decision',
            },
          ].map((item) => {
            const isActive = overlayConfig.activeOverlay === item.type && overlayConfig.visible;
            return (
              <button
                key={item.type}
                onClick={() => updateOverlayConfig({ activeOverlay: item.type, visible: true })}
                className={`p-2.5 rounded-xl border text-left transition relative flex flex-col justify-between ${
                  isActive
                    ? 'bg-purple-900/90 border-purple-400 shadow-md ring-1 ring-purple-400'
                    : 'bg-slate-900/80 border-slate-800 hover:bg-slate-800 hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-tech font-black text-xs text-white leading-tight">
                      {item.label}
                    </span>
                    {isActive && (
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping flex-shrink-0" />
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400 line-clamp-2 leading-tight">
                    {item.desc}
                  </p>
                </div>
                <div className="mt-2 pt-1.5 border-t border-slate-800/80 flex items-center justify-between text-[9px] font-tech">
                  <span className="text-slate-400">BROADCAST</span>
                  <span className={isActive ? 'text-emerald-400 font-bold' : 'text-amber-400'}>
                    {isActive ? '● LIVE' : '▶ SEND'}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* MODAL: 4 RUNS (BOUNDARY OR RUNS) */}
      {showFourModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-emerald-500 rounded-2xl p-6 max-w-sm w-full shadow-2xl text-center">
            <h3 className="text-xl font-tech font-bold text-white uppercase mb-2">4 RUNS SCORED</h3>
            <p className="text-sm font-sans-ui text-slate-300 mb-6">
              Was this a boundary four to the fence, or four runs taken by running between the wickets?
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => {
                  handleNormalRun(4, true); // Boundary Four
                  setShowFourModal(false);
                }}
                className="py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-tech font-bold text-base shadow-lg transition"
              >
                BOUNDARY 4 🏏
              </button>
              <button
                onClick={() => {
                  handleNormalRun(4, false); // Running 4
                  setShowFourModal(false);
                }}
                className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-tech font-bold text-base transition"
              >
                RUNNING 4 (RUNS)
              </button>
            </div>
            <button
              onClick={() => setShowFourModal(false)}
              className="mt-4 text-xs font-tech text-slate-400 hover:text-white"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* MODAL: DISMISSAL CONFIGURATION */}
      {showWicketModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-red-500 rounded-2xl p-5 sm:p-6 max-w-lg w-full shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-500" />
                <h3 className="text-xl font-tech font-bold text-white uppercase">
                  RECORD DISMISSAL: {selectedDismissalType}
                </h3>
              </div>
              <button
                onClick={() => setShowWicketModal(false)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-sm font-tech">
              {/* Who got out? (Striker or Non-striker - especially relevant for Run Out) */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">
                  BATSMAN OUT:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setOutPlayerTarget('striker')}
                    className={`p-2.5 rounded-lg border font-bold text-xs flex items-center justify-center gap-2 ${
                      outPlayerTarget === 'striker'
                        ? 'bg-red-600 text-white border-red-500'
                        : 'bg-slate-800 text-slate-300 border-slate-700'
                    }`}
                  >
                    <span>STRIKER:</span> {striker?.name || 'Striker'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setOutPlayerTarget('nonStriker')}
                    className={`p-2.5 rounded-lg border font-bold text-xs flex items-center justify-center gap-2 ${
                      outPlayerTarget === 'nonStriker'
                        ? 'bg-red-600 text-white border-red-500'
                        : 'bg-slate-800 text-slate-300 border-slate-700'
                    }`}
                  >
                    <span>NON-STRIKER:</span> {nonStriker?.name || 'Non-Striker'}
                  </button>
                </div>
              </div>

              {/* Fielder Name (for Caught, Stumped, Run Out) */}
              {['Caught', 'Stumped', 'Run Out'].includes(selectedDismissalType) && (
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">
                    FIELDER / CATCHER NAME:
                  </label>
                  <input
                    type="text"
                    value={fielderName}
                    onChange={(e) => setFielderName(e.target.value)}
                    placeholder="Enter fielder name or select below"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-sans-ui text-sm focus:outline-none focus:border-red-500"
                  />
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {bowlingSquad.players.slice(0, 6).map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setFielderName(p.name)}
                        className="text-[11px] px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
                      >
                        {p.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Run Out Special Extras & Runs */}
              {selectedDismissalType === 'Run Out' && (
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-3">
                  <div className="text-xs font-bold text-amber-400 uppercase">
                    RUN OUT DETAILS (RUNS & DELIVERY TYPE):
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Delivery Type:</label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setRunOutExtraType('none')}
                        className={`py-1.5 rounded border text-xs font-bold ${
                          runOutExtraType === 'none'
                            ? 'bg-amber-600 text-white border-amber-500'
                            : 'bg-slate-800 text-slate-300 border-slate-700'
                        }`}
                      >
                        Normal Ball
                      </button>
                      <button
                        type="button"
                        onClick={() => setRunOutExtraType('wide')}
                        className={`py-1.5 rounded border text-xs font-bold ${
                          runOutExtraType === 'wide'
                            ? 'bg-amber-600 text-white border-amber-500'
                            : 'bg-slate-800 text-slate-300 border-slate-700'
                        }`}
                      >
                        + Wide
                      </button>
                      <button
                        type="button"
                        onClick={() => setRunOutExtraType('noBall')}
                        className={`py-1.5 rounded border text-xs font-bold ${
                          runOutExtraType === 'noBall'
                            ? 'bg-amber-600 text-white border-amber-500'
                            : 'bg-slate-800 text-slate-300 border-slate-700'
                        }`}
                      >
                        + No Ball
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">
                      Runs completed before run out:
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {[0, 1, 2, 3].map((r) => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => setRunOutRuns(r)}
                          className={`py-1 rounded border text-xs font-bold ${
                            runOutRuns === r
                              ? 'bg-red-600 text-white border-red-500'
                              : 'bg-slate-800 text-slate-300 border-slate-700'
                          }`}
                        >
                          +{r} Run{r !== 1 ? 's' : ''}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Incoming Batsman */}
              {availableBatters.length > 0 && (
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">
                    NEW INCOMING BATSMAN:
                  </label>
                  <select
                    value={incomingBatterId}
                    onChange={(e) => setIncomingBatterId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-tech text-sm focus:outline-none focus:border-red-500"
                  >
                    <option value="">-- Select Next Batsman --</option>
                    {availableBatters.map((p) => (
                      <option key={p.id} value={p.id}>
                        #{p.jerseyNumber} {p.name} ({p.role}) {p.isCaptain ? '(C)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowWicketModal(false)}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-tech font-bold text-xs"
              >
                CANCEL
              </button>
              <button
                type="button"
                onClick={handleConfirmWicket}
                className="px-6 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white font-tech font-bold text-xs shadow-lg uppercase transition"
              >
                CONFIRM WICKET 🔴
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
