import {createBackMainMenuButtons} from 'grammy-inline-menu';
import type {Context as BaseContext, SessionFlavor} from 'grammy';
import type {I18nFlavor} from '@grammyjs/i18n';
import type {MiddlewareProperty} from 'telegraf-wikibase';

export type Session = {
	__wikibase_language_code?: string;
	page?: number;
	locationPage?: number;
};

export type State = {
	locationTotalPages?: number;
};

export type Context = BaseContext & SessionFlavor<Session> & I18nFlavor & {
	readonly state: State;
	readonly wd: MiddlewareProperty;
};

export const backButtons = createBackMainMenuButtons<Context>(
	ctx => `🔙 ${ctx.t('menu-back')}`,
	async ctx => {
		const labelReader = await ctx.wd.reader('menu.menu');
		return `🔝 ${labelReader.label()}`;
	},
);
