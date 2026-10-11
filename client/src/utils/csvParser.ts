export interface ParsedWorkoutInput {
  date: string;
  exercise_name: string;
  sets: number;
  reps: number;
  weight: number | null;
  rir: number;
  profile: string | null;
  sub_profile: string | null;
  notes: string | null;
}

export interface ParseResult {
  success: boolean;
  workouts: ParsedWorkoutInput[];
  errors: string[];
  totalRows: number;
}

/**
 * Robust RFC 4180-compliant CSV text parser.
 * Handles quoted fields, escaped quotes (""), and multiline values.
 */
export function parseCSVToRows(csvText: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;

  // Normalize line endings
  const cleanText = csvText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  for (let i = 0; i < cleanText.length; i++) {
    const char = cleanText[i];
    const nextChar = cleanText[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped double quote
        currentField += '"';
        i++; // Skip the next quote
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // End of field
      currentRow.push(currentField.trim());
      currentField = '';
    } else if (char === '\n' && !inQuotes) {
      // End of row
      currentRow.push(currentField.trim());
      // Only push non-empty rows
      if (currentRow.some((cell) => cell.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentField = '';
    } else {
      currentField += char;
    }
  }

  // Push last field & row if anything remains
  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.some((cell) => cell.length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

/**
 * Standardize various date formats (YYYY-MM-DD, YYYY/MM/DD, DD-MM-YYYY, MM/DD/YYYY) into YYYY-MM-DD
 */
function normalizeDate(rawDate?: string): string {
  const today = new Date().toISOString().split('T')[0];
  if (!rawDate || !rawDate.trim()) return today;

  const trimmed = rawDate.trim();

  // Matches YYYY-MM-DD or YYYY/MM/DD
  if (/^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/.test(trimmed)) {
    const parts = trimmed.split(/[-/]/);
    const y = parts[0];
    const m = parts[1].padStart(2, '0');
    const d = parts[2].padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // Matches DD/MM/YYYY or DD-MM-YYYY or MM/DD/YYYY
  if (/^\d{1,2}[-/]\d{1,2}[-/]\d{4}$/.test(trimmed)) {
    const parts = trimmed.split(/[-/]/);
    const p1 = parseInt(parts[0], 10);
    const p2 = parseInt(parts[1], 10);
    const y = parts[2];
    // Heuristic: if p1 > 12, p1 is day, p2 is month
    let m = p2;
    let d = p1;
    if (p1 <= 12 && p2 > 12) {
      m = p1;
      d = p2;
    }
    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }

  // Try standard Date parsing
  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0];
  }

  return today;
}

/**
 * Identifies column indices by fuzzy/synonym matching common column headers
 */
function mapHeaderIndices(headerRow: string[]) {
  const mapping: {
    date: number;
    exercise: number;
    sets: number;
    reps: number;
    weight: number;
    rir: number;
    profile: number;
    subProfile: number;
    notes: number;
  } = {
    date: -1,
    exercise: -1,
    sets: -1,
    reps: -1,
    weight: -1,
    rir: -1,
    profile: -1,
    subProfile: -1,
    notes: -1,
  };

  headerRow.forEach((col, index) => {
    const clean = col.toLowerCase().replace(/[^a-z0-9]/g, '');

    if (['date', 'workoutdate', 'day'].includes(clean)) {
      mapping.date = index;
    } else if (['exercise', 'exercisename', 'movement', 'name'].includes(clean)) {
      mapping.exercise = index;
    } else if (['sets', 'set', 'totalsets'].includes(clean)) {
      mapping.sets = index;
    } else if (['reps', 'rep', 'repetitions', 'repetition'].includes(clean)) {
      mapping.reps = index;
    } else if (['weight', 'weightkg', 'weightlbs', 'load', 'kg', 'lbs'].includes(clean)) {
      mapping.weight = index;
    } else if (['rir', 'repsinreserve'].includes(clean)) {
      mapping.rir = index;
    } else if (['subprofile', 'subsection', 'section'].includes(clean)) {
      mapping.subProfile = index;
    } else if (['profile', 'category', 'routine'].includes(clean)) {
      mapping.profile = index;
    } else if (['notes', 'note', 'comment', 'comments', 'details'].includes(clean)) {
      mapping.notes = index;
    }
  });

  return mapping;
}

/**
 * Parse and validate a CSV string into gym tracker workout objects
 */
export function parseWorkoutsCSV(csvText: string): ParseResult {
  const rawRows = parseCSVToRows(csvText);

  if (rawRows.length === 0) {
    return {
      success: false,
      workouts: [],
      errors: ['The selected CSV file appears to be empty.'],
      totalRows: 0,
    };
  }

  const headerRow = rawRows[0];
  const colMap = mapHeaderIndices(headerRow);

  // If no exercise column found, we cannot determine workout names
  if (colMap.exercise === -1) {
    return {
      success: false,
      workouts: [],
      errors: [
        'Could not find an "Exercise" or "Exercise Name" column header in the CSV file. Please make sure the CSV has an Exercise column.',
      ],
      totalRows: 0,
    };
  }

  const dataRows = rawRows.slice(1);
  const workouts: ParsedWorkoutInput[] = [];
  const errors: string[] = [];

  dataRows.forEach((row, rowIdx) => {
    const lineNum = rowIdx + 2; // Accounting for 1-based index and header
    const exerciseName = (row[colMap.exercise] || '').trim();

    if (!exerciseName) {
      errors.push(`Row ${lineNum}: Missing exercise name. Skipped.`);
      return;
    }

    const rawDate = colMap.date !== -1 ? row[colMap.date] : undefined;
    const date = normalizeDate(rawDate);

    // Parse sets
    const rawSets = colMap.sets !== -1 ? row[colMap.sets] : '1';
    const parsedSets = parseInt(rawSets, 10);
    const sets = isNaN(parsedSets) || parsedSets <= 0 ? 1 : parsedSets;

    // Parse reps
    const rawReps = colMap.reps !== -1 ? row[colMap.reps] : '0';
    const parsedReps = parseInt(rawReps, 10);
    const reps = isNaN(parsedReps) || parsedReps < 0 ? 0 : parsedReps;

    // Parse weight
    let weight: number | null = null;
    if (colMap.weight !== -1 && row[colMap.weight] !== undefined && row[colMap.weight] !== '') {
      const parsedWeight = parseFloat(row[colMap.weight]);
      if (!isNaN(parsedWeight) && parsedWeight >= 0) {
        weight = Math.round(parsedWeight * 100) / 100;
      }
    }

    // Parse RIR
    let rir = 0;
    if (colMap.rir !== -1 && row[colMap.rir] !== undefined && row[colMap.rir] !== '') {
      const parsedRir = parseFloat(row[colMap.rir]);
      if (!isNaN(parsedRir) && parsedRir >= 0) {
        rir = Math.round(parsedRir * 10) / 10;
      }
    }

    // Parse profile and sub_profile
    const rawProfile = colMap.profile !== -1 ? row[colMap.profile] : undefined;
    const profile = rawProfile && rawProfile.trim() ? rawProfile.trim() : null;

    const rawSubProfile = colMap.subProfile !== -1 ? row[colMap.subProfile] : undefined;
    const sub_profile = rawSubProfile && rawSubProfile.trim() ? rawSubProfile.trim() : null;

    // Parse notes
    const rawNotes = colMap.notes !== -1 ? row[colMap.notes] : undefined;
    const notes = rawNotes && rawNotes.trim() ? rawNotes.trim() : null;

    workouts.push({
      date,
      exercise_name: exerciseName,
      sets,
      reps,
      weight,
      rir,
      profile,
      sub_profile,
      notes,
    });
  });

  return {
    success: workouts.length > 0,
    workouts,
    errors,
    totalRows: dataRows.length,
  };
}

/**
 * Generates sample CSV template content with standard headers and sample rows.
 */
export function generateCSVTemplate(): string {
  const headers = ['Date', 'Exercise Name', 'Sets', 'Reps', 'Weight (kg)', 'RIR', 'Profile', 'Sub-Profile', 'Notes'];
  const sampleRows = [
    ['2026-10-10', 'Barbell Bench Press', '4', '8', '85', '2', 'Push Day', 'Chest Focus', 'Controlled eccentric tempo'],
    ['2026-10-10', 'Incline Dumbbell Press', '3', '10', '32.5', '1', 'Push Day', 'Chest Focus', 'Good stretch at bottom'],
    ['2026-10-11', 'Barbell Back Squat', '5', '5', '120', '3', 'Leg Day', 'Strength', 'Felt strong and explosive'],
  ];

  const escapeCell = (val: string) => {
    if (val.includes(',') || val.includes('"') || val.includes('\n')) {
      return `"${val.replace(/"/g, '""')}"`;
    }
    return val;
  };

  const csvLines = [
    headers.map(escapeCell).join(','),
    ...sampleRows.map((row) => row.map(escapeCell).join(',')),
  ];

  return csvLines.join('\r\n');
}
