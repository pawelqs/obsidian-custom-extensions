// Generic `.cext-tabs` button row driven by a label record. Renders one
// `.cext-tab` button per key, marks the active one, and reports clicks.

export function renderTabBar<K extends string>(
	el: HTMLElement,
	labels: Record<K, string>,
	active: K,
	onSelect: (key: K) => void
): void {
	const tabs = el.createEl('div');
	tabs.classList.add('cext-tabs');

	(Object.keys(labels) as K[]).forEach((key) => {
		const tab = tabs.createEl('button');
		tab.textContent = labels[key];
		tab.classList.add('cext-tab');
		if (key === active) tab.classList.add('cext-tab-active');
		tab.addEventListener('click', () => onSelect(key));
	});
}
