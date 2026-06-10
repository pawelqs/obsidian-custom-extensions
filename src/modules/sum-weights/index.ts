import { App, Plugin, MarkdownPostProcessorContext, MarkdownRenderChild, getAllTags } from 'obsidian';
import { findEnclosingHeading, headingHasWeightTag, WEIGHT_TAGS } from './parser';
import { renderWeightBadges, renderWeightTotal } from './renderer';
import { getElementState, setElementState } from '../../shared/elementState';

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

			this.annotateAndWatch(el, ctx);
		});
	}

	// Renders the badges/total, and keeps re-applying them if another plugin (e.g. Tasks)
	// rebuilds the list DOM afterwards. Tasks runs its own post-processor deferred via
	// onLayoutReady and replaces each task <li> in an awaited loop, wiping our badges —
	// so a MutationObserver re-applies them idempotently. Tasks' per-item awaits deliver
	// each item's mutations as a separate batch, so the callback is debounced to coalesce
	// the whole pass into one re-apply. The observer is detached during our own writes to
	// avoid a feedback loop, and torn down with the rendered section.
	private annotateAndWatch(el: HTMLElement, ctx: MarkdownPostProcessorContext): void {
		if (!getElementState<MutationObserver>(el, '__sumWeightsObserver')) {
			setElementState(el, '__sumWeightsObserver', new MutationObserver(() => scheduleApply(el)));
			ctx.addChild(new SumWeightsRenderChild(el));
		}
		applyAnnotations(el, 'post-processor');
	}

	private noteHasWeightTag(sourcePath: string): boolean {
		const cache = this.app.metadataCache.getCache(sourcePath);
		if (!cache) return true; // cache not ready — let the section check decide
		const tags = getAllTags(cache);
		return tags?.some((tag) => WEIGHT_TAGS.includes(tag)) ?? false;
	}
}

const APPLY_DEBOUNCE_MS = 100;

function scheduleApply(el: HTMLElement): void {
	const pending = getElementState<number>(el, '__sumWeightsTimer');
	if (pending !== undefined) window.clearTimeout(pending);
	setElementState(el, '__sumWeightsTimer', window.setTimeout(() => {
		setElementState(el, '__sumWeightsTimer', undefined);
		applyAnnotations(el, 'mutation');
	}, APPLY_DEBOUNCE_MS));
}

// Re-queries the list each time (Tasks may have replaced it) and pauses the observer
// around our own writes so they don't re-trigger it.
function applyAnnotations(el: HTMLElement, trigger: 'post-processor' | 'mutation'): void {
	const topUl = el.matches('ul') ? el : el.querySelector('ul');
	if (!topUl) return;

	console.debug(`[cext sum-weights] apply (trigger: ${trigger})`, topUl);

	const observer = getElementState<MutationObserver>(el, '__sumWeightsObserver');
	observer?.disconnect();
	renderWeightBadges(topUl);
	renderWeightTotal(topUl);
	observer?.observe(el, { childList: true, subtree: true });
}

class SumWeightsRenderChild extends MarkdownRenderChild {
	onunload(): void {
		getElementState<MutationObserver>(this.containerEl, '__sumWeightsObserver')?.disconnect();
		setElementState(this.containerEl, '__sumWeightsObserver', undefined);
		const pending = getElementState<number>(this.containerEl, '__sumWeightsTimer');
		if (pending !== undefined) window.clearTimeout(pending);
		setElementState(this.containerEl, '__sumWeightsTimer', undefined);
	}
}
