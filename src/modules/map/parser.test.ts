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
			{ name: 'Warszawa', lat: 52.1,  lon: 21.0,  category: null,     routes: [] },
			{ name: 'Kraków',   lat: 50.06, lon: 19.94, category: 'miasta', routes: [] },
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
			{ name: 'bullet',     lat: 52.4, lon: 21.0, category: 'Parki', routes: [] },
			{ name: 'numerowany', lat: 52.5, lon: 21.0, category: 'Parki', routes: [] },
			{ name: 'plain',      lat: 52.6, lon: 21.0, category: 'Parki', routes: [] },
			{ name: 'override',   lat: 52.7, lon: 21.0, category: 'inne',  routes: [] },
		]);
	});

	test('no-implicit-categories: bez dziedziczenia z nagłówka, tylko jawne cat', () => {
		const input = [
			'### Parki',
			'- bullet `geo: 52.4, 21.0`',
			'- jawne `geo: 52.7, 21.0, cat: inne`',
		].join('\n');
		expect(parseLocations(input, emptyConfig, { implicitCategories: false })).toEqual([
			{ name: 'bullet', lat: 52.4, lon: 21.0, category: null,   routes: [] },
			{ name: 'jawne',  lat: 52.7, lon: 21.0, category: 'inne', routes: [] },
		]);
	});

	test('ignoruje tekst po zamykającym backticku', () => {
		expect(parseLocations('- Miejsce `geo: 52.9, 21.0` — komentarz po', emptyConfig)).toEqual([
			{ name: 'Miejsce', lat: 52.9, lon: 21.0, category: null, routes: [] },
		]);
	});

	test('trasa w formie cat:/route: (numer, kategoria, bez numeru = pomijana)', () => {
		const input = [
			'- Start `geo: 53.1, 21.0, route: wycieczka#1`',
			'- Środek `geo: 53.2, 21.0, route: wycieczka#2, cat: muzea`',
			'- Bez numeru `geo: 53.3, 21.0, route: trasa`',
		].join('\n');
		expect(parseLocations(input, emptyConfig)).toEqual([
			{ name: 'Start',      lat: 53.1, lon: 21.0, category: null,    routes: [{ name: 'wycieczka', seq: 1 }] },
			{ name: 'Środek',     lat: 53.2, lon: 21.0, category: 'muzea', routes: [{ name: 'wycieczka', seq: 2 }] },
			{ name: 'Bez numeru', lat: 53.3, lon: 21.0, category: null,    routes: [] },
		]);
	});

	test('kategoria ze spacją', () => {
		expect(parseLocations('- Rynek `geo: 50.06, 19.94, cat: stare miasto`', emptyConfig)).toEqual([
			{ name: 'Rynek', lat: 50.06, lon: 19.94, category: 'stare miasto', routes: [] },
		]);
	});

	test('zwraca pustą tablicę gdy brak koordynatów', () => {
		expect(parseLocations('zwykły tekst\n- bez geo', emptyConfig)).toEqual([]);
	});

	test('ujemne koordynaty', () => {
		expect(parseLocations('- New York `geo: -40.7128, -74.006`', emptyConfig)).toEqual([
			{ name: 'New York', lat: -40.7128, lon: -74.006, category: null, routes: [] },
		]);
	});

	test('sigile #kategoria @trasa#seq (dowolna kolejność)', () => {
		const input = [
			'- A `geo: 52.1, 21.0 #muzea @wycieczka#1`',
			'- B `geo: 52.2, 21.0 @wycieczka#2 #parki`',
		].join('\n');
		expect(parseLocations(input, emptyConfig)).toEqual([
			{ name: 'A', lat: 52.1, lon: 21.0, category: 'muzea', routes: [{ name: 'wycieczka', seq: 1 }] },
			{ name: 'B', lat: 52.2, lon: 21.0, category: 'parki', routes: [{ name: 'wycieczka', seq: 2 }] },
		]);
	});

	test('jeden punkt w kilku trasach — sigile @a#n @b#n', () => {
		expect(parseLocations('- Węzeł `geo: 52.1, 21.0 #miasta @day1#2 @day2#1`', emptyConfig)).toEqual([
			{
				name: 'Węzeł', lat: 52.1, lon: 21.0, category: 'miasta',
				routes: [{ name: 'day1', seq: 2 }, { name: 'day2', seq: 1 }],
			},
		]);
	});

	test('jeden punkt w kilku trasach — forma route: powtórzona', () => {
		expect(parseLocations('- Węzeł `geo: 52.1, 21.0, route: day1#2, route: day2#1`', emptyConfig)).toEqual([
			{
				name: 'Węzeł', lat: 52.1, lon: 21.0, category: null,
				routes: [{ name: 'day1', seq: 2 }, { name: 'day2', seq: 1 }],
			},
		]);
	});

	test('emfaza bezpośrednio przed geo jest nazwą (kursywa, pogrubienie, _, __)', () => {
		const input = [
			'Odwiedziliśmy piękną *Roma* `geo: 41.9, 12.4` wczoraj.',
			'Wjazd na **Wieża Eiffla** `geo: 48.858, 2.294`',
			'Potem _Praha_ `geo: 50.08, 14.43`',
			'i na koniec __Wien__ `geo: 48.2, 16.37`',
		].join('\n');
		expect(parseLocations(input, emptyConfig)).toEqual([
			{ name: 'Roma',         lat: 41.9,   lon: 12.4,  category: null, routes: [] },
			{ name: 'Wieża Eiffla', lat: 48.858, lon: 2.294, category: null, routes: [] },
			{ name: 'Praha',        lat: 50.08,  lon: 14.43, category: null, routes: [] },
			{ name: 'Wien',         lat: 48.2,   lon: 16.37, category: null, routes: [] },
		]);
	});

	test('emfaza wygrywa też w liście; emfaza nie na końcu → cały tekst przed', () => {
		const input = [
			'- *Roma* `geo: 41.9, 12.4`',
			'Zwiedzanie *pięknego* Rzymu `geo: 41.8, 12.5`',
		].join('\n');
		expect(parseLocations(input, emptyConfig)).toEqual([
			{ name: 'Roma',                    lat: 41.9, lon: 12.4, category: null, routes: [] },
			{ name: 'Zwiedzanie *pięknego* Rzymu', lat: 41.8, lon: 12.5, category: null, routes: [] },
		]);
	});

	test('kilka tokenów geo w jednym wierszu — nazwa z fragmentu przed każdym', () => {
		const input =
			'Zaczęliśmy od **Roma** `geo: 41.9, 12.4 #miasta`, potem *Napoli* `geo: 40.85, 14.27` i _Bari_ `geo: 41.12, 16.87`.';
		expect(parseLocations(input, emptyConfig)).toEqual([
			{ name: 'Roma',   lat: 41.9,  lon: 12.4,  category: 'miasta', routes: [] },
			{ name: 'Napoli', lat: 40.85, lon: 14.27, category: null,     routes: [] },
			{ name: 'Bari',   lat: 41.12, lon: 16.87, category: null,     routes: [] },
		]);
	});

	test('sam sigil kategorii / sigil trasy bez numeru jest pomijany', () => {
		const input = [
			'- A `geo: 52.1, 21.0 #muzea`',
			'- B `geo: 52.2, 21.0 @trasa`',
		].join('\n');
		expect(parseLocations(input, emptyConfig)).toEqual([
			{ name: 'A', lat: 52.1, lon: 21.0, category: 'muzea', routes: [] },
			{ name: 'B', lat: 52.2, lon: 21.0, category: null,    routes: [] },
		]);
	});
});

