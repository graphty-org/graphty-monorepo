/**
 * The `graphty.styles` block: written and read back, and ignored with a reason, never thrown, when it is truncated,
 * oversized, written for another graph, of another version, nested too deep or holding a key that reaches a
 * prototype.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { GraphBuilder, type GraphSnapshot } from "@graphty/graph-format";
import { describe, expect, it } from "vitest";

import { createRegistry, importGraph } from "../../src/registry.js";
import {
    blockStyles,
    type ExtractedStyles,
    featuresOf,
    MAX_STYLE_BLOCK_LENGTH,
    parseStyleBlock,
    planStyles,
    resolveStyles,
    STYLE_BLOCK_NAME,
    styleFingerprint,
    styleTag,
    writeStyleBlock,
} from "../../src/styles/index.js";

/**
 * A graph of six nodes in two groups with a weight per edge.
 * @returns the graph
 */
function graph(): GraphSnapshot {
    const b = new GraphBuilder({ directed: false });
    const group = b.declareNodeColumn({ name: "group", dtype: "string" });
    for (let i = 0; i < 6; i++) {
        b.addNode(`n${String(i)}`);
        b.setNodeValue(group, i, i < 3 ? "a" : "b");
    }
    for (let i = 0; i < 5; i++) {
        b.addEdge(`n${String(i)}`, `n${String(i + 1)}`);
    }
    return b.freeze();
}

/**
 * Styles for the graph: fill by group, and one node with a fill of its own (an exceptions column).
 * @param snapshot - the graph
 * @returns the styles
 */
function styled(snapshot: GraphSnapshot): ExtractedStyles {
    const fill = ["#ff0000", "#ff0000", "#ff0000", "#0000ff", "#0000ff", "#00ff00"];
    return planStyles(
        {
            format: "test",
            node: { values: { fill, width: [10, 10, 10, 10, 10, 10] } },
            edge: { values: { color: ["#111111", "#111111", "#111111", "#111111", "#111111"] } },
            fingerprint: styleFingerprint(snapshot),
        },
        { node: featuresOf(snapshot, "node"), edge: featuresOf(snapshot, "edge") },
    );
}

