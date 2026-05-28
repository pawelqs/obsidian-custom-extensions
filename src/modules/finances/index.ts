import { App, Plugin, MarkdownPostProcessorContext, TFile } from 'obsidian';
import { parseCategories, parseMonths } from './parser';
import { renderChart, renderTable } from './renderer';

export class FinancesModule {
	constructor(private app: App) {}

	register(plugin: Plugin): void {
		const parseChunkConfig = (source: string) => {
			const heightStr = source.match(/height:\s*(\d+)/)?.[1];
			return { height: heightStr ? parseInt(heightStr, 10) : 600 };
		};

		const readAndParse = async (ctx: MarkdownPostProcessorContext) => {
			const file = this.app.vault.getAbstractFileByPath(ctx.sourcePath);
			if (!(file instanceof TFile)) return null;
			const content = await this.app.vault.read(file);
			const config = parseCategories(content);
			const months = parseMonths(content, config);
			return { config, months };
		};

		type Renderer = (el: HTMLElement, months: any[], config: any, height?: number) => void;
		const setupRerender = (
			el: HTMLElement,
			ctx: MarkdownPostProcessorContext,
			source: string,
			renderer: Renderer
		) => {
			const file = this.app.vault.getAbstractFileByPath(ctx.sourcePath);
			if (!(file instanceof TFile)) return;
			if ((el as any).__financeWatched) return;
			(el as any).__financeWatched = true;

			const onModify = async (modifiedFile: TFile) => {
				if (modifiedFile.path !== file.path) return;
				const data = await readAndParse(ctx);
				if (!data) return;
				el.empty();
				const chunkConfig = parseChunkConfig(source);
				renderer(el, data.months, data.config, chunkConfig.height);
			};

			plugin.registerEvent(this.app.vault.on('modify', onModify));
		};

		const registerChartBlock = (blockName: string, renderer: Renderer) => {
			plugin.registerMarkdownCodeBlockProcessor(blockName, async (source, el, ctx) => {
				const data = await readAndParse(ctx);
				if (!data) return;
				const h = parseChunkConfig(source).height;
				renderer(el, data.months, data.config, h);
				setupRerender(el, ctx, source, renderer);
			});
		};

		registerChartBlock('cext-finances-chart', renderChart);
		registerChartBlock('cext-finances-table', renderTable);
	}
}
