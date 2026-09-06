import { Workout } from '../types/workout';

export type MetricCategory = 'Strength & PR' | 'Consistency' | 'Workload' | 'Fatigue & Effort';

export interface MetricCalculationResult {
  value: string;
  subtitle: string;
  highlight?: boolean;
}

export interface MetricDefinition {
  id: string;
  title: string;
  category: MetricCategory;
  description: string;
  needsExercisePicker?: boolean;
  calculate: (workouts: Workout[], options: { prExerciseName?: string }) => MetricCalculationResult;
}

export interface ProfileDisplayPreferences {
  selectedMetricIds: string[];
  prExerciseName?: string;
}

export const DEFAULT_DISPLAY_PREFERENCES: ProfileDisplayPreferences = {
  selectedMetricIds: ['exercise_pr', 'current_streak', 'total_sessions', 'total_reps'],
  prExerciseName: '',
};

// Calculate weekly training streak
function calculateStreak(workouts: Workout[]): number {
  if (workouts.length === 0) return 0;

  const dates = Array.from(new Set(workouts.map((w) => w.date))).sort().reverse();
  if (dates.length === 0) return 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const getWeekNumber = (d: Date) => {
    const onejan = new Date(d.getFullYear(), 0, 1);
    return Math.ceil(((d.getTime() - onejan.getTime()) / 86400000 + onejan.getDay() + 1) / 7);
  };

  // Check week-based streak
  const activeWeeks = new Set<string>();
  dates.forEach((dateStr) => {
    const d = new Date(dateStr);
    const key = `${d.getFullYear()}-W${getWeekNumber(d)}`;
    activeWeeks.add(key);
  });

  const currentYear = today.getFullYear();
  let currentWeek = getWeekNumber(today);
  let streak = 0;

  // Check if active this week or last week
  const currentKey = `${currentYear}-W${currentWeek}`;
  const prevKey = currentWeek > 1 ? `${currentYear}-W${currentWeek - 1}` : `${currentYear - 1}-W52`;

  if (!activeWeeks.has(currentKey) && !activeWeeks.has(prevKey)) {
    return 0;
  }

  let checkYear = currentYear;
  let checkWeek = activeWeeks.has(currentKey) ? currentWeek : currentWeek - 1;

  while (activeWeeks.has(`${checkYear}-W${checkWeek}`)) {
    streak++;
    checkWeek--;
    if (checkWeek <= 0) {
      checkYear--;
      checkWeek = 52;
    }
  }

  return streak;
}

