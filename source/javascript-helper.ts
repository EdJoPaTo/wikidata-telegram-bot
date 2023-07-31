export function unreachable(unreachable: never): never {
	throw new Error(
		'Should have been unreachable but looks like it wasnt: '
			+ JSON.stringify(unreachable),
	);
}
