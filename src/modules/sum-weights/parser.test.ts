import { describe, expect, test } from 'bun:test';
import { sumWeights, headingHasWeightTag, headingTitle, findEnclosingHeading } from './parser';
import testData from './testdata/test.txt';

describe('sumWeights', () => {
	test('sums every <number>g token', () => {
		expect(sumWeights('plecak 1660g + namiot 2200 g')).toBe(3860);
	});

	test('ignores numbers without the g suffix', () => {
		expect(sumWeights('Naturhike Star River 2, Cumulus Panyam 450')).toBe(0);
	});

	test('does not match g that is part of a word', () => {
		expect(sumWeights('Gregory Paragon 50, 100grams')).toBe(0);
	});

	test('empty / no weights', () => {
		expect(sumWeights('liofy, mięso suszone')).toBe(0);
	});
});

describe('headingHasWeightTag', () => {
	test('true when the tag is present', () => {
		expect(headingHasWeightTag('# Sprzęt #suma-wag')).toBe(true);
		expect(headingHasWeightTag('# Sprzęt #sum-weights')).toBe(true);
	});

	test('false for a bare heading', () => {
		expect(headingHasWeightTag('# Sprzęt')).toBe(false);
	});

	test('does not match a tag that is only a prefix', () => {
		expect(headingHasWeightTag('# Sprzęt #suma-wagi-plecaka')).toBe(false);
	});
});

describe('headingTitle', () => {
	test('strips heading markers and the weight tag', () => {
		expect(headingTitle('# Sprzęt #sum-weights')).toBe('Sprzęt');
		expect(headingTitle('## Plecak na lato #suma-wag')).toBe('Plecak na lato');
	});

	test('keeps other tags', () => {
		expect(headingTitle('# Sprzęt #gory #sum-weights')).toBe('Sprzęt #gory');
	});

	test('empty when the heading is only the tag', () => {
		expect(headingTitle('# #sum-weights')).toBe('');
	});
});

describe('findEnclosingHeading', () => {
	test('returns the nearest heading above the line', () => {
		const lines = testData.split('\n');
		// line 2 (0-based) is the first list item under "# Sprzęt #sum-weights"
		expect(findEnclosingHeading(lines, 2)).toBe('# Sprzęt #sum-weights');
	});

	test('picks the closest heading, not an earlier tagged one', () => {
		const lines = testData.split('\n');
		const looseListLine = lines.findIndex((l) => l.includes('bez wagi'));
		expect(findEnclosingHeading(lines, looseListLine)).toBe('## Luźne notatki');
	});

	test('returns null with no heading above', () => {
		expect(findEnclosingHeading(['- a', '- b'], 1)).toBeNull();
	});
});
