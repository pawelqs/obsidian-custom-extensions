# Sum Weights Module

## Description
Shows per-category weight subtotals inline in a note. When a heading carries the tag `#sum-weights` (or `#suma-wag`), every first-level item of the list directly under it gets a small `Σ <n>g` badge with the sum of all weights found in that item's subtree.

Below the list it also adds a grand-total row (`Σ razem: <n>g`) summing every weight in the section.

There is no code block — the module is driven entirely by the heading tag and runs as a Markdown post-processor (Reading view).

## Format
- Tag the heading: `# Sprzęt #sum-weights`.
- Write each weight as inline code `` `<number>g` `` (e.g. `` `2200g` ``). Only weights inside backticks count — a plain `(2200g)` in the text is ignored, so you can mention numbers freely without them being summed.

```markdown
# Sprzęt #sum-weights

- [ ] Obóz
	- [ ] namiot (Naturhike Star River 2) `2200g`
	- [ ] śpiwór puchowy (Cumulus Panyam 450) `810g`   →  renders "Obóz Σ 3010g"
- [ ] Jedzenie `4500g`                                  →  renders "Jedzenie Σ 4500g"
```

The badge is the sum over the whole subtree of each first-level item; an item with no weights anywhere in its subtree gets no badge. The trigger tags are the `WEIGHT_TAGS` constant in `parser.ts`.

## Files
- `parser.ts` — pure helpers: `sumWeights`, `headingHasWeightTag`, `findEnclosingHeading`.
- `renderer.ts` — `renderWeightBadges` (per first-level `<li>`) and `renderWeightTotal` (grand-total row below the list); both sum the `<code>` weights and are idempotent.
- `index.ts` — registers the post-processor; ties the tagged heading to its list via `ctx.getSectionInfo`.
