import { Database } from '../src/db/database';
import { Workout } from '../src/types/workout';
import path from 'path';
import fs from 'fs';

async function runTests() {
  console.log('🧪 Starting Backend Database & Logic Tests...\n');
  const testDbPath = path.resolve(__dirname, 'test_gym.db');
  
  if (fs.existsSync(testDbPath)) {
    fs.unlinkSync(testDbPath);
  }

  const testDb = new Database(testDbPath);
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName}`);
      failed++;
    }
  }

  try {
    // 1. Test Database Initialization
    await testDb.init();
    assert(true, 'Database schema initialized successfully');

    // 2. Test Inserting / Upserting a Workout
    const workout1: Workout = {
      id: 'w-1',
      exercise_name: 'Barbell Bench Press',
      sets: 3,
      reps: 10,
      rir: 2,
      date: '2026-08-30',
      notes: 'Felt strong, good pause at bottom',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_deleted: 0,
    };

    await testDb.upsertWorkout(workout1);
    const retrieved1 = await testDb.getWorkoutById('w-1');
    assert(!!retrieved1, 'Retrieve workout by ID');
    assert(retrieved1?.exercise_name === 'Barbell Bench Press', 'Exercise name matches');
    assert(retrieved1?.sets === 3 && retrieved1?.reps === 10 && retrieved1?.rir === 2, 'Sets, reps, RIR match');

    // 3. Test Batch Upsert / Sync
    const workout2: Workout = {
      id: 'w-2',
      exercise_name: 'Barbell Back Squat',
      sets: 4,
      reps: 8,
      rir: 1.5,
      date: '2026-08-30',
      notes: 'Depth below parallel',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_deleted: 0,
    };

    const count = await testDb.batchUpsertWorkouts([workout2]);
    assert(count === 1, 'Batch upserted 1 workout');

    const allWorkouts = await testDb.getAllWorkouts();
    assert(allWorkouts.length === 2, 'Total active workouts count is 2');

    // 4. Test Updating Workout (Last-Write-Wins)
    const updatedWorkout1: Workout = {
      ...workout1,
      sets: 4,
      reps: 12,
      rir: 1,
      updated_at: new Date(Date.now() + 1000).toISOString(),
    };
    await testDb.upsertWorkout(updatedWorkout1);
    const checkUpdated = await testDb.getWorkoutById('w-1');
    assert(checkUpdated?.sets === 4 && checkUpdated?.reps === 12 && checkUpdated?.rir === 1, 'Updated sets/reps/rir correctly');

    // 5. Test Soft Deletion
    const deleted = await testDb.deleteWorkout('w-2', true);
    assert(deleted === true, 'Workout w-2 soft deleted');
    const activeAfterDelete = await testDb.getAllWorkouts(false);
    assert(activeAfterDelete.length === 1, 'Active workouts list excludes soft-deleted records');

    const allIncludingDeleted = await testDb.getAllWorkouts(true);
    assert(allIncludingDeleted.length === 2, 'All workouts list includes soft-deleted records for sync');

    await testDb.close();

    // Cleanup test database
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }

    console.log(`\n🎉 Test Results: ${passed} passed, ${failed} failed.\n`);
    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Test execution error:', err);
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
    process.exit(1);
  }
}

runTests();
