# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Quick Start

Obsidian plugin (TypeScript, bun/esbuild) with four modules: **Finances** (markdown finance data → HTML table + Chart.js stacked bar), **Trainings** (markdown training/body data → stacked bar per-week + line chart for body metrics), **Map** (markdown `geo:` tokens → Leaflet map with clickable inline coords), and **Sum Weights** (inline `Σ` weight subtotals on lists under a `#sum-weights` heading).

```bash
bun run dev      # Watch mode
bun run build    # Production build
bun test         # Run tests (bun:test framework)
bun run lint     # Lint code
```

**After making code changes, always run `bun run build`** (it runs `tsc -noEmit` + esbuild) to confirm the change compiles and bundles before considering the task done. Run `bun run lint` and the relevant `bun test` too when the change warrants it.

Reload in Obsidian: Settings → Community Plugins → Disable/Enable cext, or Cmd+R with Hot-Reload.

**Shell usage**: Don't prefix commands with `cd` into the project directory. The shell already runs in the project root, and a `cd` inside a compound command (`cd … && …`) triggers an extra permission prompt. Use absolute paths or relative paths from the project root instead. For the same reason, avoid `git -C <path> …` — the `-C` flag hides the subcommand from Claude Code's read-only detection, so even read-only git commands prompt. Run plain `git status` / `git ls-files` etc. from the project root.

## Architecture

**Module structure**:
```
src/
  main.ts                       # Plugin entry, registers all modules
  shared/
    parseCategories.ts          # Shared parser for ## Categories / ## Kategorie blocks; returns CategoriesConfig
    parseCategories.test.ts
    colorLegend.ts              # Generic legend renderer driven by CategoriesConfig (grouped or flat)
    elementState.ts             # Typed get/setElementState — one place for the el-state cast
    chartInstance.ts            # set/destroyChart for the Chart.js instance kept on the element; owns the '__chartInstance' key
    chartCanvas.ts              # createChartCanvas(el, height) — the .cext-chart-container + canvas scaffold shared by finances/trainings renderers
    chunkConfig.ts              # Shared ChunkConfig { height } interface
  modules/<module>/
    # almost always present:
    README.md                   # Module docs: user-facing data format + implementation notes
    parser.ts                   # Pure markdown → domain data (testable without DOM/canvas)
    parser.test.ts              # Tests (bun:test)
    index.ts                    # Module class: only the wiring to Obsidian APIs (processors, watchers)
    # the rest is per-module — add whatever files fit the module's shape:
    renderer.ts                 # Thin DOM/Chart.js/Leaflet layer, when one render function covers the module
    types.ts                    # When the module has domain interfaces (categories config comes from shared)
    <view>.ts                   # When a module has multiple independent chart views, one file per view can hold both its data shaping and its rendering (e.g. finances' plotMonth.ts/plotYear.ts) instead of forcing a shared renderer.ts + aggregator.ts split
    <feature>.ts                # Self-contained sub-feature behind one exported entry point (e.g. sum-weights' weightsPie.ts, annotationsWatcher.ts, finances' financesChart.ts)
    testdata/test.txt           # When tests need realistic input, imported as a plain string
```

What matters is the role separation (pure parsing / wiring stay separate from rendering and from each other), not a fixed file list. Each module picks the split that fits its own shape — parser.ts and index.ts are the only files every module is expected to have; everything else (one renderer vs. several view-specific files, a shared aggregator vs. data shaping inlined per view) is a per-module choice. sum-weights has no code block at all and finances splits its chart into `plotMonth.ts`/`plotYear.ts` instead of one `renderer.ts` — both still fit the same role separation.

