import React, { useState } from 'react';
import {
  Trophy,
  RefreshCw,
  CheckCircle2,
  X,
  Target,
  FileText,
  RotateCcw,
  Sparkles,
  Zap,
} from 'lucide-react';
import { useCricket } from '../context/CricketContext';

interface MatchFlowModalsProps {
  onOpenScorecard: () => void;
  onOpenResetModal: () => void;
}

export const MatchFlowModals: React.FC<MatchFlowModalsProps> = ({
  onOpenScorecard,
  onOpenResetModal,
}) => {
  const {
    match,
    showInningBreakModal,
    dismissInningBreakModal,
    showMatchFinishedModal,
    dismissMatchFinishedModal,
    switchInning,
    finishMatchAndRecordPoints,
    startSuperOver,
  } = useCricket();

  const [superOverBalls, setSuperOverBalls] = useState<number>(match.settings.ballsPerOver || 6);

  const handleStart2ndInning = () => {
    switchInning();
    dismissInningBreakModal();
  };

  const handleFinishMatch = () => {
    finishMatchAndRecordPoints();
    dismissMatchFinishedModal();
  };

  const handlePlaySuperOver = () => {
    dismissMatchFinishedModal();
    startSuperOver(superOverBalls);
  };

  const isTied = match.status === 'tied';

  return (
    <>
      {/* 1. INNINGS BREAK MODAL */}
      {showInningBreakModal && match.currentInningIndex === 1 && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-amber-500 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                  <RefreshCw className="w-5 h-5 animate-spin-slow" />
                </div>
                <div>
                  <h3 className="font-tech font-black text-xl text-white uppercase tracking-wider">
                    1ST INNING COMPLETED!
                  </h3>
                  <p className="text-xs text-slate-400">Innings break reached • Target is set</p>
                </div>
              </div>
              <button
                onClick={dismissInningBreakModal}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scorecard highlight card */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-center space-y-2">
              <div className="text-xs font-tech font-bold text-slate-400 uppercase">
                {match.inning1.battingTeamName} ({match.inning1.battingTeamCode})
              </div>
              <div className="text-4xl font-display font-black text-white">
                {match.inning1.totalRuns}/{match.inning1.wickets}
              </div>
              <div className="text-xs font-tech text-slate-400">
                in <strong className="text-white">{match.inning1.oversFormatted}</strong> Overs • Run Rate:{' '}
                <strong className="text-amber-400">
                  {match.inning1.legalBalls > 0
                    ? (
                        match.inning1.totalRuns /
                        (match.inning1.legalBalls / (match.settings.ballsPerOver || 6))
                      ).toFixed(2)
                    : '0.00'}
                </strong>
              </div>

              <div className="pt-3 mt-2 border-t border-slate-800/80 flex items-center justify-center gap-2 text-sm font-tech text-sky-400">
                <Target className="w-4 h-4" />
                <span>
                  TARGET TO WIN FOR {match.inning2.battingTeamName.toUpperCase()}:{' '}
                  <strong className="text-white text-lg font-display">{match.targetRuns} RUNS</strong>
                </span>
              </div>
            </div>

            <div className="space-y-2.5">
              <button
                onClick={handleStart2ndInning}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-tech font-black text-sm uppercase tracking-wider shadow-lg flex items-center justify-center gap-2 transition"
              >
                <RefreshCw className="w-4 h-4" /> START 2ND INNING (CHASE) NOW
              </button>

              <button
                onClick={dismissInningBreakModal}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-tech font-bold text-xs uppercase transition"
              >
                CLOSE & REVIEW 1ST INNING SCORECARD
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. MATCH FINISHED & SUPER OVER DECISION MODAL */}
      {showMatchFinishedModal && (match.status === 'completed' || isTied) && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div
            className={`bg-slate-900 border-2 ${
              isTied ? 'border-red-500 shadow-[0_0_50px_rgba(239,68,68,0.3)]' : 'border-emerald-500 shadow-2xl'
            } rounded-2xl max-w-xl w-full p-6 space-y-5 animate-in fade-in zoom-in-95 duration-200`}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-10 h-10 rounded-xl ${
                    isTied
                      ? 'bg-red-500/20 border border-red-500/40 text-red-400'
                      : 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-400'
                  } flex items-center justify-center`}
                >
                  {isTied ? <Zap className="w-5 h-5 animate-pulse" /> : <Trophy className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="font-tech font-black text-xl text-white uppercase tracking-wider">
                    {isTied ? 'MATCH TIED — REGULATION COMPLETED!' : 'MATCH FINISHED!'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {isTied
                      ? 'Scores level • Decide whether to play a Super Over or finalize as Tie'
                      : 'Official result confirmed • Ready for tournament points update'}
                  </p>
                </div>
              </div>
              <button
                onClick={dismissMatchFinishedModal}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scoreboard result banner */}
            <div
              className={`bg-gradient-to-r ${
                isTied
                  ? 'from-red-950/80 via-slate-950 to-amber-950/80 border-red-500/40'
                  : 'from-emerald-950/80 to-slate-950 border-emerald-500/40'
              } p-4 rounded-xl border text-center space-y-2`}
            >
              <div
                className={`text-xs font-tech font-bold ${
                  isTied ? 'text-amber-400' : 'text-emerald-400'
                } uppercase tracking-widest`}
              >
                OFFICIAL MATCH RESULT
              </div>
              <div className="text-2xl font-display font-black text-white">
                {match.winDescription || (isTied ? 'SCORES LEVEL - MATCH TIED!' : 'Match Concluded')}
              </div>
              <div className="grid grid-cols-2 gap-3 pt-2 mt-2 border-t border-slate-800/80 text-xs font-tech">
                <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                  <span className="text-slate-400">
                    {match.inning1.battingTeamName} ({match.inning1.battingTeamCode}):{' '}
                  </span>
                  <div className="text-white font-mono text-base font-bold">
                    {match.inning1.totalRuns}/{match.inning1.wickets}{' '}
                    <span className="text-xs text-slate-400 font-normal">
                      ({match.inning1.oversFormatted} ov)
                    </span>
                  </div>
                </div>
                <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                  <span className="text-slate-400">
                    {match.inning2.battingTeamName} ({match.inning2.battingTeamCode}):{' '}
                  </span>
                  <div className="text-white font-mono text-base font-bold">
                    {match.inning2.totalRuns}/{match.inning2.wickets}{' '}
                    <span className="text-xs text-slate-400 font-normal">
                      ({match.inning2.oversFormatted} ov)
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* SUPER OVER WORKFLOW SECTION ON THE SAME SCREEN */}
            {isTied && (
              <div className="bg-slate-950 p-4 rounded-xl border border-red-500/30 space-y-3">
                <div className="flex items-center justify-between text-xs font-tech">
                  <div className="text-red-400 font-bold uppercase flex items-center gap-1.5">
                    <Zap className="w-4 h-4 text-amber-400" /> SUPER OVER SHOOTOUT DECISION
                  </div>
                  <span className="text-slate-400">Balls per over:</span>
                </div>

                <div className="flex items-center justify-between bg-slate-900/90 p-2.5 rounded-lg border border-slate-800">
                  <span className="text-xs text-slate-300 font-tech">OVAL RULES: 2 WICKETS ALL-OUT</span>
                  <div className="flex gap-1.5">
                    {[4, 5, 6, 8].map((b) => (
                      <button
                        key={b}
                        type="button"
                        onClick={() => setSuperOverBalls(b)}
                        className={`px-3 py-1 rounded text-xs font-bold border transition ${
                          superOverBalls === b
                            ? 'bg-red-600 text-white border-red-500 shadow'
                            : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                        }`}
                      >
                        {b} Balls
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <button
                    onClick={handlePlaySuperOver}
                    className="py-3 px-4 rounded-xl bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-tech font-black text-sm uppercase tracking-wider shadow-lg flex items-center justify-center gap-2 transition active:scale-95"
                  >
                    <Zap className="w-4 h-4" /> PLAY SUPER OVER
                  </button>

                  <button
                    onClick={handleFinishMatch}
                    className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-tech font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" /> END MATCH AS TIE (1 PT EACH)
                  </button>
                </div>
              </div>
            )}

            {/* Standard Match Finished Action Button */}
            {!isTied && (
              <button
                onClick={handleFinishMatch}
                className="w-full py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-tech font-black text-sm uppercase tracking-wider shadow-xl flex items-center justify-center gap-2 transition transform active:scale-98"
              >
                <CheckCircle2 className="w-4 h-4" /> FINISH MATCH & UPDATE POINTS TABLE
              </button>
            )}

            {/* Secondary Controls */}
            <div className="grid grid-cols-2 gap-2.5">
              <button
                onClick={() => {
                  dismissMatchFinishedModal();
                  onOpenScorecard();
                }}
                className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-tech font-bold text-xs uppercase flex items-center justify-center gap-2 border border-slate-700 transition"
              >
                <FileText className="w-4 h-4 text-amber-400" /> FULL SCORECARD / PDF
              </button>

              <button
                onClick={() => {
                  dismissMatchFinishedModal();
                  onOpenResetModal();
                }}
                className="py-2.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-tech font-bold text-xs uppercase flex items-center justify-center gap-2 transition"
              >
                <RotateCcw className="w-4 h-4" /> NEXT MATCH SQUADS
              </button>
            </div>

            <button
              onClick={dismissMatchFinishedModal}
              className="w-full py-1.5 text-slate-400 hover:text-slate-200 font-tech text-xs uppercase transition text-center"
            >
              Dismiss Modal
            </button>
          </div>
        </div>
      )}
    </>
  );
};
