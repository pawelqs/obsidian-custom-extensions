import { Plugin } from 'obsidian';
import { FinancesModule } from './modules/finances';
import { TrainingsModule } from './modules/trainings';
import { MapModule } from './modules/map';

export default class MyPlugin extends Plugin {
	async onload() {
		const finances = new FinancesModule(this.app);
		finances.register(this);

		const trainings = new TrainingsModule(this.app);
		trainings.register(this);

		const map = new MapModule(this.app);
		map.register(this);
	}

	onunload() {
	}
}
