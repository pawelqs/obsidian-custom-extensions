import { describe, it, expect } from 'bun:test';
import { lightenColor } from './colors';

describe('lightenColor', () => {
	it('moves each channel toward white by the given amount', () => {
		expect(lightenColor('#000000', 0.5)).toBe('#808080');
	});

	it('returns white unchanged', () => {
		expect(lightenColor('#ffffff', 0.5)).toBe('#ffffff');
	});

	it('returns the input unchanged for non-hex colors', () => {
		expect(lightenColor('var(--text-normal)', 0.5)).toBe('var(--text-normal)');
	});
});
