/**
 * @file The keys of rows that name no key of their own (spec 6.1): a keyless edge row is keyed by
 * its ends, a node row of a source with no key column by its content. Neither depends on a copy id
 * or on a row's position, so refreshing, re-sorting or appending to a source keeps saved references
 * bound. Shared by the session build and the save file's reader, writer and version 1 migration.
 */

import { sha256HexSync } from "@graphty/graph-io";

/** A row: its cells by working column name. */
type Cells = Readonly<Record<string, unknown>>;

/**
 * A value as a document writes it (spec 11): a non-finite number as its string form, an integer
 * beyond +/-(2^53 - 1) as its decimal string, `undefined` members left out.
 * @param value - The value.
 * @returns The value JSON can carry.
 */
export function jsonSafe(value: unknown): unknown {
    if (typeof value === "number") {
        if (!Number.isFinite(value)) {
            return String(value);
        }

        return Number.isInteger(value) && !Number.isSafeInteger(value) ? BigInt(value).toString() : value;
    }

    if (Array.isArray(value)) {
        return value.map((each) => (each === undefined ? null : jsonSafe(each)));
    }

    if (typeof value === "object" && value !== null) {
        const out: Record<string, unknown> = {};
        for (const [name, each] of Object.entries(value)) {
            if (each !== undefined) {
                out[name] = jsonSafe(each);
            }
        }

        return out;
    }

    return value;
}

/**
 * RFC 8785 canonical JSON: members sorted by UTF-16 code units, numbers as ECMAScript writes them.
 * @param value - A JSON value; non-finite numbers are written as their string forms first.
 * @returns The canonical text.
 */
export function canonicalJson(value: unknown): string {
    const safe = jsonSafe(value);
    if (safe === null || typeof safe !== "object") {
        return JSON.stringify(safe ?? null);
    }

    if (Array.isArray(safe)) {
        return `[${safe.map((each) => canonicalJson(each)).join(",")}]`;
    }

    const record = safe as Record<string, unknown>;
    const names = Object.keys(record).sort((a, b) => (a < b ? -1 : Number(a > b))); // code-unit order is the rule
    const members = names.map((name) => `${JSON.stringify(name)}:${canonicalJson(record[name])}`);
    return `{${members.join(",")}}`;
}

/**
 * A value as key text (spec 11): a string as it is (NFC), a number as ECMAScript writes it, a
 * boolean as `true` or `false`.
 * @param value - The cell.
 * @returns The key text, or undefined for a value that cannot be a key (null, the empty string).
 */
export function keyText(value: unknown): string | undefined {
    if (typeof value === "string") {
        return value === "" ? undefined : value.normalize("NFC");
    }

    if (typeof value === "number" && Number.isFinite(value)) {
        // An integer too big to hold exactly is its exact decimal string, never "1e+21" (spec 11).
        return Number.isInteger(value) && !Number.isSafeInteger(value) ? BigInt(value).toString() : String(value);
    }

    return typeof value === "boolean" ? String(value) : undefined;
}

/**
 * A key written into a composite key: `\` as `\\` and `|` as `\|`.
 * @param k - The key.
 * @returns The escaped key.
 */
export const escapeKey = (k: string): string => k.replaceAll(/[\\|]/g, String.raw`\$&`);

/**
 * The keys of a table's keyless edge rows (spec 6.1): `<from>|<to>#<n>`, the end texts escaped,
 * n counting from 1 in row order over the keyless rows with the same ordered pair, skipping any
 * number whose key a row's edge id already holds.
 * @param rows - The table's rows, every one of them, in order.
 * @param columns - The columns the rows are read by.
 * @param columns.source - The source end's column.
 * @param columns.target - The target end's column.
 * @param columns.edgeId - The edge-id column, if any.
 * @returns Each row's key, or undefined for a row with an edge id or an empty end.
 */
export function keylessEdgeKeys(
    rows: readonly Cells[],
    columns: { readonly source: string; readonly target: string; readonly edgeId?: string },
): (string | undefined)[] {
    const { source, target, edgeId } = columns;
    const idOf = (row: Cells): string | undefined => (edgeId === undefined ? undefined : keyText(row[edgeId]));
    const taken = new Set(rows.map((row) => idOf(row)).filter((id) => id !== undefined));
    const counts = new Map<string, number>();
    return rows.map((row) => {
        const [from, to] = [keyText(row[source]), keyText(row[target])];
        if (from === undefined || to === undefined || idOf(row) !== undefined) {
            return undefined;
        }

        const pair = `${escapeKey(from)}|${escapeKey(to)}`;
        let n = counts.get(pair) ?? 0;
        do {
            n++;
        } while (taken.has(`${pair}#${String(n)}`));
        counts.set(pair, n);
        return `${pair}#${String(n)}`;
    });
}

/**
 * The keys of node rows of a source with no key column (spec 6.1): `<digest>#<n>`, the digest the
 * first 32 hex digits of the SHA-256 of the canonical JSON of the row's non-null cells, n counting
 * rows with the same digest in row order.
 * @param rows - The rows, in order.
 * @returns Each row's key.
 */
export function keylessNodeKeys(rows: readonly Cells[]): string[] {
    const counts = new Map<string, number>();
    return rows.map((row) => {
        const cells = Object.fromEntries(Object.entries(row).filter(([, value]) => value !== null));
        const digest = sha256HexSync(canonicalJson(cells)).slice(0, 32);
        const n = (counts.get(digest) ?? 0) + 1;
        counts.set(digest, n);
        return `${digest}#${String(n)}`;
    });
}
