import { CategoriesConfig } from '../../shared/parseCategories';
import { MapLocation } from './types';

// Matches [lat, lon] or [lat, lon, cat: category] at end of line
const COORDS_RE = /\[(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)(?:,\s*cat:\s*(.+?))?\]\s*$/;
// Strips optional list marker (- or N.) from start of line
const LIST_MARKER_RE = /^\s*(?:-|\d+\.)\s+/;

export function parseLocations(content: string, _config: CategoriesConfig): MapLocation[] {
	const lines = content.split('\n');
	const locations: MapLocation[] = [];
	let currentCategory: string | null = null;

	for (const line of lines) {
		const headingMatch = line.match(/^(#{1,6})\s+(.+?)(?:\s+\[|$)/);
		if (headingMatch?.[2]) {
			const name = headingMatch[2].trim();
			currentCategory = name;

			const coordsMatch = line.match(COORDS_RE);
			if (coordsMatch?.[1] && coordsMatch[2]) {
				locations.push({
					name,
					lat: parseFloat(coordsMatch[1]),
					lon: parseFloat(coordsMatch[2]),
					category: coordsMatch[3]?.trim() ?? null,
				});
			}
			continue;
		}

		const coordsMatch = line.match(COORDS_RE);
		if (!coordsMatch?.[1] || !coordsMatch[2]) continue;

		const stripped = line.replace(LIST_MARKER_RE, '');
		const nameMatch = stripped.match(/^(.+?)\s+\[/);
		if (!nameMatch?.[1]) continue;

		locations.push({
			name: nameMatch[1].trim(),
			lat: parseFloat(coordsMatch[1]),
			lon: parseFloat(coordsMatch[2]),
			category: coordsMatch[3]?.trim() ?? currentCategory,
		});
	}

	return locations;
}
