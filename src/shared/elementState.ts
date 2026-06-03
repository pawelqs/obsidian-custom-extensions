// Typed accessors for transient state stashed on a DOM element (chart/map
// instances, watcher flags). Keeps the single unavoidable cast in one place
// instead of `(el as any).__whatever` scattered across renderers.

export function getElementState<T>(el: HTMLElement, key: string): T | undefined {
	return (el as unknown as Record<string, unknown>)[key] as T | undefined;
}

export function setElementState<T>(el: HTMLElement, key: string, value: T | undefined): void {
	(el as unknown as Record<string, unknown>)[key] = value;
}
