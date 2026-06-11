import { sumWeights } from './parser';

const SUM_CLASS = 'cext-sum-weights';
const TOTAL_CLASS = 'cext-sum-weights-total';

// Annotates each first-level <li> of a list with the sum of weights in its subtree.
// Idempotent: an <li> already carrying a badge is skipped (re-renders rebuild the DOM).
export function renderWeightBadges(topUl: HTMLElement): void {
	for (const li of Array.from(topUl.children)) {
		if (!(li instanceof HTMLElement) || li.tagName !== 'LI') continue;
		if (li.querySelector(`:scope > .${SUM_CLASS}`)) continue;

		const sum = sumCodeWeights(li);
		if (sum <= 0) continue;

		const badge = document.createElement('span');
		badge.className = SUM_CLASS;
		badge.textContent = `Σ ${sum}g`;
		li.insertBefore(badge, li.querySelector(':scope > ul'));
	}
}

// Inserts a grand-total row right below the list. Idempotent: skipped if already present.
export function renderWeightTotal(topUl: HTMLElement, onClick?: () => void): void {
	if (topUl.nextElementSibling?.classList.contains(TOTAL_CLASS)) return;

	const total = sumCodeWeights(topUl);
	if (total <= 0) return;

	const row = document.createElement('div');
	row.className = TOTAL_CLASS;
	row.textContent = `Σ razem: ${total}g`;
	if (onClick) {
		row.classList.add(`${TOTAL_CLASS}--clickable`);
		row.setAttribute('aria-label', 'Show chart');
		row.addEventListener('click', onClick);
	}
	topUl.insertAdjacentElement('afterend', row);
}

// Only weights written as inline code (`1660g`) count — plain text like `(2200g)` is ignored.
// Cancelled items (`- [-]`, rendered as li[data-task="-"]) are excluded, including everything
// nested under a cancelled ancestor.
export function sumCodeWeights(root: HTMLElement): number {
	let total = 0;
	for (const code of Array.from(root.querySelectorAll('code'))) {
		if (code.closest('pre')) continue; // skip fenced code blocks
		if (code.closest('li[data-task="-"]')) continue;
		total += sumWeights(code.textContent ?? '');
	}
	return total;
}

/** The item's own text: nested list, the Σ badge, and the weight tokens themselves stripped. */
export function itemOwnText(li: HTMLElement): string {
	const clone = li.cloneNode(true) as HTMLElement;
	for (const removed of Array.from(clone.querySelectorAll(`ul, .${SUM_CLASS}`))) removed.remove();
	for (const code of Array.from(clone.querySelectorAll('code'))) {
		if (sumWeights(code.textContent ?? '') > 0) code.remove();
	}
	return (clone.textContent ?? '').replace(/\s+/g, ' ').trim();
}

/** The section's top-level list: the element itself or its first <ul>. */
export function findTopUl(el: HTMLElement): HTMLElement | null {
	return el.matches('ul') ? el : el.querySelector('ul');
}
