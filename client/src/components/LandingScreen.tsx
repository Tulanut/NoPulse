import React, { useState } from 'react';
import { Plus, ArrowRight, RefreshCw, Maximize, Minimize } from 'lucide-react';

interface LandingScreenProps {
  exerciseCount: number;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  onGoToLog: () => void;
  onGoToExercises: () => void;
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
}) => {
  const [quoteIndex, setQuoteIndex] = useState(0);
  const [isRotating, setIsRotating] = useState(false);

  const nextQuote = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsRotating(true);
    setTimeout(() => setIsRotating(false), 400);
    setQuoteIndex((prev) => (prev + 1) % PHILOSOPHICAL_QUOTES.length);
  };

  const currentQuote = PHILOSOPHICAL_QUOTES[quoteIndex];

  return (
    <div className="relative min-h-[88vh] flex flex-col justify-center items-center text-center px-4 select-none">
      {/* Top Right Subtle Fullscreen Button */}
      <div className="absolute top-2 right-2 sm:top-4 sm:right-4 z-20">
        <button
          onClick={onToggleFullscreen}
          className="p-2 rounded-xl bg-claude-surface/40 hover:bg-claude-surface text-claude-textDim hover:text-claude-text border border-claude-border/50 hover:border-claude-border active:scale-95 transition-all duration-200"
          title={isFullscreen ? 'Exit Full Screen' : 'Enter Full Screen'}
        >
          {isFullscreen ? (
            <Minimize className="w-4 h-4" />
          ) : (
            <Maximize className="w-4 h-4" />
          )}
        </button>
      </div>

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
        {/* Monumental IronPulse Title */}
        <div className="space-y-4 mb-10">
          <h1 className="text-8xl sm:text-9xl md:text-[10rem] lg:text-[12rem] font-serif font-bold tracking-tight text-[#F5F2EB] leading-none transition-transform duration-300 hover:scale-[1.01]">
            IronPulse
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