export const AVAILABLE_METRICS: MetricDefinition[] = [
  {
    id: 'exercise_pr',
    title: 'Peak Weight (Exercise PR)',
    category: 'Strength & PR',
    description: 'Specific all-time peak weight record for an individual exercise chosen by you.',
    needsExercisePicker: true,
    calculate: (workouts, options) => {
      const exerciseList = Array.from(new Set(workouts.map((w) => w.exercise_name.trim())));
      const targetName = options.prExerciseName?.trim() || exerciseList[0] || 'Bench Press';

      const exerciseWorkouts = workouts.filter(
        (w) => w.exercise_name.trim().toLowerCase() === targetName.toLowerCase()
      );

      const maxWeight = exerciseWorkouts.reduce(
        (max, w) => Math.max(max, w.weight || 0),
        0
      );

      return {
        value: maxWeight > 0 ? `${maxWeight} kg` : '0 kg',
        subtitle: `${targetName} Personal Record`,
        highlight: maxWeight > 0,
      };
    },
  },
  {
    id: 'current_streak',
    title: 'Training Streak',
    category: 'Consistency',
    description: 'Current active consecutive weeks of regular gym training.',
    calculate: (workouts) => {
      const streakWeeks = calculateStreak(workouts);
      return {
        value: streakWeeks > 0 ? `${streakWeeks} ${streakWeeks === 1 ? 'week' : 'weeks'}` : '0 weeks',
        subtitle: streakWeeks > 0 ? 'Consecutive weekly training' : 'Start your streak today',
        highlight: streakWeeks >= 2,
      };
    },
  },
  {
    id: 'total_sessions',
    title: 'Total Sessions',
    category: 'Consistency',
    description: 'Lifetime count of logged gym workouts.',
    calculate: (workouts) => {
      const count = workouts.length;
      return {
        value: count.toLocaleString(),
        subtitle: `${count === 1 ? 'session' : 'sessions'} completed`,
      };
    },
  },
  {
    id: 'total_reps',
    title: 'Total Repetitions',
    category: 'Workload',
    description: 'Cumulative number of completed repetitions across all logged sets.',
    calculate: (workouts) => {
      const reps = workouts.reduce((sum, w) => sum + w.sets * w.reps, 0);
      return {
        value: reps.toLocaleString(),
        subtitle: 'Lifetime reps completed',
      };
    },
  },
  {
    id: 'total_sets',
    title: 'Total Sets',
    category: 'Workload',
    description: 'Cumulative number of training sets performed.',
    calculate: (workouts) => {
      const sets = workouts.reduce((sum, w) => sum + w.sets, 0);
      return {
        value: sets.toLocaleString(),
        subtitle: 'Total completed sets',
      };
    },
  },
  {
    id: 'avg_rir',
    title: 'Average Effort (RIR)',
    category: 'Fatigue & Effort',
    description: 'Average Reps In Reserve indicating proximity to muscular failure.',
    calculate: (workouts) => {
      if (workouts.length === 0) {
        return { value: '0 RIR', subtitle: 'No fatigue data yet' };
      }
      const avg = workouts.reduce((sum, w) => sum + w.rir, 0) / workouts.length;
      const rounded = Math.round(avg * 10) / 10;
      return {
        value: `${rounded} RIR`,
        subtitle: rounded <= 1.5 ? 'High intensity training' : 'Controlled fatigue reserve',
      };
    },
  },
  {
    id: 'month_sessions',
    title: 'This Month Sessions',
    category: 'Consistency',
    description: 'Number of workout sessions logged in the current calendar month.',
    calculate: (workouts) => {
      const now = new Date();
      const currentMonthPrefix = now.toISOString().slice(0, 7); // e.g. "2026-09"
      const count = workouts.filter((w) => w.date.startsWith(currentMonthPrefix)).length;
      return {
        value: count.toString(),
        subtitle: 'Sessions this month',
      };
    },
  },
  {
    id: 'favorite_exercise',
    title: 'Most Frequent Exercise',
    category: 'Strength & PR',
    description: 'The movement you train and log most often.',
    calculate: (workouts) => {
      if (workouts.length === 0) {
        return { value: 'None', subtitle: 'Log exercises to see' };
      }
      const counts = new Map<string, number>();
      workouts.forEach((w) => {
        const name = w.exercise_name.trim();
        counts.set(name, (counts.get(name) || 0) + 1);
      });

      let topName = '';
      let topCount = 0;
      counts.forEach((count, name) => {
        if (count > topCount) {
          topCount = count;
          topName = name;
        }
      });

      return {
        value: topName || 'None',
        subtitle: `${topCount} ${topCount === 1 ? 'session' : 'sessions'} logged`,
      };
    },
  },
  {
    id: 'lifetime_volume',
    title: 'Lifetime Volume (Tonnage)',
    category: 'Workload',
    description: 'Total weight moved (Sets × Reps × Load) in tonnes or kilograms.',
    calculate: (workouts) => {
      const volumeKg = workouts.reduce(
        (sum, w) => sum + w.sets * w.reps * (w.weight || 0),
        0
      );
      if (volumeKg >= 1000) {
        return {
          value: `${(volumeKg / 1000).toFixed(1)} t`,
          subtitle: `${Math.round(volumeKg).toLocaleString()} kg moved`,
        };
      }
      return {
        value: `${Math.round(volumeKg).toLocaleString()} kg`,
        subtitle: 'Total volume lifted',
      };
    },
  },
];

const STORAGE_KEY = 'nopulse_profile_display_prefs';

export function loadProfileDisplayPreferences(): ProfileDisplayPreferences {
  if (typeof window === 'undefined') return DEFAULT_DISPLAY_PREFERENCES;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_DISPLAY_PREFERENCES;
    const parsed = JSON.parse(raw);
    return {
      selectedMetricIds: Array.isArray(parsed.selectedMetricIds) && parsed.selectedMetricIds.length > 0
        ? parsed.selectedMetricIds
        : DEFAULT_DISPLAY_PREFERENCES.selectedMetricIds,
      prExerciseName: parsed.prExerciseName || '',
    };
  } catch {
    return DEFAULT_DISPLAY_PREFERENCES;
  }
}

export function saveProfileDisplayPreferences(prefs: ProfileDisplayPreferences): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch (err) {
    console.error('Failed to save profile display preferences:', err);
  }
}
