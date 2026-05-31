import { describe, it, expect } from 'bun:test';
import { filterCategories, parseMonths } from './parser';
import { parseCategories } from '../../shared/parseCategories';
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
	groupOrder: ['must', 'wants', 'inne']
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
		const config = filterCategories(parseCategories(testData));
		expect(config).toEqual(expectedConfig);
	});

	it('should parse monthly data correctly', () => {
		const config = filterCategories(parseCategories(testData));
		const months = parseMonths(testData, config);
		expect(months).toEqual(expectedMonths);
	});
});

describe('filterCategories', () => {
	it('drops the special group from groupOrder/groupCats and keeps colors', () => {
		const input = {
			colorsMap: { a: '#111', s: '#222' },
			groupCats: { must: ['a'], special: ['s'] },
			groupOrder: ['must', 'special'],
		};
		expect(filterCategories(input)).toEqual({
			colorsMap: { a: '#111', s: '#222' },
			groupCats: { must: ['a'] },
			groupOrder: ['must'],
		});
	});
});
