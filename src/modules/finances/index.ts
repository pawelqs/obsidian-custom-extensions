import { App, Plugin, MarkdownPostProcessorContext, MarkdownRenderChild, TFile } from 'obsidian';
import { filterCategories, parseMonths } from './parser';
import { CategoriesConfig, parseCategories } from '../../shared/parseCategories';
import { renderTable } from './table';
import { createFinancesChartRenderer, destroyFinancesChart } from './financesChart';
import { ChunkConfig } from '../../shared/chunkConfig';
import { MonthData } from './types';
import { getElementState, setElementState } from '../../shared/elementState';

export class FinancesModule {
	constructor(private app: App) {}

	register(plugin: Plugin): void {
		const readAndParse = async (ctx: MarkdownPostProcessorContext) => {
			const file = this.app.vault.getAbstractFileByPath(ctx.sourcePath);
			if (!(file instanceof TFile)) return null;
			const content = await this.app.vault.cachedRead(file);
			const config = filterCategories(parseCategories(content));
			const months = parseMonths(content, config);
			return { config, months };
		};

		type Renderer = (
			el: HTMLElement,
			months: MonthData[],
			config: CategoriesConfig,
			chunkConfig: ChunkConfig
		) => void;
		const setupRerender = (
			el: HTMLElement,
			ctx: MarkdownPostProcessorContext,
			source: string,
			renderer: Renderer
		) => {
			if (getElementState<boolean>(el, '__financeWatched')) return;
			setElementState(el, '__financeWatched', true);

			const child = new FinancesRenderChild(el);
			ctx.addChild(child);

			const file = this.app.vault.getAbstractFileByPath(ctx.sourcePath);
			if (!(file instanceof TFile)) return;

			const onModify = async (modifiedFile: TFile) => {
				if (modifiedFile.path !== file.path) return;
				const data = await readAndParse(ctx);
				if (!data) return;
				destroyFinancesChart(el);
				el.empty();
				const chunkConfig = parseChunkConfig(source);
				renderer(el, data.months, data.config, chunkConfig);
			};

			child.registerEvent(this.app.vault.on('modify', onModify));
		};

		const registerChartBlock = (blockName: string, renderer: Renderer) => {
			plugin.registerMarkdownCodeBlockProcessor(blockName, async (source, el, ctx) => {
				const data = await readAndParse(ctx);
				if (!data) return;
				const chunkConfig = parseChunkConfig(source);
				renderer(el, data.months, data.config, chunkConfig);
				setupRerender(el, ctx, source, renderer);
			});
		};

		registerChartBlock('cext-finances-chart', createFinancesChartRenderer(plugin));
		registerChartBlock('cext-finances-table', renderTable);
	}
}

class FinancesRenderChild extends MarkdownRenderChild {
	onunload(): void {
		setElementState(this.containerEl, '__financeWatched', undefined);
		destroyFinancesChart(this.containerEl);
	}
}

function parseChunkConfig(source: string): ChunkConfig {
	const heightStr = source.match(/height:\s*(\d+)/)?.[1];
	return { height: heightStr ? parseInt(heightStr, 10) : 600 };
}
