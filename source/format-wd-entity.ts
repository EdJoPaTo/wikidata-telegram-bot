import {isItemId, isPropertyId} from 'wikibase-types';
import {Markup} from 'telegraf';
import {UrlButton} from 'telegraf/typings/markup';
import WikidataEntityReader from 'wikidata-entity-reader';
import WikidataEntityStore from 'wikidata-entity-store';

import {format, array} from './format';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const wdk = require('wikidata-sdk');

export function entityWithClaimText(store: WikidataEntityStore, entityId: string, claimIds: readonly string[], language = 'en'): string {
	const entity = new WikidataEntityReader(store.entity(entityId), language);

	let text = '';
	text += headerText(entity);
	text += '\n\n';

	const claimTextEntries = claimIds
		.map(o => claimText(store, entity, o, language));

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

export function entityButtons(store: WikidataEntityStore, entityId: string, language: string): readonly UrlButton[] {
	const entity = new WikidataEntityReader(store.entity(entityId), language);
	const buttons: UrlButton[] = [
		Markup.urlButton(
			new WikidataEntityReader(store.entity('buttons.wikidata'), language).label(),
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
		...claimUrlButtons(store, entity, 'buttons.website', language, url => url),
		...claimUrlButtons(store, entity, 'buttons.github', language, part => `https://github.com/${part}`),
		...claimUrlButtons(store, entity, 'buttons.googlePlayStore', language, part => `https://play.google.com/store/apps/details?id=${part}`),
		...claimUrlButtons(store, entity, 'buttons.imdb', language, part => `https://www.imdb.com/title/${part}/`),
		...claimUrlButtons(store, entity, 'buttons.itunes', language, part => `https://itunes.apple.com/app/id${part}/`),
		...claimUrlButtons(store, entity, 'buttons.sourceCodeRepo', language, url => url),
		...claimUrlButtons(store, entity, 'buttons.steam', language, part => `https://store.steampowered.com/app/${part}/`),
		...claimUrlButtons(store, entity, 'buttons.subreddit', language, part => `https://www.reddit.com/r/${part}/`),
		...claimUrlButtons(store, entity, 'buttons.telegram', language, part => `https://t.me/${part}`),
		...claimUrlButtons(store, entity, 'buttons.twitter', language, part => `https://twitter.com/${part}`),
		...claimUrlButtons(store, entity, 'buttons.twitterHashtag', language, part => `https://twitter.com/hashtag/${part}?f=tweets`)
	];
}

function claimUrlButtons(store: WikidataEntityStore, entity: WikidataEntityReader, storeKey: string, language: string, urlModifier: (part: string) => string): readonly UrlButton[] {
	const property = new WikidataEntityReader(store.entity(storeKey), language);
	const claimValues = entity.claim(property.qNumber());

	const buttons = claimValues.map(o =>
		Markup.urlButton(
			`${property.label()}${claimValues.length > 1 ? ` ${o}` : ''}`,
			urlModifier(o)
		)
	);

	return buttons;
}

function claimText(store: WikidataEntityStore, entity: WikidataEntityReader, claim: string, language: string): string {
	const claimLabel = new WikidataEntityReader(store.entity(claim), language).label();
	const claimValues = entity.claim(claim);

	const claimValueTexts = claimValues
		.map(o => claimValueText(store, o, language));

	return array(claimLabel, claimValueTexts);
}

function claimValueText(store: WikidataEntityStore, value: unknown, language: string): string {
	if (isItemId(value) || isPropertyId(value)) {
		const reader = new WikidataEntityReader(store.entity(value), language);
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
