import { CategoriesConfig, ColorResolver, makeColorResolver } from './parseCategories';

export interface LegendItem {
	label: string;
	color: string;
}

export function renderColorLegend(config: CategoriesConfig, resolver?: ColorResolver): HTMLElement {
	const color = resolver ?? makeColorResolver(config);
	const container = document.createElement('div');
	container.classList.add('cext-legend-container');

	if (config.groupOrder.length > 0) {
		for (const group of config.groupOrder) {
			const cats = config.groupCats[group] || [];
			const items = cats.map((cat) => ({ label: cat, color: color(cat) }));
			container.appendChild(renderLegendSection(items, group));
		}
	} else {
		container.classList.add('cext-legend-container--flat');
		for (const label of Object.keys(config.colorsMap)) {
			container.appendChild(renderLegendItem(label, color(label)));
		}
	}

	return container;
}

export function renderLegendSection(items: LegendItem[], title?: string): HTMLElement {
	const section = document.createElement('div');

	if (title) {
		const titleEl = document.createElement('div');
		titleEl.classList.add('cext-legend-section-title');
		titleEl.textContent = title;
		section.appendChild(titleEl);
	}

	for (const item of items) {
		section.appendChild(renderLegendItem(item.label, item.color));
	}

	return section;
}

export function renderLegendItem(label: string, color: string): HTMLElement {
	const item = document.createElement('div');
	item.classList.add('cext-legend-item');

	const box = document.createElement('div');
	box.classList.add('cext-legend-item-box');
	box.style.backgroundColor = color;
	item.appendChild(box);

	const span = document.createElement('span');
	span.textContent = label;
	item.appendChild(span);

	return item;
}
