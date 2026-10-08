import React, { useState } from 'react';
import { Plus, ArrowRight, RefreshCw, Maximize, Minimize, X, Check, ArrowUpRight } from 'lucide-react';
import { FootballIcon } from './FootballIcon';
import { Goal } from '../types/goal';
import { formatDaysRemaining } from '../hooks/useGoals';

interface LandingScreenProps {
  exerciseCount: number;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  onGoToLog: () => void;
  onGoToExercises: () => void;
  onGoToGoals?: () => void;
  closestGoals?: Goal[];
  onToggleGoal?: (id: string) => Promise<Goal | null>;
}

const PHILOSOPHICAL_QUOTES = [
  {
    quote: "The Iron never lies to you. Two hundred pounds will always be two hundred pounds.",
    author: "Henry Rollins",
  },
  {
    quote: "No man has the right to be an amateur in physical training. What a disgrace to grow old without seeing the strength of which the body is capable.",
    author: "Socrates",
  },
  {
    quote: "What we endure in quiet repetition becomes the foundation of who we are.",
    author: "Meditations",
  },
  {
    quote: "To know your reserve is to master your limits.",
    author: "Training Axiom",
  },
  {
    quote: "The body cannot be sent where the mind has not already been.",
    author: "Ken Waller",
  },
  {
    quote: "Nothing of true worth is forged without tension.",
    author: "Stoic Reflection",
  },
];

