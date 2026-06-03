import * as L from 'leaflet';
import { MapLocation, MapRoute, MapChunkConfig, MapFlyDetail, MAP_FLY_EVENT } from './types';
import { buildRoutes } from './parser';
import { CategoriesConfig, ColorResolver, makeColorResolver } from '../../shared/parseCategories';
import { renderColorLegend, renderLegendItem, renderLegendSection } from '../../shared/colorLegend';
import { getElementState, setElementState } from '../../shared/elementState';

type LatLng = [number, number];

export function renderMap(
	el: HTMLElement,
	locations: MapLocation[],
	config: CategoriesConfig,
	chunkConfig: MapChunkConfig
): void {
	const color = makeColorResolver(config);
	const routes = buildRoutes(locations);
	const existingMap = getElementState<L.Map>(el, '__mapInstance');

	if (existingMap) {
		refreshLayers(el, locations, routes, color);
		refreshLegend(el, locations, routes, config, color);
		return;
	}

	const cancel = getElementState<() => void>(el, '__mapCancel');
	if (cancel) cancel();

	const legend = buildLegend(locations, routes, config, color);
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

		// Routes sit beneath markers so numbered pins stay clickable above the lines.
		const routeLayer = L.layerGroup().addTo(map);
		const markerLayer = L.layerGroup().addTo(map);
		addRoutes(routeLayer, routes, color);
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
		setElementState(el, '__mapRouteLayer', routeLayer);
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
		setElementState(el, '__mapRouteLayer', undefined);
	}

	setElementState(el, '__mapLegend', undefined);
}

function refreshLayers(
	el: HTMLElement,
	locations: MapLocation[],
	routes: MapRoute[],
	color: ColorResolver
): void {
	const markerLayer = getElementState<L.LayerGroup>(el, '__mapMarkerLayer');
	const routeLayer = getElementState<L.LayerGroup>(el, '__mapRouteLayer');
	if (routeLayer) {
		routeLayer.clearLayers();
		addRoutes(routeLayer, routes, color);
	}
	if (markerLayer) {
		markerLayer.clearLayers();
		addMarkers(markerLayer, locations, color);
	}
}

function refreshLegend(
	el: HTMLElement,
	locations: MapLocation[],
	routes: MapRoute[],
	config: CategoriesConfig,
	color: ColorResolver
): void {
	const old = getElementState<HTMLElement>(el, '__mapLegend');
	if (old) old.remove();
	const legend = buildLegend(locations, routes, config, color);
	if (legend) {
		el.prepend(legend);
		setElementState(el, '__mapLegend', legend);
	}
}

function addMarkers(layer: L.LayerGroup, locations: MapLocation[], color: ColorResolver): void {
	for (const loc of locations) {
		// Markers always carry the category color; the route color belongs to the line + arrows.
		const fillColor = loc.category ? color(loc.category) : '#888888';
		const marker = loc.route !== null && loc.seq !== null
			? numberedMarker(loc, fillColor)
			: dotMarker(loc, fillColor);
		layer.addLayer(marker);
	}
}

function dotMarker(loc: MapLocation, fillColor: string): L.CircleMarker {
	const marker = L.circleMarker([loc.lat, loc.lon], {
		radius: 8,
		fillColor,
		color: '#fff',
		weight: 2,
		opacity: 1,
		fillOpacity: 0.85,
	});
	marker.bindPopup(popupHtml(loc, fillColor));
	return marker;
}

function numberedMarker(loc: MapLocation, fillColor: string): L.Marker {
	const icon = L.divIcon({
		className: 'cext-route-marker-wrapper',
		html: `<div class="cext-route-marker" style="background:${escapeHtml(fillColor)}">${loc.seq}</div>`,
		iconSize: [24, 24],
		iconAnchor: [12, 12],
	});
	const marker = L.marker([loc.lat, loc.lon], { icon });
	marker.bindPopup(popupHtml(loc, fillColor));
	return marker;
}

function addRoutes(layer: L.LayerGroup, routes: MapRoute[], color: ColorResolver): void {
	for (const route of routes) {
		const latlngs = route.points.map((p): LatLng => [p.lat, p.lon]);
		if (latlngs.length < 2) continue;

		const routeColor = color(route.name);
		L.polyline(latlngs, { color: routeColor, weight: 3, opacity: 0.8 }).addTo(layer);
		for (let i = 0; i < latlngs.length - 1; i++) {
			layer.addLayer(arrowMarker(latlngs[i]!, latlngs[i + 1]!, routeColor));
		}
	}
}

// A small arrow at the segment midpoint, rotated to point along the direction of travel.
function arrowMarker(from: LatLng, to: LatLng, routeColor: string): L.Marker {
	const mid: LatLng = [(from[0] + to[0]) / 2, (from[1] + to[1]) / 2];
	// Screen y grows downward, so negate the latitude delta before measuring the angle.
	const angle = Math.atan2(-(to[0] - from[0]), to[1] - from[1]) * 180 / Math.PI;
	const icon = L.divIcon({
		className: 'cext-route-arrow-wrapper',
		html: `<div class="cext-route-arrow" style="color:${escapeHtml(routeColor)};transform:rotate(${angle}deg)">▶</div>`,
		iconSize: [16, 16],
		iconAnchor: [8, 8],
	});
	return L.marker(mid, { icon, interactive: false });
}

function popupHtml(loc: MapLocation, swatchColor: string): string {
	const lines = [`<b>${escapeHtml(loc.name)}</b>`];
	if (loc.route !== null && loc.seq !== null) {
		lines.push(`<span style="color:${escapeHtml(swatchColor)}">${loc.seq}.</span> ${escapeHtml(loc.route)}`);
	}
	if (loc.category) {
		lines.push(`<span style="color:${escapeHtml(swatchColor)}">●</span> ${escapeHtml(loc.category)}`);
	}
	return lines.join('<br>');
}

function escapeHtml(s: string): string {
	return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function buildLegend(
	locations: MapLocation[],
	routes: MapRoute[],
	config: CategoriesConfig,
	color: ColorResolver
): HTMLElement | null {
	const catLegend = buildCategoryLegend(locations, config, color);
	const routeSection = routes.length > 0
		? renderLegendSection(routes.map((r) => ({ label: r.name, color: color(r.name) })), 'Trasy')
		: null;

	if (!catLegend && !routeSection) return null;
	if (catLegend && routeSection) {
		catLegend.appendChild(routeSection);
		return catLegend;
	}
	if (routeSection) {
		const wrapper = document.createElement('div');
		wrapper.classList.add('cext-legend-container');
		wrapper.appendChild(routeSection);
		return wrapper;
	}
	return catLegend;
}

function buildCategoryLegend(
	locations: MapLocation[],
	config: CategoriesConfig,
	color: ColorResolver
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
