import { Chart, registerables } from 'chart.js';
import { MonthData } from './types';
import { CategoriesConfig } from '../../shared/parseCategories';

Chart.register(...registerables);

const fmt = (n: number) => (n ? n.toLocaleString('pl-PL', { minimumFractionDigits: 0 }) : '');

export function renderTable(el: HTMLElement, months: MonthData[], config: CategoriesConfig) {
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

export function renderChart(el: HTMLElement, months: MonthData[], config: CategoriesConfig, height: number = 600) {
	const chartInstance = (el as any).__chartInstance;
	if (chartInstance) {
		chartInstance.destroy();
	}

	const color = (key: string) => config.colorsMap[key] || '#aaaaaa';

	const legend = renderLegend(config);
	el.appendChild(legend);

	const canvas = el.createEl('canvas');
	const container = el.createEl('div');
	container.classList.add('cext-chart-container');
	container.style.height = `${height}px`;
	container.appendChild(canvas);

	const labels = months.map((m) => m.label);

	const datasets = [
		...config.cats.map((cat) => ({
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

function renderLegend(config: CategoriesConfig): HTMLElement {
	const color = (key: string) => config.colorsMap[key] || '#aaaaaa';

	const legendContainer = document.createElement('div');
	legendContainer.classList.add('cext-legend-container');

	for (const group of config.groupOrder) {
		const cats = config.groupCats[group] || [];
		const items = cats.map((cat) => ({ label: cat, color: color(cat) }));
		legendContainer.appendChild(createLegendSection(items, group));
	}

	const otherItems = ['other', 'savings', 'net income'].map((label) => ({
		label,
		color: color(label),
	}));
	legendContainer.appendChild(createLegendSection(otherItems, 'other'));

	return legendContainer;
}

function createLegendItem(label: string, colorValue: string): HTMLElement {
	const item = document.createElement('div');
	item.classList.add('cext-legend-item');

	const box = document.createElement('div');
	box.classList.add('cext-legend-item-box');
	box.style.backgroundColor = colorValue;
	item.appendChild(box);

	const span = document.createElement('span');
	span.textContent = label;
	item.appendChild(span);

	return item;
}

function createLegendSection(items: Array<{ label: string; color: string }>, title: string): HTMLElement {
	const section = document.createElement('div');

	const titleEl = document.createElement('div');
	titleEl.classList.add('cext-legend-section-title');
	titleEl.textContent = title;
	section.appendChild(titleEl);

	for (const item of items) {
		section.appendChild(createLegendItem(item.label, item.color));
	}

	return section;
}
