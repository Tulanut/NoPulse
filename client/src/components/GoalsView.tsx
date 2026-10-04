import React, { useState } from 'react';
import {
  Target,
  Plus,
  Trash2,
  Check,
  Calendar,
  Sparkles,
  ArrowLeft,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import { Goal, PeriodPreset } from '../types/goal';
import { calculatePresetTargetDate, formatDaysRemaining } from '../hooks/useGoals';

interface GoalsViewProps {
  goals: Goal[];
  activeGoals: Goal[];
  completedGoals: Goal[];
  onAddGoal: (input: {
    title: string;
    description?: string;
    target_date: string;
    period_preset?: PeriodPreset;
  }) => Promise<Goal>;
  onToggleGoal: (id: string) => Promise<Goal | null>;
  onDeleteGoal: (id: string) => Promise<void>;
  onBackToHome: () => void;
}

export const GoalsView: React.FC<GoalsViewProps> = ({
  goals,
  activeGoals,
  completedGoals,
  onAddGoal,
  onToggleGoal,
  onDeleteGoal,
  onBackToHome,
}) => {
  // Goal creation form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedPreset, setSelectedPreset] = useState<PeriodPreset>('1_month');
  const [customDate, setCustomDate] = useState(() => calculatePresetTargetDate('1_month'));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFormExpanded, setIsFormExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'completed'>('all');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Compute active target date
  const effectiveTargetDate =
    selectedPreset === 'custom' ? customDate : calculatePresetTargetDate(selectedPreset);

  const handleSelectPreset = (preset: PeriodPreset) => {
    setSelectedPreset(preset);
    if (preset !== 'custom') {
      setCustomDate(calculatePresetTargetDate(preset));
    }
  };

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || isSubmitting) return;

    try {
      setIsSubmitting(true);
      await onAddGoal({
        title: title.trim(),
        description: description.trim() || undefined,
        target_date: effectiveTargetDate,
        period_preset: selectedPreset,
      });

      // Reset form
      setTitle('');
      setDescription('');
      setSelectedPreset('1_month');
      setCustomDate(calculatePresetTargetDate('1_month'));
      setIsFormExpanded(false);
    } catch (err) {
      console.error('Failed to create goal:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtered goals by tab
  const displayedGoals =
    activeTab === 'active'
      ? activeGoals
      : activeTab === 'completed'
      ? completedGoals
      : goals.filter((g) => g.is_deleted !== 1);

  return (
    <div className="space-y-8 animate-fade-in max-w-4xl mx-auto pb-12">
      {/* =========================================================================
          TOP HEADER
         ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#2E2B26] pb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToHome}
            className="p-2.5 rounded-2xl bg-[#22201D] hover:bg-[#2E2B26] border border-[#33302B] text-[#A8A297] hover:text-[#F5F2EB] active:scale-95 transition-all"
            title="Back to Home"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-xl bg-[#CC6543]/15 text-[#CC6543]">
                <Target className="w-5 h-5" />
              </span>
              <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#F5F2EB]">
                Goal Setting
              </h1>
            </div>
            <p className="text-xs text-[#8A857D] mt-1 font-sans">
              Set clear targets, track timeframes, and check off accomplishments.
            </p>
          </div>
        </div>

        {/* Primary Action: Set New Goal */}
        <button
          onClick={() => setIsFormExpanded((prev) => !prev)}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-semibold uppercase tracking-wider transition-all duration-200 shadow-md ${
            isFormExpanded
              ? 'bg-[#2E2B26] text-[#F5F2EB] border border-[#44403A]'
              : 'bg-[#CC6543] hover:bg-[#DE7C5A] text-white shadow-[#CC6543]/20 active:scale-95'
          }`}
        >
          <Plus className={`w-4 h-4 transition-transform duration-200 ${isFormExpanded ? 'rotate-45' : ''}`} />
          <span>{isFormExpanded ? 'Close Form' : 'New Goal'}</span>
        </button>
      </div>

      {/* =========================================================================
          CREATE GOAL CARD / FORM
         ========================================================================= */}
      {isFormExpanded && (
        <div className="p-6 rounded-3xl bg-[#201E1B] border border-[#3A3630] shadow-2xl shadow-black/40 animate-slide-up">
          <div className="flex items-center gap-2.5 mb-5 pb-3 border-b border-[#2E2B26]">
            <Sparkles className="w-4 h-4 text-[#CC6543]" />
            <h2 className="text-sm font-bold text-[#F5F2EB] uppercase tracking-wider">
              Define Your Target
            </h2>
          </div>

          <form onSubmit={handleCreateGoal} className="space-y-5">
            {/* Title */}
            <div>
              <label className="block text-xs font-medium text-[#A8A297] mb-1.5">
                Goal Title <span className="text-[#CC6543]">*</span>
              </label>
              <input
                type="text"
                required
                autoFocus
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Bench press 100 kg, 15 strict pull-ups, 12% bodyfat"
                className="w-full px-4 py-3 rounded-2xl bg-[#191816] border border-[#33302B] focus:border-[#CC6543] focus:ring-1 focus:ring-[#CC6543] text-sm text-[#F5F2EB] placeholder-[#666055] outline-none transition-all"
              />
            </div>

            {/* Description (Optional) */}
            <div>
              <label className="block text-xs font-medium text-[#A8A297] mb-1.5">
                Description / Notes <span className="text-[#666055]">(optional)</span>
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add milestone markers, routine adjustments, or motivation notes..."
                className="w-full px-4 py-2.5 rounded-2xl bg-[#191816] border border-[#33302B] focus:border-[#CC6543] focus:ring-1 focus:ring-[#CC6543] text-xs text-[#F5F2EB] placeholder-[#666055] outline-none resize-none transition-all"
              />
            </div>

            {/* Time Period Presets */}
            <div>
              <label className="block text-xs font-medium text-[#A8A297] mb-2">
                Time Period (Target Time)
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <button
                  type="button"
                  onClick={() => handleSelectPreset('3_weeks')}
                  className={`py-2.5 px-3 rounded-2xl text-xs font-semibold border transition-all text-center ${
                    selectedPreset === '3_weeks'
                      ? 'bg-[#CC6543]/20 border-[#CC6543] text-[#F5F2EB] shadow-sm'
                      : 'bg-[#191816] border-[#33302B] text-[#A8A297] hover:border-[#4D4740] hover:text-[#F5F2EB]'
                  }`}
                >
                  <span className="block font-bold">3 Weeks</span>
                  <span className="text-[10px] opacity-60">21 days</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectPreset('1_month')}
                  className={`py-2.5 px-3 rounded-2xl text-xs font-semibold border transition-all text-center ${
                    selectedPreset === '1_month'
                      ? 'bg-[#CC6543]/20 border-[#CC6543] text-[#F5F2EB] shadow-sm'
                      : 'bg-[#191816] border-[#33302B] text-[#A8A297] hover:border-[#4D4740] hover:text-[#F5F2EB]'
                  }`}
                >
                  <span className="block font-bold">1 Month</span>
                  <span className="text-[10px] opacity-60">30 days</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectPreset('3_months')}
                  className={`py-2.5 px-3 rounded-2xl text-xs font-semibold border transition-all text-center ${
                    selectedPreset === '3_months'
                      ? 'bg-[#CC6543]/20 border-[#CC6543] text-[#F5F2EB] shadow-sm'
                      : 'bg-[#191816] border-[#33302B] text-[#A8A297] hover:border-[#4D4740] hover:text-[#F5F2EB]'
                  }`}
                >
                  <span className="block font-bold">3 Months</span>
                  <span className="text-[10px] opacity-60">90 days</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectPreset('custom')}
                  className={`py-2.5 px-3 rounded-2xl text-xs font-semibold border transition-all text-center ${
                    selectedPreset === 'custom'
                      ? 'bg-[#CC6543]/20 border-[#CC6543] text-[#F5F2EB] shadow-sm'
                      : 'bg-[#191816] border-[#33302B] text-[#A8A297] hover:border-[#4D4740] hover:text-[#F5F2EB]'
                  }`}
                >
                  <span className="block font-bold">Custom</span>
                  <span className="text-[10px] opacity-60">Pick date</span>
                </button>
              </div>

              {/* Custom Date Input if selected */}
              {selectedPreset === 'custom' && (
                <div className="mt-3 flex items-center gap-3">
                  <Calendar className="w-4 h-4 text-[#CC6543]" />
                  <input
                    type="date"
                    required
                    min={new Date().toISOString().split('T')[0]}
                    value={customDate}
                    onChange={(e) => setCustomDate(e.target.value)}
                    className="px-3.5 py-2 rounded-xl bg-[#191816] border border-[#33302B] text-xs text-[#F5F2EB] outline-none focus:border-[#CC6543]"
                  />
                </div>
              )}

              {/* Target Date Readout */}
              <div className="mt-3 flex items-center gap-2 text-xs text-[#8A857D]">
                <Clock className="w-3.5 h-3.5 text-[#CC6543]" />
                <span>
                  Target Date: <strong className="text-[#F5F2EB]">{effectiveTargetDate}</strong>{' '}
                  ({formatDaysRemaining(effectiveTargetDate).label})
                </span>
              </div>
            </div>

            {/* Submit & Cancel Buttons */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#2E2B26]">
              <button
                type="button"
                onClick={() => setIsFormExpanded(false)}
                className="px-5 py-2.5 rounded-2xl text-xs font-semibold text-[#8A857D] hover:text-[#F5F2EB] hover:bg-[#252320] transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !title.trim()}
                className="px-6 py-2.5 rounded-2xl bg-[#CC6543] hover:bg-[#DE7C5A] disabled:opacity-50 text-white text-xs font-bold uppercase tracking-wider shadow-md shadow-[#CC6543]/20 active:scale-95 transition-all"
              >
                {isSubmitting ? 'Saving...' : 'Set Goal'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* =========================================================================
          GOALS TABS & SUMMARY
         ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-[#201E1B] border border-[#33302B] w-fit">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all ${
              activeTab === 'all'
                ? 'bg-[#2E2B26] text-[#F5F2EB] font-bold shadow-sm'
                : 'text-[#8A857D] hover:text-[#F5F2EB]'
            }`}
          >
            All ({goals.filter((g) => g.is_deleted !== 1).length})
          </button>
          <button
            onClick={() => setActiveTab('active')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all ${
              activeTab === 'active'
                ? 'bg-[#2E2B26] text-[#F5F2EB] font-bold shadow-sm'
                : 'text-[#8A857D] hover:text-[#F5F2EB]'
            }`}
          >
            Active ({activeGoals.length})
          </button>
          <button
            onClick={() => setActiveTab('completed')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all ${
              activeTab === 'completed'
                ? 'bg-[#2E2B26] text-[#F5F2EB] font-bold shadow-sm'
                : 'text-[#8A857D] hover:text-[#F5F2EB]'
            }`}
          >
            Completed ({completedGoals.length})
          </button>
        </div>

        {/* Quick Motivation / Progress badge */}
        <div className="text-xs text-[#8A857D] flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-[#789D74]" />
          <span>
            {completedGoals.length} completed · {activeGoals.length} ongoing
          </span>
        </div>
      </div>

      {/* =========================================================================
          GOALS LIST
         ========================================================================= */}
      {displayedGoals.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-[#201E1B]/50 border border-dashed border-[#33302B]">
          <Target className="w-10 h-10 text-[#666055] mx-auto mb-3" />
          <h3 className="text-sm font-bold text-[#A8A297] uppercase tracking-wider">
            {activeTab === 'completed'
              ? 'No completed goals yet'
              : activeTab === 'active'
              ? 'All goals completed! Great work.'
              : 'No goals set yet'}
          </h3>
          <p className="text-xs text-[#666055] mt-1.5 max-w-sm mx-auto">
            {activeTab === 'all'
              ? 'Click the "+ New Goal" button above to set your first target with a 3-week, 1-month, or 3-month timeframe.'
              : 'Your progress will appear here as you update your goals.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayedGoals.map((goal) => {
            const daysInfo = formatDaysRemaining(goal.target_date);
            const isDeleting = deleteConfirmId === goal.id;

            return (
              <div
                key={goal.id}
                className={`group p-4 sm:p-5 rounded-2xl border transition-all duration-700 ${
                  goal.completed
                    ? 'bg-[#1C1B18]/70 border-[#2B2824] opacity-50 hover:opacity-85'
                    : 'bg-[#22201D] border-[#33302B] hover:border-[#4D4740] shadow-sm'
                }`}
              >
                <div className="flex items-start gap-3.5">
                  {/* Circle Tickbox (Turns Green when Checked) */}
                  <button
                    type="button"
                    onClick={() => onToggleGoal(goal.id)}
                    className={`mt-0.5 w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-all duration-300 cursor-pointer active:scale-90 ${
                      goal.completed
                        ? 'bg-[#789D74] border-2 border-[#789D74] text-white shadow-md shadow-[#789D74]/30'
                        : 'border-2 border-[#555048] hover:border-[#789D74] bg-transparent'
                    }`}
                    title={goal.completed ? 'Mark incomplete' : 'Mark as complete'}
                  >
                    {goal.completed && (
                      <Check className="w-3.5 h-3.5 stroke-[3] animate-pop-in" />
                    )}
                  </button>

                  {/* Title & Description with Animated Strikethrough Line */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="relative inline-block">
                        <span
                          className={`text-sm sm:text-base font-medium transition-colors duration-500 ${
                            goal.completed ? 'text-[#8A8477]' : 'text-[#F5F2EB]'
                          }`}
                        >
                          {goal.title}
                        </span>

                        {/* Animated Horizontal Strike Line */}
                        <span
                          className={`absolute left-0 top-1/2 -translate-y-1/2 h-[2px] bg-[#789D74] rounded-full transition-all duration-500 ease-out pointer-events-none ${
                            goal.completed ? 'w-full opacity-90' : 'w-0 opacity-0'
                          }`}
                        />
                      </div>

                      {/* Timeframe / Overdue Badge */}
                      {!goal.completed && (
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                            daysInfo.isOverdue
                              ? 'bg-red-500/15 text-red-400 border-red-500/30'
                              : 'bg-[#CC6543]/15 text-[#E59B80] border-[#CC6543]/30'
                          }`}
                        >
                          {daysInfo.label}
                        </span>
                      )}

                      {goal.completed && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#789D74]/15 text-[#789D74] border border-[#789D74]/30">
                          Completed
                        </span>
                      )}
                    </div>

                    {/* Description */}
                    {goal.description && (
                      <p
                        className={`text-xs mt-1 transition-colors duration-500 ${
                          goal.completed ? 'text-[#666055]' : 'text-[#8A857D]'
                        }`}
                      >
                        {goal.description}
                      </p>
                    )}

                    {/* Meta info: Target Date */}
                    <div className="flex items-center gap-3 mt-2 text-[11px] text-[#666055]">
                      <span>Target: {goal.target_date}</span>
                      {goal.period_preset && goal.period_preset !== 'custom' && (
                        <span className="capitalize">
                          · {goal.period_preset.replace('_', ' ')}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Delete Action Button */}
                  <div className="shrink-0 flex items-center gap-1.5">
                    {isDeleting ? (
                      <div className="flex items-center gap-1.5 animate-slide-up">
                        <button
                          type="button"
                          onClick={() => onDeleteGoal(goal.id)}
                          className="px-2.5 py-1 rounded-xl bg-red-600/80 hover:bg-red-600 text-white text-[10px] font-bold uppercase transition-all"
                        >
                          Confirm
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteConfirmId(null)}
                          className="px-2 py-1 rounded-xl bg-[#2E2B26] text-[#A8A297] text-[10px] hover:text-[#F5F2EB] transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setDeleteConfirmId(goal.id)}
                        className="p-2 rounded-xl text-[#666055] hover:text-red-400 hover:bg-red-500/10 active:scale-95 transition-all"
                        title="Delete this goal"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
