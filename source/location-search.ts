import {sparqlQuerySimplified} from 'wikidata-sdk-got';
import {Composer, Extra} from 'telegraf';
import {Location} from 'telegram-typings';

import {GOT_OPTIONS} from './wd-helper';
import {Context} from './bot-generics';
import {html as format} from 'telegram-format/dist/source';

export const bot = new Composer<Context>();

type EntityId = string;

interface Result {
	readonly place: EntityId;
	readonly distance: number;
	readonly location: Readonly<Location>;
}

/**
 * Create query string for everything around that location in the given radius
 * @param location Location (longitude latitude)
 * @param radius Radius in kilometer
 */
function createQueryStringForLocation(location: Location, radius: number): string {
	return `SELECT ?place ?location ?distance WHERE {
wd:Q27945856 wdt:P625 ?loc .
SERVICE wikibase:around {
	?place wdt:P625 ?location.
	bd:serviceParam wikibase:center "Point(${location.longitude} ${location.latitude})"^^geo:wktLiteral .
	bd:serviceParam wikibase:radius "${radius}" .
	bd:serviceParam wikibase:distance ?distance.
}
} ORDER BY ?dist`;
}

async function queryLocation(location: Location, radius: number): Promise<Result[]> {
	const raw = await sparqlQuerySimplified(createQueryStringForLocation(location, radius), GOT_OPTIONS);
	const result = raw.map(queryJsonEntryToResult);
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
		location: {longitude, latitude}
	};
}

bot.command('location', async ctx => {
	// Verschwörhaus
	const results = await queryLocation({longitude: 9.990333333, latitude: 48.396472222}, 1);
	let text = '';
	text += ctx.i18n.t('location').trim();
	text += '\n\n';
	text += await createResultsString(ctx, results);
	return ctx.replyWithHTML(text, Extra.webPreview(false) as any);
});

bot.on('location', async ctx => {
	const location = ctx.message!.location!;
	const results = await queryLocation(location, 3);
	const text = await createResultsString(ctx, results);
	return ctx.replyWithHTML(text, Extra.webPreview(false) as any);
});

async function createResultsString(ctx: Context, results: readonly Result[]): Promise<string> {
	const relevant = [...results].sort((a, b) => a.distance - b.distance).slice(0, 16);
	await ctx.wd.preload(relevant.map(o => o.place));

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
	text += format.url(reader.qNumber(), reader.url());

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
