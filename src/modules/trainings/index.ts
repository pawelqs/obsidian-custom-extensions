import { App, Plugin, MarkdownPostProcessorContext, TFile } from 'obsidian';
import { parseDailyData } from './parser';
import { renderTrainingChart, renderBodyChart } from './renderer';
import { DailyData, TrainingsChunkConfig } from './types';
import { parseCategories, CategoriesConfig } from '../../shared/parseCategories';
import { getElementState, setElementState } from '../../shared/elementState';

export class TrainingsModule {
	constructor(private app: App) {}

	register(plugin: Plugin): void {
		const parseChunkConfig = (source: string): TrainingsChunkConfig => {
			const heightStr = source.match(/height:\s*(\d+)/)?.[1];
			const metricsStr = source.match(/metrics:\s*(.+)/)?.[1];
			const typeStr = source.match(/type:\s*(\w+)/)?.[1];
			return {
				height: heightStr ? parseInt(heightStr, 10) : 300,
				metrics: metricsStr ? metricsStr.split(',').map((m) => m.trim()) : [],
				chartType: typeStr === 'scatter' ? 'scatter' : 'line',
			};
		};

		const readAndParse = async (ctx: MarkdownPostProcessorContext) => {
			const file = this.app.vault.getAbstractFileByPath(ctx.sourcePath);
			if (!(file instanceof TFile)) return null;
			const content = await this.app.vault.read(file);
			const config = parseCategories(content);
			const dailyData = parseDailyData(content, config);
			return { config, dailyData };
		};

		type Renderer = (
			el: HTMLElement,
			dailyData: DailyData[],
			config: CategoriesConfig,
			chunkConfig: TrainingsChunkConfig
		) => void;

		const setupRerender = (
			el: HTMLElement,
			ctx: MarkdownPostProcessorContext,
			source: string,
			renderer: Renderer
		) => {
			const file = this.app.vault.getAbstractFileByPath(ctx.sourcePath);
			if (!(file instanceof TFile)) return;
			if (getElementState<boolean>(el, '__trainingsWatched')) return;
			setElementState(el, '__trainingsWatched', true);

			const onModify = async (modifiedFile: TFile) => {
				if (modifiedFile.path !== file.path) return;
				const data = await readAndParse(ctx);
				if (!data) return;
				el.empty();
				const chunkConfig = parseChunkConfig(source);
				renderer(el, data.dailyData, data.config, chunkConfig);
			};

			plugin.registerEvent(this.app.vault.on('modify', onModify));
		};

		const registerBlock = (blockName: string, renderer: Renderer) => {
			plugin.registerMarkdownCodeBlockProcessor(blockName, async (source, el, ctx) => {
				const data = await readAndParse(ctx);
				if (!data) return;
				const chunkConfig = parseChunkConfig(source);
				renderer(el, data.dailyData, data.config, chunkConfig);
				setupRerender(el, ctx, source, renderer);
			});
		};

		registerBlock('cext-trainings-chart', renderTrainingChart);
		registerBlock('cext-trainings-body', renderBodyChart);
	}
}
