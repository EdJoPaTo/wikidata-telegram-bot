import {readFileSync} from 'node:fs';

import {Bot, session} from 'grammy';
import {FileAdapter} from '@grammyjs/storage-file';
import {generateUpdateMiddleware} from 'telegraf-middleware-console-time';
import {I18n} from '@grammyjs/i18n';
import {MenuMiddleware} from 'grammy-inline-menu';
import {resourceKeysFromYaml, TelegrafWikibase} from 'telegraf-wikibase';

import {bot as hearsEntity} from './hears-entity.js';
import {bot as inlineSearch} from './inline-search.js';
import {bot as locationSearch} from './location-search.js';
import {menu as languageMenu} from './language-menu.js';
import type {Context, Session} from './bot-generics.js';

(process as any).title = 'wikidata-tgbot';

const token = process.env['BOT_TOKEN'];
if (!token) {
	throw new Error(
		'You have to provide the bot-token from @BotFather via environment variable (BOT_TOKEN)',
	);
}

export const i18n = new I18n({
	defaultLocale: 'en',
	directory: 'locales',
	useSession: true,
});

const twb = new TelegrafWikibase({
	contextKey: 'wd',
	logQueriedEntityIds: process.env['NODE_ENV'] !== 'production',
	userAgent: 'EdJoPaTo/wikidata-telegram-bot',
});
const wikidataResourceKeyYaml = readFileSync('wikidata-items.yaml', 'utf8');
twb.addResourceKeys(resourceKeysFromYaml(wikidataResourceKeyYaml));

const bot = new Bot<Context>(token);

bot.use(session({
	initial: (): Session => ({}),
	storage: new FileAdapter({dirName: 'persist/sessions/'}),
	getSessionKey(ctx) {
		// TODO: remove once https://github.com/grammyjs/grammY/pull/89 is released
		const chatInstance = ctx.chat?.id
			?? ctx.callbackQuery?.chat_instance
			?? ctx.from?.id;
		return chatInstance?.toString();
	},
}));

bot.use(async (ctx, next) => {
	if (!ctx.state) {
		// @ts-expect-error set readonly property
		ctx.state = {};
	}

	return next();
});

bot.use(i18n.middleware());
bot.use(twb.middleware());

if (process.env['NODE_ENV'] !== 'production') {
	bot.use(generateUpdateMiddleware());
}

bot.use(hearsEntity.middleware());
bot.use(inlineSearch.middleware());
bot.use(locationSearch.middleware());

const languageMenuMiddleware = new MenuMiddleware('/', languageMenu);

bot.command(
	['lang', 'language', 'settings'],
	async ctx => languageMenuMiddleware.replyToContext(ctx),
);
bot.hears(
	'/start language',
	async ctx => languageMenuMiddleware.replyToContext(ctx),
);

bot.use(languageMenuMiddleware);

bot.command(['start', 'help', 'search'], async ctx => {
	const text = ctx.t('help');
	return ctx.reply(text, {
		reply_markup: {
			inline_keyboard: [[{
				text: 'inline search…',
				switch_inline_query_current_chat: '',
			}], [{
				text: '🦑GitHub',
				url: 'https://github.com/EdJoPaTo/wikidata-telegram-bot',
			}]],
		},
	});
});

// eslint-disable-next-line unicorn/prefer-top-level-await
bot.catch(error => {
	if (error.message.startsWith('400: Bad Request: query is too old')) {
		return;
	}

	console.error('BOT ERROR', error);
});

await bot.api.setMyCommands([
	{
		command: 'location',
		description: 'Show info on how to use the location feature',
	},
	{command: 'help', description: 'Show help'},
	{command: 'language', description: 'set your language'},
	{command: 'settings', description: 'set your language'},
]);

await bot.start({
	onStart(botInfo) {
		console.log(new Date(), 'Bot starts as', botInfo.username);
	},
});
