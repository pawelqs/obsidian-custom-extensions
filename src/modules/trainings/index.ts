import { App, Plugin, MarkdownPostProcessorContext, MarkdownRenderChild, TFile } from 'obsidian';
import { parseDailyData, parseWeeklyExercises } from './parser';
import { renderTrainingChart, renderBodyChart } from './renderer';
import { renderExercisesTable } from './exercisesTable';
import { destroyChart } from '../../shared/chartInstance';
import { DailyData, WeeklyExercises, TrainingsChunkConfig } from './types';
import { parseCategories, CategoriesConfig } from '../../shared/parseCategories';
import { getElementState, setElementState } from '../../shared/elementState';

export class TrainingsModule {
	constructor(private app: App) {}

	register(plugin: Plugin): void {
		const readAndParse = async (ctx: MarkdownPostProcessorContext) => {
			const file = this.app.vault.getAbstractFileByPath(ctx.sourcePath);
			if (!(file instanceof TFile)) return null;
			const content = await this.app.vault.cachedRead(file);
			const config = parseCategories(content);
			const dailyData = parseDailyData(content, config);
			const weeklyExercises = parseWeeklyExercises(content);
			return { config, dailyData, weeklyExercises };
		};

		type Renderer = (
			el: HTMLElement,
			dailyData: DailyData[],
			config: CategoriesConfig,
			chunkConfig: TrainingsChunkConfig,
			weeklyExercises: WeeklyExercises[]
		) => void;

		const setupRerender = (
			el: HTMLElement,
			ctx: MarkdownPostProcessorContext,
			source: string,
			renderer: Renderer
		) => {
			if (getElementState<boolean>(el, '__trainingsWatched')) return;
			setElementState(el, '__trainingsWatched', true);

			const child = new TrainingsRenderChild(el);
			ctx.addChild(child);

			const file = this.app.vault.getAbstractFileByPath(ctx.sourcePath);
			if (!(file instanceof TFile)) return;

			const onModify = async (modifiedFile: TFile) => {
				if (modifiedFile.path !== file.path) return;
				const data = await readAndParse(ctx);
				if (!data) return;
				el.empty();
				const chunkConfig = parseChunkConfig(source);
				renderer(el, data.dailyData, data.config, chunkConfig, data.weeklyExercises);
			};

			child.registerEvent(this.app.vault.on('modify', onModify));
		};

		const registerBlock = (blockName: string, renderer: Renderer) => {
			plugin.registerMarkdownCodeBlockProcessor(blockName, async (source, el, ctx) => {
				const data = await readAndParse(ctx);
				if (!data) return;
				const chunkConfig = parseChunkConfig(source);
				renderer(el, data.dailyData, data.config, chunkConfig, data.weeklyExercises);
				setupRerender(el, ctx, source, renderer);
			});
		};

		registerBlock('cext-trainings-chart', renderTrainingChart);
		registerBlock('cext-trainings-body', renderBodyChart);
		registerBlock('cext-trainings-table', (el, _dailyData, _config, _chunkConfig, weeklyExercises) =>
			renderExercisesTable(el, weeklyExercises)
		);
	}
}

class TrainingsRenderChild extends MarkdownRenderChild {
	onunload(): void {
		setElementState(this.containerEl, '__trainingsWatched', undefined);
		destroyChart(this.containerEl);
	}
}

function parseChunkConfig(source: string): TrainingsChunkConfig {
	const heightStr = source.match(/height:\s*(\d+)/)?.[1];
	const metricsStr = source.match(/metrics:\s*(.+)/)?.[1];
	const typeStr = source.match(/type:\s*(\w+)/)?.[1];
	return {
		height: heightStr ? parseInt(heightStr, 10) : 300,
		metrics: metricsStr ? metricsStr.split(',').map((m) => m.trim()) : [],
		chartType: typeStr === 'scatter' ? 'scatter' : 'line',
	};
}
