import {isItemId, isPropertyId} from 'wikibase-types';
import {Markup} from 'telegraf';
import {MiddlewareProperty as WikibaseMiddlewareProperty} from 'telegraf-wikibase';
import {UrlButton} from 'telegraf/typings/markup';
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
	text += format.italic(entity.qNumber());

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

export async function entityButtons(wb: WikibaseMiddlewareProperty, entityId: string): Promise<readonly UrlButton[]> {
	const entity = await wb.reader(entityId);
	const buttons: UrlButton[] = [
		Markup.urlButton(
			(await wb.reader('buttons.wikidata')).label(),
			entity.url()
		)
	];

	const sitelinkButtons: UrlButton[] = entity.allSitelinksInLang()
		.map(o => Markup.urlButton(
			wdk.getSitelinkData(o).project,
			entity.sitelinkUrl(o)!
		));

	return [
		...buttons,
		...sitelinkButtons,
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

async function claimUrlButtons(tb: WikibaseMiddlewareProperty, entity: WikidataEntityReader, storeKey: string, urlModifier: (part: string) => string): Promise<readonly UrlButton[]> {
	const property = await tb.reader(storeKey);
	const claimValues = entity.claim(property.qNumber());

	const buttons = claimValues.map(o =>
		Markup.urlButton(
			`${property.label()}${claimValues.length > 1 ? ` ${o}` : ''}`,
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
		photo: encodeURI(wdk.getImageUrl(selected, 800)),
		thumb: encodeURI(wdk.getImageUrl(selected, 100))
	};
}
