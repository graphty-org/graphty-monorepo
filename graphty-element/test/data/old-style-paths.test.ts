/**
 * @file The GEXF and GraphML readers' old style record keys.
 *
 * Before file styles, a GEXF node's viz color and size reached the graph as `color` and `size` record
 * keys, and a yEd file's graphics as record keys rebuilt from graph-io's `yfiles.*` columns (with
 * the yFiles shape names mapped to `sphere` or `box`). Those keys are deprecated: a load that draws
 * the file's styles (`styles: "file"`) leaves them out, because its layers carry the same values,
 * and a load without (`"none"`, the default) writes them exactly as before. The digests in
 * `old-style-paths.digests.json` were taken from the readers before file styles existed; run with
 * `UPDATE_OLD_STYLE_DIGESTS=1` to rewrite them.
 *
 * The guard: no code in graphty-element reads a style role column (or a `yfiles.*` column) beside
 * the two deprecated readers.
 */

import "../../src/data/index";

import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { gunzipSync } from "node:zlib";

import { importGraph } from "@graphty/graph-io";
import { resolveStyles } from "@graphty/graph-io/styles";
import { assert, describe, it } from "vitest";

import { outside, roleReadsIn, roleReadsUnder } from "../../../graph-io/test/styles/old-paths-scan";
import { createGraphSession, type GraphSession } from "../../session";
import { DataSource } from "../../src/data/DataSource";
import { readerImport } from "../../src/data/graph-io-import";

const CORPUS = join(__dirname, "..", "..", "..", "graph-io", "test", "corpus", "styles");
const DIGESTS_FILE = join(__dirname, "old-style-paths.digests.json");
const SRC = join(__dirname, "..", "..", "src");

/** The record keys a load that draws the file's styles leaves out, per reader and kind. */
const STYLE_KEYS = {
    gexf: { node: ["color", "size"], edge: [] },
    graphml: {
        node: ["width", "height", "color", "borderColor", "borderWidth", "shape"],
        edge: ["color", "width", "targetArrow", "sourceArrow"],
    },
} as const;

/** The deprecated readers, the only files that may read a style role column or a `yfiles.*` column. */
const ALLOWED: readonly string[] = ["data/GEXFDataSource.ts", "data/GraphMLDataSource.ts"];

/**
 * Every graph file under a directory.
 * @param dir - the directory
 * @returns the paths, sorted
 */
function graphFiles(dir: string): string[] {
    const out: string[] = [];
    for (const name of readdirSync(dir).sort()) {
        const path = join(dir, name);
        if (statSync(path).isDirectory()) {
            out.push(...graphFiles(path));
        } else if (!name.endsWith(".md")) {
            out.push(path);
        }
    }

    return out;
}

/**
 * A corpus file's bytes, decompressed when it is stored as `.gz`.
 * @param path - the file
 * @returns the bytes
 */
function bytesOf(path: string): Uint8Array {
    const raw = readFileSync(path);
    return new Uint8Array(path.endsWith(".gz") ? gunzipSync(raw) : raw);
}

/**
 * The records a reader yields for a file.
 * @param type - the reader
 * @param path - the file
 * @param styles - the load's choice of styles
 * @returns the node and edge records
 */
async function records(
    type: string,
    path: string,
    styles: "file" | "none",
): Promise<{ source: DataSource; nodes: Record<string, unknown>[]; edges: Record<string, unknown>[] }> {
    const source = DataSource.get(type, { data: bytesOf(path), errorLimit: 1_000_000, styles });
    if (source === null) {
        assert.fail(`no ${type} reader`);
    }

    const nodes: Record<string, unknown>[] = [];
    const edges: Record<string, unknown>[] = [];
    for await (const chunk of source.getData()) {
        nodes.push(...(chunk.nodes as Record<string, unknown>[]));
        edges.push(...(chunk.edges as Record<string, unknown>[]));
    }

    return { source, nodes, edges };
}

