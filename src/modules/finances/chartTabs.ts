import { MonthData } from './types';
import { renderMonthlyBudgets } from './plotMonth';
import { renderYearSummary } from './plotYear';
import { CategoriesConfig } from '../../shared/parseCategories';
import { ChunkConfig } from '../../shared/chunkConfig';
import { destroyChart } from '../../shared/chartInstance';
import { getElementState, setElementState } from '../../shared/elementState';

type FinancesView = 'monthly' | 'year';

const VIEW_LABELS: Record<FinancesView, string> = {
	monthly: 'Miesiące',
	year: 'Rok',
};

const CONTENT_CLASS = 'cext-finances-content';

export function renderFinancesChart(
	el: HTMLElement,
	months: MonthData[],
	config: CategoriesConfig,
	chunkConfig: ChunkConfig
): void {
	const view = getElementState<FinancesView>(el, '__financeView') ?? 'monthly';
	renderView(el, view, months, config, chunkConfig);
}

export function destroyFinancesChart(el: HTMLElement): void {
	destroyChart(el.querySelector<HTMLElement>(`.${CONTENT_CLASS}`) ?? el);
}

function renderView(
	el: HTMLElement,
	view: FinancesView,
	months: MonthData[],
	config: CategoriesConfig,
	chunkConfig: ChunkConfig
): void {
	destroyFinancesChart(el);
	setElementState(el, '__financeView', view);

	el.empty();
	renderTabs(el, view, (newView) => renderView(el, newView, months, config, chunkConfig));

	const content = el.createEl('div');
	content.classList.add(CONTENT_CLASS);
	if (view === 'monthly') {
		renderMonthlyBudgets(content, months, config, chunkConfig);
	} else {
		renderYearSummary(content, months, config, chunkConfig);
	}
}

function renderTabs(el: HTMLElement, activeView: FinancesView, onSelect: (view: FinancesView) => void): void {
	const tabs = el.createEl('div');
	tabs.classList.add('cext-tabs');

	(Object.keys(VIEW_LABELS) as FinancesView[]).forEach((view) => {
		const tab = tabs.createEl('button');
		tab.textContent = VIEW_LABELS[view];
		tab.classList.add('cext-tab');
		if (view === activeView) tab.classList.add('cext-tab-active');
		tab.addEventListener('click', () => onSelect(view));
	});
}
