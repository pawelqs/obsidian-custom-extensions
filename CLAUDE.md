# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Quick Start

Obsidian plugin (TypeScript, bun/esbuild) with three modules: **Finances** (markdown finance data → HTML table + Chart.js stacked bar), **Trainings** (markdown training/body data → stacked bar per-week + line chart for body metrics), and **Map** (markdown `geo:` tokens → Leaflet map with clickable inline coords).

```bash
bun run dev      # Watch mode
bun run build    # Production build
bun test         # Run tests (bun:test framework)
bun run lint     # Lint code
```

Reload in Obsidian: Settings → Community Plugins → Disable/Enable cext, or Cmd+R with Hot-Reload.

**Shell usage**: Don't prefix commands with `cd` into the project directory. The shell already runs in the project root, and a `cd` inside a compound command (`cd … && …`) triggers an extra permission prompt. Use absolute paths or relative paths from the project root instead. For the same reason, avoid `git -C <path> …` — the `-C` flag hides the subcommand from Claude Code's read-only detection, so even read-only git commands prompt. Run plain `git status` / `git ls-files` etc. from the project root.

## Architecture

**Module structure** (each module follows the same shape):
```
src/
  main.ts                       # Plugin entry, registers all modules
  shared/
    parseCategories.ts          # Shared parser for ## Categories / ## Kategorie blocks; returns CategoriesConfig
    parseCategories.test.ts
    colorLegend.ts              # Generic legend renderer driven by CategoriesConfig (grouped or flat)
    elementState.ts             # Typed get/setElementState — one place for the el-state cast
    chunkConfig.ts              # Shared ChunkConfig { height } interface
  modules/<module>/
    types.ts                    # Domain interfaces (module-specific only; categories config comes from shared)
    parser.ts                   # Markdown → domain types
    aggregator.ts               # (trainings) Domain → chart-ready aggregates
    renderer.ts                 # Aggregates → Chart.js / Leaflet / HTML
    index.ts                    # Module class: registers code block processors + file watcher
    parser.test.ts              # Tests (bun:test)
    testdata/test.txt           # Test data, imported as a plain string
```

**Modules**:
- **finances** — code blocks `cext-finances-chart` (stacked bar) and `cext-finances-table` (HTML table). Parses `## Categories` (with `**group:**` markers) and `### YYYY-MM` blocks with `income`/`taxes`/`savings`/`expenses` sections.
- **trainings** — code blocks `cext-trainings-chart` (stacked bar of hours per week × category) and `cext-trainings-body` (line chart of body metrics like `kg`, `PBF`). Parses `## Kategorie` and `## Data` with `- YYYY-MM-DD` daily entries.
- **map** — single code block `cext-map` (Leaflet map). Scans the whole note for `` `geo: lat, lon[, key: value …]` `` tokens (headings or list items) and drops a colored marker per location; category color comes from the shared `## Categories`/`## Kategorie` block. The token tail (parsed by `parseGeo`/`parseTail`) accepts two equivalent forms in any order: terse sigils `#category @route#seq` (space-separated, no spaces in names) or verbose `cat:`/`route:` pairs (comma-separated, names may contain spaces). A route value is `name#seq` (e.g. `@day1#2` or `route: day1#2`), where the `#seq` suffix sets the ordering. Points with both `route` and `seq` are grouped by `buildRoutes` (parser.ts, pure + tested) into ordered `MapRoute`s and rendered as a polyline with numbered `divIcon` markers and direction arrows (rotated `divIcon` at each segment midpoint — no extra Leaflet plugin); route color comes from the same shared color resolver (key = route name). Also marks matching inline `geo:` tokens elsewhere in the note as clickable links (`.cext-coords-link`) that recenter the map via a `cext-map-fly` CustomEvent. Has no `aggregator.ts` (parser → renderer directly; `buildRoutes` lives in parser.ts).

**Code block naming**: `cext-<module>-<view>` — e.g. `cext-finances-chart`, `cext-finances-table`, `cext-trainings-chart`, `cext-trainings-body`. Single-view modules drop the `-<view>` suffix (`cext-map`). The `cext-` prefix scopes to this plugin and avoids collisions with other plugins' processors.

**Key flow**:
1. Module's `index.ts` registers code block processors with `plugin.registerMarkdownCodeBlockProcessor(name, handler)`.
2. Handler reads the containing file via `app.vault.read`, parses it, hands data to renderer.
3. `vault.on('modify')` re-renders on file changes; an element-level flag (`__financeWatched` / `__trainingsWatched` / `__mapWatched`) prevents duplicate listeners.
4. Chart.js instance stored on element as `__chartInstance` (map: `__mapInstance`) and destroyed before re-create (avoids memory leak).

**Element state**: transient per-element state (chart/map instances, watcher flags, observers) is read/written via `getElementState<T>(el, key)` / `setElementState(el, key, value)` from `src/shared/elementState.ts` — one typed cast in one place instead of `(el as any).__whatever` scattered across renderers. Use these rather than direct property access.

