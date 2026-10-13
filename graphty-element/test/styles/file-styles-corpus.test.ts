/**
 * @file Every file of graph-io's committed style corpus loaded through `session.data.import` with
 * `styles: "file"`, as the graphty app loads a file, and checked against the translation's own
 * prediction:
 *
 * - the element holds the nodes and edges graph-io holds, under the same ids;
 * - every data column a layer reads arrives on the records, at the key the reader says it put it
 *   under, with graph-io's value for every element;
 * - every layer is accepted: none refused, none disabled for want of a value;
 * - `styles.explain()` gives every node and edge exactly what the translation predicted, channel
 *   by channel, both ways (a layer of the file paints nothing the translation did not predict),
 *   and a label's style merged field by field.
 *
 * This compares the element with the translation; whether the translation is true to the file is
 * graph-io's own round-trip check.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { gunzipSync } from "node:zlib";

import { afterAll, assert, describe, it, vi } from "vitest";

import { createGraphSession, FILE_STYLE_ISSUE, fileStyleOf, type GraphSession, type Layer } from "../../session";
import { DataSource } from "../../src/data/DataSource";
import { channelDescriptor, labelFieldOf, labelPatchOf, mergeLabelStyle } from "../../src/session/styles/channels";
import type { FileStylesRead } from "../../src/session/styles/fileStyles/apply";
import { dataPaths, logicalEdgeRows } from "../../src/session/styles/fileStyles/columns";
import { fileStyleNamespace } from "../../src/session/styles/fileStyles/path";
import { translateFileStyles } from "../../src/session/styles/fileStyles/translate";
import { quotePath } from "../../src/session/styles/predicate";

const CORPUS = join(__dirname, "..", "..", "..", "graph-io", "test", "corpus", "styles");

/** The element's reader for each corpus directory. */
const READERS: Readonly<Record<string, string>> = {
    cx: "cx",
    cx2: "cx2",
    cys: "cys",
    cyjs: "json",
    dot: "dot",
    gexf: "gexf",
    gml: "gml",
    graphml: "graphml",
    json: "json",
    pajek: "pajek",
    xgmml: "xgmml",
};

/**
 * Every graph file under a directory.
 * @param dir - The directory.
 * @returns The paths, sorted.
 */
function graphFiles(dir: string): string[] {
    const out: string[] = [];
    for (const name of readdirSync(dir).sort()) {
        const path = join(dir, name);
        if (statSync(path).isDirectory()) {
            out.push(...graphFiles(path));
        } else if (!name.endsWith(".md") && !name.endsWith(".cycss") && !name.endsWith(".json.gz")) {
            out.push(path);
        }
    }

    return out;
}

/**
 * A value as the comparison reads it: a color as lowercase `#rrggbb`, a 64-bit integer as a
 * number, a list as an array.
 * @param value - The value.
 * @returns It, normalized.
 */
function norm(value: unknown): unknown {
    if (typeof value === "object" && value !== null && "hex" in value) {
        return (value as { hex: string }).hex.slice(0, 7).toLowerCase();
    }

    if (typeof value === "string" && /^#[0-9a-f]{6}([0-9a-f]{2})?$/i.test(value)) {
        return value.slice(0, 7).toLowerCase();
    }

    if (typeof value === "bigint") {
        return Number(value);
    }

    if (ArrayBuffer.isView(value)) {
        return Array.from(value as unknown as ArrayLike<number>);
    }

    return value ?? null;
}

/**
 * Whether two values are the same: numbers within a relative 5e-6, objects field by field.
 * @param a - One value.
 * @param b - The other.
 * @returns True when equal.
 */
function same(a: unknown, b: unknown): boolean {
    const x = norm(a);
    const y = norm(b);
    if (typeof x === "number" && typeof y === "number") {
        return x === y || Math.abs(x - y) <= 5e-6 * Math.max(Math.abs(x), Math.abs(y));
    }

    if (typeof x === "object" && x !== null && typeof y === "object" && y !== null) {
        const keys = new Set([...Object.keys(x), ...Object.keys(y)]);
        return [...keys].every((key) => same((x as Record<string, unknown>)[key], (y as Record<string, unknown>)[key]));
    }

    return x === y;
}

