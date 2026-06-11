# Sum Weights Module

## Description
Shows per-category weight subtotals inline in a note. When a heading carries the tag `#sum-weights` (or `#suma-wag`), every first-level item of the list directly under it gets a small `Σ <n>g` badge with the sum of all weights found in that item's subtree.

Below the list it also adds a grand-total row (`Σ razem: <n>g`) summing every weight in the section. Clicking the row opens a modal with a pie chart of the first-level item subtotals (same sums as the badges).

There is no code block — the module is driven entirely by the heading tag and runs as a Markdown post-processor (Reading view).

## Format
- Tag the heading: `# Sprzęt #sum-weights`.
- Write each weight as inline code `` `<number>g` `` (e.g. `` `2200g` ``). Only weights inside backticks count — a plain `(2200g)` in the text is ignored, so you can mention numbers freely without them being summed.
- Cancelled items (`- [-]`) are excluded from all sums, along with everything nested under them. Checked items (`- [x]`) still count.

```markdown
# Sprzęt #sum-weights

- [ ] Obóz
	- [ ] namiot (Naturhike Star River 2) `2200g`
	- [ ] śpiwór puchowy (Cumulus Panyam 450) `810g`   →  renders "Obóz Σ 3010g"
- [ ] Jedzenie `4500g`                                  →  renders "Jedzenie Σ 4500g"
```

The badge is the sum over the whole subtree of each first-level item; an item with no weights anywhere in its subtree gets no badge. The trigger tags are the `WEIGHT_TAGS` constant in `parser.ts`.

## Files
- `parser.ts` — pure helpers: `sumWeights`, `headingHasWeightTag`, `headingTitle`, `findEnclosingHeading`.
- `renderer.ts` — list DOM primitives: `renderWeightBadges` (per first-level `<li>`) and `renderWeightTotal` (grand-total row below the list), both idempotent; `sumCodeWeights` (the `<code>` weight summer, cancelled subtrees excluded), `itemOwnText`, `findTopUl`.
- `weightsPie.ts` — the pie-chart feature behind a single entry point: `openWeightsPie(app, title, sectionEl)` collects `{ label, grams }` per first-level item and opens a private `WeightsPieModal` (Obsidian `Modal` + Chart.js pie, titled after the tagged heading, chart destroyed in `onClose`).
- `annotationsWatcher.ts` — the annotate-and-keep-annotated feature behind a single entry point: `annotateAndWatch(el, ctx, onTotalClick)` renders the badges/total and owns the `MutationObserver` that re-applies them when another plugin (e.g. Tasks) rebuilds the list `<li>`s, the debounce, and the `MarkdownRenderChild` teardown.
- `index.ts` — pure wiring: gates (note tag → section info → tagged heading via `ctx.getSectionInfo`) and one `annotateAndWatch` call with the pie-modal click handler.
