import { App, Plugin, MarkdownPostProcessorContext, TFile } from 'obsidian';
import { parseCategories, parseDailyData } from './parser';
import { renderTrainingChart, renderBodyChart } from './renderer';
import { DailyData, TrainingsConfig } from './types';

export class TrainingsModule {
	constructor(private app: App) {}

	register(plugin: Plugin): void {
		const parseChunkConfig = (source: string) => {
			const heightStr = source.match(/height:\s*(\d+)/)?.[1];
			const metricsStr = source.match(/metrics:\s*(.+)/)?.[1];
			return {
				height: heightStr ? parseInt(heightStr, 10) : 300,
				metrics: metricsStr ? metricsStr.split(',').map((m) => m.trim()) : [],
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
			config: TrainingsConfig,
			height?: number,
			metrics?: string[]
		) => void;

		const setupRerender = (
			el: HTMLElement,
			ctx: MarkdownPostProcessorContext,
			source: string,
			renderer: Renderer
		) => {
			const file = this.app.vault.getAbstractFileByPath(ctx.sourcePath);
			if (!(file instanceof TFile)) return;
			if ((el as any).__trainingsWatched) return;
			(el as any).__trainingsWatched = true;

			const onModify = async (modifiedFile: TFile) => {
				if (modifiedFile.path !== file.path) return;
				const data = await readAndParse(ctx);
				if (!data) return;
				el.empty();
				const chunkConfig = parseChunkConfig(source);
				renderer(el, data.dailyData, data.config, chunkConfig.height, chunkConfig.metrics);
			};

			plugin.registerEvent(this.app.vault.on('modify', onModify));
		};

		const registerBlock = (blockName: string, renderer: Renderer) => {
			plugin.registerMarkdownCodeBlockProcessor(blockName, async (source, el, ctx) => {
				const data = await readAndParse(ctx);
				if (!data) return;
				const chunkConfig = parseChunkConfig(source);
				renderer(el, data.dailyData, data.config, chunkConfig.height, chunkConfig.metrics);
				setupRerender(el, ctx, source, renderer);
			});
		};

		registerBlock('cext-trainings-chart', renderTrainingChart);
		registerBlock('cext-trainings-body', renderBodyChart);
	}
}
