# Map Module

## Description
Renders a map in Obsidian — scans the note for `geo:` tokens and draws a Leaflet map (`cext-map`) with a colored marker per location. The name is the text before the token; the category is optional and defaults to the nearest preceding heading. Inline `geo:` tokens elsewhere in the note become clickable links that recenter the map on that point.

The geo token accepts an optional tail after the coordinates, in either of two equivalent forms:

**Sigils** (terse, space-separated — names cannot contain spaces, use kebab-case):
- `#<category>` — color/legend category.
- `@<name>#<n>` — assign the point to route `<name>` at position `n`.

```markdown
- Roma `geo: 41.9028, 12.4964 #city @day1#1`
```

**Verbose** (`key: value`, comma-separated — names may contain spaces):
- `cat: <category>` — color/legend category.
- `route: <name>#<n>` — same as `@<name>#<n>`.

```markdown
- Roma `geo: 41.9028, 12.4964, cat: city, route: day1#1`
```

In both forms the category falls back to the nearest preceding heading. Points sharing a route are connected into a polyline in ascending `#<n>` order, drawn as numbered markers with direction arrows. A route's color comes from the shared `## Categories` resolver (define `- <name>: #color` to pick it; otherwise a fallback palette color is assigned). The `#<n>` sequence is required for a point to join the route — a route without it is ignored when drawing the path.

## Example
A complete note: the render block (optional `height` in pixels), the `## Categories` color definitions, and sample locations.

````markdown
```cext-map
height: 400
```

## Categories
- city:    #1f77b4
- nature:  #43a047

## Italy
- Roma `geo: 41.9028, 12.4964, cat: city`
- Vesuvio `geo: 40.821, 14.426, cat: nature`

## Day trip
- Stop 1 `geo: 41.9028, 12.4964, route: day1#1`
- Stop 2 `geo: 41.890, 12.492, route: day1#2`
- Stop 3 `geo: 41.876, 12.481, route: day1#3`
````
