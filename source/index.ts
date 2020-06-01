import {existsSync, readFileSync} from 'fs';

import {MenuMiddleware} from 'telegraf-inline-menu';
import {Telegraf, Markup, Extra} from 'telegraf';
import {TelegrafWikibase, resourceKeysFromYaml} from 'telegraf-wikibase';
import TelegrafI18n from 'telegraf-i18n';

import {Context} from './bot-generics';
import {menu as languageMenu} from './language-menu';
import * as inlineSearch from './inline-search';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const LocalSession = require('telegraf-session-local');

const tokenFilePath = existsSync('/run/secrets') ? '/run/secrets/bot-token.txt' : 'bot-token.txt';
const token = readFileSync(tokenFilePath, 'utf8').trim();

const localSession = new LocalSession({
	// Database name/path, where sessions will be located (default: 'sessions.json')
	database: 'persist/sessions.json',
	// Format of storage/database (default: JSON.stringify / JSON.parse)
	format: {
		serialize: (input: any) => JSON.stringify(input, null, '\t') + '\n',
		deserialize: (input: string) => JSON.parse(input)
	},
	getSessionKey: (ctx: any) => `${ctx.from.id}`
});

const i18n = new TelegrafI18n({
	directory: 'locales',
	defaultLanguage: 'en',
	defaultLanguageOnMissing: true,
	useSession: true
});

const twb = new TelegrafWikibase(new Map(), {
	contextKey: 'wd'
});
const wikidataResourceKeyYaml = readFileSync('wikidata-items.yaml', 'utf8');
twb.addResourceKeys(resourceKeysFromYaml(wikidataResourceKeyYaml));

const bot = new Telegraf<Context>(token);
bot.use(localSession.middleware());
bot.use(i18n.middleware());
bot.use(twb.middleware());

bot.use(inlineSearch.bot.middleware());

const languageMenuMiddleware = new MenuMiddleware('/', languageMenu);

bot.command(['lang', 'language', 'settings'], async ctx => languageMenuMiddleware.replyToContext(ctx));
bot.hears('/start language', async ctx => languageMenuMiddleware.replyToContext(ctx));

bot.use(languageMenuMiddleware);

bot.command(['start', 'help', 'search'], async ctx => {
	const text = ctx.i18n.t('help');
	const keyboard = Markup.inlineKeyboard([
		Markup.switchToCurrentChatButton('inline search…', ''),
		Markup.urlButton('🦑GitHub', 'https://github.com/EdJoPaTo/wikidata-telegram-bot')
	], {columns: 1});
	return ctx.reply(text, Extra.markup(keyboard));
});

bot.catch((error: any) => {
	if (error.message.startsWith('400: Bad Request: query is too old')) {
		return;
	}

	console.error('telegraf error occured', error);
});

async function startup(): Promise<void> {
	await bot.telegram.setMyCommands([
		{command: 'help', description: 'Show help'},
		{command: 'language', description: 'set your language'},
		{command: 'settings', description: 'set your language'}
	]);

	await bot.launch();
	console.log(new Date(), 'Bot started as', bot.options.username);
}

// eslint-disable-next-line @typescript-eslint/no-floating-promises
startup();
