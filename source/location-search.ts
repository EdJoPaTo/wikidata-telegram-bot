import {Composer} from 'telegraf';
import {html as format} from 'telegram-format';
import {Location} from 'typegram';
import {MenuTemplate, Body, MenuMiddleware} from 'telegraf-inline-menu';
import {sparqlQuerySimplified} from 'wikidata-sdk-got';

import {Context} from './bot-generics';
import {GOT_OPTIONS} from './wd-helper';

type EntityId = string;

interface Result {
	readonly place: EntityId;
	readonly distance: number;
	readonly location: Readonly<Location>;
}

const ENTRIES_PER_PAGE = 10;

/**
 * Create query string for everything around that location in the given radius
 * @param location Location (longitude latitude)
 * @param radius Radius in kilometer
 */
function createQueryStringForLocation(location: Location, radius: number): string {
	return `SELECT ?place ?location ?distance WHERE {
SERVICE wikibase:around {
	?place wdt:P625 ?location.
	bd:serviceParam wikibase:center "Point(${location.longitude} ${location.latitude})"^^geo:wktLiteral .
	bd:serviceParam wikibase:radius "${radius}" .
	bd:serviceParam wikibase:distance ?distance.
}
}`;
}

async function queryLocation(location: Location, radius: number): Promise<Result[]> {
	const query = createQueryStringForLocation(location, radius);
	const raw = await sparqlQuerySimplified(query, GOT_OPTIONS);
	const result = raw.map(o => queryJsonEntryToResult(o));
	return result;
}

function queryJsonEntryToResult(rawJson: any): Result {
	const [longitude, latitude] = (rawJson.location as string)
		.slice(6, -1)
		.split(' ')
		.map(o => Number(o));
	return {
		place: rawJson.place,
		distance: rawJson.distance,
		location: {longitude: longitude!, latitude: latitude!}
	};
}

async function createResultsString(ctx: Context, results: readonly Result[], pageZeroBased: number): Promise<string> {
	const relevant = [...results]
		.sort((a, b) => a.distance - b.distance)
		.slice(pageZeroBased * ENTRIES_PER_PAGE, (pageZeroBased + 1) * ENTRIES_PER_PAGE);

	const parts = await Promise.all(relevant.map(async o => entryString(ctx, o)));
	const text = parts.join('\n\n');
	return text;
}

async function entryString(ctx: Context, result: Result): Promise<string> {
	const reader = await ctx.wd.reader(result.place);

	let text = '';

	text += format.italic(formatDistance(result.distance));
	text += '  ';
	text += format.bold(format.escape(reader.label()));
	text += '  ';
	text += '/' + reader.qNumber();

	const placeDescription = reader.description();
	if (placeDescription) {
		text += '\n';
		text += '  ';
		text += format.escape(placeDescription);
	}

	return text;
}

function formatDistance(distance: number): string {
	if (distance < 1) {
		return (distance * 1000).toFixed(0) + ' m';
	}

	return distance.toFixed(3) + ' km';
}

async function menuBody(ctx: Context, path: string): Promise<Body> {
	const [longitude, latitude] = path.split('/')[0]!.split(':').slice(1).map(o => Number(o));
	const results = await queryLocation({longitude: longitude!, latitude: latitude!}, 3);
	await ctx.wd.preload(results.map(o => o.place));
	ctx.state.locationTotalPages = results.length / ENTRIES_PER_PAGE;
	const text = await createResultsString(ctx, results, ctx.session.locationPage ?? 0);
	return {text, parse_mode: format.parse_mode, disable_web_page_preview: true};
}

const menu = new MenuTemplate<Context>(menuBody);

menu.pagination('page', {
	getTotalPages: ctx => ctx.state.locationTotalPages ?? 1,
	getCurrentPage: ctx => (ctx.session.locationPage ?? 0) + 1,
	setPage: (ctx, page) => {
		ctx.session.locationPage = page - 1;
	}
});

export const bot = new Composer<Context>();

const menuMiddleware = new MenuMiddleware(/^location:([.\d]+):([.\d]+)\//, menu);
bot.use(menuMiddleware.middleware());

bot.command('location', async ctx => {
	ctx.session.locationPage = 0;
	await ctx.reply(ctx.i18n.t('location'));
	// Verschwörhaus
	return menuMiddleware.replyToContext(ctx, 'location:9.990333333:48.396472222/');
});

bot.on('location', async ctx => {
	ctx.session.locationPage = 0;
	const {location} = ctx.message;
	const path = `location:${location.longitude}:${location.latitude}/`;
	return menuMiddleware.replyToContext(ctx, path);
});
