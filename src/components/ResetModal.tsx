import React, { useState } from 'react';
import { RotateCcw, Users, RefreshCw, Trash2, X, Trophy, Check, AlertTriangle, BookOpen } from 'lucide-react';
import { useCricket } from '../context/CricketContext';
import { triggerPrintOrDownload } from '../utils/pdfExport';

interface ResetModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ResetModal: React.FC<ResetModalProps> = ({ isOpen, onClose }) => {
  const {
    match,
    squads,
    resetMatchForNextSquads,
    clearScoresKeepTeams,
    fullWipeAll,
  } = useCricket();

  const [activeTab, setActiveTab] = useState<'next_match' | 'clear_scores' | 'full_wipe'>('next_match');

  // Option 1 Form State
  const [selectedTeamAId, setSelectedTeamAId] = useState(match.teamA?.id || squads[0]?.id || '');
  const [selectedTeamBId, setSelectedTeamBId] = useState(
    match.teamB?.id || squads[1]?.id || squads[0]?.id || ''
  );
  const [matchTitle, setMatchTitle] = useState('Match 2');
  const [tossWinnerId, setTossWinnerId] = useState(selectedTeamAId);
  const [tossDecision, setTossDecision] = useState<'bat' | 'bowl'>('bat');

  // Option 3 Confirm
  const [confirmFullWipe, setConfirmFullWipe] = useState(false);
  const [validationError, setValidationError] = useState('');

  if (!isOpen) return null;

  const handleStartNextMatch = () => {
    if (selectedTeamAId === selectedTeamBId && squads.length > 1) {
      setValidationError('Please select two different teams for the match!');
      return;
    }
    setValidationError('');
    resetMatchForNextSquads(selectedTeamAId, selectedTeamBId, {
      matchTitle,
      tossWinnerId: tossWinnerId || selectedTeamAId,
      tossDecision,
    });
    onClose();
  };

  const handleClearScores = () => {
    clearScoresKeepTeams();
    onClose();
  };

