import {MenuTemplate} from 'telegraf-inline-menu';

import {Context, backButtons} from './bot-generics';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const localeEmoji = require('locale-emoji');

export const menu = new MenuTemplate<Context>(ctx => languageMenuText(ctx));

function flagString(languageCode: string, useFallbackFlag = false): string {
	const flag = localeEmoji(languageCode);
	if (!flag && useFallbackFlag) {
		return '🏳️‍🌈';
	}

	return flag;
}

function languageMenuText(ctx: Context): string {
	const flag = flagString(ctx.wd.locale(), true);
	return `${flag} ${ctx.wd.r('menu.language').label()}`;
}

menu.select('lang', ctx => ctx.wd.availableLocales(0), {
	columns: 3,
	buttonText: (_, key) => {
		const flag = flagString(key);
		return `${flag} ${key}`;
	},
	isSet: (ctx, key) => key === ctx.wd.locale(),
	set: (ctx, key) => {
		ctx.i18n.locale(key);
		ctx.wd.locale(key);
	},
	getCurrentPage: ctx => ctx.session.page,
	setPage: (ctx, page) => {
		ctx.session.page = page;
	}
});

menu.manualRow(backButtons);
