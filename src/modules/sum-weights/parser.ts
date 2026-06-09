// A heading carrying any of these tags opts its list into per-item weight subtotals.
export const WEIGHT_TAGS = ['#sum-weights', '#suma-wag'];

// Matches a weight token like `1660g` / `1660 g` (number directly followed by `g`).
const WEIGHT_RE = /\b(\d+)\s*g(?![a-zA-Z])/g;
const HEADING_RE = /^#{1,6}\s+/;

/** Sums every `<number>g` weight token found in the text. */
export function sumWeights(text: string): number {
	let total = 0;
	for (const match of text.matchAll(WEIGHT_RE)) {
		total += parseInt(match[1] ?? '0', 10);
	}
	return total;
}

export function headingHasWeightTag(headingLine: string): boolean {
	const words = headingLine.split(/\s+/);
	return WEIGHT_TAGS.some((tag) => words.includes(tag));
}

/** Nearest heading line at or above `beforeLine` (exclusive), or null. */
export function findEnclosingHeading(lines: string[], beforeLine: number): string | null {
	for (let i = beforeLine - 1; i >= 0; i--) {
		const line = lines[i];
		if (line !== undefined && HEADING_RE.test(line)) return line;
	}
	return null;
}
