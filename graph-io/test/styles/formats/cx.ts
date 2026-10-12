/**
 * CX version 1 and CX2 in the style harness: the committed corpus of each, read with Cytoscape desktop's default
 * style beneath, and the round trip through each writer, which keeps the `graphty.styles` block as an aspect of its
 * own and writes per-element values as bypasses.
 */

import { registerStyleFormat } from "../harness.js";

const BLOCK_ASPECT = "graphty.styles";

type Aspect = Record<string, unknown[]>;

/** JSON.rawJSON (Node 21 and later), which the TypeScript library in use does not declare. */
const rawJSON = (JSON as unknown as { rawJSON(text: string): unknown }).rawJSON;

/**
 * A written file's aspects. An integer past 2^53 (a CX id may be any 64-bit integer) keeps its digits, as another
 * program editing the file keeps them: parsed as a number it would become another id.
 * @param bytes - the file
 * @returns the aspects
 */
const decode = (bytes: Uint8Array): Aspect[] =>
    JSON.parse(new TextDecoder().decode(bytes), (_key: string, value: unknown, context?: { source?: string }) =>
        typeof value === "number" && !Number.isSafeInteger(value) && /^-?\d+$/.test(context?.source ?? "")
            ? rawJSON(context?.source ?? "")
            : value,
    ) as Aspect[];
const encode = (doc: unknown): Uint8Array => new TextEncoder().encode(JSON.stringify(doc));

/**
 * The elements of an aspect, created (before the status) when the file has none.
 * @param doc - the document
 * @param name - the aspect
 * @returns its elements
 */
function aspectOf(doc: Aspect[], name: string): unknown[] {
    const found = doc.find((a) => Object.hasOwn(a, name));
    if (found !== undefined) {
        return found[name];
    }
    const created: Aspect = { [name]: [] };
    doc.splice(doc.length - 1, 0, created);
    return created[name];
}

/**
 * The first node's id.
 * @param doc - the document
 * @param key - the id key (`@id` in CX version 1, `id` in CX2)
 * @returns the id, or undefined
 */
function firstNode(doc: Aspect[], key: string): unknown {
    const nodes = doc.find((a) => Object.hasOwn(a, "nodes"))?.nodes;
    const first = nodes?.[0] as Record<string, unknown> | undefined;
    return first?.[key];
}

/**
 * A color the file holds nowhere yet (a file edited once already holds the first).
 * @param written - the file
 * @returns the color
 */
function fresh(written: Uint8Array): string {
    return new TextDecoder().decode(written).toLowerCase().includes("123456") ? "#654321" : "#123456";
}

/**
 * A written file with its block replaced.
 * @param written - the file graphty wrote
 * @param change - the new block from the old one
 * @returns the changed file
 */
export function replaceCxBlock(written: Uint8Array, change: (block: string) => string): Uint8Array {
    const doc = decode(written);
    const elements = aspectOf(doc, BLOCK_ASPECT) as { block?: string }[];
    if (elements.length === 0) {
        return written;
    }
    elements[0] = { block: change(elements[0].block ?? "") };
    return encode(doc);
}

/**
 * A written CX2 file with the first node's fill bypassed to a color it does not have, as Cytoscape writes an edit.
 * @param written - the file graphty wrote
 * @returns the edited file, or null without nodes
 */
export function editCx2NodeFill(written: Uint8Array): Uint8Array | null {
    const doc = decode(written);
    const id = firstNode(doc, "id");
    if (id === undefined) {
        return null;
    }
    const bypasses = aspectOf(doc, "nodeBypasses") as { id: unknown; v: Record<string, unknown> }[];
    let entry = bypasses.find((b) => b.id === id);
    if (entry === undefined) {
        entry = { id, v: {} };
        bypasses.push(entry);
    }
    entry.v.NODE_BACKGROUND_COLOR = fresh(written);
    return encode(doc);
}

/**
 * A written CX version 1 file with the first node's fill bypassed to a color it does not have.
 * @param written - the file graphty wrote
 * @returns the edited file, or null without nodes
 */
export function editCxNodeFill(written: Uint8Array): Uint8Array | null {
    const doc = decode(written);
    const id = firstNode(doc, "@id");
    if (id === undefined) {
        return null;
    }
    const vps = aspectOf(doc, "cyVisualProperties") as {
        properties_of: string;
        applies_to?: unknown;
        properties: Record<string, string>;
    }[];
    let entry = vps.find((v) => v.properties_of === "nodes" && v.applies_to === id);
    if (entry === undefined) {
        entry = { properties_of: "nodes", applies_to: id, properties: {} };
        vps.push(entry);
    }
    entry.properties.NODE_FILL_COLOR = fresh(written);
    return encode(doc);
}

/** Cytoscape ids are integers: a file with other ids is written with them rewritten, as the error asks. */
const MANGLE = { sanitizeIds: "mangle" } as const;

registerStyleFormat({
    name: "cx",
    mutantsPerFile: 1,
    writer: { format: "cx", options: MANGLE, editNative: editCxNodeFill, replaceBlock: replaceCxBlock },
});

registerStyleFormat({
    name: "cx2",
    mutantsPerFile: 1,
    writer: { format: "cx2", options: MANGLE, editNative: editCx2NodeFill, replaceBlock: replaceCxBlock },
});
