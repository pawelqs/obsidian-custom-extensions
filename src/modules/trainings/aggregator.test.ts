import { describe, it, expect } from 'bun:test';
import { aggregateTrainings, monthBands, weekStart } from './aggregator';
import { DailyData } from './types';
import { CategoriesConfig } from '../../shared/parseCategories';

const config: CategoriesConfig = { colorsMap: { strength: '#e74c3c' }, groupCats: {}, groupOrder: [] };

function day(date: string, category: string, hours: number): DailyData {
	return { date, body: [], trainings: [{ category, hours }] };
}

const utc = (date: string) => Date.parse(date + 'T00:00:00Z');

describe('aggregateTrainings', () => {
	it('keeps only weeks that have data (gaps are left to the time axis)', () => {
		const dailyData = [day('2026-04-06', 'strength', 1), day('2026-04-27', 'strength', 2)];
		const { weeks, hoursByWeekCategory } = aggregateTrainings(dailyData, config);
		expect(weeks).toEqual(['2026-04-06', '2026-04-27']);
		expect(hoursByWeekCategory['2026-04-06']?.strength).toBe(1);
	});

	it('returns no weeks for empty data', () => {
		expect(aggregateTrainings([], config).weeks).toEqual([]);
	});
});

describe('monthBands', () => {
	it('covers each calendar month with a [monthStart, nextMonthStart) range', () => {
		expect(monthBands(['2026-05-25', '2026-06-01'])).toEqual([
			{ key: '2026-05', startMs: utc('2026-05-25'), endMs: utc('2026-06-01') },
			{ key: '2026-06', startMs: utc('2026-06-01'), endMs: utc('2026-06-08') },
		]);
	});

	it('splits a straddling week at the real month boundary', () => {
		// Week Mon 2026-01-26 → Sun 2026-02-01; only the Sunday belongs to February.
		expect(monthBands(['2026-01-26'])).toEqual([
			{ key: '2026-01', startMs: utc('2026-01-26'), endMs: utc('2026-02-01') },
			{ key: '2026-02', startMs: utc('2026-02-01'), endMs: utc('2026-02-02') },
		]);
	});

	it('returns empty for no weeks', () => {
		expect(monthBands([])).toEqual([]);
	});
});

describe('weekStart', () => {
	it('Monday returns the same day', () => {
		expect(weekStart('2026-04-20')).toBe('2026-04-20');
	});

	it('Thursday returns the previous Monday', () => {
		expect(weekStart('2026-04-23')).toBe('2026-04-20');
	});

	it('Saturday returns the Monday of the same week', () => {
		expect(weekStart('2026-04-25')).toBe('2026-04-20');
	});

	it('Sunday returns the Monday 6 days earlier (not the next one)', () => {
		expect(weekStart('2026-04-26')).toBe('2026-04-20');
	});

	it('handles month boundary (Sunday May 3 → Monday April 27)', () => {
		expect(weekStart('2026-05-03')).toBe('2026-04-27');
	});

	it('handles year boundary (Thursday Jan 1 2026 → Monday Dec 29 2025)', () => {
		expect(weekStart('2026-01-01')).toBe('2025-12-29');
	});
});
