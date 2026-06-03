import { Chart, ChartOptions, registerables } from 'chart.js';
import { DailyData, TrainingsChunkConfig } from './types';
import { CategoriesConfig, makeColorResolver } from '../../shared/parseCategories';
import { renderColorLegend } from '../../shared/colorLegend';
import { aggregateTrainings, aggregateBody } from './aggregator';
import { getElementState, setElementState } from '../../shared/elementState';

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
	chunkConfig: TrainingsChunkConfig
): void {
	destroyChart(el);

	const { weeks, categories, hoursByWeekCategory } = aggregateTrainings(dailyData, config);
	const color = makeColorResolver(config);

	el.appendChild(renderColorLegend(config, color));

	const canvas = makeChartContainer(el, chunkConfig.height);
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

	setElementState(el, '__chartInstance', chart);
}

export function renderBodyChart(
	el: HTMLElement,
	dailyData: DailyData[],
	_config: CategoriesConfig,
	chunkConfig: TrainingsChunkConfig
): void {
	destroyChart(el);

	const { dates, series } = aggregateBody(dailyData, chunkConfig.metrics);

	const canvas = makeChartContainer(el, chunkConfig.height);
	const datasets = chunkConfig.metrics.map((m, i) => ({
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

	const scales: NonNullable<ChartOptions<'line'>['scales']> = {
		x: {
			type: 'linear',
			ticks: {
				callback: (value) => formatDate(Number(value)),
			},
		},
		y: {
			type: 'linear',
			position: 'left',
			title: { display: true, text: chunkConfig.metrics[0] || 'kg' },
		},
	};
	if (chunkConfig.metrics.length > 1) {
		scales.y1 = {
			type: 'linear',
			position: 'right',
			title: { display: true, text: chunkConfig.metrics[1] },
			grid: { drawOnChartArea: false },
		};
	}

	const chart = new Chart(canvas, {
		type: chunkConfig.chartType === 'scatter' ? 'scatter' : 'line',
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

	setElementState(el, '__chartInstance', chart);
}

export function destroyChart(el: HTMLElement): void {
	const chart = getElementState<Chart>(el, '__chartInstance');
	if (chart) {
		chart.destroy();
		setElementState(el, '__chartInstance', undefined);
	}
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
