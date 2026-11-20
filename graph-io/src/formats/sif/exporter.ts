/**
 * The SIF exporter: one `source<TAB>interaction<TAB>target` line per logical edge in index order,
 * with tabs so names may hold spaces. The interaction is the edge kind column (role `kind`, text);
 * an edge without one is written with the placeholder interaction `-`. A node is written on a line
 * of its own when it has no edge, or when its first edge would not introduce it in index order, so
 * the node order and the isolated nodes read back as they were. SIF keeps nothing else: no
 * attributes, weights, edge ids or direction (its edges read back directed).
 */

import { type Column, type GraphSnapshot } from "@graphty/graph-format";

import { pairFolding } from "../../common/direction.js";
import { capabilities, checkCapabilities, LOSS, refusedSave, sanitizeIds } from "../../common/export.js";
import { idText } from "../../common/format.js";
import { resolveExportOptions } from "../../common/options.js";
import { agree, plural } from "../../common/plural.js";
import { encodeChunks, joinText } from "../../common/writer.js";
import { type CommonExportOptions, type ExportCapabilities, type GraphExporter, type LossNote } from "../../types.js";
import { INTERACTION_COLUMN } from "./importer.js";

/**
 * The options of the SIF exporter: the common export options only.
 * @category Built-in formats
 */
export type SifExportOptions = CommonExportOptions;

/** The interaction written for an edge that has none. */
const PLACEHOLDER = "-";

/**
 * The LossNote codes of the SIF exporter's check(): the SIF-specific ones and, aliased, the shared
 * ones it records itself (`LOSS` holds the rest of the generic pre-flight's codes).
 * @category Built-in formats
 */
export const SIF_LOSS = Object.freeze({
    /**
     * A node id or an interaction is empty, starts or ends with whitespace, or holds a tab or a line break, which SIF
     * cannot write; the save fails with E_UNSUPPORTED.
     */
    TEXT: "E_SIF_TEXT",
    /** Edges without an interaction are written with the interaction `-`, which reads back as their kind. */
    INTERACTION_ADDED: "W_SIF_INTERACTION_ADDED",
    /** SIF has no undirected edges: the edges of an undirected graph, and the undirected edges of a mixed one, read back as directed. */
    UNDIRECTED_AS_DIRECTED: "W_SIF_UNDIRECTED_AS_DIRECTED",
    /** A mutual pair is written as two edges without the mutual mark. */
    MUTUAL_EXPANDED: LOSS.MUTUAL_EXPANDED,
    /** An attribute SIF does not write: every node attribute, and every edge attribute but the interaction. */
    COLUMN_DROPPED: LOSS.COLUMN_DROPPED,
    /** The interaction column is named otherwise; it reads back as `interaction`. */
    COLUMN_NAME_CHANGED: LOSS.COLUMN_NAME_CHANGED,
    /** A text interaction column reads back as a dictionary column. The values are the same. */
    STORAGE_CLASS: LOSS.STORAGE_CLASS,
});

/**
 * What the SIF format keeps.
 * @category Built-in formats
 */
export const SIF_CAPABILITIES: ExportCapabilities = capabilities({
    mixedDirection: false,
    multiEdges: true,
    selfLoops: true,
    edgeIds: "none",
    idCharset: "any",
    dtypes: ["dict"],
});

/**
 * Whether a text can be one SIF field: not empty, no tab or line break, no whitespace at either end.
 * @param text - the text
 * @returns true when it reads back as written
 */
function isSifText(text: string): boolean {
    return text !== "" && text === text.trim() && !/[\t\n\r]/.test(text);
}

/**
 * The interaction column: the kind role column, when it holds text.
 * @param snapshot - the snapshot
 * @returns the column, or null
 */
function interactionColumn(snapshot: GraphSnapshot): Column | null {
    const kind = snapshot.edges.byRole("kind");
    return kind !== null && (kind.dtype === "string" || kind.dtype === "dict") ? kind : null;
}

/**
 * The interaction of an edge as written.
 * @param kind - the interaction column, or null
 * @param e - the edge index
 * @returns the text
 */
function interactionOf(kind: Column | null, e: number): string {
    return kind?.isSet(e) === true ? String(kind.value(e)) : PLACEHOLDER;
}

/**
 * The nodes a reader has met so far, in the order it meets them: every node in index order from 0
 * up to `next` and possibly some beyond.
 */
class NodeOrder {
    private readonly seen: Uint8Array;

    private next = 0;

    /**
     * Create the tracker.
     * @param nodeCount - the number of nodes
     */
    constructor(nodeCount: number) {
        this.seen = new Uint8Array(nodeCount);
    }

