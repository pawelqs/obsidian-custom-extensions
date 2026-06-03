# Trainings Module

## Description
Tracks trainings and body metrics in Obsidian — renders a per-week stacked bar of training time per category (`cext-trainings-chart`) and a line chart of body metrics like `kg` and `PBF` (`cext-trainings-body`).

## Example
A complete note: the render blocks (optional `height` in pixels), the `## Categories` color definitions, and sample daily data.

````markdown
```cext-trainings-chart
```

```cext-trainings-body
height: 300
```

## Categories
- strength:   #e74c3c
- cardio:     #43a047

## Data
- 2026-04-26: body: 70 kg, 18 PBF, training: strength 1h, mobility 30m
- 2026-04-27: training: cardio 45m
````