/** The records each corpus file reads to without styles, read once for the whole file. */
const WITHOUT_STYLES = new Map<string, ReturnType<typeof records>>();

/**
 * The records a reader yields for a file without styles, read once.
 * @param type - the reader
 * @param path - the file
 * @returns the node and edge records
 */
function recordsWithoutStyles(type: string, path: string): ReturnType<typeof records> {
    const held = WITHOUT_STYLES.get(path) ?? records(type, path, "none");
    WITHOUT_STYLES.set(path, held);
    return held;
}

/**
 * The records alone.
 * @param read - what a reader yielded
 * @param read.nodes - the node records
 * @param read.edges - the edge records
 * @returns the node and edge records
 */
function withoutSource(read: { nodes: unknown[]; edges: unknown[] }): { nodes: unknown[]; edges: unknown[] } {
    return { nodes: read.nodes, edges: read.edges };
}

/**
 * The first 64 bits of a SHA-256 of a value's JSON.
 * @param value - the value
 * @returns the hash
 */
function digest(value: unknown): string {
    return createHash("sha256").update(JSON.stringify(value)).digest("hex").slice(0, 16);
}

/**
 * The color an element is drawn with, as `#rrggbb`.
 * @param session - the session
 * @param target - the element
 * @param channel - the channel
 * @returns the color
 */
function drawnColor(session: GraphSession, target: { node: string } | { edge: string }, channel: string): unknown {
    const value = (session.styles.explain(target).merged as Record<string, unknown>)[channel] as
        { hex?: string } | undefined;
    return value?.hex?.slice(0, 7).toLowerCase();
}

describe('the old style record keys with styles: "none"', () => {
    it("writes every GEXF and GraphML record exactly as before file styles", async () => {
        const update = process.env.UPDATE_OLD_STYLE_DIGESTS === "1";
        const now: Record<string, string> = {};
        for (const type of ["gexf", "graphml"] as const) {
            for (const path of graphFiles(join(CORPUS, type))) {
                now[relative(CORPUS, path)] = digest(withoutSource(await recordsWithoutStyles(type, path)));
            }
        }

        if (update) {
            writeFileSync(DIGESTS_FILE, `${JSON.stringify(now, null, 4)}\n`);
        }

        assert.deepEqual(now, JSON.parse(readFileSync(DIGESTS_FILE, "utf8")) as Record<string, string>);
    });
});

