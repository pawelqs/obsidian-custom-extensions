# Finances Module

## Description
Manages finances in Obsidian — renders monthly data (income, taxes, savings, expenses) as an HTML table (`cext-finances-table`) and a stacked bar chart (`cext-finances-chart`). The `**special:**` category group (savings / net income / other) holds the colors of labels the chart draws as their own series, so they aren't rendered as regular categories.

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
