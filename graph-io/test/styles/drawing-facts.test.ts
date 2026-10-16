/**
 * The facts a program that draws a file's styles needs from graph-io beside the rules: which elements a rule's
 * condition selects, which imported columns are the file's own style slots, and how round a program draws a rounded
 * rectangle the file gives no radius for.
 */

import { describe, expect, it } from "vitest";

import { createRegistry } from "../../src/registry.js";
import {
    type ExtractedStyles,
    isStyleSlotColumn,
    matchPredicate,
    type Predicate,
    resolveStyles,
    TOOL_DEFAULTS,
} from "../../src/styles/internal.js";

const registry = createRegistry();

/** A CX2 document of three nodes and one edge, node 2 with a shape bypass. */
const CX2 = JSON.stringify([
    { CXVersion: "2.0", hasFragments: false },
    { attributeDeclarations: [{ nodes: { kind: { d: "string" }, size: { d: "double" } } }] },
    { nodes: [{ id: 1, v: { kind: "a", size: 1 } }, { id: 2, v: { kind: "b", size: 5 } }, { id: 3 }] },
    { edges: [{ id: 0, s: 1, t: 2 }] },
    { nodeBypasses: [{ id: 2, v: { NODE_SHAPE: "diamond" } }] },
    { status: [{ error: "", success: true }] },
]);

const XGMML = `<?xml version="1.0"?>
<graph label="g" directed="1" xmlns="http://www.cs.rpi.edu/XGMML">
  <node id="1" label="a"><att name="kind" type="string" value="a"/><graphics fill="#FF0000" w="30" h="30"/></node>
  <node id="2" label="b"><graphics fill="#00FF00"/></node>
  <edge id="3" source="1" target="2"><graphics fill="#0000FF"/></edge>
</graph>`;

const load = (text: string, format: string): ReturnType<typeof registry.importGraph> =>
    registry.importGraph(new TextEncoder().encode(text), { format, styles: true });

describe("matchPredicate", () => {
    it("selects exactly the elements a rule with that condition gives a value to", async () => {
        const { snapshot, styles } = await load(CX2, "cx2");
        const ex = styles as ExtractedStyles;
        const conditions: Predicate[] = [
            { all: true },
            { has: { data: "kind" } },
            { eq: [{ data: "kind" }, "a"] },
            { in: [{ data: "kind" }, ["a", "b"]] },
            { not: { eq: [{ data: "kind" }, "b"] } },
            { and: [{ has: { data: "kind" } }, { not: { eq: [{ data: "kind" }, "a"] } }] },
        ];
        const selected: string[][] = [];
        for (const where of conditions) {
            const got = matchPredicate(ex, "node", where, snapshot);
            const probe: ExtractedStyles = {
                ...ex,
                styles: {
                    ...ex.styles,
                    rules: [{ id: "p", target: "node", role: "group", origin: "inferred", where, set: { label: "x" } }],
                },
            };
            const want = resolveStyles(probe, "node", "label", snapshot).map((v) => v !== null);
            expect(got, JSON.stringify(where)).toEqual(want);
            selected.push(got.flatMap((m, i) => (m ? [String(snapshot.ids.idOf(i))] : [])));
        }
        expect(selected).toEqual([["1", "2", "3"], ["1", "2"], ["1"], ["1", "2"], ["1", "3"], ["2"]]);
        expect(matchPredicate(ex, "edge", { all: true }, snapshot)).toEqual([true]);
    });
});

describe("isStyleSlotColumn", () => {
    it("names a CX2 file's bypass columns and an XGMML element's graphics, never its data", async () => {
        const cx2 = await load(CX2, "cx2");
        const slots = (snapshot: typeof cx2.snapshot, table: "nodes" | "edges"): string[] =>
            [...snapshot[table]].filter((c) => isStyleSlotColumn(c.meta)).map((c) => c.meta.name);
        expect(slots(cx2.snapshot, "nodes").length).toBeGreaterThan(0);
        expect(slots(cx2.snapshot, "nodes")).not.toContain("kind");
        expect(slots(cx2.snapshot, "nodes")).not.toContain("size");

        const xgmml = await load(XGMML, "xgmml");
        expect(slots(xgmml.snapshot, "nodes")).toEqual(["graphics"]);
        expect(slots(xgmml.snapshot, "edges")).toEqual(["graphics"]);
    });
});

describe("TOOL_DEFAULTS roundedCornerRadius", () => {
    it("is Cytoscape.js's stated 8 for every program, each citing where it comes from", () => {
        for (const [tool, d] of TOOL_DEFAULTS) {
            expect(d.roundedCornerRadius?.value, tool).toBe(8);
            expect(d.roundedCornerRadius?.source, tool).toMatch(/^cytoscape\.js 3\.34\.3 .* line 4386/);
        }
    });
});
