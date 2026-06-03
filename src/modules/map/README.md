# Map Module

## Description
Renders a map in Obsidian — scans the note for `geo:` tokens and draws a Leaflet map (`cext-map`) with a colored marker per location. The name is the text before the token; the category is optional and defaults to the nearest preceding heading. Inline `geo:` tokens elsewhere in the note become clickable links that recenter the map on that point.

The geo token accepts optional `key: value` fields in any order after the coordinates:
- `cat: <category>` — color/legend category (falls back to the nearest heading).
- `route: <name>#<n>` — assign the point to a named route at position `n`. Points sharing a route `<name>` are connected into a polyline in ascending `#<n>` order, drawn as a numbered marker with direction arrows. A route's color comes from the shared `## Categories` resolver (define `- <name>: #color` to pick it; otherwise a fallback palette color is assigned). The `#<n>` is required for a point to join the route — `route: <name>` without it is ignored when drawing the path.

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
