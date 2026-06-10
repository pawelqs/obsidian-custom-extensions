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
export function renderWeightTotal(topUl: HTMLElement): void {
	if (topUl.nextElementSibling?.classList.contains(TOTAL_CLASS)) return;

	const total = sumCodeWeights(topUl);
	if (total <= 0) return;

	const row = document.createElement('div');
	row.className = TOTAL_CLASS;
	row.textContent = `Σ razem: ${total}g`;
	topUl.insertAdjacentElement('afterend', row);
}

// Only weights written as inline code (`1660g`) count — plain text like `(2200g)` is ignored.
// Cancelled items (`- [-]`, rendered as li[data-task="-"]) are excluded, including everything
// nested under a cancelled ancestor.
function sumCodeWeights(root: HTMLElement): number {
	let total = 0;
	for (const code of Array.from(root.querySelectorAll('code'))) {
		if (code.closest('pre')) continue; // skip fenced code blocks
		if (code.closest('li[data-task="-"]')) continue;
		total += sumWeights(code.textContent ?? '');
	}
	return total;
}
