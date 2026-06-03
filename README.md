# Obsidian Custom Extensions

Personal toolkit for Obsidian (https://obsidian.md) that renders charts and maps directly from Markdown. Data lives in your notes as plain Markdown; the plugin parses it and draws the result inside fenced code blocks.

Three modules — see each module's README for code blocks, data format, and usage:

- **[Finances](src/modules/finances/README.md)** — monthly income / taxes / savings / expenses → an HTML table and a Chart.js stacked bar chart.
- **[Trainings](src/modules/trainings/README.md)** — training log and body metrics → a per-week stacked bar chart (hours × category) and a line chart for body metrics (`kg`, `PBF`, …).
- **[Map](src/modules/map/README.md)** — `geo:` coordinate tokens scattered through a note → a Leaflet map with one colored marker per location, plus clickable inline coordinates that recenter the map.

All three modules share one color scheme defined in a `## Categories` (or `## Kategorie`) block, so legends and markers stay consistent.

## Development

Uses [Bun](https://bun.sh) and esbuild.

```bash
bun install     # Install dependencies
bun run dev     # Compile in watch mode
bun run build   # Production build (type-check + bundle)
bun test        # Run tests (bun:test)
bun run lint    # ESLint
```

Reload in Obsidian after building: Settings → Community Plugins → toggle the plugin off/on, or `Cmd+R` with the Hot-Reload plugin.

## Installing manually

Copy `main.js`, `styles.css`, and `manifest.json` into `VaultFolder/.obsidian/plugins/cext/`, then enable the plugin in Obsidian's settings.

## Releasing

- Bump the version in `manifest.json` (and `minAppVersion`), then run `bun run version` to sync `package.json` / `versions.json`.
- Create a GitHub release tagged with the exact version (no `v` prefix) and attach `manifest.json`, `main.js`, and `styles.css`.

## API documentation

See https://docs.obsidian.md
