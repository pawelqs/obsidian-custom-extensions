/** Creates the `.cext-chart-container` (fixed pixel height) holding a fresh canvas, and returns the canvas. */
export function createChartCanvas(el: HTMLElement, height: number): HTMLCanvasElement {
	const container = el.createEl('div');
	container.classList.add('cext-chart-container');
	container.style.height = `${height}px`;
	return container.createEl('canvas');
}
