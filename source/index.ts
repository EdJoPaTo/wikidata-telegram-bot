import {existsSync, readFileSync} from 'fs';

import Telegraf, {Markup, Extra} from 'telegraf';
import TelegrafI18n from 'telegraf-i18n';
import TelegrafWikibase from 'telegraf-wikibase';
import WikidataEntityStore from 'wikidata-entity-store';

import * as CLAIMS from './claim-ids';
import * as inlineSearch from './inline-search';
import languageMenu from './language-menu';

/* eslint @typescript-eslint/no-var-requires: warn */
/* eslint @typescript-eslint/no-require-imports: warn */
const LocalSession = require('telegraf-session-local');

const tokenFilePath = existsSync('/run/secrets') ? '/run/secrets/bot-token.txt' : 'bot-token.txt';
const token = readFileSync(tokenFilePath, 'utf8').trim();

const localSession = new LocalSession({
	// Database name/path, where sessions will be located (default: 'sessions.json')
	database: 'persist/sessions.json',
	// Format of storage/database (default: JSON.stringify / JSON.parse)
	format: {
		serialize: (obj: any) => JSON.stringify(obj, null, '\t') + '\n',
		deserialize: (str: string) => JSON.parse(str)
	},
	getSessionKey: (ctx: any) => `${ctx.from.id}`
});

const i18n = new TelegrafI18n({
	directory: 'locales',
	defaultLanguage: 'en',
	defaultLanguageOnMissing: true,
	useSession: true
});

console.time('preload wikidata entity store');
const wdEntityStore = new WikidataEntityStore({
	properties: ['info', 'labels', 'descriptions', 'aliases', 'claims', 'sitelinks']
});

const wikidataResourceKeyYaml = readFileSync('wikidata-items.yaml', 'utf8');
wdEntityStore.addResourceKeyYaml(wikidataResourceKeyYaml)
	.then(() => console.timeLog('preload wikidata entity store', 'wikidata-middleware'));

CLAIMS.init(wdEntityStore)
	.then(() => console.timeLog('preload wikidata entity store', 'claims of interest'));

inlineSearch.init(wdEntityStore)
	.then(() => console.timeLog('preload wikidata entity store', 'presearch inline search'));

const bot = new Telegraf(token);
bot.use(localSession.middleware());
bot.use(i18n.middleware());

bot.use(new TelegrafWikibase(wdEntityStore, {
	contextKey: 'wd'
}).middleware());

bot.use(inlineSearch.bot as any);

bot.use(languageMenu.init({
	backButtonText: (ctx: any) => `🔙 ${ctx.i18n.t('menu.back')}`,
	mainMenuButtonText: (ctx: any) => `🔝 ${ctx.wd.r('menu.menu').label()}`
}));

bot.command(['start', 'help', 'search'], (ctx: any) => {
	const text = ctx.i18n.t('help');
	const keyboard = Markup.inlineKeyboard([
		Markup.switchToCurrentChatButton('inline search…', '')
	] as any[]);
	return ctx.reply(text, Extra.markup(keyboard));
});

bot.catch((error: any) => {
	if (error.message.startsWith('400: Bad Request: query is too old')) {
		return;
	}

	console.error('telegraf error occured', error);
});

bot.startPolling();
