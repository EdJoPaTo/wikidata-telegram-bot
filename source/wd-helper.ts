import {arrayFilterUnique} from 'array-filter-unique';
import type {WikibaseEntityReader} from 'telegraf-wikibase';
import {
	type EntityId,
	isEntityId,
	type PropertyId,
	type SearchResult,
	simplifySparqlResults,
	type SnakValue,
	type SparqlResults,
	type SparqlValueType,
} from 'wikibase-sdk';
import {wdk} from 'wikibase-sdk/wikidata.org';

type Wbk = typeof wdk;

const HOUR_IN_SECONDS = 60 * 60;

const USER_AGENT = 'github.com/EdJoPaTo/wikidata-telegram-bot';
const FETCH_HEADERS = new Headers();
FETCH_HEADERS.set('user-agent', USER_AGENT);
const FETCH_OPTIONS = {headers: FETCH_HEADERS};

let popularEntities: string[] = [];
let popularEntitiesTimestamp = 0;

export function entitiesInClaimValues(
	entities: readonly WikibaseEntityReader[],
	claims: readonly PropertyId[],
) {
	return claims
		.flatMap(claim => entities.flatMap(entity => entity.claimValues(claim)))
		.flatMap(value => entitiesInSnakValue(value))
		.filter(arrayFilterUnique());
}

function entitiesInSnakValue(claim: SnakValue): EntityId[] {
	if (claim.type === 'wikibase-entityid') {
		return [claim.value.id];
	}

	if (claim.type === 'quantity') {
		const entity = /Q\d+$/.exec(claim.value.unit)?.[0];
		if (entity && isEntityId(entity)) {
			return [entity];
		}
	}

	return [];
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

		const regex = /Q\d+/g;
		// eslint-disable-next-line @typescript-eslint/ban-types
		let match: RegExpExecArray | null;
		const results: string[] = [];

		while ((match = regex.exec(body)) !== null) {
			results.push(match[0]);
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
