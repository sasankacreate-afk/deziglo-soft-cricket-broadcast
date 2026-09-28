import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, Zap, Shield, Target, Flame, Activity } from 'lucide-react';
import { useCricket } from '../../context/CricketContext';
import { BatsmanInningStats, BowlerInningStats, TournamentStats } from '../../types';

export const BroadcastOverlays: React.FC<{ isPreviewMode?: boolean }> = ({ isPreviewMode = false }) => {
  const { match, overlayConfig, milestonePopup, tournamentStats, getTeamLogo } = useCricket();

  type OverEventPopupType = '4' | '6' | 'wicket' | 'hat-trick' | 'free-hit' | null;
  const [overEventPopup, setOverEventPopup] = useState<OverEventPopupType>(null);
  const [overEventMeta, setOverEventMeta] = useState<{ title?: string; subtitle?: string; badge?: string; icon?: string }>({});
  const lastDeliveryIdRef = useRef<string | null>(null);
  const boundaryTimerRef = useRef<any>(null);

  // Fallback reactive milestone state for TV broadcast overlay
  const [localMilestonePopup, setLocalMilestonePopup] = useState<{ type: 'six' | 'four' | 'dot'; totalCount: number; timestamp: number } | null>(null);
  const localMilestoneTimerRef = useRef<any>(null);
  const prevStatsRef = useRef<{ sixes: number; fours: number; dots: number }>({
    sixes: tournamentStats.totalSixes || 0,
    fours: tournamentStats.totalFours || 0,
    dots: tournamentStats.totalDots || 0,
  });

  const isSuperOver = !!match.superOver?.active;
  const currentInning = isSuperOver
    ? match.superOver!.currentInning === 1
      ? match.superOver!.inning1
      : match.superOver!.inning2
    : match.currentInningIndex === 1
    ? match.inning1
    : match.inning2;

  // Monitor tournamentStats changes to guarantee tournament milestone popups display on TV Broadcast Overlay
  useEffect(() => {
    const prev = prevStatsRef.current;
    const curSixes = tournamentStats.totalSixes || 0;
    const curFours = tournamentStats.totalFours || 0;
    const curDots = tournamentStats.totalDots || 0;

    if (prev.sixes > 0 || prev.fours > 0 || prev.dots > 0) {
      if (curSixes > prev.sixes) {
        if (localMilestoneTimerRef.current) clearTimeout(localMilestoneTimerRef.current);
        setLocalMilestonePopup({ type: 'six', totalCount: curSixes, timestamp: Date.now() });
        localMilestoneTimerRef.current = setTimeout(() => setLocalMilestonePopup(null), 5000);
      } else if (curFours > prev.fours) {
        if (localMilestoneTimerRef.current) clearTimeout(localMilestoneTimerRef.current);
        setLocalMilestonePopup({ type: 'four', totalCount: curFours, timestamp: Date.now() });
        localMilestoneTimerRef.current = setTimeout(() => setLocalMilestonePopup(null), 5000);
      } else if (curDots > prev.dots) {
        if (localMilestoneTimerRef.current) clearTimeout(localMilestoneTimerRef.current);
        setLocalMilestonePopup({ type: 'dot', totalCount: curDots, timestamp: Date.now() });
        localMilestoneTimerRef.current = setTimeout(() => setLocalMilestonePopup(null), 5000);
      }
    }

    prevStatsRef.current = { sixes: curSixes, fours: curFours, dots: curDots };
  }, [tournamentStats.totalSixes, tournamentStats.totalFours, tournamentStats.totalDots]);

  const activeMilestone = milestonePopup || localMilestonePopup;

  const striker = currentInning.batsmen[currentInning.strikerId];
  const nonStriker = currentInning.batsmen[currentInning.nonStrikerId];
  const bowler = currentInning.bowlers[currentInning.currentBowlerId];

  // Calculate Run Rates
  const crr =
    currentInning.legalBalls > 0
      ? ((currentInning.totalRuns / currentInning.legalBalls) * match.settings.ballsPerOver).toFixed(2)
      : '0.00';

  let rrr = '0.00';
  let runsNeeded = 0;
  let ballsRemaining = 0;

  if (match.currentInningIndex === 2 && match.targetRuns > 0) {
    runsNeeded = Math.max(0, match.targetRuns - currentInning.totalRuns);
    const maxBalls = match.settings.totalOvers * match.settings.ballsPerOver;
    ballsRemaining = Math.max(0, maxBalls - currentInning.legalBalls);
    rrr = ballsRemaining > 0 ? ((runsNeeded / ballsRemaining) * match.settings.ballsPerOver).toFixed(2) : '0.00';
  } else if (isSuperOver && match.superOver?.currentInning === 2 && match.superOver.targetRuns) {
    runsNeeded = Math.max(0, match.superOver.targetRuns - currentInning.totalRuns);
    ballsRemaining = Math.max(0, (match.superOver.ballsPerOver || 6) - currentInning.legalBalls);
    rrr = ballsRemaining > 0 ? ((runsNeeded / ballsRemaining) * (match.superOver.ballsPerOver || 6)).toFixed(2) : '0.00';
  }

  // In deziglo broadcast overlay scoreboard, ‘this over’ feature should display only the balls in one over.
  // After finishing one over it should reset and show the scores of next over.
  const ballsPerOver = match.settings.ballsPerOver || 6;
  const currentLegalBalls = currentInning.legalBalls || 0;
  const isOverJustFinished = currentLegalBalls > 0 && currentLegalBalls % ballsPerOver === 0;

  const lastDel = currentInning.deliveries[currentInning.deliveries.length - 1];
  const isRecentLastBall = lastDel && (Date.now() - lastDel.timestamp < 3000);

  let activeOverIndex = Math.floor(currentLegalBalls / ballsPerOver);
  if (isOverJustFinished && isRecentLastBall) {
    activeOverIndex = Math.floor(currentLegalBalls / ballsPerOver) - 1;
  }

  const thisOverDeliveries = currentInning.deliveries.filter((d) => d.overIndex === activeOverIndex);

  // Requirement: OBS overlay scoreboard, within 'this over' layout, when a 4 or 6 is hit,
  // or a wicket falls, or a 3-wicket Hat-Trick occurs, display popup animation for ~2 seconds.
  useEffect(() => {
    if (thisOverDeliveries.length === 0) return;
    const lastBall = thisOverDeliveries[thisOverDeliveries.length - 1];
    if (!lastBall) return;

    if (lastDeliveryIdRef.current && lastDeliveryIdRef.current !== lastBall.id) {
      const isBowlerWicket = (d: any) => {
        if (!d || !d.dismissal) return false;
        const nonBowlerTypes = ['Run Out', 'Retired Out', 'Hurt Retired'];
        return !nonBowlerTypes.includes(d.dismissal.type);
      };

      if (lastBall.dismissal && lastBall.dismissal.type !== 'Hurt Retired') {
        // Check for Hat-Trick: 3 back-to-back wickets without Runout, Retired Out, Hurt Retired
        let isHatTrick = false;

        // Check 1: Same bowler's last 3 deliveries
        const bowlerDeliveries = currentInning.deliveries.filter(
          (d) => d.bowlerId === lastBall.bowlerId && (d.isLegalBall || d.dismissal)
        );
        const last3Bowler = bowlerDeliveries.slice(-3);
        if (last3Bowler.length === 3 && last3Bowler.every(isBowlerWicket)) {
          isHatTrick = true;
        }

        // Check 2: Innings consecutive 3 deliveries
        const last3Inning = currentInning.deliveries.slice(-3);
        if (last3Inning.length === 3 && last3Inning.every(isBowlerWicket)) {
          isHatTrick = true;
        }

        if (isHatTrick) {
          setOverEventPopup('hat-trick');
          setOverEventMeta({
            title: 'HAT-TRICK!',
            subtitle: `${lastBall.bowlerName?.toUpperCase() || 'BOWLER'} TAKES 3 IN 3!`,
            badge: 'HAT-TRICK MILESTONE',
            icon: '',
          });
        } else {
          setOverEventPopup('wicket');
          setOverEventMeta({
            title: 'WICKET!',
            badge: 'OUT',
            icon: '',
          });
        }

        if (boundaryTimerRef.current) clearTimeout(boundaryTimerRef.current);
        boundaryTimerRef.current = setTimeout(() => {
          setOverEventPopup(null);
        }, 2000);
      } else if (lastBall.extraType === 'noBall') {
        // A no-ball gives the batting side a FREE HIT on the next delivery.
        // Show N4 / N6 when the batter scored a boundary from the no-ball.
        const noBallBatRuns = lastBall.runsScored || 0;
        const noBallLabel = noBallBatRuns === 4 ? 'N4' : noBallBatRuns === 6 ? 'N6' : 'NB';
        setOverEventPopup('free-hit');
        setOverEventMeta({
          title: 'FREE HIT!',
          badge: noBallLabel,
          icon: '',
        });
        if (boundaryTimerRef.current) clearTimeout(boundaryTimerRef.current);
        boundaryTimerRef.current = setTimeout(() => {
          setOverEventPopup(null);
        }, 2500);
      } else if (lastBall.isBoundarySix || lastBall.runsScored === 6) {
        setOverEventPopup('6');
        setOverEventMeta({
          title: 'SIX!',
          subtitle: '',
          badge: 'SIX',
          icon: '',
        });
        if (boundaryTimerRef.current) clearTimeout(boundaryTimerRef.current);
        boundaryTimerRef.current = setTimeout(() => {
          setOverEventPopup(null);
        }, 2000);
      } else if (lastBall.isBoundaryFour || lastBall.runsScored === 4) {
        setOverEventPopup('4');
        setOverEventMeta({
          title: 'FOUR!',
          subtitle: '',
          badge: 'FOUR',
          icon: '',
        });
        if (boundaryTimerRef.current) clearTimeout(boundaryTimerRef.current);
        boundaryTimerRef.current = setTimeout(() => {
          setOverEventPopup(null);
        }, 2000);
      }
    }
    lastDeliveryIdRef.current = lastBall.id;
  }, [thisOverDeliveries, currentInning.deliveries]);

  // Background color style based on Chroma Key
  const getChromaStyle = () => {
    if (isPreviewMode) return 'bg-transparent';
    switch (overlayConfig.chromaKey) {
      case 'green':
        return 'bg-[#00ff00]';
      case 'blue':
        return 'bg-[#0000ff]';
      case 'magenta':
        return 'bg-[#ff00ff]';
      default:
        return 'bg-transparent';
    }
  };

  return (
    <div
      id="deziglo-broadcast-stage"
      className={`w-full h-full relative overflow-hidden flex flex-col justify-between select-none ${getChromaStyle()}`}
      style={{ minHeight: isPreviewMode ? '340px' : '100vh' }}
    >
      {/* Integrated broadcast advertising / ticker from the secondary app, rendered inside the existing v6 overlay. */}
      {overlayConfig.customAdUrl && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 w-[min(92vw,900px)] pointer-events-none">
          <div className="rounded-xl overflow-hidden border border-white/20 bg-black/80 shadow-2xl backdrop-blur-sm">
            {overlayConfig.customAdTitle && (
              <div className="px-3 py-1.5 bg-slate-950/90 text-[11px] font-tech font-black uppercase tracking-wider text-amber-300">
                {overlayConfig.customAdTitle}
              </div>
            )}
            {overlayConfig.customAdMediaType === 'youtube' ? (
              <iframe
                title="Broadcast Advertisement"
                src={overlayConfig.customAdUrl}
                className="w-full aspect-video border-0"
                allow="autoplay; encrypted-media; picture-in-picture"
              />
            ) : overlayConfig.customAdMediaType === 'video' ? (
              <video src={overlayConfig.customAdUrl} autoPlay muted={overlayConfig.customAdVideoMuted !== false} loop={overlayConfig.customAdVideoLoop !== false} playsInline className="w-full max-h-52 object-contain" />
            ) : (
              <img src={overlayConfig.customAdUrl} alt="Broadcast advertisement" className="w-full max-h-52 object-contain" />
            )}
          </div>
        </div>
      )}

      {overlayConfig.showTicker && overlayConfig.tickerText && (
        <div className="absolute bottom-2 left-0 right-0 z-40 overflow-hidden pointer-events-none">
          <div className="inline-block min-w-full whitespace-nowrap bg-slate-950/90 border-y border-amber-400/50 py-1.5 px-4 text-xs font-tech font-bold uppercase tracking-wider text-white">
            {overlayConfig.tickerText}
          </div>
        </div>
      )}

      {['welcome','team1_lineup','team2_lineup','match_summary','match_winner','last_over'].includes(overlayConfig.activeOverlay) && (
        <div className="absolute inset-0 flex items-center justify-center p-6">
          <div className="w-full max-w-4xl rounded-2xl border-2 border-amber-400/60 bg-slate-950/95 shadow-2xl p-8 text-center">
            <div className="text-xs font-tech font-black tracking-[0.3em] text-amber-300 uppercase mb-3">DEZIGLO SOFT • LIVE BROADCAST</div>
            <h2 className="text-4xl sm:text-6xl font-display font-black text-white uppercase tracking-tight">
              {overlayConfig.activeOverlay === 'welcome' && (overlayConfig.customBannerText || 'WELCOME')}
              {overlayConfig.activeOverlay === 'team1_lineup' && `${match.teamA.teamName} • TEAM LINEUP`}
              {overlayConfig.activeOverlay === 'team2_lineup' && `${match.teamB.teamName} • TEAM LINEUP`}
              {overlayConfig.activeOverlay === 'match_summary' && 'MATCH SUMMARY'}
              {overlayConfig.activeOverlay === 'match_winner' && (match.winnerTeamId ? `${match.winnerTeamId === match.teamA.id ? match.teamA.teamName : match.teamB.teamName} WIN` : 'MATCH WINNER')}
              {overlayConfig.activeOverlay === 'last_over' && 'LAST OVER'}
            </h2>
            <div className="mt-5 text-lg text-slate-300 font-tech">
              {overlayConfig.activeOverlay === 'team1_lineup' && match.teamA.players.map(p => p.name).join(' • ')}
              {overlayConfig.activeOverlay === 'team2_lineup' && match.teamB.players.map(p => p.name).join(' • ')}
              {overlayConfig.activeOverlay === 'match_summary' && `${match.settings.matchTitle} • ${match.settings.venue}`}
              {overlayConfig.activeOverlay === 'match_winner' && (match.winDescription || 'Congratulations')}
              {overlayConfig.activeOverlay === 'last_over' && (currentInning.deliveries.slice(-6).map(d => d.runsScored).join(' • ') || 'No deliveries yet')}
            </div>
          </div>
        </div>
      )}

      {/* OVERLAY 1: SCOREBOARD (Lower Third Strip) */}
      {overlayConfig.activeOverlay === 'scoreboard' && (
        <div className="mt-auto p-4 sm:p-6 w-full max-w-7xl mx-auto">
          {overlayConfig.customBannerText && (
            <div className="mb-2 mx-auto w-fit max-w-full rounded-lg border border-amber-400/60 bg-slate-950/95 px-5 py-2 text-center text-sm sm:text-base font-tech font-black uppercase tracking-wider text-amber-300 shadow-2xl">
              {overlayConfig.customBannerText}
            </div>
          )}
          {/* 5-SECOND TOURNAMENT STATS POPUP BOX (Top Right of Scoreboard as requested - No motion effects, just popup view 5s and close) */}
          {activeMilestone && (
            <div
              key={activeMilestone.timestamp}
              className="mb-2.5 ml-auto w-max flex items-center gap-3 bg-gradient-to-r from-slate-900 via-slate-900 to-amber-950/90 border-2 border-amber-400 text-white px-4 py-2 rounded-lg shadow-2xl backdrop-blur-md"
            >
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-amber-500 text-slate-950 font-display font-black text-xl">
                {activeMilestone.type === 'six' ? '6' : activeMilestone.type === 'four' ? '4' : '0'}
              </div>
              <div>
                <div className="text-[10px] font-tech uppercase tracking-wider text-amber-300 font-bold">
                  TOURNAMENT MILESTONE
                </div>
                <div className="text-sm font-tech font-bold uppercase tracking-tight text-white flex items-center gap-2">
                  {activeMilestone.type === 'six' && (
                    <span>
                      TOURNAMENT SIXES:{' '}
                      <strong className="text-amber-400 text-base">{activeMilestone.totalCount}</strong>
                    </span>
                  )}
                  {activeMilestone.type === 'four' && (
                    <span>
                      TOURNAMENT FOURS:{' '}
                      <strong className="text-emerald-400 text-base">{activeMilestone.totalCount}</strong>
                    </span>
                  )}
                  {activeMilestone.type === 'dot' && (
                    <span>
                      TOURNAMENT DOTS:{' '}
                      <strong className="text-sky-400 text-base">{activeMilestone.totalCount}</strong>
                    </span>
                  )}
                </div>
              </div>
              <div className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono">
                LIVE
              </div>
            </div>
          )}

          {/* MAIN LOWER-THIRD STRIP */}
          <div className="bg-slate-950/95 text-white border border-slate-800 rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.9)] backdrop-blur-xl overflow-hidden">
            {/* Top Bar: Match Title, Tournament, Sponsor, Live indicator */}
            <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 px-4 py-1.5 border-b border-slate-800 flex items-center justify-between text-xs font-tech">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1.5 font-bold tracking-wider text-amber-400 uppercase">
                  <Trophy className="w-3.5 h-3.5 text-amber-400" />
                  {match.settings.tournamentName || 'DEZIGLO SOFT CRICKET'}
                </span>
                <span className="text-slate-500">|</span>
                <span className="text-slate-300 font-medium">{match.settings.matchTitle}</span>
                {isSuperOver && (
                  <span className="bg-gradient-to-r from-red-600 to-amber-600 text-white font-black px-2 py-0.5 rounded text-[11px] animate-pulse flex items-center gap-1">
                    <Zap className="w-3 h-3" /> SUPER OVER
                  </span>
                )}
              </div>

              <div className="flex items-center gap-4">
                {match.currentInningIndex === 2 && match.targetRuns > 0 && !isSuperOver && (
                  <div className="text-amber-300 font-bold tracking-wide">
                    TARGET: {match.targetRuns} ({runsNeeded} from {ballsRemaining}b, RRR {rrr})
                  </div>
                )}
                {isSuperOver && match.superOver?.targetRuns && (
                  <div className="text-amber-300 font-bold tracking-wide">
                    SUPER TARGET: {match.superOver.targetRuns} ({runsNeeded} from {ballsRemaining}b)
                  </div>
                )}
                <div className="text-slate-400 font-mono text-[11px] flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                  <span>DEZIGLO BROADCAST</span>
                </div>
              </div>
            </div>

            {/* Bottom Section: 3-column split: Team Score | Batsmen & Bowler | Recent Balls */}
            <div className="grid grid-cols-12 divide-y md:divide-y-0 md:divide-x divide-slate-800 items-center">
              {/* Column 1: Batting Team & Score */}
              <div className="col-span-12 sm:col-span-4 lg:col-span-3 p-3 sm:p-4 bg-gradient-to-br from-slate-900 to-slate-950 flex items-center gap-3">
                {(() => {
                  const battingLogo = getTeamLogo(currentInning.battingTeamId, currentInning.battingTeamCode);
                  return (
                    <div className="w-12 h-12 rounded-lg bg-slate-900 text-slate-950 font-display font-bold text-2xl flex items-center justify-center shadow-lg border border-amber-300 overflow-hidden flex-shrink-0">
                      {battingLogo ? (
                        <img
                          src={battingLogo}
                          alt={currentInning.battingTeamName}
                          className="w-full h-full object-contain p-1"
                        />
                      ) : (
                        <div className="w-full h-full bg-amber-500 text-slate-950 flex items-center justify-center font-bold">
                          {currentInning.battingTeamCode}
                        </div>
                      )}
                    </div>
                  );
                })()}
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-tech text-sm font-bold tracking-wider text-slate-300 uppercase">
                      {currentInning.battingTeamName}
                    </span>
                    {isSuperOver && (
                      <span className="text-[10px] text-red-400 font-bold uppercase">(SO)</span>
                    )}
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="font-display font-bold text-4xl sm:text-5xl text-white tracking-tight leading-none">
                      {currentInning.totalRuns}/{currentInning.wickets}
                    </span>
                    <span className="font-tech text-base text-amber-400 font-bold">
                      ({currentInning.oversFormatted}
                      {isSuperOver ? `/${match.superOver?.ballsPerOver || 6}b` : `/${match.settings.totalOvers} ov`})
                    </span>
                  </div>
                  <div className="text-[11px] font-tech text-slate-400 mt-0.5">
                    CRR: <span className="text-slate-200 font-bold">{crr}</span>
                    {match.currentInningIndex === 2 && match.targetRuns > 0 && (
                      <span className="ml-2">
                        RRR: <span className="text-amber-400 font-bold">{rrr}</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Column 2: Live Batters & Bowler */}
              <div className="col-span-12 sm:col-span-8 lg:col-span-6 p-3 sm:px-4 sm:py-2.5 flex flex-col justify-center space-y-2">
                {/* Batters */}
                <div className="grid grid-cols-2 gap-2 text-xs font-tech">
                  {/* Striker */}
                  <div className="bg-slate-900/80 px-2.5 py-1.5 rounded border border-amber-500/40 flex items-center justify-between">
                    <div className="truncate">
                      <span className="text-amber-400 font-bold mr-1">▶</span>
                      <span className="font-bold text-slate-100">{striker?.name || 'Striker'}*</span>
                    </div>
                    <div className="font-mono font-bold text-amber-300 ml-2 whitespace-nowrap">
                      {striker?.runs || 0}{' '}
                      <span className="text-slate-400 font-normal text-[10px]">
                        ({striker?.balls || 0}) 4s:{striker?.fours || 0} 6s:{striker?.sixes || 0}
                      </span>
                    </div>
                  </div>

                  {/* Non-Striker */}
                  <div className="bg-slate-900/60 px-2.5 py-1.5 rounded border border-slate-800 flex items-center justify-between">
                    <div className="truncate">
                      <span className="text-slate-300 font-medium">{nonStriker?.name || 'Non-Striker'}</span>
                    </div>
                    <div className="font-mono text-slate-300 ml-2 whitespace-nowrap">
                      {nonStriker?.runs || 0}{' '}
                      <span className="text-slate-400 font-normal text-[10px]">
                        ({nonStriker?.balls || 0}) 4s:{nonStriker?.fours || 0}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Bowler */}
                <div className="flex items-center justify-between text-xs font-tech bg-slate-900/50 px-2.5 py-1 rounded border border-slate-800/80">
                  <div className="flex items-center gap-1.5 truncate">
                    <Activity className="w-3.5 h-3.5 text-sky-400" />
                    <span className="text-slate-400">BOWLING:</span>
                    <span className="font-bold text-slate-200">{bowler?.name || 'Bowler'}</span>
                  </div>
                  <div className="font-mono text-xs text-sky-300 whitespace-nowrap">
                    {bowler?.overs || 0}-{bowler?.maidens || 0}-{bowler?.runsConceded || 0}-
                    <strong className="text-white text-sm">{bowler?.wickets || 0}</strong>
                    <span className="text-slate-400 text-[10px] ml-1.5 font-sans">
                      (Econ {bowler?.economy || '0.00'})
                    </span>
                  </div>
                </div>
              </div>

              {/* Column 3: Recent Over Strip & Partnership with 4/6 hit popup */}
              <div className="col-span-12 lg:col-span-3 p-3 sm:px-4 flex flex-col justify-center bg-slate-900/70 relative overflow-hidden">
                <AnimatePresence>
                  {overEventPopup && (
                    <motion.div
                      key={overEventPopup}
                      initial={{ scale: 0.2, opacity: 0, y: 12 }}
                      animate={{ scale: 1, opacity: 1, y: 0 }}
                      exit={{ scale: 0.4, opacity: 0, y: -8 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                      className={`absolute inset-0 z-30 flex items-center justify-center gap-2 backdrop-blur-md px-2.5 py-1 text-center select-none shadow-2xl ${
                        overEventPopup === 'hat-trick'
                          ? 'bg-gradient-to-r from-amber-950 via-yellow-900 to-amber-950 border-2 border-yellow-400 text-yellow-200'
                          : overEventPopup === 'wicket'
                          ? 'bg-gradient-to-r from-rose-950 via-red-900 to-rose-950 border-2 border-red-400 text-white'
                          : overEventPopup === '6'
                          ? 'bg-gradient-to-r from-purple-950 via-purple-900 to-indigo-950 border-2 border-purple-400 text-yellow-300'
                          : overEventPopup === 'free-hit'
                          ? 'bg-gradient-to-r from-orange-950 via-red-900 to-orange-950 border-2 border-orange-400 text-orange-100'
                          : 'bg-gradient-to-r from-emerald-950 via-emerald-900 to-teal-950 border-2 border-emerald-400 text-white'
                      }`}
                    >
                      <span className="text-xl animate-bounce">
                        {overEventMeta.icon || (overEventPopup === 'free-hit' ? '' : overEventPopup === '6' ? '' : overEventPopup === '4' ? '' : '')}
                      </span>
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center justify-center gap-1.5">
                          <span className="font-display font-black text-xl sm:text-2xl tracking-wider uppercase leading-none drop-shadow-md">
                            {overEventMeta.title || (overEventPopup === '6' ? 'SIX!' : 'FOUR!')}
                          </span>
                          {overEventMeta.badge && (
                            <span className="text-[9px] font-tech font-bold px-1.5 py-0.5 rounded bg-black/40 uppercase tracking-wider border border-white/20">
                              {overEventMeta.badge}
                            </span>
                          )}
                        </div>
                        <span className="font-tech text-[10px] font-bold text-slate-200 uppercase tracking-widest mt-0.5 truncate max-w-[200px] sm:max-w-xs">
                          {overEventMeta.subtitle || (overEventPopup === '6' ? '' : '')}
                        </span>
                      </div>
                      <span className="text-xl animate-bounce">
                        {overEventMeta.icon || (overEventPopup === 'free-hit' ? '' : overEventPopup === '6' ? '' : overEventPopup === '4' ? '' : '')}
                      </span>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="flex items-center justify-between text-[11px] font-tech text-slate-400 mb-1.5">
                  <span className="font-bold text-slate-300">
                    THIS OVER ({thisOverDeliveries.filter((b) => b.isLegalBall).length}/{ballsPerOver}):
                  </span>
                  <span>
                    P'SHIP:{' '}
                    <strong className="text-amber-400">
                      {currentInning.currentPartnership.runs}
                    </strong>{' '}
                    ({currentInning.currentPartnership.balls}b)
                  </span>
                </div>
                <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
                  {thisOverDeliveries.length === 0 ? (
                    <span className="text-xs text-slate-500 italic">0 balls (Ready for over)</span>
                  ) : (
                    thisOverDeliveries.map((b) => {
                      let badgeClass = 'bg-slate-800 text-slate-200 border-slate-700';
                      let label = `${b.runsScored}`;

if (b.dismissal) {
  badgeClass = 'bg-red-600 text-white border-red-400 font-bold';
  label = 'W';
} else if (b.extraType === 'noBall' && (b.isBoundarySix || b.runsScored === 6)) {
  // No-ball + 6 batter runs = N6
  badgeClass = 'bg-purple-600 text-white border-purple-400 font-bold';
  label = 'N6';
} else if (b.extraType === 'noBall' && (b.isBoundaryFour || b.runsScored === 4)) {
  // No-ball + 4 batter runs = N4
  badgeClass = 'bg-emerald-600 text-white border-emerald-400 font-bold';
  label = 'N4';
} else if (b.extraType === 'noBall') {
  // Normal no-ball / no-ball with 1–3 batter runs
  badgeClass = 'bg-orange-600 text-white border-orange-400 font-bold';
  label = b.extraRuns > 1 ? `NB+${b.extraRuns - 1}` : 'NB';
} else if (b.isBoundarySix) {
  badgeClass = 'bg-purple-600 text-white border-purple-400 font-bold';
  label = '6';
} else if (b.isBoundaryFour) {
  badgeClass = 'bg-emerald-600 text-white border-emerald-400 font-bold';
  label = '4';
} else if (b.extraType === 'wide') {
  badgeClass = 'bg-amber-600 text-white border-amber-400 font-bold';
  label = b.extraRuns > 1 ? `WD+${b.extraRuns - 1}` : 'WD';
                      } else if (b.extraType === 'bye') {
                        badgeClass = 'bg-sky-700 text-white border-sky-500';
                        label = `B${b.extraRuns}`;
                      } else if (b.extraType === 'legBye') {
                        badgeClass = 'bg-cyan-700 text-white border-cyan-500';
                        label = `Lb${b.extraRuns}`;
                      } else if (b.runsScored === 0) {
                        badgeClass = 'bg-slate-800 text-slate-400 border-slate-700';
                        label = '•';
                      }

                      return (
                        <div
                          key={b.id}
                          className={`w-7 h-7 rounded-full flex items-center justify-center font-tech text-xs border shadow-sm ${badgeClass}`}
                        >
                          {label}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* OVERLAY 2: 1ST INNING SUMMARY CARD (4 Best Strikers & 4 Best Bowlers against) */}
      {overlayConfig.activeOverlay === 'inning1_summary' && (
        <InningSummaryCard
          inningNumber={1}
          battingTeamName={match.inning1.battingTeamName}
          battingTeamCode={match.inning1.battingTeamCode}
          battingLogo={getTeamLogo(match.inning1.battingTeamId, match.inning1.battingTeamCode)}
          bowlingTeamName={match.inning1.bowlingTeamName}
          bowlingLogo={getTeamLogo(match.inning1.bowlingTeamId, match.inning1.bowlingTeamCode)}
          totalRuns={match.inning1.totalRuns}
          wickets={match.inning1.wickets}
          oversFormatted={match.inning1.oversFormatted}
          batsmen={Object.values(match.inning1.batsmen)}
          bowlers={Object.values(match.inning1.bowlers)}
          tournamentName={match.settings.tournamentName}
        />
      )}

      {/* OVERLAY 3: 2ND INNING SUMMARY CARD (4 Best Strikers & 4 Best Bowlers against) */}
      {overlayConfig.activeOverlay === 'inning2_summary' && (
        <InningSummaryCard
          inningNumber={2}
          battingTeamName={match.inning2.battingTeamName}
          battingTeamCode={match.inning2.battingTeamCode}
          battingLogo={getTeamLogo(match.inning2.battingTeamId, match.inning2.battingTeamCode)}
          bowlingTeamName={match.inning2.bowlingTeamName}
          bowlingLogo={getTeamLogo(match.inning2.bowlingTeamId, match.inning2.bowlingTeamCode)}
          totalRuns={match.inning2.totalRuns}
          wickets={match.inning2.wickets}
          oversFormatted={match.inning2.oversFormatted}
          batsmen={Object.values(match.inning2.batsmen)}
          bowlers={Object.values(match.inning2.bowlers)}
          tournamentName={match.settings.tournamentName}
        />
      )}

      {/* OVERLAY 4: FULL MATCH CARD (2 Best Strikers & 2 Best Bowlers per inning) */}
      {overlayConfig.activeOverlay === 'full_match' && (
        <FullMatchSummaryOverlay
          match={match}
          team1Logo={getTeamLogo(match.inning1.battingTeamId, match.inning1.battingTeamCode)}
          team2Logo={getTeamLogo(match.inning2.battingTeamId, match.inning2.battingTeamCode)}
        />
      )}

      {/* OVERLAY 5: PARTNERSHIP CARD */}
      {overlayConfig.activeOverlay === 'partnership' && (
        <PartnershipOverlay
          match={match}
          currentInning={currentInning}
          striker={striker}
          nonStriker={nonStriker}
          battingLogo={getTeamLogo(currentInning.battingTeamId, currentInning.battingTeamCode)}
        />
      )}

      {/* OVERLAY 6: TARGET NEED CARD */}
      {overlayConfig.activeOverlay === 'target_need' && (
        <TargetNeedOverlay
          match={match}
          currentInning={currentInning}
          runsNeeded={runsNeeded}
          ballsRemaining={ballsRemaining}
          rrr={rrr}
          crr={crr}
          battingLogo={getTeamLogo(currentInning.battingTeamId, currentInning.battingTeamCode)}
        />
      )}

      {/* OVERLAY 7: TOSS CARD */}
      {overlayConfig.activeOverlay === 'toss_card' && (
        <TossCardOverlay
          match={match}
          teamALogo={getTeamLogo(match.teamA.id, match.teamA.shortCode)}
          teamBLogo={getTeamLogo(match.teamB.id, match.teamB.shortCode)}
        />
      )}

      {/* OVERLAY 8: MOST RUNS LEADERBOARD (TOP 5 BATSMEN) */}
      {overlayConfig.activeOverlay === 'most_runs' && (
        <MostRunsLeaderboardOverlay
          tournamentStats={tournamentStats}
          tournamentName={match.settings.tournamentName}
          getTeamLogo={getTeamLogo}
        />
      )}

      {/* OVERLAY 9: MOST WICKETS LEADERBOARD (TOP 5 BOWLERS) */}
      {overlayConfig.activeOverlay === 'most_wickets' && (
        <MostWicketsLeaderboardOverlay
          tournamentStats={tournamentStats}
          tournamentName={match.settings.tournamentName}
          getTeamLogo={getTeamLogo}
        />
      )}
    </div>
  );
};

// --- SUB-COMPONENTS FOR OVERLAYS ---

// Inning Summary Card: 4 Best Strikers and 4 Best Bowlers
const InningSummaryCard: React.FC<{
  inningNumber: 1 | 2;
  battingTeamName: string;
  battingTeamCode: string;
  battingLogo?: string;
  bowlingTeamName: string;
  bowlingLogo?: string;
  totalRuns: number;
  wickets: number;
  oversFormatted: string;
  batsmen: BatsmanInningStats[];
  bowlers: BowlerInningStats[];
  tournamentName: string;
}> = ({
  inningNumber,
  battingTeamName,
  battingTeamCode,
  battingLogo,
  bowlingTeamName,
  bowlingLogo,
  totalRuns,
  wickets,
  oversFormatted,
  batsmen,
  bowlers,
  tournamentName,
}) => {
  // Sort best 4 strikers by runs desc, then strikeRate desc
  const bestStrikers = [...batsmen]
    .filter((b) => b.balls > 0 || b.runs > 0 || b.isOut)
    .sort((a, b) => b.runs - a.runs || b.strikeRate - a.strikeRate)
    .slice(0, 4);

  // Sort best 4 bowlers by wickets desc, then economy asc
  const bestBowlers = [...bowlers]
    .filter((bw) => bw.legalBalls > 0 || bw.runsConceded > 0)
    .sort((a, b) => b.wickets - a.wickets || a.economy - b.economy)
    .slice(0, 4);

  return (
    <div className="m-auto p-4 max-w-4xl w-full">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-slate-950/95 border-2 border-slate-700 text-white rounded-2xl shadow-2xl overflow-hidden backdrop-blur-2xl"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-600 via-amber-500 to-amber-700 px-6 py-4 flex items-center justify-between text-slate-950">
          <div>
            <div className="text-xs font-tech font-bold uppercase tracking-widest text-slate-900">
              {tournamentName} • TV BROADCAST
            </div>
            <h2 className="text-2xl font-tech font-bold uppercase tracking-tight">
              {inningNumber === 1 ? '1ST INNINGS SUMMARY' : '2ND INNINGS SUMMARY'}
            </h2>
          </div>
          <div className="flex items-center gap-3 text-right">
            {battingLogo ? (
              <div className="w-12 h-12 rounded-xl bg-slate-950/30 p-1 border border-slate-900/40 flex items-center justify-center">
                <img src={battingLogo} alt={battingTeamName} className="w-full h-full object-contain" />
              </div>
            ) : null}
            <div>
              <div className="text-sm font-tech font-bold uppercase">{battingTeamName}</div>
              <div className="text-3xl font-display font-black leading-none">
                {totalRuns}/{wickets} <span className="text-lg">({oversFormatted} ov)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Content: 4 Best Strikers & 4 Best Bowlers */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Top 4 Strikers */}
          <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800">
            <div className="flex items-center gap-2 text-amber-400 font-tech font-bold text-sm uppercase mb-3 pb-2 border-b border-slate-800">
              {battingLogo && (
                <img src={battingLogo} alt={battingTeamCode} className="w-4 h-4 object-contain rounded bg-white/10 p-0.5" />
              )}
              <Zap className="w-4 h-4" /> 4 BEST STRIKERS ({battingTeamCode})
            </div>
            <div className="space-y-2.5">
              {bestStrikers.length === 0 ? (
                <div className="text-slate-500 text-xs italic py-4">No batting data yet</div>
              ) : (
                bestStrikers.map((b, idx) => (
                  <div
                    key={b.playerId || idx}
                    className="flex items-center justify-between bg-slate-950/60 p-2.5 rounded border border-slate-800/80"
                  >
                    <div>
                      <div className="font-tech font-bold text-sm text-slate-100 flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded bg-amber-500/20 text-amber-400 text-xs flex items-center justify-center font-mono">
                          {idx + 1}
                        </span>
                        <span>{b.name}</span>
                        {!b.isOut && <span className="text-amber-400 font-bold">*</span>}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5 truncate max-w-[200px]">
                        {b.dismissalText || (b.isOut ? 'out' : 'not out')}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-display font-bold text-xl text-white">
                        {b.runs}{' '}
                        <span className="text-xs font-tech text-slate-400">({b.balls}b)</span>
                      </div>
                      <div className="text-[10px] font-mono text-amber-400">
                        4s: {b.fours} | 6s: {b.sixes} | SR: {b.strikeRate}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Top 4 Bowlers */}
          <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800">
            <div className="flex items-center gap-2 text-sky-400 font-tech font-bold text-sm uppercase mb-3 pb-2 border-b border-slate-800">
              {bowlingLogo && (
                <img src={bowlingLogo} alt={bowlingTeamName} className="w-4 h-4 object-contain rounded bg-white/10 p-0.5" />
              )}
              <Shield className="w-4 h-4" /> 4 BEST BOWLERS ({bowlingTeamName})
            </div>
            <div className="space-y-2.5">
              {bestBowlers.length === 0 ? (
                <div className="text-slate-500 text-xs italic py-4">No bowling data yet</div>
              ) : (
                bestBowlers.map((bw, idx) => (
                  <div
                    key={bw.playerId || idx}
                    className="flex items-center justify-between bg-slate-950/60 p-2.5 rounded border border-slate-800/80"
                  >
                    <div>
                      <div className="font-tech font-bold text-sm text-slate-100 flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded bg-sky-500/20 text-sky-400 text-xs flex items-center justify-center font-mono">
                          {idx + 1}
                        </span>
                        <span>{bw.name}</span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {bw.overs} Overs • Dots: {bw.dots}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-display font-bold text-xl text-sky-300">
                        {bw.wickets}/{bw.runsConceded}
                      </div>
                      <div className="text-[10px] font-mono text-slate-400">
                        Econ: {bw.economy}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-900 px-6 py-2 border-t border-slate-800 text-center text-xs font-tech text-slate-400">
          DEZIGLO SOFT LIVE BROADCAST GRAPHICS SUITE
        </div>
      </motion.div>
    </div>
  );
};

// Full Match Summary Overlay: 2 best strikers and 2 best bowlers per inning
const FullMatchSummaryOverlay: React.FC<{
  match: any;
  team1Logo?: string;
  team2Logo?: string;
}> = ({ match, team1Logo, team2Logo }) => {
  const get2BestStrikers = (inning: any) =>
    Object.values(inning.batsmen || {})
      .filter((b: any) => b.balls > 0 || b.runs > 0 || b.isOut)
      .sort((a: any, b: any) => b.runs - a.runs || b.strikeRate - a.strikeRate)
      .slice(0, 2);

  const get2BestBowlers = (inning: any) =>
    Object.values(inning.bowlers || {})
      .filter((bw: any) => bw.legalBalls > 0 || bw.runsConceded > 0)
      .sort((a: any, b: any) => b.wickets - a.wickets || a.economy - b.economy)
      .slice(0, 2);

  const inn1Strikers = get2BestStrikers(match.inning1);
  const inn1Bowlers = get2BestBowlers(match.inning1);
  const inn2Strikers = get2BestStrikers(match.inning2);
  const inn2Bowlers = get2BestBowlers(match.inning2);

  return (
    <div className="m-auto p-4 max-w-5xl w-full">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-slate-950/95 border-2 border-slate-700 text-white rounded-2xl shadow-2xl overflow-hidden backdrop-blur-2xl"
      >
        <div className="bg-gradient-to-r from-blue-700 via-slate-900 to-amber-700 px-6 py-4 flex items-center justify-between">
          <div>
            <div className="text-xs font-tech font-bold uppercase text-amber-400">
              {match.settings.tournamentName} • MATCH SUMMARY
            </div>
            <h2 className="text-2xl font-tech font-bold uppercase">{match.settings.matchTitle}</h2>
          </div>
          {match.winDescription && (
            <div className="bg-amber-500 text-slate-950 px-4 py-1.5 rounded-lg font-tech font-bold uppercase text-sm shadow-md">
              {match.winDescription}
            </div>
          )}
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* INNING 1 */}
          <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                {team1Logo && (
                  <img src={team1Logo} alt={match.inning1.battingTeamName} className="w-6 h-6 object-contain rounded bg-white/10 p-0.5" />
                )}
                <span className="font-tech font-bold text-amber-400 text-base">
                  1ST INNING: {match.inning1.battingTeamName}
                </span>
              </div>
              <span className="font-display font-bold text-2xl text-white">
                {match.inning1.totalRuns}/{match.inning1.wickets}{' '}
                <span className="text-sm font-tech text-slate-400">({match.inning1.oversFormatted} ov)</span>
              </span>
            </div>

            <div className="space-y-2 text-xs font-tech">
              <div className="text-[11px] font-bold text-slate-400 uppercase">Top 2 Batters:</div>
              {inn1Strikers.map((b: any) => (
                <div key={b.name} className="flex justify-between bg-slate-950/50 p-2 rounded">
                  <span className="font-bold text-slate-200">{b.name}</span>
                  <span className="font-mono text-amber-400 font-bold">
                    {b.runs} ({b.balls}b) - 4s:{b.fours} 6s:{b.sixes}
                  </span>
                </div>
              ))}

              <div className="text-[11px] font-bold text-slate-400 uppercase mt-3">Top 2 Bowlers:</div>
              {inn1Bowlers.map((bw: any) => (
                <div key={bw.name} className="flex justify-between bg-slate-950/50 p-2 rounded">
                  <span className="font-bold text-slate-200">{bw.name}</span>
                  <span className="font-mono text-sky-400 font-bold">
                    {bw.wickets}/{bw.runsConceded} ({bw.overs} ov)
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* INNING 2 */}
          <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                {team2Logo && (
                  <img src={team2Logo} alt={match.inning2.battingTeamName} className="w-6 h-6 object-contain rounded bg-white/10 p-0.5" />
                )}
                <span className="font-tech font-bold text-emerald-400 text-base">
                  2ND INNING: {match.inning2.battingTeamName}
                </span>
              </div>
              <span className="font-display font-bold text-2xl text-white">
                {match.inning2.totalRuns}/{match.inning2.wickets}{' '}
                <span className="text-sm font-tech text-slate-400">({match.inning2.oversFormatted} ov)</span>
              </span>
            </div>

            <div className="space-y-2 text-xs font-tech">
              <div className="text-[11px] font-bold text-slate-400 uppercase">Top 2 Batters:</div>
              {inn2Strikers.map((b: any) => (
                <div key={b.name} className="flex justify-between bg-slate-950/50 p-2 rounded">
                  <span className="font-bold text-slate-200">{b.name}</span>
                  <span className="font-mono text-emerald-400 font-bold">
                    {b.runs} ({b.balls}b) - 4s:{b.fours} 6s:{b.sixes}
                  </span>
                </div>
              ))}

              <div className="text-[11px] font-bold text-slate-400 uppercase mt-3">Top 2 Bowlers:</div>
              {inn2Bowlers.map((bw: any) => (
                <div key={bw.name} className="flex justify-between bg-slate-950/50 p-2 rounded">
                  <span className="font-bold text-slate-200">{bw.name}</span>
                  <span className="font-mono text-sky-400 font-bold">
                    {bw.wickets}/{bw.runsConceded} ({bw.overs} ov)
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Super Over note if exists */}
        {match.superOver?.active && (
          <div className="bg-red-950/80 border-t border-red-800/60 p-4 text-center">
            <span className="bg-red-600 text-white font-tech font-black text-xs px-2.5 py-1 rounded mr-2 uppercase">
              Super Over
            </span>
            <span className="font-tech text-sm text-red-200">
              {match.superOver.inning1.battingTeamName} {match.superOver.inning1.totalRuns}/{match.superOver.inning1.wickets} vs{' '}
              {match.superOver.inning2.battingTeamName} {match.superOver.inning2.totalRuns}/{match.superOver.inning2.wickets} •{' '}
              <strong className="text-white">{match.superOver.resultText}</strong>
            </span>
          </div>
        )}
      </motion.div>
    </div>
  );
};

// Partnership Overlay
const PartnershipOverlay: React.FC<{
  match: any;
  currentInning: any;
  striker: any;
  nonStriker: any;
  battingLogo?: string;
}> = ({ match, currentInning, striker, nonStriker, battingLogo }) => {
  const pRuns = currentInning.currentPartnership.runs || 0;
  const pBalls = currentInning.currentPartnership.balls || 0;
  const r1 = currentInning.currentPartnership.player1Runs || 0;
  const r2 = Math.max(0, pRuns - r1);

  const pct1 = pRuns > 0 ? (r1 / pRuns) * 100 : 50;

  return (
    <div className="m-auto p-4 max-w-2xl w-full">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-slate-950/95 border-2 border-amber-500/60 text-white rounded-2xl shadow-2xl p-6 backdrop-blur-2xl"
      >
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
          <div className="flex items-center gap-2 text-amber-400 font-tech font-bold uppercase text-sm">
            <Flame className="w-5 h-5 text-amber-400" /> CURRENT PARTNERSHIP
          </div>
          <div className="flex items-center gap-2 font-tech text-xs text-slate-300">
            {battingLogo && (
              <img src={battingLogo} alt={currentInning.battingTeamName} className="w-5 h-5 object-contain rounded bg-white/10 p-0.5" />
            )}
            <span>{currentInning.battingTeamName}</span>
          </div>
        </div>

        <div className="text-center my-4">
          <div className="font-display font-black text-6xl sm:text-7xl text-white tracking-tight leading-none">
            {pRuns}
          </div>
          <div className="font-tech text-amber-400 text-sm font-bold tracking-wider mt-1 uppercase">
            RUNS OFF {pBalls} BALLS
          </div>
        </div>

        {/* Visual comparison bar */}
        <div className="my-6">
          <div className="h-4 bg-slate-800 rounded-full overflow-hidden flex">
            <div style={{ width: `${pct1}%` }} className="bg-amber-500 h-full transition-all duration-500" />
            <div style={{ width: `${100 - pct1}%` }} className="bg-emerald-500 h-full transition-all duration-500" />
          </div>
          <div className="flex justify-between items-center mt-2 text-xs font-tech font-bold">
            <span className="text-amber-400">
              {striker?.name || 'Striker'}: {r1} runs
            </span>
            <span className="text-emerald-400">
              {nonStriker?.name || 'Non-Striker'}: {r2} runs
            </span>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

// Target Need Card
const TargetNeedOverlay: React.FC<{
  match: any;
  currentInning: any;
  runsNeeded: number;
  ballsRemaining: number;
  rrr: string;
  crr: string;
  battingLogo?: string;
}> = ({ match, currentInning, runsNeeded, ballsRemaining, rrr, crr, battingLogo }) => {
  return (
    <div className="m-auto p-4 max-w-3xl w-full">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-slate-950/95 border-2 border-red-500/70 text-white rounded-2xl shadow-2xl p-8 backdrop-blur-2xl text-center"
      >
        <div className="inline-flex items-center gap-2 bg-red-600/20 border border-red-500 text-red-400 px-4 py-1 rounded-full text-xs font-tech font-bold uppercase tracking-widest mb-4">
          <Target className="w-4 h-4" /> EQUATION / TARGET NEED
        </div>

        <div className="flex items-center justify-center gap-2 text-sm font-tech text-slate-300 uppercase tracking-wider mb-2">
          {battingLogo && (
            <img src={battingLogo} alt={currentInning.battingTeamName} className="w-6 h-6 object-contain rounded bg-white/10 p-0.5" />
          )}
          <span>{currentInning.battingTeamName} CHASE TARGET OF {match.targetRuns}</span>
        </div>

        <h1 className="font-display font-black text-5xl sm:text-7xl text-white tracking-tight uppercase leading-none my-4">
          NEED <span className="text-amber-400">{runsNeeded}</span> RUNS IN{' '}
          <span className="text-amber-400">{ballsRemaining}</span> BALLS
        </h1>

        <div className="flex justify-center items-center gap-8 mt-6 pt-6 border-t border-slate-800 text-sm font-tech">
          <div>
            <div className="text-slate-400 text-xs uppercase">CURRENT RUN RATE</div>
            <div className="font-display font-bold text-3xl text-slate-200">{crr}</div>
          </div>
          <div className="w-px h-10 bg-slate-800" />
          <div>
            <div className="text-amber-400 text-xs uppercase font-bold">REQUIRED RUN RATE</div>
            <div className="font-display font-bold text-4xl text-amber-400">{rrr}</div>
          </div>
          <div className="w-px h-10 bg-slate-800" />
          <div>
            <div className="text-slate-400 text-xs uppercase">WICKETS IN HAND</div>
            <div className="font-display font-bold text-3xl text-emerald-400">
              {match.settings.allOutWickets - currentInning.wickets}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

// Toss Card Overlay
const TossCardOverlay: React.FC<{
  match: any;
  teamALogo?: string;
  teamBLogo?: string;
}> = ({ match, teamALogo, teamBLogo }) => {
  const tossTeam =
    match.tossWinnerId === match.teamA.id ? match.teamA.teamName : match.teamB.teamName;

  return (
    <div className="m-auto p-4 max-w-3xl w-full">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-slate-950/95 border-2 border-amber-500 text-white rounded-2xl shadow-2xl p-8 backdrop-blur-2xl text-center"
      >
        <div className="text-xs font-tech font-bold uppercase tracking-widest text-amber-400 mb-2">
          {match.settings.tournamentName} • OFFICIAL TOSS
        </div>

        <div className="flex items-center justify-center gap-6 my-6">
          <div className="text-center">
            <div className="w-16 h-16 rounded-xl bg-slate-900 border-2 border-amber-500/70 text-slate-950 font-display font-bold text-3xl flex items-center justify-center mx-auto shadow-lg overflow-hidden p-1">
              {teamALogo ? (
                <img src={teamALogo} alt={match.teamA.teamName} className="w-full h-full object-contain" />
              ) : (
                <div className="w-full h-full bg-amber-500 text-slate-950 flex items-center justify-center font-bold">
                  {match.teamA.shortCode}
                </div>
              )}
            </div>
            <div className="font-tech font-bold text-sm text-slate-200 mt-2">{match.teamA.teamName}</div>
          </div>

          <div className="font-display font-bold text-3xl text-slate-500">VS</div>

          <div className="text-center">
            <div className="w-16 h-16 rounded-xl bg-slate-900 border-2 border-red-500/70 text-white font-display font-bold text-3xl flex items-center justify-center mx-auto shadow-lg overflow-hidden p-1">
              {teamBLogo ? (
                <img src={teamBLogo} alt={match.teamB.teamName} className="w-full h-full object-contain" />
              ) : (
                <div className="w-full h-full bg-red-600 text-white flex items-center justify-center font-bold">
                  {match.teamB.shortCode}
                </div>
              )}
            </div>
            <div className="font-tech font-bold text-sm text-slate-200 mt-2">{match.teamB.teamName}</div>
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl max-w-lg mx-auto my-4">
          <div className="text-xs font-tech text-slate-400 uppercase tracking-wider mb-1">TOSS RESULT</div>
          <div className="font-tech font-bold text-xl text-amber-400 uppercase">
            {tossTeam} won the toss and elected to {match.tossDecision.toUpperCase()} first
          </div>
        </div>

        <div className="text-xs font-tech text-slate-400 mt-4">
          Venue: {match.settings.venue} • Date: {match.settings.date}
        </div>
      </motion.div>
    </div>
  );
};

// --- MOST RUNS LEADERBOARD OVERLAY (TOP 5 BATSMEN) ---
const MostRunsLeaderboardOverlay: React.FC<{
  tournamentStats: TournamentStats;
  tournamentName: string;
  getTeamLogo?: (id?: string, code?: string) => string | undefined;
}> = ({ tournamentStats, tournamentName, getTeamLogo }) => {
  const top5 = (tournamentStats.mostRuns || []).slice(0, 5);

  return (
    <div className="m-auto p-4 max-w-4xl w-full">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="bg-slate-950/95 border-2 border-amber-500 text-white rounded-2xl shadow-2xl overflow-hidden backdrop-blur-2xl"
      >
        {/* Header Strip */}
        <div className="bg-gradient-to-r from-amber-600 via-amber-500 to-orange-600 px-6 py-3.5 flex items-center justify-between text-slate-950">
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-slate-950/20 rounded-lg">
              <Trophy className="w-6 h-6 text-slate-950" />
            </div>
            <div>
              <div className="text-[11px] font-tech font-black tracking-widest uppercase text-slate-950/80">
                {tournamentName || 'DEZIGLO CRICKET TOURNAMENT'}
              </div>
              <h2 className="font-display font-black text-2xl uppercase tracking-wider leading-none">
                MOST RUNS • TOP 5 LEADERBOARD
              </h2>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-slate-950 text-amber-400 px-3 py-1.5 rounded-lg border border-amber-400/40">
            <Flame className="w-4 h-4 text-orange-400" />
            <span className="font-tech font-bold text-xs uppercase tracking-wider">ORANGE CAP</span>
          </div>
        </div>

        {/* Column Headers */}
        <div className="grid grid-cols-12 px-6 py-2.5 bg-slate-900/90 border-b border-slate-800 text-[11px] font-tech font-bold text-slate-400 uppercase tracking-wider">
          <div className="col-span-1 text-center">POS</div>
          <div className="col-span-6">BATSMAN & TEAM</div>
          <div className="col-span-3 text-right">STRIKE RATE</div>
          <div className="col-span-2 text-right">RUNS</div>
        </div>

        {/* Player List */}
        <div className="divide-y divide-slate-800/80">
          {top5.length === 0 ? (
            <div className="py-8 text-center text-slate-400 font-tech">No run statistics recorded yet</div>
          ) : (
            top5.map((player, idx) => {
              const isLeader = idx === 0;
              const teamLogo = getTeamLogo?.(player.teamId, player.teamCode);
              return (
                <div
                  key={player.id || idx}
                  className={`grid grid-cols-12 items-center px-6 py-3 transition ${
                    isLeader
                      ? 'bg-amber-500/10 hover:bg-amber-500/15 border-l-4 border-amber-400'
                      : idx % 2 === 0
                      ? 'bg-slate-950/50 hover:bg-slate-900/40'
                      : 'bg-slate-900/30 hover:bg-slate-900/50'
                  }`}
                >
                  {/* Position */}
                  <div className="col-span-1 flex justify-center">
                    <span
                      className={`w-7 h-7 rounded-full flex items-center justify-center font-display font-black text-sm ${
                        idx === 0
                          ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/30'
                          : idx === 1
                          ? 'bg-slate-300 text-slate-950'
                          : idx === 2
                          ? 'bg-amber-700 text-white'
                          : 'bg-slate-800 text-slate-300 border border-slate-700'
                      }`}
                    >
                      {idx + 1}
                    </span>
                  </div>

                  {/* Player Name and Team */}
                  <div className="col-span-6 flex items-center gap-3 pl-2">
                    <div className="font-sans-ui font-bold text-base text-white flex items-center gap-2">
                      {player.name}
                      {isLeader && (
                        <span className="text-[10px] font-tech font-bold px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-300 border border-amber-400/40 uppercase">
                          LEADER
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-800 border border-slate-700 font-tech font-bold text-xs text-sky-400">
                      {teamLogo && (
                        <img src={teamLogo} alt={player.teamCode} className="w-4 h-4 object-contain rounded bg-white/10 p-0.5" />
                      )}
                      <span>{player.teamCode}</span>
                    </div>
                  </div>

                  {/* Secondary Value (Strike Rate) */}
                  <div className="col-span-3 text-right font-mono text-sm text-slate-300">
                    {player.secondaryValue || '—'}
                  </div>

                  {/* Runs Total */}
                  <div className="col-span-2 text-right">
                    <span
                      className={`font-display font-black text-2xl ${
                        isLeader ? 'text-amber-400 drop-shadow-sm' : 'text-white'
                      }`}
                    >
                      {player.value}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Brand Banner */}
        <div className="px-6 py-2.5 bg-slate-950 flex items-center justify-between border-t border-slate-800 text-[11px] font-tech text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span>LIVE TOURNAMENT LEADERBOARD • BEST 5 BATSMEN</span>
          </div>
          <div className="font-bold text-amber-400 uppercase tracking-wider">DEZIGLO BROADCAST GRAPHICS</div>
        </div>
      </motion.div>
    </div>
  );
};

// --- MOST WICKETS LEADERBOARD OVERLAY (TOP 5 BOWLERS) ---
const MostWicketsLeaderboardOverlay: React.FC<{
  tournamentStats: TournamentStats;
  tournamentName: string;
  getTeamLogo?: (id?: string, code?: string) => string | undefined;
}> = ({ tournamentStats, tournamentName, getTeamLogo }) => {
  const top5 = (tournamentStats.mostWickets || []).slice(0, 5);

  return (
    <div className="m-auto p-4 max-w-4xl w-full">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="bg-slate-950/95 border-2 border-purple-500 text-white rounded-2xl shadow-2xl overflow-hidden backdrop-blur-2xl"
      >
        {/* Header Strip */}
        <div className="bg-gradient-to-r from-purple-700 via-purple-600 to-indigo-700 px-6 py-3.5 flex items-center justify-between text-white">
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-white/20 rounded-lg">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="text-[11px] font-tech font-black tracking-widest uppercase text-purple-200">
                {tournamentName || 'DEZIGLO CRICKET TOURNAMENT'}
              </div>
              <h2 className="font-display font-black text-2xl uppercase tracking-wider leading-none">
                MOST WICKETS • TOP 5 LEADERBOARD
              </h2>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-slate-950 text-purple-300 px-3 py-1.5 rounded-lg border border-purple-400/40">
            <Shield className="w-4 h-4 text-purple-400" />
            <span className="font-tech font-bold text-xs uppercase tracking-wider">PURPLE CAP</span>
          </div>
        </div>

        {/* Column Headers */}
        <div className="grid grid-cols-12 px-6 py-2.5 bg-slate-900/90 border-b border-slate-800 text-[11px] font-tech font-bold text-slate-400 uppercase tracking-wider">
          <div className="col-span-1 text-center">POS</div>
          <div className="col-span-6">BOWLER & TEAM</div>
          <div className="col-span-3 text-right">ECONOMY / OVERS</div>
          <div className="col-span-2 text-right">WICKETS</div>
        </div>

        {/* Bowler List */}
        <div className="divide-y divide-slate-800/80">
          {top5.length === 0 ? (
            <div className="py-8 text-center text-slate-400 font-tech">No bowling statistics recorded yet</div>
          ) : (
            top5.map((player, idx) => {
              const isLeader = idx === 0;
              const teamLogo = getTeamLogo?.(player.teamId, player.teamCode);
              return (
                <div
                  key={player.id || idx}
                  className={`grid grid-cols-12 items-center px-6 py-3 transition ${
                    isLeader
                      ? 'bg-purple-600/15 hover:bg-purple-600/20 border-l-4 border-purple-400'
                      : idx % 2 === 0
                      ? 'bg-slate-950/50 hover:bg-slate-900/40'
                      : 'bg-slate-900/30 hover:bg-slate-900/50'
                  }`}
                >
                  {/* Position */}
                  <div className="col-span-1 flex justify-center">
                    <span
                      className={`w-7 h-7 rounded-full flex items-center justify-center font-display font-black text-sm ${
                        idx === 0
                          ? 'bg-purple-500 text-white shadow-md shadow-purple-500/40'
                          : idx === 1
                          ? 'bg-slate-300 text-slate-950'
                          : idx === 2
                          ? 'bg-amber-700 text-white'
                          : 'bg-slate-800 text-slate-300 border border-slate-700'
                      }`}
                    >
                      {idx + 1}
                    </span>
                  </div>

                  {/* Bowler Name and Team */}
                  <div className="col-span-6 flex items-center gap-3 pl-2">
                    <div className="font-sans-ui font-bold text-base text-white flex items-center gap-2">
                      {player.name}
                      {isLeader && (
                        <span className="text-[10px] font-tech font-bold px-1.5 py-0.5 rounded bg-purple-500/30 text-purple-300 border border-purple-400/50 uppercase">
                          LEADER
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-800 border border-slate-700 font-tech font-bold text-xs text-sky-400">
                      {teamLogo && (
                        <img src={teamLogo} alt={player.teamCode} className="w-4 h-4 object-contain rounded bg-white/10 p-0.5" />
                      )}
                      <span>{player.teamCode}</span>
                    </div>
                  </div>

                  {/* Secondary Value (Economy) */}
                  <div className="col-span-3 text-right font-mono text-sm text-slate-300">
                    {player.secondaryValue || '—'}
                  </div>

                  {/* Wickets Total */}
                  <div className="col-span-2 text-right">
                    <span
                      className={`font-display font-black text-2xl ${
                        isLeader ? 'text-purple-300 drop-shadow-sm' : 'text-white'
                      }`}
                    >
                      {player.value}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Brand Banner */}
        <div className="px-6 py-2.5 bg-slate-950 flex items-center justify-between border-t border-slate-800 text-[11px] font-tech text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
            <span>LIVE TOURNAMENT LEADERBOARD • BEST 5 BOWLERS</span>
          </div>
          <div className="font-bold text-purple-400 uppercase tracking-wider">DEZIGLO BROADCAST GRAPHICS</div>
        </div>
      </motion.div>
    </div>
  );
};
