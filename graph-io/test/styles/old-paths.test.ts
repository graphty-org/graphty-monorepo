/**
 * The old style paths: the deprecated columns and role consumers stay exactly as they were, and no new code reads a
 * style role column.
 *
 * Before file styles, a GEXF file's look reached a caller only through its viz role columns (`color`, `size`, `shape`,
 * `shape.uri`, `thickness`, with an attribute titled like one renamed `<title>#<id>`), and a yEd file's only through
 * the `yfiles.*` columns (with a target arrow making an edge directed and `yfiles.label` taking the label role).
 * Exporters wrote the role columns into the format's style slots (GEXF `viz:*`) or as plain attributes (JSON, Neo4j
 * CSV). All of that is deprecated and frozen until the next major version: the digests below pin what it produces.
 * Every export of the role columns without styles is pinned too, by `role-precedence.test.ts` (BEFORE_STYLES) and
 * `plumbing.test.ts` (the no-styles baseline of every conformance fixture).
 *
 * The guard: style readers and writers are the only code that turns those columns into drawing, node data or a style
 * slot, beside the deprecated paths named here.
 */

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";

import type { Column, GraphSnapshot } from "@graphty/graph-format";
import { describe, expect, it } from "vitest";

import { createRegistry } from "../../src/registry.js";
import { STYLE_CORPUS } from "./harness.js";
import { outside, roleReadsIn, roleReadsUnder } from "./old-paths-scan.js";

/** graph-io's sources. */
const SRC = resolve(import.meta.dirname, "../../src");

/**
 * The files that may read a style role column, and why.
 */
const ALLOWED: readonly (string | RegExp)[] = [
    // The style readers and writers.
    /^styles\//,
    /^formats\/[^/]+\/styles[^/]*\.ts$/,
    // Deprecated: the loss notes for role columns written without styles (W_VIZ_DROPPED).
    "common/export.ts",
    // Deprecated: viz:* written from the role columns when no styles are given.
    "formats/gexf/exporter.ts",
    // Deprecated: role columns written as plain properties.
    "formats/neo4j/exporter.ts",
    // Deprecated and frozen: the yfiles.* columns.
    "formats/graphml/yfiles.ts",
    // Leaves graph-level role columns out of the graph attributes; produces nothing from them.
    "formats/dot/exporter.ts",
];

/**
 * The first 64 bits of a SHA-256 of a value's JSON (bigints as text, typed arrays as arrays).
 * @param value - the value
 * @returns the hash
 */
function digest(value: unknown): string {
    const text = JSON.stringify(value, (_key, v: unknown) => {
        if (typeof v === "bigint") {
            return `${v.toString()}n`;
        }
        return ArrayBuffer.isView(v) ? Array.from(v as unknown as ArrayLike<number>) : v;
    });
    return createHash("sha256").update(text).digest("hex").slice(0, 16);
}

/**
 * The name, role, dtype and every value of each column of a table whose name or role a test pins.
 * @param table - the node or edge table
 * @param pick - which columns
 * @returns the columns
 */
function columns(table: Iterable<Column>, pick: (column: Column) => boolean): unknown[] {
    const out: unknown[] = [];
    for (const column of table) {
        if (pick(column)) {
            const values: unknown[] = [];
            for (let row = 0; row < column.length; row++) {
                values.push(column.isSet(row) ? column.value(row) : null);
            }
            out.push({ name: column.meta.name, role: column.meta.role, dtype: column.dtype, values });
        }
    }
    return out;
}

/**
 * Import a file of the style corpus, or text.
 * @param input - a corpus path, or the file's text
 * @param format - its format
 * @returns the snapshot
 */
async function load(input: { path: string } | { text: string }, format: string): Promise<GraphSnapshot> {
    const bytes =
        "path" in input
            ? new Uint8Array(readFileSync(join(STYLE_CORPUS, input.path)))
            : new TextEncoder().encode(input.text);
    const { snapshot } = await createRegistry().importGraph(bytes, { format });
    return snapshot;
}

describe("the deprecated style columns are unchanged", () => {
    it("reads GEXF viz values into the color, size, shape and thickness role columns", async () => {
        const snapshot = await load({ path: "gexf/pygraphistry-sample.gexf" }, "gexf");
        const viz = (column: Column): boolean => column.meta.origin?.namespace === "viz";
        expect(digest(columns(snapshot.nodes, viz))).toBe("7a8305f7c58affd9");
        expect(digest(columns(snapshot.edges, viz))).toBe("eda48ee27fe85fdc");
    });

    it("renames a GEXF attribute titled like a viz column, and keeps the viz value under the name", async () => {
        const snapshot = await load(
            {
                text: `<gexf xmlns="http://gexf.net/1.3" xmlns:viz="http://gexf.net/1.3/viz" version="1.3"><graph>
<attributes class="node"><attribute id="0" title="color" type="string"/><attribute id="1" title="size" type="float"/></attributes>
<nodes><node id="a"><attvalues><attvalue for="0" value="red"/><attvalue for="1" value="2"/></attvalues>
<viz:color r="0" g="0" b="255"/><viz:size value="7"/></node></nodes><edges/></graph></gexf>`,
            },
            "gexf",
        );
        expect(
            columns(snapshot.nodes, () => true).map((c) => [
                (c as { name: string }).name,
                (c as { role: unknown }).role,
            ]),
        ).toEqual([
            ["color#0", null],
            ["size#1", null],
            ["color", "color"],
            ["size", "size"],
        ]);
    });

    it("reads yEd graphics into the yfiles.* columns, with arrows as direction and the label role", async () => {
        const snapshot = await load({ path: "graphml/yed-shapenode/linux4sam__egt__v4l2.graphml" }, "graphml");
        const yfiles = (column: Column): boolean =>
            column.meta.name.startsWith("yfiles.") || column.meta.role === "directed";
        expect(digest(columns(snapshot.nodes, yfiles))).toBe("1ed87cedbec9cbbd");
        expect(digest(columns(snapshot.edges, yfiles))).toBe("ae1b4bd11139e632");
        expect(snapshot.nodes.byRole("label")?.meta.name).toBe("yfiles.label");
    });

    it("still says what ExportCapabilities.viz said", () => {
        const registry = createRegistry();
        const viz = Object.fromEntries(
            ["gexf", "graphml", "json", "neo4j", "dot", "gml", "csv"].map((format) => [
                format,
                registry.exporter(format).capabilities.viz,
            ]),
        );
        expect(viz).toEqual({
            gexf: true,
            graphml: false,
            json: false,
            neo4j: false,
            dot: false,
            gml: false,
            csv: false,
        });
    });
});

describe("the guard against new style paths", () => {
    it("finds no code outside the style readers, writers and deprecated paths reading a style role column", () => {
        expect(outside(roleReadsUnder(SRC), ALLOWED)).toEqual([]);
    });

    it("catches a role read added anywhere else", () => {
        const scratch = [
            'const fill = snapshot.nodes.byRole("color");',
            'if (column.meta.role === "size") { record.size = column.value(row); }',
            'const SLOT_ROLES = new Set(["thickness"]);',
            'const width = table.get("yfiles.width");',
            "switch (column.meta.role) {",
            '    case "shape":',
            "        break;",
            "}",
            'const label = snapshot.nodes.byRole("label");',
            '// byRole("color") in a comment is not a read',
        ].join("\n");
        expect(outside(roleReadsIn("formats/new/importer.ts", scratch), ALLOWED).map((read) => read.line)).toEqual([
            1, 2, 3, 4, 6,
        ]);
    });
});
