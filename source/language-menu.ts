import TelegrafInlineMenu from 'telegraf-inline-menu';

/* eslint @typescript-eslint/no-var-requires: warn */
/* eslint @typescript-eslint/no-require-imports: warn */
const localeEmoji = require('locale-emoji');

const menu = new TelegrafInlineMenu(ctx => languageMenuText(ctx));

menu.setCommand(['lang', 'language', 'settings']);

function flagString(languageCode: string, useFallbackFlag = false): string {
	const flag = localeEmoji(languageCode);
	if (!flag && useFallbackFlag) {
		return '🏳️‍🌈';
	}

	return flag;
}

function languageMenuText(ctx: any): string {
	const flag = flagString(ctx.wd.locale(), true);
	return `${flag} ${ctx.wd.r('menu.language').label()}`;
}

menu.select('lang', (ctx: any) => ctx.wd.availableLocales(0), {
	columns: 3,
	textFunc: (_ctx, key) => {
		const flag = flagString(key);
		return `${flag} ${key}`;
	},
	isSetFunc: (ctx: any, key) => key === ctx.wd.locale(),
	setFunc: (ctx: any, key) => {
		ctx.i18n.locale(key);
		ctx.wd.locale(key);
	},
	getCurrentPage: (ctx: any) => ctx.session.page,
	setPage: (ctx: any, page) => {
		ctx.session.page = page;
	}
});

export default menu;