    /**
     * Whether an edge from u to v, which a reader meets source first, introduces its new endpoints
     * in index order; if so they are marked as met.
     * @param u - the source index
     * @param v - the target index
     * @returns false when some node needs a line of its own before the edge
     */
    inOrder(u: number, v: number): boolean {
        const fresh = [u, v].filter((w, j) => this.seen[w] === 0 && (j === 0 || w !== u));
        if (!fresh.every((w, j) => w === this.next + j)) {
            return false;
        }
        for (const w of fresh) {
            this.seen[w] = 1;
        }
        this.advance();
        return true;
    }

    /**
     * The nodes not met yet up to an index, in index order, marked as met.
     * @param upTo - the last index
     * @returns their indices
     */
    unmetUpTo(upTo: number): number[] {
        const out: number[] = [];
        for (let i = this.next; i <= upTo; i++) {
            if (this.seen[i] === 0) {
                this.seen[i] = 1;
                out.push(i);
            }
        }
        this.advance();
        return out;
    }

    /** Move `next` past the met nodes. */
    private advance(): void {
        while (this.next < this.seen.length && this.seen[this.next] === 1) {
            this.next++;
        }
    }
}

/**
 * The SIF lines.
 * @param snapshot - the snapshot
 * @param mangle - whether ids that share their text with an earlier id get a suffix
 * @yields one line at a time
 * @returns nothing
 */
function* write(snapshot: GraphSnapshot, mangle: boolean): Generator<string, void, undefined> {
    const folding = pairFolding(snapshot);
    const kind = interactionColumn(snapshot);
    const list = snapshot.edgeList();
    const ids = sanitizeIds(snapshot, SIF_CAPABILITIES.idCharset, mangle ? "mangle" : "error");
    const name = (i: number): string => idText(ids.idAt(i));
    const order = new NodeOrder(snapshot.nodeCount);
    const edges: number[] = [];
    for (let e = 0; e < snapshot.edgeCount; e++) {
        if (!folding.folded(e)) {
            edges.push(e);
        }
    }
    // a file without a tab is split on spaces: a lone name with a space then needs a tab after it
    const lone = (i: number): string => (edges.length === 0 && /\s/.test(name(i)) ? `${name(i)}\t\n` : `${name(i)}\n`);
    for (const e of edges) {
        const u = list.src[e];
        const v = list.dst[e];
        if (!order.inOrder(u, v)) {
            yield* order.unmetUpTo(Math.max(u, v)).map((i) => lone(i));
        }
        yield `${name(u)}\t${interactionOf(kind, e)}\t${name(v)}\n`;
    }
    yield* order.unmetUpTo(snapshot.nodeCount - 1).map((i) => lone(i));
}

/** Records one loss note. */
type NoteFn = (code: string, message: string, column: string | null, count: number) => void;

/**
 * The E_SIF_TEXT note for some texts SIF cannot write.
 * @param what - what the texts are, for the message
 * @param count - how many
 * @param column - the column they are in, or null for node ids
 * @param note - the recorder
 */
function textNote(what: string, count: number, column: string | null, note: NoteFn): void {
    if (count > 0) {
        note(
            SIF_LOSS.TEXT,
            `${count} ${what}${plural(count)} ${agree(count, "is", "are")} empty, ${agree(count, "starts", "start")} or ${agree(count, "ends", "end")} with whitespace, or ${agree(count, "holds", "hold")} a tab or a line break, which SIF cannot write`,
            column,
            count,
        );
    }
}

/**
 * The notes about the edges: interactions SIF cannot write, edges given the placeholder, edges
 * that read back directed, mutual pairs.
 * @param snapshot - the snapshot
 * @param mixedPolicy - the resolved onMixedDirection
 * @param note - the recorder
 */
