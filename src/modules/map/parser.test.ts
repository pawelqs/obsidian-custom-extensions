import { describe, expect, test } from 'bun:test';
import { parseLocations, buildRoutes } from './parser';
import { CategoriesConfig } from '../../shared/parseCategories';
import { MapLocation } from './types';

const emptyConfig: CategoriesConfig = { colorsMap: {}, groupCats: {}, groupOrder: [] };

describe('parseLocations', () => {
	test('nagłówek jako lokacja — kategoria tylko z jawnego cat, bez dziedziczenia', () => {
		const input = [
			'# Warszawa `geo: 52.1, 21.0`',
			'## Kraków `geo: 50.06, 19.94, cat: miasta`',
		].join('\n');
		expect(parseLocations(input, emptyConfig)).toEqual([
			{ name: 'Warszawa', lat: 52.1,  lon: 21.0,  category: null,     route: null, seq: null },
			{ name: 'Kraków',   lat: 50.06, lon: 19.94, category: 'miasta', route: null, seq: null },
		]);
	});

	test('lista dziedziczy kategorię z poprzedzającego nagłówka (z możliwością override)', () => {
		const input = [
			'### Parki',
			'- bullet `geo: 52.4, 21.0`',
			'1. numerowany `geo: 52.5, 21.0`',
			'plain `geo: 52.6, 21.0`',
			'- override `geo: 52.7, 21.0, cat: inne`',
		].join('\n');
		expect(parseLocations(input, emptyConfig)).toEqual([
			{ name: 'bullet',     lat: 52.4, lon: 21.0, category: 'Parki', route: null, seq: null },
			{ name: 'numerowany', lat: 52.5, lon: 21.0, category: 'Parki', route: null, seq: null },
			{ name: 'plain',      lat: 52.6, lon: 21.0, category: 'Parki', route: null, seq: null },
			{ name: 'override',   lat: 52.7, lon: 21.0, category: 'inne',  route: null, seq: null },
		]);
	});

	test('ignoruje tekst po zamykającym backticku', () => {
		expect(parseLocations('- Miejsce `geo: 52.9, 21.0` — komentarz po', emptyConfig)).toEqual([
			{ name: 'Miejsce', lat: 52.9, lon: 21.0, category: null, route: null, seq: null },
		]);
	});

	test('trasa w formie cat:/route: (numer, kategoria, bez numeru)', () => {
		const input = [
			'- Start `geo: 53.1, 21.0, route: wycieczka#1`',
			'- Środek `geo: 53.2, 21.0, route: wycieczka#2, cat: muzea`',
			'- Bez numeru `geo: 53.3, 21.0, route: trasa`',
		].join('\n');
		expect(parseLocations(input, emptyConfig)).toEqual([
			{ name: 'Start',      lat: 53.1, lon: 21.0, category: null,    route: 'wycieczka', seq: 1    },
			{ name: 'Środek',     lat: 53.2, lon: 21.0, category: 'muzea', route: 'wycieczka', seq: 2    },
			{ name: 'Bez numeru', lat: 53.3, lon: 21.0, category: null,    route: 'trasa',     seq: null },
		]);
	});

	test('kategoria ze spacją', () => {
		expect(parseLocations('- Rynek `geo: 50.06, 19.94, cat: stare miasto`', emptyConfig)).toEqual([
			{ name: 'Rynek', lat: 50.06, lon: 19.94, category: 'stare miasto', route: null, seq: null },
		]);
	});

	test('zwraca pustą tablicę gdy brak koordynatów', () => {
		expect(parseLocations('zwykły tekst\n- bez geo', emptyConfig)).toEqual([]);
	});

	test('ujemne koordynaty', () => {
		expect(parseLocations('- New York `geo: -40.7128, -74.006`', emptyConfig)).toEqual([
			{ name: 'New York', lat: -40.7128, lon: -74.006, category: null, route: null, seq: null },
		]);
	});

	test('sigile #kategoria @trasa#seq (dowolna kolejność)', () => {
		const input = [
			'- A `geo: 52.1, 21.0 #muzea @wycieczka#1`',
			'- B `geo: 52.2, 21.0 @wycieczka#2 #parki`',
		].join('\n');
		expect(parseLocations(input, emptyConfig)).toEqual([
			{ name: 'A', lat: 52.1, lon: 21.0, category: 'muzea', route: 'wycieczka', seq: 1 },
			{ name: 'B', lat: 52.2, lon: 21.0, category: 'parki', route: 'wycieczka', seq: 2 },
		]);
	});

	test('sam sigil kategorii / sam sigil trasy bez numeru', () => {
		const input = [
			'- A `geo: 52.1, 21.0 #muzea`',
			'- B `geo: 52.2, 21.0 @trasa`',
		].join('\n');
		expect(parseLocations(input, emptyConfig)).toEqual([
			{ name: 'A', lat: 52.1, lon: 21.0, category: 'muzea', route: null,    seq: null },
			{ name: 'B', lat: 52.2, lon: 21.0, category: null,    route: 'trasa', seq: null },
		]);
	});
});

describe('buildRoutes', () => {
	const loc = (over: Partial<MapLocation>): MapLocation => ({
		name: 'x', lat: 0, lon: 0, category: null, route: null, seq: null, ...over,
	});

	test('grupuje po trasie i sortuje po seq', () => {
		const locations = [
			loc({ name: 'B', route: 'r', seq: 2 }),
			loc({ name: 'A', route: 'r', seq: 1 }),
			loc({ name: 'C', route: 'r', seq: 3 }),
		];
		const routes = buildRoutes(locations);
		expect(routes).toHaveLength(1);
		expect(routes[0]!.name).toBe('r');
		expect(routes[0]!.points.map((p) => p.name)).toEqual(['A', 'B', 'C']);
	});

	test('wiele tras, kolejność wg pierwszego wystąpienia', () => {
		const routes = buildRoutes([
			loc({ route: 'druga', seq: 1 }),
			loc({ route: 'pierwsza', seq: 1 }),
			loc({ route: 'druga', seq: 2 }),
		]);
		expect(routes.map((r) => r.name)).toEqual(['druga', 'pierwsza']);
	});

	test('pomija punkty bez route lub bez seq', () => {
		const routes = buildRoutes([
			loc({ route: 'r', seq: null }),
			loc({ route: null, seq: 1 }),
			loc({ route: 'r', seq: 1 }),
		]);
		expect(routes).toHaveLength(1);
		expect(routes[0]!.points).toHaveLength(1);
	});
});
