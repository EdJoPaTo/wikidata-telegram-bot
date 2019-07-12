// https://core.telegram.org/bots/api#markdown-style

export function bold(text: string): string {
	return `*${text}*`;
}

export function italic(text: string): string {
	return `_${text}_`;
}

export function url(label: string, url: string): string {
	return `[${label}](${url})`;
}
