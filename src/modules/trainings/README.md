# Trainings Module

## Opis
Moduł do śledzenia treningów i pomiarów ciała w Obsidian.

## Code blocks
- `cext-trainings-chart` — wykres treningów (czas / kategorie)
- `cext-trainings-body` — wykres pomiarów ciała (kg, PBF, ...)

## Format danych
Zobacz `Treningi.md` w korzeniu vault'a:

```markdown
## Kategorie
- strength:   #e74c3c
- cardio:     #43a047

## Data
- 2026-04-26: body: 70 kg, 18 PBF, training: strength 1h, mobility 30m
```

## Użycie
```typescript
import { TrainingsModule } from './modules/trainings';

const trainings = new TrainingsModule(app);
trainings.register(plugin);
```
