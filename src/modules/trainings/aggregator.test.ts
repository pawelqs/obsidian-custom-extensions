import { describe, it, expect } from 'bun:test';
import { weekStart } from './aggregator';

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
