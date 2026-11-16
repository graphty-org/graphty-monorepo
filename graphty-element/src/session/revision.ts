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
     * @param revision - Reads the revision now; any change of value drops every entry. An array
     *     is compared item by item, so a revision made of several parts needs no token of its own.
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
        if (!sameRevision(revision, this.#at)) {
            this.#values.clear();
            this.#at = revision;
        }

        if (this.#values.has(key)) {
            return this.#values.get(key) as T;
        }

        const value = build();
        this.#store(key, value);
        return value;
    }

    /**
     * The revision now, for work that spans a wait: hand it to {@link isCurrent} or {@link put}.
     * @returns The revision.
     */
    now(): unknown {
        return this.#revision();
    }

    /**
     * Whether the revision is still the one read earlier.
     * @param at - What {@link now} returned.
     * @returns True when nothing has moved since.
     */
    isCurrent(at: unknown): boolean {
        return sameRevision(at, this.#revision());
    }

    /**
     * Whether a key holds a value for the current revision.
     * @param key - Which value.
     * @returns True when a read of it costs nothing.
     */
    has(key: string): boolean {
        return this.isCurrent(this.#at) && this.#values.has(key);
    }

    /**
     * Keep a value built across a wait, if the revision it was built at is still current.
     * @param key - Which value.
     * @param value - The value.
     * @param at - What {@link now} returned before the build began.
     * @returns True when it was kept.
     */
    put(key: string, value: T, at: unknown): boolean {
        if (!this.isCurrent(at)) {
            return false;
        }

        if (!sameRevision(at, this.#at)) {
            this.#values.clear();
            this.#at = at;
        }

        this.#store(key, value);
        return true;
    }

    /**
     * Keep a value, dropping the oldest past the limit.
     * @param key - Which value.
     * @param value - The value.
     */
    #store(key: string, value: T): void {
        if (!this.#values.has(key) && this.#values.size >= this.#max) {
            this.#values.delete(this.#values.keys().next().value as string);
        }

        this.#values.set(key, value);
    }
}

/**
 * Whether two revisions are the same: by identity, or item by item for two arrays.
 * @param a - One revision.
 * @param b - The other.
 * @returns True when nothing in them differs.
 */
function sameRevision(a: unknown, b: unknown): boolean {
    if (Array.isArray(a) && Array.isArray(b)) {
        return a.length === b.length && a.every((each, at) => Object.is(each, b[at]));
    }

    return Object.is(a, b);
}
