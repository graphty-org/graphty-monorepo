/**
 * Writing a graph's styles: what `exportGraph(snapshot, format, { styles })` hands a format's exporter, the losses
 * reported before anything is written, and, for an exporter whose block goes into attributes, the snapshot with the
 * `graphty.styles` block and the tagged per-element values added as attributes.
 */

import type { GraphSnapshot } from "@graphty/graph-format";

import { agree, plural } from "../../common/plural.js";
import type { GraphExporter, LossNote } from "../../types.js";
import { STYLE_ISSUE } from "../codes.js";
import { styleFingerprint } from "../plan/features.js";
import { resolveStyles } from "../plan/resolve.js";
import type {
    ExtractedStyles,
    StyleColumn,
    StyleProperty,
    StyleTarget,
    StyleValue,
    StyleWriteCapabilities,
} from "../types.js";
import { STYLE_BLOCK_NAME, styleTag, writeStyleBlock } from "./block.js";

/**
 * What an exporter with a `styles` member receives as `options.styles` when styles are being written.
 * @category Styles
 */
export interface ExporterStyleInput {
    /**
     * Each element's value of one property, by element index (null where no rule gives one): what graphty draws, to
     * write into the format's own style slots.
     * @param target - nodes or edges
     * @param property - the property
     * @returns the values
     */
    picture(target: StyleTarget, property: StyleProperty): readonly (StyleValue | null)[];
    /** The `graphty.styles` block (JSON text) to place where the format keeps extra data. */
    readonly block: string;
    /** The per-element style values the block's rules read, by attribute name (`graphty.style.<target>.<key>`). */
    readonly tags: {
        /** Node values. */
        readonly node: ReadonlyMap<string, StyleColumn>;
        /** Edge values. */
        readonly edge: ReadonlyMap<string, StyleColumn>;
    };
    /** The styles themselves, for a format with a style language of its own. */
    readonly rules: ExtractedStyles;
}

/**
 * The options an exporter with a `styles` member reads its styles from: type its options as `Opts &
 * ExporterStyleOptions`.
 * @category Styles
 */
export interface ExporterStyleOptions {
    /** Present when styles are being written. */
    readonly styles?: ExporterStyleInput | undefined;
}

/** What an export with styles writes and loses, worked out before writing. */
interface PreparedStyleExport {
    /** The snapshot to hand the exporter: style roles removed, and the block and tagged values added as attributes. */
    readonly snapshot: GraphSnapshot;
    /** The exporter's `options.styles`, or null for an exporter without a `styles` member. */
    readonly input: ExporterStyleInput | null;
    /** W_STYLE_ notes: every property not written natively, and the rules when they are not kept. */
    readonly notes: readonly LossNote[];
    /** E_STYLES_MISMATCH when the styles belong to a different graph; nothing is then written. */
    readonly refusal: LossNote | null;
}

/** The roles of columns that hold styles; with styles given they are data, never written into a style slot. */
const STYLE_ROLES: ReadonlySet<string> = new Set(["color", "size", "shape", "thickness", "hidden"]);
const TARGETS: readonly StyleTarget[] = ["node", "edge"];

/**
 * Works out an export with styles: the refusal when the styles belong to another graph, the losses, the exporter's
 * `options.styles`, and the snapshot to write.
 * @param snapshot - the graph being written
 * @param exporter - the format's exporter
 * @param extracted - the styles
 * @returns what to write and what is lost
 */
