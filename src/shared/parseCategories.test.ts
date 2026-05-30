import { describe, it, expect } from 'bun:test';
import { parseCategories } from './parseCategories';

describe('parseCategories', () => {
	it('parses Categories heading with groups and includes every group member', () => {
		const input = `## 2026

### 2026-03
- expenses: 100

## Categories

\`\`\`
**must:**
- mieszkanie:     #1f77b4
- jedzenie & rev: #72b0dc

**wants:**
- transport:      #55d4e0

**inne:**
- inne:           #7f7f7f
- other:          #b0b0b0

**special:**
- savings:        #2ca02c
- net income:     #2ca02c
\`\`\`
`;
		expect(parseCategories(input)).toEqual({
			colorsMap: {
				'mieszkanie': '#1f77b4',
				'jedzenie & rev': '#72b0dc',
				'transport': '#55d4e0',
				'inne': '#7f7f7f',
				'other': '#b0b0b0',
				'savings': '#2ca02c',
				'net income': '#2ca02c',
			},
			groupCats: {
				'must': ['mieszkanie', 'jedzenie & rev'],
				'wants': ['transport'],
				'inne': ['inne', 'other'],
				'special': ['savings', 'net income'],
			},
			groupOrder: ['must', 'wants', 'inne', 'special'],
			cats: ['mieszkanie', 'jedzenie & rev', 'transport', 'inne', 'other', 'savings', 'net income'],
		});
	});

	it('parses Polish heading (Kategorie) without groups', () => {
		const input = `## Kategorie

\`\`\`
- strength:    #e74c3c
- mobility:    #9b59b6
- handstand:   #808000
\`\`\`
`;
		expect(parseCategories(input)).toEqual({
			colorsMap: {
				strength: '#e74c3c',
				mobility: '#9b59b6',
				handstand: '#808000',
			},
			groupCats: {},
			groupOrder: [],
			cats: [],
		});
	});

	it('stops parsing at the next H2 heading', () => {
		const input = `## Categories
- a: #111
## Other
- b: #222
`;
		expect(parseCategories(input).colorsMap).toEqual({ a: '#111' });
	});

	it('returns an empty config when no matching heading is present', () => {
		const input = `## Other
- a: #111
`;
		expect(parseCategories(input)).toEqual({
			colorsMap: {},
			groupCats: {},
			groupOrder: [],
			cats: [],
		});
	});

	it('respects a custom headings option', () => {
		const input = `## Colors
- foo: #abc
`;
		expect(parseCategories(input, { headings: ['Colors'] }).colorsMap).toEqual({ foo: '#abc' });
	});
});