**Map lifecycle**: unlike finances/trainings (which rely on the `__*Watched` flag + `vault.on('modify')`), the map module ties cleanup to a `MarkdownRenderChild` added via `ctx.addChild`. Its `onunload` (fired when the note closes or the section re-renders) disconnects the `MutationObserver`, clears the state flags, and calls `destroyMap`. The modify-listener is registered on the child via `child.registerEvent`, and the click-to-recenter handler is one delegated `registerDomEvent(document, 'click', …)` for all geo tokens.

**Shared categories parser**: All three modules call `parseCategories` from `src/shared/parseCategories.ts`. It scans for `## Categories` or `## Kategorie` (override with `{ headings: [...] }`), reads `**group:**` markers and `- name: #color` lines, and returns `CategoriesConfig` (`colorsMap`, `groupCats`, `groupOrder`). The parser is generic — no module-specific post-processing.

**Shared color resolver**: `parseCategories.ts` also exports `makeColorResolver(config): ColorResolver` — a *stateful* factory. Returned function looks up `colorsMap[key]` first; for unknown keys it assigns the next color from `FALLBACK_PALETTE` and caches it (same unknown key returns the same color on repeat calls within one resolver instance). Use **one resolver per render** and share it between legend + datasets so colors stay consistent across legend and chart.

**Shared color legend**: `src/shared/colorLegend.ts` exports `renderColorLegend(config, resolver?)` — returns a legend `HTMLElement`. If `groupOrder` is non-empty it draws one section per group; otherwise it draws a single flat section from `colorsMap`. Pass the same resolver instance you use for chart datasets to keep colors aligned. Also exports `renderLegendSection(items, title?)` and `renderLegendItem(label, color)` as building blocks so modules can append extra sections/items (e.g. finances appends `other`/`savings`/`net income` after the generic legend; map builds its legend from the categories actually present on the map).

**Finances post-processing**: `finances/parser.ts` exports `filterCategories(config)` which drops the `**special:**` group from `groupCats`/`groupOrder` while keeping its colors. The `**special:**` group holds `savings`, `net income`, and `other` — labels that the renderer draws as their own datasets (own bar, line overlay, "unallocated income" bar), so they must not be re-rendered as regular categories. `finances/index.ts` composes: `filterCategories(parseCategories(content))`.

**Finances parser detail** (`parseMonths`): Dynamically detects list indentation (first `-` after section), expects nested items at `itemIndent + 4` spaces. Handles tabs, multi-value items (`item 100, other 200`), and nested structures. Negative values are supported (e.g. `savings: -200` means a withdrawal). The chart renders a red overlay box on the net income line to indicate the withdrawal amount.

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
**special:**
- savings:    #2ca02c
- net income: #2ca02c
- other:      #b0b0b0
```

The `**special:**` group is finances-only convention: holds labels that the chart renders as derived datasets (savings bar, net income line, "other" = unallocated income). They need a color defined here but are dropped from regular `cats`/`groupCats` by `filterCategories` (otherwise they'd be drawn twice).

### 2026-05
- income:
  - wynagrodzenie: 1000
- taxes:
  - PIT: 100
- savings:
  - ETF: 100         # positive: money saved
  - konto: -200      # negative: withdrawal from savings
- expenses:
  - mieszkanie: 100
  - transport:
    - paliwo: 50
```

**Map** — geo tokens anywhere in the note (heading or list item); the name is the text before the token. The tail is optional and comes in two equivalent forms: terse sigils `#category @route#seq` (no spaces in names) or verbose `cat:`/`route:` pairs (names may contain spaces). Category falls back to the nearest preceding heading.

```markdown
## Italy
- Roma `geo: 41.9028, 12.4964 #city`              # sigil form
- Vesuvio `geo: 40.821, 14.426, cat: nature`      # verbose form
- Rynek `geo: 50.06, 19.94, cat: stare miasto`    # verbose allows spaces in the name

## Day trip          # points sharing a route connect in seq order
- Stop 1 `geo: 41.9028, 12.4964 @day1#1`
- Stop 2 `geo: 41.890, 12.492 @day1#2`
```

## TypeScript

Strict mode enabled. `baseUrl: src` allows clean imports.

## Common Tasks

**Add category group**: Edit `## Categories` in markdown, add `**group:**` + `- name: #color`. Parser auto-detects.

**Add a new module**: Mirror `src/modules/finances/`, `src/modules/trainings/`, or (for a non-chart, single-view module) `src/modules/map/` — same file shape. Import `parseCategories` and `CategoriesConfig` from `src/shared/parseCategories.ts` rather than defining your own, and `getElementState`/`setElementState` from `src/shared/elementState.ts` for any per-element state. Add module-specific post-processing (analogous to `filterCategories`) only when needed. Register the module class in `src/main.ts` `onload()`.

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
Don't carry data that can be derived from another field. Example: a flat `cats: string[]` alongside `groupCats: Record<string, string[]>` is redundant — `Object.values(groupCats).flat()` (or `groupOrder.flatMap((g) => groupCats[g])`) gives the same list in the same order. Derive at the call site instead.

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
