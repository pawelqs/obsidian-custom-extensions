import { WeeklyExercises } from './types';
import { aggregateExercises, ExerciseCell } from './aggregator';

const MAX_LEVEL = 10;

export function renderExercisesTable(el: HTMLElement, weeklyExercises: WeeklyExercises[]): void {
	const { weeks, exercises, cells } = aggregateExercises(weeklyExercises);

	const wrapper = el.createEl('div', { cls: 'cext-exercises' });
	if (exercises.length === 0) {
		wrapper.createEl('p', { text: 'Brak ćwiczeń tygodniowych.' });
		return;
	}

	const table = wrapper.createEl('table', { cls: 'cext-exercises-table' });
	const headRow = table.createEl('thead').createEl('tr');
	headRow.createEl('th');
	for (const week of weeks) {
		headRow.createEl('th', { text: formatWeek(week), attr: { title: `tydzień od ${week}` } });
	}

	const body = table.createEl('tbody');
	for (const exercise of exercises) {
		const row = body.createEl('tr');
		row.createEl('th', { text: exercise, cls: 'cext-exercises-name' });
		for (const week of weeks) {
			const td = row.createEl('td');
			const cell = cells[exercise]?.[week];
			if (!cell) continue;
			const percent = Math.round((cell.level / MAX_LEVEL) * 100);
			td.setAttribute('title', `${exercise}: ${percent}%${cell.goal ? ` (cel: ${cell.goal})` : ''}`);
			td.appendChild(pieIcon(cell));
		}
	}
}

/** Same look as the vault's task-checkbox snippet: coral → sage by level, conic fill, gold ring for bonus. */
function pieIcon(cell: ExerciseCell): HTMLElement {
	const pie = document.createElement('span');
	pie.classList.add('cext-pie');
	pie.style.setProperty('--t', String(cell.level));
	pie.style.setProperty('--p', `${cell.level * 10}%`);
	pie.style.setProperty('--ring', `${cell.bonus ?? 0}px`);
	return pie;
}

/** 'YYYY-MM-DD' → 'DD.MM' */
function formatWeek(week: string): string {
	return `${week.slice(8, 10)}.${week.slice(5, 7)}`;
}
