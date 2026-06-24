import { Plugin } from 'obsidian';
import { YearChartType, YearSortMode } from './plotYear';

export interface FinancesSettings {
	yearChartType: YearChartType;
	yearSortMode: YearSortMode;
}

const DEFAULT_SETTINGS: FinancesSettings = {
	yearChartType: 'bar',
	yearSortMode: 'total',
};

interface PluginData {
	finances?: Partial<FinancesSettings>;
}

export async function loadFinancesSettings(plugin: Plugin): Promise<FinancesSettings> {
	try {
		const data = (await plugin.loadData()) as PluginData | null;
		return { ...DEFAULT_SETTINGS, ...data?.finances };
	} catch {
		return { ...DEFAULT_SETTINGS };
	}
}

export async function saveFinancesSettings(plugin: Plugin, settings: Partial<FinancesSettings>): Promise<void> {
	const data = ((await plugin.loadData()) as PluginData | null) ?? {};
	await plugin.saveData({ ...data, finances: { ...data.finances, ...settings } });
}
