import { Chart, registerables } from 'chart.js';
import { MonthData } from './types';
import { CategoriesConfig, ColorResolver, getAllCategories, makeColorResolver } from '../../shared/parseCategories';
import { ChunkConfig } from '../../shared/chunkConfig';
import { destroyChart, setChartInstance } from '../../shared/chartInstance';
import { createChartCanvas } from '../../shared/chartCanvas';
import { renderColorLegend, renderLegendSection } from '../../shared/colorLegend';
import { lightenColor } from '../../shared/colors';
import { renderTabBar } from '../../shared/tabBar';

Chart.register(...registerables);

const FUTURE_LIGHTEN = 0.60;

export type YearSortMode = 'actuals' | 'total';
export type YearChartType = 'bar' | 'pie';

export const SORT_MODE_LABELS: Record<YearSortMode, string> = {
	actuals: 'Aktualne',
	total: 'Aktualne + prognoza',
};

const CHART_TYPE_LABELS: Record<YearChartType, string> = {
	bar: 'Słupki',
	pie: 'Kołowy',
};

export interface YearEntry {
	label: string;
	pastValue: number;
	currentValue: number;
}

// The "Rok" view's two persisted toggles. Field names match FinancesSettings so
// financesChart can pass settings straight through without remapping.
export interface YearViewSettings {
	yearChartType: YearChartType;
	yearSortMode: YearSortMode;
}

export function aggregateYearSummary(
	months: MonthData[],
	config: CategoriesConfig,
	now: Date = new Date(),
	sortBy: YearSortMode = 'total'
): YearEntry[] {
	const allCats = getAllCategories(config);
	const currentMonthId = formatMonthId(now);

	const splitSum = (selector: (m: MonthData) => number) => {
		let pastValue = 0;
		let currentValue = 0;
		for (const m of months) {
			if (m.id < currentMonthId) {
				pastValue += selector(m);
			} else {
				currentValue += selector(m);
			}
		}
		return { pastValue, currentValue };
	};

	const entries: YearEntry[] = [
		{ label: 'savings', ...splitSum((m) => m.savings) },
		...allCats.map((cat) => ({ label: cat, ...splitSum((m) => m.cats[cat] || 0) })),
		{
			label: 'other',
			...splitSum((m) => Math.max(0, m.income - m.taxes - m.savings - m.expenses)),
		},
	];

	return sortEntries(entries, sortBy);
}

function sortEntries(entries: YearEntry[], sortBy: YearSortMode): YearEntry[] {
	const sortKey = (e: YearEntry) => (sortBy === 'actuals' ? e.pastValue : e.pastValue + e.currentValue);
	return entries.sort((a, b) => sortKey(b) - sortKey(a));
}

function formatMonthId(date: Date): string {
	const month = String(date.getMonth() + 1).padStart(2, '0');
	return `${date.getFullYear()}-${month}`;
}

/**
 * The "Rok" view: two side-by-side toggles (chart type + actuals/forecast) over a
 * bar or pie of the same yearly aggregate. The actuals/forecast toggle sorts the
 * bar and flattens the pie (actuals only vs actuals + forecast).
 */
export function renderYearView(
	el: HTMLElement,
	months: MonthData[],
	config: CategoriesConfig,
	chunkConfig: ChunkConfig,
	settings: YearViewSettings,
	onSettingsChange: (changed: Partial<YearViewSettings>) => void
) {
	destroyChart(el);
	el.empty();

	const controls = el.createEl('div');
	controls.classList.add('cext-year-controls');
	renderTabBar(controls, CHART_TYPE_LABELS, settings.yearChartType, (yearChartType) =>
		onSettingsChange({ yearChartType })
	);
	renderTabBar(controls, SORT_MODE_LABELS, settings.yearSortMode, (yearSortMode) =>
		onSettingsChange({ yearSortMode })
	);

	const color = makeColorResolver(config);
	const entries = aggregateYearSummary(months, config, new Date(), settings.yearSortMode);

	const chart =
		settings.yearChartType === 'bar'
			? renderYearBar(el, entries, chunkConfig, color)
			: renderYearPie(el, entries, config, chunkConfig, settings.yearSortMode, color);

	setChartInstance(el, chart);
}

function renderYearBar(el: HTMLElement, entries: YearEntry[], chunkConfig: ChunkConfig, color: ColorResolver): Chart {
	const canvas = createChartCanvas(el, chunkConfig.height);
	return new Chart(canvas, {
		type: 'bar',
		data: {
			labels: entries.map((e) => e.label),
			datasets: [
				{
					label: 'actuals',
					data: entries.map((e) => e.pastValue),
					backgroundColor: entries.map((e) => color(e.label)),
					borderWidth: 1,
					stack: 'stack',
				},
				{
					label: 'forecast',
					data: entries.map((e) => e.currentValue),
					backgroundColor: entries.map((e) => lightenColor(color(e.label), FUTURE_LIGHTEN)),
					borderWidth: 1,
					stack: 'stack',
				},
			],
		},
		options: {
			responsive: true,
			maintainAspectRatio: false,
			indexAxis: 'y',
			scales: {
				x: { beginAtZero: true, stacked: true },
			},
			plugins: {
				legend: { display: false },
			},
		},
	});
}

function renderYearPie(
	el: HTMLElement,
	entries: YearEntry[],
	config: CategoriesConfig,
	chunkConfig: ChunkConfig,
	sortMode: YearSortMode,
	color: ColorResolver
): Chart {
	el.appendChild(renderPieLegend(config, color));
	const canvas = createChartCanvas(el, chunkConfig.height);

	// Each category becomes an actuals slice (base color); in 'total' mode the
	// forecast is a second adjacent slice in a lighter shade, like the bar's split.
	// A pie can't show negatives, so each part is kept only when positive.
	const slices: { label: string; value: number; color: string }[] = [];
	for (const e of entries) {
		const base = color(e.label);
		if (e.pastValue > 0) slices.push({ label: e.label, value: e.pastValue, color: base });
		if (sortMode === 'total' && e.currentValue > 0) {
			slices.push({
				label: `${e.label} (prognoza)`,
				value: e.currentValue,
				color: lightenColor(base, FUTURE_LIGHTEN),
			});
		}
	}
	const total = slices.reduce((sum, s) => sum + s.value, 0);

	return new Chart(canvas, {
		type: 'pie',
		data: {
			labels: slices.map((s) => s.label),
			datasets: [
				{
					data: slices.map((s) => s.value),
					backgroundColor: slices.map((s) => s.color),
					borderWidth: 1,
				},
			],
		},
		options: {
			responsive: true,
			maintainAspectRatio: false,
			plugins: {
				legend: { display: false },
				tooltip: {
					callbacks: {
						label: (item) => {
							const value = item.parsed;
							const pct = total > 0 ? Math.round((value / total) * 100) : 0;
							return ` ${value} (${pct}%)`;
						},
					},
				},
			},
		},
	});
}

function renderPieLegend(config: CategoriesConfig, color: ColorResolver): HTMLElement {
	const container = renderColorLegend(config, color);
	const specials = ['savings', 'other'].map((label) => ({ label, color: color(label) }));
	container.appendChild(renderLegendSection(specials, 'other'));
	return container;
}
