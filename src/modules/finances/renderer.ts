import { Chart, registerables } from 'chart.js';
import { MonthData } from './types';
import { CategoriesConfig, ColorResolver, makeColorResolver } from '../../shared/parseCategories';
import { renderColorLegend, renderLegendSection } from '../../shared/colorLegend';
import { ChunkConfig } from '../../shared/chunkConfig';

Chart.register(...registerables);

const fmt = (n: number) => (n ? n.toLocaleString('pl-PL', { minimumFractionDigits: 0 }) : '');

export function renderTable(el: HTMLElement, months: MonthData[], config: CategoriesConfig, _chunkConfig: ChunkConfig) {
	const table = el.createEl('table');
	table.classList.add('cext-table');

	const headers = [
		'Miesiąc',
		'Income',
		'Taxes',
		'Savings',
		'Expenses',
		...config.groupOrder,
		'Bilans',
	];

	const headerRow = table.createEl('tr');
	for (const h of headers) {
		const th = headerRow.createEl('th');
		th.textContent = h;
	}

	for (const month of months) {
		const row = table.createEl('tr');
		const bilans = month.income - month.taxes - month.savings - month.expenses;

		const cells = [
			month.label,
			fmt(month.income),
			fmt(month.taxes),
			fmt(month.savings),
			fmt(month.expenses),
			...config.groupOrder.map((grp) => {
				const sum = (config.groupCats[grp] || []).reduce((s, c) => s + (month.cats[c] || 0), 0);
				return sum > 0 ? fmt(sum) : '';
			}),
			fmt(bilans),
		];

		for (const cell of cells) {
			const td = row.createEl('td');
			td.textContent = cell;
		}
	}

	const totalRow = table.createEl('tr');
	totalRow.classList.add('cext-table-total');
	const totI = months.reduce((s, m) => s + m.income, 0);
	const totT = months.reduce((s, m) => s + m.taxes, 0);
	const totS = months.reduce((s, m) => s + m.savings, 0);
	const totE = months.reduce((s, m) => s + m.expenses, 0);
	const totB = totI - totT - totS - totE;

	const totals = [
		'Rok',
		fmt(totI),
		fmt(totT),
		fmt(totS),
		fmt(totE),
		...config.groupOrder.map((grp) => {
			const sum = months.reduce((s, m) =>
				s + (config.groupCats[grp] || []).reduce((gs, c) => gs + (m.cats[c] || 0), 0),
				0
			);
			return sum > 0 ? fmt(sum) : '';
		}),
		fmt(totB),
	];

	for (const total of totals) {
		const td = totalRow.createEl('td');
		td.textContent = total;
	}
}

export function renderChart(el: HTMLElement, months: MonthData[], config: CategoriesConfig, chunkConfig: ChunkConfig) {
	const chartInstance = (el as any).__chartInstance;
	if (chartInstance) {
		chartInstance.destroy();
	}

	const color = makeColorResolver(config);

	const legend = renderLegend(config, color);
	el.appendChild(legend);

	const canvas = el.createEl('canvas');
	const container = el.createEl('div');
	container.classList.add('cext-chart-container');
	container.style.height = `${chunkConfig.height}px`;
	container.appendChild(canvas);

	const labels = months.map((m) => m.label);
	const allCats = Object.values(config.groupCats).flat();

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
			data: months.map((m) => m.savings),
			backgroundColor: color('savings'),
			borderWidth: 1,
			stack: 'stack',
		},
		{
			label: 'net income',
			type: 'line' as any,
			data: months.map((m) => m.income - m.taxes),
			borderColor: color('net income'),
			backgroundColor: 'transparent',
			borderWidth: 2,
			pointRadius: 4,
			tension: 0.3,
			order: 0,
		},
	];

	const newChart = new Chart(canvas, {
		type: 'bar',
		data: { labels, datasets },
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

	(el as any).__chartInstance = newChart;
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
