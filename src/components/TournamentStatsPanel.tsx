import React, { useState, useMemo } from 'react';
import { Trophy, Award, Flame, Target, Zap, Shield, Printer } from 'lucide-react';
import { useCricket, getUniqueTournamentMatches, calculateTournamentStats } from '../context/CricketContext';
import { triggerPrintOrDownload } from '../utils/pdfExport';

export const TournamentStatsPanel: React.FC = () => {
  const { tournamentStats, updateTournamentStats, squads, match, completedMatches } = useCricket();

  const [activeTab, setActiveTab] = useState<'runs' | 'wickets' | 'sixes' | 'fours' | 'fielders'>('runs');

  // Manual counter adjustment modal / inline
  const [editCounters, setEditCounters] = useState(false);
  const [sixesInput, setSixesInput] = useState(tournamentStats.totalSixes);
  const [foursInput, setFoursInput] = useState(tournamentStats.totalFours);
  const [dotsInput, setDotsInput] = useState(tournamentStats.totalDots);

  // Pure, mathematically sound deduplication from unique match events:
  // - No duplicate counting if match is re-rendered, edited, or reloaded
  // - Batter runs count ONLY runs scored off bat
  // - Bowler wickets count ONLY bowler-credited wickets
  // - Sixes and Fours count actual batter boundaries
  // - Fielders count catches, run-outs, and stumpings separately
  const uniqueStats = useMemo(() => {
    const uniqueMatches = getUniqueTournamentMatches(match, completedMatches);
    return calculateTournamentStats(uniqueMatches, squads, {
      totalSixes: tournamentStats.totalSixes,
      totalFours: tournamentStats.totalFours,
      totalDots: tournamentStats.totalDots,
    });
  }, [match, completedMatches, squads, tournamentStats.totalSixes, tournamentStats.totalFours, tournamentStats.totalDots]);

  const handleSaveCounters = () => {
    updateTournamentStats({
      totalSixes: Number(sixesInput),
      totalFours: Number(foursInput),
      totalDots: Number(dotsInput),
    });
    setEditCounters(false);
  };

  const handleDownloadStats = () => {
    triggerPrintOrDownload(
      'tournament-stats-container',
      'DEZIGLO SOFT - Tournament Leaderboards & Statistics',
      'tournament_stats_report.html'
    );
  };

  return (
    <div id="tournament-stats-container" className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl font-sans-ui space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-amber-400" />
          <h2 className="font-tech font-bold text-lg text-white tracking-wide uppercase">
            TOURNAMENT LEADERBOARDS & STATS (TOP 10)
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleDownloadStats}
            className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-tech font-black text-xs uppercase flex items-center gap-1.5 transition shadow"
          >
            <Printer className="w-3.5 h-3.5" /> DOWNLOAD STATS PDF
          </button>

          <button
            onClick={() => {
              setSixesInput(tournamentStats.totalSixes);
              setFoursInput(tournamentStats.totalFours);
              setDotsInput(tournamentStats.totalDots);
              setEditCounters(!editCounters);
            }}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-tech font-bold text-xs uppercase transition"
          >
            {editCounters ? 'CLOSE EDITOR' : 'EDIT TOURNAMENT TOTALS'}
          </button>
        </div>
      </div>

      {/* BIG 3 MILESTONE COUNTERS: SIXES, FOURS, DOTS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Sixes Card */}
        <div className="bg-gradient-to-br from-purple-950/80 to-slate-950 p-5 rounded-2xl border border-purple-600/40 shadow-lg text-center relative overflow-hidden">
          <div className="absolute top-2 right-2 text-purple-400/20 font-display text-7xl font-black pointer-events-none">
            6
          </div>
          <div className="text-xs font-tech font-bold text-purple-400 uppercase tracking-widest mb-1 flex items-center justify-center gap-1.5">
            <Zap className="w-4 h-4 text-purple-400" /> TOURNAMENT SIXES
          </div>
          <div className="font-display font-black text-5xl sm:text-6xl text-white tracking-tight leading-none my-2">
            {tournamentStats.totalSixes}
          </div>
          <p className="text-[11px] text-purple-300 font-tech">
            Pops up for 5s on Scoreboard when 6 is marked
          </p>
        </div>

        {/* Fours Card */}
        <div className="bg-gradient-to-br from-emerald-950/80 to-slate-950 p-5 rounded-2xl border border-emerald-600/40 shadow-lg text-center relative overflow-hidden">
          <div className="absolute top-2 right-2 text-emerald-400/20 font-display text-7xl font-black pointer-events-none">
            4
          </div>
          <div className="text-xs font-tech font-bold text-emerald-400 uppercase tracking-widest mb-1 flex items-center justify-center gap-1.5">
            <Flame className="w-4 h-4 text-emerald-400" /> TOURNAMENT FOURS
          </div>
          <div className="font-display font-black text-5xl sm:text-6xl text-white tracking-tight leading-none my-2">
            {tournamentStats.totalFours}
          </div>
          <p className="text-[11px] text-emerald-300 font-tech">
            Pops up for 5s on Scoreboard when 4 is marked
          </p>
        </div>

        {/* Dots Card */}
        <div className="bg-gradient-to-br from-sky-950/80 to-slate-950 p-5 rounded-2xl border border-sky-600/40 shadow-lg text-center relative overflow-hidden">
          <div className="absolute top-2 right-2 text-sky-400/20 font-display text-7xl font-black pointer-events-none">
            •
          </div>
          <div className="text-xs font-tech font-bold text-sky-400 uppercase tracking-widest mb-1 flex items-center justify-center gap-1.5">
            <Target className="w-4 h-4 text-sky-400" /> TOURNAMENT DOTS
          </div>
          <div className="font-display font-black text-5xl sm:text-6xl text-white tracking-tight leading-none my-2">
            {tournamentStats.totalDots}
          </div>
          <p className="text-[11px] text-sky-300 font-tech">
            Pops up for 5s on Scoreboard when 0 is marked
          </p>
        </div>
      </div>

      {/* COUNTERS EDITOR */}
      {editCounters && (
        <div className="bg-slate-950 p-4 rounded-xl border border-amber-500/50 flex flex-wrap items-center gap-4 text-xs font-tech">
          <span className="font-bold text-amber-400 uppercase">UPDATE BASELINE TOTALS:</span>
          <div className="flex items-center gap-2">
            <label className="text-slate-400">Sixes:</label>
            <input
              type="number"
              value={sixesInput}
              onChange={(e) => setSixesInput(parseInt(e.target.value) || 0)}
              className="w-20 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white font-mono"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-slate-400">Fours:</label>
            <input
              type="number"
              value={foursInput}
              onChange={(e) => setFoursInput(parseInt(e.target.value) || 0)}
              className="w-20 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white font-mono"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-slate-400">Dots:</label>
            <input
              type="number"
              value={dotsInput}
              onChange={(e) => setDotsInput(parseInt(e.target.value) || 0)}
              className="w-20 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white font-mono"
            />
          </div>
          <button
            onClick={handleSaveCounters}
            className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold uppercase shadow"
          >
            SAVE VALUES
          </button>
        </div>
      )}

      {/* TAB SELECTOR: TOP 10 CATEGORIES */}
      <div className="flex items-center gap-2 overflow-x-auto border-b border-slate-800 pb-2">
        {[
          { id: 'runs', label: 'MOST RUNS (10)', icon: Trophy, color: 'text-amber-400' },
          { id: 'wickets', label: 'MOST WICKETS (10)', icon: Shield, color: 'text-sky-400' },
          { id: 'sixes', label: 'MOST SIXES (10)', icon: Zap, color: 'text-purple-400' },
          { id: 'fours', label: 'MOST FOURS (10)', icon: Flame, color: 'text-emerald-400' },
          { id: 'fielders', label: 'BEST FIELDERS (10)', icon: Award, color: 'text-yellow-400' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2 rounded-xl font-tech font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 transition whitespace-nowrap border ${
              activeTab === tab.id
                ? 'bg-slate-800 text-white border-amber-400 shadow-md'
                : 'bg-transparent text-slate-400 border-transparent hover:text-white'
            }`}
          >
            <tab.icon className={`w-4 h-4 ${tab.color}`} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* TOP 10 PLAYERS TABLE */}
      <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950">
        <table className="w-full text-left text-xs font-sans-ui">
          <thead>
            <tr className="bg-slate-900 text-slate-400 font-tech font-bold uppercase tracking-wider border-b border-slate-800">
              <th className="px-4 py-3 text-center w-16">RANK</th>
              <th className="px-4 py-3">PLAYER NAME</th>
              <th className="px-4 py-3">TEAM</th>
              <th className="px-4 py-3 text-right">
                {activeTab === 'runs'
                  ? 'TOTAL RUNS'
                  : activeTab === 'wickets'
                  ? 'TOTAL WICKETS'
                  : activeTab === 'sixes'
                  ? 'TOTAL 6s'
                  : activeTab === 'fours'
                  ? 'TOTAL 4s'
                  : 'CATCHES & RUN OUTS'}
              </th>
              <th className="px-4 py-3 text-right">SECONDARY STAT</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/80 font-tech">
            {(() => {
              const list =
                activeTab === 'runs'
                  ? uniqueStats.mostRuns
                  : activeTab === 'wickets'
                  ? uniqueStats.mostWickets
                  : activeTab === 'sixes'
                  ? uniqueStats.mostSixes
                  : activeTab === 'fours'
                  ? uniqueStats.mostFours
                  : uniqueStats.bestFielders;

              if (list.length === 0) {
                return (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-500 font-tech italic">
                      No players recorded for this category yet. Register squads or score matches to auto-list top performers!
                    </td>
                  </tr>
                );
              }

              return list.slice(0, 10).map((player, idx) => (
                <tr
                  key={player.id || idx}
                  className={`hover:bg-slate-900/60 transition ${
                    idx === 0 ? 'bg-amber-500/10' : idx === 1 ? 'bg-slate-800/40' : ''
                  }`}
                >
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`w-6 h-6 rounded-full inline-flex items-center justify-center font-mono font-bold text-xs ${
                        idx === 0
                          ? 'bg-amber-500 text-slate-950'
                          : idx === 1
                          ? 'bg-slate-600 text-white'
                          : idx === 2
                          ? 'bg-amber-800 text-white'
                          : 'text-slate-400'
                      }`}
                    >
                      {idx + 1}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-bold text-sm text-white">{player.name}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded bg-slate-900 text-amber-400 font-mono font-bold text-xs border border-slate-800">
                      {player.teamCode}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-display font-bold text-2xl text-white">
                    {player.value}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-xs text-slate-400">
                    {player.secondaryValue || '-'}
                  </td>
                </tr>
              ));
            })()}
          </tbody>
        </table>
      </div>
    </div>
  );
};
