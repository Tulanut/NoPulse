import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db/database';
import { Goal } from '../types/goal';

export class GoalController {
  public static async getGoals(req: Request, res: Response): Promise<void> {
    try {
      const { completed } = req.query;
      let goals = await db.getAllGoals();

      if (completed !== undefined) {
        const isCompleted = completed === 'true' || completed === '1';
        goals = goals.filter((g) => g.completed === isCompleted);
      }

      res.json({
        success: true,
        count: goals.length,
        data: goals,
      });
    } catch (error: any) {
      console.error('Error fetching goals:', error);
      res.status(500).json({ success: false, error: error.message || 'Internal server error' });
    }
  }

  public static async createGoal(req: Request, res: Response): Promise<void> {
    try {
      const { title, description, target_date, period_preset } = req.body;

      if (!title || typeof title !== 'string' || title.trim() === '') {
        res.status(400).json({ success: false, error: 'Title is required' });
        return;
      }

      if (!target_date || isNaN(Date.parse(target_date))) {
        res.status(400).json({ success: false, error: 'Valid target date is required' });
        return;
      }

      const now = new Date().toISOString();
      const newGoal: Goal = {
        id: req.body.id || uuidv4(),
        title: title.trim(),
        description: description ? String(description).trim() : null,
        target_date: String(target_date).split('T')[0],
        period_preset: period_preset || 'custom',
        completed: Boolean(req.body.completed),
        completed_at: req.body.completed ? now : null,
        created_at: req.body.created_at || now,
        updated_at: req.body.updated_at || now,
        is_deleted: 0,
      };

      await db.upsertGoal(newGoal);

      res.status(201).json({
        success: true,
        data: newGoal,
      });
    } catch (error: any) {
      console.error('Error creating goal:', error);
      res.status(500).json({ success: false, error: error.message || 'Internal server error' });
    }
  }

  public static async updateGoal(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const existing = await db.getGoalById(id);

      if (!existing) {
        res.status(404).json({ success: false, error: 'Goal not found' });
        return;
      }

      const { title, description, target_date, period_preset, completed } = req.body;
      const now = new Date().toISOString();

      let isCompleted = existing.completed;
      let completedAt = existing.completed_at;

      if (completed !== undefined) {
        isCompleted = Boolean(completed);
        completedAt = isCompleted ? (existing.completed_at || now) : null;
      }

      const updatedGoal: Goal = {
        ...existing,
        title: title !== undefined ? String(title).trim() : existing.title,
        description:
          description !== undefined
            ? description
              ? String(description).trim()
              : null
            : existing.description,
        target_date:
          target_date !== undefined && !isNaN(Date.parse(target_date))
            ? String(target_date).split('T')[0]
            : existing.target_date,
        period_preset:
          period_preset !== undefined ? period_preset : existing.period_preset,
        completed: isCompleted,
        completed_at: completedAt,
        updated_at: now,
      };

      await db.upsertGoal(updatedGoal);

      res.status(200).json({
        success: true,
        data: updatedGoal,
      });
    } catch (error: any) {
      console.error('Error updating goal:', error);
      res.status(500).json({ success: false, error: error.message || 'Internal server error' });
    }
  }

  public static async deleteGoal(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const success = await db.deleteGoal(id, true);

      if (!success) {
        res.status(404).json({ success: false, error: 'Goal not found' });
        return;
      }

      res.json({ success: true, message: 'Goal deleted successfully' });
    } catch (error: any) {
      console.error('Error deleting goal:', error);
      res.status(500).json({ success: false, error: error.message || 'Internal server error' });
    }
  }

  public static async syncGoals(req: Request, res: Response): Promise<void> {
    try {
      const { goals = [] } = req.body;
      const now = new Date().toISOString();

      if (Array.isArray(goals) && goals.length > 0) {
        for (const g of goals) {
          if (!g.id || !g.title) continue;
          await db.upsertGoal({
            id: g.id,
            title: g.title,
            description: g.description || null,
            target_date: g.target_date || now.split('T')[0],
            period_preset: g.period_preset || 'custom',
            completed: Boolean(g.completed),
            completed_at: g.completed_at || null,
            created_at: g.created_at || now,
            updated_at: g.updated_at || now,
            is_deleted: g.is_deleted ? 1 : 0,
          });
        }
      }

      const serverGoals = await db.getAllGoals(true);

      res.json({
        success: true,
        synced_count: goals.length,
        server_goals: serverGoals,
        timestamp: now,
      });
    } catch (error: any) {
      console.error('Error syncing goals:', error);
      res.status(500).json({ success: false, error: error.message || 'Internal server error' });
    }
  }
}
