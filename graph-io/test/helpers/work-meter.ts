/**
 * Work counters for complexity tests. A wall-clock ratio measures the machine as much as the code
 * (a busy runner, a hybrid CPU moving the worker between core types); these count the work
 * itself, so the same input always gives the same number.
 */

import { createHook, executionAsyncResource } from "node:async_hooks";

import type { GraphBuilder } from "@graphty/graph-format";

/** The String.prototype methods that read the whole receiver, each charged its length. */
const WHOLE_STRING = [
    "localeCompare",
    "normalize",
    "padEnd",
    "padStart",
    "replace",
    "replaceAll",
    "split",
    "toLowerCase",
    "toUpperCase",
] as const;

/**
 * How many distinct strings the meter remembers as already read in full, under `flattens`.
 */
// ponytail: a fixed window, so a linear reader that touches more than this many other strings
// between two reads of one long string is charged that string again; raise it if one ever does.
const RECENT = 64;

/**
 * Run `body` and count the characters it examines through the string primitives: the span an
 * indexOf() searched; one per charCodeAt(), codePointAt(), at() and charAt() (so a scanner that
 * reads by index must read through at() or charCodeAt(), never `text[i]`, which no meter can
 * see); the span includes() and lastIndexOf() searched;
 * the search string of startsWith() and endsWith(); the whitespace trim(), trimStart() and
 * trimEnd() removed plus the character that stopped them; the length of every slice(),
 * substring() and join() result; the whole receiver for the methods that read all of it
 * (split(), replace() and the rest of WHOLE_STRING) and for a `for...of` over a string; the rest of the input from lastIndex for a
 * RegExp exec() (which test(), match() and replace() go through). A reader that re-scans or re-joins its carry on
 * every chunk examines the carry once per chunk, which is quadratic in the length of a token
 * spanning many chunks.
 *
 * With `flattens`, every string is also charged its whole length the first time it is read. V8
 * copies a string built by concatenation (`+=`, a template) into one flat buffer the first time
 * anything reads it, even one character of it, so a value grown by `+=` and read once per line
 * costs its length once per line, which is quadratic; no call the meter sees shows that copy. The
 * meter remembers the RECENT strings read last and charges a string again once it drops out.
 * That also charges an input the body only reads once more per character, which is why it is off
 * by default: the per-character bounds of the chunked-reader audits were set without it.
 *
 * The count covers the body alone: if the body gives up control to the event loop (a timer, an
 * I/O callback, a message from the test runner) other code could run inside the window and add
 * to the count, so the meter throws instead of returning a count. Promise continuations are
 * allowed; they run nothing but the body's own chain.
 * @param body - the work to meter
 * @param options - the meter's options
 * @param options.flattens - also charge each string its length when first read (see above)
 * @returns the characters examined
 */
export async function charactersExamined(
    body: () => Promise<void> | void,
    { flattens = false }: { flattens?: boolean } = {},
): Promise<number> {
    let examined = 0;
    const recent: string[] = [];
    const touch = (text: string): void => {
        if (!flattens || recent[0] === text) {
            return;
        }
        const at = recent.indexOf(text);
        if (at < 0) {
            examined += text.length;
            if (recent.length === RECENT) {
                recent.pop();
            }
        } else {
            recent.splice(at, 1);
        }
        recent.unshift(text);
    };
    const patched: [object, PropertyKey, unknown][] = [];
    const patch = (target: object, key: PropertyKey, replacement: (this: never, ...args: never[]) => unknown): void => {
        patched.push([target, key, Reflect.get(target, key)]);
        Reflect.set(target, key, replacement);
    };
    const original = (target: object, key: PropertyKey): ((...a: unknown[]) => unknown) =>
        Reflect.get(target, key) as (...a: unknown[]) => unknown;

    const indexOf = original(String.prototype, "indexOf");
    patch(String.prototype, "indexOf", function (this: string, search: string, from?: number): number {
        touch(this);
        const start = Math.max(0, Math.min(from ?? 0, this.length));
        const at = Reflect.apply(indexOf, this, [search, from]) as number;
        examined += (at < 0 ? this.length : at + search.length) - start;
        return at;
    });
    const includes = original(String.prototype, "includes");
    patch(String.prototype, "includes", function (this: string, search: string, from?: number): boolean {
        touch(this);
        const start = Math.max(0, Math.min(from ?? 0, this.length));
        const at = Reflect.apply(indexOf, this, [search, start]) as number;
        examined += (at < 0 ? this.length : at + search.length) - start;
        return Reflect.apply(includes, this, [search, from]) as boolean;
    });
    const lastIndexOf = original(String.prototype, "lastIndexOf");
    patch(String.prototype, "lastIndexOf", function (this: string, search: string, from?: number): number {
        touch(this);
        const end = Math.max(0, Math.min(from ?? this.length, this.length));
        const at = Reflect.apply(lastIndexOf, this, [search, from]) as number;
        examined += Math.min(this.length, end + search.length) - Math.max(at, 0);
        return at;
    });
    for (const key of ["startsWith", "endsWith"] as const) {
        const ends = original(String.prototype, key);
        patch(String.prototype, key, function (this: string, search: string, position?: number): boolean {
            touch(this);
            examined += search.length;
            return Reflect.apply(ends, this, [search, position]) as boolean;
        });
    }
    for (const key of ["trim", "trimStart", "trimEnd"] as const) {
        const trim = original(String.prototype, key);
        patch(String.prototype, key, function (this: string): string {
            touch(this);
            const out = Reflect.apply(trim, this, []) as string;
            // the whitespace removed, and the character that stopped each scan
            examined += this.length - out.length + (key === "trim" ? 2 : 1);
            return out;
        });
    }
    for (const key of ["charCodeAt", "codePointAt", "at", "charAt"] as const) {
        const read = original(String.prototype, key);
        patch(String.prototype, key, function (this: string, ...args: unknown[]): unknown {
            touch(this);
            examined++;
            return Reflect.apply(read, this, args);
        });
    }
    for (const key of ["slice", "substring"] as const) {
        const cut = original(String.prototype, key);
        patch(String.prototype, key, function (this: string, ...args: unknown[]): unknown {
            touch(this);
            const out = Reflect.apply(cut, this, args) as string;
            examined += out.length;
            return out;
        });
    }
    for (const key of [...WHOLE_STRING, Symbol.iterator]) {
        const whole = original(String.prototype, key);
        patch(String.prototype, key, function (this: string, ...args: unknown[]): unknown {
            touch(this);
            examined += this.length;
            return Reflect.apply(whole, this, args);
        });
    }
    const join = original(Array.prototype, "join");
    patch(Array.prototype, "join", function (this: unknown[], separator?: string): string {
        const out = Reflect.apply(join, this, [separator]) as string;
        examined += out.length;
        return out;
    });
    const exec = original(RegExp.prototype, "exec");
    patch(RegExp.prototype, "exec", function (this: RegExp, input: unknown): RegExpExecArray | null {
        const text = String(input);
        touch(text);
        examined += Math.max(0, text.length - (this.global || this.sticky ? this.lastIndex : 0));
        return Reflect.apply(exec, this, [text]) as RegExpExecArray | null;
    });

    try {
        await alone(body);
    } finally {
        for (const [target, key, value] of patched.reverse()) {
            Reflect.set(target, key, value);
        }
    }
    return examined;
}

