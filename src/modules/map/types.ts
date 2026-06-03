export interface MapChunkConfig {
	height: number;
}

export interface MapLocation {
	name: string;
	lat: number;
	lon: number;
	category: string | null;
	route: string | null;
	seq: number | null;
}

// A named path connecting routed locations, ordered ascending by their seq number.
export interface MapRoute {
	name: string;
	points: MapLocation[];
}

// Contract for the click-to-recenter event shared between the click delegation
// (dispatcher) and the map's fly handler (listener).
export const MAP_FLY_EVENT = 'cext-map-fly';

export interface MapFlyDetail {
	lat: number;
	lon: number;
}
