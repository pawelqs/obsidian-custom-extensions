import { Chart, registerables } from 'chart.js';
import { DailyData } from './types';
import { CategoriesConfig, makeColorResolver } from '../../shared/parseCategories';
import { renderColorLegend } from '../../shared/colorLegend';
import { aggregateTrainings, aggregateBody } from './aggregator';

Chart.register(...registerables);

const METRIC_COLORS: Record<string, string> = {
	kg: '#3498db',
	PBF: '#e67e22',
};

const METRIC_FALLBACK_COLORS = [
	'#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6',
	'#1abc9c', '#e67e22', '#e91e63', '#00bcd4', '#8bc34a',
];

export function renderTrainingChart(
	el: HTMLElement,
	dailyData: DailyData[],
	config: CategoriesConfig,
	height: number = 300
): void {
	destroyPrev(el);

	const { weeks, categories, hoursByWeekCategory } = aggregateTrainings(dailyData, config);
	const color = makeColorResolver(config);

	el.appendChild(renderColorLegend(config, color));

	const canvas = makeChartContainer(el, height);
	const chart = new Chart(canvas, {
		type: 'bar',
		data: {
			labels: weeks,
			datasets: categories.map((cat) => ({
				label: cat,
				data: weeks.map((w) => hoursByWeekCategory[w]?.[cat] || 0),
				backgroundColor: color(cat),
				stack: 'stack',
			})),
		},
		options: {
			responsive: true,
			maintainAspectRatio: false,
			scales: {
				x: { stacked: true },
				y: {
					stacked: true,
					beginAtZero: true,
					title: { display: true, text: 'godziny' },
				},
			},
			plugins: {
				legend: { display: false },
			},
		},
	});

	(el as any).__chartInstance = chart;
}

export function renderBodyChart(
	el: HTMLElement,
	dailyData: DailyData[],
	_config: CategoriesConfig,
	height: number = 300,
	metrics: string[] = ['kg']
): void {
	destroyPrev(el);

	const { dates, series } = aggregateBody(dailyData, metrics);

	const canvas = makeChartContainer(el, height);
	const datasets = metrics.map((m, i) => ({
		label: m,
		data: dates
			.map((date) => ({ x: new Date(date).getTime(), y: series[m]?.get(date) ?? null }))
			.filter((pt): pt is { x: number; y: number } => pt.y !== null),
		borderColor: METRIC_COLORS[m] || METRIC_FALLBACK_COLORS[i % METRIC_FALLBACK_COLORS.length],
		backgroundColor: 'transparent',
		borderWidth: 2,
		tension: 0.3,
		yAxisID: i === 0 ? 'y' : 'y1',
	}));

	const scales: any = {
		x: {
			type: 'linear',
			ticks: {
				callback: (value: number) => formatDate(value),
			},
		},
		y: {
			type: 'linear',
			position: 'left',
			title: { display: true, text: metrics[0] || 'kg' },
		},
	};
	if (metrics.length > 1) {
		scales.y1 = {
			type: 'linear',
			position: 'right',
			title: { display: true, text: metrics[1] },
			grid: { drawOnChartArea: false },
		};
	}

	const chart = new Chart(canvas, {
		type: 'line',
		data: { datasets },
		options: {
			responsive: true,
			maintainAspectRatio: false,
			scales,
			plugins: {
				tooltip: {
					callbacks: {
						title: (items) => {
							const ts = items[0]?.parsed.x;
							return ts != null ? formatDate(ts) : '';
						},
					},
				},
			},
		},
	});

	(el as any).__chartInstance = chart;
}

function formatDate(ts: number): string {
	const d = new Date(ts);
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function makeChartContainer(el: HTMLElement, height: number): HTMLCanvasElement {
	const container = el.createEl('div');
	container.classList.add('cext-chart-container');
	container.style.height = `${height}px`;
	return container.createEl('canvas');
}

function destroyPrev(el: HTMLElement): void {
	const prev = (el as any).__chartInstance;
	if (prev) prev.destroy();
}
