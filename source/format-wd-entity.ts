import {isItemId, isPropertyId} from 'wikibase-types';
import {Markup} from 'telegraf';
import {MiddlewareProperty as WikibaseMiddlewareProperty} from 'telegraf-wikibase';
import WikidataEntityReader from 'wikidata-entity-reader';

import {format, array} from './format';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const wdk = require('wikidata-sdk');

export async function entityWithClaimText(wb: WikibaseMiddlewareProperty, entityId: string, claimIds: readonly string[]): Promise<string> {
	const entity = await wb.reader(entityId);

	let text = '';
	text += headerText(entity);
	text += '\n\n';

	const claimTextEntries = await Promise.all(claimIds
		.map(async o => claimText(wb, entity, o))
	);

	text += claimTextEntries
		.filter(o => o)
		.join('\n\n');

	return text;
}

function headerText(entity: WikidataEntityReader): string {
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

export async function entityButtons(wb: WikibaseMiddlewareProperty, entityId: string) {
	const entity = await wb.reader(entityId);
	const buttons = [
		Markup.button.url(
			(await wb.reader('buttons.wikidata')).label(),
			entity.url()
		)
	];

	return [
		...buttons,
		...sitelinkButtons(entity),
		...await claimUrlButtons(wb, entity, 'buttons.website', url => url),
		...await claimUrlButtons(wb, entity, 'buttons.github', part => `https://github.com/${part}`),
		...await claimUrlButtons(wb, entity, 'buttons.googlePlayStore', part => `https://play.google.com/store/apps/details?id=${part}`),
		...await claimUrlButtons(wb, entity, 'buttons.imdb', part => `https://www.imdb.com/title/${part}/`),
		...await claimUrlButtons(wb, entity, 'buttons.itunes', part => `https://itunes.apple.com/app/id${part}/`),
		...await claimUrlButtons(wb, entity, 'buttons.sourceCodeRepo', url => url),
		...await claimUrlButtons(wb, entity, 'buttons.steam', part => `https://store.steampowered.com/app/${part}/`),
		...await claimUrlButtons(wb, entity, 'buttons.subreddit', part => `https://www.reddit.com/r/${part}/`),
		...await claimUrlButtons(wb, entity, 'buttons.telegram', part => `https://t.me/${part}`),
		...await claimUrlButtons(wb, entity, 'buttons.twitter', part => `https://twitter.com/${part}`),
		...await claimUrlButtons(wb, entity, 'buttons.twitterHashtag', part => `https://twitter.com/hashtag/${part}?f=tweets`)
	];
}

function sitelinkButtons(entity: WikidataEntityReader) {
	try {
		return entity.allSitelinksInLang()
			.map(o => Markup.button.url(
				// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
				wdk.getSitelinkData(o).project,
				entity.sitelinkUrl(o)!
			));
	} catch (error: unknown) {
		console.error('something failed with sitelinkButtons', error instanceof Error ? error.message : error);
		return [];
	}
}

async function claimUrlButtons(tb: WikibaseMiddlewareProperty, entity: WikidataEntityReader, storeKey: string, urlModifier: (part: string) => string) {
	const property = await tb.reader(storeKey);
	const claimValues = entity.claim(property.qNumber()) as string[];

	const buttons = claimValues.map(o =>
		Markup.button.url(
			`${property.label()}${claimValues.length > 1 ? ` ${String(o)}` : ''}`,
			urlModifier(o)
		)
	);

	return buttons;
}

async function claimText(wb: WikibaseMiddlewareProperty, entity: WikidataEntityReader, claim: string): Promise<string> {
	const claimLabel = (await wb.reader(claim)).label();
	const claimValues = entity.claim(claim);

	const claimValueTexts = await Promise.all(claimValues
		.map(async o => claimValueText(wb, o))
	);

	return array(claimLabel, claimValueTexts);
}

async function claimValueText(wb: WikibaseMiddlewareProperty, value: unknown): Promise<string> {
	if (isItemId(value) || isPropertyId(value)) {
		const reader = await wb.reader(value);
		return format.url(format.escape(reader.label()), reader.url());
	}

	return format.escape(String(value));
}

export function image(entity: WikidataEntityReader): {photo?: string; thumb?: string} {
	const possible = [
		...entity.claim('P18'), // Image
		...entity.claim('P154'), // Logo image
		...entity.claim('P5555'), // Schematic illustation
		...entity.claim('P117') // Chemical structure
	]
		.filter((o): o is string => typeof o === 'string');

	if (possible.length === 0) {
		return {};
	}

	const selected = possible[0];

	return {
		// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
		photo: encodeURI(wdk.getImageUrl(selected, 800)),
		// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
		thumb: encodeURI(wdk.getImageUrl(selected, 100))
	};
}
