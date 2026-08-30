import { Router } from 'express';
import { WorkoutController } from '../controllers/workoutController';

const router = Router();

router.get('/health', WorkoutController.healthCheck);
router.get('/workouts', WorkoutController.getWorkouts);
router.post('/workouts', WorkoutController.createWorkout);
router.post('/workouts/sync', WorkoutController.syncWorkouts);
router.delete('/workouts/:id', WorkoutController.deleteWorkout);

export default router;
