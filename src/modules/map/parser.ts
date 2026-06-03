import { CategoriesConfig } from '../../shared/parseCategories';
import { MapLocation, MapRoute } from './types';

// Matches the backtick-wrapped `geo: lat, lon` token anywhere in a line, capturing
// the optional comma-separated tail of `key: value` pairs (cat / route / seq) after lon.
const GEO_RE = /`geo:\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*((?:,[^`]*)?)`/;
// Splits name from the geo token: everything before the opening ` `geo:`
const NAME_RE = /^(.+?)\s+`geo:/;
// Strips optional list marker (- or N.) from start of line
const LIST_MARKER_RE = /^\s*(?:-|\d+\.)\s+/;
// A single `key: value` segment from the geo token tail
const TAIL_KV_RE = /^\s*(cat|route):\s*(.+?)\s*$/;
// A route value `name#seq`; the trailing `#<n>` (sequence) is optional
const ROUTE_RE = /^(.+?)\s*#\s*(\d+)\s*$/;

export function parseLocations(content: string, _config: CategoriesConfig): MapLocation[] {
	const lines = content.split('\n');
	const locations: MapLocation[] = [];
	let currentCategory: string | null = null;

	for (const line of lines) {
		const headingMatch = line.match(/^(#{1,6})\s+(.+?)(?:\s+`geo:|$)/);
		if (headingMatch?.[2]) {
			const name = headingMatch[2].trim();
			currentCategory = name;

			const geo = parseGeo(line);
			if (geo) locations.push({ name, ...geo });
			continue;
		}

		const geo = parseGeo(line);
		if (!geo) continue;

		const stripped = line.replace(LIST_MARKER_RE, '');
		const nameMatch = stripped.match(NAME_RE);
		if (!nameMatch?.[1]) continue;

		locations.push({
			...geo,
			name: nameMatch[1].trim(),
			category: geo.category ?? currentCategory,
		});
	}

	return locations;
}

// Groups routed locations (those with both route and seq) into named paths,
// ordered by seq. Routes keep first-appearance order; non-routed points are ignored.
export function buildRoutes(locations: MapLocation[]): MapRoute[] {
	const byRoute = new Map<string, MapLocation[]>();
	for (const loc of locations) {
		if (loc.route === null || loc.seq === null) continue;
		const points = byRoute.get(loc.route) ?? [];
		points.push(loc);
		byRoute.set(loc.route, points);
	}

	const routes: MapRoute[] = [];
	for (const [name, points] of byRoute) {
		points.sort((a, b) => a.seq! - b.seq!);
		routes.push({ name, points });
	}
	return routes;
}

type GeoToken = Omit<MapLocation, 'name'>;

function parseGeo(line: string): GeoToken | null {
	const m = line.match(GEO_RE);
	if (!m?.[1] || !m[2]) return null;

	const token: GeoToken = {
		lat: parseFloat(m[1]),
		lon: parseFloat(m[2]),
		category: null,
		route: null,
		seq: null,
	};

	for (const segment of (m[3] ?? '').split(',')) {
		const kv = segment.match(TAIL_KV_RE);
		if (!kv?.[2]) continue;
		const value = kv[2];
		if (kv[1] === 'cat') {
			token.category = value;
		} else if (kv[1] === 'route') {
			const r = value.match(ROUTE_RE);
			if (r?.[1] && r[2]) {
				token.route = r[1].trim();
				token.seq = parseInt(r[2], 10);
			} else {
				token.route = value;
			}
		}
	}

	return token;
}
