import * as process from 'process';

import {Composer} from 'telegraf';
import {InlineKeyboardMarkup, InlineQueryResultArticle, InlineQueryResultPhoto} from 'typegram';
import {MiddlewareProperty as WikibaseMiddlewareProperty} from 'telegraf-wikibase';
import {searchEntities} from 'wikidata-sdk-got';
import {SearchResult} from 'wikibase-types';

import {Context} from './bot-generics';
import {entitiesInClaimValues, getPopularEntities, GOT_OPTIONS} from './wd-helper';
import {entityWithClaimText, entityButtons, image} from './format-wd-entity';
import {format} from './format';
import * as CLAIMS from './claim-ids';

export const bot = new Composer<Context>();

async function getSearchResults(language: string, query: string): Promise<readonly string[]> {
	if (query) {
		const results = await search(language, query);
		return results.map(o => o.id);
	}

	return getPopularEntities();
}

bot.on('inline_query', async ctx => {
	const {query} = ctx.inlineQuery;
	const language = ctx.wd.locale();

	const identifier = `inline query ${Number(ctx.inlineQuery.id).toString(36).slice(-4)} ${ctx.from.id} ${ctx.from.first_name} ${language} ${query.length} ${query}`;
	console.time(identifier);

	const searchResults = await getSearchResults(language, query);
	console.timeLog(identifier, 'search', searchResults.length);

	await preload(ctx.wd, searchResults);
	console.timeLog(identifier, 'preload');

	const inlineResults = await Promise.all(searchResults
		.map(async o => createInlineResult(ctx, o)),
	);

	const options = {
		switch_pm_text: '🏳️‍🌈 ' + (await ctx.wd.reader('menu.language')).label(),
		switch_pm_parameter: 'language',
		is_personal: true,
		cache_time: 20,
	};

	if (process.env['NODE_ENV'] !== 'production') {
		options.cache_time = 2;
	}

	console.timeEnd(identifier);

	return ctx.answerInlineQuery([
		...inlineResults,
	], options);
});

async function search(language: string, query: string): Promise<readonly SearchResult[]> {
	const options = {
		search: query,
		language,
		continue: 0,
		limit: 10,
	};

	return searchEntities(options, GOT_OPTIONS);
}

async function preload(wb: WikibaseMiddlewareProperty, entityIds: readonly string[]): Promise<void> {
	await wb.preload([...entityIds, ...CLAIMS.TEXT_INTEREST]);
	const entities = await Promise.all(entityIds
		.map(async id => wb.reader(id)),
	);

	const claimEntityIds = entitiesInClaimValues(entities, CLAIMS.TEXT_INTEREST);
	await wb.preload(claimEntityIds);
}

async function createInlineResult(ctx: Context, entityId: string): Promise<InlineQueryResultArticle | InlineQueryResultPhoto> {
	const text = await entityWithClaimText(ctx.wd, entityId, CLAIMS.TEXT_INTEREST);

	const keyboard: InlineKeyboardMarkup = {
		inline_keyboard: (await entityButtons(ctx.wd, entityId)).map(o => [o]),
	};

	const entity = await ctx.wd.reader(entityId);
	const {photo, thumb} = image(entity);

	const inlineResultBase = {
		id: entityId,
		title: entity.label(),
		description: entity.description(),
		parse_mode: format.parse_mode,
		reply_markup: keyboard,
	};

	if (photo && thumb) {
		const inlineResult: InlineQueryResultPhoto = {
			type: 'photo',
			...inlineResultBase,
			photo_url: photo,
			thumb_url: thumb,
			caption: text,
		};

		return inlineResult;
	}

	const inlineResult: InlineQueryResultArticle = {
		type: 'article',
		...inlineResultBase,
		input_message_content: {
			message_text: text,
			disable_web_page_preview: true,
			parse_mode: format.parse_mode,
		},
	};

	return inlineResult;
}
