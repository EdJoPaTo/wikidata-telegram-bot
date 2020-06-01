import {Context as TelegrafContext} from 'telegraf';
import {createBackMainMenuButtons} from 'telegraf-inline-menu';
import {I18n} from 'telegraf-i18n';
import {MiddlewareProperty} from 'telegraf-wikibase';

export interface Session {
	__wikibase_language_code?: string;
	page?: number;
}

export interface Context extends TelegrafContext {
	readonly i18n: I18n;
	readonly session: Session;
	readonly wd: MiddlewareProperty;
}

export const backButtons = createBackMainMenuButtons<Context>(
	ctx => `🔙 ${ctx.i18n.t('menu.back')}`,
	async ctx => `🔝 ${(await ctx.wd.reader('menu.menu')).label()}`
);
