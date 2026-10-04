import { Router } from 'express';
import { GoalController } from '../controllers/goalController';

const router = Router();

router.get('/goals', GoalController.getGoals);
router.post('/goals', GoalController.createGoal);
router.put('/goals/:id', GoalController.updateGoal);
router.delete('/goals/:id', GoalController.deleteGoal);
router.post('/goals/sync', GoalController.syncGoals);

export default router;
