import {MenuTemplate} from 'grammy-inline-menu';

import {Context, backButtons} from './bot-generics';

// eslint-disable-next-line @typescript-eslint/no-var-requires, unicorn/prefer-module, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-require-imports
const localeEmoji = require('locale-emoji');

export const menu = new MenuTemplate<Context>(languageMenuText);

function flagString(languageCode: string, useFallbackFlag = false) {
	const flag = localeEmoji(languageCode) as string;
	if (!flag && useFallbackFlag) {
		return '🏳️‍🌈';
	}

	return flag;
}

async function languageMenuText(ctx: Context) {
	const flag = flagString(ctx.wd.locale(), true);
	const reader = await ctx.wd.reader('menu.language');
	return `${flag} ${reader.label()}`;
}

menu.select('lang', async ctx => ctx.wd.availableLocales(0), {
	columns: 3,
	buttonText(_, key) {
		const flag = flagString(key);
		return `${flag} ${key}`;
	},
	isSet: (ctx, key) => key === ctx.wd.locale(),
	set(ctx, key) {
		ctx.i18n.locale(key);
		ctx.wd.locale(key);
		return true;
	},
	getCurrentPage: ctx => ctx.session.page,
	setPage(ctx, page) {
		ctx.session.page = page;
	},
});

menu.manualRow(backButtons);
