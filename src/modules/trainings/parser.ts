import { DailyData, TrainingItem, BodyMeasurement } from './types';
import { CategoriesConfig } from '../../shared/parseCategories';

export function parseDailyData(content: string, _config: CategoriesConfig): DailyData[] {
	const lines = content.split('\n');
	const dailyData: DailyData[] = [];
	let current: DailyData | null = null;
	let inData = false;

	for (const line of lines) {
		if (line.startsWith('## Data')) {
			inData = true;
			continue;
		}
		if (!inData) continue;
		if (line.startsWith('## ')) break;

		// Date line: `- YYYY-MM-DD [dayLabel][: inline content]`
		const dateMatch = line.match(/^-\s+(\d{4}-\d{2}-\d{2})(?:\s+(\S+))?(?::\s*(.*))?$/);
		if (dateMatch?.[1]) {
			current = {
				date: dateMatch[1],
				dayLabel: dateMatch[2],
				body: [],
				trainings: [],
			};
			dailyData.push(current);
			if (dateMatch[3]) {
				const inline = parseInline(dateMatch[3]);
				current.body.push(...inline.body);
				current.trainings.push(...inline.trainings);
			}
			continue;
		}

		if (!current) continue;

		const bodyMatch = line.match(/^\s+body:\s*(.+)/);
		if (bodyMatch?.[1]) {
			current.body.push(...parseBodyItems(bodyMatch[1]));
			continue;
		}

		const trainMatch = line.match(/^\s+training:\s*(.+)/);
		if (trainMatch?.[1]) {
			current.trainings.push(...parseTrainingItems(trainMatch[1]));
			continue;
		}
	}

	dailyData.sort((a, b) => a.date.localeCompare(b.date));
	return dailyData;
}

export function parseInline(content: string): { body: BodyMeasurement[]; trainings: TrainingItem[] } {
	// Split on body:/training: markers; keep the marker as the captured group
	const parts = content.split(/,?\s*\b(body|training):\s*/);
	// parts: [prefix, key, value, key, value, ...]
	const body: BodyMeasurement[] = [];
	const trainings: TrainingItem[] = [];
	for (let i = 1; i < parts.length; i += 2) {
		const key = parts[i];
		const value = parts[i + 1];
		if (!value) continue;
		if (key === 'body') {
			body.push(...parseBodyItems(value));
		} else if (key === 'training') {
			trainings.push(...parseTrainingItems(value));
		}
	}
	return { body, trainings };
}

export function parseBodyItems(str: string): BodyMeasurement[] {
	// Split by commas NOT followed by a digit (so "70,5 kg" stays one item).
	return str
		.split(/,(?!\d)/)
		.map((s) => s.trim())
		.filter(Boolean)
		.flatMap((item) => {
			const m = item.match(/^([\d.,]+)\s+(\S+)$/);
			if (!m?.[1] || !m[2]) return [];
			return [{ value: parseFloat(m[1].replace(',', '.')), metric: m[2] }];
		});
}

export function parseTrainingItems(str: string): TrainingItem[] {
	// Drop inline exercise list (anything after the first `:` in the value)
	const beforeColon = str.split(':')[0]?.trim() ?? '';
	if (!beforeColon) return [];

	// Split by commas NOT followed by a digit (digits are part of numbers like "10,12")
	return beforeColon
		.split(/,(?!\d)/)
		.map((s) => s.trim())
		.filter(Boolean)
		.flatMap((item) => {
			const m = item.match(/^(.+?)\s+([\d.,]+)\s*(h|m)?$/);
			if (!m?.[1] || !m[2]) return [];
			const value = parseFloat(m[2].replace(',', '.'));
			const unit = m[3] || 'h';
			const hours = unit === 'm' ? value / 60 : value;
			return [{ category: m[1].trim(), hours }];
		});
}
