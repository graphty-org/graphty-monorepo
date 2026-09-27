/**
 * @file Strict state: extra checks that project state is only ever changed through the
 * dispatcher, switched on in the element's own tests and by anyone who wants them.
 *
 * The switch is the global `globalThis.__GRAPHTY_STRICT_STATE__ = true`, set before a session is
 * created. A global rather than an environment variable, because browsers have no `process` and
 * the published bundle must not touch it. In Node, `GRAPHTY_STRICT_STATE=1` works too; it is
 * read through `globalThis.process`, so where there is none nothing throws. See
 * design/undo/undo-design.md section 12.1.
 */

import { GraphtyError } from "../../errors/GraphtyError";

/**
 * Whether strict state is on. Read once per store, when it is created.
 * @returns True when the global or, in Node, the environment variable asks for it.
 */
export function strictStateEnabled(): boolean {
    const scope = globalThis as {
        __GRAPHTY_STRICT_STATE__?: unknown;
        process?: { env?: Record<string, string | undefined> };
    };

    return scope.__GRAPHTY_STRICT_STATE__ === true || scope.process?.env?.GRAPHTY_STRICT_STATE === "1";
}

/**
 * The error a failed strict check throws: a broken invariant, so a bug in the element.
 * @param what - What was found, as a sentence fragment.
 * @returns The error, to throw.
 */
export function strictViolation(what: string): GraphtyError {
    return new GraphtyError({
        code: "E_INTERNAL",
        message: `Strict state: ${what}.`,
        source: "history",
    });
}

/**
 * Strict: an op-log key (a node or edge id, or a whole `graph` or `pins` slice) being acquired by
 * one open group must not already be held by another, because an op-log cannot hand a key over.
 * @param key - The key being acquired.
 * @param holder - The label of the other open group holding it, or null when none does.
 */
export function checkSoleHolder(key: string, holder: string | null): void {
    if (holder !== null) {
        throw strictViolation(`${key} is being acquired while the open group "${holder}" holds it`);
    }
}

/**
 * Strict: a command dispatched inline through a group-tagged facade touches only keys that are
 * free or held by its own group (design section 4.5).
 * @param op - The inline command's op.
 * @param key - The op-log key another group holds.
 * @param holder - The label of that group.
 */
export function checkInlineKey(op: string, key: string, holder: string): void {
    throw strictViolation(
        `"${op}", dispatched inline through a plugin's graph facade, needs ${key}, which "${holder}" holds`,
    );
}

// ---------------------------------------------------------------------------------------------
// Retained typed arrays
// ---------------------------------------------------------------------------------------------

/** A typed array state keeps, with what it was when first kept. */
interface Retained {
    readonly array: WeakRef<ArrayBufferView>;
    /** What holds it, for the message: "the arrangement slice's capture". */
    readonly what: string;
    readonly sum: number;
}

/** Every array retained. */
const retained = { all: new Set<Retained>(), seen: new WeakSet<ArrayBufferView>() };

/**
 * A checksum of an array's bytes (FNV-1a), or -1 for one whose buffer was detached.
 * @param array - The array.
 * @returns The checksum.
 */
function checksum(array: ArrayBufferView): number {
    if (array.buffer.byteLength === 0 && array.byteLength === 0) {
        return -1;
    }

    const bytes = new Uint8Array(array.buffer, array.byteOffset, array.byteLength);
    let sum = 0x811c9dc5;
    for (const byte of bytes) {
        sum = Math.imul(sum ^ byte, 0x01000193);
    }

    return sum >>> 0;
}

/**
 * Strict: note a typed array state has just come to keep. Typed arrays cannot be frozen, so its
 * bytes are summed now, and a later check that finds them changed names what holds it. Nothing
 * happens when strict state is off, or for an array already noted.
 * @param array - The array.
 * @param what - What holds it, as a noun phrase naming the slice.
 */
export function retainArray(array: ArrayBufferView, what: string): void {
    if (!strictStateEnabled() || retained.seen.has(array)) {
        return;
    }

    retained.seen.add(array);
    const entry = { array: new WeakRef(array), what, sum: checksum(array) };
    retained.all.add(entry);
}

/**
 * Throw when one retained array's bytes changed.
 * @param entry - The array.
 * @returns False when the array has been collected.
 */
function verify(entry: Retained): boolean {
    const array = entry.array.deref();
    if (array === undefined) {
        return false;
    }

    const sum = checksum(array);
    if (sum !== -1 && sum !== entry.sum) {
        throw strictViolation(
            `${entry.what} was written in place after state kept it; typed arrays in state are never written`,
        );
    }

    return true;
}

/**
 * Strict: check every retained array still alive, as each dispatch does and the test setup does
 * after each test.
 */
export function verifyRetainedArrays(): void {
    for (const entry of retained.all) {
        if (!verify(entry)) {
            retained.all.delete(entry);
        }
    }
}

/**
 * Strict: the graph store's builder was changed by something other than the graph primitives.
 * @param count - How many mutations nobody accounted for.
 * @returns The error, to throw.
 */
export function builderDrift(count: number): GraphtyError {
    return strictViolation(
        `the graph slice's builder was mutated ${String(count)} time(s) outside a command; ` +
            "dispatch data.apply or data.import instead of writing the store",
    );
}

// The test setup sweeps every retained array after each test, and reaches this through a global
// so that the setup file imports nothing from the element. Only where strict state is on.
if (strictStateEnabled()) {
    (globalThis as { __GRAPHTY_STRICT_SWEEP__?: () => void }).__GRAPHTY_STRICT_SWEEP__ = verifyRetainedArrays;
}