/** What one file's check found. */
interface FileResult {
    loaded: boolean;
    countDiffers: string | null;
    columnsDiffer: string[];
    refused: number;
    unbound: number;
    checks: number;
    mismatches: string[];
    unpredicted: string[];
}

/**
 * The layers a load's styles made.
 * @param session - The session.
 * @returns Them, bottom first.
 */
function fileLayers(session: GraphSession): Layer[] {
    return session.styles.list().filter((layer) => fileStyleOf(layer) !== null);
}

/**
 * What the element's own base layers paint, per kind, as the load's translation reads them.
 * @param session - The session.
 * @returns The base values.
 */
function baseValues(session: GraphSession): Record<"node" | "edge", Record<string, unknown>> {
    const out: Record<"node" | "edge", Record<string, unknown>> = { node: {}, edge: {} };
    for (const layer of session.styles.list()) {
        if (layer.source.by === "element" && layer.source.reason === "default" && layer.target !== undefined) {
            Object.assign(out[layer.target], layer.set ?? {});
        }
    }

    return out;
}

/**
 * Whether a layer reads a path: in its selector or a binding.
 * @param layer - The layer.
 * @param path - The path.
 * @returns True when it reads it.
 */
function reads(layer: Layer, path: string): boolean {
    const { selector } = layer;
    if ((selector.match === "has" || selector.match === "top") && selector.path === path) {
        return true;
    }

    if (selector.match === "expression") {
        const quoted = quotePath(path).replaceAll(/[.*+?^${}()|[\]\\]/g, "\\$&");
        if (new RegExp(`${quoted}(?![A-Za-z0-9_."])`).test(selector.where)) {
            return true;
        }
    }

    return Object.values(layer.encode ?? {}).some(
        (binding) => typeof binding === "object" && binding !== null && "by" in binding && binding.by === path,
    );
}

/**
 * Check one loaded file.
 * @param session - The session it was loaded into.
 * @param read - The styles its reader gave the load.
 * @param result - Where findings go.
 */