function edgeNotes(snapshot: GraphSnapshot, mixedPolicy: "error" | "directed" | "undirected", note: NoteFn): void {
    const folding = pairFolding(snapshot);
    const kind = interactionColumn(snapshot);
    let badKinds = 0;
    let placeholders = 0;
    let undirected = 0;
    for (let e = 0; e < snapshot.edgeCount; e++) {
        if (folding.folded(e)) {
            continue;
        }
        const set = kind?.isSet(e) === true;
        placeholders += set ? 0 : 1;
        badKinds += set && !isSifText(interactionOf(kind, e)) ? 1 : 0;
        undirected += !snapshot.directed || (mixedPolicy !== "error" && !folding.sourceDirected(e)) ? 1 : 0;
    }
    textNote("interaction", badKinds, kind?.meta.name ?? null, note);
    if (placeholders > 0) {
        note(
            SIF_LOSS.INTERACTION_ADDED,
            `${placeholders} edge${plural(placeholders)} without an interaction ${agree(placeholders, "is", "are")} written with the interaction "${PLACEHOLDER}", which reads back as ${agree(placeholders, "its", "their")} kind`,
            INTERACTION_COLUMN,
            placeholders,
        );
    }
    // an undirected graph reads back directed even without edges
    if (undirected > 0 || !snapshot.directed) {
        note(
            SIF_LOSS.UNDIRECTED_AS_DIRECTED,
            `${undirected} undirected edge${plural(undirected)} ${agree(undirected, "is", "are")} written source to target and ${agree(undirected, "reads", "read")} back as directed; SIF has no undirected edges`,
            null,
            undirected,
        );
    }
    if (folding.mutualCount > 0) {
        note(
            SIF_LOSS.MUTUAL_EXPANDED,
            `${folding.mutualCount} mutual pair${plural(folding.mutualCount)} ${agree(folding.mutualCount, "is", "are")} written as two edges; the mutual mark is lost`,
            null,
            folding.mutualCount,
        );
    }
}

/**
 * The notes about the interaction column: its name and its storage on re-import.
 * @param kind - the interaction column
 * @param note - the recorder
 */
function interactionNotes(kind: Column, note: NoteFn): void {
    const { name } = kind.meta;
    const count = kind.length - kind.nullCount;
    if (name !== INTERACTION_COLUMN) {
        note(
            SIF_LOSS.COLUMN_NAME_CHANGED,
            `edge column "${name}" (the interaction) reads back as "${INTERACTION_COLUMN}"`,
            name,
            count,
        );
    }
    if (kind.dtype === "string") {
        note(
            SIF_LOSS.STORAGE_CLASS,
            `edge column "${name}" (the interaction) is text and reads back as a dictionary column`,
            name,
            count,
        );
    }
}

/**
 * The SIF-specific notes.
 * @param snapshot - the snapshot
 * @param mixedPolicy - the resolved onMixedDirection
 * @param note - the recorder
 */
function sifNotes(snapshot: GraphSnapshot, mixedPolicy: "error" | "directed" | "undirected", note: NoteFn): void {
    let badIds = 0;
    for (let i = 0; i < snapshot.nodeCount; i++) {
        badIds += isSifText(idText(snapshot.ids.idOf(i))) ? 0 : 1;
    }
    textNote("node id", badIds, null, note);
    edgeNotes(snapshot, mixedPolicy, note);
    const kind = interactionColumn(snapshot);
    if (kind !== null) {
        interactionNotes(kind, note);
    }
}

/**
 * The notes of a SIF export.
 * @param snapshot - the snapshot
 * @param options - the common export options
 * @returns the notes
 */
function check(snapshot: GraphSnapshot, options: SifExportOptions | undefined): LossNote[] {
    const resolved = resolveExportOptions(options);
    const kind = interactionColumn(snapshot);
    // the interaction column is written into the format's own slot: its storage note is SIF's, below
    const notes = checkCapabilities(snapshot, SIF_CAPABILITIES, resolved, {
        attributes: false,
        roles: kind === null ? new Set() : new Set(["kind"]),
        idsReadBack: "canonical",
        idsAsText: true,
        weights: false,
    }).filter((n) => n.code !== LOSS.DTYPE || n.column !== kind?.meta.name);
    sifNotes(snapshot, resolved.onMixedDirection, (code, message, column, count) => {
        notes.push(Object.freeze({ code, message, column, count }));
    });
    return notes;
}

/**
 * The SIF exporter, registered as "sif".
 * @category Built-in formats
 */
export const sifExporter: GraphExporter<SifExportOptions> = Object.freeze({
    format: "sif",
    extensions: Object.freeze([".sif"]),
    mimeTypes: Object.freeze([]),
    options: Object.freeze([]),
    capabilities: SIF_CAPABILITIES,
    check(snapshot: GraphSnapshot, options?: SifExportOptions): readonly LossNote[] {
        return check(snapshot, options);
    },
    export(snapshot: GraphSnapshot, options?: SifExportOptions): AsyncIterable<Uint8Array> {
        const refused = refusedSave(check(snapshot, options));
        if (refused !== null) {
            throw refused;
        }
        return encodeChunks(write(snapshot, resolveExportOptions(options).sanitizeIds === "mangle"));
    },
    exportToString(snapshot: GraphSnapshot, options?: SifExportOptions): Promise<string> {
        const refused = refusedSave(check(snapshot, options));
        if (refused !== null) {
            return Promise.reject(refused);
        }
        return joinText(write(snapshot, resolveExportOptions(options).sanitizeIds === "mangle"));
    },
});