describe('the old style record keys with styles: "file"', () => {
    it("leaves the style keys out of every GEXF and GraphML record and keeps the rest", async () => {
        let removed = 0;
        for (const type of ["gexf", "graphml"] as const) {
            for (const path of graphFiles(join(CORPUS, type))) {
                const before = await recordsWithoutStyles(type, path);
                const after = await records(type, path, "file");
                const held = await readerImport(after.source);
                if (held === null) {
                    assert.fail("the reader remembers its import");
                }

                for (const kind of ["node", "edge"] as const) {
                    // A key the file declared an attribute for (a GraphML `width` key, a GEXF
                    // attribute titled `color`) is the file's data and stays.
                    const declared = new Set<string>();
                    for (const column of kind === "node"
                        ? held.imported.snapshot.nodes
                        : held.imported.snapshot.edges) {
                        const namespace = column.meta.origin?.namespace;
                        const at = held.path(kind, column.meta.name);
                        if (namespace !== "viz" && namespace !== "yfiles" && at?.length === 1) {
                            declared.add(at[0]);
                        }
                    }

                    const keys = STYLE_KEYS[type][kind].filter((key: string) => !declared.has(key));
                    const left = kind === "node" ? before.nodes : before.edges;
                    const right = kind === "node" ? after.nodes : after.edges;
                    assert.strictEqual(right.length, left.length, `${path} ${kind}s`);
                    right.forEach((record, i) => {
                        const label = `${relative(CORPUS, path)} ${kind} ${String(i)}`;
                        for (const key of keys) {
                            assert.notProperty(record, key, label);
                            removed += key in left[i] ? 1 : 0;
                        }

                        const rest = (from: Record<string, unknown>): Record<string, unknown> =>
                            Object.fromEntries(
                                Object.entries(from).filter(
                                    ([key]) => !(STYLE_KEYS[type][kind] as readonly string[]).includes(key),
                                ),
                            );
                        assert.deepEqual(rest(record), rest(left[i]), label);
                    });
                }
            }
        }

        // The corpus holds styled files, so the check above saw the keys it removes.
        assert.isAbove(removed, 1000);
    });

    it("draws a GEXF file's viz colors through its layers, with no color or size on the nodes", async () => {
        const text = readFileSync(join(CORPUS, "gexf", "gexfjs-miserables.gexf"), "utf8");
        const session = createGraphSession();
        await session.data.import({ type: "gexf", config: { data: text } }, { styles: "file" });

        const nodes = session.data.nodes();
        assert.isAbove(nodes.length, 0);
        for (const node of nodes) {
            assert.notProperty(node, "color");
            assert.notProperty(node, "size");
        }

        const { snapshot, styles } = await importGraph(new TextEncoder().encode(text), {
            format: "gexf",
            styles: true,
            addMissingNodes: true,
        });
        assert.isNotNull(styles ?? null);
        const fill = resolveStyles(styles ?? assert.fail("styles"), "node", "fill", snapshot);
        for (let i = 0; i < snapshot.nodeCount; i++) {
            assert.strictEqual(drawnColor(session, { node: String(snapshot.ids.idOf(i)) }, "node.color"), fill[i]);
        }

        session.dispose();
    });

    it("draws a yEd file's fill colors through its layers, with no yFiles style keys on the records", async () => {
        const path = join(CORPUS, "graphml", "yed-shapenode", "linux4sam__egt__v4l2.graphml");
        const text = readFileSync(path, "utf8");
        const session = createGraphSession();
        await session.data.import({ type: "graphml", config: { data: text } }, { styles: "file" });

        const nodes = session.data.nodes();
        assert.isAbove(nodes.length, 0);
        for (const node of nodes) {
            for (const key of STYLE_KEYS.graphml.node) {
                assert.notProperty(node, key);
            }
        }

        const { snapshot, styles } = await importGraph(new TextEncoder().encode(text), {
            format: "graphml",
            styles: true,
        });
        const fill = resolveStyles(styles ?? assert.fail("styles"), "node", "fill", snapshot);
        let compared = 0;
        for (let i = 0; i < snapshot.nodeCount; i++) {
            if (fill[i] !== null) {
                const id = String(snapshot.ids.idOf(i));
                assert.strictEqual(drawnColor(session, { node: id }, "node.color"), fill[i], `node ${id}`);
                compared++;
            }
        }

        assert.isAbove(compared, 0);
        session.dispose();
    });

    it("still writes the keys for a load that does not ask for styles", async () => {
        const text = readFileSync(join(CORPUS, "gexf", "gexfjs-miserables.gexf"), "utf8");
        const session = createGraphSession();
        await session.data.import({ type: "gexf", config: { data: text } });
        const node = session.data.nodes()[0];
        assert.property(node, "color");
        assert.property(node, "size");
        session.dispose();
    });
});

describe("the guard against new style paths", () => {
    it("finds no code beside the two deprecated readers reading a style role column", () => {
        assert.deepEqual(outside(roleReadsUnder(SRC), ALLOWED), []);
    });

    it("catches a role-color read added anywhere else", () => {
        const scratch = 'const fill = imported.snapshot.nodes.byRole("color");\nrecord.color = fill?.value(row);';
        assert.lengthOf(outside(roleReadsIn("data/NewDataSource.ts", scratch), ALLOWED), 1);
    });
});
