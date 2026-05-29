import { Chart, registerables } from 'chart.js';
import { DailyData, TrainingsConfig } from './types';
import { aggregateTrainings, aggregateBody } from './aggregator';

Chart.register(...registerables);

const FALLBACK_COLORS = [
	'#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6',
	'#1abc9c', '#e67e22', '#e91e63', '#00bcd4', '#8bc34a',
];

const METRIC_COLORS: Record<string, string> = {
	kg: '#3498db',
	PBF: '#e67e22',
};

export function renderTrainingChart(
	el: HTMLElement,
	dailyData: DailyData[],
	config: TrainingsConfig,
	height: number = 300
): void {
	destroyPrev(el);

	const { weeks, categories, hoursByWeekCategory } = aggregateTrainings(dailyData, config);
	const color = makeColorResolver(config.colorsMap);

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
		},
	});

	(el as any).__chartInstance = chart;
}

export function renderBodyChart(
	el: HTMLElement,
	dailyData: DailyData[],
	_config: TrainingsConfig,
	height: number = 300,
	metrics: string[] = ['kg']
): void {
	destroyPrev(el);

	const { dates, series } = aggregateBody(dailyData, metrics);

	const canvas = makeChartContainer(el, height);
	const datasets = metrics.map((m, i) => ({
		label: m,
		data: dates.map((date) => series[m]?.get(date) ?? null),
		borderColor: METRIC_COLORS[m] || FALLBACK_COLORS[i % FALLBACK_COLORS.length],
		backgroundColor: 'transparent',
		borderWidth: 2,
		tension: 0.3,
		spanGaps: true,
		yAxisID: i === 0 ? 'y' : 'y1',
	}));

	const scales: any = {
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
		data: { labels: dates, datasets },
		options: {
			responsive: true,
			maintainAspectRatio: false,
			scales,
		},
	});

	(el as any).__chartInstance = chart;
}

function makeColorResolver(colorsMap: Record<string, string>): (cat: string) => string {
	let fallbackIdx = 0;
	const fallbackAssigned: Record<string, string> = {};
	return (cat: string): string => {
		if (colorsMap[cat]) return colorsMap[cat];
		if (!fallbackAssigned[cat]) {
			fallbackAssigned[cat] = FALLBACK_COLORS[fallbackIdx++ % FALLBACK_COLORS.length] || '#aaaaaa';
		}
		return fallbackAssigned[cat];
	};
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
