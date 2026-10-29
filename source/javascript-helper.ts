export function typedEntries<K extends keyof any, V>(
	record: Readonly<Partial<Record<K, V>>>,
): Array<[K, V]> {
	// oxlint-disable-next-line typescript/strict-boolean-expressions
	if (!record) {
		return [];
	}

	return Object.entries(record) as unknown[] as Array<[K, V]>;
}

export function unreachable(value: never): never {
	throw new Error("Should have been unreachable but looks like it wasnt: " + JSON.stringify(value));
}
