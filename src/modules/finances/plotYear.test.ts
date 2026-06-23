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
];

describe('aggregateYearSummary', () => {
	it('sums each category across all months, sorted descending', () => {
		const entries = aggregateYearSummary(months, config);
		expect(entries).toEqual([
			{ label: 'housing', value: 400 },
			{ label: 'transport', value: 200 },
			{ label: 'savings', value: 50 },
			{ label: 'other', value: 0 },
		]);
	});

	it('nets negative savings months into the total instead of clamping them', () => {
		const entries = aggregateYearSummary(months, config);
		const savings = entries.find((e) => e.label === 'savings');
		expect(savings?.value).toBe(50);
	});
});
