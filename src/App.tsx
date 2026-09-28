import React, { useState, useEffect } from 'react';
import {
  Tv,
  Gamepad2,
  Users,
  Table,
  Trophy,
  Settings,
  ExternalLink,
  Printer,
  Radio,
  Eye,
  ChevronUp,
  ChevronDown,
  Zap,
  BookOpen,
} from 'lucide-react';
import { CricketProvider, useCricket } from './context/CricketContext';
import { MatchState } from './types';
import { ScoringConsole } from './components/ScoringConsole';
import { BroadcastController } from './components/BroadcastController';
import { SquadsPanel } from './components/SquadsPanel';
import { PointsTablePanel } from './components/PointsTablePanel';
import { TournamentStatsPanel } from './components/TournamentStatsPanel';
import { ScorecardsArchivePanel } from './components/ScorecardsArchivePanel';
import { SettingsPanel } from './components/SettingsPanel';
import { BroadcastOverlays } from './components/overlays/BroadcastOverlays';
import { SuperOverModal } from './components/SuperOverModal';
import { FullMatchScorecard } from './components/FullMatchScorecard';
import { ResetModal } from './components/ResetModal';
import { MatchFlowModals } from './components/MatchFlowModals';
import { RotateCcw } from 'lucide-react';

type NavigationTab = 'scoring' | 'overlays' | 'squads' | 'points_fixtures' | 'stats' | 'scorecards' | 'settings';

