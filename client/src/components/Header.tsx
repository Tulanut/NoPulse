import React, { useState, useEffect, useRef } from 'react';
import {
  Dumbbell,
  Wifi,
  WifiOff,
  RefreshCw,
  Database,
  AlertCircle,
  PlusCircle,
  Layers,
  Home,
  User,
  Maximize,
  Minimize,
  ChevronDown,
} from 'lucide-react';
import { SyncState } from '../services/syncService';

export type ScreenState = 'landing' | 'log' | 'exercises' | 'exercise-detail' | 'profile';

interface HeaderProps {
  currentScreen: ScreenState;
  onNavigate: (screen: ScreenState) => void;
  isOnline: boolean;
  simulatedOffline: boolean;
  toggleSimulateOffline: () => void;
  syncState: SyncState;
  pendingSyncCount: number;
  lastSyncedAt: string | null;
  onManualSync: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentScreen,
  onNavigate,
  isOnline,
  simulatedOffline,
  toggleSimulateOffline,
  syncState,
  pendingSyncCount,
  lastSyncedAt,
  onManualSync,
  isFullscreen,
  onToggleFullscreen,
}) => {
  const [isRevealed, setIsRevealed] = useState(false);
  const hideTimerRef = useRef<number | null>(null);

  // Auto-hide mouse tracking near top of window
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (e.clientY <= 35) {
        setIsRevealed(true);
        if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const handleMouseEnter = () => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    setIsRevealed(true);
  };

  const handleMouseLeave = () => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => {
      setIsRevealed(false);
    }, 1000);
  };

  const formatTime = (isoString: string | null) => {
    if (!isoString) return 'Never';
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <>
      {/* Top Hover Trigger Zone (Thin top edge) */}
      <div
        onMouseEnter={handleMouseEnter}
        className="fixed top-0 left-0 right-0 h-4 z-40 pointer-events-auto"
      />

      {/* Subtle Hint Pull Tab when hidden */}
      <div
        onMouseEnter={handleMouseEnter}
        className={`fixed top-0 left-1/2 -translate-x-1/2 z-30 transition-all duration-300 ${
          isRevealed
            ? 'opacity-0 -translate-y-full pointer-events-none'
            : 'opacity-50 hover:opacity-100 cursor-pointer pointer-events-auto'
        }`}
      >
        <div className="flex items-center gap-1.5 px-3 py-0.5 rounded-b-xl bg-[#252320]/80 border-b border-x border-[#383530] text-[10px] font-sans text-[#A8A297] backdrop-blur-sm shadow-sm hover:text-[#F5F2EB] transition">
          <span>navigation</span>
          <ChevronDown className="w-3 h-3 text-[#CC6543]" />
        </div>
      </div>

      {/* Auto-Hiding Floating Navigation Header */}
      <header
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={`fixed top-0 left-0 right-0 z-50 bg-[#191816]/95 backdrop-blur-md border-b border-claude-border px-4 py-2.5 shadow-xl transition-all duration-300 transform ${
          isRevealed
            ? 'translate-y-0 opacity-100 pointer-events-auto'
            : '-translate-y-full opacity-0 pointer-events-none'
        }`}
      >
        <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-3 font-sans">
          {/* Brand (Click to go Home) */}
          <button
            onClick={() => {
              onNavigate('landing');
              setIsRevealed(false);
            }}
            className="flex items-center gap-2 text-left group active:scale-95 transition-all duration-200"
          >
            <div className="w-7 h-7 rounded-lg bg-[#CC6543] flex items-center justify-center shadow-md shadow-[#CC6543]/20 ring-1 ring-white/10 group-hover:bg-[#DE7C5A] group-hover:scale-105 transition-all duration-200">
              <Dumbbell className="w-3.5 h-3.5 text-white" />
            </div>
            <h1 className="text-base font-bold tracking-tight text-claude-text group-hover:text-claude-terracottaLight transition-colors">
              IronPulse
            </h1>
          </button>

          {/* Minimal Navigation Pills */}
          <nav className="flex items-center gap-1 bg-claude-surfaceDark border border-claude-border p-0.5 rounded-xl">
            <button
              onClick={() => {
                onNavigate('landing');
                setIsRevealed(false);
              }}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs active:scale-95 transition-all duration-200 ${
                currentScreen === 'landing'
                  ? 'bg-claude-surface text-white shadow-sm font-semibold'
                  : 'text-claude-textMuted hover:text-claude-text hover:bg-claude-surface/50'
              }`}
            >
              <Home className="w-3 h-3" />
              <span className="hidden sm:inline">Home</span>
            </button>

            <button
              onClick={() => {
                onNavigate('log');
                setIsRevealed(false);
              }}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs active:scale-95 transition-all duration-200 ${
                currentScreen === 'log'
                  ? 'bg-[#CC6543] text-white shadow-sm font-semibold'
                  : 'text-claude-textMuted hover:text-claude-text hover:bg-claude-surface/50'
              }`}
            >
              <PlusCircle className="w-3 h-3" />
              <span>Add Log</span>
            </button>

            <button
              onClick={() => {
                onNavigate('exercises');
                setIsRevealed(false);
              }}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs active:scale-95 transition-all duration-200 ${
                currentScreen === 'exercises' || currentScreen === 'exercise-detail'
                  ? 'bg-[#CC6543] text-white shadow-sm font-semibold'
                  : 'text-claude-textMuted hover:text-claude-text hover:bg-claude-surface/50'
              }`}
            >
              <Layers className="w-3 h-3" />
              <span>Exercises</span>
            </button>

            <button
              onClick={() => {
                onNavigate('profile');
                setIsRevealed(false);
              }}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs active:scale-95 transition-all duration-200 ${
                currentScreen === 'profile'
                  ? 'bg-[#CC6543] text-white shadow-sm font-semibold'
                  : 'text-claude-textMuted hover:text-claude-text hover:bg-claude-surface/50'
              }`}
            >
              <User className="w-3 h-3" />
              <span>Profile</span>
            </button>
          </nav>

          {/* Actions (Sync, Fullscreen, Offline Simulation) */}
          <div className="flex items-center gap-2">
            {/* Network pill */}
            <div
              className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-sans border transition-all duration-200 ${
                isOnline
                  ? 'bg-[#789D74]/15 text-[#B8D4B5] border-[#789D74]/30'
                  : 'bg-[#E08E45]/15 text-[#F0BD85] border-[#E08E45]/30'
              }`}
            >
              {isOnline ? (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-[#789D74]"></span>
                  <Wifi className="w-3 h-3" />
                  <span className="hidden md:inline">Online</span>
                </>
              ) : (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-[#E08E45]"></span>
                  <WifiOff className="w-3 h-3" />
                  <span>Offline</span>
                </>
              )}
            </div>

            {pendingSyncCount > 0 && (
              <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] bg-[#CC6543]/15 text-[#E59B80] border border-[#CC6543]/30 font-sans animate-pop-in">
                <AlertCircle className="w-3 h-3" />
                <span>{pendingSyncCount}</span>
              </div>
            )}

            {/* Sync */}
            <button
              onClick={onManualSync}
              disabled={syncState === 'syncing' || !isOnline}
              className="p-1 rounded-lg bg-claude-surface hover:bg-claude-surfaceHover hover:scale-105 active:scale-95 disabled:opacity-40 text-claude-textMuted hover:text-claude-text border border-claude-border transition-all duration-200"
              title={lastSyncedAt ? `Last Synced: ${formatTime(lastSyncedAt)}` : 'Sync Database'}
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${
                  syncState === 'syncing' ? 'animate-spin text-claude-terracotta' : ''
                }`}
              />
            </button>

            {/* Fullscreen Toggle Button */}
            <button
              onClick={onToggleFullscreen}
              className="p-1 rounded-lg bg-claude-surface hover:bg-claude-surfaceHover hover:scale-105 active:scale-95 text-claude-textMuted hover:text-claude-text border border-claude-border transition-all duration-200"
              title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
            >
              {isFullscreen ? (
                <Minimize className="w-3.5 h-3.5" />
              ) : (
                <Maximize className="w-3.5 h-3.5" />
              )}
            </button>

            {/* Offline Simulation Toggle */}
            <button
              onClick={toggleSimulateOffline}
              className={`px-2 py-0.5 rounded-lg text-[10px] font-sans border active:scale-95 transition-all duration-200 ${
                simulatedOffline
                  ? 'bg-[#E08E45]/20 text-[#F0BD85] border-[#E08E45]/50'
                  : 'bg-claude-surfaceDark text-claude-textDim border-claude-border hover:text-claude-text hover:border-claude-borderHover'
              }`}
              title="Toggle simulated offline state"
            >
              <Database className="w-3 h-3 inline mr-1" />
              <span className="hidden sm:inline">
                {simulatedOffline ? 'Online' : 'Offline'}
              </span>
            </button>
          </div>
        </div>
      </header>
    </>
  );
};
