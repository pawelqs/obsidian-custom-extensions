import { Plugin } from 'obsidian';
import { MonthData } from './types';
import { renderMonthlyBudgets } from './plotMonth';
import { renderYearView } from './plotYear';
import { CategoriesConfig } from '../../shared/parseCategories';
import { ChunkConfig } from '../../shared/chunkConfig';
import { destroyChart } from '../../shared/chartInstance';
import { getElementState, setElementState } from '../../shared/elementState';
import { renderTabBar } from '../../shared/tabBar';
import { FinancesSettings, loadFinancesSettings, saveFinancesSettings } from './settings';

type ChartRenderer = (
	el: HTMLElement,
	months: MonthData[],
	config: CategoriesConfig,
	chunkConfig: ChunkConfig
) => void;

type FinancesView = 'monthly' | 'year';

const VIEW_LABELS: Record<FinancesView, string> = {
	monthly: 'Miesiące',
	year: 'Rok',
};

const CONTENT_CLASS = 'cext-finances-content';

/**
 * Builds the code-block renderer: loads persisted settings once (cached so
 * repaints stay synchronous) and re-renders in place when the chart writes one.
 */
export function createFinancesChartRenderer(plugin: Plugin): ChartRenderer {
	let cached: FinancesSettings | undefined;

	return (el, months, config, chunkConfig) => {
		const paint = (settings: FinancesSettings) => {
			renderChart(el, months, config, chunkConfig, settings, (changed) => {
				cached = { ...(cached ?? settings), ...changed };
				void saveFinancesSettings(plugin, changed);
				paint(cached);
			});
		};

		if (cached) {
			paint(cached);
		} else {
			void loadFinancesSettings(plugin).then((settings) => {
				cached = settings;
				paint(settings);
			});
		}
	};
}

export function destroyFinancesChart(el: HTMLElement): void {
	destroyChart(el.querySelector<HTMLElement>(`.${CONTENT_CLASS}`) ?? el);
}

function renderChart(
	el: HTMLElement,
	months: MonthData[],
	config: CategoriesConfig,
	chunkConfig: ChunkConfig,
	settings: FinancesSettings,
	onSettingsChange: (settings: Partial<FinancesSettings>) => void
): void {
	const view = getElementState<FinancesView>(el, '__financeView') ?? 'monthly';
	renderView(el, view, months, config, chunkConfig, settings, onSettingsChange);
}

function renderView(
	el: HTMLElement,
	view: FinancesView,
	months: MonthData[],
	config: CategoriesConfig,
	chunkConfig: ChunkConfig,
	settings: FinancesSettings,
	onSettingsChange: (settings: Partial<FinancesSettings>) => void
): void {
	destroyFinancesChart(el);
	setElementState(el, '__financeView', view);

	el.empty();
	renderTabBar(el, VIEW_LABELS, view, (newView) =>
		renderView(el, newView, months, config, chunkConfig, settings, onSettingsChange)
	);

	const content = el.createEl('div');
	content.classList.add(CONTENT_CLASS);
	if (view === 'monthly') {
		renderMonthlyBudgets(content, months, config, chunkConfig);
	} else {
		renderYearView(content, months, config, chunkConfig, settings, onSettingsChange);
	}
}
