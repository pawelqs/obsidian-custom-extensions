import { App, Plugin, MarkdownPostProcessorContext, MarkdownRenderChild, TFile } from 'obsidian';
import { parseLocations } from './parser';
import { renderMap, destroyMap } from './renderer';
import { MapChunkConfig, MapFlyDetail, MAP_FLY_EVENT } from './types';
import { parseCategories } from '../../shared/parseCategories';
import { getElementState, setElementState } from '../../shared/elementState';

// Rendered inline-code content (no backticks): `geo: lat, lon[, cat: ...]`
const GEO_CODE_RE = /^geo:\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/;

export class MapModule {
	constructor(private app: App) {}

	register(plugin: Plugin): void {
		const readAndParse = async (ctx: MarkdownPostProcessorContext, chunkConfig: MapChunkConfig) => {
			const file = this.app.vault.getAbstractFileByPath(ctx.sourcePath);
			if (!(file instanceof TFile)) return null;
			const content = await this.app.vault.read(file);
			const config = parseCategories(content);
			const locations = parseLocations(content, config, chunkConfig);
			return { file, config, locations };
		};

		plugin.registerMarkdownCodeBlockProcessor('cext-map', async (source, el, ctx) => {
			const chunkConfig = parseChunkConfig(source);
			const data = await readAndParse(ctx, chunkConfig);
			if (!data) return;
			renderMap(el, data.locations, data.config, chunkConfig);

			attachCoordsMarker(el);

			if (getElementState<boolean>(el, '__mapWatched')) return;
			setElementState(el, '__mapWatched', true);

			// Child lifecycle is tied to the rendered block: onunload fires when the note
			// closes or the section is re-rendered, cleaning up the map and its listeners.
			const child = new MapRenderChild(el);
			ctx.addChild(child);

			child.registerEvent(this.app.vault.on('modify', async (modifiedFile: TFile) => {
				if (modifiedFile.path !== data.file.path) return;
				const fresh = await readAndParse(ctx, chunkConfig);
				if (!fresh) return;
				renderMap(el, fresh.locations, fresh.config, chunkConfig);
			}));
		});

		// One delegated listener for all geo tokens; cleaned up on plugin unload.
		plugin.registerDomEvent(document, 'click', (e) => {
			if (!(e.target instanceof HTMLElement)) return;
			const code = e.target.closest('code.cext-coords-link');
			if (!code) return;
			const match = GEO_CODE_RE.exec(code.textContent ?? '');
			if (!match?.[1] || !match[2]) return;
			e.preventDefault();
			const target = code.closest('.markdown-preview-view') ?? document;
			target.dispatchEvent(new CustomEvent<MapFlyDetail>(MAP_FLY_EVENT, {
				detail: { lat: parseFloat(match[1]), lon: parseFloat(match[2]) },
			}));
		});
	}
}

class MapRenderChild extends MarkdownRenderChild {
	onunload(): void {
		const observer = getElementState<MutationObserver>(this.containerEl, '__coordsObserver');
		observer?.disconnect();
		setElementState(this.containerEl, '__coordsObserver', undefined);
		setElementState(this.containerEl, '__coordsWatched', undefined);
		setElementState(this.containerEl, '__mapWatched', undefined);
		destroyMap(this.containerEl);
	}
}

function attachCoordsMarker(el: HTMLElement): void {
	if (getElementState<boolean>(el, '__coordsWatched')) return;
	setElementState(el, '__coordsWatched', true);

	const preview = el.closest<HTMLElement>('.markdown-preview-view');
	if (!preview) return;

	markGeoCodes(preview);

	const observer = new MutationObserver((mutations) => {
		for (const m of mutations) {
			for (const node of Array.from(m.addedNodes)) {
				if (!(node instanceof HTMLElement)) continue;
				if (node.closest('.cext-map-container')) continue;
				markGeoCodes(node);
			}
		}
	});
	observer.observe(preview, { childList: true, subtree: true });
	setElementState(el, '__coordsObserver', observer);
}

function markGeoCodes(root: HTMLElement): void {
	if (root.matches('code')) markGeoCode(root);
	for (const code of Array.from(root.querySelectorAll('code'))) {
		markGeoCode(code);
	}
}

// Marks an inline geo token with the link class (cosmetic); clicks are handled by delegation.
function markGeoCode(code: HTMLElement): void {
	if (code.closest('pre')) return; // skip fenced code blocks, only inline tokens
	if (GEO_CODE_RE.test(code.textContent ?? '')) {
		code.classList.add('cext-coords-link');
	}
}

function parseChunkConfig(source: string): MapChunkConfig {
	const heightStr = source.match(/height:\s*(\d+)/)?.[1];
	return {
		height: heightStr ? parseInt(heightStr, 10) : 400,
		implicitCategories: !/no-implicit-categories/i.test(source),
	};
}
