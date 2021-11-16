import {Context as BaseContext} from 'telegraf';
import {createBackMainMenuButtons} from 'telegraf-inline-menu';
import {I18nContext} from '@grammyjs/i18n';
import {MiddlewareProperty} from 'telegraf-wikibase';

export interface Session {
	__wikibase_language_code?: string;
	page?: number;
	locationPage?: number;
}

export interface State {
	locationTotalPages?: number;
}

export interface Context extends BaseContext {
	readonly i18n: I18nContext;
	readonly session: Session;
	readonly state: State;
	readonly wd: MiddlewareProperty;
}

export const backButtons = createBackMainMenuButtons<Context>(
	ctx => `🔙 ${ctx.i18n.t('menu.back')}`,
	async ctx => `🔝 ${(await ctx.wd.reader('menu.menu')).label()}`,
);
