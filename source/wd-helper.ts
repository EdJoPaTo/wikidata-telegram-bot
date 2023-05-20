import {arrayFilterUnique} from 'array-filter-unique';
import {isItemId, isPropertyId, type PropertyId, type SearchResult, simplifySparqlResults, type SparqlResults, type SparqlValueType} from 'wikibase-sdk';
import {wdk} from 'wikibase-sdk/wikidata.org';
import type {WikibaseEntityReader} from 'wikidata-entity-reader';

type Wbk = typeof wdk;

const HOUR_IN_SECONDS = 60 * 60;

const USER_AGENT = 'github.com/EdJoPaTo/wikidata-telegram-bot';
const FETCH_HEADERS = new Headers();
FETCH_HEADERS.set('user-agent', USER_AGENT);
const FETCH_OPTIONS = {headers: FETCH_HEADERS};

let popularEntities: string[] = [];
let popularEntitiesTimestamp = 0;

export function entitiesInClaimValues(
	entity: WikibaseEntityReader | readonly WikibaseEntityReader[],
	claims: readonly PropertyId[],
) {
	const entities: readonly WikibaseEntityReader[] = Array.isArray(entity)
		? entity
		: ([entity] as WikibaseEntityReader[]);

	return claims
		.flatMap(claim => entities.flatMap(entity => entity.claim(claim)))
		.filter((o): o is string => typeof o === 'string')
		.filter(o => isItemId(o) || isPropertyId(o))
		.filter(arrayFilterUnique());
}

export async function getPopularEntities() {
	const now = Date.now() / 1000;
	if (popularEntitiesTimestamp < now - HOUR_IN_SECONDS) {
		popularEntitiesTimestamp = now;

		const headers = new Headers();
		headers.set('user-agent', USER_AGENT);

		const response = await fetch(
			'https://www.wikidata.org/w/index.php?title=Wikidata:Main_Page/Popular&action=raw',
			{
				headers,
			},
		);
		const body = await response.text();

		const regex = /(Q\d+)/g;
		// eslint-disable-next-line @typescript-eslint/ban-types
		let match: RegExpExecArray | null;
		const results: string[] = [];

		while ((match = regex.exec(body)) !== null) {
			results.push(match[1]!);
		}

		popularEntities = results;
	}

	return popularEntities;
}

type SearchEntitiesOptions = Parameters<Wbk['searchEntities']>[0];
export async function searchEntities(options: SearchEntitiesOptions) {
	const url = wdk.searchEntities(options);
	const response = await fetch(url, FETCH_OPTIONS);
	const body = await response.json() as {search: SearchResult[]};
	return body.search;
}

export async function sparqlQuerySimplified(
	query: string,
): Promise<ReadonlyArray<Record<string, SparqlValueType>>> {
	const url = wdk.sparqlQuery(query);
	const response = await fetch(url, FETCH_OPTIONS);
	const body = await response.json() as SparqlResults;
	const simplified = simplifySparqlResults(body) as ReadonlyArray<Record<string, SparqlValueType>>;
	return simplified;
}