describe('buildRoutes', () => {
	const loc = (over: Partial<MapLocation>): MapLocation => ({
		name: 'x', lat: 0, lon: 0, category: null, routes: [], ...over,
	});

	test('grupuje po trasie i sortuje po seq', () => {
		const locations = [
			loc({ name: 'B', routes: [{ name: 'r', seq: 2 }] }),
			loc({ name: 'A', routes: [{ name: 'r', seq: 1 }] }),
			loc({ name: 'C', routes: [{ name: 'r', seq: 3 }] }),
		];
		const routes = buildRoutes(locations);
		expect(routes).toHaveLength(1);
		expect(routes[0]!.name).toBe('r');
		expect(routes[0]!.points.map((p) => p.name)).toEqual(['A', 'B', 'C']);
	});

	test('wiele tras, kolejność wg pierwszego wystąpienia', () => {
		const routes = buildRoutes([
			loc({ routes: [{ name: 'druga', seq: 1 }] }),
			loc({ routes: [{ name: 'pierwsza', seq: 1 }] }),
			loc({ routes: [{ name: 'druga', seq: 2 }] }),
		]);
		expect(routes.map((r) => r.name)).toEqual(['druga', 'pierwsza']);
	});

	test('pomija punkty bez tras', () => {
		const routes = buildRoutes([
			loc({ routes: [] }),
			loc({ routes: [{ name: 'r', seq: 1 }] }),
		]);
		expect(routes).toHaveLength(1);
		expect(routes[0]!.points).toHaveLength(1);
	});

	test('jeden punkt trafia do każdej ze swoich tras', () => {
		const routes = buildRoutes([
			loc({ name: 'Start', routes: [{ name: 'day1', seq: 1 }] }),
			loc({ name: 'Węzeł', routes: [{ name: 'day1', seq: 2 }, { name: 'day2', seq: 1 }] }),
			loc({ name: 'Koniec', routes: [{ name: 'day2', seq: 2 }] }),
		]);
		expect(routes.map((r) => r.name)).toEqual(['day1', 'day2']);
		expect(routes[0]!.points.map((p) => p.name)).toEqual(['Start', 'Węzeł']);
		expect(routes[1]!.points.map((p) => p.name)).toEqual(['Węzeł', 'Koniec']);
	});
});
