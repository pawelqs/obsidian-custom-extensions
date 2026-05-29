/**
 * Pure data transforms: domain `DailyData[]` → chart-ready aggregates.
 * No DOM / Chart.js — safe to unit-test without a canvas.
 */
import { DailyData, TrainingsConfig } from './types';

export interface TrainingAggregate {
	weeks: string[];                                              // sorted Monday-of-week dates (YYYY-MM-DD), x-axis labels
	categories: string[];                                         // config order first, then alphabetical for unknown
	hoursByWeekCategory: Record<string, Record<string, number>>;  // [week][cat] = sum of hours; missing key = 0
}

export interface BodyAggregate {
	dates: string[];                                  // sorted union of measurement dates, x-axis labels
	series: Record<string, Map<string, number>>;      // series[metric].get(date) = value; missing = gap
}

/** Aggregate training hours by week and category. */
export function aggregateTrainings(dailyData: DailyData[], config: TrainingsConfig): TrainingAggregate {
	const hoursByWeekCategory: Record<string, Record<string, number>> = {};
	for (const day of dailyData) {
		const w = weekStart(day.date);
		if (!hoursByWeekCategory[w]) hoursByWeekCategory[w] = {};
		const bucket = hoursByWeekCategory[w];
		for (const t of day.trainings) {
			bucket[t.category] = (bucket[t.category] || 0) + t.hours;
		}
	}

	const weeks = Object.keys(hoursByWeekCategory).sort();
	const catOrder = Object.keys(config.colorsMap);
	const usedCategories = new Set(weeks.flatMap((w) => Object.keys(hoursByWeekCategory[w] || {})));
	const knownCategories = catOrder.filter((c) => usedCategories.has(c));
	const unknownCategories = [...usedCategories].filter((c) => !catOrder.includes(c)).sort();
	const categories = [...knownCategories, ...unknownCategories];

	return { weeks, categories, hoursByWeekCategory };
}

/** Collect body measurements per metric, indexed by date. */
export function aggregateBody(dailyData: DailyData[], metrics: string[]): BodyAggregate {
	const series: Record<string, Map<string, number>> = Object.fromEntries(
		metrics.map((m) => [m, new Map<string, number>()])
	);
	for (const day of dailyData) {
		for (const b of day.body) {
			series[b.metric]?.set(day.date, b.value);
		}
	}

	const dates = [
		...new Set(metrics.flatMap((m) => Array.from(series[m]?.keys() ?? []))),
	].sort();

	return { dates, series };
}

export function weekStart(dateStr: string): string {
	const d = new Date(dateStr + 'T00:00:00Z');
	const dow = d.getUTCDay();
	const diff = dow === 0 ? -6 : 1 - dow;
	d.setUTCDate(d.getUTCDate() + diff);
	return d.toISOString().slice(0, 10);
}
