/* eslint-disable capitalized-comments */

import type {PropertyId} from 'wikibase-sdk';

export const TEXT_INTEREST = [
	// labels
	'P1705', // native label
	'P1448', // official name
	'P5061', // unit symbol
	'P246', // element symbol
	'P1086', // atomic number
	'P628', // E Number (food additives)
	'P274', // chemical formula
	'P487', // unicode character

	// whats it
	'P31', // instance of
	'P279', // subclass of
	'P136', // genre
	'P361', // part of
	'P366', // use
	'P1552', // has quality
	'P111', // measured physical quantity (kelvin measures temperature)

	// meta data
	'P21', // gender
	'P571', // inception
	'P577', // publication date
	'P569', // date of birth
	'P570', // date of death
	'P1750', // name day
	'P106', // occupation
	'P57', // director
	'P161', // cast

	// physical quantities
	'P131', // located in administrative entity
	'P6375', // street adress
	'P38', // currency
	'P1082', // population
	'P2046', // area,
	'P2067', // mass
	'P2048', // height
	'P2049', // width
	'P2101', // melting point
	'P2102', // boiling point
	'P2199', // autoignition temperature

	// whats in it
	'P4330', // contains
	'P527', // has part
	'P2670', // has parts of the class
	'P186', // material used

	// also interesting
	'P460', // said to be the same as
	'P1659', // see also
] as const satisfies readonly PropertyId[];
