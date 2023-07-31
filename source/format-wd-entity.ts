import {type PropertyId, type SnakValue, wikibaseTimeToSimpleDay} from 'wikibase-sdk';
import {wdk} from 'wikibase-sdk/wikidata.org';
import type {MiddlewareProperty as WikibaseMiddlewareProperty, WikibaseEntityReader} from 'telegraf-wikibase';
import {array, format} from './format/index.js';
import {typedEntries, unreachable} from './javascript-helper.js';
import * as CLAIMS from './claim-ids.js';

export async function entityWithClaimText(
	wb: WikibaseMiddlewareProperty,
	entityId: string,
	claimIds: readonly PropertyId[],
): Promise<string> {
	const entity = await wb.reader(entityId);

	let text = '';
	text += headerText(entity);
	text += '\n\n';

	const claimTextEntries = await Promise.all(claimIds
		.map(async o => claimText(wb, entity, o)));

	text += claimTextEntries
		.filter(Boolean)
		.join('\n\n');

	return text;
}

function headerText(entity: WikibaseEntityReader): string {
	let text = '';
	text += format.bold(format.escape(entity.label()));
	text += ' ';
	text += format.monospace(entity.qNumber());

	const description = entity.description();
	if (description) {
		text += '\n';
		text += format.escape(description);
	}

	const aliases = entity.aliases();
	if (aliases.length > 0) {
		text += '\n\n';
		text += array('Alias', aliases.map(o => format.escape(o)));
	}

	return text;
}

export async function entityButtons(
	wb: WikibaseMiddlewareProperty,
	entityId: string,
) {
	const entity = await wb.reader(entityId);
	const buttonTextReader = await wb.reader('buttons.wikidata');
	const buttons = [{
		text: buttonTextReader.label(),
		url: entity.url(),
	}];

	const claimButtons = await Promise.all(
		typedEntries(CLAIMS.BUTTON_INTEREST).map(
			async ([propertyId, urlModifier]) => {
				const property = await wb.reader(propertyId);
				return entity.claimValues(propertyId)
					.map(o => String(o.value))
					.map((o, _i, array) => ({
						text: `${property.label()}${
							array.length > 1 ? ` ${String(o)}` : ''
						}`,
						url: urlModifier(o),
					}));
			},
		),
	);

	return [
		...buttons,
		...sitelinkButtons(entity),
		...claimButtons.flat(),
	];
}

function sitelinkButtons(entity: WikibaseEntityReader) {
	try {
		return entity.allSitelinksInLang()
			.map(o => ({
				text: wdk.getSitelinkData(o).project,
				url: entity.sitelinkUrl(o)!,
			}));
	} catch (error: unknown) {
		console.error(
			'something failed with sitelinkButtons',
			error instanceof Error ? error.message : error,
		);
		return [];
	}
}

async function claimText(
	wb: WikibaseMiddlewareProperty,
	entity: WikibaseEntityReader,
	claim: PropertyId,
): Promise<string> {
	const claimReader = await wb.reader(claim);
	const claimLabel = claimReader.label();
	const claimValues = entity.claimValues(claim);

	const claimValueTexts = await Promise.all(claimValues
		.map(async o => claimValueText(wb, o)));

	return array(claimLabel, claimValueTexts);
}

async function claimValueText(
	wb: WikibaseMiddlewareProperty,
	s: SnakValue,
): Promise<string> {
	if (s.type === 'wikibase-entityid') {
		const reader = await wb.reader(s.value.id);
		return format.url(format.escape(reader.label()), reader.url());
	}

	if (s.type === 'string') {
		return format.escape(s.value);
	}

	if (s.type === 'monolingualtext') {
		return format.monospace(s.value.language) + ': '
			+ format.escape(s.value.text);
	}

	if (s.type === 'quantity') {
		const amount = format.escape(s.value.amount);
		const unit = await formatUnit(wb, s.value.unit);
		return unit ? `${amount} ${unit}` : amount;
	}

	if (s.type === 'time') {
		return format.escape(wikibaseTimeToSimpleDay(s.value));
	}

	if (s.type === 'globecoordinate') {
		return format.monospace(`${s.value.latitude},${s.value.longitude}`);
	}

	unreachable(s);
}

async function formatUnit(wb: WikibaseMiddlewareProperty, unit: string) {
	// Special case: This is like factor 1, it does nothing.
	if (unit === '1') {
		return false;
	}

	const entity = /Q\d+$/.exec(unit);
	if (!entity) {
		return format.escape(unit);
	}

	const reader = await wb.reader(entity[0]);
	return format.url(format.escape(reader.label()), reader.url());
}

export function image(
	entity: WikibaseEntityReader,
): {photo?: string; thumb?: string} {
	const possible = [
		...entity.claimValues('P18'), // Image
		...entity.claimValues('P154'), // Logo image
		...entity.claimValues('P94'), // Coat of arms
		...entity.claimValues('P41'), // Flag image
		...entity.claimValues('P242'), // Locator map image
		...entity.claimValues('P5555'), // Schematic illustation
		...entity.claimValues('P117'), // Chemical structure
	]
		.map(o => o.value)
		.filter((o): o is string => typeof o === 'string');

	if (possible.length === 0) {
		return {};
	}

	const selected = possible[0]!;

	return {
		photo: encodeURI(wdk.getImageUrl(selected, 800)),
		thumb: encodeURI(wdk.getImageUrl(selected, 100)),
	};
}
