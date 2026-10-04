export type PeriodPreset = '3_weeks' | '1_month' | '3_months' | 'custom';

export interface Goal {
  id: string;
  title: string;
  description?: string | null;
  target_date: string; // ISO format 'YYYY-MM-DD'
  period_preset?: PeriodPreset;
  completed: boolean;
  completed_at?: string | null;
  created_at: string;
  updated_at: string;
  is_deleted?: number;
  sync_status?: 'synced' | 'pending';
}

export interface CreateGoalInput {
  title: string;
  description?: string | null;
  target_date: string;
  period_preset?: PeriodPreset;
}

export interface UpdateGoalInput {
  title?: string;
  description?: string | null;
  target_date?: string;
  period_preset?: PeriodPreset;
  completed?: boolean;
}
