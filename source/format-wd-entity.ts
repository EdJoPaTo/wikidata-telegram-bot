import {getSitelinkData} from 'wikidata-sdk';
import {Markup, UrlButton} from 'telegraf';
import WikidataEntityReader from 'wikidata-entity-reader';
import WikidataEntityStore from 'wikidata-entity-store';

import {secureIsEntityId} from './wd-helper';

export function entityWithClaimText(store: WikidataEntityStore, entityId: string, claimIds: string[], language = 'en'): string {
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
	text += `*${entity.label()}*`;
	text += ' ';
	text += `_${entity.qNumber()}_`;

	const description = entity.description();
	if (description) {
		text += '\n';
		text += description;
	}

	const aliases = entity.aliases();
	if (aliases.length > 0) {
		text += '\n\n';
		text += markdownArray('Alias', aliases);
	}

	return text;
}

export function entityButtons(store: WikidataEntityStore, entityId: string, language: string): UrlButton[] {
	const entity = new WikidataEntityReader(store.entity(entityId), language);
	const buttons: UrlButton[] = [
		Markup.urlButton(
			new WikidataEntityReader(store.entity('buttons.wikidata'), language).label(),
			entity.url()
		)
	];

	const sitelinkButtons: UrlButton[] = entity.allSitelinksInLang()
		.map(o => Markup.urlButton(
			getSitelinkData(o).project,
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

function claimUrlButtons(store: WikidataEntityStore, entity: WikidataEntityReader, storeKey: string, language: string, urlModifier: (part: string) => string): UrlButton[] {
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

	return markdownArray(claimLabel, claimValueTexts);
}

function claimValueText(store: WikidataEntityStore, value: any, language: string): string {
	if (secureIsEntityId(value)) {
		const id = value as string;
		const reader = new WikidataEntityReader(store.entity(id), language);
		return `[${reader.label()}](${reader.url()})`;
	}

	return String(value);
}

function markdownArray(label: string, values: readonly string[], maxValuesShown = 8): string {
	if (values.length === 0) {
		return '';
	}

	let text = '';
	text += `*${label}*`;
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
