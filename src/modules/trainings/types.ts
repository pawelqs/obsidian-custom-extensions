export interface TrainingsChunkConfig {
  height: number;
  metrics: string[];
  chartType: string;
}

export interface TrainingItem {
  category: string;
  hours: number;
}

export interface BodyMeasurement {
  metric: string;
  value: number;
}

export interface DailyData {
  date: string;
  dayLabel?: string;
  body: BodyMeasurement[];
  trainings: TrainingItem[];
}

export interface ExerciseStatus {
  name: string;
  level: number; // 0 (not done) … 10 (A, fully done)
  bonus?: number; // 1–5 for statuses B–F (done, plus extra)
  goal?: string;
}

export interface WeeklyExercises {
  date: string; // heading date, any day of the week
  exercises: ExerciseStatus[];
}
