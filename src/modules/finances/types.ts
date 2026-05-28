export interface MonthData {
	id: string;
	label: string;
	income: number;
	taxes: number;
	savings: number;
	expenses: number;
	cats: Record<string, number>;
}

export interface FinancesConfig {
	colorsMap: Record<string, string>;
	groupCats: Record<string, string[]>;
	groupOrder: string[];
	cats: string[];
}