function check(session: GraphSession, read: FileStylesRead, result: FileResult): void {
    const { snapshot } = read;
    const nodes = session.data.nodes();
    const edges = session.data.edges();
    const byId = new Map(nodes.map((record) => [String(record.id), record]));
    const nodeRecords = Array.from({ length: snapshot.nodeCount }, (_unused, i) =>
        byId.get(String(snapshot.ids.idOf(i))),
    );
    const rows = logicalEdgeRows(snapshot);
    if (nodes.length !== snapshot.nodeCount || nodeRecords.some((record) => record === undefined)) {
        result.countDiffers = `nodes: element ${String(nodes.length)}, graph-io ${String(snapshot.nodeCount)}`;
        return;
    }

    if (edges.length !== rows.length) {
        result.countDiffers = `edges: element ${String(edges.length)}, graph-io ${String(rows.length)}`;
        return;
    }

    const edgeRecords = new Array<(typeof edges)[number] | undefined>(snapshot.edgeCount);
    rows.forEach((row, at) => {
        edgeRecords[row] = edges[at];
    });

    // The translation, again, with what the load gave it.
    const namespace = fileStyleNamespace(read.format, new Set());
    const translation = translateFileStyles({
        extracted: read.extracted,
        snapshot,
        namespace,
        format: read.format,
        importId: namespace,
        options: {},
        base: baseValues(session),
        dataPath: dataPaths(read.path),
    });
    const layers = fileLayers(session);
    assert.deepEqual(
        layers.map((layer) => layer.name),
        translation.layers.map((layer) => layer.spec.name),
        "the load drew the translation's layers",
    );

    // Layers accepted: none refused, none disabled for want of a value.
    const notes = session.data.lastImport()?.styles?.notes ?? [];
    result.refused = notes.filter((note) => note.code === FILE_STYLE_ISSUE.LAYER_REFUSED).length;
    result.unbound = layers.filter((layer) => !layer.enabled).length;

    // Every data column a layer reads arrives under the key the reader names, with graph-io's value.
    for (const kind of ["node", "edge"] as const) {
        const table = kind === "node" ? snapshot.nodes : snapshot.edges;
        const records = kind === "node" ? nodeRecords : edgeRecords;
        const own = layers.filter((layer) => layer.target === kind);
        for (const column of table.names()) {
            const keys = read.path(kind, column);
            const path = dataPaths(read.path)(kind, column);
            if (keys === null || path === null || !own.some((layer) => reads(layer, path))) {
                continue;
            }

            const cells = table.require(column);
            for (let i = 0; i < table.rowCount; i++) {
                const record = records[i] as Record<string, unknown> | undefined;
                const held = cells.isSet(i) ? table.value(column, i) : null;
                if (record !== undefined && !same(record[keys[0]], held)) {
                    result.columnsDiffer.push(
                        `${kind}.${column} at ${path}: record ${JSON.stringify(norm(record[keys[0]]))}, graph-io ${JSON.stringify(norm(held))}`,
                    );
                    break;
                }
            }
        }
    }

    // explain() against the prediction, both ways.
    const ids = new Set(layers.map((layer) => layer.id));
    for (const kind of ["node", "edge"] as const) {
        const predicted = translation.predicted[kind];
        assert.isNotNull(predicted, `${kind}: the translation predicts every layer`);
        const records = kind === "node" ? nodeRecords : edgeRecords;
        const labelChannel = `${kind}.labelStyle`;
        records.forEach((record, i) => {
            if (record === undefined) {
                return;
            }

            const explanation = session.styles.explain(
                kind === "node" ? { node: record.id } : { edge: record.id as never },
            );
            const merged = explanation.merged as Record<string, unknown>;
            for (const [channel, values] of predicted ?? []) {
                if (channel === labelChannel || values[i] === null) {
                    continue;
                }

                result.checks++;
                if (!same(merged[channel], values[i])) {
                    result.mismatches.push(
                        `${kind} ${String(record.id)} ${channel}: predicted ${JSON.stringify(norm(values[i]))}, drawn ${JSON.stringify(norm(merged[channel]))}`,
                    );
                }
            }

            for (const entry of explanation.channels) {
                const isLabel = entry.channel === labelChannel || labelFieldOf(entry.channel) !== undefined;
                if (ids.has(entry.layerId) && !isLabel && (predicted?.get(entry.channel)?.[i] ?? null) === null) {
                    result.unpredicted.push(`${kind} ${String(record.id)} ${entry.channel}`);
                }
            }

            // The label, merged field by field from the file's layers alone.
            let label: unknown = null;
            for (const contribution of explanation.contributions) {
                if (!ids.has(contribution.layerId)) {
                    continue;
                }

                for (const [channel, value] of Object.entries(contribution.values)) {
                    const field = labelFieldOf(channel as never);
                    if (field !== undefined) {
                        label = mergeLabelStyle(label, labelPatchOf(field.field, value));
                    } else if (channelDescriptor(channel)?.accepts === "labelStyle") {
                        label = mergeLabelStyle(label, value as object);
                    }
                }
            }

            const want = predicted?.get(labelChannel as never)?.[i] ?? null;
            if (want === null && label !== null) {
                result.unpredicted.push(`${kind} ${String(record.id)} ${labelChannel}`);
            } else if (want !== null) {
                result.checks++;
                if (!same(label, want)) {
                    result.mismatches.push(
                        `${kind} ${String(record.id)} ${labelChannel}: predicted ${JSON.stringify(want)}, drawn ${JSON.stringify(label)}`,
                    );
                }
            }
        });
    }
}

const results = new Map<string, FileResult>();