export function prepareStyleExport(
    snapshot: GraphSnapshot,
    exporter: GraphExporter,
    extracted: ExtractedStyles,
): PreparedStyleExport {
    const fp = styleFingerprint(snapshot);
    const want = extracted.fingerprint;
    if (fp.nodes !== want.nodes || fp.edges !== want.edges || fp.ids !== want.ids) {
        return {
            snapshot,
            input: null,
            notes: [],
            refusal: Object.freeze({
                code: STYLE_ISSUE.MISMATCH,
                message: `the styles were read from or built for a different graph (${String(want.nodes)} nodes and ${String(want.edges)} edges, this graph has ${String(fp.nodes)} and ${String(fp.edges)}, or other node ids); nothing is written`,
                column: null,
                count: null,
            }),
        };
    }
    const caps = exporter.styles?.capabilities ?? null;
    const pictures = new Map<string, readonly (StyleValue | null)[]>();
    const picture = (target: StyleTarget, property: StyleProperty): readonly (StyleValue | null)[] => {
        const key = `${target}\u0000${property}`;
        let values = pictures.get(key);
        if (values === undefined) {
            values = resolveStyles(extracted, target, property, snapshot);
            pictures.set(key, values);
        }
        return values;
    };
    const tags = { node: new Map<string, StyleColumn>(), edge: new Map<string, StyleColumn>() };
    for (const target of TARGETS) {
        for (const [key, col] of extracted.columns[target]) {
            tags[target].set(styleTag(target, key), col);
        }
    }
    const block = writeStyleBlock(extracted, { snapshot });
    return {
        snapshot: styledSnapshot(snapshot, caps, tags, block),
        input: exporter.styles === undefined ? null : { picture, block, tags, rules: extracted },
        notes: lossNotes(extracted, exporter, caps, picture),
        refusal: null,
    };
}

/**
 * Whether an exporter keeps the `graphty.styles` block, natively or as a graph attribute.
 * @param exporter - the exporter
 * @returns true when the block is written
 */
export function keepsStyleBlock(exporter: GraphExporter): boolean {
    const caps = exporter.styles?.capabilities;
    return (
        caps !== undefined &&
        (caps.block === "native" || (caps.block === "attributes" && exporter.capabilities.graphAttributes))
    );
}

/**
 * Whether a loss note is about a property only graphty draws (`graphty:<channel>`) in a file that keeps the block:
 * the block carries it, and no other program would draw it, so nothing is lost.
 * @param note - the note
 * @param exporter - the exporter writing the file
 * @returns true when the note names nothing lost
 */
export function isKeptGraphtyProperty(note: LossNote, exporter: GraphExporter): boolean {
    return note.style?.property.startsWith("graphty:") === true && keepsStyleBlock(exporter);
}

/**
 * The losses of an export with styles: W_STYLE_NOT_WRITTEN for every property the format does not write natively
 * (all of them for an exporter without a `styles` member), and W_STYLE_RULES_NOT_KEPT when the block is not kept.
 * @param extracted - the styles
 * @param exporter - the exporter
 * @param caps - its style capabilities, or null
 * @param picture - each element's value of a property
 * @returns the notes
 */
function lossNotes(
    extracted: ExtractedStyles,
    exporter: GraphExporter,
    caps: StyleWriteCapabilities | null,
    picture: (target: StyleTarget, property: StyleProperty) => readonly (StyleValue | null)[],
): LossNote[] {
    const notes: LossNote[] = [];
    const kept = keepsStyleBlock(exporter);
    for (const target of TARGETS) {
        const written = new Set<string>(caps?.[target] ?? []);
        const properties = new Set<string>();
        for (const rule of extracted.styles.rules) {
            if (rule.target === target) {
                for (const p of [...Object.keys(rule.set ?? {}), ...Object.keys(rule.map ?? {})]) {
                    properties.add(p);
                }
            }
        }
        for (const property of properties) {
            // a property only graphty draws is written into the block alone: lost only when the block is
            if (written.has(property) || (kept && property.startsWith("graphty:"))) {
                continue;
            }
            const count = picture(target, property as StyleProperty).filter((v) => v !== null).length;
            notes.push(
                Object.freeze({
                    code: STYLE_ISSUE.NOT_WRITTEN,
                    message: `${target} ${property} is not written: the ${exporter.format} format has no place for it (${String(count)} ${target}${plural(count)} ${agree(count, "has", "have")} a value)`,
                    column: null,
                    count,
                    style: Object.freeze({ target, property: property as StyleProperty }),
                }),
            );
        }
    }
    const graphWritten = new Set<string>(caps?.graph ?? []);
    for (const property of Object.keys(extracted.styles.graph)) {
        if (!graphWritten.has(property)) {
            notes.push(
                Object.freeze({
                    code: STYLE_ISSUE.NOT_WRITTEN,
                    message: `the graph's ${property} is not written: the ${exporter.format} format has no place for it`,
                    column: null,
                    count: 1,
                    style: Object.freeze({ target: "graph" as const, property: property as "background" }),
                }),
            );
        }
    }
    if (!kept && extracted.styles.rules.length > 0) {
        notes.push(
            Object.freeze({
                code: STYLE_ISSUE.RULES_NOT_KEPT,
                message: `the style rules are not kept: the ${exporter.format} format has no place for them; importing the file infers them again from what it holds`,
                column: null,
                count: extracted.styles.rules.length,
            }),
        );
    }
    return notes;
}

