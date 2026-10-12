/**
 * The exactness check of design 10.7 across formats: a hand-made set of styles covering every kind of rule, and one
 * styled file of each corpus format, exported to EVERY built-in format that writes styles and imported back. Each
 * must give the same rules and values (or a loss note naming what was lost), the same bytes when written again,
 * one exception for one outside edit, and a note for a tampered block. A built-in exporter with a `styles` member
 * that no harness module describes fails the test instead of being skipped; one without a `styles` member loses
 * every property with W_STYLE_NOT_WRITTEN.
 */

import { GraphBuilder, type GraphSnapshot } from "@graphty/graph-format";
import { describe, expect, it } from "vitest";

import { createRegistry } from "../../src/registry.js";
import {
    blockStyles,
    type ExtractedStyles,
    extractStyles,
    featuresOf,
    parseStyleBlock,
    resolveStyles,
    styleFingerprint,
    type StyleProperty,
    writeStyleBlock,
} from "../../src/styles/index.js";
import { handMade } from "./hand-made.js";
import {
    corpusFiles,
    formatInputs,
    type LoadedGraph,
    roundTrip,
    STYLE_CORPUS,
    styleFormats,
    type StyleWriter,
} from "./harness.js";

const registered = await styleFormats();
/** Every built-in exporter, and the harness's description of how each one that writes styles is read back. */
const builtIn = createRegistry().exporters();
const writers = new Map(registered.flatMap((f) => (f.writer === undefined ? [] : [[f.writer.format, f.writer]])));
const styled = builtIn.filter((e) => e.styles !== undefined).map((e) => e.format);
const unstyled = builtIn.filter((e) => e.styles === undefined).map((e) => e.format);

/**
 * What a format needs to hold a graph whose ids or keys it cannot spell: the options that rewrite them and write the
 * originals beside them. Directions are never rewritten: that changes the edges, and styles follow their graph.
 */
const REWRITE = { sanitizeIds: "mangle", sanitizeKeys: "mangle" } as const;

/**
 * The harness writer of a format, with the options it needs to write the graph at all: none when the graph fits the
 * format as it is, else the rewriting options; null when even those leave an error (a format that holds one direction
 * per file and a graph with both).
 * @param format - the format
 * @param snapshot - the graph
 * @returns the writer, or null
 */
function writerFor(format: string, snapshot: GraphSnapshot): StyleWriter | null {
    const writer = writers.get(format);
    if (writer === undefined) {
        throw new Error(`no harness writer for ${format}`);
    }
    const registry = createRegistry();
    const fails = (options: Readonly<Record<string, unknown>>): boolean =>
        registry.checkExport(snapshot, format, options).some((n) => n.code.startsWith("E_"));
    if (!fails(writer.options ?? {})) {
        return writer;
    }
    const options = { ...REWRITE, ...writer.options };
    return fails(options) ? null : { ...writer, options };
}

/**
 * Round trips that do not hold yet, by `<input> > <format>`, with the cause: each runs as an expected failure, so the
 * fix turns it red until it is removed from here.
 */
const KNOWN_FAILURES: ReadonlyMap<string, string> = new Map(
    ["cx/ndex-90f78bcd-1dd0-11ef-9621-005056ae23aa.cx", "cx2/ndex-90f78bcd-1dd0-11ef-9621-005056ae23aa.cx2"].map(
        (input) => [
            `${input} > pajek`,
            // the file has both a label column ("name") and a column named "label": Pajek writes the first as the
            // vertex label and the second as a parameter its importer also reads as the label, so "name" is lost
            // (W_ROLE_ASSUMED), and so is the width mapping that reads it, with no style note saying so
            "a rule reads a column the format loses",
        ],
    ),
);

/**
 * One styled input per corpus format: its smallest committed file whose styles have rules beyond the defaults.
 * @returns the inputs, by corpus format
 */
async function corpusSamples(): Promise<readonly (readonly [string, LoadedGraph, ExtractedStyles])[]> {
    const out: [string, LoadedGraph, ExtractedStyles][] = [];
    for (const format of registered.filter((f) => f.corpus !== false)) {
        const files = new Set(corpusFiles(`${STYLE_CORPUS}/${format.name}`).map((r) => `${format.name}/${r}`));
        const inputs = formatInputs(format)
            .filter((i) => files.has(i.name) && !i.name.includes("/generated/") && i.bytes !== undefined)
            .sort((a, b) => (a.bytes?.length ?? 0) - (b.bytes?.length ?? 0));
        for (const input of inputs) {
            const loaded = await input.load().catch(() => null);
            const ex = loaded === null ? null : extractStyles(loaded.importer, loaded.snapshot, loaded.report);
            if (loaded !== null && ex !== null && ex.styles.rules.length > 2 && loaded.snapshot.nodeCount > 2) {
                out.push([input.name, loaded, ex]);
                break;
            }
        }
    }
    return out;
}

describe("the built-in formats", () => {
    it("each one that writes styles is checked by a harness writer", () => {
        expect(styled.length).toBeGreaterThan(0);
        expect(styled.filter((f) => !writers.has(f))).toEqual([]);
    });

    it("each one without a style writer is CSV, Neo4j CSV or OBO", () => {
        expect([...unstyled].sort()).toEqual(["csv", "neo4j", "obo"]);
    });
});

describe.each(styled.map((f) => [f] as const))("hand-made styles written as %s", (format) => {
    it("read back as the same rules and values, written again as the same bytes", async () => {
        const { loaded, ex } = handMade();
        const writer = writerFor(format, loaded.snapshot);
        expect(writer).not.toBeNull();
        expect(writer === null ? [] : await roundTrip(writer, loaded, ex)).toEqual([]);
    });
});

