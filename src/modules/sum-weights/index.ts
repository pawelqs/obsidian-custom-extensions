import { App, Plugin, MarkdownPostProcessorContext, getAllTags } from 'obsidian';
import { findEnclosingHeading, headingHasWeightTag, headingTitle, WEIGHT_TAGS } from './parser';
import { findTopUl } from './renderer';
import { annotateAndWatch } from './annotationsWatcher';
import { openWeightsPie } from './weightsPie';

export class SumWeightsModule {
	constructor(private app: App) {}

	register(plugin: Plugin): void {
		plugin.registerMarkdownPostProcessor((el: HTMLElement, ctx: MarkdownPostProcessorContext) => {
			if (!findTopUl(el)) return;

			// Cheap note-level gate: skip notes that don't carry the tag at all, before
			// touching section info. Uses the cached metadata (tag in a heading or frontmatter).
			if (!this.noteHasWeightTag(ctx.sourcePath)) return;

			const info = ctx.getSectionInfo(el);
			if (!info) return;

			const heading = findEnclosingHeading(info.text.split('\n'), info.lineStart);
			if (!heading || !headingHasWeightTag(heading)) return;

			const title = headingTitle(heading);
			const onTotalClick = () => openWeightsPie(this.app, title, el);
			annotateAndWatch(el, ctx, onTotalClick);
		});
	}

	private noteHasWeightTag(sourcePath: string): boolean {
		const cache = this.app.metadataCache.getCache(sourcePath);
		if (!cache) return true; // cache not ready — let the section check decide
		const tags = getAllTags(cache);
		return tags?.some((tag) => WEIGHT_TAGS.includes(tag)) ?? false;
	}
}
