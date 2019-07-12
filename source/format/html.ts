// https://core.telegram.org/bots/api#html-style

export function escapedText(text: string): string {
	return text
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;');
}

export function bold(text: string): string {
	return `<b>${escapedText(text)}</b>`;
}

export function italic(text: string): string {
	return `<i>${escapedText(text)}</i>`;
}

export function url(label: string, url: string): string {
	return `<a href="${url}">${escapedText(label)}</a>`;
}
