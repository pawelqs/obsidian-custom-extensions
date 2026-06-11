import { App, Modal } from 'obsidian';
import { Chart, registerables } from 'chart.js';
import { FALLBACK_PALETTE } from '../../shared/parseCategories';
import { findTopUl, itemOwnText, sumCodeWeights } from './renderer';

Chart.register(...registerables);

interface WeightSlice {
	label: string;
	grams: number;
}

/** Collects the first-level subtotals from the section's list and shows them as a pie chart. */
export function openWeightsPie(app: App, title: string, sectionEl: HTMLElement): void {
	const topUl = findTopUl(sectionEl);
	const slices = topUl ? collectItemWeights(topUl) : [];
	if (slices.length > 0) new WeightsPieModal(app, title, slices).open();
}

// One slice per first-level item, same sums as the badges (cancelled subtrees excluded,
// zero-weight items dropped), heaviest first.
function collectItemWeights(topUl: HTMLElement): WeightSlice[] {
	const slices: WeightSlice[] = [];
	for (const li of Array.from(topUl.children)) {
		if (!(li instanceof HTMLElement) || li.tagName !== 'LI') continue;
		const grams = sumCodeWeights(li);
		if (grams <= 0) continue;
		slices.push({ label: itemOwnText(li), grams });
	}
	return slices.sort((a, b) => b.grams - a.grams);
}

class WeightsPieModal extends Modal {
	private chart: Chart | undefined;

	constructor(app: App, private title: string, private slices: WeightSlice[]) {
		super(app);
	}

	onOpen(): void {
		this.titleEl.setText(this.title || '');

		const container = this.contentEl.createEl('div');
		container.classList.add('cext-weights-modal-chart');
		const canvas = container.createEl('canvas');

		const total = this.slices.reduce((sum, slice) => sum + slice.grams, 0);
		this.chart = new Chart(canvas, {
			type: 'pie',
			data: {
				labels: this.slices.map((slice) => slice.label),
				datasets: [{
					data: this.slices.map((slice) => slice.grams),
					backgroundColor: this.slices.map(
						(_, i) => FALLBACK_PALETTE[i % FALLBACK_PALETTE.length] || '#aaaaaa'
					),
				}],
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
				plugins: {
					legend: { position: 'right' },
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
