# Finances Module

## Description
Manages finances in Obsidian — renders monthly data (income, taxes, savings, expenses) as an HTML table (`cext-finances-table`) and a chart (`cext-finances-chart`). The chart has two tabbed views: **Miesiące** (stacked bar per month + net income line) and **Rok** (a yearly summary of savings / each expense category / other across all months). The "Rok" view has two side-by-side toggles: a **chart-type** toggle (**Słupki** horizontal stacked bar / **Kołowy** pie) and an **Aktualne** / **Aktualne + prognoza** toggle. The latter drives both charts — for **Słupki** it picks the sort order (sort by past-months value only vs by the full past+future total), and for **Kołowy** it flattens the two segments into the slice value (`pastValue` alone vs `pastValue + currentValue`). Both toggles persist plugin-wide (`yearChartType`, `yearSortMode`; see settings.ts). Each "Słupki" bar is split into a past-months segment and a current-and-future-months segment (the latter in a lighter shade of the category's color), based on today's date; "Kołowy" can't show negatives, so it drops non-positive entries. The `**special:**` category group (savings / net income / other) holds the colors of labels the chart draws as their own series, so they aren't rendered as regular categories.

## Implementation notes
- `filterCategories(config)` (parser.ts) drops the `**special:**` group from `groupCats`/`groupOrder` while keeping its colors — those labels are drawn as derived datasets (savings bar, net income line, "other" = unallocated income), so they must not be re-rendered as regular categories. `index.ts` composes `filterCategories(parseCategories(content))`.
- `parseMonths` dynamically detects list indentation (first `-` after a section) and expects nested items at `itemIndent + 4` spaces. Handles tabs, multi-value items (`item 100, other 200`), and nested structures.
- Negative values are supported (`savings: -200` = withdrawal); the chart renders a red overlay box on the net income line for the withdrawal amount.
- `financesChart.ts` is the self-contained chart feature behind one entry point, `createFinancesChartRenderer(plugin)` (registered for `cext-finances-chart`); it also exports `destroyFinancesChart` (called from `index.ts`'s `onunload`). It loads persisted settings once (cached so repaints stay synchronous), re-renders in place when a view writes a setting (`onSettingsChange(partial)` → `saveFinancesSettings` + repaint), owns the active-tab state (`__financeView` element state), and draws the tab bar (shared `renderTabBar` from `src/shared/tabBar.ts`), delegating to `plotMonth.ts`/`plotYear.ts` for the active view. The chart-holding content div is tagged with the `cext-finances-content` class so `destroyFinancesChart` can find it via `querySelector` and destroy the previous Chart.js instance — independent of where it sits among `el`'s children, so adding more DOM around the chart later won't break cleanup.
- `settings.ts` persists module settings (`FinancesSettings`) via the plugin's own `loadData`/`saveData`, namespaced under a top-level `finances` key in `data.json` so other modules can add their own. `loadFinancesSettings` fills missing fields from `DEFAULT_SETTINGS`; `saveFinancesSettings` takes a partial and merges it, preserving sibling keys. Settings are plugin-wide, not per-note: `yearChartType` (the "Rok" Słupki/Kołowy toggle) and `yearSortMode` (the shared sort-order / actuals-vs-total toggle).
- `table.ts` only renders the HTML table (`renderTable`). Each chart view owns its own file: `plotMonth.ts` (stacked bar + net income line + the savings-withdrawal overlay plugin) and `plotYear.ts` (the whole "Rok" view). `plotYear.ts` exports `renderYearView`, which draws the two toggles (chart type + actuals/forecast) and the shared `aggregateYearSummary` (the data transform, unit-tested in `plotYear.test.ts` without a canvas), then delegates to its internal `renderYearBar` (stacked horizontal bar, both segments) or `renderYearPie` (pie). In **Aktualne** mode the pie is one slice per category (its `pastValue`); in **Aktualne + prognoza** each category becomes two adjacent slices — actuals in the base color and the forecast (`currentValue`) in a lighter shade (`lightenColor(base, FUTURE_LIGHTEN)`, the same split the bar uses). Each part is kept only when positive (a pie can't show negatives, e.g. a net-negative savings withdrawal). The pie also appends a color legend since, unlike the bar, it has no axis labels. Both charts share one `makeColorResolver` per render.
- All chart views build their canvas via the shared `createChartCanvas(el, height)` (`src/shared/chartCanvas.ts`) — creates the `.cext-chart-container` (fixed pixel height) holding a fresh canvas. Used by `plotMonth.ts`, `plotYear.ts`, and trainings' `renderer.ts`.
- `aggregateYearSummary(months, config, now?, sortBy?)` splits each entry into `pastValue` (months before `now`'s month) and `currentValue` (`now`'s month and later), compared as `YYYY-MM` strings so lexicographic comparison matches chronological order. `sortBy` (`'actuals'` | `'total'`, default `'total'`) picks the descending sort key — `pastValue` alone vs `pastValue + currentValue`. `now` defaults to `new Date()` but is an explicit parameter so the split is testable without mocking the clock. The chart draws both as one stacked bar per category; `lightenColor()` (`src/shared/colors.ts`) derives the current/future color from the category's own color.
- "savings" is computed differently per view by design: `plotMonth.ts` clamps each month to `Math.max(0, m.savings)` (withdrawals are shown separately via the red overlay box), while `plotYear.ts` sums the raw `m.savings` so a withdrawal nets against the total instead of being ignored.

## Example
A complete note: the render blocks (optional `height` in pixels), the `## Categories` color definitions, and sample monthly data.

````markdown

```cext-finances-table
```

```cext-finances-chart
height: 500
```

### 2026-05
- income:
  - salary: 1000
- taxes:
  - income tax: 100
- savings:
  - ETF: 100         # positive: money saved
  - account: -200    # negative: withdrawal from savings
- expenses:
  - housing: 100
  - transport:
    - fuel: 50


## Categories
**must:**
- housing: #1f77b4
**wants:**
- transport: #55d4e0
**special:**
- savings:    #2ca02c
- net income: #2ca02c
- other:      #b0b0b0
````
