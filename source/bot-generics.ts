import {type Context as BaseContext} from 'grammy';
import {createBackMainMenuButtons} from 'grammy-inline-menu';
import {type I18nContext} from '@grammyjs/i18n';
import {type MiddlewareProperty} from 'telegraf-wikibase';

export type Session = {
	__wikibase_language_code?: string;
	page?: number;
	locationPage?: number;
};

export type State = {
	locationTotalPages?: number;
};

export type Context = BaseContext & {
	readonly i18n: I18nContext;
	readonly session: Session;
	readonly state: State;
	readonly wd: MiddlewareProperty;
};

export const backButtons = createBackMainMenuButtons<Context>(
	ctx => `🔙 ${ctx.i18n.t('menu.back')}`,
	async ctx => {
		const labelReader = await ctx.wd.reader('menu.menu');
		return `🔝 ${labelReader.label()}`;
	},
);
