# Finances Module

## Description
Manages finances in Obsidian — renders monthly data (income, taxes, savings, expenses) as an HTML table (`cext-finances-table`) and a chart (`cext-finances-chart`). The chart has two tabbed views: **Miesiące** (stacked bar per month + net income line) and **Rok** (horizontal bar summing savings / each expense category / other across all months, sorted descending). Each "Rok" bar is split into a past-months segment and a current-and-future-months segment (the latter in a lighter shade of the category's color), based on today's date. The `**special:**` category group (savings / net income / other) holds the colors of labels the chart draws as their own series, so they aren't rendered as regular categories.

## Implementation notes
- `filterCategories(config)` (parser.ts) drops the `**special:**` group from `groupCats`/`groupOrder` while keeping its colors — those labels are drawn as derived datasets (savings bar, net income line, "other" = unallocated income), so they must not be re-rendered as regular categories. `index.ts` composes `filterCategories(parseCategories(content))`.
- `parseMonths` dynamically detects list indentation (first `-` after a section) and expects nested items at `itemIndent + 4` spaces. Handles tabs, multi-value items (`item 100, other 200`), and nested structures.
- Negative values are supported (`savings: -200` = withdrawal); the chart renders a red overlay box on the net income line for the withdrawal amount.
- `chartTabs.ts` is the self-contained tab feature: it exports `renderFinancesChart` (registered for `cext-finances-chart`) and `destroyFinancesChart` (called from `index.ts`'s `onunload`). It owns the active-tab state (`__financeView` element state) and draws the tab bar, delegating to `plotMonth.ts`/`plotYear.ts` for the active view. The chart-holding content div is tagged with the `cext-finances-content` class so `destroyFinancesChart` can find it via `querySelector` and destroy the previous Chart.js instance — independent of where it sits among `el`'s children, so adding more DOM around the chart later won't break cleanup.
- `table.ts` only renders the HTML table (`renderTable`). Each chart view owns its own file: `plotMonth.ts` (stacked bar + net income line + the savings-withdrawal overlay plugin) and `plotYear.ts` (the "Rok" horizontal bar, including `aggregateYearSummary` — the data transform behind it, unit-tested in `plotYear.test.ts` without a canvas).
- `aggregateYearSummary(months, config, now?)` splits each entry into `pastValue` (months before `now`'s month) and `currentValue` (`now`'s month and later), compared as `YYYY-MM` strings so lexicographic comparison matches chronological order. `now` defaults to `new Date()` but is an explicit parameter so the split is testable without mocking the clock. The chart draws both as one stacked bar per category; `lightenColor()` (`src/shared/colors.ts`) derives the current/future color from the category's own color.
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
