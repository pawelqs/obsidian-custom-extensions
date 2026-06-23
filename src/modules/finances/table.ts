import { MonthData } from './types';
import { CategoriesConfig } from '../../shared/parseCategories';
import { ChunkConfig } from '../../shared/chunkConfig';

const fmt = (n: number) => (n ? n.toLocaleString('pl-PL', { minimumFractionDigits: 0 }) : '');

export function renderTable(
	el: HTMLElement,
	months: MonthData[],
	config: CategoriesConfig,
	_chunkConfig: ChunkConfig
) {
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
