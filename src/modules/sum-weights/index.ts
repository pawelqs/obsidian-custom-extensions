import { App, Plugin, MarkdownPostProcessorContext, getAllTags } from 'obsidian';
import { findEnclosingHeading, headingHasWeightTag, WEIGHT_TAGS } from './parser';
import { renderWeightBadges, renderWeightTotal } from './renderer';

export class SumWeightsModule {
	constructor(private app: App) {}

	register(plugin: Plugin): void {
		plugin.registerMarkdownPostProcessor((el: HTMLElement, ctx: MarkdownPostProcessorContext) => {
			const topUl = el.matches('ul') ? el : el.querySelector('ul');
			if (!topUl) return;

			// Cheap note-level gate: skip notes that don't carry the tag at all, before
			// touching section info. Uses the cached metadata (tag in a heading or frontmatter).
			if (!this.noteHasWeightTag(ctx.sourcePath)) return;

			const info = ctx.getSectionInfo(el);
			if (!info) return;

			const heading = findEnclosingHeading(info.text.split('\n'), info.lineStart);
			if (!heading || !headingHasWeightTag(heading)) return;

			renderWeightBadges(topUl);
			renderWeightTotal(topUl);
		});
	}

	// Returns false only when we positively know the note has no weight tag (cheap skip).
	// If the metadata cache isn't ready yet, returns true so the authoritative section
	// check below still runs — otherwise a race on load could drop the badges.
	private noteHasWeightTag(sourcePath: string): boolean {
		const cache = this.app.metadataCache.getCache(sourcePath);
		if (!cache) return true;
		const tags = getAllTags(cache);
		return tags?.some((tag) => WEIGHT_TAGS.includes(tag)) ?? false;
	}
}
