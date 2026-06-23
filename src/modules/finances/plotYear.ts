import { Chart, registerables } from 'chart.js';
import { MonthData } from './types';
import { CategoriesConfig, getAllCategories, makeColorResolver } from '../../shared/parseCategories';
import { ChunkConfig } from '../../shared/chunkConfig';
import { destroyChart, setChartInstance } from '../../shared/chartInstance';

Chart.register(...registerables);

export interface YearEntry {
	label: string;
	value: number;
}

export function aggregateYearSummary(months: MonthData[], config: CategoriesConfig): YearEntry[] {
	const allCats = getAllCategories(config);

	return [
		{ label: 'savings', value: months.reduce((s, m) => s + m.savings, 0) },
		...allCats.map((cat) => ({
			label: cat,
			value: months.reduce((s, m) => s + (m.cats[cat] || 0), 0),
		})),
		{
			label: 'other',
			value: months.reduce((s, m) => s + Math.max(0, m.income - m.taxes - m.savings - m.expenses), 0),
		},
	].sort((a, b) => b.value - a.value);
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
					data: entries.map((e) => e.value),
					backgroundColor: entries.map((e) => color(e.label)),
					borderWidth: 1,
				},
			],
		},
		options: {
			responsive: true,
			maintainAspectRatio: false,
			indexAxis: 'y',
			scales: {
				x: { beginAtZero: true },
			},
			plugins: {
				legend: { display: false },
			},
		},
	});

	setChartInstance(el, newChart);
}
