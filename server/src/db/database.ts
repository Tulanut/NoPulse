import sqlite3 from 'sqlite3';
import path from 'path';
import { Workout } from '../types/workout';
import { Goal } from '../types/goal';

const DB_PATH = process.env.DB_PATH || path.resolve(__dirname, '../../gym_tracker.db');

export class Database {
  private db: sqlite3.Database;

  constructor(dbPath: string = DB_PATH) {
    this.db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('Error opening database:', err.message);
      } else {
        console.log(`Connected to SQLite database at: ${dbPath}`);
      }
    });
  }

  public init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const tableSql = `
        CREATE TABLE IF NOT EXISTS workouts (
          id TEXT PRIMARY KEY,
          exercise_name TEXT NOT NULL,
          sets INTEGER NOT NULL,
          reps INTEGER NOT NULL,
          rir REAL NOT NULL,
          weight REAL,
          profile TEXT,
          sub_profile TEXT,
          date TEXT NOT NULL,
          notes TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          is_deleted INTEGER DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS goals (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          description TEXT,
          target_date TEXT NOT NULL,
          period_preset TEXT,
          completed INTEGER DEFAULT 0,
          completed_at TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          is_deleted INTEGER DEFAULT 0
        );
      `;

      this.db.exec(tableSql, (err) => {
        if (err) {
          console.error('Failed to create tables:', err);
          return reject(err);
        }

        // Run auto-migrations for existing workouts table
        this.db.run(`ALTER TABLE workouts ADD COLUMN weight REAL`, () => {
          this.db.run(`ALTER TABLE workouts ADD COLUMN profile TEXT`, () => {
            this.db.run(`ALTER TABLE workouts ADD COLUMN sub_profile TEXT`, () => {
              // Create indexes after columns and tables are guaranteed to exist
              const indexSql = `
                CREATE INDEX IF NOT EXISTS idx_workouts_date ON workouts(date);
                CREATE INDEX IF NOT EXISTS idx_workouts_exercise ON workouts(exercise_name);
                CREATE INDEX IF NOT EXISTS idx_workouts_profile ON workouts(profile);
                CREATE INDEX IF NOT EXISTS idx_workouts_sub_profile ON workouts(sub_profile);
                CREATE INDEX IF NOT EXISTS idx_workouts_updated_at ON workouts(updated_at);
                CREATE INDEX IF NOT EXISTS idx_goals_target_date ON goals(target_date);
                CREATE INDEX IF NOT EXISTS idx_goals_completed ON goals(completed);
                CREATE INDEX IF NOT EXISTS idx_goals_updated_at ON goals(updated_at);
              `;

              this.db.exec(indexSql, (indexErr) => {
                if (indexErr) {
                  console.error('Failed to create indexes:', indexErr);
                  return reject(indexErr);
                }
                resolve();
              });
            });
          });
        });
      });
    });
  }

  public all<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) return reject(err);
        resolve(rows as T[]);
      });
    });
  }

  public get<T = any>(sql: string, params: any[] = []): Promise<T | undefined> {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) return reject(err);
        resolve(row as T);
      });
    });
  }

  public run(sql: string, params: any[] = []): Promise<{ lastID: number; changes: number }> {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function (err) {
        if (err) return reject(err);
        resolve({ lastID: this.lastID, changes: this.changes });
      });
    });
  }

  public async getAllWorkouts(includeDeleted: boolean = false): Promise<Workout[]> {
    const sql = includeDeleted
      ? `SELECT * FROM workouts ORDER BY date DESC, created_at DESC`
      : `SELECT * FROM workouts WHERE is_deleted = 0 ORDER BY date DESC, created_at DESC`;
    return this.all<Workout>(sql);
  }

  public async getWorkoutById(id: string): Promise<Workout | undefined> {
    return this.get<Workout>(`SELECT * FROM workouts WHERE id = ?`, [id]);
  }

  public async upsertWorkout(w: Workout): Promise<void> {
    const existing = await this.getWorkoutById(w.id);
    if (existing) {
      // Reconcile conflict using timestamp (Last Write Wins)
      const existingUpdated = new Date(existing.updated_at).getTime();
      const incomingUpdated = new Date(w.updated_at).getTime();

      if (incomingUpdated >= existingUpdated) {
        await this.run(
          `UPDATE workouts 
           SET exercise_name = ?, sets = ?, reps = ?, rir = ?, weight = ?, profile = ?, sub_profile = ?, date = ?, notes = ?, created_at = ?, updated_at = ?, is_deleted = ?
           WHERE id = ?`,
          [
            w.exercise_name,
            w.sets,
            w.reps,
            w.rir,
            w.weight ?? null,
            w.profile ?? null,
            w.sub_profile ?? null,
            w.date,
            w.notes || null,
            w.created_at,
            w.updated_at,
            w.is_deleted ? 1 : 0,
            w.id,
          ]
        );
      }
    } else {
      await this.run(
        `INSERT INTO workouts (id, exercise_name, sets, reps, rir, weight, profile, sub_profile, date, notes, created_at, updated_at, is_deleted)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          w.id,
          w.exercise_name,
          w.sets,
          w.reps,
          w.rir,
          w.weight ?? null,
          w.profile ?? null,
          w.sub_profile ?? null,
          w.date,
          w.notes || null,
          w.created_at,
          w.updated_at,
          w.is_deleted ? 1 : 0,
        ]
      );
    }
  }

  public async batchUpsertWorkouts(workouts: Workout[]): Promise<number> {
    let synced = 0;
    for (const workout of workouts) {
      await this.upsertWorkout(workout);
      synced++;
    }
    return synced;
  }

  public async deleteWorkout(id: string, softDelete: boolean = true): Promise<boolean> {
    const now = new Date().toISOString();
    if (softDelete) {
      const result = await this.run(
        `UPDATE workouts SET is_deleted = 1, updated_at = ? WHERE id = ?`,
        [now, id]
      );
      return result.changes > 0;
    } else {
      const result = await this.run(`DELETE FROM workouts WHERE id = ?`, [id]);
      return result.changes > 0;
    }
  }

  public async getAllGoals(includeDeleted: boolean = false): Promise<Goal[]> {
    const sql = includeDeleted
      ? `SELECT * FROM goals ORDER BY target_date ASC, created_at DESC`
      : `SELECT * FROM goals WHERE is_deleted = 0 ORDER BY target_date ASC, created_at DESC`;
    const rows = await this.all<any>(sql);
    return rows.map((r) => ({
      ...r,
      completed: Boolean(r.completed),
    }));
  }

  public async getGoalById(id: string): Promise<Goal | undefined> {
    const row = await this.get<any>(`SELECT * FROM goals WHERE id = ?`, [id]);
    if (!row) return undefined;
    return {
      ...row,
      completed: Boolean(row.completed),
    };
  }

  public async upsertGoal(g: Goal): Promise<void> {
    const existing = await this.getGoalById(g.id);
    if (existing) {
      const existingUpdated = new Date(existing.updated_at).getTime();
      const incomingUpdated = new Date(g.updated_at).getTime();

      if (incomingUpdated >= existingUpdated) {
        await this.run(
          `UPDATE goals 
           SET title = ?, description = ?, target_date = ?, period_preset = ?, completed = ?, completed_at = ?, created_at = ?, updated_at = ?, is_deleted = ?
           WHERE id = ?`,
          [
            g.title,
            g.description || null,
            g.target_date,
            g.period_preset || null,
            g.completed ? 1 : 0,
            g.completed_at || null,
            g.created_at,
            g.updated_at,
            g.is_deleted ? 1 : 0,
            g.id,
          ]
        );
      }
    } else {
      await this.run(
        `INSERT INTO goals (id, title, description, target_date, period_preset, completed, completed_at, created_at, updated_at, is_deleted)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          g.id,
          g.title,
          g.description || null,
          g.target_date,
          g.period_preset || null,
          g.completed ? 1 : 0,
          g.completed_at || null,
          g.created_at,
          g.updated_at,
          g.is_deleted ? 1 : 0,
        ]
      );
    }
  }

  public async deleteGoal(id: string, softDelete: boolean = true): Promise<boolean> {
    const now = new Date().toISOString();
    if (softDelete) {
      const result = await this.run(
        `UPDATE goals SET is_deleted = 1, updated_at = ? WHERE id = ?`,
        [now, id]
      );
      return result.changes > 0;
    } else {
      const result = await this.run(`DELETE FROM goals WHERE id = ?`, [id]);
      return result.changes > 0;
    }
  }

  public close(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.close((err) => {
        if (err) return reject(err);
        resolve();
      });
    });
  }
}

export const db = new Database();