  const handleFullWipe = () => {
    fullWipeAll();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <RotateCcw className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-tech font-bold text-white uppercase tracking-wider">
                MATCH & TOURNAMENT RESET OPTIONS
              </h2>
              <p className="text-xs text-slate-400">Select how you want to reset the match or app</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Buttons */}
        <div className="grid grid-cols-3 border-b border-slate-800 bg-slate-950/40 p-1.5 gap-1.5">
          <button
            onClick={() => setActiveTab('next_match')}
            className={`py-2.5 px-3 rounded-xl font-tech font-bold text-xs flex flex-col items-center gap-1 transition ${
              activeTab === 'next_match'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>1. NEXT MATCH SQUADS</span>
          </button>

          <button
            onClick={() => setActiveTab('clear_scores')}
            className={`py-2.5 px-3 rounded-xl font-tech font-bold text-xs flex flex-col items-center gap-1 transition ${
              activeTab === 'clear_scores'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <RefreshCw className="w-4 h-4" />
            <span>2. CLEAR SCORES (0-0)</span>
          </button>

          <button
            onClick={() => setActiveTab('full_wipe')}
            className={`py-2.5 px-3 rounded-xl font-tech font-bold text-xs flex flex-col items-center gap-1 transition ${
              activeTab === 'full_wipe'
                ? 'bg-red-600 text-white shadow-md'
                : 'text-red-400 hover:bg-red-950/40'
            }`}
          >
            <Trash2 className="w-4 h-4" />
            <span>3. FULL WIPE ALL</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* TAB 1: NEXT MATCH SQUADS */}
          {activeTab === 'next_match' && (
            <div className="space-y-4">
              {validationError && (
                <div className="p-3 bg-red-950/80 border border-red-700/80 text-red-300 rounded-xl text-xs font-tech flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
                  <span>{validationError}</span>
                </div>
              )}

              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-200 leading-relaxed">
                Keep all your saved teams and squads, but set up a brand new match with 0-0 scores, select the playing teams, and configure toss!
              </div>

              <div>
                <label className="block text-xs font-tech font-bold text-slate-300 uppercase mb-1">
                  Match Title / Stage Name:
                </label>
                <input
                  type="text"
                  value={matchTitle}
                  onChange={(e) => setMatchTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-tech focus:border-amber-400 outline-none"
                  placeholder="e.g. Match 02 - Super 4"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Team A Dropdown */}
                <div>
                  <label className="block text-xs font-tech font-bold text-slate-300 uppercase mb-1">
                    Team A (Home):
                  </label>
                  <select
                    value={selectedTeamAId}
                    onChange={(e) => {
                      setSelectedTeamAId(e.target.value);
                      if (tossWinnerId === selectedTeamAId) setTossWinnerId(e.target.value);
                    }}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-tech focus:border-amber-400 outline-none"
                  >
                    {squads.map((sq) => (
                      <option key={sq.id} value={sq.id}>
                        {sq.teamName} [{sq.shortCode}]
                      </option>
                    ))}
                  </select>
                </div>

                {/* Team B Dropdown */}
                <div>
                  <label className="block text-xs font-tech font-bold text-slate-300 uppercase mb-1">
                    Team B (Away):
                  </label>
                  <select
                    value={selectedTeamBId}
                    onChange={(e) => {
                      setSelectedTeamBId(e.target.value);
                      if (tossWinnerId === selectedTeamBId) setTossWinnerId(e.target.value);
                    }}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-tech focus:border-amber-400 outline-none"
                  >
                    {squads.map((sq) => (
                      <option key={sq.id} value={sq.id}>
                        {sq.teamName} [{sq.shortCode}]
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Toss Option */}
              <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800 space-y-3">
                <div className="text-xs font-tech font-bold text-amber-400 uppercase flex items-center gap-1.5">
                  <Trophy className="w-3.5 h-3.5" /> TOSS DETAILS & ELECTION:
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-tech text-slate-400 uppercase mb-1">
                      Who won the toss?
                    </label>
                    <select
                      value={tossWinnerId}
                      onChange={(e) => setTossWinnerId(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-tech focus:border-amber-400 outline-none"
                    >
                      <option value={selectedTeamAId}>
                        {squads.find((s) => s.id === selectedTeamAId)?.teamName || 'Team A'}
                      </option>
                      <option value={selectedTeamBId}>
                        {squads.find((s) => s.id === selectedTeamBId)?.teamName || 'Team B'}
                      </option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-tech text-slate-400 uppercase mb-1">
                      Elected to:
                    </label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setTossDecision('bat')}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-tech font-bold border transition ${
                          tossDecision === 'bat'
                            ? 'bg-amber-500 text-slate-950 border-amber-400'
                            : 'bg-slate-900 text-slate-400 border-slate-700'
                        }`}
                      >
                        BAT FIRST
                      </button>
                      <button
                        type="button"
                        onClick={() => setTossDecision('bowl')}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-tech font-bold border transition ${
                          tossDecision === 'bowl'
                            ? 'bg-amber-500 text-slate-950 border-amber-400'
                            : 'bg-slate-900 text-slate-400 border-slate-700'
                        }`}
                      >
                        BOWL FIRST
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <button
                onClick={handleStartNextMatch}
                className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-tech font-black text-sm uppercase tracking-wider transition shadow-lg flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4" /> START NEW MATCH (0-0)
              </button>
            </div>
          )}

          {/* TAB 2: CLEAR SCORES KEEP TEAMS */}
          {activeTab === 'clear_scores' && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                <div className="text-sm font-tech font-bold text-white uppercase">
                  CURRENT MATCH: {match.teamA.teamName} vs {match.teamB.teamName}
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  This action clears all scores, wickets, overs, and ball-by-ball delivery history back to 0-0. Both teams, player squads, and match settings remain intact.
                </p>
              </div>

              <div className="p-4 bg-sky-950/40 border border-sky-800/60 rounded-xl text-xs text-sky-200">
                Ideal for restarting the current match or starting a quick rematch between the same two teams.
              </div>

              <button
                onClick={handleClearScores}
                className="w-full py-3 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-tech font-black text-sm uppercase tracking-wider transition shadow-lg flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" /> RESET CURRENT MATCH SCORES (0-0)
              </button>
            </div>
          )}

          {/* TAB 3: FULL WIPE (NO DEMOS) */}
          {activeTab === 'full_wipe' && (
            <div className="space-y-4">
              <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="text-xs font-tech text-amber-200">
                  <span className="font-bold text-amber-400 uppercase block mb-0.5">Need to preserve tournament scorecards?</span>
                  Download or print all match scorecards before completing the factory reset.
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const tournamentName = match.settings.tournamentName || 'Tournament';
                    triggerPrintOrDownload(
                      'printable-tournament-book',
                      `${tournamentName} - Complete Official Scorecards Book`,
                      `${tournamentName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_complete_scorecards_book.html`
                    );
                  }}
                  className="px-3 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-tech font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow active:scale-95 shrink-0"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  DOWNLOAD SCORECARDS
                </button>
              </div>

              <div className="p-4 bg-red-950/40 border border-red-800/80 rounded-xl flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                <div className="text-xs text-red-200 leading-relaxed space-y-1">
                  <div className="font-tech font-bold text-sm text-red-400 uppercase">
                    FULL WIPE & RESTORE CLEAN STATE
                  </div>
                  <p>
                    This permanently deletes all demo squads, custom teams, saved points tables, tournament statistics, fixtures, and scorecards.
                  </p>
                  <p className="font-semibold text-white">
                    You will start with a completely fresh tournament ready for your own real squads!
                  </p>
                </div>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex items-center gap-3">
                <input
                  type="checkbox"
                  id="confirm-wipe"
                  checked={confirmFullWipe}
                  onChange={(e) => setConfirmFullWipe(e.target.checked)}
                  className="w-4 h-4 text-red-600 rounded bg-slate-900 border-slate-700 focus:ring-0"
                />
                <label htmlFor="confirm-wipe" className="text-xs font-tech text-slate-300 select-none cursor-pointer">
                  I understand this will delete all demo teams, fixtures, and saved points table.
                </label>
              </div>

              <button
                disabled={!confirmFullWipe}
                onClick={handleFullWipe}
                className={`w-full py-3 rounded-xl font-tech font-black text-sm uppercase tracking-wider transition shadow-lg flex items-center justify-center gap-2 ${
                  confirmFullWipe
                    ? 'bg-red-600 hover:bg-red-500 text-white cursor-pointer'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                }`}
              >
                <Trash2 className="w-4 h-4" /> DELETE ALL & START COMPLETELY FRESH
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
