import React, { useState, useRef } from 'react';
import {
  Users,
  Plus,
  Trash2,
  Edit2,
  FileSpreadsheet,
  Check,
  Shield,
  Star,
  Award,
  Upload,
  AlertCircle,
  Image as ImageIcon,
  X,
} from 'lucide-react';
import { useCricket } from '../context/CricketContext';
import { Squad, Player, PlayerRole } from '../types';
import { ExcelPlayerImporterModal } from './ExcelPlayerImporterModal';

export const SquadsPanel: React.FC = () => {
  const { squads, addSquad, updateSquad, deleteSquad } = useCricket();

  const [selectedSquadId, setSelectedSquadId] = useState<string>(squads[0]?.id || '');
  const activeSquad = squads.find((s) => s.id === selectedSquadId) || squads[0];

  // Excel File Importer Modal state
  const [showExcelModal, setShowExcelModal] = useState(false);

  // Direct logo input ref
  const directLogoInputRef = useRef<HTMLInputElement>(null);

  // Create squad modal
  const [showCreateSquad, setShowCreateSquad] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [newShortCode, setNewShortCode] = useState('');
  const [newColor, setNewColor] = useState('#f59e0b');
  const [newLogoUrl, setNewLogoUrl] = useState<string>('');

  // Edit squad modal
  const [showEditSquad, setShowEditSquad] = useState(false);
  const [editTeamName, setEditTeamName] = useState('');
  const [editShortCode, setEditShortCode] = useState('');
  const [editColor, setEditColor] = useState('#f59e0b');
  const [editLogoUrl, setEditLogoUrl] = useState<string>('');

  // Helper to read file as Data URL
  const handleLogoFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    callback: (dataUrl: string) => void
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        callback(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  // Direct logo upload for active squad
  const handleDirectActiveSquadLogo = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!activeSquad) return;
    handleLogoFileChange(e, (dataUrl) => {
      updateSquad({
        ...activeSquad,
        logoUrl: dataUrl,
      });
    });
  };

  // Player editing modal
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [showPlayerModal, setShowPlayerModal] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const [jerseyNumber, setJerseyNumber] = useState<number | string>('');
  const [playerRole, setPlayerRole] = useState<PlayerRole>('Batsman');
  const [isCaptain, setIsCaptain] = useState(false);
  const [isWk, setIsWk] = useState(false);

  // Excel / Word Import Modal
  const [showImportModal, setShowImportModal] = useState(false);
  const [importText, setImportText] = useState('');
  const [importNotice, setImportNotice] = useState('');

  // Open add player
  const handleOpenAddPlayer = () => {
    setEditingPlayer(null);
    setPlayerName('');
    setJerseyNumber(activeSquad ? activeSquad.players.length + 1 : 1);
    setPlayerRole('Batsman');
    setIsCaptain(false);
    setIsWk(false);
    setShowPlayerModal(true);
  };

  // Open edit player
  const handleOpenEditPlayer = (p: Player) => {
    setEditingPlayer(p);
    setPlayerName(p.name);
    setJerseyNumber(p.jerseyNumber);
    setPlayerRole(p.role);
    setIsCaptain(p.isCaptain);
    setIsWk(p.isWicketKeeper);
    setShowPlayerModal(true);
  };

  // Save Player
  const handleSavePlayer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSquad || !playerName.trim()) return;

    let updatedPlayers: Player[];
    if (editingPlayer) {
      updatedPlayers = activeSquad.players.map((p) =>
        p.id === editingPlayer.id
          ? {
              ...p,
              name: playerName.trim(),
              jerseyNumber: jerseyNumber || p.jerseyNumber,
              role: playerRole,
              isCaptain,
              isWicketKeeper: isWk,
            }
          : p
      );
    } else {
      const newPlayer: Player = {
        id: `p-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
        name: playerName.trim(),
        jerseyNumber: jerseyNumber || activeSquad.players.length + 1,
        role: playerRole,
        isCaptain,
        isWicketKeeper: isWk,
      };
      updatedPlayers = [...activeSquad.players, newPlayer];
    }

    updateSquad({
      ...activeSquad,
      players: updatedPlayers,
    });

    setShowPlayerModal(false);
  };

  // Delete Player
  const handleDeletePlayer = (playerId: string) => {
    if (!activeSquad) return;
    updateSquad({
      ...activeSquad,
      players: activeSquad.players.filter((p) => p.id !== playerId),
    });
  };

  // Create new Squad
  const handleCreateSquad = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamName.trim()) return;

    const newSquad: Squad = {
      id: `squad-${Date.now()}`,
      teamName: newTeamName.trim(),
      shortCode: newShortCode.trim().toUpperCase() || newTeamName.substring(0, 3).toUpperCase(),
      themeColor: newColor,
      logoUrl: newLogoUrl.trim() || undefined,
      players: [],
    };

    addSquad(newSquad);
    setSelectedSquadId(newSquad.id);
    setShowCreateSquad(false);
    setNewTeamName('');
    setNewShortCode('');
    setNewLogoUrl('');
  };

  // Open Edit Active Squad
  const handleOpenEditSquad = () => {
    if (!activeSquad) return;
    setEditTeamName(activeSquad.teamName);
    setEditShortCode(activeSquad.shortCode);
    setEditColor(activeSquad.themeColor || '#f59e0b');
    setEditLogoUrl(activeSquad.logoUrl || '');
    setShowEditSquad(true);
  };

  // Save Edit Squad
  const handleSaveEditSquad = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSquad || !editTeamName.trim()) return;

    updateSquad({
      ...activeSquad,
      teamName: editTeamName.trim(),
      shortCode: editShortCode.trim().toUpperCase() || editTeamName.substring(0, 3).toUpperCase(),
      themeColor: editColor,
      logoUrl: editLogoUrl.trim() || undefined,
    });
    setShowEditSquad(false);
  };

  // Delete Squad
  const handleDeleteActiveSquad = (squadIdToDelete: string) => {
    const remaining = squads.filter((s) => s.id !== squadIdToDelete);
    deleteSquad(squadIdToDelete);
    if (remaining.length > 0) {
      setSelectedSquadId(remaining[0].id);
    }
  };

  // Excel / Word smart import parser
  // Supports: Tab separated (Excel copy-paste), CSV, or comma separated format:
  // "Name, Jersey, Role, Captain, Wicket Keeper" or "Jersey \t Name \t Role \t Captain"
  const handleImportExcelOrWord = () => {
    if (!activeSquad || !importText.trim()) return;

    const lines = importText.split('\n').map((l) => l.trim()).filter(Boolean);
    const parsedPlayers: Player[] = [];

    for (const line of lines) {
      // Split by tab or comma
      const parts = line.includes('\t')
        ? line.split('\t').map((p) => p.trim())
        : line.split(',').map((p) => p.trim());

      if (parts.length === 0) continue;

      // Detect header line
      if (
        parts[0].toLowerCase().includes('name') ||
        parts[0].toLowerCase().includes('jersey') ||
        parts[0].toLowerCase().includes('player')
      ) {
        continue;
      }

      let pName = '';
      let pJersey: number | string = activeSquad.players.length + parsedPlayers.length + 1;
      let pRole: PlayerRole = 'Batsman';
      let pCap = false;
      let pWk = false;

      // Intelligent column mapping
      // If first column is purely numeric, it's jersey number
      if (/^\d+$/.test(parts[0]) && parts.length > 1) {
        pJersey = parseInt(parts[0], 10);
        pName = parts[1] || `Player ${pJersey}`;
        // Role in part 2
        const roleStr = (parts[2] || '').toLowerCase();
        if (roleStr.includes('bowl')) pRole = 'Bowler';
        else if (roleStr.includes('all') || roleStr.includes('round')) pRole = 'All-Rounder';
        else if (roleStr.includes('keeper') || roleStr.includes('wk')) {
          pRole = 'Wicket-Keeper';
          pWk = true;
        }

        // Check captain or WK tags in line
        const fullLine = line.toLowerCase();
        if (fullLine.includes('(c)') || fullLine.includes('captain') || parts[3]?.toLowerCase() === 'yes') pCap = true;
        if (fullLine.includes('(wk)') || fullLine.includes('keeper') || parts[4]?.toLowerCase() === 'yes') pWk = true;
      } else {
        // First column is player name
        pName = parts[0];
        if (parts[1] && /^\d+$/.test(parts[1])) {
          pJersey = parseInt(parts[1], 10);
        }
        const roleStr = (parts[2] || '').toLowerCase();
        if (roleStr.includes('bowl')) pRole = 'Bowler';
        else if (roleStr.includes('all') || roleStr.includes('round')) pRole = 'All-Rounder';
        else if (roleStr.includes('keeper') || roleStr.includes('wk')) {
          pRole = 'Wicket-Keeper';
          pWk = true;
        }

        const fullLine = line.toLowerCase();
        if (fullLine.includes('(c)') || fullLine.includes('captain')) pCap = true;
        if (fullLine.includes('(wk)') || fullLine.includes('keeper')) pWk = true;
      }

      // Clean name from tags
      pName = pName.replace(/\(c\)|\(wk\)|\(c\/wk\)/gi, '').trim();

      if (pName) {
        parsedPlayers.push({
          id: `p-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          name: pName,
          jerseyNumber: pJersey,
          role: pRole,
          isCaptain: pCap,
          isWicketKeeper: pWk,
        });
      }
    }

    if (parsedPlayers.length > 0) {
      updateSquad({
        ...activeSquad,
        players: [...activeSquad.players, ...parsedPlayers],
      });
      setImportNotice(`Successfully imported ${parsedPlayers.length} players into ${activeSquad.teamName}!`);
      setTimeout(() => {
        setImportNotice('');
        setShowImportModal(false);
        setImportText('');
      }, 1800);
    } else {
      setImportNotice('No valid players could be parsed. Check format.');
    }
  };

  // Real Excel (.xlsx, .xls) Importer callback
  const handleImportExcelPlayers = (newPlayers: Player[], mode: 'append' | 'replace') => {
    if (!activeSquad) return;
    const updated = mode === 'replace' ? newPlayers : [...activeSquad.players, ...newPlayers];
    updateSquad({
      ...activeSquad,
      players: updated,
    });
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl font-sans-ui">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800 mb-4">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-amber-400" />
          <h2 className="font-tech font-bold text-lg text-white tracking-wide uppercase">
            SQUADS & PLAYERS MANAGEMENT
          </h2>
        </div>

        <button
          onClick={() => setShowCreateSquad(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-tech font-bold text-xs uppercase shadow transition"
        >
          <Plus className="w-4 h-4" /> CREATE NEW SQUAD
        </button>
      </div>

      {/* Squad selector tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-4">
        {squads.map((sq) => (
          <button
            key={sq.id}
            onClick={() => setSelectedSquadId(sq.id)}
            className={`px-4 py-2 rounded-xl font-tech font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition whitespace-nowrap border ${
              activeSquad?.id === sq.id
                ? 'bg-slate-800 text-white border-amber-400 shadow-md'
                : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:bg-slate-800'
            }`}
          >
            <span
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: sq.themeColor || '#f59e0b' }}
            />
            <span>{sq.teamName}</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-900 text-slate-400 font-mono">
              ({sq.players.length})
            </span>
          </button>
        ))}
      </div>

      {/* Selected Squad Info Bar */}
      {activeSquad && (
        <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 mb-5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="relative group">
              <div
                className="w-14 h-14 rounded-xl flex items-center justify-center font-display font-black text-2xl text-slate-950 shadow-md overflow-hidden bg-slate-900 border border-slate-700"
                style={{ backgroundColor: activeSquad.logoUrl ? '#0f172a' : activeSquad.themeColor || '#f59e0b' }}
              >
                {activeSquad.logoUrl ? (
                  <img
                    src={activeSquad.logoUrl}
                    alt={activeSquad.teamName}
                    className="w-full h-full object-contain p-1"
                  />
                ) : (
                  activeSquad.shortCode
                )}
              </div>
              <button
                type="button"
                onClick={() => directLogoInputRef.current?.click()}
                className="absolute -bottom-1 -right-1 p-1 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-full shadow-lg transition"
                title="Upload/Change Team Logo"
              >
                <Upload className="w-3 h-3" />
              </button>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-tech font-bold text-lg text-white uppercase">{activeSquad.teamName}</h3>
                <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-amber-400 font-mono font-bold">
                  [{activeSquad.shortCode}]
                </span>

                <button
                  onClick={handleOpenEditSquad}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                  title="Edit team name, code & theme color"
                >
                  <Edit2 className="w-3.5 h-3.5 text-amber-400" />
                </button>

                <button
                  onClick={() => handleDeleteActiveSquad(activeSquad.id)}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-red-950/60 text-slate-400 hover:text-red-400 transition"
                  title="Delete this squad"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-xs text-slate-400">
                {activeSquad.players.length} Players • Registered for Tournament
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="file"
              ref={directLogoInputRef}
              onChange={handleDirectActiveSquadLogo}
              accept="image/*"
              className="hidden"
            />
            <button
              type="button"
              onClick={() => directLogoInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 font-tech font-bold text-xs uppercase border border-amber-500/40 transition"
              title="Upload Team Logo (PNG, JPG, SVG)"
            >
              <ImageIcon className="w-3.5 h-3.5 text-amber-400" />
              {activeSquad.logoUrl ? 'CHANGE LOGO' : 'UPLOAD LOGO'}
            </button>

            <button
              onClick={handleOpenEditSquad}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-tech font-bold text-xs uppercase border border-slate-700 transition"
            >
              <Edit2 className="w-3.5 h-3.5 text-amber-400" /> EDIT TEAM
            </button>

            <button
              onClick={() => handleDeleteActiveSquad(activeSquad.id)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-950/40 hover:bg-red-900/60 text-red-300 font-tech font-bold text-xs uppercase border border-red-800/80 transition"
            >
              <Trash2 className="w-3.5 h-3.5" /> DELETE TEAM
            </button>

            <button
              onClick={() => setShowExcelModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-tech font-black text-xs uppercase shadow-lg shadow-emerald-950/50 transition border border-emerald-400/40"
              title="Upload .xlsx or .xls Excel spreadsheet file directly"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-200" /> IMPORT PLAYERS FROM EXCEL
            </button>

            <button
              onClick={() => setShowImportModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-tech font-bold text-xs uppercase border border-slate-700 transition"
              title="Copy & paste rows from Excel/Word"
            >
              PASTE TEXT
            </button>

            <button
              onClick={handleOpenAddPlayer}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-tech font-bold text-xs uppercase shadow transition"
            >
              <Plus className="w-4 h-4" /> ADD PLAYER
            </button>
          </div>
        </div>
      )}

      {/* Players List Table */}
      {activeSquad && (
        <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/60">
          <table className="w-full text-left text-xs font-sans-ui">
            <thead>
              <tr className="bg-slate-900 text-slate-400 font-tech font-bold uppercase tracking-wider border-b border-slate-800">
                <th className="px-4 py-3"># JERSEY</th>
                <th className="px-4 py-3">PLAYER NAME</th>
                <th className="px-4 py-3">ROLE</th>
                <th className="px-4 py-3">STATUS / BADGE</th>
                <th className="px-4 py-3 text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {activeSquad.players.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-500 font-tech italic">
                    No players added yet. Click "Add Player" or "Import from Excel / Word" above!
                  </td>
                </tr>
              ) : (
                activeSquad.players.map((p, idx) => (
                  <tr key={p.id} className="hover:bg-slate-900/50 transition">
                    <td className="px-4 py-3 font-mono font-bold text-amber-400">#{p.jerseyNumber}</td>
                    <td className="px-4 py-3 font-bold text-slate-200">
                      <div className="flex items-center gap-2">
                        <span>{p.name}</span>
                        {p.isCaptain && (
                          <span className="bg-amber-500/20 border border-amber-500/60 text-amber-300 text-[10px] px-1.5 py-0.2 rounded font-mono font-bold">
                            (C)
                          </span>
                        )}
                        {p.isWicketKeeper && (
                          <span className="bg-sky-500/20 border border-sky-500/60 text-sky-300 text-[10px] px-1.5 py-0.2 rounded font-mono font-bold">
                            (WK)
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-[11px] font-tech font-bold px-2 py-0.5 rounded ${
                          p.role === 'Batsman'
                            ? 'bg-amber-950/60 text-amber-400 border border-amber-800'
                            : p.role === 'Bowler'
                            ? 'bg-sky-950/60 text-sky-400 border border-sky-800'
                            : p.role === 'All-Rounder'
                            ? 'bg-purple-950/60 text-purple-400 border border-purple-800'
                            : 'bg-emerald-950/60 text-emerald-400 border border-emerald-800'
                        }`}
                      >
                        {p.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-400">Squad Player #{idx + 1}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenEditPlayer(p)}
                          className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                          title="Edit Player"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeletePlayer(p.id)}
                          className="p-1.5 rounded bg-slate-800 hover:bg-red-950 text-slate-400 hover:text-red-400 transition"
                          title="Delete Player"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL: ADD / EDIT PLAYER */}
      {showPlayerModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-5 shadow-2xl">
            <h3 className="text-lg font-tech font-bold text-white uppercase mb-4">
              {editingPlayer ? 'EDIT SQUAD PLAYER' : 'ADD NEW SQUAD PLAYER'}
            </h3>

            <form onSubmit={handleSavePlayer} className="space-y-4 text-xs font-tech">
              <div>
                <label className="block text-slate-300 uppercase mb-1">PLAYER FULL NAME:</label>
                <input
                  type="text"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  placeholder="e.g. Wanindu Hasaranga"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-sans-ui text-sm focus:outline-none focus:border-amber-400"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 uppercase mb-1">JERSEY NUMBER:</label>
                  <input
                    type="number"
                    value={jerseyNumber}
                    onChange={(e) => setJerseyNumber(e.target.value)}
                    placeholder="e.g. 49"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 uppercase mb-1">PLAYER ROLE:</label>
                  <select
                    value={playerRole}
                    onChange={(e) => setPlayerRole(e.target.value as PlayerRole)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-400"
                  >
                    <option value="Batsman">Batsman</option>
                    <option value="Bowler">Bowler</option>
                    <option value="All-Rounder">All-Rounder</option>
                    <option value="Wicket-Keeper">Wicket-Keeper</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-6 pt-2">
                <label className="flex items-center gap-2 cursor-pointer text-slate-200">
                  <input
                    type="checkbox"
                    checked={isCaptain}
                    onChange={(e) => setIsCaptain(e.target.checked)}
                    className="w-4 h-4 rounded text-amber-500 bg-slate-950 border-slate-700"
                  />
                  <span>TEAM CAPTAIN (C)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-slate-200">
                  <input
                    type="checkbox"
                    checked={isWk}
                    onChange={(e) => setIsWk(e.target.checked)}
                    className="w-4 h-4 rounded text-sky-500 bg-slate-950 border-slate-700"
                  />
                  <span>WICKET KEEPER (WK)</span>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowPlayerModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 font-bold"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-black uppercase shadow"
                >
                  SAVE PLAYER
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EXCEL OR WORD IMPORT */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-emerald-500 rounded-2xl max-w-xl w-full p-5 sm:p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
                <h3 className="text-xl font-tech font-bold text-white uppercase">
                  IMPORT PLAYERS FROM EXCEL OR WORD
                </h3>
              </div>
              <button
                onClick={() => setShowImportModal(false)}
                className="text-slate-400 hover:text-white font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs font-tech">
              <p className="text-slate-300 font-sans-ui">
                Copy rows directly from Microsoft Excel, Word table, or Google Sheets and paste them below:
              </p>

              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-slate-400 font-mono text-[11px]">
                <div className="text-amber-400 font-bold mb-1">Supported Format Examples:</div>
                <div>18, Pathum Nissanka, Batsman</div>
                <div>13, Kusal Mendis, Wicket-Keeper, (WK)</div>
                <div>72, Charith Asalanka, All-Rounder, (C)</div>
                <div>49	Wanindu Hasaranga	All-Rounder</div>
              </div>

              {importNotice && (
                <div className="p-2.5 rounded bg-emerald-950/80 border border-emerald-700 text-emerald-300 font-sans-ui text-xs flex items-center gap-2">
                  <Check className="w-4 h-4" /> {importNotice}
                </div>
              )}

              <textarea
                rows={7}
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder="Paste player rows here (Excel tab-separated or comma separated)..."
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white font-mono text-xs focus:outline-none focus:border-emerald-400"
              />

              <div className="flex items-center justify-between pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    // Pre-fill sample snippet
                    setImportText(
                      `7, Dasun Shanaka, All-Rounder, (C)\n61, Maheesh Theekshana, Bowler\n81, Matheesha Pathirana, Bowler\n98, Dilshan Madushanka, Bowler\n21, Kamindu Mendis, Batsman`
                    );
                  }}
                  className="text-slate-400 hover:text-amber-400 underline text-[11px]"
                >
                  Fill Sample Template
                </button>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowImportModal(false)}
                    className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 font-bold"
                  >
                    CANCEL
                  </button>
                  <button
                    type="button"
                    onClick={handleImportExcelOrWord}
                    className="px-6 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold uppercase shadow flex items-center gap-2"
                  >
                    <Upload className="w-4 h-4" /> IMPORT NOW
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CREATE SQUAD */}
      {showCreateSquad && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-5 shadow-2xl">
            <h3 className="text-lg font-tech font-bold text-white uppercase mb-4">
              CREATE NEW TEAM / SQUAD
            </h3>

            <form onSubmit={handleCreateSquad} className="space-y-4 text-xs font-tech">
              <div>
                <label className="block text-slate-300 uppercase mb-1">TEAM FULL NAME:</label>
                <input
                  type="text"
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  placeholder="e.g. Galle Gladiators"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-sans-ui text-sm focus:outline-none focus:border-amber-400"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 uppercase mb-1">SHORT CODE (3-4 CHARS):</label>
                  <input
                    type="text"
                    maxLength={4}
                    value={newShortCode}
                    onChange={(e) => setNewShortCode(e.target.value)}
                    placeholder="e.g. GLG"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono text-sm uppercase focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 uppercase mb-1">THEME COLOR:</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={newColor}
                      onChange={(e) => setNewColor(e.target.value)}
                      className="w-10 h-9 bg-transparent cursor-pointer rounded"
                    />
                    <span className="font-mono text-slate-300 text-sm">{newColor}</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 uppercase mb-1">TEAM LOGO (OPTIONAL):</label>
                <div className="flex items-center gap-3 bg-slate-950 p-2.5 rounded-lg border border-slate-700">
                  {newLogoUrl ? (
                    <div className="relative w-12 h-12 bg-slate-900 rounded-lg p-1 border border-slate-700 flex items-center justify-center">
                      <img src={newLogoUrl} alt="Preview" className="w-full h-full object-contain" />
                      <button
                        type="button"
                        onClick={() => setNewLogoUrl('')}
                        className="absolute -top-1.5 -right-1.5 p-0.5 bg-red-600 text-white rounded-full"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-slate-900 border border-dashed border-slate-700 flex items-center justify-center text-slate-500">
                      <ImageIcon className="w-6 h-6" />
                    </div>
                  )}
                  <div className="flex-1">
                    <input
                      type="file"
                      id="create-squad-logo-file"
                      accept="image/*"
                      onChange={(e) => handleLogoFileChange(e, (url) => setNewLogoUrl(url))}
                      className="hidden"
                    />
                    <label
                      htmlFor="create-squad-logo-file"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-400 font-tech font-bold cursor-pointer transition text-xs uppercase"
                    >
                      <Upload className="w-3.5 h-3.5" /> {newLogoUrl ? 'Change Image' : 'Browse Image File'}
                    </label>
                    <p className="text-[10px] text-slate-400 mt-1 font-sans-ui">PNG, JPG, SVG, WebP supported</p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateSquad(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 font-bold"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-black uppercase shadow"
                >
                  CREATE SQUAD
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT SQUAD */}
      {showEditSquad && activeSquad && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-5 shadow-2xl">
            <h3 className="text-lg font-tech font-bold text-white uppercase mb-4">
              EDIT TEAM DETAILS
            </h3>

            <form onSubmit={handleSaveEditSquad} className="space-y-4 text-xs font-tech">
              <div>
                <label className="block text-slate-300 uppercase mb-1">TEAM FULL NAME:</label>
                <input
                  type="text"
                  value={editTeamName}
                  onChange={(e) => setEditTeamName(e.target.value)}
                  placeholder="e.g. Royal Challengers"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-400"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 uppercase mb-1">SHORT CODE (3-4 LETTERS):</label>
                  <input
                    type="text"
                    maxLength={4}
                    value={editShortCode}
                    onChange={(e) => setEditShortCode(e.target.value)}
                    placeholder="e.g. RCB"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono text-sm uppercase focus:outline-none focus:border-amber-400"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-300 uppercase mb-1">THEME COLOR:</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={editColor}
                      onChange={(e) => setEditColor(e.target.value)}
                      className="w-10 h-9 bg-transparent cursor-pointer rounded"
                    />
                    <span className="font-mono text-slate-300 text-sm">{editColor}</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 uppercase mb-1">TEAM LOGO:</label>
                <div className="flex items-center gap-3 bg-slate-950 p-2.5 rounded-lg border border-slate-700">
                  {editLogoUrl ? (
                    <div className="relative w-12 h-12 bg-slate-900 rounded-lg p-1 border border-slate-700 flex items-center justify-center">
                      <img src={editLogoUrl} alt="Preview" className="w-full h-full object-contain" />
                      <button
                        type="button"
                        onClick={() => setEditLogoUrl('')}
                        className="absolute -top-1.5 -right-1.5 p-0.5 bg-red-600 text-white rounded-full"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-slate-900 border border-dashed border-slate-700 flex items-center justify-center text-slate-500">
                      <ImageIcon className="w-6 h-6" />
                    </div>
                  )}
                  <div className="flex-1">
                    <input
                      type="file"
                      id="edit-squad-logo-file"
                      accept="image/*"
                      onChange={(e) => handleLogoFileChange(e, (url) => setEditLogoUrl(url))}
                      className="hidden"
                    />
                    <label
                      htmlFor="edit-squad-logo-file"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-400 font-tech font-bold cursor-pointer transition text-xs uppercase"
                    >
                      <Upload className="w-3.5 h-3.5" /> {editLogoUrl ? 'Change Image' : 'Browse Image File'}
                    </label>
                    <p className="text-[10px] text-slate-400 mt-1 font-sans-ui">PNG, JPG, SVG, WebP supported</p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowEditSquad(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 font-bold"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-black uppercase shadow"
                >
                  SAVE CHANGES
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Excel (.xlsx / .xls) Player Importer Modal */}
      {activeSquad && (
        <ExcelPlayerImporterModal
          squad={activeSquad}
          isOpen={showExcelModal}
          onClose={() => setShowExcelModal(false)}
          onImport={handleImportExcelPlayers}
        />
      )}
    </div>
  );
};
