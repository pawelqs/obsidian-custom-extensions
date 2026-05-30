export interface MonthData {
	id: string;
	label: string;
	income: number;
	taxes: number;
	savings: number;
	expenses: number;
	cats: Record<string, number>;
}
