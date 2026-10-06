/**
 * @file A cache that forgets everything when the session's input revision moves.
 */

/**
 * Values computed at most once per revision and key.
 *
 * The reads that would otherwise walk the graph on every call -- a search index, a sort order, a
 * name rank -- build once and are read from here until anything they could depend on changes.
 * Every key is dropped together when the revision moves, so a stale entry can never be served.
 */
export class RevisionCache<T> {
    readonly #revision: () => unknown;
    #at: unknown = undefined;
    readonly #values = new Map<string, T>();
    readonly #max: number;

    /**
     * Create an empty cache.
     * @param revision - Reads the revision now; any change of value drops every entry.
     * @param max - The most keys kept within one revision; the oldest is dropped past it.
     */
    constructor(revision: () => unknown, max = Infinity) {
        this.#revision = revision;
        this.#max = max;
    }

    /**
     * The value for a key in this revision, built on the first ask.
     * @param key - Which value; use one fixed key for a single cached value.
     * @param build - Computes it.
     * @returns The cached or newly built value.
     */
    get(key: string, build: () => T): T {
        const revision = this.#revision();
        if (!Object.is(revision, this.#at)) {
            this.#values.clear();
            this.#at = revision;
        }

        if (this.#values.has(key)) {
            return this.#values.get(key) as T;
        }

        const value = build();
        if (this.#values.size >= this.#max) {
            this.#values.delete(this.#values.keys().next().value as string);
        }

        this.#values.set(key, value);
        return value;
    }
}
