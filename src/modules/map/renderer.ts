import * as L from 'leaflet';
import { MapLocation, MapChunkConfig, MapFlyDetail, MAP_FLY_EVENT } from './types';
import { CategoriesConfig, makeColorResolver } from '../../shared/parseCategories';
import { renderColorLegend, renderLegendItem } from '../../shared/colorLegend';
import { getElementState, setElementState } from '../../shared/elementState';

export function renderMap(
	el: HTMLElement,
	locations: MapLocation[],
	config: CategoriesConfig,
	chunkConfig: MapChunkConfig
): void {
	const color = makeColorResolver(config);
	const existingMap = getElementState<L.Map>(el, '__mapInstance');

	if (existingMap) {
		refreshMarkers(el, locations, color);
		refreshLegend(el, locations, config, color);
		return;
	}

	const cancel = getElementState<() => void>(el, '__mapCancel');
	if (cancel) cancel();

	const legend = buildLegend(locations, config, color);
	if (legend) {
		setElementState(el, '__mapLegend', legend);
		el.appendChild(legend);
	}

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

		const markerLayer = L.layerGroup().addTo(map);
		addMarkers(markerLayer, locations, color);

		if (locations.length > 0) {
			const avgLat = locations.reduce((s, l) => s + l.lat, 0) / locations.length;
			const avgLon = locations.reduce((s, l) => s + l.lon, 0) / locations.length;
			map.setView([avgLat, avgLon], 6);
		} else {
			map.setView([52.0, 19.0], 6);
		}

		// Scope the event bus to this note's preview so clicks don't fly maps in other notes.
		const flyTarget = el.closest('.markdown-preview-view') ?? document;
		const flyHandler = (e: Event) => {
			const { lat, lon } = (e as CustomEvent<MapFlyDetail>).detail;
			map.flyTo([lat, lon], Math.max(map.getZoom(), 10));
		};
		flyTarget.addEventListener(MAP_FLY_EVENT, flyHandler);

		setElementState(el, '__mapInstance', map);
		setElementState(el, '__mapMarkerLayer', markerLayer);
		setElementState(el, '__mapFlyHandler', flyHandler);
		setElementState(el, '__mapFlyTarget', flyTarget);
	}, 50);
}

export function destroyMap(el: HTMLElement): void {
	const cancel = getElementState<() => void>(el, '__mapCancel');
	if (cancel) cancel();
	setElementState(el, '__mapCancel', undefined);

	const flyHandler = getElementState<EventListener>(el, '__mapFlyHandler');
	const flyTarget = getElementState<EventTarget>(el, '__mapFlyTarget');
	if (flyHandler && flyTarget) {
		flyTarget.removeEventListener(MAP_FLY_EVENT, flyHandler);
		setElementState(el, '__mapFlyHandler', undefined);
		setElementState(el, '__mapFlyTarget', undefined);
	}

	const map = getElementState<L.Map>(el, '__mapInstance');
	if (map) {
		map.remove();
		setElementState(el, '__mapInstance', undefined);
		setElementState(el, '__mapMarkerLayer', undefined);
	}

	setElementState(el, '__mapLegend', undefined);
}

function refreshMarkers(
	el: HTMLElement,
	locations: MapLocation[],
	color: (key: string) => string
): void {
	const layer = getElementState<L.LayerGroup>(el, '__mapMarkerLayer');
	if (!layer) return;
	layer.clearLayers();
	addMarkers(layer, locations, color);
}

function refreshLegend(
	el: HTMLElement,
	locations: MapLocation[],
	config: CategoriesConfig,
	color: (key: string) => string
): void {
	const old = getElementState<HTMLElement>(el, '__mapLegend');
	if (old) old.remove();
	const legend = buildLegend(locations, config, color);
	if (legend) {
		el.prepend(legend);
		setElementState(el, '__mapLegend', legend);
	}
}

function addMarkers(
	layer: L.LayerGroup,
	locations: MapLocation[],
	color: (key: string) => string
): void {
	for (const loc of locations) {
		const fillColor = loc.category ? color(loc.category) : '#888888';
		const marker = L.circleMarker([loc.lat, loc.lon], {
			radius: 8,
			fillColor,
			color: '#fff',
			weight: 2,
			opacity: 1,
			fillOpacity: 0.85,
		});
		const name = escapeHtml(loc.name);
		const popupContent = loc.category
			? `<b>${name}</b><br><span style="color:${escapeHtml(fillColor)}">●</span> ${escapeHtml(loc.category)}`
			: `<b>${name}</b>`;
		marker.bindPopup(popupContent);
		layer.addLayer(marker);
	}
}

function escapeHtml(s: string): string {
	return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
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
