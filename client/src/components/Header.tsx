import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Dumbbell,
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
  const lastScrollY = useRef<number>(0);

  // Helper to schedule auto-hide
  const scheduleAutoHide = useCallback((delay = 3000) => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = window.setTimeout(() => {
      setIsRevealed(false);
    }, delay);
  }, []);

  const reveal = useCallback((autoHide = true) => {
    setIsRevealed(true);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    if (autoHide) {
      scheduleAutoHide(3500);
    }
  }, [scheduleAutoHide]);

  const hide = useCallback(() => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    setIsRevealed(false);
  }, []);

  // 1. Desktop Mouse Movement Detection
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (navPosition === 'top') {
        if (e.clientY <= 45) {
          reveal(false);
        }
      } else {
        if (e.clientX <= 50) {
          reveal(false);
        }
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [navPosition, reveal]);

  // 2. Mobile Touch & Scroll Direction Detection (Auto-hides on scroll down)
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const scrollDiff = currentScrollY - lastScrollY.current;

      // Scrolling down -> hide immediately to maximize screen space on phone
      if (scrollDiff > 8 && currentScrollY > 40) {
        hide();
      }
      // Scrolling up -> gently reveal for easy navigation
      else if (scrollDiff < -15) {
        reveal(true);
      }

      lastScrollY.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [hide, reveal]);

  const handleMouseEnter = () => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    setIsRevealed(true);
  };

  const handleMouseLeave = () => {
    scheduleAutoHide(1200);
  };

  const handleTouchTab = (e: React.TouchEvent | React.MouseEvent) => {
    e.stopPropagation();
    if (isRevealed) {
      hide();
    } else {
      reveal(true);
    }
  };

  const formatTime = (isoString: string | null) => {
    if (!isoString) return 'Never';
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // =========================================================================
  // 1. SIDE POSITION NAVIGATION (DESKTOP & MOBILE-ADAPTIVE)
  // =========================================================================
  if (navPosition === 'side') {
    return (
      <>
        {/* Left Hover / Touch Trigger Edge */}
        <div
          onMouseEnter={handleMouseEnter}
          onClick={handleTouchTab}
          className="fixed top-0 bottom-0 left-0 w-4 sm:w-5 z-40 pointer-events-auto"
        />

        {/* Subtle Pull Tab on Left Edge when hidden */}
        <div
          onClick={handleTouchTab}
          className={`fixed top-1/2 left-0 -translate-y-1/2 z-30 transition-all duration-300 ${
            isRevealed
              ? 'opacity-0 -translate-x-full pointer-events-none'
              : 'opacity-70 hover:opacity-100 cursor-pointer pointer-events-auto'
          }`}
        >
          <div className="flex flex-col items-center gap-1 px-1.5 py-3.5 sm:py-4 rounded-r-2xl bg-[#201E1B]/95 border-r border-y border-[#33302B] text-[10px] font-sans text-[#A8A297] backdrop-blur-md shadow-2xl shadow-black/50 hover:text-[#F5F2EB] hover:border-[#4D4740] transition-all">
            <span className="[writing-mode:vertical-lr] tracking-widest uppercase text-[8px] sm:text-[9px]">menu</span>
            <ChevronRight className="w-3 h-3 text-[#CC6543] mt-0.5" />
          </div>
        </div>

        {/* Backdrop overlay on mobile when open */}
        {isRevealed && (
          <div
            onClick={hide}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 sm:hidden animate-fade-in"
          />
        )}

        {/* Floating Side Navigation Rail */}
        <aside
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          className={`fixed top-0 bottom-0 left-0 z-50 w-16 sm:w-20 md:w-24 bg-[#1A1816]/95 backdrop-blur-2xl border-r border-[#2E2B26]/80 py-4 sm:py-6 px-1.5 sm:px-2 flex flex-col justify-between items-center shadow-2xl shadow-black/60 transition-all duration-300 transform ${
            isRevealed
              ? 'translate-x-0 opacity-100 pointer-events-auto'
              : '-translate-x-full opacity-0 pointer-events-none'
          }`}
        >
          {/* Top: NoPulse Brand */}
          <button
            onClick={() => {
              onNavigate('landing');
              hide();
            }}
            className="flex flex-col items-center gap-1 text-center group active:scale-95 transition-all duration-200"
            title="NoPulse Home"
          >
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#CC6543] flex items-center justify-center shadow-md shadow-[#CC6543]/20 ring-1 ring-white/10 group-hover:bg-[#DE7C5A] group-hover:scale-105 group-hover:shadow-lg transition-all duration-200">
              <Dumbbell className="w-4 h-4 text-white" />
            </div>
            <span className="text-[10px] sm:text-[11px] font-bold tracking-tight text-[#F5F2EB] group-hover:text-[#DE7C5A] transition-colors">
              NoPulse
            </span>
          </button>

          {/* Center: Vertical Navigation Pills */}
          <nav className="flex flex-col items-center gap-1.5 sm:gap-2 bg-[#22201D] border border-[#33302B] p-1 sm:p-1.5 rounded-2xl shadow-inner shadow-black/20 w-full">
            <button
              onClick={() => {
                onNavigate('landing');
                hide();
              }}
              className={`flex flex-col items-center justify-center gap-0.5 sm:gap-1 w-full py-2 sm:py-2.5 rounded-xl text-[9px] sm:text-[10px] active:scale-95 transition-all duration-200 ${
                currentScreen === 'landing'
                  ? 'bg-[#2E2B26] text-[#F5F2EB] font-bold border border-[#44403A] shadow-sm'
                  : 'text-[#A8A297] hover:text-[#F5F2EB] hover:bg-[#2E2B26]/50'
              }`}
              title="Home"
            >
              <Home className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>Home</span>
            </button>

            <button
              onClick={() => {
                onNavigate('log');
                hide();
              }}
              className={`flex flex-col items-center justify-center gap-0.5 sm:gap-1 w-full py-2 sm:py-2.5 rounded-xl text-[9px] sm:text-[10px] active:scale-95 transition-all duration-200 ${
                currentScreen === 'log'
                  ? 'bg-[#CC6543] text-white font-bold shadow-md shadow-[#CC6543]/25'
                  : 'text-[#A8A297] hover:text-[#F5F2EB] hover:bg-[#2E2B26]/50'
              }`}
              title="Add Log"
            >
              <PlusCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>Add Log</span>
            </button>

            <button
              onClick={() => {
                onNavigate('exercises');
                hide();
              }}
              className={`flex flex-col items-center justify-center gap-0.5 sm:gap-1 w-full py-2 sm:py-2.5 rounded-xl text-[9px] sm:text-[10px] active:scale-95 transition-all duration-200 ${
                currentScreen === 'exercises' || currentScreen === 'exercise-detail'
                  ? 'bg-[#CC6543] text-white font-bold shadow-md shadow-[#CC6543]/25'
                  : 'text-[#A8A297] hover:text-[#F5F2EB] hover:bg-[#2E2B26]/50'
              }`}
              title="Exercises"
            >
              <Layers className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>Exercises</span>
            </button>

            <button
              onClick={() => {
                onNavigate('profile');
                hide();
              }}
              className={`flex flex-col items-center justify-center gap-0.5 sm:gap-1 w-full py-2 sm:py-2.5 rounded-xl text-[9px] sm:text-[10px] active:scale-95 transition-all duration-200 ${
                currentScreen === 'profile'
                  ? 'bg-[#CC6543] text-white font-bold shadow-md shadow-[#CC6543]/25'
                  : 'text-[#A8A297] hover:text-[#F5F2EB] hover:bg-[#2E2B26]/50'
              }`}
              title="Profile"
            >
              <User className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>Profile</span>
            </button>
          </nav>

          {/* Bottom: Utilities & Minimalist Borderless Position Switch */}
          <div className="flex flex-col items-center gap-2 w-full">
            {/* Borderless Minimalist Nav Position Toggle */}
            <button
              onClick={onToggleNavPosition}
              className="p-1.5 rounded-xl text-[#A8A297] hover:text-[#CC6543] hover:bg-[#2E2B26]/60 transition-all duration-200"
              title="Switch to Top Navigation"
            >
              <PanelTop className="w-4 h-4" />
            </button>

            {/* Sync Button */}
            <button
              onClick={onManualSync}
              disabled={syncState === 'syncing' || !isOnline}
              className="p-1.5 rounded-xl bg-[#22201D] hover:bg-[#2E2B26] text-[#A8A297] hover:text-[#F5F2EB] border border-[#33302B] active:scale-95 disabled:opacity-40 transition-all"
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
              className="p-1.5 rounded-xl bg-[#22201D] hover:bg-[#2E2B26] text-[#A8A297] hover:text-[#F5F2EB] border border-[#33302B] active:scale-95 transition-all"
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
              className={`w-2 h-2 rounded-full ${
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
  // 2. TOP POSITION NAVIGATION (DEFAULT & MOBILE-OPTIMIZED)
  // =========================================================================
  return (
    <>
      {/* Top Hover / Touch Trigger Edge */}
      <div
        onMouseEnter={handleMouseEnter}
        onClick={handleTouchTab}
        className="fixed top-0 left-0 right-0 h-4 sm:h-5 z-40 pointer-events-auto"
      />

      {/* Subtle Soft Pull Tab when hidden */}
      <div
        onClick={handleTouchTab}
        className={`fixed top-0 left-1/2 -translate-x-1/2 z-30 transition-all duration-300 ${
          isRevealed
            ? 'opacity-0 -translate-y-full pointer-events-none'
            : 'opacity-70 hover:opacity-100 cursor-pointer pointer-events-auto'
        }`}
      >
        <div className="flex items-center gap-1.5 px-3 sm:px-4 py-1 rounded-b-xl bg-[#201E1B]/95 border-b border-x border-[#33302B] text-[10px] sm:text-[11px] font-sans text-[#A8A297] backdrop-blur-md shadow-lg shadow-black/30 hover:text-[#F5F2EB] hover:border-[#4D4740] transition-all">
          <span>navigation</span>
          <ChevronDown className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#CC6543]" />
        </div>
      </div>

      {/* Backdrop overlay on mobile when open */}
      {isRevealed && (
        <div
          onClick={hide}
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 sm:hidden animate-fade-in"
        />
      )}

      {/* Auto-Hiding Floating Top Navigation Header */}
      <header
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={`fixed top-0 left-0 right-0 z-50 bg-[#1A1816]/95 backdrop-blur-2xl border-b border-[#2E2B26]/80 px-3 sm:px-5 py-2.5 sm:py-3 shadow-2xl shadow-black/50 transition-all duration-300 transform ${
          isRevealed
            ? 'translate-y-0 opacity-100 pointer-events-auto'
            : '-translate-y-full opacity-0 pointer-events-none'
        }`}
      >
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-2 sm:gap-4 font-sans">
          {/* Brand */}
          <button
            onClick={() => {
              onNavigate('landing');
              hide();
            }}
            className="flex items-center gap-2 text-left group active:scale-95 transition-all duration-200 shrink-0"
          >
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-[#CC6543] flex items-center justify-center shadow-md shadow-[#CC6543]/20 ring-1 ring-white/10 group-hover:bg-[#DE7C5A] group-hover:scale-105 transition-all duration-200">
              <Dumbbell className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
            </div>
            <h1 className="text-sm sm:text-base font-bold tracking-tight text-[#F5F2EB] group-hover:text-[#DE7C5A] transition-colors hidden sm:inline">
              NoPulse
            </h1>
          </button>

          {/* Responsive Navigation Pills (Thumb-Friendly on Mobile) */}
          <nav className="flex items-center gap-1 sm:gap-1.5 bg-[#22201D] border border-[#33302B] p-0.5 sm:p-1 rounded-2xl shadow-inner shadow-black/20 overflow-x-auto scrollbar-none">
            <button
              onClick={() => {
                onNavigate('landing');
                hide();
              }}
              className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-1.5 rounded-xl text-[11px] sm:text-xs active:scale-95 transition-all duration-200 shrink-0 ${
                currentScreen === 'landing'
                  ? 'bg-[#2E2B26] text-[#F5F2EB] shadow-sm font-bold border border-[#44403A]'
                  : 'text-[#A8A297] hover:text-[#F5F2EB] hover:bg-[#2E2B26]/50'
              }`}
            >
              <Home className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Home</span>
            </button>

            <button
              onClick={() => {
                onNavigate('log');
                hide();
              }}
              className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-1.5 rounded-xl text-[11px] sm:text-xs active:scale-95 transition-all duration-200 shrink-0 ${
                currentScreen === 'log'
                  ? 'bg-[#CC6543] text-white shadow-md shadow-[#CC6543]/25 font-bold'
                  : 'text-[#A8A297] hover:text-[#F5F2EB] hover:bg-[#2E2B26]/50'
              }`}
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Log</span>
            </button>

            <button
              onClick={() => {
                onNavigate('exercises');
                hide();
              }}
              className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-1.5 rounded-xl text-[11px] sm:text-xs active:scale-95 transition-all duration-200 shrink-0 ${
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
                hide();
              }}
              className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-1.5 rounded-xl text-[11px] sm:text-xs active:scale-95 transition-all duration-200 shrink-0 ${
                currentScreen === 'profile'
                  ? 'bg-[#CC6543] text-white shadow-md shadow-[#CC6543]/25 font-bold'
                  : 'text-[#A8A297] hover:text-[#F5F2EB] hover:bg-[#2E2B26]/50'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>Profile</span>
            </button>
          </nav>

          {/* Action Utilities */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Borderless Minimalist Position Switch */}
            <button
              onClick={onToggleNavPosition}
              className="p-1.5 rounded-xl text-[#A8A297] hover:text-[#CC6543] hover:bg-[#2E2B26]/60 transition-all duration-200"
              title="Switch to Side Navigation"
            >
              <PanelLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>

            {/* Pending sync badge */}
            {pendingSyncCount > 0 && (
              <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] bg-[#CC6543]/15 text-[#E59B80] border border-[#CC6543]/30 font-semibold animate-pop-in">
                <AlertCircle className="w-3 h-3" />
                <span>{pendingSyncCount}</span>
              </div>
            )}

            {/* Sync Button */}
            <button
              onClick={onManualSync}
              disabled={syncState === 'syncing' || !isOnline}
              className="p-1.5 rounded-xl bg-[#22201D] hover:bg-[#2E2B26] text-[#A8A297] hover:text-[#F5F2EB] border border-[#33302B] active:scale-95 disabled:opacity-40 transition-all duration-200"
              title={lastSyncedAt ? `Last Synced: ${formatTime(lastSyncedAt)}` : 'Sync Database'}
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${
                  syncState === 'syncing' ? 'animate-spin text-[#CC6543]' : ''
                }`}
              />
            </button>

            {/* Fullscreen Button (Hidden on very small phones) */}
            <button
              onClick={onToggleFullscreen}
              className="hidden sm:flex p-1.5 rounded-xl bg-[#22201D] hover:bg-[#2E2B26] text-[#A8A297] hover:text-[#F5F2EB] border border-[#33302B] active:scale-95 transition-all duration-200"
              title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
            >
              {isFullscreen ? (
                <Minimize className="w-3.5 h-3.5" />
              ) : (
                <Maximize className="w-3.5 h-3.5" />
              )}
            </button>

            {/* Offline Simulation Toggle (Desktop/Tablet) */}
            <button
              onClick={toggleSimulateOffline}
              className={`hidden md:inline-flex items-center px-2 py-0.5 rounded-xl text-[10px] border active:scale-95 transition-all duration-200 ${
                simulatedOffline
                  ? 'bg-[#E08E45]/20 text-[#F0BD85] border-[#E08E45]/50'
                  : 'bg-[#22201D] text-[#706B62] border-[#33302B] hover:text-[#F5F2EB] hover:border-[#4D4740]'
              }`}
              title="Toggle simulated offline state"
            >
              <Database className="w-3 h-3 mr-1 text-[#CC6543]" />
              <span>{simulatedOffline ? 'Online' : 'Offline'}</span>
            </button>

            {/* Compact Network indicator */}
            <div
              className={`w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full shrink-0 ${
                isOnline ? 'bg-[#789D74]' : 'bg-[#E08E45]'
              }`}
              title={isOnline ? 'Online' : 'Offline'}
            />
          </div>
        </div>
      </header>
    </>
  );
};
