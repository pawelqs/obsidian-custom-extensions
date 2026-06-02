import { App, Plugin, MarkdownPostProcessorContext, TFile } from 'obsidian';
import { parseLocations } from './parser';
import { renderMap } from './renderer';
import { MapChunkConfig } from './types';
import { parseCategories } from '../../shared/parseCategories';
import { getElementState, setElementState } from '../../shared/elementState';

export class MapModule {
	constructor(private app: App) {}

	register(plugin: Plugin): void {
		const parseChunkConfig = (source: string): MapChunkConfig => {
			const heightStr = source.match(/height:\s*(\d+)/)?.[1];
			return { height: heightStr ? parseInt(heightStr, 10) : 400 };
		};

		const readAndParse = async (ctx: MarkdownPostProcessorContext) => {
			const file = this.app.vault.getAbstractFileByPath(ctx.sourcePath);
			if (!(file instanceof TFile)) return null;
			const content = await this.app.vault.read(file);
			const config = parseCategories(content);
			const locations = parseLocations(content, config);
			return { config, locations };
		};

		plugin.registerMarkdownCodeBlockProcessor('cext-map', async (source, el, ctx) => {
			const data = await readAndParse(ctx);
			if (!data) return;
			const chunkConfig = parseChunkConfig(source);
			renderMap(el, data.locations, data.config, chunkConfig);

			const file = this.app.vault.getAbstractFileByPath(ctx.sourcePath);
			if (!(file instanceof TFile) || getElementState<boolean>(el, '__mapWatched')) return;
			setElementState(el, '__mapWatched', true);

			const onModify = async (modifiedFile: TFile) => {
				if (modifiedFile.path !== file.path) return;
				const fresh = await readAndParse(ctx);
				if (!fresh) return;
				renderMap(el, fresh.locations, fresh.config, chunkConfig);
			};

			plugin.registerEvent(this.app.vault.on('modify', onModify));
		});
	}
}
