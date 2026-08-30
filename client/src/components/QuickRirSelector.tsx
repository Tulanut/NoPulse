import React from 'react';
import { Flame, ShieldAlert, Sparkles, Activity } from 'lucide-react';

interface QuickRirSelectorProps {
  value: number;
  onChange: (val: number) => void;
}

const RIR_PRESETS = [
  {
    val: 0,
    label: '0 RIR',
    subtitle: 'Failure / 0 left',
    color: 'bg-[#D45B5B]/10 text-[#F5B5B5] border-[#D45B5B]/30 hover:bg-[#D45B5B]/20 hover:scale-[1.02]',
    activeColor: 'bg-[#D45B5B] text-white border-[#F5B5B5] shadow-md shadow-[#D45B5B]/30 font-bold scale-[1.04]',
    icon: Flame,
  },
  {
    val: 1,
    label: '1 RIR',
    subtitle: '1 in tank (Heavy)',
    color: 'bg-[#CC6543]/15 text-[#E59B80] border-[#CC6543]/40 hover:bg-[#CC6543]/25 hover:scale-[1.02]',
    activeColor: 'bg-[#CC6543] text-white border-[#E59B80] shadow-md shadow-[#CC6543]/30 font-bold scale-[1.04]',
    icon: ShieldAlert,
  },
  {
    val: 2,
    label: '2 RIR',
    subtitle: '2 in tank (Optimal)',
    color: 'bg-[#E08E45]/15 text-[#F0BD85] border-[#E08E45]/40 hover:bg-[#E08E45]/25 hover:scale-[1.02]',
    activeColor: 'bg-[#E08E45] text-white border-[#F0BD85] shadow-md shadow-[#E08E45]/30 font-bold scale-[1.04]',
    icon: Sparkles,
  },
  {
    val: 3,
    label: '3 RIR',
    subtitle: '3 in tank (Solid)',
    color: 'bg-[#789D74]/15 text-[#B8D4B5] border-[#789D74]/40 hover:bg-[#789D74]/25 hover:scale-[1.02]',
    activeColor: 'bg-[#789D74] text-white border-[#B8D4B5] shadow-md shadow-[#789D74]/30 font-bold scale-[1.04]',
    icon: Activity,
  },
  {
    val: 4,
    label: '4+ RIR',
    subtitle: 'Deload / Warmup',
    color: 'bg-claude-surfaceDark text-claude-textMuted border-claude-border hover:bg-claude-surfaceActive hover:scale-[1.02]',
    activeColor: 'bg-[#524E48] text-white border-claude-textMuted shadow-md font-bold scale-[1.04]',
    icon: Activity,
  },
];

export const QuickRirSelector: React.FC<QuickRirSelectorProps> = ({ value, onChange }) => {
  return (
    <div className="space-y-2 font-sans">
      <div className="flex items-center justify-between text-xs text-claude-textMuted">
        <span className="font-medium text-claude-text font-serif text-sm">Reps in Reserve (RIR)</span>
        <span className="font-sans bg-claude-surfaceDark px-2.5 py-0.5 rounded-full text-claude-terracottaLight font-bold border border-claude-border transition-all duration-200">
          {value} RIR
        </span>
      </div>

      <div className="grid grid-cols-5 gap-2">
        {RIR_PRESETS.map((preset) => {
          const isSelected = value === preset.val;
          const Icon = preset.icon;
          return (
            <button
              key={preset.val}
              type="button"
              onClick={() => onChange(preset.val)}
              className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition-all duration-200 active:scale-95 ${
                isSelected ? preset.activeColor : preset.color
              }`}
            >
              <Icon className={`w-3.5 h-3.5 mb-1 shrink-0 transition-transform duration-200 ${isSelected ? 'scale-110' : ''}`} />
              <span className="text-xs font-sans font-semibold">{preset.label}</span>
              <span className="text-[9px] opacity-80 line-clamp-1 hidden sm:inline-block mt-0.5 font-sans">
                {preset.subtitle}
              </span>
            </button>
          );
        })}
      </div>

      {/* Manual precise adjustment */}
      <div className="flex items-center gap-3 pt-1">
        <input
          type="range"
          min="0"
          max="5"
          step="0.5"
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="w-full h-1.5 bg-claude-surfaceDark rounded-lg appearance-none cursor-pointer accent-[#CC6543] transition-all"
        />
      </div>
    </div>
  );
};
