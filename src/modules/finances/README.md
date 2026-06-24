# Finances Module

## Description
Manages finances in Obsidian — renders monthly data (income, taxes, savings, expenses) as an HTML table (`cext-finances-table`) and a chart (`cext-finances-chart`). The chart has two tabbed views: **Miesiące** (stacked bar per month + net income line) and **Rok** (horizontal bar summing savings / each expense category / other across all months). The "Rok" view has its own toggle for sort order — **Aktualne** (sort by past-months value only) vs **Aktualne + prognoza** (sort by the full past+future total); the choice is persisted plugin-wide (see settings.ts). Each "Rok" bar is split into a past-months segment and a current-and-future-months segment (the latter in a lighter shade of the category's color), based on today's date. The `**special:**` category group (savings / net income / other) holds the colors of labels the chart draws as their own series, so they aren't rendered as regular categories.

## Implementation notes
- `filterCategories(config)` (parser.ts) drops the `**special:**` group from `groupCats`/`groupOrder` while keeping its colors — those labels are drawn as derived datasets (savings bar, net income line, "other" = unallocated income), so they must not be re-rendered as regular categories. `index.ts` composes `filterCategories(parseCategories(content))`.
- `parseMonths` dynamically detects list indentation (first `-` after a section) and expects nested items at `itemIndent + 4` spaces. Handles tabs, multi-value items (`item 100, other 200`), and nested structures.
- Negative values are supported (`savings: -200` = withdrawal); the chart renders a red overlay box on the net income line for the withdrawal amount.
- `financesChart.ts` is the self-contained chart feature behind one entry point, `createFinancesChartRenderer(plugin)` (registered for `cext-finances-chart`); it also exports `destroyFinancesChart` (called from `index.ts`'s `onunload`). It loads persisted settings once (cached so repaints stay synchronous), re-renders in place when a view writes a setting (`onSettingsChange(partial)` → `saveFinancesSettings` + repaint), owns the active-tab state (`__financeView` element state), and draws the tab bar (shared `renderTabBar` from `src/shared/tabBar.ts`), delegating to `plotMonth.ts`/`plotYear.ts` for the active view. The chart-holding content div is tagged with the `cext-finances-content` class so `destroyFinancesChart` can find it via `querySelector` and destroy the previous Chart.js instance — independent of where it sits among `el`'s children, so adding more DOM around the chart later won't break cleanup.
- `settings.ts` persists module settings (`FinancesSettings`) via the plugin's own `loadData`/`saveData`, namespaced under a top-level `finances` key in `data.json` so other modules can add their own. `loadFinancesSettings` fills missing fields from `DEFAULT_SETTINGS`; `saveFinancesSettings` takes a partial and merges it, preserving sibling keys. Settings are plugin-wide, not per-note. Currently just `yearSortMode` (the "Rok" sort order).
- `table.ts` only renders the HTML table (`renderTable`). Each chart view owns its own file: `plotMonth.ts` (stacked bar + net income line + the savings-withdrawal overlay plugin) and `plotYear.ts` (the "Rok" horizontal bar, including `aggregateYearSummary` — the data transform behind it, unit-tested in `plotYear.test.ts` without a canvas).
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