/**
 * The snapshot an exporter writes when styles are given: columns with a style role keep their data but lose the
 * role (the style writer is the only thing that writes the format's style slots), and for `block: "attributes"`
 * the block becomes a graph attribute and the tagged values element attributes.
 * @param snapshot - the graph
 * @param caps - the exporter's style capabilities, or null
 * @param tags - the tagged per-element values
 * @param tags.node - node values by attribute name
 * @param tags.edge - edge values by attribute name
 * @param block - the block's text
 * @returns the snapshot to write (the same object when nothing changes)
 */
function styledSnapshot(
    snapshot: GraphSnapshot,
    caps: StyleWriteCapabilities | null,
    tags: { readonly node: ReadonlyMap<string, StyleColumn>; readonly edge: ReadonlyMap<string, StyleColumn> },
    block: string,
): GraphSnapshot {
    const attributes = caps?.block === "attributes";
    // a format that writes the label from the styles has its label slot taken: the label column is data there too
    const roled = (table: GraphSnapshot["nodes"], target: StyleTarget): string[] =>
        Array.from(table.names()).filter((name) => {
            const role = table.get(name)?.meta.role ?? "";
            return STYLE_ROLES.has(role) || (role === "label" && (caps?.[target] ?? []).includes("label"));
        });
    const nodeRoles = roled(snapshot.nodes, "node");
    const edgeRoles = roled(snapshot.edges, "edge");
    if (!attributes && nodeRoles.length === 0 && edgeRoles.length === 0) {
        return snapshot;
    }
    const out = snapshot.withColumns();
    for (const [table, names] of [
        [out.nodes, nodeRoles],
        [out.edges, edgeRoles],
    ] as const) {
        for (const name of names) {
            const col = table.get(name);
            if (col !== null) {
                // an explicit undefined role in the patch replaces the column's role with none
                table.set(name, col, { role: undefined });
            }
        }
    }
    if (attributes) {
        for (const [table, byName, target] of [
            [out.nodes, tags.node, "node"],
            [out.edges, tags.edge, "edge"],
        ] as const) {
            // the tagged values of an earlier import are replaced, in the order of these styles' columns, so writing
            // a file read back gives the same bytes whichever elements held a value first
            const prefix = styleTag(target, "");
            for (const name of Array.from(table.names())) {
                if (name.startsWith(prefix)) {
                    table.remove(name);
                }
            }
            for (const [name, col] of byName) {
                const dtype = tagDtype(col);
                table.set(name, dtype === "string" ? col.map((v) => (v === null ? null : String(v))) : col, { dtype });
            }
        }
        out.graph.set(STYLE_BLOCK_NAME, [block], { dtype: "string" });
    }
    return out;
}

/**
 * The dtype a tagged column is written with: numbers, booleans or text (a mixed column as text).
 * @param col - the values
 * @returns the dtype
 */
function tagDtype(col: StyleColumn): "f64" | "bool" | "string" {
    let kind: string | null = null;
    for (const v of col) {
        if (v === null) {
            continue;
        }
        if (kind === null) {
            kind = typeof v;
        } else if (kind !== typeof v) {
            return "string";
        }
    }
    if (kind === "number") {
        return "f64";
    }
    return kind === "boolean" ? "bool" : "string";
}
