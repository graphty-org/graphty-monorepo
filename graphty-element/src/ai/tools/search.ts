/**
 * @file The search index behind `catalog search` and every did-you-mean: token matching over a
 * catalog entry's id, names, description, category and keywords, with prefix matches and an
 * exact-id boost. No embeddings and no network, so it works the same on every engine.
 */

import { CATALOG_KINDS, type CatalogKind } from "../../catalog/assistant";

export { CATALOG_KINDS, type CatalogKind };

/** One entry the index can find. */
export interface IndexEntry {
    readonly kind: CatalogKind;
    readonly name: string;
    readonly plainName: string;
    /** One line: what it is. */
    readonly summary: string;
    /** The tool and action that use it. */
    readonly tool: string;
    readonly action?: string;
    /** Further words to match: technical name, category, keywords. */
    readonly words?: readonly string[];
}

/** Words a search ignores. */
const STOP_WORDS = new Set([
    "a",
    "an",
    "the",
    "of",
    "to",
    "and",
    "or",
    "in",
    "on",
    "for",
    "by",
    "with",
    "my",
    "me",
    "is",
    "are",
    "which",
    "what",
    "how",
    "do",
    "i",
    "it",
    "this",
    "that",
    "graph",
]);

/**
 * The words of a text, lowercase, without stop words.
 * @param text - The text.
 * @returns Its tokens.
 */
export function tokens(text: string): string[] {
    return text
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter((word) => word.length > 0 && !STOP_WORDS.has(word));
}

/** A search over entries. */
export class SearchIndex {
    private readonly rows: readonly { entry: IndexEntry; name: string[]; rest: string[] }[];

    /**
     * Index entries.
     * @param entries - The entries.
     */
    constructor(entries: readonly IndexEntry[]) {
        this.rows = entries.map((entry) => ({
            entry,
            name: [...tokens(entry.name), ...tokens(entry.plainName)],
            rest: [...tokens(entry.summary), ...(entry.words ?? []).flatMap(tokens)],
        }));
    }

    /**
     * The entries best matching a text, best first.
     * @param text - What to find.
     * @param options - A kind to keep to, and how many.
     * @param options.kind - Only entries of this kind.
     * @param options.limit - The most to return.
     * @returns The hits.
     */
    search(text: string, options: { kind?: CatalogKind; limit?: number } = {}): IndexEntry[] {
        const query = tokens(text);
        const exact = text.trim().toLowerCase();
        const scored: { entry: IndexEntry; score: number }[] = [];
        for (const row of this.rows) {
            if (options.kind !== undefined && row.entry.kind !== options.kind) {
                continue;
            }

            let score = row.entry.name.toLowerCase() === exact ? 10 : 0;
            for (const word of query) {
                score += scoreWord(word, row.name, 3) + scoreWord(word, row.rest, 1);
            }

            if (score > 0) {
                scored.push({ entry: row.entry, score });
            }
        }

        return scored
            .sort((a, b) => b.score - a.score)
            .slice(0, options.limit ?? 5)
            .map((hit) => hit.entry);
    }

    /**
     * Every entry of a kind.
     * @param kind - The kind.
     * @returns The entries.
     */
    entries(kind?: CatalogKind): IndexEntry[] {
        return this.rows.map((row) => row.entry).filter((entry) => kind === undefined || entry.kind === kind);
    }
}

/**
 * How well one query word matches a token list: whole word, or a prefix of four letters or more.
 * @param word - The query word.
 * @param words - The tokens.
 * @param weight - What a whole match is worth.
 * @returns The score.
 */
function scoreWord(word: string, words: readonly string[], weight: number): number {
    if (words.includes(word)) {
        return weight;
    }

    const stem = word.length >= 4 ? word.slice(0, Math.max(4, word.length - 2)) : null;
    return stem !== null && words.some((candidate) => candidate.startsWith(stem)) ? weight / 2 : 0;
}

/**
 * Names close to one that was not found: those containing it or contained in it, then those
 * within a few edits.
 * @param name - The name given.
 * @param names - The names it may be.
 * @param limit - The most to suggest.
 * @returns The suggestions.
 */
export function suggest(name: string, names: readonly string[], limit = 3): string[] {
    const lower = name.toLowerCase().replaceAll("_", "-");
    return names
        .map((candidate) => {
            const other = candidate.toLowerCase();
            const contains = other.includes(lower) || lower.includes(other) ? 0 : 1;
            return { candidate, distance: contains === 0 ? 0 : editDistance(lower, other) };
        })
        .filter((row) => row.distance <= Math.max(2, Math.floor(lower.length / 3)))
        .sort((a, b) => a.distance - b.distance)
        .slice(0, limit)
        .map((row) => row.candidate);
}

/**
 * The Levenshtein distance between two strings.
 * @param a - One.
 * @param b - The other.
 * @returns The distance.
 */
function editDistance(a: string, b: string): number {
    let previous = Array.from({ length: b.length + 1 }, (_, index) => index);
    for (let i = 1; i <= a.length; i++) {
        const current = [i];
        for (let j = 1; j <= b.length; j++) {
            current[j] = Math.min(
                previous[j] + 1,
                current[j - 1] + 1,
                previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
            );
        }

        previous = current;
    }

    return previous[b.length];
}