describe("a file's styles drawn as the translation predicts, over the corpus", () => {
    const files = Object.entries(READERS).flatMap(([dir, type]) =>
        graphFiles(join(CORPUS, dir)).map((path) => ({ type, path })),
    );

    it.each(files.map((file) => [file.path.slice(CORPUS.length + 1), file] as const))("%s", async (name, file) => {
        const raw = readFileSync(file.path);
        const data = new Uint8Array(file.path.endsWith(".gz") ? gunzipSync(raw) : raw);
        const result: FileResult = {
            loaded: false,
            countDiffers: null,
            columnsDiffer: [],
            refused: 0,
            unbound: 0,
            checks: 0,
            mismatches: [],
            unpredicted: [],
        };
        results.set(name, result);

        let read: FileStylesRead | null = null;
        const original = DataSource.prototype.fileStyles;
        vi.spyOn(DataSource.prototype, "fileStyles").mockImplementation(async function (this: DataSource, options) {
            read = await original.call(this, options);
            return read;
        });
        const session = createGraphSession();
        try {
            try {
                await session.data.import(
                    { type: file.type, config: { data, errorLimit: 1_000_000 } },
                    { styles: "file" },
                );
            } catch (error) {
                // A file the element cannot load at all has nothing to check (the reader parity
                // test covers which files load); a file that loads without styles must load with them.
                const plain = createGraphSession();
                const loads = await plain.data
                    .import({ type: file.type, config: { data, errorLimit: 1_000_000 } })
                    .then(
                        () => true,
                        () => false,
                    );
                plain.dispose();
                if (loads) {
                    throw error;
                }

                return;
            }

            result.loaded = true;
            if (read === null) {
                assert.lengthOf(fileLayers(session), 0, "a file with no styles makes no layers");
                return;
            }

            check(session, read, result);
            assert.isNull(result.countDiffers, "the element holds what graph-io holds");
            assert.deepEqual(result.columnsDiffer, [], "every column a layer reads arrives as graph-io read it");
            assert.strictEqual(result.refused, 0, "no layer refused");
            assert.strictEqual(result.unbound, 0, "no layer left without its values");
            assert.deepEqual(result.mismatches.slice(0, 8), [], `${String(result.mismatches.length)} mismatches`);
            assert.deepEqual(
                result.unpredicted.slice(0, 8),
                [],
                `${String(result.unpredicted.length)} unpredicted channels`,
            );
        } finally {
            vi.restoreAllMocks();
            session.dispose();
        }
    });

    afterAll(() => {
        const all = [...results.values()];
        const total = (pick: (result: FileResult) => number): number =>
            all.reduce((sum, result) => sum + pick(result), 0);
        // One line for the record: how much was compared, and that nothing differed.
        console.info(
            `file-styles corpus: ${String(all.length)} files, ${String(all.filter((r) => r.loaded).length)} loaded, ` +
                `${String(total((r) => r.checks))} checks, ${String(total((r) => r.mismatches.length))} mismatches, ` +
                `${String(total((r) => r.unpredicted.length))} unpredicted channels`,
        );
    });
});

describe("a node border another program wrote", () => {
    // node.outline is a screen-space glow of one pixel width, wider than a node framed to fit, so
    // drawing another program's border on it hides the node's fill (issue #2252).
    it("is not drawn as an outline, and the load says the border is not drawn", async () => {
        const doc = JSON.stringify({
            elements: [{ data: { id: "a" } }, { data: { id: "b" } }],
            style: [
                {
                    selector: "node",
                    style: { "background-color": "#00ff00", "border-color": "#000000", "border-width": 2 },
                },
            ],
        });
        const session = createGraphSession();
        await session.data.import({ type: "json", config: { data: doc } }, { styles: "file" });
        const { merged } = session.styles.explain({ node: "a" });
        assert.strictEqual(norm(merged["node.color"]), "#00ff00");
        assert.isNull(norm(merged["node.outline"]));
        const notes = session.data.lastImport()?.styles?.notes ?? [];
        assert.isTrue(
            notes.some((note) => note.code === FILE_STYLE_ISSUE.NOT_DRAWN && note.params.property === "borderColor"),
        );
        session.dispose();
    });
});
