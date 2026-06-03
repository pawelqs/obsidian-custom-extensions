import { describe, expect, test } from 'bun:test';
import { parseLocations } from './parser';
import { CategoriesConfig } from '../../shared/parseCategories';

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
`;

describe('parseLocations', () => {
	test('pełna kombinacja formatów', () => {
		expect(parseLocations(input, emptyConfig)).toEqual([
			{ name: 'H1 lokacja',          lat: 52.1, lon: 21.0, category: null    },
			{ name: 'H2 lokacja',          lat: 52.2, lon: 21.0, category: null    },
			{ name: 'H3 z kategorią',      lat: 52.3, lon: 21.0, category: 'muzea' },
			{ name: 'bullet dziedziczy',   lat: 52.4, lon: 21.0, category: 'Parki' },
			{ name: 'numerowany dziedziczy', lat: 52.5, lon: 21.0, category: 'Parki' },
			{ name: 'plain dziedziczy',    lat: 52.6, lon: 21.0, category: 'Parki' },
			{ name: 'bullet override',     lat: 52.7, lon: 21.0, category: 'inne'  },
			{ name: 'tekst po tokenie',    lat: 52.9, lon: 21.0, category: 'Parki' },
			{ name: 'bez nagłówka',        lat: 52.8, lon: 21.0, category: 'Parki' },
		]);
	});

	test('kategoria ze spacją', () => {
		expect(parseLocations('- Rynek `geo: 50.06, 19.94, cat: stare miasto`', emptyConfig)).toEqual([
			{ name: 'Rynek', lat: 50.06, lon: 19.94, category: 'stare miasto' },
		]);
	});

	test('zwraca pustą tablicę gdy brak koordynatów', () => {
		expect(parseLocations('zwykły tekst\n- bez geo', emptyConfig)).toEqual([]);
	});

	test('ujemne koordynaty', () => {
		expect(parseLocations('- New York `geo: -40.7128, -74.006`', emptyConfig)).toEqual([
			{ name: 'New York', lat: -40.7128, lon: -74.006, category: null },
		]);
	});
});
