/* eslint capitalized-comments: off */

import WikidataEntityStore from 'wikidata-entity-store';

export const TEXT_INTEREST = [
	'P1705', // native label
	'P1448', // official name
	'P487', // unicode character

	'P31', // instance of
	'P279', // subclass of
	'P136', // genre
	'P361', // part of
	'P366', // use

	'P21', // gender
	'P571', // inception
	'P577', // publication date
	'P569', // date of birth
	'P1750', // name day
	'P106', // occupation
	'P57', // director
	'P161', // cast

	'P131', // located in administrative entity
	'P6375', // street adress
	'P38', // currency
	'P1082', // population
	'P2046', // area,
	'P2067', // mass
	'P2048', // height
	'P2049', // width
	'P4330', // contains

	'P527', // has part
	'P2670', // has parts of the class
	'P186', // material used

	'P460', // said to be the same as
	'P1659' // see also
];

export async function init(store: WikidataEntityStore): Promise<void> {
	await store.preloadQNumbers(...TEXT_INTEREST);
}
