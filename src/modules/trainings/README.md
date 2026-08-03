# Trainings Module

## Description
Tracks trainings and body metrics in Obsidian — renders a per-week stacked bar of training time per category (`cext-trainings-chart`) and a line chart of body metrics like `kg` and `PBF` (`cext-trainings-body`).

The training chart's x-axis is a continuous weekly timeline from the first to the last data week — weeks without data stay as empty gaps rather than being collapsed. Instead of labelling every bar, months are marked with alternating background bands and a centered month/year label underneath. Bands are cut at the real calendar month boundary, so a week that straddles two months sits on the border of both bands rather than being pushed entirely into one.

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
