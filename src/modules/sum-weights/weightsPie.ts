import { App, Modal } from 'obsidian';
import { Chart, registerables } from 'chart.js';
import { FALLBACK_PALETTE } from '../../shared/parseCategories';
import { renderColorLegend } from '../../shared/colorLegend';
import { findTopUl, itemOwnText, ownCodeWeights } from './renderer';

Chart.register(...registerables);

interface WeightSlice {
	label: string;
	grams: number;
}

interface CategoryWeights {
	category: string;
	total: number;
	items: WeightSlice[];
}

/** Pie of every weighted item in the section's list, colored by top-level category. */
export function openWeightsPie(app: App, title: string, sectionEl: HTMLElement): void {
	const topUl = findTopUl(sectionEl);
	const categories = topUl ? collectCategoryWeights(topUl) : [];
	if (categories.length > 0) new WeightsPieModal(app, title, categories).open();
}

// One category per first-level item; its slices are every <li> in the subtree (the
// first-level item included) that carries its own weight. Own weights never overlap,
// so the slices sum to the section's grand total. Categories heaviest-first, items
// heaviest-first within each.
function collectCategoryWeights(topUl: HTMLElement): CategoryWeights[] {
	const categories: CategoryWeights[] = [];
	for (const li of Array.from(topUl.children)) {
		if (!(li instanceof HTMLElement) || li.tagName !== 'LI') continue;

		const items: WeightSlice[] = [];
		for (const itemLi of [li, ...Array.from(li.querySelectorAll('li'))]) {
			const grams = ownCodeWeights(itemLi);
			if (grams > 0) items.push({ label: itemOwnText(itemLi), grams });
		}
		if (items.length === 0) continue;

		items.sort((a, b) => b.grams - a.grams);
		const total = items.reduce((sum, item) => sum + item.grams, 0);
		categories.push({ category: itemOwnText(li), total, items });
	}
	return categories.sort((a, b) => b.total - a.total);
}

class WeightsPieModal extends Modal {
	private chart: Chart | undefined;

	constructor(app: App, private title: string, private categories: CategoryWeights[]) {
		super(app);
	}

	onOpen(): void {
		this.titleEl.setText(this.title || '');

		const categoryColors: Record<string, string> = {};
		this.categories.forEach((cat, i) => {
			categoryColors[cat.category] = FALLBACK_PALETTE[i % FALLBACK_PALETTE.length] || '#aaaaaa';
		});

		const body = this.contentEl.createEl('div');
		body.classList.add('cext-weights-modal-body');
		const container = body.createEl('div');
		container.classList.add('cext-weights-modal-chart');
		const canvas = container.createEl('canvas');
		// Grouped mode renders the legend as a titled column (flat mode would wrap horizontally).
		body.appendChild(
			renderColorLegend({
				colorsMap: categoryColors,
				groupCats: { Categories: Object.keys(categoryColors) },
				groupOrder: ['Categories'],
			})
		);

		const slices = this.categories.flatMap((cat) =>
			cat.items.map((item, j) => ({
				label: item.label,
				grams: item.grams,
				color: lighten(categoryColors[cat.category] ?? '#aaaaaa', Math.min(0.6, j * 0.15)),
			}))
		);
		const total = slices.reduce((sum, slice) => sum + slice.grams, 0);

		this.chart = new Chart(canvas, {
			type: 'pie',
			data: {
				labels: slices.map((slice) => slice.label),
				datasets: [{
					data: slices.map((slice) => slice.grams),
					backgroundColor: slices.map((slice) => slice.color),
				}],
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
				plugins: {
					legend: { display: false },
					tooltip: {
						callbacks: {
							label: (item) => {
								const grams = item.parsed;
								const pct = total > 0 ? Math.round((grams / total) * 100) : 0;
								return ` ${grams}g (${pct}%)`;
							},
						},
					},
				},
			},
		});
	}

	onClose(): void {
		this.chart?.destroy();
		this.chart = undefined;
		this.contentEl.empty();
	}
}

// Mixes the hex color towards white; factor 0 = unchanged, 1 = white.
function lighten(hex: string, factor: number): string {
	const n = parseInt(hex.slice(1), 16);
	const mix = (c: number) => Math.round(c + (255 - c) * factor);
	return `rgb(${mix((n >> 16) & 0xff)}, ${mix((n >> 8) & 0xff)}, ${mix(n & 0xff)})`;
}
