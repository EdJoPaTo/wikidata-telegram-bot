import {MenuTemplate} from 'grammy-inline-menu';
// @ts-expect-error there are no types
import localeEmoji from 'locale-emoji';

import {backButtons, type Context} from './bot-generics.js';

export const menu = new MenuTemplate<Context>(languageMenuText);

function flagString(languageCode: string, useFallbackFlag = false) {
	// eslint-disable-next-line @typescript-eslint/no-unsafe-call
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
	async set(ctx, key) {
		await ctx.i18n.setLocale(key);
		ctx.wd.locale(key);
		return true;
	},
	getCurrentPage: ctx => ctx.session.page,
	setPage(ctx, page) {
		ctx.session.page = page;
	},
});

menu.manualRow(backButtons);
