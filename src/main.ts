import { Plugin } from 'obsidian';
import { FinancesModule } from './modules/finances';
import { TrainingsModule } from './modules/trainings';

export default class MyPlugin extends Plugin {
	async onload() {
		const finances = new FinancesModule(this.app);
		finances.register(this);

		const trainings = new TrainingsModule(this.app);
		trainings.register(this);
	}

	onunload() {
	}
}
