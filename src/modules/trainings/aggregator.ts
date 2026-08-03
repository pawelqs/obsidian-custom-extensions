/**
 * Pure data transforms: domain `DailyData[]` → chart-ready aggregates.
 * No DOM / Chart.js — safe to unit-test without a canvas.
 */
import { DailyData } from './types';
import { CategoriesConfig } from '../../shared/parseCategories';

export interface TrainingAggregate {
	weeks: string[];                                              // sorted Monday-of-week dates (YYYY-MM-DD) that have data
	categories: string[];                                         // config order first, then alphabetical for unknown
	hoursByWeekCategory: Record<string, Record<string, number>>;  // [week][cat] = sum of hours; missing key = 0
}

export interface MonthBand {
	key: string;     // YYYY-MM
	startMs: number; // first millisecond of the month (clamped to the chart's first week)
	endMs: number;   // first millisecond of the next month (clamped to the end of the last week)
}

export interface BodyAggregate {
	dates: string[];                                  // sorted union of measurement dates, x-axis labels
	series: Record<string, Map<string, number>>;      // series[metric].get(date) = value; missing = gap
}

/** Aggregate training hours by week and category. */
export function aggregateTrainings(dailyData: DailyData[], config: CategoriesConfig): TrainingAggregate {
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

const WEEK_MS = 7 * 86_400_000;

/**
 * Split the time span of the weeks into one band per calendar month. Because the chart's x-axis is
 * a real time axis, each band is just a [monthStart, nextMonthStart) millisecond range — a week
 * straddling two months is naturally cut at the boundary when the renderer maps ms → pixel.
 */
export function monthBands(weeks: string[]): MonthBand[] {
	const first = weeks[0];
	const last = weeks[weeks.length - 1];
	if (first === undefined || last === undefined) return [];
	const rangeEnd = utcMs(last) + WEEK_MS;  // exclusive end: the Monday after the last week
	const bands: MonthBand[] = [];
	for (let cursor = utcMs(first); cursor < rangeEnd; ) {
		const next = firstOfNextMonthMs(cursor);
		bands.push({ key: monthKey(cursor), startMs: cursor, endMs: Math.min(next, rangeEnd) });
		cursor = next;
	}
	return bands;
}

function firstOfNextMonthMs(ms: number): number {
	const d = new Date(ms);
	return Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1);
}

function monthKey(ms: number): string {
	const d = new Date(ms);
	return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

function utcMs(date: string): number {
	return Date.parse(date + 'T00:00:00Z');
}

export function weekStart(dateStr: string): string {
	const d = new Date(dateStr + 'T00:00:00Z');
	const dow = d.getUTCDay();
	const diff = dow === 0 ? -6 : 1 - dow;
	d.setUTCDate(d.getUTCDate() + diff);
	return d.toISOString().slice(0, 10);
}
