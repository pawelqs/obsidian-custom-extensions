export function lightenColor(hex: string, amount: number): string {
	const match = /^#([0-9a-f]{6})$/i.exec(hex);
	if (!match?.[1]) return hex;

	const num = parseInt(match[1], 16);
	const channel = (shift: number) => {
		const c = (num >> shift) & 0xff;
		return Math.round(c + (255 - c) * amount)
			.toString(16)
			.padStart(2, '0');
	};

	return `#${channel(16)}${channel(8)}${channel(0)}`;
}
