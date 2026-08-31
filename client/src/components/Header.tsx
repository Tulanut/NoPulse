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
  ChevronRight,
  PanelLeft,
  PanelTop,
} from 'lucide-react';
import { SyncState } from '../services/syncService';

export type ScreenState = 'landing' | 'log' | 'exercises' | 'exercise-detail' | 'profile';
export type NavPosition = 'top' | 'side';

interface HeaderProps {
  currentScreen: ScreenState;
  onNavigate: (screen: ScreenState) => void;
  navPosition: NavPosition;
  onToggleNavPosition: () => void;
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
  navPosition,
  onToggleNavPosition,
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

  // Auto-hide tracking: top edge for 'top', left edge for 'side'
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (navPosition === 'top') {
        if (e.clientY <= 40) {
          setIsRevealed(true);
          if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
        }
      } else {
        if (e.clientX <= 45) {
          setIsRevealed(true);
          if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
        }
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [navPosition]);

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

  // =========================================================================
  // 1. SIDE POSITION NAVIGATION
  // =========================================================================
  if (navPosition === 'side') {
    return (
      <>
        {/* Left Hover Trigger Zone */}
        <div
          onMouseEnter={handleMouseEnter}
          className="fixed top-0 bottom-0 left-0 w-5 z-40 pointer-events-auto"
        />

        {/* Subtle Pull Tab on the Left Edge when hidden */}
        <div
          onMouseEnter={handleMouseEnter}
          className={`fixed top-1/2 left-0 -translate-y-1/2 z-30 transition-all duration-300 ${
            isRevealed
              ? 'opacity-0 -translate-x-full pointer-events-none'
              : 'opacity-60 hover:opacity-100 cursor-pointer pointer-events-auto'
          }`}
        >
          <div className="flex flex-col items-center gap-1.5 px-1.5 py-4 rounded-r-2xl bg-[#201E1B]/90 border-r border-y border-[#33302B] text-[10px] font-sans text-[#A8A297] backdrop-blur-md shadow-2xl shadow-black/40 hover:text-[#F5F2EB] hover:border-[#4D4740] transition-all">
            <span className="[writing-mode:vertical-lr] tracking-widest uppercase text-[9px]">menu</span>
            <ChevronRight className="w-3.5 h-3.5 text-[#CC6543] mt-1" />
          </div>
        </div>

        {/* Floating Side Navigation Bar */}
        <aside
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          className={`fixed top-0 bottom-0 left-0 z-50 w-20 sm:w-24 bg-[#1A1816]/95 backdrop-blur-xl border-r border-[#2E2B26]/80 py-6 px-2.5 flex flex-col justify-between items-center shadow-2xl shadow-black/50 transition-all duration-300 transform ${
            isRevealed
              ? 'translate-x-0 opacity-100 pointer-events-auto'
              : '-translate-x-full opacity-0 pointer-events-none'
          }`}
        >
          {/* Top: NoPulse Brand with beloved hover */}
          <button
            onClick={() => {
              onNavigate('landing');
              setIsRevealed(false);
            }}
            className="flex flex-col items-center gap-1.5 text-center group active:scale-95 transition-all duration-200"
            title="NoPulse Home"
          >
            <div className="w-9 h-9 rounded-xl bg-[#CC6543] flex items-center justify-center shadow-md shadow-[#CC6543]/20 ring-1 ring-white/10 group-hover:bg-[#DE7C5A] group-hover:scale-105 group-hover:shadow-lg group-hover:shadow-[#CC6543]/30 transition-all duration-200">
              <Dumbbell className="w-4 h-4 text-white" />
            </div>
            <span className="text-[11px] font-bold tracking-tight text-[#F5F2EB] group-hover:text-[#DE7C5A] transition-colors">
              NoPulse
            </span>
          </button>

          {/* Center: Vertical Navigation Buttons */}
          <nav className="flex flex-col items-center gap-2 bg-[#22201D] border border-[#33302B] p-1.5 rounded-2xl shadow-inner shadow-black/20 w-full">
            <button
              onClick={() => {
                onNavigate('landing');
                setIsRevealed(false);
              }}
              className={`flex flex-col items-center justify-center gap-1 w-full py-2.5 rounded-xl text-[10px] active:scale-95 transition-all duration-200 ${
                currentScreen === 'landing'
                  ? 'bg-[#2E2B26] text-[#F5F2EB] font-bold border border-[#44403A] shadow-sm'
                  : 'text-[#A8A297] hover:text-[#F5F2EB] hover:bg-[#2E2B26]/50'
              }`}
              title="Home"
            >
              <Home className="w-4 h-4" />
              <span>Home</span>
            </button>

            <button
              onClick={() => {
                onNavigate('log');
                setIsRevealed(false);
              }}
              className={`flex flex-col items-center justify-center gap-1 w-full py-2.5 rounded-xl text-[10px] active:scale-95 transition-all duration-200 ${
                currentScreen === 'log'
                  ? 'bg-[#CC6543] text-white font-bold shadow-md shadow-[#CC6543]/25'
                  : 'text-[#A8A297] hover:text-[#F5F2EB] hover:bg-[#2E2B26]/50'
              }`}
              title="Add Log"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Add Log</span>
            </button>

            <button
              onClick={() => {
                onNavigate('exercises');
                setIsRevealed(false);
              }}
              className={`flex flex-col items-center justify-center gap-1 w-full py-2.5 rounded-xl text-[10px] active:scale-95 transition-all duration-200 ${
                currentScreen === 'exercises' || currentScreen === 'exercise-detail'
                  ? 'bg-[#CC6543] text-white font-bold shadow-md shadow-[#CC6543]/25'
                  : 'text-[#A8A297] hover:text-[#F5F2EB] hover:bg-[#2E2B26]/50'
              }`}
              title="Exercises"
            >
              <Layers className="w-4 h-4" />
              <span>Exercises</span>
            </button>

            <button
              onClick={() => {
                onNavigate('profile');
                setIsRevealed(false);
              }}
              className={`flex flex-col items-center justify-center gap-1 w-full py-2.5 rounded-xl text-[10px] active:scale-95 transition-all duration-200 ${
                currentScreen === 'profile'
                  ? 'bg-[#CC6543] text-white font-bold shadow-md shadow-[#CC6543]/25'
                  : 'text-[#A8A297] hover:text-[#F5F2EB] hover:bg-[#2E2B26]/50'
              }`}
              title="Profile"
            >
              <User className="w-4 h-4" />
              <span>Profile</span>
            </button>
          </nav>

          {/* Bottom: Utilities & Minimalist Borderless Position Switch */}
          <div className="flex flex-col items-center gap-2.5 w-full">
            {/* Borderless Minimalist Nav Position Toggle */}
            <button
              onClick={onToggleNavPosition}
              className="p-2 rounded-xl text-[#A8A297] hover:text-[#CC6543] hover:bg-[#2E2B26]/60 transition-all duration-200"
              title="Switch to Top Navigation"
            >
              <PanelTop className="w-4 h-4" />
            </button>

            {/* Sync Button */}
            <button
              onClick={onManualSync}
              disabled={syncState === 'syncing' || !isOnline}
              className="p-2 rounded-xl bg-[#22201D] hover:bg-[#2E2B26] text-[#A8A297] hover:text-[#F5F2EB] border border-[#33302B] active:scale-95 disabled:opacity-40 transition-all"
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
              className="p-2 rounded-xl bg-[#22201D] hover:bg-[#2E2B26] text-[#A8A297] hover:text-[#F5F2EB] border border-[#33302B] active:scale-95 transition-all"
              title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
            >
              {isFullscreen ? (
                <Minimize className="w-3.5 h-3.5" />
              ) : (
                <Maximize className="w-3.5 h-3.5" />
              )}
            </button>

            {/* Network indicator */}
            <div
              className={`w-2.5 h-2.5 rounded-full ${
                isOnline ? 'bg-[#789D74]' : 'bg-[#E08E45]'
              }`}
              title={isOnline ? 'Online' : 'Offline'}
            />
          </div>
        </aside>
      </>
    );
  }

  // =========================================================================
  // 2. TOP POSITION NAVIGATION (DEFAULT)
  // =========================================================================
  return (
    <>
      {/* Top Hover Trigger Zone */}
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

      {/* Auto-Hiding Floating Top Navigation Header */}
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
          {/* Brand (The NoPulse Logo & Hover) */}
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

          {/* Action Tools with Minimalist Borderless Position Switch */}
          <div className="flex items-center gap-2">
            {/* Borderless Minimalist Nav Position Switch */}
            <button
              onClick={onToggleNavPosition}
              className="p-1.5 rounded-xl text-[#A8A297] hover:text-[#CC6543] hover:bg-[#2E2B26]/60 transition-all duration-200"
              title="Switch to Side Navigation"
            >
              <PanelLeft className="w-4 h-4" />
            </button>

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