function MainLayout() {
  const { match, overlayConfig, getTeamLogo } = useCricket();

  const [activeTab, setActiveTab] = useState<NavigationTab>('scoring');
  const [showScorecard, setShowScorecard] = useState(false);
  const [selectedMatchForScorecard, setSelectedMatchForScorecard] = useState<MatchState | undefined>(undefined);
  const [showResetModal, setShowResetModal] = useState(false);
  const [showLiveMonitor, setShowLiveMonitor] = useState(true);

  // Check if loaded strictly as an OBS / vMix Browser Source overlay
  const urlParams = new URLSearchParams(window.location.search);
  const isOverlayOnly =
    urlParams.get('overlayOnly') === 'true' ||
    urlParams.get('overlay') === 'true' ||
    urlParams.get('view') === 'overlay';

  if (isOverlayOnly) {
    return (
      <div className="w-screen h-screen overflow-hidden select-none">
        <BroadcastOverlays isPreviewMode={false} />
      </div>
    );
  }

  const currentInning =
    match.superOver?.active
      ? match.superOver.currentInning === 1
        ? match.superOver.inning1
        : match.superOver.inning2
      : match.currentInningIndex === 1
      ? match.inning1
      : match.inning2;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans-ui selection:bg-amber-500 selection:text-black">
      {/* GLOBAL HEADER BAR */}
      <header className="no-print bg-slate-900 border-b border-slate-800 sticky top-0 z-40 shadow-xl">
        <div className="h-0.5 bg-gradient-to-r from-[#00adef] via-sky-400 to-[#0284c7] w-full" />
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2 flex flex-wrap items-center justify-between gap-2.5">
          {/* Brand & Match stage */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <img
                src="/logo.png"
                alt="DEZIGLO SOFT"
                className="w-9 h-9 object-contain rounded-lg bg-white p-0.5 shadow-md border-2 border-[#00adef]"
              />
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-display font-black text-xl tracking-tight text-white uppercase">
                    DEZIGLO <span className="text-[#00adef]">SOFT</span>
                  </span>
                  <span className="text-[10px] font-tech font-bold uppercase tracking-widest bg-red-600/90 text-white px-1.5 py-0.2 rounded animate-pulse">
                    ON-AIR
                  </span>
                </div>
                <div className="text-[11px] font-tech text-slate-400 -mt-0.5 truncate max-w-[200px] sm:max-w-xs">
                  {match.settings.tournamentName} • {match.settings.matchTitle}
                </div>
              </div>
            </div>
          </div>

          {/* Real-time Match score summary pill */}
          <div className="flex items-center gap-2.5 bg-slate-950 px-3 py-1.5 rounded-xl border border-[#00adef]/30">
            <div className="flex items-center gap-2 font-tech font-bold text-sm">
              {(() => {
                const battingLogo = getTeamLogo(currentInning.battingTeamId, currentInning.battingTeamCode);
                return battingLogo ? (
                  <img
                    src={battingLogo}
                    alt={currentInning.battingTeamCode}
                    className="w-5 h-5 object-contain rounded bg-white/10 p-0.5"
                  />
                ) : null;
              })()}
              <span className="text-[#00adef]">{currentInning.battingTeamCode}:</span>
              <span className="font-display text-xl text-white font-black leading-none">
                {currentInning.totalRuns}/{currentInning.wickets}
              </span>
              <span className="text-xs text-slate-400">({currentInning.oversFormatted} ov)</span>
            </div>

            {match.currentInningIndex === 2 && match.targetRuns > 0 && (
              <div className="text-xs font-tech text-sky-400 border-l border-slate-800 pl-2.5">
                Target: <strong className="text-white">{match.targetRuns}</strong> ({Math.max(0, match.targetRuns - currentInning.totalRuns)} req)
              </div>
            )}
          </div>

          {/* Quick Header actions (responsive for split-screen half PC window) */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            <button
              onClick={() => setShowResetModal(true)}
              className="px-2.5 sm:px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/50 text-xs font-tech font-bold transition flex items-center gap-1.5"
              title="Reset match options, clear scores, or start next match"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden md:inline">RESET</span> OPTIONS
            </button>

            <button
              onClick={() => setActiveTab('scorecards')}
              className={`px-2.5 sm:px-3 py-1.5 rounded-lg border text-xs font-tech font-bold transition flex items-center gap-1.5 ${
                activeTab === 'scorecards'
                  ? 'bg-[#00adef] text-slate-950 border-sky-300 font-black'
                  : 'bg-slate-800 hover:bg-slate-700 text-sky-300 border-[#00adef]/40'
              }`}
              title="View all tournament scorecards & full archive"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span className="hidden md:inline">SCORECARDS</span> ARCHIVE
            </button>

            <button
              onClick={() => setShowScorecard(true)}
              className="px-2.5 sm:px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-tech font-bold transition flex items-center gap-1.5"
              title="View active match scorecard & print PDF"
            >
              <Printer className="w-3.5 h-3.5 text-[#00adef]" />
              <span className="hidden md:inline">MATCH</span> PDF
            </button>

            <button
              onClick={() =>
                window.open(`${window.location.origin}${window.location.pathname}?overlayOnly=true`, '_blank')
              }
              className="px-2.5 sm:px-3 py-1.5 rounded-lg bg-[#00adef] hover:bg-sky-400 text-slate-950 text-xs font-tech font-black transition flex items-center gap-1.5 shadow border border-sky-300"
              title="Open dedicated OBS Studio / vMix browser source window"
            >
              <Tv className="w-3.5 h-3.5 text-slate-950" />
              <span className="hidden md:inline">OBS</span> OVERLAY
            </button>
          </div>
        </div>

        {/* NAVIGATION TABS BAR (Cyan themed with horizontal scroll for half-screen) */}
        <div className="border-t border-slate-800/80 bg-slate-950/70 overflow-x-auto scrollbar-thin">
          <div className="max-w-7xl mx-auto px-3 sm:px-4 flex items-center gap-1">
            {[
              { id: 'scoring', label: 'LIVE SCORING (BALL PANEL)', icon: Gamepad2 },
              { id: 'overlays', label: 'OBS / VMIX GRAPHICS', icon: Tv },
              { id: 'squads', label: 'SQUADS & PLAYERS', icon: Users },
              { id: 'points_fixtures', label: 'POINTS TABLE & FIXTURES', icon: Table },
              { id: 'stats', label: 'TOURNAMENT STATS', icon: Trophy },
              { id: 'scorecards', label: 'SCORECARDS ARCHIVE', icon: BookOpen },
              { id: 'settings', label: 'MATCH SETTINGS', icon: Settings },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as NavigationTab)}
                className={`py-2 px-3 rounded-t-lg font-tech font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 whitespace-nowrap transition border-b-2 ${
                  activeTab === tab.id
                    ? 'border-[#00adef] text-[#00adef] bg-slate-900/95 shadow-sm'
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
                }`}
              >
                <tab.icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* LIVE OVERLAY STREAM MONITOR (PREVIEW WINDOW - SPLIT-SCREEN OPTIMIZED) */}
      <div className="no-print max-w-7xl mx-auto w-full px-2 sm:px-4 lg:px-6 pt-3">
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
          <div className="bg-slate-950 px-3 sm:px-4 py-2 border-b border-slate-800 flex items-center justify-between text-xs font-tech">
            <div className="flex items-center gap-2">
              <Radio className="w-3.5 h-3.5 text-red-500 animate-pulse" />
              <span className="font-bold text-white uppercase tracking-wider">
                LIVE BROADCAST STREAM MONITOR
              </span>
              <span className="hidden sm:inline text-slate-500 font-mono">
                [Active Overlay: {overlayConfig.activeOverlay.toUpperCase()}]
              </span>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowLiveMonitor(!showLiveMonitor)}
                className="text-slate-400 hover:text-white flex items-center gap-1 text-xs font-tech bg-slate-900 hover:bg-slate-800 px-2 py-1 rounded border border-slate-800 transition"
                title="Toggle monitor to save vertical space when split-screening on PC"
              >
                {showLiveMonitor ? (
                  <>
                    <ChevronUp className="w-3.5 h-3.5 text-[#00adef]" /> Hide (Split-Screen Mode)
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-3.5 h-3.5 text-[#00adef]" /> Show Monitor
                  </>
                )}
              </button>
            </div>
          </div>

          {showLiveMonitor && (
            <div className="relative w-full aspect-[21/9] sm:aspect-[16/6] bg-slate-950/90 border-t border-slate-900 overflow-hidden">
              {/* Broadcast canvas layer */}
              <div className="absolute inset-0 pointer-events-none">
                <BroadcastOverlays isPreviewMode={true} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* MAIN CONTENT WORKSPACE */}
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-5 flex-1">
        {activeTab === 'scoring' && <ScoringConsole />}
        {activeTab === 'overlays' && <BroadcastController />}
        {activeTab === 'squads' && <SquadsPanel />}
        {activeTab === 'points_fixtures' && (
          <PointsTablePanel onOpenScorecard={() => setShowScorecard(true)} />
        )}
        {activeTab === 'stats' && <TournamentStatsPanel />}
        {activeTab === 'scorecards' && (
          <ScorecardsArchivePanel
            onOpenScorecardForMatch={(m) => {
              setSelectedMatchForScorecard(m);
              setShowScorecard(true);
            }}
            onOpenResetModal={() => setShowResetModal(true)}
          />
        )}
        {activeTab === 'settings' && <SettingsPanel />}
      </main>

      {/* FOOTER */}
      <footer className="no-print border-t border-slate-800/80 bg-slate-900/60 py-3 text-center text-xs font-tech text-slate-500">
        DEZIGLO SOFT • PROFESSIONAL CRICKET BROADCAST OVERLAY & LIVE STREAMING SUITE • OBS / VMIX COMPATIBLE
      </footer>

      {/* SUPER OVER POPUP WHEN TIED */}
      <SuperOverModal />

      {/* MATCH FLOW POPUPS (1ST INNINGS BREAK & MATCH FINISHED) */}
      <MatchFlowModals
        onOpenScorecard={() => setShowScorecard(true)}
        onOpenResetModal={() => setShowResetModal(true)}
      />

      {/* RESET & NEW MATCH MODAL */}
      <ResetModal isOpen={showResetModal} onClose={() => setShowResetModal(false)} />

      {/* FULL MATCH OFFICIAL SCORECARD MODAL */}
      {showScorecard && (
        <FullMatchScorecard
          onClose={() => {
            setShowScorecard(false);
            setSelectedMatchForScorecard(undefined);
          }}
          targetMatch={selectedMatchForScorecard}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <CricketProvider>
      <MainLayout />
    </CricketProvider>
  );
}
