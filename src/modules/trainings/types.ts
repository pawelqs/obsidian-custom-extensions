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

