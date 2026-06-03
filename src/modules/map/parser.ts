import { CategoriesConfig } from '../../shared/parseCategories';
import { MapLocation } from './types';

// Matches the backtick-wrapped `geo: lat, lon` or `geo: lat, lon, cat: category` token
// anywhere in a line; prose may follow the closing backtick.
const GEO_RE = /`geo:\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)(?:\s*,\s*cat:\s*([^`]+?))?\s*`/;
// Splits name from the geo token: everything before the opening ` `geo:`
const NAME_RE = /^(.+?)\s+`geo:/;
// Strips optional list marker (- or N.) from start of line
const LIST_MARKER_RE = /^\s*(?:-|\d+\.)\s+/;

export function parseLocations(content: string, _config: CategoriesConfig): MapLocation[] {
	const lines = content.split('\n');
	const locations: MapLocation[] = [];
	let currentCategory: string | null = null;

	for (const line of lines) {
		const headingMatch = line.match(/^(#{1,6})\s+(.+?)(?:\s+`geo:|$)/);
		if (headingMatch?.[2]) {
			const name = headingMatch[2].trim();
			currentCategory = name;

			const geoMatch = line.match(GEO_RE);
			if (geoMatch?.[1] && geoMatch[2]) {
				locations.push({
					name,
					lat: parseFloat(geoMatch[1]),
					lon: parseFloat(geoMatch[2]),
					category: geoMatch[3]?.trim() ?? null,
				});
			}
			continue;
		}

		const geoMatch = line.match(GEO_RE);
		if (!geoMatch?.[1] || !geoMatch[2]) continue;

		const stripped = line.replace(LIST_MARKER_RE, '');
		const nameMatch = stripped.match(NAME_RE);
		if (!nameMatch?.[1]) continue;

		locations.push({
			name: nameMatch[1].trim(),
			lat: parseFloat(geoMatch[1]),
			lon: parseFloat(geoMatch[2]),
			category: geoMatch[3]?.trim() ?? currentCategory,
		});
	}

	return locations;
}
