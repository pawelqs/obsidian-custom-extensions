export interface CategoriesConfig {
	colorsMap: Record<string, string>;
	groupCats: Record<string, string[]>;
	groupOrder: string[];
}

type ParseOptions = {
	headings?: string[];
};

const DEFAULT_HEADINGS = ['Categories', 'Kategorie'];

export const FALLBACK_PALETTE = [
	'#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6',
	'#1abc9c', '#e67e22', '#e91e63', '#00bcd4', '#8bc34a',
];

export type ColorResolver = (key: string) => string;

export function parseCategories(content: string, options?: ParseOptions): CategoriesConfig {
	const headings = options?.headings ?? DEFAULT_HEADINGS;

	const lines = content.split('\n');
	const colorsMap: Record<string, string> = {};
	const groupCats: Record<string, string[]> = {};
	const groupOrder: string[] = [];
	let inSection = false;
	let inFence = false;
	let currentGroup: string | null = null;

	for (const line of lines) {
		if (!inSection) {
			const headingMatch = line.match(/^##\s+(.+)$/);
			if (headingMatch?.[1] && headings.includes(headingMatch[1].trim())) {
				inSection = true;
			}
			continue;
		}

		if (line.match(/^##\s/)) break;

		if (line.trim() === '```') {
			inFence = !inFence;
			continue;
		}

		if (!inFence && !line.trim()) continue;

		const groupMatch = line.match(/^\*\*(.+?):\*\*/);
		if (groupMatch?.[1]) {
			currentGroup = groupMatch[1].trim();
			if (!groupCats[currentGroup]) {
				groupCats[currentGroup] = [];
				groupOrder.push(currentGroup);
			}
			continue;
		}

		const catMatch = line.match(/^-\s+(.+?)(?::\s*(.+))?$/);
		if (catMatch?.[1]) {
			const cat = catMatch[1].trim();
			if (catMatch[2]) {
				colorsMap[cat] = catMatch[2].trim();
			}
			if (currentGroup) {
				const group = groupCats[currentGroup];
				if (group && !group.includes(cat)) {
					group.push(cat);
				}
			}
		}
	}

	return { colorsMap, groupCats, groupOrder };
}

export function makeColorResolver(config: CategoriesConfig): ColorResolver {
	let idx = 0;
	const assigned: Record<string, string> = {};
	return (key) => {
		const known = config.colorsMap[key];
		if (known) return known;
		if (!assigned[key]) {
			assigned[key] = FALLBACK_PALETTE[idx++ % FALLBACK_PALETTE.length] || '#aaaaaa';
		}
		return assigned[key];
	};
}
