/**
 * @file A set a consumer cannot write to, for every set the session hands out.
 */

import { GraphtyError } from "../errors";

/**
 * A set that cannot be written to.
 *
 * `Object.freeze` alone does NOT stop `Set.prototype.add`: a frozen set that silently accepts an
 * `add()` would hand a consumer a mutation the session never saw -- project state changed with no
 * step, or a cached answer changed for every later reader. So the three mutators are replaced on
 * the instance before it is frozen, and a caller that reaches for one is told rather than ignored.
 * @param values - What to put in it.
 * @param hint - What to call instead, said in the error.
 * @returns The sealed set.
 */
export function sealedSet<T>(values: Iterable<T>, hint: string): ReadonlySet<T> {
    const set = new Set<T>(values);

    for (const verb of ["add", "delete", "clear"] as const) {
        Object.defineProperty(set, verb, {
            configurable: false,
            enumerable: false,
            writable: false,
            value: (): never => {
                throw new GraphtyError({
                    code: "E_READONLY",
                    message: `This set is read-only, so "${verb}" on it would change nothing. ${hint}`,
                    source: "data",
                    details: { verb },
                });
            },
        });
    }

    return Object.freeze(set);
}

/**
 * A read-only view of a map: every read, and no writer, not even through a cast. For a map the
 * element keeps and hands out, where a writer would change what it holds behind every step.
 * @param map - The map, which its owner goes on writing.
 * @returns The view.
 */
export function readonlyMapView<K, V>(map: ReadonlyMap<K, V>): ReadonlyMap<K, V> {
    const view: ReadonlyMap<K, V> = Object.freeze({
        get size() {
            return map.size;
        },
        get: (key: K) => map.get(key),
        has: (key: K) => map.has(key),
        keys: () => map.keys(),
        values: () => map.values(),
        entries: () => map.entries(),
        forEach: (callback: (value: V, key: K, self: ReadonlyMap<K, V>) => void, thisArg?: unknown) => {
            map.forEach((value, key) => {
                callback.call(thisArg, value, key, view);
            });
        },
        [Symbol.iterator]: () => map.entries(),
    });
    return view;
}
