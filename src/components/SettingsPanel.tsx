import React, { useEffect, useState } from 'react';
import { Settings, Check, Users, MapPin, Calendar, Trophy, Clock, Shield, RefreshCw, Download, ExternalLink } from 'lucide-react';
import { useCricket } from '../context/CricketContext';
import { MatchSettings } from '../types';

export const SettingsPanel: React.FC = () => {
  const { match, squads, updateMatchSettings, assignTeamsAndToss } = useCricket();

  const [form, setForm] = useState<MatchSettings>({ ...match.settings });
  const [selectedTeamAId, setSelectedTeamAId] = useState<string>(match.teamA?.id || squads[0]?.id || '');
  const [selectedTeamBId, setSelectedTeamBId] = useState<string>(
    match.teamB?.id || squads[1]?.id || squads[0]?.id || ''
  );
  const [tossWinnerId, setTossWinnerId] = useState<string>(match.tossWinnerId || match.teamA?.id || squads[0]?.id || '');
  const [tossDecision, setTossDecision] = useState<'bat' | 'bowl'>(match.tossDecision || 'bat');

  const [savedSuccess, setSavedSuccess] = useState(false);
  const [appVersion, setAppVersion] = useState('1.0.2');
  const [updateStatus, setUpdateStatus] = useState('Ready to check for updates.');
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);

  useEffect(() => {
    const updater = (window as any).dezigloUpdater;
    if (!updater) return;

    updater.getVersion?.().then((version: string) => setAppVersion(version)).catch(() => {});
    const unsubscribe = updater.onStatus?.((payload: any) => {
      switch (payload.status) {
        case 'checking':
          setIsCheckingUpdate(true);
          setUpdateStatus('Checking GitHub for a newer version...');
          break;
        case 'available':
          setIsCheckingUpdate(false);
          setUpdateStatus(`Version ${payload.version} found. Downloading in the background...`);
          break;
        case 'downloading':
          setIsCheckingUpdate(false);
          setUpdateStatus(`Downloading update: ${Math.round(payload.percent || 0)}%`);
          break;
        case 'downloaded':
          setIsCheckingUpdate(false);
          setUpdateStatus(`Version ${payload.version} is ready. Restart to install.`);
          break;
        case 'not-available':
          setIsCheckingUpdate(false);
          setUpdateStatus('You are using the latest available version.');
          break;
        case 'error':
          setIsCheckingUpdate(false);
          setUpdateStatus(`Update check failed: ${payload.message || 'Unknown error'}`);
          break;
        default:
          break;
      }
    });
    return () => unsubscribe?.();
  }, []);

  const handleCheckForUpdates = async () => {
    const updater = (window as any).dezigloUpdater;
    if (!updater) {
      setUpdateStatus('Update controls are available in the installed Windows application.');
      return;
    }
    setIsCheckingUpdate(true);
    setUpdateStatus('Checking GitHub for a newer version...');
    const result = await updater.checkForUpdates();
    if (result?.status === 'dev-mode') {
      setIsCheckingUpdate(false);
      setUpdateStatus(result.message);
    } else if (result?.status === 'error') {
      setIsCheckingUpdate(false);
      setUpdateStatus(result.message || 'Update check failed.');
    }
  };


  // Handle number of players per side (6 to 11)
  const handlePlayersChange = (val: number) => {
    // all out theory: 6-a-side -> 5 wickets all out, 7 -> 6, etc.
    const autoAllOut = val - 1;
    setForm((prev) => ({
      ...prev,
      playersPerSide: val,
      allOutWickets: autoAllOut,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMatchSettings(form);
    assignTeamsAndToss(selectedTeamAId, selectedTeamBId, tossWinnerId, tossDecision);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl font-sans-ui">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-5">
        <div className="flex items-center gap-2">
          <Settings className="w-5 h-5 text-amber-400" />
          <h2 className="font-tech font-bold text-lg text-white tracking-wide uppercase">
            MATCH & BROADCAST SETTINGS
          </h2>
        </div>
        {savedSuccess && (
          <span className="flex items-center gap-1.5 text-emerald-400 text-xs font-tech font-bold bg-emerald-950/60 px-2.5 py-1 rounded border border-emerald-800">
            <Check className="w-3.5 h-3.5" /> SETTINGS SAVED
          </span>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* 1. Tournament, Match Title, Venue, Date */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-tech font-bold text-slate-300 uppercase mb-1 flex items-center gap-1.5">
              <Trophy className="w-3.5 h-3.5 text-amber-400" /> TOURNAMENT NAME
            </label>
            <input
              type="text"
              value={form.tournamentName}
              onChange={(e) => setForm({ ...form, tournamentName: e.target.value })}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400"
              placeholder="e.g. DEZIGLO PREMIER CUP 2026"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-tech font-bold text-slate-300 uppercase mb-1 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-sky-400" /> MATCH TITLE / STAGE
            </label>
            <input
              type="text"
              value={form.matchTitle}
              onChange={(e) => setForm({ ...form, matchTitle: e.target.value })}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-400"
              placeholder="e.g. Match 01 - Group A / Semi Final"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-tech font-bold text-slate-300 uppercase mb-1 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-red-400" /> VENUE / GROUND
            </label>
            <input
              type="text"
              value={form.venue}
              onChange={(e) => setForm({ ...form, venue: e.target.value })}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-red-400"
              placeholder="e.g. R. Premadasa International Stadium, Colombo"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-tech font-bold text-slate-300 uppercase mb-1 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-emerald-400" /> MATCH DATE
            </label>
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-400"
              required
            />
          </div>
        </div>

        {/* 2 & 3. Players per side (6 to 11) & All Out Theory */}
        <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800 space-y-4">
          <div className="text-xs font-tech font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2">
            <Users className="w-4 h-4" /> PLAYERS PER SIDE & ALL OUT THEORY
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-300 font-tech font-bold uppercase mb-1">
                PLAYERS PER SIDE (6 TO 11 A-SIDE):
              </label>
              <div className="grid grid-cols-6 gap-2">
                {[6, 7, 8, 9, 10, 11].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => handlePlayersChange(num)}
                    className={`py-2 rounded-lg font-tech font-bold text-sm border transition ${
                      form.playersPerSide === num
                        ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md font-black'
                        : 'bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800'
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-slate-400 mt-1.5">
                Current selection: <strong className="text-white">{form.playersPerSide} a side</strong>
              </p>
            </div>

            <div>
              <label className="block text-xs text-slate-300 font-tech font-bold uppercase mb-1">
                ALL OUT WICKETS THEORY:
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min="1"
                  max="11"
                  value={form.allOutWickets}
                  onChange={(e) => setForm({ ...form, allOutWickets: parseInt(e.target.value) || 1 })}
                  className="w-24 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-tech font-bold text-base focus:outline-none focus:border-amber-400"
                />
                <span className="text-xs text-slate-400 font-sans-ui">
                  wickets down = <strong>ALL OUT</strong> (Standard: {form.playersPerSide - 1} wickets)
                </span>
              </div>
              <p className="text-[11px] text-emerald-400 mt-1.5 font-mono">
                ✓ Example: For {form.playersPerSide} a-side, {form.allOutWickets} wickets is All Out.
              </p>
            </div>
          </div>
        </div>

        {/* 4. Match Overs & Balls per Over */}
        <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800 space-y-4">
          <div className="text-xs font-tech font-bold text-sky-400 uppercase tracking-wider flex items-center gap-2">
            <Clock className="w-4 h-4" /> MATCH OVERS & BALLS PER OVER
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-300 font-tech font-bold uppercase mb-1">
                TOTAL OVERS PER INNING:
              </label>
              <div className="flex flex-wrap gap-2">
                {[5, 8, 10, 12, 15, 20, 50].map((ov) => (
                  <button
                    key={ov}
                    type="button"
                    onClick={() => setForm({ ...form, totalOvers: ov })}
                    className={`px-3 py-1.5 rounded-lg font-tech font-bold text-xs border transition ${
                      form.totalOvers === ov
                        ? 'bg-sky-500 text-slate-950 border-sky-400 font-black'
                        : 'bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800'
                    }`}
                  >
                    {ov} Ov
                  </button>
                ))}
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={form.totalOvers}
                  onChange={(e) => setForm({ ...form, totalOvers: parseInt(e.target.value) || 1 })}
                  className="w-18 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white text-center font-tech"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-slate-300 font-tech font-bold uppercase mb-1">
                LEGAL BALLS PER OVER:
              </label>
              <div className="flex gap-2">
                {[4, 5, 6, 8].map((b) => (
                  <button
                    key={b}
                    type="button"
                    onClick={() => setForm({ ...form, ballsPerOver: b })}
                    className={`px-4 py-1.5 rounded-lg font-tech font-bold text-xs border transition ${
                      form.ballsPerOver === b
                        ? 'bg-sky-500 text-slate-950 border-sky-400 font-black'
                        : 'bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800'
                    }`}
                  >
                    {b} Balls
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-slate-400 mt-1.5">
                Standard cricket is 6 balls per over. Customizable for tape-ball / indoor formats.
              </p>
            </div>
          </div>
        </div>

        {/* 5. Select Playing Side from Squads with Dropdowns and Toss details */}
        <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800 space-y-4">
          <div className="text-xs font-tech font-bold text-purple-400 uppercase tracking-wider flex items-center justify-between">
            <span>TEAMS & SQUADS ASSIGNED TO CURRENT MATCH:</span>
            <span className="text-[11px] text-slate-400 font-normal">Select from saved squads below</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-900 p-3.5 rounded-xl border border-slate-700 space-y-2">
              <label className="block text-xs font-tech font-bold text-amber-400 uppercase">
                TEAM A (HOME SQUAD):
              </label>
              <select
                value={selectedTeamAId}
                onChange={(e) => {
                  setSelectedTeamAId(e.target.value);
                  if (tossWinnerId === selectedTeamAId) setTossWinnerId(e.target.value);
                }}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-tech focus:border-amber-400 outline-none"
              >
                {squads.map((sq) => (
                  <option key={sq.id} value={sq.id}>
                    {sq.teamName} [{sq.shortCode}] ({sq.players.length} players)
                  </option>
                ))}
              </select>
            </div>

            <div className="bg-slate-900 p-3.5 rounded-xl border border-slate-700 space-y-2">
              <label className="block text-xs font-tech font-bold text-red-400 uppercase">
                TEAM B (AWAY SQUAD):
              </label>
              <select
                value={selectedTeamBId}
                onChange={(e) => {
                  setSelectedTeamBId(e.target.value);
                  if (tossWinnerId === selectedTeamBId) setTossWinnerId(e.target.value);
                }}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-tech focus:border-red-400 outline-none"
              >
                {squads.map((sq) => (
                  <option key={sq.id} value={sq.id}>
                    {sq.teamName} [{sq.shortCode}] ({sq.players.length} players)
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Toss Election Section */}
          <div className="bg-slate-900/90 p-4 rounded-xl border border-slate-800 space-y-3">
            <div className="text-xs font-tech font-bold text-amber-400 uppercase flex items-center gap-2">
              <Trophy className="w-3.5 h-3.5" /> MATCH TOSS DETAILS & ELECTION:
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-tech text-slate-300 uppercase mb-1">
                  Who Won The Toss?
                </label>
                <select
                  value={tossWinnerId}
                  onChange={(e) => setTossWinnerId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-tech focus:border-amber-400 outline-none"
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
                <label className="block text-xs font-tech text-slate-300 uppercase mb-1">
                  Elected To:
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setTossDecision('bat')}
                    className={`flex-1 py-2 rounded-lg text-xs font-tech font-bold border transition ${
                      tossDecision === 'bat'
                        ? 'bg-amber-500 text-slate-950 border-amber-400 font-black'
                        : 'bg-slate-950 text-slate-400 border-slate-700 hover:bg-slate-800'
                    }`}
                  >
                    ELECTED TO BAT
                  </button>
                  <button
                    type="button"
                    onClick={() => setTossDecision('bowl')}
                    className={`flex-1 py-2 rounded-lg text-xs font-tech font-bold border transition ${
                      tossDecision === 'bowl'
                        ? 'bg-amber-500 text-slate-950 border-amber-400 font-black'
                        : 'bg-slate-950 text-slate-400 border-slate-700 hover:bg-slate-800'
                    }`}
                  >
                    ELECTED TO BOWL
                  </button>
                </div>
              </div>
            </div>

            <div className="text-[11px] text-emerald-400 font-mono pt-1">
              ✓ Result:{' '}
              <strong>
                {squads.find((s) => s.id === tossWinnerId)?.teamName || 'Toss Winner'}
              </strong>{' '}
              won the toss and elected to{' '}
              <strong>{tossDecision === 'bat' ? 'BAT' : 'BOWL'}</strong> first.
            </div>
          </div>
        </div>

        {/* Application Update */}
        <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-xs font-tech font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-2">
                <Download className="w-4 h-4" /> APPLICATION UPDATE
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Current version: <strong className="text-white">v{appVersion}</strong>
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleCheckForUpdates}
                disabled={isCheckingUpdate}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 text-slate-950 font-tech font-black text-xs uppercase transition"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isCheckingUpdate ? 'animate-spin' : ''}`} />
                CHECK FOR UPDATES
              </button>
              <button
                type="button"
                onClick={() => (window as any).dezigloUpdater?.openReleases?.()}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-tech font-bold text-xs transition"
                title="Open GitHub Releases"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          <p className="text-[11px] text-slate-400 font-mono">{updateStatus}</p>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            type="submit"
            className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-tech font-black text-sm uppercase tracking-wider shadow-lg transition"
          >
            APPLY & SAVE SETTINGS
          </button>
        </div>
      </form>
    </div>
  );
};
