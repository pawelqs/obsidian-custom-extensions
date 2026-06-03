import { CategoriesConfig } from '../../shared/parseCategories';
import { MapLocation, MapRoute } from './types';

// Matches the backtick-wrapped `geo: lat, lon` token anywhere in a line, capturing
// the optional tail (sigils or `key: value` pairs) after lon up to the closing backtick.
const GEO_RE = /`geo:\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*([^`]*?)\s*`/;
// Splits name from the geo token: everything before the opening ` `geo:`
const NAME_RE = /^(.+?)\s+`geo:/;
// Strips optional list marker (- or N.) from start of line
const LIST_MARKER_RE = /^\s*(?:-|\d+\.)\s+/;
// A single `key: value` segment from the geo token tail (verbose form)
const TAIL_KV_RE = /^\s*(cat|route):\s*(.+?)\s*$/;
// Sigil forms (space-separated, no spaces inside names): `#category` and `@route`
const CAT_SIGIL_RE = /(?:^|\s)#(\S+)/;
const ROUTE_SIGIL_RE = /(?:^|\s)@(\S+)/;
// A route value `name#seq`; the trailing `#<n>` (sequence) is optional
const ROUTE_RE = /^(.+?)\s*#\s*(\d+)\s*$/;

export function parseLocations(
	content: string,
	_config: CategoriesConfig,
	options: { implicitCategories?: boolean } = {}
): MapLocation[] {
	const implicitCategories = options.implicitCategories ?? true;
	const lines = content.split('\n');
	const locations: MapLocation[] = [];
	let currentCategory: string | null = null;

	for (const line of lines) {
		const headingMatch = line.match(/^(#{1,6})\s+(.+?)(?:\s+`geo:|$)/);
		if (headingMatch?.[2]) {
			const name = headingMatch[2].trim();
			// Without implicit categories, headings no longer seed the inherited category.
			currentCategory = implicitCategories ? name : null;

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

	parseTail(m[3] ?? '', token);
	return token;
}

// Reads the optional token tail, supporting both forms (sigils take precedence
// only when present; the two are not expected to be mixed in one token):
//   sigils:    `#category @route#seq`            — space-separated, no spaces in names
//   key/value: `, cat: category, route: name#seq` — comma-separated, names may have spaces
function parseTail(tail: string, token: GeoToken): void {
	const routeSigil = tail.match(ROUTE_SIGIL_RE);
	if (routeSigil?.[1]) assignRoute(token, routeSigil[1]);

	const catSigil = tail.match(CAT_SIGIL_RE);
	if (catSigil?.[1]) token.category = catSigil[1];

	for (const segment of tail.split(',')) {
		const kv = segment.match(TAIL_KV_RE);
		if (!kv?.[2]) continue;
		if (kv[1] === 'cat') token.category = kv[2];
		else if (kv[1] === 'route') assignRoute(token, kv[2]);
	}
}

function assignRoute(token: GeoToken, value: string): void {
	const r = value.match(ROUTE_RE);
	if (r?.[1] && r[2]) {
		token.route = r[1].trim();
		token.seq = parseInt(r[2], 10);
	} else {
		token.route = value.trim();
	}
}
