import { Chart, Plugin, registerables } from 'chart.js';
import { MonthData } from './types';
import { CategoriesConfig, ColorResolver, getAllCategories, makeColorResolver } from '../../shared/parseCategories';
import { renderColorLegend, renderLegendSection } from '../../shared/colorLegend';
import { ChunkConfig } from '../../shared/chunkConfig';
import { destroyChart, setChartInstance } from '../../shared/chartInstance';

Chart.register(...registerables);

export function renderMonthlyBudgets(
	el: HTMLElement,
	months: MonthData[],
	config: CategoriesConfig,
	chunkConfig: ChunkConfig
) {
	destroyChart(el);

	const color = makeColorResolver(config);

	const legend = renderLegend(config, color);
	el.appendChild(legend);

	const canvas = el.createEl('canvas');
	const container = el.createEl('div');
	container.classList.add('cext-chart-container');
	container.style.height = `${chunkConfig.height}px`;
	container.appendChild(canvas);

	const labels = months.map((m) => m.label);
	const allCats = getAllCategories(config);

	const datasets = [
		...allCats.map((cat) => ({
			label: cat,
			data: months.map((m) => m.cats[cat] || 0),
			backgroundColor: color(cat),
			borderWidth: 1,
			stack: 'stack',
		})),
		{
			label: 'other',
			data: months.map((m) => Math.max(0, m.income - m.taxes - m.savings - m.expenses)),
			backgroundColor: color('other'),
			borderWidth: 1,
			stack: 'stack',
		},
		{
			label: 'savings',
			data: months.map((m) => Math.max(0, m.savings)),
			backgroundColor: color('savings'),
			borderWidth: 1,
			stack: 'stack',
		},
		{
			label: 'net income',
			type: 'line' as const,
			data: months.map((m) => m.income - m.taxes),
			borderColor: color('net income'),
			backgroundColor: 'transparent',
			borderWidth: 2,
			pointRadius: 4,
			tension: 0.3,
		},
	];

	const newChart = new Chart(canvas, {
		type: 'bar',
		data: { labels, datasets },
		plugins: [createSavingsWithdrawalOverlay(months)],
		options: {
			responsive: true,
			maintainAspectRatio: false,
			indexAxis: 'x',
			scales: {
				y: {
					beginAtZero: true,
					stacked: true,
				},
			},
			plugins: {
				legend: {
					display: false,
				},
			},
		},
	});

	setChartInstance(el, newChart);
}

function createSavingsWithdrawalOverlay(months: MonthData[]): Plugin<'bar'> {
	return {
		id: 'negativeSavings',
		afterDatasetsDraw(chart) {
			const ctx = chart.ctx;
			const xScale = chart.scales.x;
			const yScale = chart.scales.y;
			if (!xScale || !yScale) return;

			months.forEach((monthData, index) => {
				if (monthData.savings >= 0) return;

				const bar = chart.getDatasetMeta(0).data[index] as unknown as { width?: number } | undefined;
				const barWidth = bar?.width ?? 20;
				const netIncome = monthData.income - monthData.taxes;

				const xMin = xScale.getPixelForValue(index) - barWidth / 2;
				const yBottom = yScale.getPixelForValue(netIncome);
				const yTop = yScale.getPixelForValue(netIncome + Math.abs(monthData.savings));

				ctx.save();
				ctx.strokeStyle = '#ff0000';
				ctx.lineWidth = 2;
				ctx.strokeRect(xMin, yTop, barWidth, yBottom - yTop);
				ctx.restore();
			});

			// Box rysuje się nad słupkami, więc przerysuj linię net income na wierzch
			const i = chart.data.datasets.findIndex((d) => d.label === 'net income');
			if (i >= 0) chart.getDatasetMeta(i).controller.draw();
		},
	};
}

function renderLegend(config: CategoriesConfig, color: ColorResolver): HTMLElement {
	const container = renderColorLegend(config, color);
	const specials = ['other', 'savings', 'net income'].map((label) => ({
		label,
		color: color(label),
	}));
	container.appendChild(renderLegendSection(specials, 'other'));
	return container;
}
