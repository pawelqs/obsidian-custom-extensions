import { Plugin } from 'obsidian';
import { FinancesModule } from './modules/finances';
import { TrainingsModule } from './modules/trainings';
import { MapModule } from './modules/map';
import { SumWeightsModule } from './modules/sum-weights';

export default class CextPlugin extends Plugin {
	async onload() {
		const finances = new FinancesModule(this.app);
		finances.register(this);

		const trainings = new TrainingsModule(this.app);
		trainings.register(this);

		const map = new MapModule(this.app);
		map.register(this);

		const sumWeights = new SumWeightsModule(this.app);
		sumWeights.register(this);
	}

	onunload() {
	}
}
