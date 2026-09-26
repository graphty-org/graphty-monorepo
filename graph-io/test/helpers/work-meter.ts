/**
 * Work counters for complexity tests. A wall-clock ratio measures the machine as much as the code
 * (a busy runner, a hybrid CPU moving the worker between core types); these count the work
 * itself, so the same input always gives the same number.
 */

import type { GraphBuilder } from "@graphty/graph-format";

const original = {
    indexOf: String.prototype.indexOf,
    charCodeAt: String.prototype.charCodeAt,
    codePointAt: String.prototype.codePointAt,
    slice: String.prototype.slice,
    substring: String.prototype.substring,
    join: Array.prototype.join,
    exec: RegExp.prototype.exec,
};

/**
 * Run `body` and count the characters it examines through the string primitives a reader scans
 * with: the span an indexOf() searched, one per charCodeAt() / codePointAt(), the length of every
 * slice(), substring() and join() result, and the rest of the input from lastIndex for a
 * RegExp exec() (which test(), match() and replace() go through). A reader that re-scans or
 * re-joins its carry on every chunk examines the carry once per chunk, which is quadratic in
 * the length of a token spanning many chunks.
 * @param body - the work to meter
 * @returns the characters examined
 */
export async function charactersExamined(body: () => Promise<void> | void): Promise<number> {
    let examined = 0;
    // the originals are restored in the finally block
    String.prototype.indexOf = function (this: string, search: string, from?: number): number {
        const start = Math.max(0, Math.min(from ?? 0, this.length));
        const at = Reflect.apply(original.indexOf, this, [search, from]);
        examined += (at < 0 ? this.length : at + search.length) - start;
        return at;
    };
    String.prototype.charCodeAt = function (this: string, index: number): number {
        examined++;
        return Reflect.apply(original.charCodeAt, this, [index]);
    };
    String.prototype.codePointAt = function (this: string, index: number): number | undefined {
        examined++;
        return Reflect.apply(original.codePointAt, this, [index]);
    };
    String.prototype.slice = function (this: string, ...args: (number | undefined)[]): string {
        const out = Reflect.apply(original.slice, this, args) as string;
        examined += out.length;
        return out;
    };
    String.prototype.substring = function (this: string, ...args: (number | undefined)[]): string {
        const out = Reflect.apply(original.substring, this, args) as string;
        examined += out.length;
        return out;
    };
    Array.prototype.join = function (this: unknown[], separator?: string): string {
        const out = Reflect.apply(original.join, this, [separator]);
        examined += out.length;
        return out;
    };
    RegExp.prototype.exec = function (this: RegExp, input: unknown): RegExpExecArray | null {
        const text = String(input);
        examined += Math.max(0, text.length - (this.global || this.sticky ? this.lastIndex : 0));
        return Reflect.apply(original.exec, this, [text]);
    };
    try {
        await body();
    } finally {
        String.prototype.indexOf = original.indexOf;
        String.prototype.charCodeAt = original.charCodeAt;
        String.prototype.codePointAt = original.codePointAt;
        String.prototype.slice = original.slice;
        String.prototype.substring = original.substring;
        Array.prototype.join = original.join;
        RegExp.prototype.exec = original.exec;
    }
    return examined;
}

/**
 * Count, from now on, the reads by index of a builder's node and edge column arrays. A column
 * name resolved through the builder's name index reads one slot; a scan by name reads every
 * earlier column, which is quadratic in the column count.
 * @param builder - a builder no column has been declared on yet
 * @returns the running read count
 */
export function countColumnReads(builder: GraphBuilder): () => number {
    let reads = 0;
    const { staging } = builder as unknown as { staging: { nodeColumns: unknown[]; edgeColumns: unknown[] } };
    const counted = (columns: unknown[]): unknown[] =>
        new Proxy(columns, {
            get(target, key, receiver): unknown {
                if (typeof key === "string" && /^\d+$/.test(key)) {
                    reads++;
                }
                return Reflect.get(target, key, receiver);
            },
        });
    staging.nodeColumns = counted(staging.nodeColumns);
    staging.edgeColumns = counted(staging.edgeColumns);
    return () => reads;
}

/**
 * Run `body` and count the reads by index of every array it creates with `new Array(length)` for
 * this exact length (an importer's per-vertex table, say). A loop that restarts from position
 * zero on every line reads such a table quadratically often.
 * @param length - the length of the arrays to watch
 * @param body - the work to meter
 * @returns the reads by index
 */
export async function arrayReadsOfLength(length: number, body: () => Promise<void>): Promise<number> {
    let reads = 0;
    const OriginalArray = globalThis.Array;
    globalThis.Array = new Proxy(OriginalArray, {
        construct(target, args: unknown[], newTarget): object {
            const array = Reflect.construct(target, args, newTarget === globalThis.Array ? target : newTarget) as unknown[];
            if (args.length !== 1 || args[0] !== length) {
                return array;
            }
            return new Proxy(array, {
                get(inner, key, receiver): unknown {
                    if (typeof key === "string" && key.length > 0 && key.charCodeAt(0) >= 48 && key.charCodeAt(0) <= 57) {
                        reads++;
                    }
                    return Reflect.get(inner, key, receiver);
                },
            });
        },
    });
    try {
        await body();
    } finally {
        globalThis.Array = OriginalArray;
    }
    return reads;
}
