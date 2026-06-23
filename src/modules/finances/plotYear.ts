import { Chart, registerables } from 'chart.js';
import { MonthData } from './types';
import { CategoriesConfig, getAllCategories, makeColorResolver } from '../../shared/parseCategories';
import { ChunkConfig } from '../../shared/chunkConfig';
import { destroyChart, setChartInstance } from '../../shared/chartInstance';
import { lightenColor } from '../../shared/colors';

Chart.register(...registerables);

const FUTURE_LIGHTEN = 0.45;

export interface YearEntry {
	label: string;
	pastValue: number;
	currentValue: number;
}

export function aggregateYearSummary(
	months: MonthData[],
	config: CategoriesConfig,
	now: Date = new Date()
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

	return [
		{ label: 'savings', ...splitSum((m) => m.savings) },
		...allCats.map((cat) => ({ label: cat, ...splitSum((m) => m.cats[cat] || 0) })),
		{
			label: 'other',
			...splitSum((m) => Math.max(0, m.income - m.taxes - m.savings - m.expenses)),
		},
	].sort((a, b) => b.pastValue + b.currentValue - (a.pastValue + a.currentValue));
}

function formatMonthId(date: Date): string {
	const month = String(date.getMonth() + 1).padStart(2, '0');
	return `${date.getFullYear()}-${month}`;
}

export function renderYearSummary(
	el: HTMLElement,
	months: MonthData[],
	config: CategoriesConfig,
	chunkConfig: ChunkConfig
) {
	destroyChart(el);

	const color = makeColorResolver(config);
	const entries = aggregateYearSummary(months, config);

	const canvas = el.createEl('canvas');
	const container = el.createEl('div');
	container.classList.add('cext-chart-container');
	container.style.height = `${chunkConfig.height}px`;
	container.appendChild(canvas);

	const newChart = new Chart(canvas, {
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

	setChartInstance(el, newChart);
}
