import { describe, it, expect } from 'bun:test';
import { aggregateYearSummary } from './plotYear';
import { MonthData } from './types';
import { CategoriesConfig } from '../../shared/parseCategories';

const config: CategoriesConfig = {
	colorsMap: {},
	groupCats: { must: ['housing'], wants: ['transport'] },
	groupOrder: ['must', 'wants'],
};

const months: MonthData[] = [
	{
		id: '2026-01',
		label: '2026-01',
		income: 500,
		taxes: 100,
		savings: 100,
		expenses: 300,
		cats: { housing: 200, transport: 100 },
	},
	{
		id: '2026-02',
		label: '2026-02',
		income: 350,
		taxes: 100,
		savings: -50,
		expenses: 300,
		cats: { housing: 200, transport: 100 },
	},
	{
		id: '2026-03',
		label: '2026-03',
		income: 500,
		taxes: 100,
		savings: 100,
		expenses: 300,
		cats: { housing: 200, transport: 100 },
	},
];

const now = new Date('2026-02-15');

describe('aggregateYearSummary', () => {
	it('sums each category across all months, sorted descending by total', () => {
		const entries = aggregateYearSummary(months, config, now);
		expect(entries).toEqual([
			{ label: 'housing', pastValue: 200, currentValue: 400 },
			{ label: 'transport', pastValue: 100, currentValue: 200 },
			{ label: 'savings', pastValue: 100, currentValue: 50 },
			{ label: 'other', pastValue: 0, currentValue: 0 },
		]);
	});

	it('splits past months (before the reference date) from the current and future ones', () => {
		const entries = aggregateYearSummary(months, config, now);
		const housing = entries.find((e) => e.label === 'housing');
		expect(housing).toEqual({ label: 'housing', pastValue: 200, currentValue: 400 });
	});

	it('nets negative savings months into the total instead of clamping them', () => {
		const entries = aggregateYearSummary(months, config, now);
		const savings = entries.find((e) => e.label === 'savings');
		expect((savings?.pastValue ?? 0) + (savings?.currentValue ?? 0)).toBe(150);
	});

	it('sorts by past (actuals) value only when sortBy is "actuals"', () => {
		const entries = aggregateYearSummary(months, config, now, 'actuals');
		expect(entries.map((e) => e.label)).toEqual(['housing', 'savings', 'transport', 'other']);
		expect(entries.map((e) => e.pastValue)).toEqual([200, 100, 100, 0]);
	});
});
