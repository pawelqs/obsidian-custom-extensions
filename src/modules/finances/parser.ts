import { MonthData } from './types';
import { CategoriesConfig } from '../../shared/parseCategories';

function parseValue(str: string): number | null {
	str = str.trim();
	if (!str) return null;
	if (/^[\d.]+$/.test(str)) return parseFloat(str);
	return str.split(',').reduce((sum, part) => {
		const nums = part.match(/[\d.]+/g);
		const lastNum = nums?.[nums.length - 1];
		return sum + (lastNum ? parseFloat(lastNum) : 0);
	}, 0);
}

const SPECIAL_GROUP = 'special';

// Categories in the `**special:**` group (`savings`, `net income`, `other`) are
// rendered as their own chart datasets — see renderer.ts. Drop the group from
// `groupCats`/`cats` so they aren't drawn twice; colors are still kept.
export function filterCategories(config: CategoriesConfig): CategoriesConfig {
	const groupOrder = config.groupOrder.filter((g) => g !== SPECIAL_GROUP);
	const groupCats = Object.fromEntries(groupOrder.map((g) => [g, config.groupCats[g] || []]));
	const cats = groupOrder.flatMap((g) => groupCats[g] || []);
	return { colorsMap: config.colorsMap, groupCats, groupOrder, cats };
}

export function parseMonths(content: string, config: CategoriesConfig): MonthData[] {
	const lines = content.split('\n');
	const months: MonthData[] = [];
	let current: MonthData | null = null;                                     // Aktualnie parsowany miesiąc
	let section: 'income' | 'taxes' | 'savings' | 'expenses' | null = null;  // Aktualnie czytana sekcja
	let subCat: string | null = null;                                        // Kategoria dla sub-itemów (expenses)
	let itemIndent = 0;                                                      // Indentacja pierwszego itemu w sekcji
	let subIndent = 0;                                                       // Indentacja sub-itemów (itemIndent + 4)

	for (const rawLine of lines) {
		const line = rawLine.replace(/\t/g, '    ');  // Tabs → 4 spaces

		// Przerwij parsowanie na sekcji Categories
		if (line.startsWith('## Categories')) {
			break;
		}

		// ETAP 1: Szukaj nowego miesiąca (### 2026-03)
		const monthMatch = line.match(/^### (\d{4}-\d{2})/);
		if (monthMatch && monthMatch[1]) {
			// Stwórz nowy MonthData ze wszystkimi kategoriami = 0
			const cats = config.cats.reduce(
				(acc, c) => {
					acc[c] = 0;
					return acc;
				},
				{} as Record<string, number>
			);
			current = {
				id: monthMatch[1],
				label: monthMatch[1],
				income: 0,
				taxes: 0,
				savings: 0,
				expenses: 0,
				cats,
			};
			months.push(current);
			// Resetuj stan dla nowego miesiąca
			section = null;
			subCat = null;
			itemIndent = 0;
			subIndent = 0;
			continue;
		}

		// Pomiń jeśli nie ma aktualnego miesiąca
		if (!current) continue;

		// ETAP 2: Szukaj sekcji (- income:, - expenses:, etc.)
		const sectionMatch = line.match(/^-\s+(income|taxes|savings|expenses):\s*(.*)/);
		if (sectionMatch && sectionMatch[1]) {
			section = sectionMatch[1] as 'income' | 'taxes' | 'savings' | 'expenses';
			subCat = null;
			itemIndent = 0;
			subIndent = 0;
			// Jeśli wartość inline (- income: 1000), dodaj od razu
			const inlineVal = parseValue(sectionMatch[2] || '');
			if (inlineVal) {
				current[section] += inlineVal;
				section = null;  // Koniec sekcji, jeśli wartość inline
			}
			continue;
		}

		// Pomiń jeśli nie jesteśmy w żadnej sekcji
		if (!section) continue;

		// ETAP 3: Detektuj indentację pierwszego itemu
		const leadingMatch = line.match(/^(\s*)/);
		const leadingSpaces = leadingMatch?.[1]?.length ?? 0;
		if (leadingSpaces === 0) continue;  // Pomiń linie bez indentacji

		// Gdy pierwszy indentowany item, ustaw itemIndent
		if (itemIndent === 0) {
			itemIndent = leadingSpaces;
			subIndent = leadingSpaces + 4;  // Sub-itemy są 4 spacje głębiej
		}

		// ETAP 4A: Parsuj sub-itemy (tylko dla expenses)
		// Przykład: - transport:
		//             - bilety: 30   ← To jest subItem
		const subMatch = line.match(new RegExp(`^\\s{${subIndent},}-\\s+(.+)`));
		if (subMatch?.[1] && subCat && section === 'expenses') {
			// subCat ustawiony → wiemy do której kategorii dodać
			const amount = parseValue(subMatch[1]) ?? 0;
			current.expenses += amount;
			current.cats[subCat] = (current.cats[subCat] || 0) + amount;
			continue;
		}

		// ETAP 4B: Parsuj główne itemy (- nazwa: wartość)
		const itemMatch = line.match(
			new RegExp(`^\\s{${itemIndent}}-\\s+(.+?):\\s*(.*)`)
		);
		if (itemMatch?.[1] && section) {
			const label = itemMatch[1].trim();
			const parsed = parseValue(itemMatch[2] || '');

			// Jeśli brak wartości (null), może to być kategoria dla sub-itemów
			subCat = parsed === null ? (config.cats.includes(label) ? label : 'inne') : null;

			if (parsed !== null) {
				if (section === 'expenses') {
					// Expenses: dodaj do sumy i do konkretnej kategorii
					current.expenses += parsed;
					const catName = config.cats.includes(label) ? label : 'inne';
					current.cats[catName] = (current.cats[catName] || 0) + parsed;
				} else {
					// Income/taxes/savings: dodaj do sumy sekcji
					current[section] += parsed;
				}
			}
		}
	}

	// Sortuj miesiące po ID (żeby były chronologicznie)
	months.sort((a, b) => a.id.localeCompare(b.id));

	return months;
}
