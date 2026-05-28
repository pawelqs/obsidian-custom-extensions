import { App, Plugin, MarkdownPostProcessorContext, TFile } from 'obsidian';
import { parseCategories, parseMonths } from './parser';
import { renderChart, renderTable } from './renderer';

export class FinancesModule {
	constructor(private app: App) {}

	register(plugin: Plugin): void {
		const readAndParse = async (ctx: MarkdownPostProcessorContext) => {
			const file = this.app.vault.getAbstractFileByPath(ctx.sourcePath);
			if (!(file instanceof TFile)) return null;
			const content = await this.app.vault.read(file);
			const config = parseCategories(content);
			const months = parseMonths(content, config);
			return { config, months };
		};

		const setupRerender = (el: HTMLElement, ctx: MarkdownPostProcessorContext, renderer: (el: HTMLElement, months: any[], config: any) => void) => {
			const file = this.app.vault.getAbstractFileByPath(ctx.sourcePath);
			if (!(file instanceof TFile)) return;

			const watched = (el as any).__financeWatched;
			if (watched) return;

			(el as any).__financeWatched = true;

			plugin.registerEvent(
				this.app.vault.on('modify', async (modifiedFile) => {
					if (modifiedFile.path === file.path) {
						const data = await readAndParse(ctx);
						if (!data) return;
						el.empty();
						renderer(el, data.months, data.config);
					}
				})
			);
		};

		plugin.registerMarkdownCodeBlockProcessor(
			'cext-finances-chart',
			async (source, el, ctx) => {
				const data = await readAndParse(ctx);
				if (!data) return;
				renderChart(el, data.months, data.config);
				setupRerender(el, ctx, renderChart);
			}
		);

		plugin.registerMarkdownCodeBlockProcessor(
			'cext-finances-table',
			async (source, el, ctx) => {
				const data = await readAndParse(ctx);
				if (!data) return;
				renderTable(el, data.months, data.config);
				setupRerender(el, ctx, renderTable);
			}
		);
	}
}
