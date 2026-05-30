export interface CategoriesConfig {
	colorsMap: Record<string, string>;
	groupCats: Record<string, string[]>;
	groupOrder: string[];
	cats: string[];
}

type ParseOptions = {
	headings?: string[];
};

const DEFAULT_HEADINGS = ['Categories', 'Kategorie'];

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

	const cats = groupOrder.flatMap((g) => groupCats[g] || []);

	return { colorsMap, groupCats, groupOrder, cats };
}