/**
 * Run `body`, throwing if it gave up control to the event loop: other code (a timer, an I/O
 * callback, a message from the test runner) could then have run inside a metered window.
 * Promise continuations are allowed; they run nothing but the body's own chain.
 * @param body - the work to run
 */
async function alone(body: () => Promise<void> | void): Promise<void> {
    let yielded: string | null = null;
    const turns = createHook({
        before(): void {
            const resource: unknown = executionAsyncResource();
            if (!(resource instanceof Promise)) {
                yielded ??= (resource as { constructor?: { name?: string } } | null)?.constructor?.name ?? "unknown";
            }
        },
    });
    turns.enable();
    try {
        await body();
    } finally {
        turns.disable();
    }
    if (yielded !== null) {
        throw new Error(
            `the metered body gave up control to the event loop (${yielded}), so other code could add to the count`,
        );
    }
}

/**
 * Run `body` and count its keyed lookups: every Map get() and has() and Set has(). A walk that
 * climbs a parent chain from every node again, instead of stopping at a node already resolved,
 * makes one lookup per step, so its count is quadratic in the chain's length where a linear
 * resolver's is linear.
 * @param body - the work to meter
 * @returns the lookups made
 */
export async function keyedLookups(body: () => Promise<void> | void): Promise<number> {
    let lookups = 0;
    const patched: [object, string, unknown][] = [];
    for (const [target, key] of [
        [Map.prototype, "get"],
        [Map.prototype, "has"],
        [Set.prototype, "has"],
    ] as const) {
        const read = Reflect.get(target, key) as (...a: unknown[]) => unknown;
        patched.push([target, key, read]);
        Reflect.set(target, key, function (this: unknown, ...args: unknown[]): unknown {
            lookups++;
            return Reflect.apply(read, this, args);
        });
    }
    try {
        await alone(body);
    } finally {
        for (const [target, key, value] of patched.reverse()) {
            Reflect.set(target, key, value);
        }
    }
    return lookups;
}

/**
 * Run `body` and measure the CPU time the process spent on it. A RegExp's backtracking happens
 * inside the engine, where no primitive can count it, so a complexity test of a pattern bounds
 * this instead. Unlike a wall clock it leaves out the time a busy machine kept the process
 * waiting for a core, so the bound measures the code, not the load.
 * @param body - the work to meter
 * @returns the CPU milliseconds, user and system
 */
export async function cpuMilliseconds(body: () => Promise<unknown> | unknown): Promise<number> {
    const before = process.cpuUsage();
    await body();
    const { user, system } = process.cpuUsage(before);
    return (user + system) / 1000;
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
            const array = Reflect.construct(
                target,
                args,
                newTarget === globalThis.Array ? target : newTarget,
            ) as unknown[];
            if (args.length !== 1 || args[0] !== length) {
                return array;
            }
            return new Proxy(array, {
                get(inner, key, receiver): unknown {
                    if (
                        typeof key === "string" &&
                        key.length > 0 &&
                        key.charCodeAt(0) >= 48 &&
                        key.charCodeAt(0) <= 57
                    ) {
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
