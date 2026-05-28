# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Quick Start

Obsidian plugin (TypeScript, bun/esbuild) with Finances Module: parses markdown financial data → renders HTML table + Chart.js stacked bar chart.

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

## Testing

```bash
bun test src/modules/finances/parser.test.ts      # Specific test
bun test --watch                                   # Watch mode
```

Uses bun:test (built-in). Test data in `test/data/test.md`. Tests cover `parseCategories()` and `parseMonths()` logic.

## TypeScript

Strict mode enabled. `baseUrl: src` allows clean imports. All undefined cases have proper guards.

## Common Tasks

**Add category group**: Edit `## Categories` in markdown, add `**group:**` + `- name: #color`. Parser auto-detects.

**Debug parser**: Add `console.log()` in `parseMonths()`, run `bun run dev`, check Obsidian console (F12).

**Modify chart**: Edit `renderer.ts` `renderChart()` — change chart type, stack options, line styling.

**Add code block processor**: Register in `index.ts` `register()` with `plugin.registerMarkdownCodeBlockProcessor()`.

## Troubleshooting

**Chart not updating**: Verify `vault.on('modify')` registered via `registerEvent()` in index.ts, check `__financeWatched` flag.

**Parser wrong values**: Log indentation detection in `parseMonths()`. Verify markdown uses spaces (not mixed tabs).

**Memory leak**: Confirm Chart instance destroyed before re-creating in `renderChart()`.

**Type errors**: Run `bun run build` for full errors. Check `tsconfig.json` strict settings.
