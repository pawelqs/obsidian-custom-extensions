import { describe, it, expect } from 'bun:test';
import { parseCategories, parseMonths } from './parser';
import testData from './testdata/test.txt';

const expectedConfig = {
	colorsMap: {
		'mieszkanie': '#1f77b4',
		'jedzenie & rev': '#72b0dc',
		'transport': '#55d4e0',
		'inne': '#7f7f7f',
		'other': '#b0b0b0',
		'savings': '#2ca02c',
		'net income': '#2ca02c'
	},
	groupCats: {
		'must': ['mieszkanie', 'jedzenie & rev'],
		'wants': ['transport'],
		'inne': ['inne']
	},
	groupOrder: ['must', 'wants', 'inne'],
	cats: ['mieszkanie', 'jedzenie & rev', 'transport', 'inne']
};

const expectedMonths = [
	{
		id: '2026-03',
		label: '2026-03',
		income: 1300,
		taxes: 300,
		savings: 300,
		expenses: 300,
		cats: {
			'mieszkanie': 100,
			'jedzenie & rev': 150,
			'transport': 50,
			'inne': 0
		}
	},
	{
		id: '2026-04',
		label: '2026-04',
		income: 1300,
		taxes: 300,
		savings: 300,
		expenses: 300,
		cats: {
			'mieszkanie': 100,
			'jedzenie & rev': 150,
			'transport': 50,
			'inne': 0
		}
	}
];

describe('Parser', () => {
	it('should parse categories config correctly', () => {
		const config = parseCategories(testData);
		expect(config).toEqual(expectedConfig);
	});

	it('should parse monthly data correctly', () => {
		const config = parseCategories(testData);
		const months = parseMonths(testData, config);
		expect(months).toEqual(expectedMonths);
	});
});
