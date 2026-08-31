import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import workoutRoutes from './routes/workoutRoutes';
import { db } from './db/database';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());

// API Routes
app.use('/api', workoutRoutes);

// Root greeting
app.get('/', (_req, res) => {
  res.json({
    message: 'NoPulse Gym Tracker API is running.',
    endpoints: {
      health: 'GET /api/health',
      workouts: 'GET /api/workouts',
      create: 'POST /api/workouts',
      sync: 'POST /api/workouts/sync',
      delete: 'DELETE /api/workouts/:id',
    }
  });
});

async function startServer() {
  try {
    await db.init();
    app.listen(PORT, () => {
      console.log(`🚀 NoPulse Gym Tracker Server listening on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

if (process.env.NODE_ENV !== 'test') {
  startServer();
}

export default app;
