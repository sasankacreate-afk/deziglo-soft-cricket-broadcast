import React, { useState } from 'react';
import {
  Table,
  Plus,
  Trash2,
  Edit2,
  Printer,
  Download,
  Calendar,
  Layers,
  Users,
  CheckCircle,
  FileText,
  Play,
} from 'lucide-react';
import { useCricket } from '../context/CricketContext';
import {
  TournamentStage,
  TournamentGroup,
  StandingRow,
  MatchFixture,
  TournamentStageType,
} from '../types';
import { triggerPrintOrDownload } from '../utils/pdfExport';

export const PointsTablePanel: React.FC<{ onOpenScorecard: () => void }> = ({ onOpenScorecard }) => {
  const {
    stages,
    fixtures,
    squads,
    getTeamLogo,
    updateStages,
    addFixture,
    updateFixture,
    deleteFixture,
    loadMatchFixture,
  } = useCricket();

  const [activeStageId, setActiveStageId] = useState<string>(stages[0]?.id || 'stage-group');
  const activeStage = stages.find((s) => s.id === activeStageId) || stages[0];

  const [activeGroupId, setActiveGroupId] = useState<string>(activeStage?.groups[0]?.id || '');
  const activeGroup = activeStage?.groups.find((g) => g.id === activeGroupId) || activeStage?.groups[0];

  // Stage creation modal
  const [showAddStage, setShowAddStage] = useState(false);
  const [newStageName, setNewStageName] = useState('');
  const [newStageType, setNewStageType] = useState<TournamentStageType>('super_4');

  // Group creation modal
  const [showAddGroup, setShowAddGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');

  // Fixture modal
  const [showFixtureModal, setShowFixtureModal] = useState(false);
  const [editingFixture, setEditingFixture] = useState<MatchFixture | null>(null);
  const [fixtureTitle, setFixtureTitle] = useState('');
  const [teamAId, setTeamAId] = useState(squads[0]?.id || '');
  const [teamBId, setTeamBId] = useState(squads[1]?.id || '');
  const [fixtureDate, setFixtureDate] = useState(new Date().toISOString().split('T')[0]);
  const [fixtureVenue, setFixtureVenue] = useState('R. Premadasa International Stadium, Colombo');
  const [fixtureStatus, setFixtureStatus] = useState<'upcoming' | 'live' | 'completed'>('upcoming');
  const [fixtureResult, setFixtureResult] = useState('');

  // Add new stage
  const handleCreateStage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStageName.trim()) return;

    const newStage: TournamentStage = {
      id: `stage-${Date.now()}`,
      name: newStageName.trim(),
      type: newStageType,
      groups: [
        {
          id: `grp-${Date.now()}`,
          name: newStageType === 'final' ? 'Championship' : 'Group 1',
          standings: [],
        },
      ],
    };

    updateStages([...stages, newStage]);
    setActiveStageId(newStage.id);
    setShowAddStage(false);
    setNewStageName('');
  };

  // Add new group to current stage
  const handleCreateGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeStage || !newGroupName.trim()) return;

    const newGroup: TournamentGroup = {
      id: `grp-${Date.now()}`,
      name: newGroupName.trim(),
      standings: [],
    };

    const updatedStages = stages.map((st) =>
      st.id === activeStage.id ? { ...st, groups: [...st.groups, newGroup] } : st
    );

    updateStages(updatedStages);
    setActiveGroupId(newGroup.id);
    setShowAddGroup(false);
    setNewGroupName('');
  };

  // Secondary-app tournament workflow: rename/delete groups and create the next stage
  // directly inside the existing v6 Points & Fixtures screen (no extra tab).
  const renameGroup = (group: TournamentGroup) => {
    const name = window.prompt('Group name:', group.name);
    if (!name?.trim() || !activeStage) return;
    updateStages(stages.map(st => st.id === activeStage.id ? { ...st, groups: st.groups.map(g => g.id === group.id ? { ...g, name: name.trim() } : g) } : st));
  };

  const deleteGroup = (group: TournamentGroup) => {
    if (!activeStage || activeStage.groups.length <= 1) return;
    if (!window.confirm(`Delete ${group.name}? Teams and standings in this group will be removed.`)) return;
    const groups = activeStage.groups.filter(g => g.id !== group.id);
    updateStages(stages.map(st => st.id === activeStage.id ? { ...st, groups } : st));
    setActiveGroupId(groups[0]?.id || '');
  };

  const createNextStageFromQualified = () => {
    if (!activeGroup) return;
    const qualified = [...activeGroup.standings].sort((a,b) => b.points - a.points || b.nrr - a.nrr).slice(0, 2);
    if (qualified.length < 2) { window.alert('At least two teams are required to create the next stage.'); return; }
    const stageId = `stage-${Date.now()}`;
    const newStage: TournamentStage = {
      id: stageId,
      name: `Next Stage • ${activeStage?.name || 'Qualified Teams'}`,
      type: 'knockout',
      groups: [{
        id: `grp-${Date.now()}`,
        name: 'Qualified',
        standings: qualified.map((r) => ({ ...r, played: 0, won: 0, lost: 0, tied: 0, noResult: 0, points: 0, nrr: 0, runsFor: 0, oversFor: 0, runsAgainst: 0, oversAgainst: 0, form: [] }))
      }]
    };
    updateStages([...stages, newStage]);
    setActiveStageId(stageId);
    setActiveGroupId(newStage.groups[0].id);
  };

  // Import team from squads into active group
  const handleImportSquadToGroup = (squadId: string) => {
    if (!activeStage || !activeGroup) return;
    const squad = squads.find((s) => s.id === squadId);
    if (!squad) return;

    // Check if already in group
    if (activeGroup.standings.some((r) => r.teamId === squadId)) return;

    const newRow: StandingRow = {
      teamId: squad.id,
      teamName: squad.teamName,
      shortCode: squad.shortCode,
      played: 0,
      won: 0,
      lost: 0,
      tied: 0,
      noResult: 0,
      points: 0,
      nrr: 0.0,
      runsFor: 0,
      oversFor: 0,
      runsAgainst: 0,
      oversAgainst: 0,
      form: [],
    };

    const updatedStages = stages.map((st) => {
      if (st.id === activeStage.id) {
        return {
          ...st,
          groups: st.groups.map((g) =>
            g.id === activeGroup.id ? { ...g, standings: [...g.standings, newRow] } : g
          ),
        };
      }
      return st;
    });

    updateStages(updatedStages);
  };

  // Remove team from group
  const handleRemoveTeamFromGroup = (teamId: string) => {
    if (!activeStage || !activeGroup) return;
    const updatedStages = stages.map((st) => {
      if (st.id === activeStage.id) {
        return {
          ...st,
          groups: st.groups.map((g) =>
            g.id === activeGroup.id
              ? { ...g, standings: g.standings.filter((r) => r.teamId !== teamId) }
              : g
          ),
        };
      }
      return st;
    });
    updateStages(updatedStages);
  };

  // Trigger Print to PDF for Group Standing
  const handlePrintGroupStanding = () => {
    if (!activeGroup || !activeStage) return;
    triggerPrintOrDownload(
      'points-table-container',
      `${activeStage.name} - ${activeGroup.name} Standings`,
      `${activeStage.name.replace(/\s+/g, '_')}_${activeGroup.name.replace(/\s+/g, '_')}_Standings.html`
    );
  };

  // Save / Update Fixture
  const handleSaveFixture = (e: React.FormEvent) => {
    e.preventDefault();
    const squadA = squads.find((s) => s.id === teamAId) || squads[0];
    const squadB = squads.find((s) => s.id === teamBId) || squads[1];

    if (editingFixture) {
      updateFixture({
        ...editingFixture,
        title: fixtureTitle,
        teamAId: squadA.id,
        teamAName: squadA.teamName,
        teamACode: squadA.shortCode,
        teamBId: squadB.id,
        teamBName: squadB.teamName,
        teamBCode: squadB.shortCode,
        date: fixtureDate,
        venue: fixtureVenue,
        status: fixtureStatus,
        resultText: fixtureResult || undefined,
        hasScorecard: fixtureStatus === 'completed' || fixtureStatus === 'live',
      });
    } else {
      const newFix: MatchFixture = {
        id: `fix-${Date.now()}`,
        stageId: activeStage?.id || 'stage-group',
        matchNumber: fixtures.length + 1,
        title: fixtureTitle || `Match ${fixtures.length + 1}`,
        teamAId: squadA.id,
        teamAName: squadA.teamName,
        teamACode: squadA.shortCode,
        teamBId: squadB.id,
        teamBName: squadB.teamName,
        teamBCode: squadB.shortCode,
        date: fixtureDate,
        venue: fixtureVenue,
        status: fixtureStatus,
        resultText: fixtureResult || undefined,
        hasScorecard: fixtureStatus === 'completed',
      };
      addFixture(newFix);
    }

    setShowFixtureModal(false);
  };

  return (
    <div className="space-y-6 font-sans-ui">
      {/* SECTION 1: POINTS TABLE & STANDINGS */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800 mb-4">
          <div className="flex items-center gap-2">
            <Table className="w-5 h-5 text-amber-400" />
            <h2 className="font-tech font-bold text-lg text-white tracking-wide uppercase">
              POINTS TABLE & TOURNAMENT STAGES
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAddStage(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-tech font-bold text-xs uppercase transition"
            >
              <Layers className="w-4 h-4 text-amber-400" /> ADD STAGE
            </button>

            <button
              onClick={() => setShowAddGroup(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-tech font-bold text-xs uppercase transition"
            >
              <Plus className="w-4 h-4 text-sky-400" /> ADD GROUP
            </button>

            <button
              onClick={createNextStageFromQualified}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-tech font-black text-xs uppercase shadow transition"
              title="Create the next stage using the top two qualified teams in the active group"
            >
              <Play className="w-4 h-4" /> NEXT STAGE
            </button>

            <button
              onClick={handlePrintGroupStanding}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-tech font-black text-xs uppercase shadow transition"
              title="Download or Print PDF"
            >
              <Printer className="w-4 h-4" /> DOWNLOAD STANDINGS PDF
            </button>
          </div>
        </div>

        {/* Stage Selector Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-3">
          <span className="text-xs font-tech font-bold text-slate-400 uppercase mr-1">STAGES:</span>
          {stages.map((st) => (
            <button
              key={st.id}
              onClick={() => {
                setActiveStageId(st.id);
                if (st.groups.length > 0) setActiveGroupId(st.groups[0].id);
              }}
              className={`px-3.5 py-1.5 rounded-lg font-tech font-bold text-xs uppercase tracking-wider transition whitespace-nowrap border ${
                activeStage?.id === st.id
                  ? 'bg-amber-500 text-slate-950 border-amber-400 font-black shadow'
                  : 'bg-slate-950/70 text-slate-400 border-slate-800 hover:bg-slate-800'
              }`}
            >
              {st.name}
            </button>
          ))}
        </div>

        {/* Groups in this Stage */}
        {activeStage && activeStage.groups.length > 0 && (
          <div className="flex items-center gap-2 mb-4 bg-slate-950/60 p-2 rounded-lg border border-slate-800">
            <span className="text-xs font-tech font-bold text-slate-400 uppercase ml-2">GROUPS:</span>
            {activeStage.groups.map((grp) => (
              <div key={grp.id} className="flex items-center gap-1">
                <button
                  onClick={() => setActiveGroupId(grp.id)}
                  className={`px-3 py-1 rounded text-xs font-tech font-bold uppercase transition border ${
                    activeGroup?.id === grp.id
                      ? 'bg-slate-800 text-white border-sky-400'
                      : 'bg-transparent text-slate-400 border-transparent hover:text-white'
                  }`}
                >
                  {grp.name} ({grp.standings.length} Teams)
                </button>
                <button onClick={() => renameGroup(grp)} className="p-1 text-slate-500 hover:text-sky-300" title="Rename group"><Edit2 className="w-3 h-3" /></button>
                <button onClick={() => deleteGroup(grp)} className="p-1 text-slate-500 hover:text-red-300" title="Delete group"><Trash2 className="w-3 h-3" /></button>
              </div>
            ))}

            {/* Quick squad import dropdown */}
            <div className="ml-auto flex items-center gap-2">
              <span className="text-[11px] text-slate-400 font-tech">Import Squad:</span>
              <select
                onChange={(e) => {
                  if (e.target.value) {
                    handleImportSquadToGroup(e.target.value);
                    e.target.value = '';
                  }
                }}
                className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-amber-300 font-tech"
              >
                <option value="">+ Add Team to Group</option>
                {squads.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.teamName} ({s.shortCode})
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Standings Table */}
        <div id="points-table-container" className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950">
          <table className="w-full text-left text-xs font-sans-ui">
            <thead>
              <tr className="bg-slate-900 text-slate-400 font-tech font-bold uppercase tracking-wider border-b border-slate-800">
                <th className="px-3 py-3 text-center">POS</th>
                <th className="px-4 py-3">TEAM NAME</th>
                <th className="px-3 py-3 text-center">P</th>
                <th className="px-3 py-3 text-center">W</th>
                <th className="px-3 py-3 text-center">L</th>
                <th className="px-3 py-3 text-center">T</th>
                <th className="px-3 py-3 text-center">NR</th>
                <th className="px-4 py-3 text-center font-bold text-amber-400">PTS</th>
                <th className="px-4 py-3 text-right">NRR</th>
                <th className="px-4 py-3 text-center">FORM</th>
                <th className="px-4 py-3 text-center text-slate-300">FOR</th>
                <th className="px-4 py-3 text-center text-slate-300">AGAINST</th>
                <th className="px-3 py-3 text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {!activeGroup || activeGroup.standings.length === 0 ? (
                <tr>
                  <td colSpan={13} className="px-4 py-8 text-center text-slate-500 font-tech italic">
                    No teams in this group yet. Select "Import Squad" above to populate the standings table!
                  </td>
                </tr>
              ) : (
                // Sort by points desc, then NRR desc
                [...activeGroup.standings]
                  .sort((a, b) => b.points - a.points || b.nrr - a.nrr)
                  .map((row, idx) => (
                    <tr
                      key={row.teamId}
                      className={`hover:bg-slate-900/50 transition ${
                        idx < 2 ? 'bg-amber-500/5' : ''
                      }`}
                    >
                      <td className="px-3 py-3 text-center font-mono font-bold">
                        <span
                          className={`w-6 h-6 rounded-full inline-flex items-center justify-center text-xs ${
                            idx === 0
                              ? 'bg-amber-500 text-slate-950 font-bold'
                              : idx === 1
                              ? 'bg-slate-700 text-white'
                              : 'text-slate-400'
                          }`}
                        >
                          {idx + 1}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {(() => {
                            const logo = getTeamLogo(row.teamId, row.shortCode);
                            return logo ? (
                              <img
                                src={logo}
                                alt={row.shortCode}
                                className="w-5 h-5 object-contain rounded bg-white/10 p-0.5 flex-shrink-0"
                              />
                            ) : null;
                          })()}
                          <span className="font-tech font-bold text-sm text-white">
                            {row.teamName}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-900 text-amber-400 font-mono font-bold">
                            {row.shortCode}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-center font-mono text-slate-300">{row.played}</td>
                      <td className="px-3 py-3 text-center font-mono text-emerald-400 font-bold">
                        {row.won}
                      </td>
                      <td className="px-3 py-3 text-center font-mono text-red-400">{row.lost}</td>
                      <td className="px-3 py-3 text-center font-mono text-slate-400">{row.tied}</td>
                      <td className="px-3 py-3 text-center font-mono text-slate-400">{row.noResult}</td>
                      <td className="px-4 py-3 text-center font-display font-bold text-lg text-amber-400">
                        {row.points}
                      </td>
                      <td
                        className={`px-4 py-3 text-right font-mono font-bold ${
                          row.nrr >= 0 ? 'text-emerald-400' : 'text-red-400'
                        }`}
                      >
                        {row.nrr > 0 ? `+${row.nrr.toFixed(3)}` : row.nrr.toFixed(3)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {row.form && row.form.length > 0 ? (
                            row.form.map((f, fIdx) => (
                              <span
                                key={fIdx}
                                className={`w-5 h-5 rounded flex items-center justify-center font-tech font-bold text-[10px] ${
                                  f === 'W'
                                    ? 'bg-emerald-600 text-white'
                                    : f === 'L'
                                    ? 'bg-red-600 text-white'
                                    : 'bg-slate-700 text-slate-300'
                                }`}
                              >
                                {f}
                              </span>
                            ))
                          ) : (
                            <span className="text-slate-600 font-mono">-</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center font-mono text-xs">
                        <span className="text-white font-bold">{row.runsFor || 0}</span>
                        <span className="text-slate-400 text-[10px]"> / {(row.oversFor || 0).toFixed(1)}</span>
                      </td>
                      <td className="px-4 py-3 text-center font-mono text-xs">
                        <span className="text-white font-bold">{row.runsAgainst || 0}</span>
                        <span className="text-slate-400 text-[10px]"> / {(row.oversAgainst || 0).toFixed(1)}</span>
                      </td>
                      <td className="px-3 py-3 text-right">
                        <button
                          onClick={() => handleRemoveTeamFromGroup(row.teamId)}
                          className="p-1 rounded text-slate-500 hover:text-red-400 transition"
                          title="Remove from table"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION 2: MATCH FIXTURES & RESULTS */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800 mb-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-sky-400" />
            <h2 className="font-tech font-bold text-lg text-white tracking-wide uppercase">
              TOURNAMENT FIXTURES & RESULTS ({fixtures.length})
            </h2>
          </div>

          <button
            onClick={() => {
              setEditingFixture(null);
              setFixtureTitle(`Match ${fixtures.length + 1}`);
              setFixtureStatus('upcoming');
              setFixtureResult('');
              setShowFixtureModal(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-tech font-bold text-xs uppercase shadow transition"
          >
            <Plus className="w-4 h-4" /> ADD MATCH FIXTURE
          </button>
        </div>

        {/* Fixtures List */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {fixtures.map((fix) => (
            <div
              key={fix.id}
              className="bg-slate-950 p-4 rounded-xl border border-slate-800 hover:border-slate-700 transition flex flex-col justify-between space-y-3"
            >
              <div className="flex items-center justify-between text-xs font-tech">
                <span className="text-amber-400 font-bold uppercase">{fix.title}</span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                    fix.status === 'live'
                      ? 'bg-red-600 text-white animate-pulse'
                      : fix.status === 'completed'
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                      : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  {fix.status}
                </span>
              </div>

              {/* Matchup */}
              <div className="flex items-center justify-between py-2">
                {(() => {
                  const logoA = getTeamLogo(fix.teamAId, fix.teamACode);
                  const logoB = getTeamLogo(fix.teamBId, fix.teamBCode);
                  return (
                    <>
                      <div className="text-center flex-1 flex flex-col items-center">
                        {logoA && (
                          <img
                            src={logoA}
                            alt={fix.teamACode}
                            className="w-8 h-8 object-contain rounded bg-white/10 p-1 mb-1 shadow-sm"
                          />
                        )}
                        <div className="font-tech font-bold text-base text-white">{fix.teamAName}</div>
                        <div className="text-xs font-mono text-amber-400">[{fix.teamACode}]</div>
                      </div>

                      <div className="font-display font-bold text-slate-500 text-xl px-4">VS</div>

                      <div className="text-center flex-1 flex flex-col items-center">
                        {logoB && (
                          <img
                            src={logoB}
                            alt={fix.teamBCode}
                            className="w-8 h-8 object-contain rounded bg-white/10 p-1 mb-1 shadow-sm"
                          />
                        )}
                        <div className="font-tech font-bold text-base text-white">{fix.teamBName}</div>
                        <div className="text-xs font-mono text-red-400">[{fix.teamBCode}]</div>
                      </div>
                    </>
                  );
                })()}
              </div>

              {/* Scores or Result text */}
              {fix.scoresSummary && (
                <div className="bg-slate-900 px-3 py-1.5 rounded text-xs font-tech text-amber-300 font-bold text-center">
                  {fix.scoresSummary}
                </div>
              )}
              {fix.resultText && (
                <div className="bg-emerald-950/60 border border-emerald-800/80 px-3 py-1 rounded text-xs font-tech text-emerald-300 text-center">
                  {fix.resultText}
                </div>
              )}

              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800/80">
                <div>
                  {fix.date} • {fix.venue.split(',')[0]}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => loadMatchFixture(fix.id)}
                    className="px-2.5 py-1 rounded bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-slate-950 text-xs font-tech font-bold transition flex items-center gap-1"
                    title="Load this match to score live"
                  >
                    <Play className="w-3 h-3" /> SCORE
                  </button>

                  <button
                    onClick={onOpenScorecard}
                    className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-tech font-bold transition flex items-center gap-1"
                    title="View Full Scorecard"
                  >
                    <FileText className="w-3 h-3 text-sky-400" /> SCORECARD
                  </button>

                  <button
                    onClick={() => {
                      deleteFixture(fix.id);
                    }}
                    className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-950/40 rounded transition"
                    title="Delete fixture"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* MODAL: ADD STAGE */}
      {showAddStage && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-5 shadow-2xl">
            <h3 className="text-lg font-tech font-bold text-white uppercase mb-4">
              ADD TOURNAMENT STAGE
            </h3>
            <form onSubmit={handleCreateStage} className="space-y-4 text-xs font-tech">
              <div>
                <label className="block text-slate-300 uppercase mb-1">STAGE NAME:</label>
                <input
                  type="text"
                  value={newStageName}
                  onChange={(e) => setNewStageName(e.target.value)}
                  placeholder="e.g. Super 10 / Super 8 / Super 4 / Semifinals"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-sans-ui text-sm focus:outline-none focus:border-amber-400"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 uppercase mb-1">STAGE TYPE:</label>
                <select
                  value={newStageType}
                  onChange={(e) => setNewStageType(e.target.value as TournamentStageType)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-400"
                >
                  <option value="group_stage">Group Stage</option>
                  <option value="super_10">Super 10</option>
                  <option value="super_8">Super 8</option>
                  <option value="super_4">Super 4</option>
                  <option value="semifinal">Semifinal</option>
                  <option value="final">Final / Championship</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddStage(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 font-bold"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-black uppercase shadow"
                >
                  CREATE STAGE
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD GROUP */}
      {showAddGroup && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-5 shadow-2xl">
            <h3 className="text-lg font-tech font-bold text-white uppercase mb-4">
              ADD GROUP TO {activeStage?.name}
            </h3>
            <form onSubmit={handleCreateGroup} className="space-y-4 text-xs font-tech">
              <div>
                <label className="block text-slate-300 uppercase mb-1">GROUP NAME:</label>
                <input
                  type="text"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="e.g. Group B / Pool 2"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-sans-ui text-sm focus:outline-none focus:border-sky-400"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddGroup(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 font-bold"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-black uppercase shadow"
                >
                  CREATE GROUP
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT FIXTURE */}
      {showFixtureModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-5 shadow-2xl">
            <h3 className="text-lg font-tech font-bold text-white uppercase mb-4">
              {editingFixture ? 'EDIT MATCH FIXTURE' : 'ADD NEW MATCH FIXTURE'}
            </h3>
            <form onSubmit={handleSaveFixture} className="space-y-4 text-xs font-tech">
              <div>
                <label className="block text-slate-300 uppercase mb-1">FIXTURE TITLE:</label>
                <input
                  type="text"
                  value={fixtureTitle}
                  onChange={(e) => setFixtureTitle(e.target.value)}
                  placeholder="e.g. Match 05 - Super 4"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-sans-ui text-sm focus:outline-none focus:border-sky-400"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 uppercase mb-1">TEAM A:</label>
                  <select
                    value={teamAId}
                    onChange={(e) => setTeamAId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
                  >
                    {squads.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.teamName} ({s.shortCode})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 uppercase mb-1">TEAM B:</label>
                  <select
                    value={teamBId}
                    onChange={(e) => setTeamBId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
                  >
                    {squads.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.teamName} ({s.shortCode})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 uppercase mb-1">DATE:</label>
                  <input
                    type="date"
                    value={fixtureDate}
                    onChange={(e) => setFixtureDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 uppercase mb-1">STATUS:</label>
                  <select
                    value={fixtureStatus}
                    onChange={(e) => setFixtureStatus(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  >
                    <option value="upcoming">Upcoming</option>
                    <option value="live">Live</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 uppercase mb-1">VENUE:</label>
                <input
                  type="text"
                  value={fixtureVenue}
                  onChange={(e) => setFixtureVenue(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-sans-ui"
                />
              </div>

              <div>
                <label className="block text-slate-300 uppercase mb-1">RESULT SUMMARY (OPTIONAL):</label>
                <input
                  type="text"
                  value={fixtureResult}
                  onChange={(e) => setFixtureResult(e.target.value)}
                  placeholder="e.g. Deziglo Tigers won by 24 runs"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-sans-ui"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowFixtureModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 font-bold"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-black uppercase shadow"
                >
                  SAVE FIXTURE
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
