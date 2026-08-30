import sqlite3 from 'sqlite3';
import path from 'path';
import { Workout } from '../types/workout';

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
      const schema = `
        CREATE TABLE IF NOT EXISTS workouts (
          id TEXT PRIMARY KEY,
          exercise_name TEXT NOT NULL,
          sets INTEGER NOT NULL,
          reps INTEGER NOT NULL,
          rir REAL NOT NULL,
          weight REAL,
          date TEXT NOT NULL,
          notes TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          is_deleted INTEGER DEFAULT 0
        );

        CREATE INDEX IF NOT EXISTS idx_workouts_date ON workouts(date);
        CREATE INDEX IF NOT EXISTS idx_workouts_exercise ON workouts(exercise_name);
        CREATE INDEX IF NOT EXISTS idx_workouts_updated_at ON workouts(updated_at);
      `;

      this.db.exec(schema, (err) => {
        if (err) {
          console.error('Failed to initialize database schema:', err);
          return reject(err);
        }

        // Run auto-migration to add weight column if table was previously created without it
        this.db.run(`ALTER TABLE workouts ADD COLUMN weight REAL`, () => {
          // Ignore error if column already exists
          resolve();
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
           SET exercise_name = ?, sets = ?, reps = ?, rir = ?, weight = ?, date = ?, notes = ?, created_at = ?, updated_at = ?, is_deleted = ?
           WHERE id = ?`,
          [
            w.exercise_name,
            w.sets,
            w.reps,
            w.rir,
            w.weight ?? null,
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
        `INSERT INTO workouts (id, exercise_name, sets, reps, rir, weight, date, notes, created_at, updated_at, is_deleted)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          w.id,
          w.exercise_name,
          w.sets,
          w.reps,
          w.rir,
          w.weight ?? null,
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
