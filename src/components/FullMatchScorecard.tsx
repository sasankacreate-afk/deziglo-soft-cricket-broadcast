import React from 'react';
import { Printer, Download, X, Trophy, Shield, Zap, CheckCircle2, Star, Flame, Award } from 'lucide-react';
import { useCricket } from '../context/CricketContext';
import { MatchState } from '../types';
import { triggerPrintOrDownload } from '../utils/pdfExport';

export interface FullMatchScorecardProps {
  onClose: () => void;
  targetMatch?: MatchState;
}

export const FullMatchScorecard: React.FC<FullMatchScorecardProps> = ({ onClose, targetMatch }) => {
  const { match: currentMatch } = useCricket();
  const match = targetMatch || currentMatch;

  const handlePrintPdf = () => {
    triggerPrintOrDownload(
      'printable-scorecard',
      `${match.settings.tournamentName} - ${match.settings.matchTitle} Official Scorecard`,
      `${match.settings.matchTitle.toLowerCase().replace(/[^a-z0-9]/g, '_')}_scorecard.html`
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col justify-between overflow-y-auto p-2 sm:p-6">
      {/* Top action header (hidden during print) */}
      <div className="no-print max-w-5xl mx-auto w-full flex items-center justify-between bg-slate-900 border border-slate-800 p-4 rounded-xl mb-4 shadow-xl">
        <div className="flex items-center gap-2 text-white font-tech font-bold text-lg uppercase">
          <Trophy className="w-5 h-5 text-amber-400" /> OFFICIAL FULL MATCH SCORECARD
          <span className="text-xs font-mono text-amber-400 font-normal ml-2">
            • {match.settings.matchTitle}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handlePrintPdf}
            className="px-5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-tech font-black text-xs uppercase tracking-wider shadow-lg flex items-center gap-2 transition"
          >
            <Printer className="w-4 h-4" /> DOWNLOAD AS PDF / PRINT
          </button>

          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* PRINTABLE SCORECARD SHEET */}
      <MatchScorecardSheet match={match} id="printable-scorecard" />
    </div>
  );
};

