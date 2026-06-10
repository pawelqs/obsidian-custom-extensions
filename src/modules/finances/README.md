# Finances Module

## Description
Manages finances in Obsidian — renders monthly data (income, taxes, savings, expenses) as an HTML table (`cext-finances-table`) and a stacked bar chart (`cext-finances-chart`). The `**special:**` category group (savings / net income / other) holds the colors of labels the chart draws as their own series, so they aren't rendered as regular categories.

## Implementation notes
- `filterCategories(config)` (parser.ts) drops the `**special:**` group from `groupCats`/`groupOrder` while keeping its colors — those labels are drawn as derived datasets (savings bar, net income line, "other" = unallocated income), so they must not be re-rendered as regular categories. `index.ts` composes `filterCategories(parseCategories(content))`.
- `parseMonths` dynamically detects list indentation (first `-` after a section) and expects nested items at `itemIndent + 4` spaces. Handles tabs, multi-value items (`item 100, other 200`), and nested structures.
- Negative values are supported (`savings: -200` = withdrawal); the chart renders a red overlay box on the net income line for the withdrawal amount.

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
