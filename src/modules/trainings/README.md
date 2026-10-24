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

## Weekly exercises (`cext-trainings-table`)
Exercises are tracked per week under a `### YYYY-MM-DD` heading in `## Data` (any day of the week; it is bucketed to its Monday). Body measurements go there as `- body: 76 kg`. Tasks are checkbox-style bullets whose status runs from `0` (not done) to `A` (100%, i.e. 10 steps of 10%); plain `[ ]` counts as 0 and `[x]` as 100%; `[cel:: …]` is an optional goal shown in the tooltip. Other bullets (logs, notes, group names) are ignored.

````markdown
```cext-trainings-table
```

## Data

### 2026-10-19
- body: 76 kg
- ćwiczenia:
	- [5] pull / push [cel:: 10] serii
	- [A] brzuch [cel:: 2 razy w tygodniu]
````

The block renders a table: exercises in rows (order of first appearance in the file, top to bottom), weeks in columns (`DD.MM` of the Monday), and a pie icon in each cell filled to the completion level (coral → sage by level; statuses B–F are 100% with a gold ring of 1–5 px, using the same rules as the plugin-provided `[ ] [0-F]` task-checkbox styling in `src/styles.css`). Weeks where an exercise is not listed stay empty. The old `- YYYY-MM-DD` daily format still works.
