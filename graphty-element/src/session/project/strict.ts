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