export const MatchScorecardSheet: React.FC<{
  match: MatchState;
  id?: string;
  showSignatures?: boolean;
  className?: string;
}> = ({ match, id, showSignatures = true, className = '' }) => {
  const isSuperOver = !!match.superOver?.active;

  // Compute best stats players across both innings
  const allBatsmen = [
    ...Object.values(match.inning1?.batsmen || {}).map((b: any) => ({
      ...b,
      teamCode: match.inning1.battingTeamCode,
    })),
    ...Object.values(match.inning2?.batsmen || {}).map((b: any) => ({
      ...b,
      teamCode: match.inning2.battingTeamCode,
    })),
  ].filter((b: any) => b.runs > 0 || b.balls > 0);
  allBatsmen.sort((a: any, b: any) => b.runs - a.runs || b.strikeRate - a.strikeRate);
  const topBatsmen = allBatsmen.slice(0, 4);

  const allBowlers = [
    ...Object.values(match.inning1?.bowlers || {}).map((bw: any) => ({
      ...bw,
      teamCode: match.inning1.bowlingTeamName?.slice(0, 3)?.toUpperCase() || '',
    })),
    ...Object.values(match.inning2?.bowlers || {}).map((bw: any) => ({
      ...bw,
      teamCode: match.inning2.bowlingTeamName?.slice(0, 3)?.toUpperCase() || '',
    })),
  ].filter((bw: any) => bw.legalBalls > 0 || bw.runsConceded > 0);
  allBowlers.sort((a: any, b: any) => b.wickets - a.wickets || a.runsConceded - b.runsConceded);
  const topBowlers = allBowlers.slice(0, 4);

  return (
    <div
      id={id}
      className={`max-w-5xl mx-auto w-full bg-slate-950 text-slate-100 p-6 sm:p-10 rounded-2xl border-2 border-slate-800 shadow-2xl font-sans-ui print:bg-white print:text-slate-950 print:border-none print:p-0 print:shadow-none ${className}`}
    >
        {/* Document Header */}
        <div className="border-b-2 border-amber-500 pb-4 mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-xs font-tech font-bold uppercase tracking-widest text-amber-400 print:text-amber-700">
              DEZIGLO SOFT • OFFICIAL BROADCAST SCORECARD
            </div>
            <h1 className="text-3xl sm:text-4xl font-display font-black tracking-tight uppercase text-white print:text-black">
              {match.settings.tournamentName}
            </h1>
            <div className="text-sm font-tech text-slate-300 print:text-slate-700 mt-1">
              {match.settings.matchTitle} • {match.settings.venue}
            </div>
          </div>

          <div className="text-right font-tech">
            <div className="text-xs text-slate-400 print:text-slate-600">MATCH DATE:</div>
            <div className="font-bold text-base text-white print:text-black">{match.settings.date}</div>
            {match.winDescription && (
              <div className="mt-1 inline-block bg-amber-500 text-slate-950 px-3 py-1 rounded text-xs font-bold uppercase tracking-wide">
                {match.winDescription}
              </div>
            )}
          </div>
        </div>

        {/* Match Result Banner */}
        <div className="bg-slate-900 print:bg-slate-100 p-4 rounded-xl border border-slate-800 print:border-slate-300 mb-6 flex items-center justify-between">
          <div className="font-tech text-sm">
            <span className="text-slate-400 print:text-slate-600">TOSS: </span>
            <strong className="text-amber-400 print:text-amber-800">
              {match.tossWinnerId === match.teamA.id ? match.teamA.teamName : match.teamB.teamName}
            </strong>{' '}
            won the toss and elected to {match.tossDecision.toUpperCase()} first.
          </div>
          <div className="font-tech text-xs text-slate-400 print:text-slate-600">
            {match.settings.totalOvers} Overs Match • {match.settings.playersPerSide} a-side (
            {match.settings.allOutWickets} Wickets All-Out)
          </div>
        </div>

        {/* 1ST INNINGS SCORECARD */}
        <InningScorecardTable
          inningTitle={`1ST INNINGS: ${match.inning1.battingTeamName} (${match.inning1.battingTeamCode})`}
          bowlingTeamName={match.inning1.bowlingTeamName}
          inning={match.inning1}
          ballsPerOver={match.settings.ballsPerOver}
        />

        {/* 2ND INNINGS SCORECARD */}
        <div className="mt-8">
          <InningScorecardTable
            inningTitle={`2ND INNINGS: ${match.inning2.battingTeamName} (${match.inning2.battingTeamCode})`}
            bowlingTeamName={match.inning2.bowlingTeamName}
            inning={match.inning2}
            ballsPerOver={match.settings.ballsPerOver}
          />
        </div>

        {/* SUPER OVER SCORECARD IF TIED (as explicitly requested!) */}
        {isSuperOver && match.superOver && (
          <div className="mt-8 pt-6 border-t-2 border-red-500 page-break">
            <div className="bg-red-950/40 print:bg-red-50 p-4 rounded-xl border border-red-500/60 mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-red-400" />
                <h3 className="font-tech font-black text-xl text-white print:text-red-900 uppercase">
                  SUPER OVER DECIDER (TIED MATCH)
                </h3>
              </div>
              <div className="font-tech font-bold text-sm text-red-400 print:text-red-800">
                {match.superOver.resultText || 'Super Over in Progress'}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <InningScorecardTable
                inningTitle={`SUPER OVER - INN 1: ${match.superOver.inning1.battingTeamName}`}
                bowlingTeamName={match.superOver.inning1.bowlingTeamName}
                inning={match.superOver.inning1}
                ballsPerOver={match.superOver.ballsPerOver || 6}
                compact
              />
              <InningScorecardTable
                inningTitle={`SUPER OVER - INN 2: ${match.superOver.inning2.battingTeamName}`}
                bowlingTeamName={match.superOver.inning2.bowlingTeamName}
                inning={match.superOver.inning2}
                ballsPerOver={match.superOver.ballsPerOver || 6}
                compact
              />
            </div>
          </div>
        )}

        {/* BEST STATS PLAYERS OF THE MATCH (MATCH LEADERS & TOP PERFORMERS TABLE) */}
        <div className="mt-8 pt-6 border-t-2 border-slate-800 print:border-slate-300">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-400 print:text-amber-800" />
              <h3 className="font-tech font-bold text-lg text-white print:text-black uppercase tracking-wider">
                MATCH BEST STATS PLAYERS & TOP PERFORMERS
              </h3>
            </div>
            <span className="text-xs font-tech text-slate-400 print:text-slate-600 uppercase">
              TOP PERFORMERS STATISTICAL SUMMARY TABLE
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Top Batting Performers Table */}
            <div className="bg-slate-900/60 print:bg-white border border-slate-800 print:border-slate-300 rounded-xl overflow-hidden shadow-sm">
              <div className="bg-slate-900 print:bg-slate-100 px-4 py-2.5 border-b border-slate-800 print:border-slate-300 flex items-center justify-between">
                <span className="text-xs font-tech font-bold text-amber-400 print:text-amber-800 uppercase flex items-center gap-1.5">
                  <Flame className="w-4 h-4 text-amber-400" /> TOP BATTING PERFORMERS
                </span>
                <span className="text-[11px] font-mono text-slate-400 print:text-slate-600 font-bold">
                  SORTED BY RUNS & SR
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-sans-ui">
                  <thead>
                    <tr className="bg-slate-950 print:bg-slate-50 text-slate-400 print:text-slate-600 font-tech font-bold uppercase border-b border-slate-800 print:border-slate-200">
                      <th className="px-3 py-2 text-center w-12">#</th>
                      <th className="px-3 py-2">BATSMAN</th>
                      <th className="px-2 py-2 text-center">TEAM</th>
                      <th className="px-3 py-2 text-right font-bold text-amber-400 print:text-amber-800">RUNS</th>
                      <th className="px-2 py-2 text-right">BALLS</th>
                      <th className="px-2 py-2 text-right">4s</th>
                      <th className="px-2 py-2 text-right">6s</th>
                      <th className="px-3 py-2 text-right">S/R</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 print:divide-slate-200 font-tech">
                    {topBatsmen.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-4 text-center text-slate-500 italic">
                          No batting performances recorded yet
                        </td>
                      </tr>
                    ) : (
                      topBatsmen.map((b: any, idx: number) => (
                        <tr
                          key={b.playerId || idx}
                          className={`hover:bg-slate-800/30 print:hover:bg-transparent ${
                            idx === 0 ? 'bg-amber-500/10 print:bg-amber-50' : ''
                          }`}
                        >
                          <td className="px-3 py-2 text-center">
                            <span
                              className={`w-5 h-5 rounded-full inline-flex items-center justify-center text-[10px] font-bold ${
                                idx === 0
                                  ? 'bg-amber-500 text-slate-950 font-black'
                                  : idx === 1
                                  ? 'bg-slate-700 text-white'
                                  : 'text-slate-400'
                              }`}
                            >
                              {idx + 1}
                            </span>
                          </td>
                          <td className="px-3 py-2 font-bold text-white print:text-black font-sans-ui">
                            {b.name}
                          </td>
                          <td className="px-2 py-2 text-center">
                            <span className="px-1.5 py-0.5 rounded bg-slate-800 print:bg-slate-200 text-amber-300 print:text-amber-900 font-mono text-[10px] font-bold">
                              {b.teamCode}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-right font-display font-bold text-base text-amber-400 print:text-amber-900">
                            {b.runs}
                          </td>
                          <td className="px-2 py-2 text-right font-mono text-slate-300 print:text-slate-700">
                            {b.balls}
                          </td>
                          <td className="px-2 py-2 text-right font-mono text-slate-300 print:text-slate-700">
                            {b.fours}
                          </td>
                          <td className="px-2 py-2 text-right font-mono text-slate-300 print:text-slate-700">
                            {b.sixes}
                          </td>
                          <td className="px-3 py-2 text-right font-mono font-bold text-slate-200 print:text-slate-800">
                            {b.strikeRate}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Top Bowling Performers Table */}
            <div className="bg-slate-900/60 print:bg-white border border-slate-800 print:border-slate-300 rounded-xl overflow-hidden shadow-sm">
              <div className="bg-slate-900 print:bg-slate-100 px-4 py-2.5 border-b border-slate-800 print:border-slate-300 flex items-center justify-between">
                <span className="text-xs font-tech font-bold text-sky-400 print:text-sky-800 uppercase flex items-center gap-1.5">
                  <Star className="w-4 h-4 text-sky-400" /> TOP BOWLING PERFORMERS
                </span>
                <span className="text-[11px] font-mono text-slate-400 print:text-slate-600 font-bold">
                  SORTED BY WICKETS & ECON
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-sans-ui">
                  <thead>
                    <tr className="bg-slate-950 print:bg-slate-50 text-slate-400 print:text-slate-600 font-tech font-bold uppercase border-b border-slate-800 print:border-slate-200">
                      <th className="px-3 py-2 text-center w-12">#</th>
                      <th className="px-3 py-2">BOWLER</th>
                      <th className="px-2 py-2 text-center">TEAM</th>
                      <th className="px-2 py-2 text-right">OVERS</th>
                      <th className="px-2 py-2 text-right">MDN</th>
                      <th className="px-2 py-2 text-right">RUNS</th>
                      <th className="px-3 py-2 text-right font-bold text-sky-400 print:text-sky-800">WKTS</th>
                      <th className="px-3 py-2 text-right">ECON</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 print:divide-slate-200 font-tech">
                    {topBowlers.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-4 text-center text-slate-500 italic">
                          No bowling performances recorded yet
                        </td>
                      </tr>
                    ) : (
                      topBowlers.map((bw: any, idx: number) => (
                        <tr
                          key={bw.playerId || idx}
                          className={`hover:bg-slate-800/30 print:hover:bg-transparent ${
                            idx === 0 ? 'bg-sky-500/10 print:bg-sky-50' : ''
                          }`}
                        >
                          <td className="px-3 py-2 text-center">
                            <span
                              className={`w-5 h-5 rounded-full inline-flex items-center justify-center text-[10px] font-bold ${
                                idx === 0
                                  ? 'bg-sky-500 text-slate-950 font-black'
                                  : idx === 1
                                  ? 'bg-slate-700 text-white'
                                  : 'text-slate-400'
                              }`}
                            >
                              {idx + 1}
                            </span>
                          </td>
                          <td className="px-3 py-2 font-bold text-white print:text-black font-sans-ui">
                            {bw.name}
                          </td>
                          <td className="px-2 py-2 text-center">
                            <span className="px-1.5 py-0.5 rounded bg-slate-800 print:bg-slate-200 text-sky-300 print:text-sky-900 font-mono text-[10px] font-bold">
                              {bw.teamCode || '-'}
                            </span>
                          </td>
                          <td className="px-2 py-2 text-right font-mono text-slate-300 print:text-slate-700">
                            {bw.overs}
                          </td>
                          <td className="px-2 py-2 text-right font-mono text-slate-300 print:text-slate-700">
                            {bw.maidens || 0}
                          </td>
                          <td className="px-2 py-2 text-right font-mono text-slate-300 print:text-slate-700">
                            {bw.runsConceded}
                          </td>
                          <td className="px-3 py-2 text-right font-display font-bold text-base text-sky-400 print:text-sky-900">
                            {bw.wickets}
                          </td>
                          <td className="px-3 py-2 text-right font-mono font-bold text-slate-200 print:text-slate-800">
                            {bw.economy}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Official Signatures Section for PDF Download */}
        {showSignatures && (
          <div className="mt-10 pt-6 border-t border-slate-800 print:border-slate-300 grid grid-cols-3 gap-6 text-center text-xs font-tech text-slate-400 print:text-slate-600">
          <div>
            <div className="h-10 border-b border-dashed border-slate-700 print:border-slate-400 mb-1" />
            <span>OFFICIAL SCORER SIGNATURE</span>
          </div>
          <div>
            <div className="h-10 border-b border-dashed border-slate-700 print:border-slate-400 mb-1" />
            <span>MATCH REFEREE / UMPIRE</span>
          </div>
          <div>
            <div className="h-10 border-b border-dashed border-slate-700 print:border-slate-400 mb-1" />
            <span>DEZIGLO BROADCAST DIRECTOR</span>
          </div>
        </div>
      )}
    </div>
  );
};

// Inning Scorecard Table Helper
const InningScorecardTable: React.FC<{
  inningTitle: string;
  bowlingTeamName: string;
  inning: any;
  ballsPerOver: number;
  compact?: boolean;
}> = ({ inningTitle, bowlingTeamName, inning, ballsPerOver, compact = false }) => {
  const batsmenList = Object.values(inning.batsmen || {});
  const bowlersList = Object.values(inning.bowlers || {}).filter(
    (bw: any) => bw.legalBalls > 0 || bw.runsConceded > 0
  );

  return (
    <div className="bg-slate-900/60 print:bg-white border border-slate-800 print:border-slate-300 rounded-xl overflow-hidden">
      {/* Inning Title Bar */}
      <div className="bg-slate-900 print:bg-slate-100 px-4 py-3 border-b border-slate-800 print:border-slate-300 flex items-center justify-between">
        <h3 className="font-tech font-bold text-base text-amber-400 print:text-amber-800 uppercase">
          {inningTitle}
        </h3>
        <div className="font-display font-bold text-2xl text-white print:text-black">
          {inning.totalRuns}/{inning.wickets}{' '}
          <span className="text-sm font-tech text-slate-400 print:text-slate-600">
            ({inning.oversFormatted} ov)
          </span>
        </div>
      </div>

      {/* Batting Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs font-sans-ui">
          <thead>
            <tr className="bg-slate-950 print:bg-slate-50 text-slate-400 print:text-slate-600 font-tech font-bold uppercase border-b border-slate-800 print:border-slate-200">
              <th className="px-4 py-2">BATSMAN</th>
              <th className="px-4 py-2">DISMISSAL</th>
              <th className="px-3 py-2 text-right">R</th>
              <th className="px-3 py-2 text-right">B</th>
              <th className="px-3 py-2 text-right">4s</th>
              <th className="px-3 py-2 text-right">6s</th>
              <th className="px-4 py-2 text-right">SR</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 print:divide-slate-200">
            {batsmenList.map((b: any) => (
              <tr key={b.playerId} className="hover:bg-slate-800/30">
                <td className="px-4 py-2 font-bold text-white print:text-black">
                  {b.name} {!b.isOut && b.balls > 0 ? '*' : ''}
                </td>
                <td className="px-4 py-2 text-slate-400 print:text-slate-600 italic">
                  {b.dismissalText || (b.isOut ? 'out' : 'not out')}
                </td>
                <td className="px-3 py-2 text-right font-display font-bold text-base text-amber-300 print:text-black">
                  {b.runs}
                </td>
                <td className="px-3 py-2 text-right font-mono text-slate-300 print:text-slate-700">
                  {b.balls}
                </td>
                <td className="px-3 py-2 text-right font-mono text-slate-300 print:text-slate-700">
                  {b.fours}
                </td>
                <td className="px-3 py-2 text-right font-mono text-slate-300 print:text-slate-700">
                  {b.sixes}
                </td>
                <td className="px-4 py-2 text-right font-mono text-slate-300 print:text-slate-700">
                  {b.strikeRate}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Extras & Totals Bar */}
      <div className="bg-slate-950/90 print:bg-slate-50 px-4 py-2.5 border-t border-b border-slate-800 print:border-slate-200 flex flex-wrap items-center justify-between text-xs font-tech">
        <div>
          <span className="text-slate-400 print:text-slate-600">EXTRAS: </span>
          <strong className="text-white print:text-black">{inning.extras.total}</strong> (wd{' '}
          {inning.extras.wides}, nb {inning.extras.noBalls}, b {inning.extras.byes}, lb{' '}
          {inning.extras.legByes})
        </div>
        <div>
          <span className="text-slate-400 print:text-slate-600">TOTAL: </span>
          <strong className="text-amber-400 print:text-amber-800 text-sm">
            {inning.totalRuns}/{inning.wickets}
          </strong>{' '}
          in {inning.oversFormatted} overs
        </div>
      </div>

      {/* Fall of Wickets */}
      {inning.fallOfWickets && inning.fallOfWickets.length > 0 && !compact && (
        <div className="px-4 py-2 bg-slate-900/40 print:bg-white text-[11px] font-tech text-slate-400 print:text-slate-600 border-b border-slate-800 print:border-slate-200">
          <strong className="text-slate-300 print:text-slate-800">Fall of Wickets: </strong>
          {inning.fallOfWickets.map((f: any, idx: number) => (
            <span key={idx} className="mr-2.5">
              {f.runs}/{f.wicketNumber} ({f.playerOutName}, {f.overs} ov)
              {idx < inning.fallOfWickets.length - 1 ? ',' : ''}
            </span>
          ))}
        </div>
      )}

      {/* Bowling Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs font-sans-ui">
          <thead>
            <tr className="bg-slate-950 print:bg-slate-50 text-slate-400 print:text-slate-600 font-tech font-bold uppercase border-b border-slate-800 print:border-slate-200">
              <th className="px-4 py-2">BOWLER ({bowlingTeamName})</th>
              <th className="px-3 py-2 text-right">O</th>
              <th className="px-3 py-2 text-right">M</th>
              <th className="px-3 py-2 text-right">R</th>
              <th className="px-3 py-2 text-right font-bold text-sky-400 print:text-sky-800">W</th>
              <th className="px-3 py-2 text-right">DOTS</th>
              <th className="px-4 py-2 text-right">ECON</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 print:divide-slate-200">
            {bowlersList.map((bw: any) => (
              <tr key={bw.playerId} className="hover:bg-slate-800/30">
                <td className="px-4 py-2 font-bold text-white print:text-black">{bw.name}</td>
                <td className="px-3 py-2 text-right font-mono text-slate-300 print:text-slate-700">
                  {bw.overs}
                </td>
                <td className="px-3 py-2 text-right font-mono text-slate-300 print:text-slate-700">
                  {bw.maidens}
                </td>
                <td className="px-3 py-2 text-right font-mono text-slate-300 print:text-slate-700">
                  {bw.runsConceded}
                </td>
                <td className="px-3 py-2 text-right font-display font-bold text-base text-sky-300 print:text-black">
                  {bw.wickets}
                </td>
                <td className="px-3 py-2 text-right font-mono text-slate-300 print:text-slate-700">
                  {bw.dots}
                </td>
                <td className="px-4 py-2 text-right font-mono text-slate-300 print:text-slate-700">
                  {bw.economy}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
