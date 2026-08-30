import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db/database';
import { Workout, SyncPayload, SyncResponse } from '../types/workout';

export class WorkoutController {
  public static async getWorkouts(req: Request, res: Response): Promise<void> {
    try {
      const { exercise, date } = req.query;
      let workouts = await db.getAllWorkouts();

      if (exercise && typeof exercise === 'string') {
        workouts = workouts.filter(w =>
          w.exercise_name.toLowerCase().includes(exercise.toLowerCase())
        );
      }

      if (date && typeof date === 'string') {
        workouts = workouts.filter(w => w.date === date);
      }

      res.json({
        success: true,
        count: workouts.length,
        data: workouts,
      });
    } catch (error: any) {
      console.error('Error fetching workouts:', error);
      res.status(500).json({ success: false, error: error.message || 'Internal server error' });
    }
  }

  public static async createWorkout(req: Request, res: Response): Promise<void> {
    try {
      const { exercise_name, sets, reps, rir, weight, date, notes } = req.body;

      if (!exercise_name || typeof exercise_name !== 'string' || exercise_name.trim() === '') {
        res.status(400).json({ success: false, error: 'Exercise name is required' });
        return;
      }

      const numSets = Number(sets);
      const numReps = Number(reps);
      const numRir = Number(rir);
      const numWeight = weight !== undefined && weight !== null && weight !== '' ? Number(weight) : null;

      if (isNaN(numSets) || numSets <= 0 || !Number.isInteger(numSets)) {
        res.status(400).json({ success: false, error: 'Sets must be a positive integer' });
        return;
      }

      if (isNaN(numReps) || numReps <= 0 || !Number.isInteger(numReps)) {
        res.status(400).json({ success: false, error: 'Reps must be a positive integer' });
        return;
      }

      if (isNaN(numRir) || numRir < 0) {
        res.status(400).json({ success: false, error: 'RIR (Reps in Reserve) must be 0 or greater' });
        return;
      }

      const now = new Date().toISOString();
      const workoutDate = date && !isNaN(Date.parse(date)) ? date : now.split('T')[0];

      const newWorkout: Workout = {
        id: req.body.id || uuidv4(),
        exercise_name: exercise_name.trim(),
        sets: numSets,
        reps: numReps,
        rir: numRir,
        weight: numWeight,
        date: workoutDate,
        notes: notes ? String(notes).trim() : null,
        created_at: req.body.created_at || now,
        updated_at: req.body.updated_at || now,
        is_deleted: 0,
      };

      await db.upsertWorkout(newWorkout);

      res.status(201).json({
        success: true,
        data: newWorkout,
      });
    } catch (error: any) {
      console.error('Error creating workout:', error);
      res.status(500).json({ success: false, error: error.message || 'Internal server error' });
    }
  }

  public static async syncWorkouts(req: Request, res: Response): Promise<void> {
    try {
      const { workouts = [] } = req.body as SyncPayload;
      const now = new Date().toISOString();

      if (Array.isArray(workouts) && workouts.length > 0) {
        for (const w of workouts) {
          if (!w.id || !w.exercise_name) continue;
          await db.upsertWorkout({
            id: w.id,
            exercise_name: w.exercise_name,
            sets: Number(w.sets) || 1,
            reps: Number(w.reps) || 1,
            rir: Number(w.rir) ?? 0,
            weight: w.weight !== undefined && w.weight !== null ? Number(w.weight) : null,
            date: w.date || now.split('T')[0],
            notes: w.notes || null,
            created_at: w.created_at || now,
            updated_at: w.updated_at || now,
            is_deleted: w.is_deleted ? 1 : 0,
          });
        }
      }

      // Fetch the latest state from server to send back to client
      const serverWorkouts = await db.getAllWorkouts(true);

      const response: SyncResponse = {
        success: true,
        synced_count: workouts.length,
        server_workouts: serverWorkouts,
        timestamp: now,
      };

      res.json(response);
    } catch (error: any) {
      console.error('Error syncing workouts:', error);
      res.status(500).json({ success: false, error: error.message || 'Internal server error' });
    }
  }

  public static async deleteWorkout(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const success = await db.deleteWorkout(id, true);

      if (!success) {
        res.status(404).json({ success: false, error: 'Workout not found' });
        return;
      }

      res.json({ success: true, message: 'Workout deleted successfully' });
    } catch (error: any) {
      console.error('Error deleting workout:', error);
      res.status(500).json({ success: false, error: error.message || 'Internal server error' });
    }
  }

  public static healthCheck(_req: Request, res: Response): void {
    res.json({
      status: 'healthy',
      service: 'IronPulse Gym Tracker API',
      timestamp: new Date().toISOString(),
    });
  }
}
