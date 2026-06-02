import * as L from 'leaflet';
import { MapLocation, MapChunkConfig } from './types';
import { CategoriesConfig, makeColorResolver } from '../../shared/parseCategories';
import { renderColorLegend, renderLegendItem } from '../../shared/colorLegend';
import { getElementState, setElementState } from '../../shared/elementState';

export function renderMap(
	el: HTMLElement,
	locations: MapLocation[],
	config: CategoriesConfig,
	chunkConfig: MapChunkConfig
): void {
	destroyPrev(el);

	const color = makeColorResolver(config);

	const legend = buildLegend(locations, config, color);
	if (legend) el.appendChild(legend);

	const container = el.createEl('div');
	container.classList.add('cext-map-container');
	container.style.height = `${chunkConfig.height}px`;

	let cancelled = false;
	setElementState(el, '__mapCancel', () => { cancelled = true; });

	setTimeout(() => {
		if (cancelled) return;

		const map = L.map(container);
		L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
			attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
			maxZoom: 19,
		}).addTo(map);

		const markers: L.CircleMarker[] = [];

		for (const loc of locations) {
			const fillColor = loc.category ? color(loc.category) : '#888888';
			const marker = L.circleMarker([loc.lat, loc.lon], {
				radius: 8,
				fillColor,
				color: '#fff',
				weight: 2,
				opacity: 1,
				fillOpacity: 0.85,
			}).addTo(map);

			const popupContent = loc.category
				? `<b>${loc.name}</b><br><span style="color:${fillColor}">●</span> ${loc.category}`
				: `<b>${loc.name}</b>`;
			marker.bindPopup(popupContent);
			markers.push(marker);
		}

		if (markers.length > 0) {
			const group = L.featureGroup(markers);
			map.fitBounds(group.getBounds().pad(0.15));
		} else {
			map.setView([52.0, 19.0], 6);
		}

		setElementState(el, '__mapInstance', map);
	}, 50);
}

function buildLegend(
	locations: MapLocation[],
	config: CategoriesConfig,
	color: (key: string) => string
): HTMLElement | null {
	if (config.groupOrder.length > 0) {
		return renderColorLegend(config, color);
	}

	const seen = new Set<string>();
	const cats: string[] = [];
	for (const loc of locations) {
		if (loc.category && !seen.has(loc.category)) {
			seen.add(loc.category);
			cats.push(loc.category);
		}
	}
	if (cats.length === 0) return null;

	const wrapper = document.createElement('div');
	wrapper.classList.add('cext-legend-container', 'cext-legend-container--flat');
	for (const cat of cats) {
		wrapper.appendChild(renderLegendItem(cat, color(cat)));
	}
	return wrapper;
}

function destroyPrev(el: HTMLElement): void {
	const cancel = getElementState<() => void>(el, '__mapCancel');
	if (cancel) cancel();
	const prev = getElementState<L.Map>(el, '__mapInstance');
	if (prev) {
		prev.remove();
		setElementState(el, '__mapInstance', undefined);
	}
}
