import { Chart, ChartOptions, Plugin, registerables } from 'chart.js';
import { DailyData, TrainingsChunkConfig } from './types';
import { CategoriesConfig, FALLBACK_PALETTE, makeColorResolver } from '../../shared/parseCategories';
import { renderColorLegend } from '../../shared/colorLegend';
import { aggregateTrainings, aggregateBody, monthBands, MonthBand } from './aggregator';
import { destroyChart, setChartInstance } from '../../shared/chartInstance';
import { createChartCanvas } from '../../shared/chartCanvas';

Chart.register(...registerables);

const METRIC_COLORS: Record<string, string> = {
	kg: '#3498db',
	PBF: '#e67e22',
};

const MONTH_LABEL_HEIGHT = 40;  // px reserved below the plot for the 45°-rotated month/year labels
const DAY_MS = 86_400_000;

const weekMs = (week: string) => Date.parse(week + 'T00:00:00Z');

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

	const canvas = createChartCanvas(el, chunkConfig.height);
	// Precompute once per render; the plugin's beforeDraw runs every frame, so it must stay allocation-free.
	const timestamps = weeks.map(weekMs);
	const first = timestamps[0];
	const last = timestamps[timestamps.length - 1];
	const textColor = getComputedStyle(canvas).color || '#666';
	const chart = new Chart(canvas, {
		type: 'bar',
		data: {
			datasets: categories.map((cat) => ({
				label: cat,
				data: weeks.map((w, i) => ({ x: timestamps[i] as number, y: hoursByWeekCategory[w]?.[cat] || 0 })),
				backgroundColor: color(cat),
				stack: 'stack',
				categoryPercentage: 0.9,
				barPercentage: 0.95,
			})),
		},
		options: {
			responsive: true,
			maintainAspectRatio: false,
			layout: { padding: { bottom: MONTH_LABEL_HEIGHT } },
			scales: {
				x: {
					type: 'linear',
					stacked: true,
					// half a week of padding on each side, so edge bars aren't clipped in half
					min: first !== undefined ? first - DAY_MS * 3.5 : undefined,
					max: last !== undefined ? last + DAY_MS * 3.5 : undefined,
					grid: { display: false },
					ticks: { display: false },
				},
				y: {
					stacked: true,
					beginAtZero: true,
					title: { display: true, text: 'godziny' },
				},
			},
			plugins: {
				legend: { display: false },
				tooltip: {
					callbacks: {
						title: (items) => {
							const ts = items[0]?.parsed.x;
							return ts != null ? formatDate(ts) : '';
						},
						label: (item) => `${item.dataset.label}: ${formatHours(item.parsed.y ?? 0)}`,
					},
				},
			},
		},
		plugins: [monthBandsPlugin(labelBands(monthBands(weeks)), textColor)],
	});

	setChartInstance(el, chart);
}

interface LabelBand {
	startMs: number;
	endMs: number;
	label: string;  // formatted once at render time — never inside beforeDraw
}

function labelBands(bands: MonthBand[]): LabelBand[] {
	return bands.map((b) => ({ startMs: b.startMs, endMs: b.endMs, label: formatMonth(b.key) }));
}

/** Draws alternating background bands per month plus a centered, 45°-rotated month/year label under each. */
function monthBandsPlugin(bands: LabelBand[], textColor: string): Plugin<'bar'> {
	return {
		id: 'cext-month-bands',
		beforeDraw(chart) {
			const x = chart.scales.x;
			const { ctx, chartArea } = chart;
			if (!x || bands.length === 0) return;

			const clamp = (px: number) => Math.max(chartArea.left, Math.min(chartArea.right, px));
			ctx.save();
			ctx.font = '11px sans-serif';
			ctx.textBaseline = 'middle';
			bands.forEach((band, i) => {
				const left = clamp(x.getPixelForValue(band.startMs));
				const right = clamp(x.getPixelForValue(band.endMs));

				if (i % 2 === 1) {
					ctx.fillStyle = 'rgba(128, 128, 128, 0.10)';
					ctx.fillRect(left, chartArea.top, right - left, chartArea.bottom - chartArea.top);
				}

				ctx.save();
				ctx.translate((left + right) / 2, chartArea.bottom + MONTH_LABEL_HEIGHT / 2);
				ctx.rotate(-Math.PI / 4);
				ctx.fillStyle = textColor;
				ctx.textAlign = 'center';
				ctx.fillText(band.label, 0, 0);
				ctx.restore();
			});
			ctx.restore();
		},
	};
}

/** 'YYYY-MM' → e.g. 'sty 2026'. */
function formatMonth(key: string): string {
	const d = new Date(key + '-01T00:00:00Z');
	const month = d.toLocaleDateString('pl-PL', { month: 'short', timeZone: 'UTC' });
	return `${month} ${key.slice(0, 4)}`;
}

/** Decimal hours → 'XXm' below one hour, 'Xh' on the hour, 'Xh XXm' otherwise. */
function formatHours(hours: number): string {
	const total = Math.round(hours * 60);
	const h = Math.floor(total / 60);
	const m = total % 60;
	if (h === 0) return `${m}m`;
	return m === 0 ? `${h}h` : `${h}h ${String(m).padStart(2, '0')}m`;
}

export function renderBodyChart(
	el: HTMLElement,
	dailyData: DailyData[],
	_config: CategoriesConfig,
	chunkConfig: TrainingsChunkConfig
): void {
	destroyChart(el);

	const { dates, series } = aggregateBody(dailyData, chunkConfig.metrics);

	const canvas = createChartCanvas(el, chunkConfig.height);
	const datasets = chunkConfig.metrics.map((m, i) => ({
		label: m,
		data: dates
			.map((date) => ({ x: new Date(date).getTime(), y: series[m]?.get(date) ?? null }))
			.filter((pt): pt is { x: number; y: number } => pt.y !== null),
		borderColor: METRIC_COLORS[m] || FALLBACK_PALETTE[i % FALLBACK_PALETTE.length],
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

	setChartInstance(el, chart);
}

function formatDate(ts: number): string {
	const d = new Date(ts);
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
