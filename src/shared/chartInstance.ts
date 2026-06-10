// Chart.js instance stored on a code-block element; the '__chartInstance' key
// lives only here so renderers don't each hardcode it.

import { Chart } from 'chart.js';
import { getElementState, setElementState } from './elementState';

export function setChartInstance(el: HTMLElement, chart: Chart): void {
	setElementState(el, '__chartInstance', chart);
}

export function destroyChart(el: HTMLElement): void {
	const chart = getElementState<Chart>(el, '__chartInstance');
	if (chart) {
		chart.destroy();
		setElementState(el, '__chartInstance', undefined);
	}
}
