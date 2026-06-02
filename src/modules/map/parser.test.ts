import { describe, expect, test } from 'bun:test';
import { parseLocations } from './parser';
import { CategoriesConfig } from '../../shared/parseCategories';

const emptyConfig: CategoriesConfig = { colorsMap: {}, groupCats: {}, groupOrder: [] };

const input = `
# H1 lokacja [52.1, 21.0]
## H2 lokacja [52.2, 21.0]
### H3 z kategorią [52.3, 21.0, cat: muzea]

### Parki
- bullet dziedziczy [52.4, 21.0]
1. numerowany dziedziczy [52.5, 21.0]
plain dziedziczy [52.6, 21.0]
- bullet override [52.7, 21.0, cat: inne]

bez nagłówka [52.8, 21.0]
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
			{ name: 'bez nagłówka',        lat: 52.8, lon: 21.0, category: 'Parki' },
		]);
	});

	test('zwraca pustą tablicę gdy brak koordynatów', () => {
		expect(parseLocations('zwykły tekst\n- bez nawiasów', emptyConfig)).toEqual([]);
	});

	test('ujemne koordynaty', () => {
		expect(parseLocations('- New York [-40.7128, -74.006]', emptyConfig)).toEqual([
			{ name: 'New York', lat: -40.7128, lon: -74.006, category: null },
		]);
	});
});
