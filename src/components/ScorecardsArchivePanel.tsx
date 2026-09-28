import React, { useState, useMemo } from 'react';
import {
  BookOpen,
  Download,
  Printer,
  RotateCcw,
  Trophy,
  Search,
  Calendar,
  MapPin,
  FileSpreadsheet,
  Award,
  Flame,
  Star,
  CheckCircle2,
  Clock,
  Trash2,
  FileText,
  Shield,
  Layers,
  Sparkles,
  ChevronRight,
} from 'lucide-react';
import { useCricket } from '../context/CricketContext';
import { MatchState } from '../types';
import { triggerPrintOrDownload } from '../utils/pdfExport';
import { MatchScorecardSheet } from './FullMatchScorecard';

export interface ScorecardsArchivePanelProps {
  onOpenScorecardForMatch: (match: MatchState) => void;
  onOpenResetModal: () => void;
}

export const ScorecardsArchivePanel: React.FC<ScorecardsArchivePanelProps> = ({
  onOpenScorecardForMatch,
  onOpenResetModal,
}) => {
  const {
    match: currentMatch,
    completedMatches,
    tournamentStats,
    squads,
    stages,
    fixtures,
    deleteCompletedMatch,
    archiveCurrentMatch,
    getTeamLogo,
  } = useCricket();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'active'>('all');
  const [teamFilter, setTeamFilter] = useState<string>('all');
  const [matchToDelete, setMatchToDelete] = useState<string | null>(null);

  // Combine completed matches and current active match safely
  const allTournamentMatches = useMemo(() => {
    const list: MatchState[] = [];
    const seenIds = new Set<string>();

    // Completed matches first
    completedMatches.forEach((m) => {
      list.push(m);
      seenIds.add(m.id);
    });

    // Add current match if not already recorded and it has activity
    if (!seenIds.has(currentMatch.id)) {
      const hasBalls =
        (currentMatch.inning1?.deliveries?.length || 0) > 0 ||
        (currentMatch.inning2?.deliveries?.length || 0) > 0;
      if (hasBalls || currentMatch.status === 'completed') {
        list.push(currentMatch);
      }
    }

    return list;
  }, [completedMatches, currentMatch]);

  // Filter matches based on search query, status, and team
  const filteredMatches = useMemo(() => {
    return allTournamentMatches.filter((m) => {
      const isCurrentActive = m.id === currentMatch.id && m.status !== 'completed';
      const isCompleted = m.status === 'completed' || !isCurrentActive;

      // Status filter
      if (statusFilter === 'completed' && !isCompleted) return false;
      if (statusFilter === 'active' && !isCurrentActive) return false;

      // Team filter
      if (teamFilter !== 'all') {
        if (m.teamA.id !== teamFilter && m.teamB.id !== teamFilter) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const titleMatch = (m.settings?.matchTitle || '').toLowerCase().includes(q);
        const tourneyMatch = (m.settings?.tournamentName || '').toLowerCase().includes(q);
        const teamAMatch = m.teamA.teamName.toLowerCase().includes(q) || m.teamA.shortCode.toLowerCase().includes(q);
        const teamBMatch = m.teamB.teamName.toLowerCase().includes(q) || m.teamB.shortCode.toLowerCase().includes(q);
        const venueMatch = (m.settings?.venue || '').toLowerCase().includes(q);
        const winDescMatch = (m.winDescription || '').toLowerCase().includes(q);
        return titleMatch || tourneyMatch || teamAMatch || teamBMatch || venueMatch || winDescMatch;
      }

      return true;
    });
  }, [allTournamentMatches, currentMatch, statusFilter, teamFilter, searchQuery]);

  // Overall tournament totals calculation
  const tournamentTotals = useMemo(() => {
    let totalRuns = 0;
    let totalWickets = 0;

    allTournamentMatches.forEach((m) => {
      totalRuns += (m.inning1?.totalRuns || 0) + (m.inning2?.totalRuns || 0);
      totalWickets += (m.inning1?.wickets || 0) + (m.inning2?.wickets || 0);
      if (m.superOver?.active) {
        totalRuns += (m.superOver.inning1?.totalRuns || 0) + (m.superOver.inning2?.totalRuns || 0);
        totalWickets += (m.superOver.inning1?.wickets || 0) + (m.superOver.inning2?.wickets || 0);
      }
    });

    return {
      totalMatches: allTournamentMatches.length,
      completedMatchesCount: allTournamentMatches.filter(
        (m) => m.status === 'completed' || (m.id !== currentMatch.id && m.winDescription)
      ).length,
      totalRuns,
      totalWickets,
      totalSixes: tournamentStats.totalSixes,
      totalFours: tournamentStats.totalFours,
      topScorer: tournamentStats.mostRuns[0],
      topWicketTaker: tournamentStats.mostWickets[0],
    };
  }, [allTournamentMatches, currentMatch, tournamentStats]);

  // Export Complete Tournament Scorecard Book
  const handleDownloadTournamentBook = () => {
    const tournamentName = currentMatch.settings.tournamentName || 'Tournament';
    triggerPrintOrDownload(
      'printable-tournament-book',
      `${tournamentName} - Complete Official Scorecards Book`,
      `${tournamentName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_complete_scorecards_book.html`
    );
  };

  // Export Complete Tournament JSON Backup
  const handleExportJsonBackup = () => {
    const backupData = {
      exportedAt: new Date().toISOString(),
      tournamentName: currentMatch.settings.tournamentName,
      venue: currentMatch.settings.venue,
      totals: tournamentTotals,
      tournamentStats,
      completedMatches,
      currentMatch,
      squads,
      stages,
      fixtures,
    };

    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(backupData, null, 2)
    )}`;
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', jsonString);
    downloadAnchor.setAttribute(
      'download',
      `${(currentMatch.settings.tournamentName || 'cricket_tournament')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '_')}_backup_${new Date().toISOString().split('T')[0]}.json`
    );
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Quick single match PDF download
  const handleDownloadSingleMatch = (matchToDownload: MatchState) => {
    onOpenScorecardForMatch(matchToDownload);
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* HEADER SECTION */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-1 rounded bg-amber-500/10 text-amber-400 font-tech font-bold text-xs uppercase tracking-wider border border-amber-500/20 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5" /> OFFICIAL ARCHIVE
              </span>
              <span className="text-xs font-tech text-slate-400">
                {currentMatch.settings.tournamentName}
              </span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-display font-black tracking-tight text-white uppercase">
              TOURNAMENT SCORECARDS ARCHIVE
            </h1>
            <p className="text-sm font-sans-ui text-slate-400 mt-1 max-w-2xl">
              Access, review, and print official scorecards for every tournament match in one place.
              Download the complete tournament scorecard book or export full data before performing a factory reset.
            </p>
          </div>

          {/* MASTER ACTIONS */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleDownloadTournamentBook}
              className="px-5 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-tech font-black text-xs uppercase tracking-wider shadow-xl shadow-amber-500/10 flex items-center gap-2 transition active:scale-95"
              title="Download/Print full tournament scorecards book with cover, points table & all match scorecards"
            >
              <BookOpen className="w-4 h-4" />
              DOWNLOAD ALL SCORECARDS (PDF BOOK)
            </button>

            <button
              onClick={handleExportJsonBackup}
              className="px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-tech font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition"
              title="Export complete tournament backup as JSON before resetting"
            >
              <Download className="w-4 h-4 text-sky-400" />
              BACKUP DATA (JSON)
            </button>

            <button
              onClick={onOpenResetModal}
              className="px-4 py-3 rounded-xl bg-red-950/40 hover:bg-red-900/60 text-red-300 border border-red-800/60 font-tech font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition"
              title="Reset tournament or perform full factory reset"
            >
              <RotateCcw className="w-4 h-4 text-red-400" />
              FACTORY RESET
            </button>
          </div>
        </div>

        {/* TOURNAMENT SUMMARY STATS BAR */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-8 pt-6 border-t border-slate-800">
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3">
            <div className="text-[11px] font-tech text-slate-400 uppercase">MATCHES RECORDED</div>
            <div className="text-xl sm:text-2xl font-display font-black text-white mt-0.5">
              {tournamentTotals.totalMatches}{' '}
              <span className="text-xs font-tech font-normal text-slate-400">
                ({tournamentTotals.completedMatchesCount} finished)
              </span>
            </div>
          </div>

          <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3">
            <div className="text-[11px] font-tech text-slate-400 uppercase">TOTAL RUNS</div>
            <div className="text-xl sm:text-2xl font-display font-black text-amber-400 mt-0.5">
              {tournamentTotals.totalRuns.toLocaleString()}
            </div>
          </div>

          <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3">
            <div className="text-[11px] font-tech text-slate-400 uppercase">TOTAL BOUNDARIES</div>
            <div className="text-xl sm:text-2xl font-display font-black text-white mt-0.5">
              <span className="text-amber-400">{tournamentTotals.totalSixes}</span>{' '}
              <span className="text-xs font-tech text-slate-400">6s</span> •{' '}
              <span className="text-sky-400">{tournamentTotals.totalFours}</span>{' '}
              <span className="text-xs font-tech text-slate-400">4s</span>
            </div>
          </div>

          <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3">
            <div className="text-[11px] font-tech text-slate-400 uppercase">WICKETS FALLEN</div>
            <div className="text-xl sm:text-2xl font-display font-black text-rose-400 mt-0.5">
              {tournamentTotals.totalWickets}
            </div>
          </div>

          <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3">
            <div className="text-[11px] font-tech text-amber-400 uppercase flex items-center gap-1">
              <Flame className="w-3 h-3 text-amber-400" /> ORANGE CAP (RUNS)
            </div>
            <div className="text-sm font-tech font-bold text-white truncate mt-0.5">
              {tournamentTotals.topScorer ? (
                <>
                  {tournamentTotals.topScorer.name}{' '}
                  <span className="text-amber-400 font-display text-base">
                    ({tournamentTotals.topScorer.value})
                  </span>
                </>
              ) : (
                <span className="text-slate-500 italic">None yet</span>
              )}
            </div>
          </div>

          <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3">
            <div className="text-[11px] font-tech text-purple-400 uppercase flex items-center gap-1">
              <Star className="w-3 h-3 text-purple-400" /> PURPLE CAP (WKTS)
            </div>
            <div className="text-sm font-tech font-bold text-white truncate mt-0.5">
              {tournamentTotals.topWicketTaker ? (
                <>
                  {tournamentTotals.topWicketTaker.name}{' '}
                  <span className="text-purple-400 font-display text-base">
                    ({tournamentTotals.topWicketTaker.value}w)
                  </span>
                </>
              ) : (
                <span className="text-slate-500 italic">None yet</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* FILTER & SEARCH CONTROLS */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-lg">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search match, team, venue, result..."
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-xs font-sans-ui text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* Status filter */}
          <div className="flex bg-slate-950 border border-slate-800 rounded-lg p-1">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded text-xs font-tech font-bold transition ${
                statusFilter === 'all'
                  ? 'bg-amber-500 text-slate-950'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              ALL ({allTournamentMatches.length})
            </button>
            <button
              onClick={() => setStatusFilter('completed')}
              className={`px-3 py-1.5 rounded text-xs font-tech font-bold transition ${
                statusFilter === 'completed'
                  ? 'bg-amber-500 text-slate-950'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              COMPLETED ({tournamentTotals.completedMatchesCount})
            </button>
            <button
              onClick={() => setStatusFilter('active')}
              className={`px-3 py-1.5 rounded text-xs font-tech font-bold transition ${
                statusFilter === 'active'
                  ? 'bg-amber-500 text-slate-950'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              ACTIVE
            </button>
          </div>

          {/* Team filter */}
          <select
            value={teamFilter}
            onChange={(e) => setTeamFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-xs font-tech text-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:border-amber-500"
          >
            <option value="all">ALL TEAMS</option>
            {squads.map((s) => (
              <option key={s.id} value={s.id}>
                {s.teamName} ({s.shortCode})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* MATCHES LIST */}
      {filteredMatches.length === 0 ? (
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-12 text-center">
          <FileText className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="font-tech font-bold text-lg text-white uppercase">
            No Scorecards Found
          </h3>
          <p className="text-xs font-sans-ui text-slate-400 mt-1 max-w-md mx-auto">
            {allTournamentMatches.length === 0
              ? 'No matches have been played yet. Matches are automatically archived here as you score balls in the Scoring Console or finish matches in the tournament.'
              : 'No matches matched your current search filters. Try clearing the search or switching the filter tab.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredMatches.map((m, index) => {
            const isLiveActive = m.id === currentMatch.id && m.status !== 'completed';
            const tossWinner = m.tossWinnerId === m.teamA.id ? m.teamA : m.teamB;

            // Inning 1 batting & bowling teams
            const inn1BatTeam = m.inning1.battingTeamName;
            const inn1Runs = m.inning1.totalRuns;
            const inn1Wkts = m.inning1.wickets;
            const inn1Overs = m.inning1.oversFormatted;

            // Inning 2 batting & bowling teams
            const inn2BatTeam = m.inning2.battingTeamName;
            const inn2Runs = m.inning2.totalRuns;
            const inn2Wkts = m.inning2.wickets;
            const inn2Overs = m.inning2.oversFormatted;

            // Top performers of this match
            const allMatchBatsmen = [
              ...Object.values(m.inning1?.batsmen || {}),
              ...Object.values(m.inning2?.batsmen || {}),
            ].filter((b: any) => b.runs > 0 || b.balls > 0);
            allMatchBatsmen.sort((a: any, b: any) => b.runs - a.runs);
            const bestBatter = allMatchBatsmen[0];

            const allMatchBowlers = [
              ...Object.values(m.inning1?.bowlers || {}),
              ...Object.values(m.inning2?.bowlers || {}),
            ].filter((bw: any) => bw.legalBalls > 0 || bw.runsConceded > 0);
            allMatchBowlers.sort(
              (a: any, b: any) => b.wickets - a.wickets || a.runsConceded - b.runsConceded
            );
            const bestBowler = allMatchBowlers[0];

            return (
              <div
                key={m.id}
                className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 shadow-xl transition flex flex-col justify-between"
              >
                <div>
                  {/* Card Top Metadata */}
                  <div className="flex items-center justify-between gap-2 pb-3 mb-3 border-b border-slate-800/80">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-slate-400">
                        #{index + 1}
                      </span>
                      <h3 className="font-tech font-bold text-sm text-white uppercase truncate">
                        {m.settings.matchTitle || `Match ${index + 1}`}
                      </h3>
                    </div>

                    <div className="flex items-center gap-2">
                      {isLiveActive ? (
                        <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/40 text-[10px] font-tech font-bold uppercase flex items-center gap-1 animate-pulse">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                          LIVE MATCH
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-tech font-bold uppercase flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          COMPLETED
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Date & Venue */}
                  <div className="flex items-center gap-4 text-xs font-tech text-slate-400 mb-4">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-500" />
                      {m.settings.date || 'Today'}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-500" />
                      {m.settings.venue || 'Main Ground'}
                    </span>
                  </div>

                  {/* TEAMS & SCORES SUMMARY BOX */}
                  <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-4 space-y-3 mb-4">
                    {/* Innings 1 Team */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center font-tech font-bold text-xs text-amber-400">
                          {m.inning1.battingTeamCode || m.teamA.shortCode}
                        </div>
                        <div>
                          <div className="font-tech font-bold text-sm text-white">
                            {inn1BatTeam}
                          </div>
                          <div className="text-[10px] font-tech text-slate-400">1st Innings</div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="font-display font-bold text-xl text-white">
                          {inn1Runs}/{inn1Wkts}
                        </div>
                        <div className="text-[11px] font-tech text-slate-400">
                          {inn1Overs} ov
                        </div>
                      </div>
                    </div>

                    <div className="h-px bg-slate-800/60" />

                    {/* Innings 2 Team */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center font-tech font-bold text-xs text-sky-400">
                          {m.inning2.battingTeamCode || m.teamB.shortCode}
                        </div>
                        <div>
                          <div className="font-tech font-bold text-sm text-white">
                            {inn2BatTeam}
                          </div>
                          <div className="text-[10px] font-tech text-slate-400">2nd Innings</div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="font-display font-bold text-xl text-white">
                          {inn2Runs}/{inn2Wkts}
                        </div>
                        <div className="text-[11px] font-tech text-slate-400">
                          {inn2Overs} ov
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* RESULT BANNER */}
                  {m.winDescription ? (
                    <div className="bg-amber-500/10 border border-amber-500/30 text-amber-300 px-3 py-2 rounded-lg text-xs font-tech font-bold uppercase mb-4 flex items-center gap-2">
                      <Trophy className="w-4 h-4 text-amber-400 flex-shrink-0" />
                      <span className="truncate">{m.winDescription}</span>
                    </div>
                  ) : (
                    <div className="bg-slate-950 border border-slate-800 text-slate-400 px-3 py-2 rounded-lg text-xs font-tech mb-4">
                      Toss won by {tossWinner.teamName}, elected to {m.tossDecision}.
                    </div>
                  )}

                  {/* MATCH HIGHLIGHTS CHIPS */}
                  <div className="grid grid-cols-2 gap-2 text-xs font-tech mb-4">
                    <div className="bg-slate-950/60 border border-slate-800/60 rounded-lg p-2.5">
                      <div className="text-[10px] text-amber-400 font-bold uppercase flex items-center gap-1">
                        <Flame className="w-3 h-3" /> BEST BATSMAN
                      </div>
                      <div className="font-bold text-white truncate mt-0.5">
                        {bestBatter ? (
                          <>
                            {bestBatter.name} •{' '}
                            <span className="text-amber-400 font-display text-sm">
                              {bestBatter.runs} ({bestBatter.balls}b)
                            </span>
                          </>
                        ) : (
                          <span className="text-slate-500 italic">None</span>
                        )}
                      </div>
                    </div>

                    <div className="bg-slate-950/60 border border-slate-800/60 rounded-lg p-2.5">
                      <div className="text-[10px] text-sky-400 font-bold uppercase flex items-center gap-1">
                        <Star className="w-3 h-3" /> BEST BOWLER
                      </div>
                      <div className="font-bold text-white truncate mt-0.5">
                        {bestBowler ? (
                          <>
                            {bestBowler.name} •{' '}
                            <span className="text-sky-400 font-display text-sm">
                              {bestBowler.wickets}/{bestBowler.runsConceded}
                            </span>
                          </>
                        ) : (
                          <span className="text-slate-500 italic">None</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* CARD ACTIONS */}
                <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onOpenScorecardForMatch(m)}
                      className="px-3.5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-tech font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 transition active:scale-95"
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      VIEW SCORECARD
                    </button>

                    <button
                      onClick={() => handleDownloadSingleMatch(m)}
                      className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-tech font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 transition"
                      title="Download individual match scorecard as PDF"
                    >
                      <Printer className="w-3.5 h-3.5 text-amber-400" />
                      PDF
                    </button>
                  </div>

                  {m.id !== currentMatch.id && (
                    <button
                      onClick={() => {
                        if (window.confirm(`Delete Match "${m.settings.matchTitle}" from archive?`)) {
                          deleteCompletedMatch(m.id);
                        }
                      }}
                      className="p-2 rounded-lg hover:bg-red-950/50 text-slate-500 hover:text-red-400 transition"
                      title="Remove match from archive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* OFF-SCREEN COMPLETE TOURNAMENT BOOK PRINTABLE CONTAINER */}
      <div id="printable-tournament-book" className="hidden">
        {/* TOURNAMENT BOOK COVER PAGE */}
        <div className="page-cover p-8 border-b-4 border-amber-500 mb-8 font-sans-ui">
          <div className="text-xs font-tech font-bold uppercase tracking-widest text-amber-600 mb-1">
            DEZIGLO SOFT • OFFICIAL TOURNAMENT ARCHIVE & SCORECARD BOOK
          </div>
          <h1 className="text-4xl font-display font-black text-black uppercase mb-2">
            {currentMatch.settings.tournamentName}
          </h1>
          <div className="text-sm font-tech text-slate-600 mb-6">
            VENUE: {currentMatch.settings.venue} • DATED: {currentMatch.settings.date}
          </div>

          <div className="border-box bg-slate-50 p-4 rounded-lg mb-6">
            <h2 className="font-tech font-bold text-base text-slate-900 uppercase mb-3">
              TOURNAMENT SUMMARY & HONORS
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
              <div>
                <div style={{ fontSize: '11px', color: '#64748b' }}>TOTAL MATCHES</div>
                <div style={{ fontSize: '20px', fontWeight: 'bold' }}>{tournamentTotals.totalMatches}</div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: '#64748b' }}>TOTAL RUNS</div>
                <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#d97706' }}>
                  {tournamentTotals.totalRuns}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: '#64748b' }}>BOUNDARIES</div>
                <div style={{ fontSize: '16px', fontWeight: 'bold' }}>
                  {tournamentTotals.totalSixes} Sixes, {tournamentTotals.totalFours} Fours
                </div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: '#64748b' }}>TOTAL WICKETS</div>
                <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#dc2626' }}>
                  {tournamentTotals.totalWickets}
                </div>
              </div>
            </div>
          </div>

          {/* Leaderboards in Cover Page */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <h3 style={{ fontSize: '13px', fontWeight: 'bold', color: '#d97706', marginBottom: '6px' }}>
                TOP 5 RUN SCORERS (ORANGE CAP)
              </h3>
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>BATSMAN</th>
                    <th>TEAM</th>
                    <th style={{ textAlign: 'right' }}>RUNS</th>
                  </tr>
                </thead>
                <tbody>
                  {tournamentStats.mostRuns.slice(0, 5).map((r, i) => (
                    <tr key={r.id}>
                      <td>{i + 1}</td>
                      <td>{r.name}</td>
                      <td>{r.teamCode}</td>
                      <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{r.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div>
              <h3 style={{ fontSize: '13px', fontWeight: 'bold', color: '#0284c7', marginBottom: '6px' }}>
                TOP 5 WICKET TAKERS (PURPLE CAP)
              </h3>
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>BOWLER</th>
                    <th>TEAM</th>
                    <th style={{ textAlign: 'right' }}>WKTS</th>
                  </tr>
                </thead>
                <tbody>
                  {tournamentStats.mostWickets.slice(0, 5).map((w, i) => (
                    <tr key={w.id}>
                      <td>{i + 1}</td>
                      <td>{w.name}</td>
                      <td>{w.teamCode}</td>
                      <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{w.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* ALL INDIVIDUAL MATCH SCORECARDS */}
        {allTournamentMatches.map((m, idx) => (
          <div key={m.id} style={{ pageBreakBefore: 'always', marginTop: '24px' }}>
            <div style={{ padding: '8px 12px', background: '#0f172a', color: '#fff', fontSize: '12px', fontWeight: 'bold', borderRadius: '4px', marginBottom: '12px' }}>
              MATCH {idx + 1} OF {allTournamentMatches.length} • {m.settings.matchTitle}
            </div>
            <MatchScorecardSheet match={m} showSignatures={true} />
          </div>
        ))}
      </div>
    </div>
  );
};
