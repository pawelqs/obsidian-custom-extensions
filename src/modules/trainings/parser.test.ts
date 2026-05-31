import { describe, it, expect } from 'bun:test';
import { parseDailyData, parseBodyItems, parseTrainingItems, parseInline } from './parser';
import { parseCategories } from '../../shared/parseCategories';
import testData from './testdata/test.txt';

const expectedConfig = {
	colorsMap: {
		strength: '#e74c3c',
		mobility: '#9b59b6',
		handstand: '#808000',
		cardio: '#43a047',
	},
	groupCats: {},
	groupOrder: [],
};

const expectedDailyData = [
	{
		date: '2026-04-22',
		dayLabel: undefined,
		body: [],
		trainings: [
			{ category: 'cardio', hours: 0.5 },
			{ category: 'strength', hours: 0.5 },
		],
	},
	{
		date: '2026-04-23',
		dayLabel: 'sb',
		body: [
			{ metric: 'kg', value: 72 },
			{ metric: 'PBF', value: 19 },
		],
		trainings: [
			{ category: 'mobility', hours: 0.5 },
			{ category: 'handstand', hours: 0.25 },
			{ category: 'strength', hours: 1 },
		],
	},
	{
		date: '2026-04-24',
		dayLabel: undefined,
		body: [{ metric: 'kg', value: 70 }],
		trainings: [
			{ category: 'mobility', hours: 1 },
			{ category: 'strength', hours: 1 },
		],
	},
	{
		date: '2026-04-26',
		dayLabel: undefined,
		body: [
			{ metric: 'kg', value: 70 },
			{ metric: 'PBF', value: 18 },
		],
		trainings: [
			{ category: 'strength', hours: 1 },
			{ category: 'mobility', hours: 0.5 },
		],
	},
];

describe('parseCategories + parseDailyData', () => {
	it('parses full markdown into config + days', () => {
		const config = parseCategories(testData);
		expect(config).toEqual(expectedConfig);

		const dailyData = parseDailyData(testData, config);
		expect(dailyData).toEqual(expectedDailyData);
	});
});

describe('parseInline', () => {
	it('parses combined body + training segments', () => {
		const input = 'body: 70 kg, 18 PBF, training: strength 1h, mobility 30m';
		expect(parseInline(input)).toEqual({
			body: [
				{ value: 70, metric: 'kg' },
				{ value: 18, metric: 'PBF' },
			],
			trainings: [
				{ category: 'strength', hours: 1 },
				{ category: 'mobility', hours: 0.5 },
			],
		});
	});

	it('ignores inline exercise list after training', () => {
		const input = 'body: 70 kg, training: strength 1h: - pompki 10,12,12,10 - podciąganie 5,5,6';
		expect(parseInline(input)).toEqual({
			body: [{ value: 70, metric: 'kg' }],
			trainings: [{ category: 'strength', hours: 1 }],
		});
	});

	it('handles training only (no body segment)', () => {
		expect(parseInline('training: cardio 45m')).toEqual({
			body: [],
			trainings: [{ category: 'cardio', hours: 0.75 }],
		});
	});
});

describe('parseBodyItems', () => {
	it('parses single, multiple, decimal with comma, and empty input', () => {
		expect(parseBodyItems('70 kg')).toEqual([{ value: 70, metric: 'kg' }]);
		expect(parseBodyItems('70,5 kg, 18 PBF')).toEqual([
			{ value: 70.5, metric: 'kg' },
			{ value: 18, metric: 'PBF' },
		]);
		expect(parseBodyItems('72,5 kg')).toEqual([{ value: 72.5, metric: 'kg' }]);
		expect(parseBodyItems('')).toEqual([]);
	});
});

describe('parseTrainingItems', () => {
	it('parses hours/minutes and drops inline exercise list after `:`', () => {
		expect(parseTrainingItems('strength 1h')).toEqual([
			{ category: 'strength', hours: 1 },
		]);
		expect(parseTrainingItems('strength 1h, mobility 30m')).toEqual([
			{ category: 'strength', hours: 1 },
			{ category: 'mobility', hours: 0.5 },
		]);
		expect(parseTrainingItems('strength 1h: - pompki 10,12,12,10')).toEqual([
			{ category: 'strength', hours: 1 },
		]);
		expect(parseTrainingItems('')).toEqual([]);
	});
});
