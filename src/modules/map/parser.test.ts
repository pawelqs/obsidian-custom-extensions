import { describe, expect, test } from 'bun:test';
import { parseLocations, buildRoutes } from './parser';
import { CategoriesConfig } from '../../shared/parseCategories';
import { MapLocation } from './types';

const emptyConfig: CategoriesConfig = { colorsMap: {}, groupCats: {}, groupOrder: [] };

const input = `
# H1 lokacja \`geo: 52.1, 21.0\`
## H2 lokacja \`geo: 52.2, 21.0\`
### H3 z kategorią \`geo: 52.3, 21.0, cat: muzea\`

### Parki
- bullet dziedziczy \`geo: 52.4, 21.0\`
1. numerowany dziedziczy \`geo: 52.5, 21.0\`
plain dziedziczy \`geo: 52.6, 21.0\`
- bullet override \`geo: 52.7, 21.0, cat: inne\`
- tekst po tokenie \`geo: 52.9, 21.0\` — komentarz po

bez nagłówka \`geo: 52.8, 21.0\`
- ignorowana linia bez koordynatów
- restauracje: #e74c3c

### Trasa
- Start \`geo: 53.1, 21.0, route: wycieczka#1\`
- Środek \`geo: 53.2, 21.0, route: wycieczka#2, cat: muzea\`
- Bez numeru \`geo: 53.3, 21.0, route: trasa\`
`;

describe('parseLocations', () => {
	test('pełna kombinacja formatów', () => {
		expect(parseLocations(input, emptyConfig)).toEqual([
			{ name: 'H1 lokacja',          lat: 52.1, lon: 21.0, category: null,    route: null, seq: null },
			{ name: 'H2 lokacja',          lat: 52.2, lon: 21.0, category: null,    route: null, seq: null },
			{ name: 'H3 z kategorią',      lat: 52.3, lon: 21.0, category: 'muzea', route: null, seq: null },
			{ name: 'bullet dziedziczy',   lat: 52.4, lon: 21.0, category: 'Parki', route: null, seq: null },
			{ name: 'numerowany dziedziczy', lat: 52.5, lon: 21.0, category: 'Parki', route: null, seq: null },
			{ name: 'plain dziedziczy',    lat: 52.6, lon: 21.0, category: 'Parki', route: null, seq: null },
			{ name: 'bullet override',     lat: 52.7, lon: 21.0, category: 'inne',  route: null, seq: null },
			{ name: 'tekst po tokenie',    lat: 52.9, lon: 21.0, category: 'Parki', route: null, seq: null },
			{ name: 'bez nagłówka',        lat: 52.8, lon: 21.0, category: 'Parki', route: null, seq: null },
			{ name: 'Start',               lat: 53.1, lon: 21.0, category: 'Trasa', route: 'wycieczka', seq: 1    },
			{ name: 'Środek',              lat: 53.2, lon: 21.0, category: 'muzea', route: 'wycieczka', seq: 2    },
			{ name: 'Bez numeru',          lat: 53.3, lon: 21.0, category: 'Trasa', route: 'trasa',     seq: null },
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
