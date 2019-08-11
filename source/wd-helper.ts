import * as wdk from 'wikidata-sdk';
import WikidataEntityReader from 'wikidata-entity-reader';
import arrayFilterUnique from 'array-filter-unique';

/* eslint @typescript-eslint/no-var-requires: warn */
/* eslint @typescript-eslint/no-require-imports: warn */
const got = require('got');

const HOUR_IN_SECONDS = 60 * 60;

let popularEntities: string[] = [];
let popularEntitiesTimestamp = 0;

export function secureIsEntityId(something: any): boolean {
	if (typeof something !== 'string') {
		return false;
	}

	if (!something.startsWith('Q') && !something.startsWith('P')) {
		return false;
	}

	return wdk.isEntityId(something);
}

export async function entitiesInClaimValues(entity: WikidataEntityReader | readonly WikidataEntityReader[], claims: string[]): Promise<string[]> {
	const entities: readonly WikidataEntityReader[] = Array.isArray(entity) ? entity : [entity];

	return claims
		.flatMap(c => entities.flatMap(e => e.claim(c)))
		.filter(o => typeof o === 'string')
		.filter(o => o.startsWith('Q') || o.startsWith('P'))
		.filter(arrayFilterUnique())
		.filter(o => secureIsEntityId(o));
}

export async function getPopularEntities(): Promise<string[]> {
	const now = Date.now() / 1000;
	if (popularEntitiesTimestamp < now - HOUR_IN_SECONDS) {
		popularEntitiesTimestamp = now;

		const {body} = await got('https://www.wikidata.org/w/index.php?title=Wikidata:Main_Page/Popular&action=raw');
		const regex = /(Q\d+)/g;
		let match: RegExpExecArray | null;
		const results: string[] = [];

		while ((match = regex.exec(body)) !== null) {
			results.push(match[1]);
		}

		popularEntities = results;
	}

	return popularEntities;
}