describe("writeStyleBlock and parseStyleBlock", () => {
    it("round-trips the rules, units, graph, source, column keys and fingerprint", () => {
        const snapshot = graph();
        const extracted = styled(snapshot);
        const text = writeStyleBlock(extracted);
        expect(writeStyleBlock(extracted)).toBe(text);
        const parsed = parseStyleBlock(text, styleFingerprint(snapshot));
        expect(parsed.ok).toBe(true);
        if (!parsed.ok) {
            return;
        }
        expect(parsed.block.rules).toEqual(JSON.parse(JSON.stringify(extracted.styles.rules)));
        expect(parsed.block.units).toEqual(extracted.styles.units);
        expect(parsed.block.source).toEqual(extracted.styles.source);
        expect(parsed.block.columns.node).toEqual(Array.from(extracted.columns.node.keys()));
        const { nodes, edges, ids } = extracted.fingerprint;
        expect(parsed.block.fingerprint).toEqual({ nodes, edges, ids });
        expect(parsed.block.values).toBeUndefined();
    });

    it("carries the style columns inside the block when asked and reads them back", () => {
        const snapshot = graph();
        const extracted = styled(snapshot);
        const parsed = parseStyleBlock(writeStyleBlock(extracted, { inlineColumns: true }), styleFingerprint(snapshot));
        if (!parsed.ok) {
            throw new Error(parsed.reason);
        }
        const back = blockStyles(parsed.block, snapshot, "test");
        if (back === null) {
            throw new Error("missing columns");
        }
        for (const p of ["fill", "width"] as const) {
            expect(resolveStyles(back, "node", p, snapshot)).toEqual(resolveStyles(extracted, "node", p, snapshot));
        }
        expect(back.styles.rules).toEqual(JSON.parse(JSON.stringify(extracted.styles.rules)));
        expect(back.styles.source).toEqual({ format: "test", dialect: "graphty", tool: "graphty" });
    });

    it("matches a graph read back with its nodes in another order, its inline values following each node's id", () => {
        const snapshot = graph();
        const extracted = styled(snapshot);
        const text = writeStyleBlock(extracted, { inlineColumns: true, snapshot });
        const b = new GraphBuilder({ directed: false });
        const group = b.declareNodeColumn({ name: "group", dtype: "string" });
        for (let i = 5; i >= 0; i--) {
            const row = b.addNode(`n${String(i)}`);
            b.setNodeValue(group, row, i < 3 ? "a" : "b");
        }
        for (let i = 0; i < 5; i++) {
            b.addEdge(`n${String(i)}`, `n${String(i + 1)}`);
        }
        const reordered = b.freeze();
        const parsed = parseStyleBlock(text, styleFingerprint(reordered));
        if (!parsed.ok) {
            throw new Error(parsed.reason);
        }
        const back = blockStyles(parsed.block, reordered, "test");
        const byId = (ex: ExtractedStyles | null, of: GraphSnapshot): Record<string, unknown> =>
            ex === null
                ? {}
                : Object.fromEntries(resolveStyles(ex, "node", "fill", of).map((v, i) => [String(of.ids.idOf(i)), v]));
        expect(byId(back, reordered)).toEqual(byId(extracted, snapshot));
    });

    it("counts an undirected edge of a directed graph once, as every file holds it", () => {
        const b = new GraphBuilder({ directed: true });
        b.addNode("a");
        b.addNode("b");
        b.addEdge("a", "b");
        b.addEdge("b", "a");
        const halves = b.freeze().withColumns();
        halves.edges.set("graphty.pair", [1, 0], { dtype: "u32", role: "pair" });
        expect(styleFingerprint(halves)).toMatchObject({ edges: 2, heldEdges: 1 });
    });

    it("keeps a consumer's ext untouched", () => {
        const snapshot = graph();
        const extracted = styled(snapshot);
        const ext = { "@example/viewer": { layer: { selector: "x", n: [1, 2] } } };
        const withExt: ExtractedStyles = {
            ...extracted,
            styles: { ...extracted.styles, rules: extracted.styles.rules.map((r) => ({ ...r, ext })) },
        };
        const parsed = parseStyleBlock(writeStyleBlock(withExt), styleFingerprint(snapshot));
        expect(parsed.ok && parsed.block.rules.every((r) => JSON.stringify(r.ext) === JSON.stringify(ext))).toBe(true);
    });

    it("turns an outside edit of a native value into one exception", () => {
        const snapshot = graph();
        const extracted = styled(snapshot);
        const parsed = parseStyleBlock(writeStyleBlock(extracted, { inlineColumns: true }), styleFingerprint(snapshot));
        if (!parsed.ok) {
            throw new Error(parsed.reason);
        }
        const truth = [...resolveStyles(extracted, "node", "fill", snapshot)];
        truth[1] = "#123456";
        const back = blockStyles(parsed.block, snapshot, "test", { node: { fill: truth } });
        if (back === null) {
            throw new Error("missing columns");
        }
        expect(back.styles.rules.slice(0, -1)).toEqual(parsed.block.rules);
        const top = back.styles.rules.at(-1);
        expect(top?.role).toBe("exceptions");
        expect(resolveStyles(back, "node", "fill", snapshot)).toEqual(truth);
        const column = back.columns.node.get("exceptions.fill");
        expect(column?.filter((v) => v !== null)).toEqual(["#123456"]);
    });

    it("names the tagged attribute of a style column", () => {
        expect(styleTag("node", "member.3")).toBe("graphty.style.node.member.3");
        expect(styleTag("edge", "exceptions.color")).toBe("graphty.style.edge.exceptions.color");
    });
});

