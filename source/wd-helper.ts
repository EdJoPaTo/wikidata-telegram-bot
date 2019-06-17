import * as wdk from 'wikidata-sdk';
import WikidataEntityReader from 'wikidata-entity-reader';
import arrayFilterUnique from 'array-filter-unique';

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

