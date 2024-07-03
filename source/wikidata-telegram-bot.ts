import {readFileSync} from 'node:fs';
import {env} from 'node:process';
import {I18n} from '@grammyjs/i18n';
import {FileAdapter} from '@grammyjs/storage-file';
import {Bot, session} from 'grammy';
import {MenuMiddleware} from 'grammy-inline-menu';
import {generateUpdateMiddleware} from 'telegraf-middleware-console-time';
import {resourceKeysFromYaml, TelegrafWikibase} from 'telegraf-wikibase';
import type {Context, Session} from './bot-generics.js';
import {format} from './format/index.js';
import {bot as hearsEntity} from './hears-entity.js';
import {bot as inlineSearch} from './inline-search.js';
import {menu as languageMenu} from './language-menu.js';
import {bot as locationSearch} from './location-search.js';

const token = env['BOT_TOKEN'];
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
	logQueriedEntityIds: env['NODE_ENV'] !== 'production',
	userAgent: 'EdJoPaTo/wikidata-telegram-bot',
});
const wikidataResourceKeyYaml = readFileSync('wikidata-items.yaml', 'utf8');
twb.addResourceKeys(resourceKeysFromYaml(wikidataResourceKeyYaml));

const baseBot = new Bot<Context>(token);

const bot = baseBot.errorBoundary(async ({error}) => {
	if (
		error instanceof Error
		&& error.message.startsWith('400: Bad Request: query is too old')
	) {
		return;
	}

	console.error('BOT ERROR', error);
});

bot.use(session({
	initial: (): Session => ({}),
	storage: new FileAdapter({dirName: 'persist/sessions/'}),
	getSessionKey(ctx) {
		const chatInstance = ctx.chat?.id
			?? ctx.callbackQuery?.chat_instance
			?? ctx.from?.id;
		return chatInstance?.toString();
	},
}));

bot.use(async (ctx, next) => {
	// @ts-expect-error set readonly property
	ctx.state ??= {};

	return next();
});

bot.use(i18n.middleware());
bot.use(twb.middleware());

if (env['NODE_ENV'] !== 'production') {
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

bot.command('privacy', async ctx =>
	ctx.reply(
		'This bot only stores minimal data like your language selection for consistent behaviour between bot server restarts. Requests to Wikidata are not identifyable to the given user. See the source code at https://github.com/EdJoPaTo/wikidata-telegram-bot\n\nYour Telegram User ID: '
			+ format.monospace(String(ctx.from?.id)) + '\n\n'
			+ format.monospaceBlock(
				JSON.stringify(ctx.session, undefined, '  '),
				'json',
			),
		{parse_mode: format.parse_mode, reply_markup: {remove_keyboard: true}},
	));

await baseBot.api.setMyCommands([
	{
		command: 'location',
		description: 'Show info on how to use the location feature',
	},
	{command: 'help', description: 'Show help'},
	{command: 'language', description: 'set your language'},
	{command: 'settings', description: 'set your language'},
	{command: 'privacy', description: 'see information about stored data'},
]);

await baseBot.start({
	onStart(botInfo) {
		console.log(new Date(), 'Bot starts as', botInfo.username);
	},
});
