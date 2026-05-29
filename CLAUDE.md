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

**Module structure** (each module follows the same shape):
```
src/
  main.ts                       # Plugin entry, registers all modules
  modules/<module>/
    types.ts                    # Domain interfaces
    parser.ts                   # Markdown → domain types
    aggregator.ts               # (trainings) Domain → chart-ready aggregates
    renderer.ts                 # Aggregates → Chart.js / HTML
    index.ts                    # Module class: registers code block processors + file watcher
    parser.test.ts              # Tests (bun:test)
    testdata/test.txt           # Test data, imported as a plain string
```

**Modules**:
- **finances** — code blocks `cext-finances-chart` (stacked bar) and `cext-finances-table` (HTML table). Parses `## Categories` (with `**group:**` markers) and `### YYYY-MM` blocks with `income`/`taxes`/`savings`/`expenses` sections.
- **trainings** — code blocks `cext-trainings-chart` (stacked bar of hours per week × category) and `cext-trainings-body` (line chart of body metrics like `kg`, `PBF`). Parses `## Kategorie` and `## Data` with `- YYYY-MM-DD` daily entries.

**Code block naming**: `cext-<module>-<view>` — e.g. `cext-finances-chart`, `cext-finances-table`, `cext-trainings-chart`, `cext-trainings-body`. The `cext-` prefix scopes to this plugin and avoids collisions with other plugins' processors.

**Key flow**:
1. Module's `index.ts` registers code block processors with `plugin.registerMarkdownCodeBlockProcessor(name, handler)`.
2. Handler reads the containing file via `app.vault.read`, parses it, hands data to renderer.
3. `vault.on('modify')` re-renders on file changes; an element-level flag (`__financeWatched` / `__trainingsWatched`) prevents duplicate listeners.
4. Chart.js instance stored on element as `__chartInstance` and destroyed before re-create (avoids memory leak).

**Finances parser detail**: Dynamically detects list indentation (first `-` after section), expects nested items at `itemIndent + 4` spaces. Handles tabs, multi-value items (`item 100, other 200`), and nested structures.

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

**Add code block processor**: Register in `index.ts` `register()` with `plugin.registerMarkdownCodeBlockProcessor('cext-<module>-<view>', ...)`. Follow the naming convention above.

**Add a new module**: Mirror `src/modules/finances/` or `src/modules/trainings/` — same file shape. Register the module class in `src/main.ts` `onload()`.

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

### Styling
Static CSS goes in `styles.css` under `.cext-*` prefixed classes (e.g. `.cext-chart-container`, `.cext-table`, `.cext-legend-*`); apply via `el.classList.add(...)`. Inline styles only for dynamic values that change per-render (e.g. `container.style.height = '${height}px'` where height comes from the code block config). Don't sprinkle inline `border`/`padding`/`fontWeight` — move it to a class.

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
