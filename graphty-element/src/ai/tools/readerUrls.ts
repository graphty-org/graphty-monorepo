/**
 * @file The URLs the reader gave in their own words: an import reads only such a URL (or one the
 * host admits), and web fetch reaches only their hosts (or the configured ones). A URL the model
 * wrote, or one planted in the graph's data, is never among them.
 */

/**
 * A text as an absolute http or https URL.
 * @param text - The text.
 * @returns The URL, or undefined for anything else.
 */
export function httpUrl(text: string): URL | undefined {
    try {
        const url = new URL(text);
        return url.protocol === "http:" || url.protocol === "https:" ? url : undefined;
    } catch {
        return undefined;
    }
}

/** Punctuation a sentence puts before a URL, which is not part of it. */
const OPENERS = `<("'[{`;
/** Punctuation a sentence puts after a URL, which is not part of it. */
const CLOSERS = `>)"']},.;:!?`;

/**
 * A word without the punctuation a sentence puts around it.
 * @param word - The word.
 * @returns It, unwrapped.
 */
function unwrapped(word: string): string {
    let start = 0;
    let end = word.length;
    while (start < end && OPENERS.includes(word[start])) {
        start++;
    }

    while (end > start && CLOSERS.includes(word[end - 1])) {
        end--;
    }

    return word.slice(start, end);
}

/**
 * The URLs in the reader's own text: each word that is an absolute http or https URL, as written
 * or without the punctuation around it. Never a fragment of a word.
 * @param readerText - What the reader wrote.
 * @returns The URLs, in order.
 */
export function readerUrls(readerText: string): URL[] {
    return readerText.split(/\s+/).flatMap((word) => {
        const url = httpUrl(unwrapped(word)) ?? httpUrl(word);
        return url === undefined ? [] : [url];
    });
}

/**
 * Whether the reader's own text holds this URL.
 * @param url - The URL, parsed.
 * @param readerText - What the reader wrote.
 * @returns True when it does.
 */
export function readerGave(url: URL, readerText: string): boolean {
    return readerText
        .split(/\s+/)
        .flatMap((word) => [word, unwrapped(word)])
        .some((word) => httpUrl(word)?.href === url.href);
}
