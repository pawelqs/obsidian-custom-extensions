import { MarkdownPostProcessorContext, MarkdownRenderChild } from 'obsidian';
import { findTopUl, renderWeightBadges, renderWeightTotal } from './renderer';
import { getElementState, setElementState } from '../../shared/elementState';

const APPLY_DEBOUNCE_MS = 100;

// Renders the badges/total, and keeps re-applying them if another plugin (e.g. Tasks)
// rebuilds the list DOM afterwards. Tasks runs its own post-processor deferred via
// onLayoutReady and replaces each task <li> in an awaited loop, wiping our badges —
// so a MutationObserver re-applies them idempotently. Tasks' per-item awaits deliver
// each item's mutations as a separate batch, so the callback is debounced to coalesce
// the whole pass into one re-apply. The observer is detached during our own writes to
// avoid a feedback loop, and torn down with the rendered section.
export function annotateAndWatch(el: HTMLElement, ctx: MarkdownPostProcessorContext, onTotalClick: () => void): void {
	if (!getElementState<MutationObserver>(el, '__sumWeightsObserver')) {
		setElementState(el, '__sumWeightsObserver', new MutationObserver(() => scheduleApply(el, onTotalClick)));
		ctx.addChild(new SumWeightsRenderChild(el));
	}
	applyAnnotations(el, onTotalClick, 'post-processor');
}

function scheduleApply(el: HTMLElement, onTotalClick: () => void): void {
	const pending = getElementState<number>(el, '__sumWeightsTimer');
	if (pending !== undefined) window.clearTimeout(pending);
	setElementState(el, '__sumWeightsTimer', window.setTimeout(() => {
		setElementState(el, '__sumWeightsTimer', undefined);
		applyAnnotations(el, onTotalClick, 'mutation');
	}, APPLY_DEBOUNCE_MS));
}

// Re-queries the list each time (Tasks may have replaced it) and pauses the observer
// around our own writes so they don't re-trigger it.
function applyAnnotations(el: HTMLElement, onTotalClick: () => void, trigger: 'post-processor' | 'mutation'): void {
	const topUl = findTopUl(el);
	if (!topUl) return;

	console.debug(`[cext sum-weights] apply (trigger: ${trigger})`, topUl);

	const observer = getElementState<MutationObserver>(el, '__sumWeightsObserver');
	observer?.disconnect();
	renderWeightBadges(topUl);
	renderWeightTotal(topUl, onTotalClick);
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