describe("a block that is not to be trusted", () => {
    const snapshot = graph();
    const fp = styleFingerprint(snapshot);
    const good = writeStyleBlock(styled(snapshot));

    const cases: readonly (readonly [string, unknown, string])[] = [
        ["truncated", good.slice(0, Math.floor(good.length / 2)), "NOT_JSON"],
        ["not text", 42, "INVALID"],
        ["oversized", `{"version":1,"pad":"${"x".repeat(MAX_STYLE_BLOCK_LENGTH)}"}`, "TOO_LARGE"],
        [
            "of another graph",
            good.replace(`"nodes":${String(fp.nodes)}`, `"nodes":${String(fp.nodes + 1)}`),
            "FINGERPRINT",
        ],
        ["of another version", good.replace('"version":1', '"version":2'), "VERSION"],
        ["holding __proto__", good.replace('"version":1', '"version":1,"__proto__":{"polluted":true}'), "INVALID"],
        ["holding constructor in a rule", good.replace('"rules":[{', '"rules":[{"constructor":1,'), "INVALID"],
        ["nested too deep", `{"version":1,"x":${"[".repeat(100)}${"]".repeat(100)}}`, "INVALID"],
        ["with a bad predicate", good.replace('"where":{"all":true}', '"where":{"in":5}'), "INVALID"],
        ["with a bad value", good.replace('"graph":{}', '"graph":{"background":{"a":1}}'), "INVALID"],
        ["missing its rules", '{"version":1}', "INVALID"],
        ["deeply nested beyond the parser", `${"[".repeat(200000)}${"]".repeat(200000)}`, "INVALID"],
    ];
    for (const [what, text, reason] of cases) {
        it(`is ignored when ${what}`, () => {
            const parsed = parseStyleBlock(text, fp);
            expect(parsed).toEqual({ ok: false, reason });
            expect(({} as Record<string, unknown>).polluted).toBeUndefined();
        });
    }

    it("is ignored on import with a W_STYLE_BLOCK_IGNORED note naming the reason, and never throws", async () => {
        const doc = JSON.stringify({
            directed: false,
            multigraph: false,
            graph: { [STYLE_BLOCK_NAME]: '{"version":1,"__proto__":{"x":1}}' },
            nodes: [{ id: "a" }],
            links: [],
        });
        const result = await importGraph(doc, { format: "json", styles: true });
        const note = result.styles?.styles.notes.find((n) => n.code === "W_STYLE_BLOCK_IGNORED");
        expect(note?.params.samples).toEqual(["INVALID"]);
        // the file is read as NetworkX's node-link, with NetworkX's drawing defaults and nothing else
        expect(result.styles?.styles.source.tool).toBe("networkx");
        expect(result.styles?.styles.rules.filter((r) => r.origin !== "tool")).toEqual([]);
    });

    it("is ignored when a style column its rules read is missing from the file", () => {
        const parsed = parseStyleBlock(good, fp);
        if (!parsed.ok) {
            throw new Error(parsed.reason);
        }
        const needs = parsed.block.columns.node.length + parsed.block.columns.edge.length;
        expect(needs).toBeGreaterThan(0);
        expect(blockStyles(parsed.block, snapshot, "test")).toBeNull();
    });
});

describe("an opaque color another program wrote over a translucent one graphty wrote", () => {
    // node 0 of this file is drawn #ffcc00 with fillOpacity 0 by a class rule
    const gml = readFileSync(resolve(import.meta.dirname, "../corpus/styles/gml/generated/graphty-written.gml"));
    // where each format writes node 0's fill, translucent, and the same fill made opaque
    const slots: [string, string | undefined, RegExp, string][] = [
        ["gml", undefined, /fill "#FFCC0000"/, 'fill "#FFCC00"'],
        ["graphml", undefined, /<y:Fill color="#FFCC0000"/, '<y:Fill color="#FFCC00"'],
        ["gexf", undefined, /r="255" g="204" b="0" a="0"/, 'r="255" g="204" b="0"'],
        ["json", "vis", /rgba\(255,204,0,0\)/, "#FFCC00"],
        ["json", "graphology", /rgba\(255,204,0,0\)/, "#FFCC00"],
    ];

    it.each(slots)(
        "is read as opacity 1 in %s %s, as one exception over the same rules",
        async (format, dialect, slot, opaque) => {
            const registry = createRegistry();
            const first = await registry.importGraph(new Uint8Array(gml), { format: "gml", styles: true });
            const written = await registry.exportGraphToString(first.snapshot, format, {
                styles: first.styles ?? undefined,
                ...(dialect === undefined ? {} : { dialect }),
            });
            expect(written).toMatch(slot);
            const unedited = await registry.importGraph(written, { format, styles: true });
            const edited = await registry.importGraph(written.replace(slot, opaque), { format, styles: true });
            const opacity = (r: typeof first): readonly unknown[] =>
                resolveStyles(r.styles as ExtractedStyles, "node", "fillOpacity", r.snapshot);
            expect(opacity(unedited)[0]).toBe(0);
            expect(opacity(edited)[0]).toBe(1);
            expect(opacity(edited).slice(1)).toEqual(opacity(unedited).slice(1));
            expect(
                [...(unedited.styles as ExtractedStyles).columns.node.keys()].filter((k) =>
                    k.startsWith("exceptions."),
                ),
            ).toEqual([]);
        },
    );
});
