import {Markup, UrlButton} from 'telegraf';
import WikidataEntityReader from 'wikidata-entity-reader';
import WikidataEntityStore from 'wikidata-entity-store';

import {secureIsEntityId} from './wd-helper';

const MAX_CLAIM_VALUES = 8;

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

	return [
		...buttons,
		...claimUrlButtons(store, entity, 'buttons.website', language, url => url),
		...claimUrlButtons(store, entity, 'buttons.github', language, part => `https://github.com/${part}`),
		...claimUrlButtons(store, entity, 'buttons.imdb', language, part => `https://www.imdb.com/title/${part}/`),
		...claimUrlButtons(store, entity, 'buttons.sourceCodeRepo', language, url => url),
		...claimUrlButtons(store, entity, 'buttons.steam', language, part => `https://store.steampowered.com/app/${part}/`),
		...claimUrlButtons(store, entity, 'buttons.subreddit', language, part => `https://www.reddit.com/r/${part}/`),
		...claimUrlButtons(store, entity, 'buttons.twitter', language, part => `https://twitter.com/${part}`),
		...claimUrlButtons(store, entity, 'buttons.twitterHashtag', language, part => `https://twitter.com/hashtag/${part}?f=tweets`)
	];
}

function claimUrlButtons(store: WikidataEntityStore, entity: WikidataEntityReader, storeKey: string, language: string, urlModifier: (part: string) => string): UrlButton[] {
	const property = new WikidataEntityReader(store.entity(storeKey), language);
	const claimValues = entity.claim(property.qNumber());

	const buttons = claimValues.map(o =>
		Markup.urlButton(
			property.label(),
			urlModifier(o)
		)
	);

	return buttons;
}

function claimText(store: WikidataEntityStore, entity: WikidataEntityReader, claim: string, language: string): string {
	const claimLabel = new WikidataEntityReader(store.entity(claim), language).label();
	const claimValues = entity.claim(claim);

	if (claimValues.length === 0) {
		return '';
	}

	let text = '';
	text += `*${claimLabel}*`;
	text += '\n';

	const lines = claimValues
		.slice(0, MAX_CLAIM_VALUES)
		.map(o => claimValueText(store, o, language))
		.map(o => `- ${o}`);

	text += lines.join('\n');

	if (claimValues.length > MAX_CLAIM_VALUES) {
		text += '\n- …';
	}

	return text;
}

function claimValueText(store: WikidataEntityStore, value: any, language: string): string {
	if (secureIsEntityId(value)) {
		const id = value as string;
		const reader = new WikidataEntityReader(store.entity(id), language);
		return `[${reader.label()}](${reader.url()})`;
	}

	return String(value);
}
