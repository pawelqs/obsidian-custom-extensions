# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Quick Start

Obsidian plugin (TypeScript, bun/esbuild) with two modules: **Finances** (markdown finance data → HTML table + Chart.js stacked bar) and **Trainings** (markdown training/body data → stacked bar per-week + line chart for body metrics).

```bash
bun run dev      # Watch mode
bun run build    # Production build
bun test         # Run tests (bun:test framework)
bun run lint     # Lint code
```

Reload in Obsidian: Settings → Community Plugins → Disable/Enable cext, or Cmd+R with Hot-Reload.

## Architecture

**Module Structure**:
```
src/
  main.ts                  # Plugin entry, initializes FinancesModule
  modules/finances/
    types.ts              # MonthData, FinancesConfig interfaces
    parser.ts             # Parse categories + monthly data from markdown
    renderer.ts           # Render HTML table + Chart.js visualization
    index.ts              # FinancesModule: registers code block processors
    parser.test.ts        # Tests (bun:test)
    test/data/test.md     # Test data
```

**Key Flow**:
1. Two code block processors registered: `cext-finances-chart`, `cext-finances-table`
2. Both read & parse data from the file containing the block
3. `parser.ts`: Extract categories (## Categories section), monthly data (### YYYY-MM blocks)
4. `renderer.ts`: Create table (Month | Income | Taxes | Savings | Expenses | Groups | Balance) + stacked bar chart
5. File watcher triggers re-render on vault changes (uses `__financeWatched` flag to prevent duplicate listeners)

**Parser Detail**: Dynamically detects list indentation (first `-` after section), expects nested items at `itemIndent + 4` spaces. Handles tabs, multi-value items (`item 100, other 200`), and nested structures.

**Chart Detail**: Destroys previous Chart.js instance before re-creating to avoid memory leaks. Stores instance on element as `__chartInstance`.

## Data Format

```markdown
## Categories
```
**must:**
- mieszkanie: #1f77b4
**wants:**
- transport: #55d4e0
**inne:**
- relacje: #cc5aaa
```

### 2026-05
- income:
  - wynagrodzenie: 1000
- taxes:
  - PIT: 100
- savings:
  - ETF: 100
- expenses:
  - mieszkanie: 100
  - transport:
    - paliwo: 50
```

## TypeScript

Strict mode enabled. `baseUrl: src` allows clean imports. All undefined cases have proper guards.

## Common Tasks

**Add category group**: Edit `## Categories` in markdown, add `**group:**` + `- name: #color`. Parser auto-detects.

**Debug parser**: Add `console.log()` in `parseMonths()`, run `bun run dev`, check Obsidian console (F12).

**Modify chart**: Edit `renderer.ts` `renderChart()` — change chart type, stack options, line styling.

**Add code block processor**: Register in `index.ts` `register()` with `plugin.registerMarkdownCodeBlockProcessor()`.

## Conventions

### Function ordering (within a file)
Consts first, then exported functions, helpers below — readers see the public API first. When a helper is only called from one function, put it directly under that function. Use `function` declarations (not `const f = () => ...`) so hoisting handles forward references. Module-level constants used by multiple exports stay near the top of the file; per-function helpers go below.

### Pure functions over mutation
Prefer functions that take input and return a value over functions that mutate their arguments by reference. Example: `parseInline(content) → { body, trainings }` instead of `parseInline(content, day)` mutating `day`. Pure functions are easier to test (no need for setup helpers like `emptyDay()`), easier to read (no aliasing surprises), and parallel to sibling helpers (`parseBodyItems`, `parseTrainingItems`) already return values.

Exception: when the imperative version is genuinely clearer (e.g. nested aggregation with a local accumulator), keep it — but isolate the mutation in a small scope.

### Separation of data shaping vs rendering
Rendering functions should be thin Chart.js layers. Extract data transforms into a sibling file (e.g. `aggregator.ts`) so they're testable without a canvas and the render call reads top-to-bottom as "take aggregate → hand to Chart.js."

### Comments and docs
- Default to no comments. Only add when *why* is non-obvious.
- For struct fields, pick *one* style consistently: brief description above the interface, OR trailing `// comment` per field. Not both, not per-field JSDoc above each line (visually noisy).
- One-line `/** */` above an exported function is fine when it adds something the name doesn't.

### Avoiding redundant fields
Don't carry data that can be derived from another field. Example: a `categories: string[]` alongside `colorsMap: Record<string, string>` is redundant — `Object.keys(colorsMap)` preserves insertion order and gives the same list. Drop the duplicate.

### Naming
Prefer descriptive names that say what the value *is*, not how it's built. `dailyData: DailyData[]` reads better than `days: DayData[]`; `aggregateTrainings` reads better than `aggregateByWeek`. The cost of a rename is one find/replace; the cost of a cryptic name compounds with every reader.

## Testing

```bash
bun test src/modules/<module>/parser.test.ts   # specific file
bun test --watch                                # watch mode
```

Uses `bun:test` (built-in). Test data lives in `src/modules/<module>/testdata/` and is imported as a plain string (`import testData from './testdata/test.txt'`).

### Conventions
- One `describe` block per function/unit under test, named after the function (`describe('parseBodyItems', ...)`)— flat structure, no nested wrapper describes for tiny test files.
- Keep test data realistic — mirror the actual markdown format users would write, including tricky cases (inline + multi-line, Polish decimal commas, exercise lists after `:`).
- Extract long input strings to `const input = '...'` before the `expect()` — avoids long lines.
- Test pure functions directly; mutating functions force test setup boilerplate (another reason to prefer pure).

## Troubleshooting

**Chart not updating**: Verify `vault.on('modify')` registered via `registerEvent()` in index.ts, check `__financeWatched` flag.

**Parser wrong values**: Log indentation detection in `parseMonths()`. Verify markdown uses spaces (not mixed tabs).

**Memory leak**: Confirm Chart instance destroyed before re-creating in `renderChart()`.

**Type errors**: Run `bun run build` for full errors. Check `tsconfig.json` strict settings.
