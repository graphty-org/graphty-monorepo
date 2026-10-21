/**
 * @file Where a layer made from a file's styles came from, as typed facts: {@link FileStyleOrigin}
 * and {@link fileStyleOf}, so an application words "Colors from the file, by Modularity Class (9
 * values)" from data and never reads a layer's `userData` by shape or parses a path.
 *
 * The facts ride on the layer's own `fileStyle` field, apart from the consumer's `userData`, so
 * they are saved and restored with the layer wherever the layer goes (a style document, a project
 * file). The element never reads them to paint.
 *
 * Nothing here reaches Babylon.js, Lit or the DOM.
 */

import type { StyleRuleOrigin, StyleRuleReason, StyleRuleRole } from "@graphty/graph-io/styles";

import type { Path } from "../../../catalog/types";

/**
 * What a file's rule is: the defaults, a group, a data mapping, per-element copies or the
 * exceptions on top. Open union: later releases add values.
 */
export type FileStyleRole = StyleRuleRole;

/**
 * Where a file's rule came from: written by the file (`declared`), recovered from its values
 * (`inferred`), or the default of the program that wrote the file (`tool`). Open union.
 */
export type FileStyleRuleOrigin = StyleRuleOrigin;

/**
 * Why a layer copies a file's values instead of explaining them, or how it was built: no column
 * explains them, a style class, a cap on layers, a function, the work budget, a wide selector, a
 * table too large, a scale or calculated value the format cannot hold. Open union.
 */
export type FileStyleReason = StyleRuleReason;

/** The named members of an open string union (its `(string & {})` member left out). */
type Named<T> = T extends unknown ? (string extends T ? never : T) : never;

/** One entry per reason graph-io names: a reason it adds and this table lacks fails to compile. */
const REASONS: Readonly<Record<Named<FileStyleReason>, true>> = {
    NO_EXPLANATION: true,
    STYLE_CLASS: true,
    LAYER_CAP: true,
    SOURCE_NODE_COLOR: true,
    END_NODES_COLOR: true,
    FILL_BORDER: true,
    NODE_SIZE_LABEL: true,
    EDGE_WEIGHT: true,
    END_NODE_COLORS: true,
    NODE_FILL_SHADE: true,
    NODE_SIZE: true,
    NODE_POSITIONS: true,
    NODE_NAME: true,
    FUNCTION: true,
    BUDGET: true,
    SELECTOR: true,
    TABLE_SIZE: true,
    SCALE: true,
    CALCULATED: true,
    RESULT_PATH: true,
};

/**
 * Every {@link FileStyleReason} this version gives, for an application that words each one. The
 * union is open: a later release may add a reason, which an application words generically.
 */
export const FILE_STYLE_REASONS: readonly FileStyleReason[] = Object.freeze(Object.keys(REASONS));

/** What one generated value of a style column means in the file's own words. */
export interface FileStyleMeaning {
    /** The generated value or class number, as the column holds it (`3` for `member.3`). */
    readonly value: string | number | boolean;
    /** The file's own name for it (`kinase`). */
    readonly name: string;
}

/** How a layer turns a column's values into paint. */
export type FileStyleMappingKind = "passthrough" | "discrete" | "continuous";

/**
 * Where one style layer came from when it was made from a file's styles, as facts an application
 * words for itself. Read it with {@link fileStyleOf}.
 */
export interface FileStyleOrigin {
    /** The graph-io format id or JSON dialect the file was read as (`gexf`, `cytoscape-js`). */
    readonly format: string;
    /** The load the layer belongs to; its layers are filed under the template `file:<importId>`. */
    readonly importId: string;
    /** The id of the file's rule the layer was made from (`node.by.Modularity Class`). */
    readonly ruleId: string;
    /** What the rule is. */
    readonly role: FileStyleRole;
    /** Where the rule came from. */
    readonly origin: FileStyleRuleOrigin;
    /** The column the layer reads, as the path it reads it at. */
    readonly column?: Path;
    /** What each generated value of that column means in the file's own words. */
    readonly meanings?: readonly FileStyleMeaning[];
    /** How the layer maps the column's values. */
    readonly mapping?: FileStyleMappingKind;
    /** How many entries the mapping table holds. */
    readonly entries?: number;
    /** How many elements the rule applies to. */
    readonly elements?: number;
    /** How many classes a class rule holds. */
    readonly classes?: number;
    /** How many distinct values a copied column holds. */
    readonly distinctValues?: number;
    /** Why the layer copies values, or how it was built. */
    readonly reason?: FileStyleReason;
}

/** The optional count fields. */
const COUNTS = ["entries", "elements", "classes", "distinctValues"] as const;

/**
 * Whether a value is a plain object.
 * @param value - The value.
 * @returns True for `{...}`.
 */
function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Whether a value is a count.
 * @param value - The value.
 * @returns True for a whole number of zero or more.
 */
function isCount(value: unknown): value is number {
    return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

/**
 * The meanings a value holds, when it is a well-formed list of them.
 * @param value - The value.
 * @returns The meanings, or undefined.
 */
function meaningsOf(value: unknown): readonly FileStyleMeaning[] | undefined {
    if (!Array.isArray(value)) {
        return undefined;
    }

    const kept: FileStyleMeaning[] = [];
    for (const entry of value as unknown[]) {
        if (!isRecord(entry) || typeof entry.name !== "string") {
            return undefined;
        }

        const { value: key } = entry;
        if (typeof key !== "string" && typeof key !== "number" && typeof key !== "boolean") {
            return undefined;
        }

        kept.push(Object.freeze({ value: key, name: entry.name }));
    }

    return Object.freeze(kept);
}

/**
 * The facts of a layer made from a file's styles.
 *
 * A layer saved in a document can be edited by hand, so the facts are checked as they are read:
 * a malformed required field reads as no facts at all, and a malformed optional one is left out.
 * @param layer - The layer, or its specification.
 * @param layer.fileStyle - Its `fileStyle`, where the facts ride.
 * @returns The facts, or null for a layer that was not made from a file's styles.
 * @example
 * ```ts
 * for (const layer of session.styles.list()) {
 *     const origin = fileStyleOf(layer);
 *     if (origin?.role === "mapping") {
 *         console.log(origin.column, origin.entries);
 *     }
 * }
 * ```
 */
export function fileStyleOf(layer: { readonly fileStyle?: unknown }): FileStyleOrigin | null {
    const held = layer.fileStyle;
    if (!isRecord(held)) {
        return null;
    }

    const { format, importId, ruleId, role, origin } = held;
    if (
        typeof format !== "string" ||
        typeof importId !== "string" ||
        typeof ruleId !== "string" ||
        typeof role !== "string" ||
        typeof origin !== "string"
    ) {
        return null;
    }

    const facts: Record<string, unknown> = { format, importId, ruleId, role, origin };
    if (typeof held.column === "string") {
        facts.column = held.column;
    }

    const meanings = meaningsOf(held.meanings);
    if (meanings !== undefined) {
        facts.meanings = meanings;
    }

    if (held.mapping === "passthrough" || held.mapping === "discrete" || held.mapping === "continuous") {
        facts.mapping = held.mapping;
    }

    for (const count of COUNTS) {
        if (isCount(held[count])) {
            facts[count] = held[count];
        }
    }

    if (typeof held.reason === "string") {
        facts.reason = held.reason;
    }

    return Object.freeze(facts) as unknown as FileStyleOrigin;
}
