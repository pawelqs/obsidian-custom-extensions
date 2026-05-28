import { Plugin } from 'obsidian';
import { FinancesModule } from './modules/finances';

export default class MyPlugin extends Plugin {
	async onload() {
		const finances = new FinancesModule(this.app);
		finances.register(this);
	}

	onunload() {
	}
}
