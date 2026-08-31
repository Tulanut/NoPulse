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
      if (e.clientY <= 40) {
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
    }, 1200);
  };

  const formatTime = (isoString: string | null) => {
    if (!isoString) return 'Never';
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <>
      {/* Top Hover Trigger Zone (Top edge) */}
      <div
        onMouseEnter={handleMouseEnter}
        className="fixed top-0 left-0 right-0 h-5 z-40 pointer-events-auto"
      />

      {/* Subtle Soft Pull Tab when hidden */}
      <div
        onMouseEnter={handleMouseEnter}
        className={`fixed top-0 left-1/2 -translate-x-1/2 z-30 transition-all duration-300 ${
          isRevealed
            ? 'opacity-0 -translate-y-full pointer-events-none'
            : 'opacity-60 hover:opacity-100 cursor-pointer pointer-events-auto'
        }`}
      >
        <div className="flex items-center gap-1.5 px-4 py-1 rounded-b-xl bg-[#201E1B]/90 border-b border-x border-[#33302B] text-[11px] font-sans text-[#A8A297] backdrop-blur-md shadow-lg shadow-black/20 hover:text-[#F5F2EB] hover:border-[#4D4740] transition-all">
          <span>navigation</span>
          <ChevronDown className="w-3.5 h-3.5 text-[#CC6543]" />
        </div>
      </div>

      {/* Auto-Hiding Floating Navigation Header */}
      <header
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={`fixed top-0 left-0 right-0 z-50 bg-[#1A1816]/95 backdrop-blur-xl border-b border-[#2E2B26]/80 px-5 py-3 sm:py-3.5 shadow-2xl shadow-black/40 transition-all duration-300 transform ${
          isRevealed
            ? 'translate-y-0 opacity-100 pointer-events-auto'
            : '-translate-y-full opacity-0 pointer-events-none'
        }`}
      >
        <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-4 font-sans">
          {/* Brand (The NoPulse Logo & Hover you liked - Preserved) */}
          <button
            onClick={() => {
              onNavigate('landing');
              setIsRevealed(false);
            }}
            className="flex items-center gap-2.5 text-left group active:scale-95 transition-all duration-200"
          >
            <div className="w-8 h-8 rounded-xl bg-[#CC6543] flex items-center justify-center shadow-md shadow-[#CC6543]/20 ring-1 ring-white/10 group-hover:bg-[#DE7C5A] group-hover:scale-105 group-hover:shadow-lg group-hover:shadow-[#CC6543]/30 transition-all duration-200">
              <Dumbbell className="w-4 h-4 text-white" />
            </div>
            <h1 className="text-base sm:text-lg font-bold tracking-tight text-[#F5F2EB] group-hover:text-[#DE7C5A] transition-colors">
              NoPulse
            </h1>
          </button>

          {/* Smooth, Soft Navigation Pills with Enhanced Spacing */}
          <nav className="flex items-center gap-1.5 bg-[#22201D] border border-[#33302B] p-1 rounded-2xl shadow-inner shadow-black/20">
            <button
              onClick={() => {
                onNavigate('landing');
                setIsRevealed(false);
              }}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs active:scale-95 transition-all duration-200 ${
                currentScreen === 'landing'
                  ? 'bg-[#2E2B26] text-[#F5F2EB] shadow-sm font-bold border border-[#44403A]'
                  : 'text-[#A8A297] hover:text-[#F5F2EB] hover:bg-[#2E2B26]/50'
              }`}
            >
              <Home className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Home</span>
            </button>

            <button
              onClick={() => {
                onNavigate('log');
                setIsRevealed(false);
              }}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs active:scale-95 transition-all duration-200 ${
                currentScreen === 'log'
                  ? 'bg-[#CC6543] text-white shadow-md shadow-[#CC6543]/25 font-bold'
                  : 'text-[#A8A297] hover:text-[#F5F2EB] hover:bg-[#2E2B26]/50'
              }`}
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Add Log</span>
            </button>

            <button
              onClick={() => {
                onNavigate('exercises');
                setIsRevealed(false);
              }}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs active:scale-95 transition-all duration-200 ${
                currentScreen === 'exercises' || currentScreen === 'exercise-detail'
                  ? 'bg-[#CC6543] text-white shadow-md shadow-[#CC6543]/25 font-bold'
                  : 'text-[#A8A297] hover:text-[#F5F2EB] hover:bg-[#2E2B26]/50'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Exercises</span>
            </button>

            <button
              onClick={() => {
                onNavigate('profile');
                setIsRevealed(false);
              }}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs active:scale-95 transition-all duration-200 ${
                currentScreen === 'profile'
                  ? 'bg-[#CC6543] text-white shadow-md shadow-[#CC6543]/25 font-bold'
                  : 'text-[#A8A297] hover:text-[#F5F2EB] hover:bg-[#2E2B26]/50'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>Profile</span>
            </button>
          </nav>

          {/* Action Tools with Soft Dark Borders & Harmonized Gap */}
          <div className="flex items-center gap-2.5">
            {/* Network pill */}
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium border transition-all duration-200 ${
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
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-[#CC6543]/15 text-[#E59B80] border border-[#CC6543]/30 font-semibold animate-pop-in">
                <AlertCircle className="w-3 h-3" />
                <span>{pendingSyncCount}</span>
              </div>
            )}

            {/* Sync Button */}
            <button
              onClick={onManualSync}
              disabled={syncState === 'syncing' || !isOnline}
              className="p-1.5 rounded-xl bg-[#22201D] hover:bg-[#2E2B26] hover:border-[#4D4740] hover:scale-105 active:scale-95 disabled:opacity-40 text-[#A8A297] hover:text-[#F5F2EB] border border-[#33302B] transition-all duration-200"
              title={lastSyncedAt ? `Last Synced: ${formatTime(lastSyncedAt)}` : 'Sync Database'}
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${
                  syncState === 'syncing' ? 'animate-spin text-[#CC6543]' : ''
                }`}
              />
            </button>

            {/* Fullscreen Button */}
            <button
              onClick={onToggleFullscreen}
              className="p-1.5 rounded-xl bg-[#22201D] hover:bg-[#2E2B26] hover:border-[#4D4740] hover:scale-105 active:scale-95 text-[#A8A297] hover:text-[#F5F2EB] border border-[#33302B] transition-all duration-200"
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
              className={`px-2.5 py-1 rounded-xl text-[10px] border active:scale-95 transition-all duration-200 ${
                simulatedOffline
                  ? 'bg-[#E08E45]/20 text-[#F0BD85] border-[#E08E45]/50'
                  : 'bg-[#22201D] text-[#706B62] border-[#33302B] hover:text-[#F5F2EB] hover:border-[#4D4740]'
              }`}
              title="Toggle simulated offline state"
            >
              <Database className="w-3 h-3 inline mr-1 text-[#CC6543]" />
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