describe.each(unstyled.map((f) => [f] as const))("hand-made styles written as %s", (format) => {
    it("lose every property with W_STYLE_NOT_WRITTEN and its count", () => {
        const { loaded, ex } = handMade();
        const notes = createRegistry().checkExport(loaded.snapshot, format, { styles: ex });
        const lost = new Map(
            notes
                .filter((n) => n.code === "W_STYLE_NOT_WRITTEN")
                .map((n) => [`${n.style?.target ?? ""}.${n.style?.property ?? ""}`, n.count]),
        );
        const expected = new Map<string, number>();
        for (const r of ex.styles.rules) {
            for (const p of [...Object.keys(r.set ?? {}), ...Object.keys(r.map ?? {})]) {
                const values = resolveStyles(ex, r.target, p as StyleProperty, loaded.snapshot);
                expected.set(`${r.target}.${p}`, values.filter((v) => v !== null).length);
            }
        }
        expected.set("graph.background", 1);
        expect([...lost.keys()].sort()).toEqual([...expected.keys()].sort());
        for (const [key, count] of expected) {
            if (key !== "graph.background") {
                expect([key, lost.get(key)]).toEqual([key, count]);
            }
        }
        expect(notes.filter((n) => n.code === "W_STYLE_RULES_NOT_KEPT")).toHaveLength(1);
    });
});

describe("a styled file of each corpus format", async () => {
    const samples = await corpusSamples();

    it("is found for every corpus format with a style reader", () => {
        expect(samples.length).toBeGreaterThanOrEqual(styled.length);
    });

    it("lists no known failure that is not a pair this test runs", () => {
        const pairs = new Set(samples.flatMap(([name]) => styled.map((f) => `${name} > ${f}`)));
        expect([...KNOWN_FAILURES.keys()].filter((k) => !pairs.has(k))).toEqual([]);
    });

    describe.each(samples.map(([name, loaded, ex]) => [name, loaded, ex] as const))("%s", (name, loaded, ex) => {
        for (const format of styled) {
            const known = KNOWN_FAILURES.has(`${name} > ${format}`);
            (known ? it.fails : it)(`written as ${format} reads back as the same rules and values`, async () => {
                const writer = writerFor(format, loaded.snapshot);
                // a graph the format cannot hold even with its ids and keys rewritten is not a style question
                if (writer !== null) {
                    expect(await roundTrip(writer, loaded, ex)).toEqual([]);
                }
            });
        }
    });
});

describe("what keeps styles across formats", () => {
    /**
     * A graph of three nodes with one text column, under a name, and one more column.
     * @param ids - the node ids
     * @param column - the text column's name
     * @param flag - the values of a column `flag`
     * @returns the graph
     */
    function three(
        ids: readonly (string | number)[],
        column = "name",
        flag: readonly (boolean | number)[] = [true, false, true],
    ): GraphSnapshot {
        const b = new GraphBuilder({ directed: true });
        const text = b.declareNodeColumn({ name: column, dtype: "string" });
        const f = b.declareNodeColumn({ name: "flag", dtype: typeof flag[0] === "boolean" ? "bool" : "i32" });
        ids.forEach((id, i) => {
            b.addNode(id);
            b.setNodeValue(text, i, `Node ${String(i)}`);
            b.setNodeValue(f, i, flag[i]);
        });
        return b.freeze();
    }

    /**
     * Styles that label every node from a column and hide the flagged ones.
     * @param snapshot - the graph
     * @returns the styles
     */
    function labelled(snapshot: GraphSnapshot): ExtractedStyles {
        return {
            styles: {
                version: 1,
                source: { format: "test", dialect: "graphty", tool: null },
                units: { length: "px" },
                graph: {},
                rules: [
                    {
                        id: "node.label",
                        target: "node",
                        role: "passthrough",
                        origin: "declared",
                        where: { all: true },
                        map: { label: { kind: "passthrough", by: { data: "name" } } },
                    },
                    {
                        id: "node.hidden",
                        target: "node",
                        role: "group",
                        origin: "declared",
                        where: { eq: [{ data: "flag" }, true] },
                        set: { visible: false },
                    },
                ],
                notes: [],
            },
            columns: { node: new Map(), edge: new Map() },
            features: { node: featuresOf(snapshot, "node"), edge: [] },
            fingerprint: styleFingerprint(snapshot),
        };
    }

    it("a graph keeps its fingerprint when a format reads its ids back as text", () => {
        expect(styleFingerprint(three(["7", "8", "9"]))).toEqual(styleFingerprint(three([7, 8, 9])));
    });

    it("a rule finds its column again by its values when a format renames it", () => {
        const written = three([1, 2, 3]);
        const block = parseStyleBlock(
            writeStyleBlock(labelled(written), { snapshot: written }),
            styleFingerprint(three([1, 2, 3], "label")),
        );
        if (!block.ok) {
            throw new Error(block.reason);
        }
        const read = three([1, 2, 3], "label");
        const styles = blockStyles(block.block, read, "test");
        if (styles === null) {
            throw new Error("no styles");
        }
        expect(resolveStyles(styles, "node", "label", read)).toEqual(["Node 0", "Node 1", "Node 2"]);
    });

    it("a rule over a boolean column selects the same elements when a format writes booleans as 1 and 0", () => {
        const read = three([1, 2, 3], "name", [1, 0, 1]);
        expect(resolveStyles(labelled(read), "node", "visible", read)).toEqual([false, null, false]);
    });
});
