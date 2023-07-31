export function typedEntries<K extends keyof any, V>(
	record: Readonly<Partial<Record<K, V>>>,
): Array<[K, V]> {
	if (!record) {
		return [];
	}

	return (Object.entries(record) as unknown[]) as Array<[K, V]>;
}

export function unreachable(unreachable: never): never {
	throw new Error(
		'Should have been unreachable but looks like it wasnt: '
			+ JSON.stringify(unreachable),
	);
}
