# Map Module

## Description
Renders a map in Obsidian — scans the note for `geo:` tokens and draws a Leaflet map (`cext-map`) with a colored marker per location. The name is the text before the token; the category is optional and defaults to the nearest preceding heading. Inline `geo:` tokens elsewhere in the note become clickable links that recenter the map on that point.

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
````
