import {Composer} from 'grammy';
import type {Context} from './bot-generics.ts';
import * as CLAIMS from './claim-ids.ts';
import {
	entityButtons,
	entityWithClaimText,
	image,
} from './format-wd-entity.ts';
import {format} from './format/index.ts';
import {entitiesInClaimValues} from './wd-helper.ts';

export const bot = new Composer<Context>();

bot.hears(/^\/?([qpl][1-9]\d*)$/i, async ctx => {
	const entityId = ctx.match[1]!.toUpperCase();
	const entity = await ctx.wd.reader(entityId);

	const claimEntityIds = entitiesInClaimValues([entity], CLAIMS.TEXT_INTEREST);
	await ctx.wd.preload([...claimEntityIds, ...CLAIMS.ALL]);

	const text = await entityWithClaimText(
		ctx.wd,
		entityId,
		CLAIMS.TEXT_INTEREST,
	);

	const buttons = await entityButtons(ctx.wd, entityId);
	const inline_keyboard = buttons.map(o => [o]);

	const {photo} = image(entity);

	if (photo) {
		return ctx.replyWithPhoto(photo, {
			caption: text,
			parse_mode: format.parse_mode,
			reply_markup: {inline_keyboard},
		});
	}

	return ctx.reply(text, {
		link_preview_options: {is_disabled: true},
		parse_mode: format.parse_mode,
		reply_markup: {inline_keyboard},
	});
});
