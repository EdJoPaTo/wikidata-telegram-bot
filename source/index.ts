import {existsSync, readFileSync} from 'fs';

import {generateUpdateMiddleware} from 'telegraf-middleware-console-time';
import {I18n as TelegrafI18n} from '@edjopato/telegraf-i18n';
import {MenuMiddleware} from 'telegraf-inline-menu';
import {Telegraf, Markup} from 'telegraf';
import {TelegrafWikibase, resourceKeysFromYaml} from 'telegraf-wikibase';
import * as LocalSession from 'telegraf-session-local';

import {bot as hearsEntity} from './hears-entity';
import {bot as inlineSearch} from './inline-search';
import {bot as locationSearch} from './location-search';
import {Context} from './bot-generics';
import {menu as languageMenu} from './language-menu';

process.title = 'wikidata-tgbot';

const token = (existsSync('/run/secrets/bot-token.txt') && readFileSync('/run/secrets/bot-token.txt', 'utf8').trim()) ||
	(existsSync('bot-token.txt') && readFileSync('bot-token.txt', 'utf8').trim()) ||
	// eslint-disable-next-line @typescript-eslint/dot-notation
	process.env['BOT_TOKEN'];
if (!token) {
	throw new Error('You have to provide the bot-token from @BotFather via file (bot-token.txt) or environment variable (BOT_TOKEN)');
}

const localSession = new LocalSession({
	// Database name/path, where sessions will be located (default: 'sessions.json')
	database: 'persist/sessions.json',
	// Format of storage/database (default: JSON.stringify / JSON.parse)
	format: {
		serialize: input => JSON.stringify(input, null, '\t') + '\n',
		deserialize: input => JSON.parse(input)
	},
	getSessionKey: ctx => String(ctx.from?.id)
});

const i18n = new TelegrafI18n({
	directory: 'locales',
	defaultLanguage: 'en',
	defaultLanguageOnMissing: true,
	useSession: true
});

const twb = new TelegrafWikibase({
	contextKey: 'wd',
	// eslint-disable-next-line @typescript-eslint/dot-notation
	logQueriedEntityIds: process.env['NODE_ENV'] !== 'production',
	userAgent: 'EdJoPaTo/wikidata-telegram-bot'
});
const wikidataResourceKeyYaml = readFileSync('wikidata-items.yaml', 'utf8');
twb.addResourceKeys(resourceKeysFromYaml(wikidataResourceKeyYaml));

const bot = new Telegraf<Context>(token);
bot.use(localSession.middleware());
bot.use(i18n.middleware());
bot.use(twb.middleware());

// eslint-disable-next-line @typescript-eslint/dot-notation
if (process.env['NODE_ENV'] !== 'production') {
	bot.use(generateUpdateMiddleware());
}

bot.use(hearsEntity.middleware());
bot.use(inlineSearch.middleware());
bot.use(locationSearch.middleware());

const languageMenuMiddleware = new MenuMiddleware('/', languageMenu);

bot.command(['lang', 'language', 'settings'], async ctx => languageMenuMiddleware.replyToContext(ctx));
bot.hears('/start language', async ctx => languageMenuMiddleware.replyToContext(ctx));

bot.use(languageMenuMiddleware);

bot.command(['start', 'help', 'search'], async ctx => {
	const text = ctx.i18n.t('help');
	const keyboard = Markup.inlineKeyboard([
		Markup.button.switchToCurrentChat('inline search…', ''),
		Markup.button.url('🦑GitHub', 'https://github.com/EdJoPaTo/wikidata-telegram-bot')
	], {columns: 1});
	return ctx.reply(text, keyboard);
});

bot.catch((error: any) => {
	if (error.message.startsWith('400: Bad Request: query is too old')) {
		return;
	}

	console.error('telegraf error occured', error);
});

async function startup(): Promise<void> {
	await bot.telegram.setMyCommands([
		{command: 'location', description: 'Show info on how to use the location feature'},
		{command: 'help', description: 'Show help'},
		{command: 'language', description: 'set your language'},
		{command: 'settings', description: 'set your language'}
	]);

	await bot.launch();
	console.log(new Date(), 'Bot started as', bot.botInfo?.username);
}

// eslint-disable-next-line @typescript-eslint/no-floating-promises
startup();