**Modules** (each module's `README.md` is the source of truth for its data format, options, and implementation notes — read it before working on the module):
- **finances** — code blocks `cext-finances-chart` (tabbed: monthly stacked bar in `plotMonth.ts`, year summary in `plotYear.ts` with its own chart-type toggle for horizontal bar vs pie; tab switching + persisted settings owned by `financesChart.ts`, settings storage in `settings.ts`) and `cext-finances-table` (HTML table, `table.ts`). Parses `## Categories` and `### YYYY-MM` blocks with `income`/`taxes`/`savings`/`expenses` sections.
- **trainings** — code blocks `cext-trainings-chart` (stacked bar of hours per week × category) and `cext-trainings-body` (line chart of body metrics like `kg`, `PBF`). Parses `## Kategorie` and `## Data` with `- YYYY-MM-DD` daily entries.
- **map** — single code block `cext-map` (Leaflet map). Scans the whole note for `` `geo: …` `` tokens, drops a colored marker per location, connects route points into polylines, and turns inline geo tokens into click-to-recenter links. No `aggregator.ts` (parser → renderer directly).
- **sum-weights** — no code block: a Markdown post-processor (`registerMarkdownPostProcessor`). When a heading carries `#sum-weights`/`#suma-wag`, list items under it get inline `Σ <n>g` subtotal badges plus a grand-total row. The exception to the code-block pattern below.

**Code block naming**: `cext-<module>-<view>` — e.g. `cext-finances-chart`, `cext-finances-table`, `cext-trainings-chart`, `cext-trainings-body`. Single-view modules drop the `-<view>` suffix (`cext-map`). The `cext-` prefix scopes to this plugin and avoids collisions with other plugins' processors.

**Key flow** (code-block modules; sum-weights is a post-processor instead):
1. Module's `index.ts` registers code block processors with `plugin.registerMarkdownCodeBlockProcessor(name, handler)`.
2. Handler reads the containing file via `app.vault.cachedRead`, parses it, hands data to renderer.
3. `vault.on('modify')` re-renders on file changes; an element-level `__<module>Watched` flag prevents duplicate listeners.
4. Chart.js instance stored on element as `__chartInstance` (map: `__mapInstance`) and destroyed before re-create (avoids memory leak).

**Element state**: transient per-element state (chart/map instances, watcher flags, observers) is read/written via `getElementState<T>(el, key)` / `setElementState(el, key, value)` from `src/shared/elementState.ts` — one typed cast in one place instead of `(el as any).__whatever` scattered across renderers. Use these rather than direct property access.

**Map lifecycle**: unlike finances/trainings (which rely on the `__*Watched` flag + `vault.on('modify')`), the map module ties cleanup to a `MarkdownRenderChild` added via `ctx.addChild`. Its `onunload` (fired when the note closes or the section re-renders) disconnects the `MutationObserver`, clears the state flags, and calls `destroyMap`. The modify-listener is registered on the child via `child.registerEvent`, and the click-to-recenter handler is one delegated `registerDomEvent(document, 'click', …)` for all geo tokens.

**Shared categories parser**: finances, trainings, and map call `parseCategories` from `src/shared/parseCategories.ts`. It scans for `## Categories` or `## Kategorie` (override with `{ headings: [...] }`), reads `**group:**` markers and `- name: #color` lines, and returns `CategoriesConfig` (`colorsMap`, `groupCats`, `groupOrder`). The parser is generic — no module-specific post-processing.

**Shared color resolver**: `parseCategories.ts` also exports `makeColorResolver(config): ColorResolver` — a *stateful* factory. Returned function looks up `colorsMap[key]` first; for unknown keys it assigns the next color from `FALLBACK_PALETTE` and caches it (same unknown key returns the same color on repeat calls within one resolver instance). Use **one resolver per render** and share it between legend + datasets so colors stay consistent across legend and chart.

**Shared color legend**: `src/shared/colorLegend.ts` exports `renderColorLegend(config, resolver?)` — returns a legend `HTMLElement`. If `groupOrder` is non-empty it draws one section per group; otherwise it draws a single flat section from `colorsMap`. Pass the same resolver instance you use for chart datasets to keep colors aligned. Also exports `renderLegendSection(items, title?)` and `renderLegendItem(label, color)` as building blocks so modules can append extra sections/items (e.g. finances appends `other`/`savings`/`net income` after the generic legend; map builds its legend from the categories actually present on the map).

**Module-specific post-processing of categories**: a module may wrap `parseCategories` when it needs to adjust the generic result — the model is `finances/parser.ts` `filterCategories(config)`, which drops the `**special:**` group (labels the chart draws as derived datasets) from `groupCats`/`groupOrder` while keeping its colors; `finances/index.ts` composes `filterCategories(parseCategories(content))`.

## Data Format

User-facing data formats and examples live in each module's `README.md` (`src/modules/<module>/README.md`) — that's the single source of truth; don't duplicate them here.

## TypeScript

Strict mode enabled. `baseUrl: src` allows clean imports.

## Common Tasks

**Add category group**: Edit `## Categories` in markdown, add `**group:**` + `- name: #color`. Parser auto-detects.

**Add a new module**: Mirror `src/modules/finances/`, `src/modules/trainings/`, or (for a non-chart, single-view module) `src/modules/map/` — core files always, optional ones only when needed (see **Module structure**). Import `parseCategories` and `CategoriesConfig` from `src/shared/parseCategories.ts` rather than defining your own, and `getElementState`/`setElementState` from `src/shared/elementState.ts` for any per-element state. Add module-specific post-processing (analogous to `filterCategories`) only when needed. Register the module class in `src/main.ts` `onload()`. Write the module's `README.md` (description, data format, example) and add the module to the lists in this file (Quick Start + **Modules**).

**Keep docs in sync**: when a change alters a module's user-facing format, options, or architecture, update that module's `README.md` in the same change — and CLAUDE.md if a cross-module invariant changed.

## Conventions

### Function ordering (within a file)
Consts first, then exported functions, helpers below — readers see the public API first. When a helper is only called from one function, put it directly under that function. Use `function` declarations (not `const f = () => ...`) so hoisting handles forward references. Module-level constants used by multiple exports stay near the top of the file; per-function helpers go below.

### Pure functions over mutation
Prefer functions that take input and return a value over functions that mutate their arguments by reference. Example: `parseInline(content) → { body, trainings }` instead of `parseInline(content, day)` mutating `day`. Pure functions are easier to test (no need for setup helpers like `emptyDay()`), easier to read (no aliasing surprises), and parallel to sibling helpers (`parseBodyItems`, `parseTrainingItems`) already return values.

Exception: when the imperative version is genuinely clearer (e.g. nested aggregation with a local accumulator), keep it — but isolate the mutation in a small scope.

### Separation of data shaping vs rendering
Keep the data transform separable from the Chart.js calls — as its own exported function, testable without a canvas — even when it lives in the same file as the render call. Whether that function sits in a shared `aggregator.ts` (trainings: one transform feeds one renderer) or alongside its render function in a view-specific file (finances: `plotYear.ts` exports both `aggregateYearSummary` and `renderYearView`) is a per-module call — pick whichever keeps the render call reading top-to-bottom as "take aggregate → hand to Chart.js" without forcing an extra file for a module that doesn't need one.

### Self-contained feature files
A sub-feature inside a module gets its own file behind a single exported entry-point function; everything else in the file (helper classes, internal functions) stays unexported. Models in sum-weights: `weightsPie.ts` — exports only `openWeightsPie(app, title, sectionEl)`, which gathers its own data and opens the private `WeightsPieModal`; `annotationsWatcher.ts` — exports only `annotateAndWatch(el, ctx, onTotalClick)` and owns the whole re-apply lifecycle (MutationObserver, debounce, `MarkdownRenderChild` teardown, its element-state keys). Lifecycle machinery counts as a feature too — it should not accumulate in `index.ts`. `index.ts` stays pure wiring: gates plus one-liner handlers delegating to feature files (sum-weights' `index.ts` is the model). A feature can then be added, replaced, or removed by touching one file plus one import.

Corollary — no parameter drilling: don't thread raw dependencies (`app`, `title`, config) through intermediate functions just to assemble a callback at the bottom of the call chain. Build the callback at the level that already has the dependencies and pass the ready function down; intermediate functions take exactly what they use.

### Comments and docs
- Default to no comments. Only add when *why* is non-obvious.
- For struct fields, pick *one* style consistently: brief description above the interface, OR trailing `// comment` per field. Not both, not per-field JSDoc above each line (visually noisy).
- One-line `/** */` above an exported function is fine when it adds something the name doesn't.

### Avoiding redundant fields
Don't carry data that can be derived from another field. Example: a flat `cats: string[]` alongside `groupCats: Record<string, string[]>` is redundant — `Object.values(groupCats).flat()` (or `groupOrder.flatMap((g) => groupCats[g])`) gives the same list in the same order. Derive at the call site instead.

### Naming
Prefer descriptive names that say what the value *is*, not how it's built. `dailyData: DailyData[]` reads better than `days: DayData[]`; `aggregateTrainings` reads better than `aggregateByWeek`. The cost of a rename is one find/replace; the cost of a cryptic name compounds with every reader.

### Styling
Static CSS goes under `.cext-*` prefixed classes; apply via `el.classList.add(...)`. Inline styles only for dynamic values that change per-render (e.g. `container.style.height = '${height}px'` where height comes from the code block config). Don't sprinkle inline `border`/`padding`/`fontWeight` — move it to a class.

CSS can be split per module. Obsidian loads only the single root `styles.css`, but esbuild bundles `src/styles.css` (a `bundle: true` entry point), so module-specific rules live in `src/modules/<module>/<module>.css` and are pulled in via an `@import` at the top of `src/styles.css` (all `@import`s must precede any rule). Shared classes used by more than one module — legend (`.cext-legend-*`), tabs (`.cext-tabs`/`.cext-tab`, the `tabBar` component), `.cext-chart-container` — stay in `src/styles.css`. Currently only **finances** is split out (`modules/finances/finances.css`: `.cext-table*`, `.cext-year-controls`, `.cext-pie-body*`); other modules' rules still live in `src/styles.css`.

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
