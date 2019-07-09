import {Composer, Markup} from 'telegraf';
import {InlineQueryResult} from 'telegram-typings';
import {searchEntities} from 'wikidata-sdk-got';
import {SearchResult} from 'wikidata-sdk';
import arrayFilterUnique from 'array-filter-unique';
import WikidataEntityReader from 'wikidata-entity-reader';
import WikidataEntityStore from 'wikidata-entity-store';

import {entitiesInClaimValues} from './wd-helper';
import {entityWithClaimText, entityButtons} from './format-wd-entity';
import * as CLAIMS from './claim-ids';

function genCharArray(charA: string, charZ: string): string[] {
	const result = [];
	for (let i = charA.charCodeAt(0); i <= charZ.charCodeAt(0); i++) {
		result.push(String.fromCharCode(i));
	}

	return result;
}

export async function init(store: WikidataEntityStore): Promise<void> {
	const alphabet = genCharArray('A', 'Z');
	const resultArrArr = await Promise.all(
		alphabet.map(async o => search('en', o))
	);

	const entityIds = resultArrArr
		.flat()
		.map(o => o.id)
		.filter(arrayFilterUnique());

	await preload(store, entityIds);
}

/* eslint @typescript-eslint/camelcase: off */
export const bot = new Composer();

bot.on('inline_query', async ctx => {
	const {query} = ctx.inlineQuery!;
	const language = (ctx as any).wd.locale();

	const identifier = `inline query ${Number(ctx.inlineQuery!.id).toString(36).slice(-4)} ${ctx.from!.id} ${ctx.from!.first_name} ${language} ${query.length} ${query}`;
	console.time(identifier);

	const store = (ctx as any).wd.store as WikidataEntityStore;

	const searchResults = await search(language, query || ctx.from!.first_name);
	console.timeLog(identifier, 'search', searchResults.length);

	await preload(store, searchResults.map(o => o.id));
	console.timeLog(identifier, 'preload');

	const inlineResults = searchResults
		.map(o => createInlineResult(ctx, o));

	const options = {
		is_personal: true,
		cache_time: 20
	};

	if (process.env.NODE_ENV !== 'production') {
		options.cache_time = 2;
	}

	console.timeEnd(identifier);

	return ctx.answerInlineQuery([
		...inlineResults
	], options);
});

async function search(language: string, query: string): Promise<SearchResult[]> {
	const result = await searchEntities({
		search: query,
		language,
		limit: 10
	});

	return result.search;
}

async function preload(store: WikidataEntityStore, entityIds: string[]): Promise<void> {
	await store.preloadQNumbers(...entityIds);

	const entities = entityIds
		.map(id => new WikidataEntityReader(store.entity(id)));
	const claimEntityIds = await entitiesInClaimValues(entities, CLAIMS.TEXT_INTEREST);
	await store.preloadQNumbers(...claimEntityIds);
}

function createInlineResult(ctx: any, result: SearchResult): InlineQueryResult {
	const entity = ctx.wd.r(result.id) as WikidataEntityReader;

	const text = entityWithClaimText(ctx.wd.store, result.id, CLAIMS.TEXT_INTEREST, ctx.wd.locale());

	const keyboard = Markup.inlineKeyboard(
		entityButtons(ctx.wd.store, result.id, ctx.wd.locale()) as any[],
		{columns: 1}
	);

	const image = entity.images(800).map(o => encodeURI(o))[0];
	const thumb = entity.images(100).map(o => encodeURI(o))[0];

	const inlineResult: InlineQueryResult = {
		type: image ? 'photo' : 'article',
		id: result.id,
		title: result.label,
		description: result.description,
		photo_url: image,
		thumb_url: thumb,
		parse_mode: 'markdown',
		reply_markup: keyboard
	};

	if (image) {
		inlineResult.caption = text;
	} else {
		inlineResult.input_message_content = {
			message_text: text,
			disable_web_page_preview: true,
			parse_mode: 'markdown'
		};
	}

	return inlineResult;
}
