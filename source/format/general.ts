import * as format from './html';

export function array(label: string, values: readonly string[], maxValuesShown = 8): string {
	if (values.length === 0) {
		return '';
	}

	let text = '';
	text += format.bold(label);
	text += '\n';

	text += values
		.slice(0, maxValuesShown)
		.map(o => `- ${o}`)
		.join('\n');

	if (values.length > maxValuesShown) {
		text += '\n- …';
	}

	return text;
}