/**
 * Finds source code that reads a style role column -- a column with the role `color`, `size`,
 * `shape` or `thickness`, or one of the deprecated `yfiles.*` graphics columns -- so a test can
 * fail when such a read appears outside the style readers and writers and the named deprecated
 * paths. Those columns are the old way styles travelled; drawing, node data and style slots come
 * from a file's styles now.
 *
 * Shared by graph-io's and graphty-element's guard tests.
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

/** The style roles. */
const ROLES = "(?:color|size|shape|thickness)";

/** The patterns that read a style role column, each on one line. */
const LINE_PATTERNS: readonly RegExp[] = [
    // table.byRole("color")
    new RegExp(`byRole\\(\\s*["'\`]${ROLES}["'\`]`),
    // meta.role === "color", role !== "size"
    new RegExp(`\\brole\\s*[!=]==?\\s*["'\`]${ROLES}["'\`]`),
    // "color" === meta.role
    new RegExp(`["'\`]${ROLES}["'\`]\\s*[!=]==?\\s*[\\w.?]*\\brole\\b`),
    // const VIZ_ROLES = new Set(["color", ...]) -- a set of role names
    new RegExp(`ROLES\\b[^=]*=\\s*new Set\\(\\[[^\\]]*["'\`]${ROLES}["'\`]`),
    // a yfiles.* graphics column read by name ("yfiles.type" is the GraphML key attribute, not a column)
    /["'`]yfiles\.(?!type\b)/,
];

/** A `case "color":` label. */
const CASE_LABEL = new RegExp(`\\bcase\\s+["'\`]${ROLES}["'\`]\\s*:`);

/** A switch over a role: `switch (role)`, `switch (column.meta.role)`. */
const ROLE_SWITCH = /\bswitch\s*\(\s*[\w.?]*\brole\s*\)/;

/** One read found. */
export interface RoleRead {
    /** The file, relative to the scanned root, with forward slashes. */
    readonly file: string;
    /** The 1-based line. */
    readonly line: number;
    /** The line's text, trimmed. */
    readonly text: string;
}

/**
 * The style role reads in one file's text.
 * @param file - the file's name, for the result
 * @param text - the source
 * @returns the reads, in line order
 */
export function roleReadsIn(file: string, text: string): RoleRead[] {
    const lines = text.split("\n");
    const out: RoleRead[] = [];
    // Inside a switch over a role: the brace depth the switch's body opened at, or -1.
    let switchDepth = -1;
    let depth = 0;
    let pendingSwitch = false;
    lines.forEach((raw, i) => {
        const trimmed = raw.trim();
        const comment = trimmed.startsWith("//") || trimmed.startsWith("*") || trimmed.startsWith("/*");
        if (!comment) {
            if (ROLE_SWITCH.test(raw)) {
                pendingSwitch = true;
            }

            const inSwitch = switchDepth >= 0 && depth > switchDepth;
            if (LINE_PATTERNS.some((pattern) => pattern.test(raw)) || (inSwitch && CASE_LABEL.test(raw))) {
                out.push({ file, line: i + 1, text: trimmed });
            }
        }

        for (const ch of comment ? "" : raw) {
            if (ch === "{") {
                if (pendingSwitch) {
                    switchDepth = depth;
                    pendingSwitch = false;
                }

                depth++;
            } else if (ch === "}") {
                depth--;
                if (depth === switchDepth) {
                    switchDepth = -1;
                }
            }
        }
    });

    return out;
}

/**
 * The style role reads in every `.ts` and `.tsx` file under a directory.
 * @param root - the directory
 * @returns the reads, files in sorted order
 */
export function roleReadsUnder(root: string): RoleRead[] {
    const out: RoleRead[] = [];
    const walk = (dir: string): void => {
        for (const name of readdirSync(dir).sort()) {
            const path = join(dir, name);
            if (statSync(path).isDirectory()) {
                walk(path);
            } else if (/\.tsx?$/.test(name) && !name.endsWith(".d.ts")) {
                out.push(...roleReadsIn(relative(root, path).split("\\").join("/"), readFileSync(path, "utf8")));
            }
        }
    };
    walk(root);
    return out;
}

/**
 * The reads in files no allowed entry covers.
 * @param reads - the reads
 * @param allowed - the files that may read the roles: an exact path, or a pattern over the path
 * @returns the reads outside them
 */
export function outside(reads: readonly RoleRead[], allowed: readonly (string | RegExp)[]): RoleRead[] {
    return reads.filter(
        (read) => !allowed.some((entry) => (typeof entry === "string" ? read.file === entry : entry.test(read.file))),
    );
}