export const LandingScreen: React.FC<LandingScreenProps> = ({
  exerciseCount,
  isFullscreen,
  onToggleFullscreen,
  onGoToLog,
  onGoToExercises,
  onGoToGoals,
  closestGoals = [],
  onToggleGoal,
}) => {
  const [quoteIndex, setQuoteIndex] = useState(0);
  const [isRotating, setIsRotating] = useState(false);
  const [isGoalsOpen, setIsGoalsOpen] = useState(false);

  const nextQuote = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsRotating(true);
    setTimeout(() => setIsRotating(false), 400);
    setQuoteIndex((prev) => (prev + 1) % PHILOSOPHICAL_QUOTES.length);
  };

  const currentQuote = PHILOSOPHICAL_QUOTES[quoteIndex];

  return (
    <div className="relative min-h-[88vh] flex flex-col justify-center items-center text-center px-4 select-none">
      {/* Top Right Header Actions: Football Ball (Goals) & Fullscreen Buttons */}
      <div className="absolute top-2 right-2 sm:top-4 sm:right-4 z-30 flex items-center gap-2">
        {/* Football Ball Logo Button */}
        <div className="relative">
          <button
            onClick={() => setIsGoalsOpen((prev) => !prev)}
            className={`p-2 sm:p-2.5 rounded-2xl border transition-all duration-300 active:scale-95 flex items-center justify-center ${
              isGoalsOpen
                ? 'bg-[#CC6543] text-white border-[#CC6543] shadow-lg shadow-[#CC6543]/30 scale-105'
                : 'bg-[#22201D]/80 hover:bg-[#2E2B26] text-[#A8A297] hover:text-[#F5F2EB] border-[#33302B] hover:border-[#4D4740]'
            }`}
            title="Closest Goals"
          >
            <FootballIcon className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
            {/* Active Goals Badge */}
            {closestGoals.some((g) => !g.completed) && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-[#CC6543] ring-2 ring-[#191816] animate-pulse" />
            )}
          </button>

          {/* =========================================================================
              DESKTOP POPUP WINDOW (Floats right beneath the football button)
             ========================================================================= */}
          {isGoalsOpen && (
            <div className="hidden sm:block absolute top-12 right-0 w-80 min-w-[320px] bg-[#1E1D1A]/95 backdrop-blur-2xl border border-[#383530] rounded-3xl p-5 shadow-2xl shadow-black/80 z-40 text-left animate-slide-up">
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#2E2B26]">
                <div className="flex items-center gap-2">
                  <span className="p-1 rounded-lg bg-[#CC6543]/15 text-[#CC6543]">
                    <FootballIcon className="w-3.5 h-3.5" />
                  </span>
                  <span className="text-xs font-bold uppercase tracking-wider text-[#F5F2EB]">
                    Closest Goals
                  </span>
                </div>
                <button
                  onClick={() => setIsGoalsOpen(false)}
                  className="p-1 rounded-lg text-[#8A857D] hover:text-[#F5F2EB] hover:bg-[#2E2B26] transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Goal List Items */}
              {closestGoals.length === 0 ? (
                <div className="py-6 text-center text-xs text-[#8A857D]">
                  <p>No goals set yet.</p>
                  {onGoToGoals && (
                    <button
                      onClick={() => {
                        setIsGoalsOpen(false);
                        onGoToGoals();
                      }}
                      className="mt-2 text-[#CC6543] font-semibold hover:underline inline-flex items-center gap-1"
                    >
                      Set your first goal →
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-2.5">
                  {closestGoals.map((goal) => {
                    const days = formatDaysRemaining(goal.target_date);
                    return (
                      <div
                        key={goal.id}
                        className={`p-3 rounded-2xl border transition-all duration-700 flex items-start gap-2.5 ${
                          goal.completed
                            ? 'bg-[#1C1B18]/60 border-[#2B2824] opacity-45'
                            : 'bg-[#252320]/80 border-[#33302B]'
                        }`}
                      >
                        {/* Single Circle Tickbox */}
                        <button
                          type="button"
                          onClick={() => onToggleGoal && onToggleGoal(goal.id)}
                          className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-all duration-300 cursor-pointer active:scale-90 ${
                            goal.completed
                              ? 'bg-[#789D74] border-2 border-[#789D74] text-white shadow-sm'
                              : 'border-2 border-[#555048] hover:border-[#789D74] bg-transparent'
                          }`}
                        >
                          {goal.completed && (
                            <Check className="w-3 h-3 stroke-[3] animate-pop-in" />
                          )}
                        </button>

                        <div className="flex-1 min-w-0">
                          <div className="relative inline-block max-w-full">
                            <span
                              className={`text-xs font-semibold block truncate transition-colors duration-500 ${
                                goal.completed ? 'text-[#8A8477]' : 'text-[#F5F2EB]'
                              }`}
                            >
                              {goal.title}
                            </span>
                            {/* Animated Strikethrough Line */}
                            <span
                              className={`absolute left-0 top-1/2 -translate-y-1/2 h-[1.5px] bg-[#789D74] rounded-full transition-all duration-500 ease-out pointer-events-none ${
                                goal.completed ? 'w-full opacity-90' : 'w-0 opacity-0'
                              }`}
                            />
                          </div>

                          <div className="mt-1">
                            <span
                              className={`inline-flex items-center whitespace-nowrap text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                                goal.completed
                                  ? 'bg-[#789D74]/15 text-[#789D74] border-[#789D74]/30'
                                  : days.isOverdue
                                  ? 'bg-red-500/15 text-red-400 border-red-500/30'
                                  : 'bg-[#CC6543]/15 text-[#E59B80] border-[#CC6543]/30'
                              }`}
                            >
                              {goal.completed ? 'Completed' : days.label}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* View All Goals Link */}
              {onGoToGoals && (
                <div className="mt-3 pt-2.5 border-t border-[#2E2B26] text-center">
                  <button
                    onClick={() => {
                      setIsGoalsOpen(false);
                      onGoToGoals();
                    }}
                    className="text-[11px] font-semibold text-[#A8A297] hover:text-[#CC6543] transition-colors inline-flex items-center gap-1"
                  >
                    <span>View all goals</span>
                    <ArrowUpRight className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Fullscreen Button */}
        <button
          onClick={onToggleFullscreen}
          className="p-2 sm:p-2.5 rounded-2xl bg-[#22201D]/80 hover:bg-[#2E2B26] text-[#A8A297] hover:text-[#F5F2EB] border border-[#33302B] hover:border-[#4D4740] active:scale-95 transition-all duration-200"
          title={isFullscreen ? 'Exit Full Screen' : 'Enter Full Screen'}
        >
          {isFullscreen ? (
            <Minimize className="w-4 h-4" />
          ) : (
            <Maximize className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* =========================================================================
          PHONE VIEWPORT MODAL OVERLAY (Directly in front of Home Window on Mobile)
         ========================================================================= */}
      {isGoalsOpen && (
        <div className="sm:hidden fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div
            className="w-full max-w-sm bg-[#1E1D1A] border border-[#383530] rounded-3xl p-5 shadow-2xl text-left animate-pop-in"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-[#2E2B26]">
              <div className="flex items-center gap-2.5">
                <span className="p-1.5 rounded-xl bg-[#CC6543]/15 text-[#CC6543]">
                  <FootballIcon className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-[#F5F2EB]">Closest Goals</h3>
                  <p className="text-[10px] text-[#8A857D]">3 targets closest to your date</p>
                </div>
              </div>
              <button
                onClick={() => setIsGoalsOpen(false)}
                className="p-1.5 rounded-xl bg-[#252320] text-[#A8A297] hover:text-[#F5F2EB] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Goal List */}
            {closestGoals.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#8A857D]">
                <p>No goals set yet.</p>
                {onGoToGoals && (
                  <button
                    onClick={() => {
                      setIsGoalsOpen(false);
                      onGoToGoals();
                    }}
                    className="mt-3 px-4 py-2 rounded-xl bg-[#CC6543] text-white text-xs font-semibold inline-flex items-center gap-1.5"
                  >
                    <span>Set your first goal</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {closestGoals.map((goal) => {
                  const days = formatDaysRemaining(goal.target_date);
                  return (
                    <div
                      key={goal.id}
                      className={`p-3.5 rounded-2xl border transition-all duration-700 flex items-start gap-3 ${
                        goal.completed
                          ? 'bg-[#1C1B18]/70 border-[#2B2824] opacity-45'
                          : 'bg-[#252320] border-[#383530]'
                      }`}
                    >
                      {/* Circle Tickbox (Green when Checked) */}
                      <button
                        type="button"
                        onClick={() => onToggleGoal && onToggleGoal(goal.id)}
                        className={`mt-0.5 w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-all duration-300 cursor-pointer active:scale-90 ${
                          goal.completed
                            ? 'bg-[#789D74] border-2 border-[#789D74] text-white shadow-md shadow-[#789D74]/30'
                            : 'border-2 border-[#555048] hover:border-[#789D74] bg-transparent'
                        }`}
                      >
                        {goal.completed && (
                          <Check className="w-3.5 h-3.5 stroke-[3] animate-pop-in" />
                        )}
                      </button>

                      <div className="flex-1 min-w-0">
                        <div className="relative inline-block max-w-full">
                          <span
                            className={`text-sm font-semibold block truncate transition-colors duration-500 ${
                              goal.completed ? 'text-[#8A8477]' : 'text-[#F5F2EB]'
                            }`}
                          >
                            {goal.title}
                          </span>
                          {/* Animated Strikethrough Line */}
                          <span
                            className={`absolute left-0 top-1/2 -translate-y-1/2 h-[2px] bg-[#789D74] rounded-full transition-all duration-500 ease-out pointer-events-none ${
                              goal.completed ? 'w-full opacity-90' : 'w-0 opacity-0'
                            }`}
                          />
                        </div>

                        <div className="mt-1.5">
                          <span
                            className={`inline-flex items-center whitespace-nowrap text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                              goal.completed
                                ? 'bg-[#789D74]/15 text-[#789D74] border-[#789D74]/30'
                                : days.isOverdue
                                ? 'bg-red-500/15 text-red-400 border-red-500/30'
                                : 'bg-[#CC6543]/15 text-[#E59B80] border-[#CC6543]/30'
                            }`}
                          >
                            {goal.completed ? 'Completed' : days.label}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Mobile Footer: Go to Full Goals Screen */}
            {onGoToGoals && (
              <div className="mt-4 pt-3 border-t border-[#2E2B26] flex items-center justify-between">
                <button
                  onClick={() => {
                    setIsGoalsOpen(false);
                    onGoToGoals();
                  }}
                  className="text-xs font-semibold text-[#CC6543] hover:text-[#DE7C5A] inline-flex items-center gap-1.5 py-1"
                >
                  <span>Open Full Goal Settings</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setIsGoalsOpen(false)}
                  className="text-xs text-[#8A857D] hover:text-[#F5F2EB] py-1 px-3 rounded-lg bg-[#252320]"
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Seamless Ambient Radial Glow */}
      <div
        className="absolute top-1/2 left-1/2 w-[34rem] sm:w-[46rem] h-[34rem] sm:h-[46rem] pointer-events-none animate-ambient-breathe"
        style={{
          background:
            'radial-gradient(ellipse at center, rgba(204, 101, 67, 0.16) 0%, rgba(224, 142, 69, 0.07) 35%, rgba(25, 24, 22, 0) 70%)',
          transform: 'translate(-50%, -50%)',
        }}
      />

      {/* Foreground Content with Gentle Float */}
      <div className="relative z-10 animate-soft-float flex flex-col items-center max-w-3xl">
        {/* Monumental NoPulse Title */}
        <div className="space-y-4 mb-10">
          <h1 className="text-8xl sm:text-9xl md:text-[10rem] lg:text-[12rem] font-serif font-bold tracking-tight text-[#F5F2EB] leading-none transition-transform duration-300 hover:scale-[1.01]">
            NoPulse
          </h1>

          {/* Pure Seamless Quote (No box, no background blur artifacts) */}
          <div
            onClick={nextQuote}
            className="group cursor-pointer max-w-lg mx-auto py-2 transition-all duration-200"
            title="Click for another reflection"
          >
            <div key={quoteIndex} className="animate-quote-swap">
              <p className="text-base sm:text-lg text-[#C8C2B7] font-serif italic leading-relaxed tracking-normal">
                "{currentQuote.quote}"
              </p>
              <div className="flex items-center justify-center gap-1.5 mt-2 text-xs font-serif text-[#8A8477]">
                <span>— {currentQuote.author}</span>
                <RefreshCw
                  className={`w-3.5 h-3.5 text-claude-terracottaLight transition-transform duration-300 ${
                    isRotating ? 'rotate-180 scale-110' : 'opacity-0 group-hover:opacity-70'
                  }`}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Two Elegant, Airy & Unsquashed Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-3.5 justify-center mt-2">
          {/* Button 1: Add New Exercise */}
          <button
            onClick={onGoToLog}
            className="group relative flex items-center justify-center gap-2 px-7 py-3 rounded-full bg-[#CC6543] hover:bg-[#DE7C5A] hover:shadow-xl hover:shadow-[#CC6543]/30 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.97] text-white text-xs sm:text-sm font-medium tracking-widest uppercase shadow-lg shadow-[#CC6543]/20 transition-all duration-200 overflow-hidden"
          >
            <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out" />
            <Plus className="w-4 h-4 stroke-[2.5] transition-transform duration-200 group-hover:rotate-90 relative z-10" />
            <span className="relative z-10">Add Exercise</span>
          </button>

          {/* Button 2: Continue to General Section */}
          <button
            onClick={onGoToExercises}
            className="group flex items-center justify-center gap-2 px-7 py-3 rounded-full bg-[#252320]/80 backdrop-blur-sm hover:bg-[#2E2B27] hover:border-[#4D4740] hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.97] border border-[#383530] text-[#F5F2EB] text-xs sm:text-sm font-medium tracking-widest uppercase shadow-sm transition-all duration-200"
          >
            <span>Continue</span>
            <ArrowRight className="w-3.5 h-3.5 text-[#A8A297] transition-transform duration-200 group-hover:translate-x-1" />
          </button>
        </div>

        {/* Minimal Exercise Counter */}
        {exerciseCount > 0 && (
          <p className="mt-10 text-xs font-sans text-[#706B62] animate-fade-in">
            {exerciseCount} {exerciseCount === 1 ? 'exercise' : 'exercises'} recorded
          </p>
        )}
      </div>
    </div>
  );
};
