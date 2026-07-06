import { CategoriesConfig } from '../../shared/parseCategories';
import { MapLocation, MapRoute } from './types';

// Matches the backtick-wrapped `geo: lat, lon` token anywhere in a line, capturing
// the optional tail (sigils or `key: value` pairs) after lon up to the closing backtick.
const GEO_RE = /`geo:\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*([^`]*?)\s*`/;
// Global variant to iterate every geo token in a line (multiple tokens per prose line).
const GEO_RE_G = new RegExp(GEO_RE.source, 'g');
// Strips optional list marker (- or N.) from start of line
const LIST_MARKER_RE = /^\s*(?:-|\d+\.)\s+/;
// A single `key: value` segment from the geo token tail (verbose form)
const TAIL_KV_RE = /^\s*(cat|route):\s*(.+?)\s*$/;
// Sigil forms (space-separated, no spaces inside names): `#category` and `@route`.
// The route sigil is global — a point may carry several `@route#seq` sigils.
const CAT_SIGIL_RE = /(?:^|\s)#(\S+)/;
const ROUTE_SIGIL_RE = /(?:^|\s)@(\S+)/g;
// A route value `name#seq`; the trailing `#<n>` (sequence) is optional
const ROUTE_RE = /^(.+?)\s*#\s*(\d+)\s*$/;
// Emphasis span (**bold**, *italic*, __bold__, _italic_) at the very end of the
// pre-token text — lets geo tokens sit inside prose with just the place name emphasized.
// Bold alternatives come first so `**x**`/`__x__` win over the italic forms.
const EMPHASIS_NAME_RE = /(?:\*\*(.+?)\*\*|\*(.+?)\*|__(.+?)__|_(.+?)_)\s*$/;

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

		// A line may hold several geo tokens; each takes its name from the text
		// between the previous token (or line start) and its own opening backtick.
		const stripped = line.replace(LIST_MARKER_RE, '');
		let lastEnd = 0;
		for (const m of stripped.matchAll(GEO_RE_G)) {
			const start = m.index ?? 0;
			const token = tokenFromMatch(m);
			if (token) {
				const before = stripped.slice(lastEnd, start).trim();
				const name = before && extractName(before);
				if (name) {
					locations.push({ ...token, name, category: token.category ?? currentCategory });
				}
			}
			lastEnd = start + m[0].length;
		}
	}

	return locations;
}

// Groups route memberships into named paths, ordered by seq. A point in several
// routes appears in each. Routes keep first-appearance order.
export function buildRoutes(locations: MapLocation[]): MapRoute[] {
	const byRoute = new Map<string, { loc: MapLocation; seq: number }[]>();
	for (const loc of locations) {
		for (const membership of loc.routes) {
			const entries = byRoute.get(membership.name) ?? [];
			entries.push({ loc, seq: membership.seq });
			byRoute.set(membership.name, entries);
		}
	}

	const routes: MapRoute[] = [];
	for (const [name, entries] of byRoute) {
		entries.sort((a, b) => a.seq - b.seq);
		routes.push({ name, points: entries.map((e) => e.loc) });
	}
	return routes;
}

// If the text directly before the geo token ends with an emphasis span, the name is
// that span's inner text; otherwise the whole preceding text is the name (list form).
function extractName(before: string): string {
	const m = before.match(EMPHASIS_NAME_RE);
	if (!m) return before;
	return (m[1] ?? m[2] ?? m[3] ?? m[4] ?? before).trim();
}

type GeoToken = Omit<MapLocation, 'name'>;

function parseGeo(line: string): GeoToken | null {
	const m = line.match(GEO_RE);
	return m ? tokenFromMatch(m) : null;
}

function tokenFromMatch(m: RegExpMatchArray): GeoToken | null {
	if (!m[1] || !m[2]) return null;

	const token: GeoToken = {
		lat: parseFloat(m[1]),
		lon: parseFloat(m[2]),
		category: null,
		routes: [],
	};

	parseTail(m[3] ?? '', token);
	return token;
}

// Reads the optional token tail, supporting both forms (the two are not expected to
// be mixed in one token). Either form may name several routes for one point:
//   sigils:    `#category @day1#1 @day2#3`             — space-separated, no spaces in names
//   key/value: `, cat: category, route: day1#1, route: day2#3` — comma-separated, names may have spaces
function parseTail(tail: string, token: GeoToken): void {
	for (const m of tail.matchAll(ROUTE_SIGIL_RE)) {
		assignRoute(token, m[1]!);
	}

	const catSigil = tail.match(CAT_SIGIL_RE);
	if (catSigil?.[1]) token.category = catSigil[1];

	for (const segment of tail.split(',')) {
		const kv = segment.match(TAIL_KV_RE);
		if (!kv?.[2]) continue;
		if (kv[1] === 'cat') token.category = kv[2];
		else if (kv[1] === 'route') assignRoute(token, kv[2]);
	}
}

// A route reference must carry a `#<n>` sequence to join the path; one without a
// number can't be ordered and is surfaced nowhere, so we don't store it.
function assignRoute(token: GeoToken, value: string): void {
	const r = value.match(ROUTE_RE);
	if (r?.[1] && r[2]) {
		token.routes.push({ name: r[1].trim(), seq: parseInt(r[2], 10) });
	}
}
