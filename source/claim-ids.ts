/* eslint-disable capitalized-comments */

import type {PropertyId} from 'wikibase-sdk';

export const TEXT_INTEREST = [
	// labels
	'P1705', // native label
	'P1448', // official name
	'P1813', // short name
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
	'P6553', // personal pronoun
	'P571', // inception
	'P575', // time of discovery or invention
	'P577', // publication date
	'P569', // date of birth
	'P570', // date of death
	'P1750', // name day

	// health
	'P1995', // health specialty
	'P689', // afflicts
	'P780', // symptoms and signs

	// human relation
	'P106', // occupation
	'P800', // notable work
	'P57', // director
	'P161', // cast
	'P102', // member of political party

	// physical quantities
	'P131', // located in administrative entity
	'P6375', // street adress
	'P625', // coordinate location
	'P38', // currency
	'P1082', // population
	'P2046', // area
	'P2067', // mass
	'P2044', // elevation above sea level
	'P2048', // height
	'P2049', // width
	'P2101', // melting point
	'P2102', // boiling point
	'P2199', // autoignition temperature

	// whats in it
	'P4330', // contains
	'P2283', // uses
	'P527', // has part
	'P2670', // has parts of the class
	'P186', // material used
	'P1535', // used by

	// also interesting
	'P460', // said to be the same as
	'P1659', // see also
] as const satisfies readonly PropertyId[];

export const BUTTON_INTEREST: Readonly<Record<PropertyId, ((value: string) => string)>> = {
	P856: url => url, // official website
	P4033: mastodonUrl,
	P345: part => `https://www.imdb.com/title/${part}/`,
	P1733: part => `https://store.steampowered.com/app/${part}/`,
	P2397: part => `https://www.youtube.com/channel/${part}`,
	P3984: part => `https://www.reddit.com/r/${part}/`,
	P3861: part => `https://itunes.apple.com/app/id${part}/`,
	P3418: part => `https://play.google.com/store/apps/details?id=${part}`,
	P1324: url => url, // source code repository URL
	P2037: part => `https://github.com/${part}`,
	P3789: part => `https://telegram.me/${part}`,
	P2002: part => `https://twitter.com/${part}`,
	P2572: part => `https://twitter.com/hashtag/${part}?f=tweets`,
};

function mastodonUrl(value: string): string {
	const [username, domain] = value.split('@');
	return `https://${domain!}/@${username!}`;
}

export const ALL: readonly PropertyId[] = [
	...TEXT_INTEREST,
	...Object.keys(BUTTON_INTEREST) as PropertyId[],
];
