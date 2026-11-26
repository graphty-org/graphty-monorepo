/**
 * @file The shared area every value graphty-element or an extension keeps on a node or an edge
 * hangs from -- `store.<namespace>.<key>.<field>`, graphty-element's own under the `graphty`
 * namespace -- and the upgrade of the older addresses a saved file may still hold.
 *
 * Nothing here reaches Babylon.js, Lit or the DOM.
 */

import type { Path } from "../catalog/types";
import { quotePath, renamePaths } from "./styles/predicate";

/**
 * The members whose text is one raw path, never an expression (spec 4.8.1 rule 2): a selector's
 * `path`, a binding's `by`, a leaf's `attribute`, `path` and `reads`, the window's `attribute`,
 * `end` and `spells`, and a collapse's `groupBy`.
 */
export const PATH_MEMBERS: ReadonlySet<string> = new Set([
    "path",
    "by",
    "attribute",
    "reads",
    "end",
    "spells",
    "groupBy",
]);

/** The older addresses that moved into the shared area, by the prefix each moved from. */
const MOVED: readonly (readonly [from: string, to: string])[] = [["graphty.notes.", "store.graphty.notes."]];

/** A node value read at one end of an edge: `graphty.source.<node path>`, `graphty.target.<node path>`. */
const END = /^graphty\.(source|target)\.(.+)$/;

/** A label template's placeholder: `{path}` or `{path|op}`. */
const PLACEHOLDER = /\{([^{}|]*)((?:\|[^{}]*)?)\}/g;

/**
 * One raw path at its current address: `graphty.notes.<field>` is `store.graphty.notes.<field>`,
 * at an edge's end too; every other path comes back as it was.
 * @param path - The raw path (never quoted).
 * @returns The path.
 */
function upgradeStorePath(path: Path): Path {
    const end = END.exec(path);
    if (end !== null) {
        return `graphty.${end[1]}.${upgradeStorePath(end[2])}`;
    }

    const moved = MOVED.find(([from]) => path.startsWith(from));
    return moved === undefined ? path : `${moved[1]}${path.slice(moved[0].length)}`;
}

/**
 * An expression with every path at an older address moved, by token, so a string literal is never
 * touched. An expression that does not parse is kept as it is.
 * @param where - The expression.
 * @returns The expression.
 */
function upgradeExpression(where: string): string {
    if (!where.includes("graphty.")) {
        return where;
    }

    try {
        return renamePaths(where, (path) => {
            const upgraded = upgradeStorePath(path);
            return upgraded === path ? undefined : quotePath(upgraded);
        });
    } catch {
        return where; // Words, not an expression.
    }
}

/**
 * A saved layer, set, filter, recipe or any other JSON with every path at an older address moved
 * to the shared area: a path member's path, an expression (a `where`), and a label template's
 * placeholders. A file's data is not passed here: a column may carry any name.
 * @param value - The value.
 * @param member - The member the value is held under.
 * @returns The value, copied where it changed.
 */
export function upgradeStorePaths<T>(value: T, member = ""): T {
    if (typeof value === "string") {
        if (PATH_MEMBERS.has(member)) {
            return upgradeStorePath(value) as T;
        }

        if (member === "where") {
            return upgradeExpression(value) as T;
        }

        return (
            member === "template"
                ? value.replaceAll(PLACEHOLDER, (_all, path: string, op: string) => `{${upgradeStorePath(path)}${op}}`)
                : value
        ) as T;
    }

    if (Array.isArray(value)) {
        return value.map((each: unknown) => upgradeStorePaths(each, member)) as T;
    }

    if (typeof value === "object" && value !== null) {
        return Object.fromEntries(
            Object.entries(value).map(([name, each]) => [name, upgradeStorePaths(each, name)]),
        ) as T;
    }

    return value;
}
