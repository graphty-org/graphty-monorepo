/**
 * DOT settings Graphviz draws that the specimen sheets showed graph-io missing: each test fails without its fix.
 */

import type { GraphSnapshot } from "@graphty/graph-format";
import { describe, expect, it } from "vitest";

import { createRegistry } from "../../../src/registry.js";
import { type ExtractedStyles, resolveStyles, type StyleProperty } from "../../../src/styles/index.js";

const registry = createRegistry();

/**
 * Imports a DOT document with its styles.
 * @param doc - the document
 * @returns the snapshot and its styles
 */
async function load(doc: string): Promise<{ snapshot: GraphSnapshot; styles: ExtractedStyles }> {
    const result = await registry.importGraph(doc, { format: "dot", styles: { toolDefaults: true } });
    if (result.styles === null || result.styles === undefined) {
        throw new Error("no styles");
    }
    return { snapshot: result.snapshot, styles: result.styles };
}

/**
 * Each node's drawn value of a property, by id.
 * @param doc - the document
 * @param property - the property
 * @returns the values
 */
async function nodes(doc: string, property: string): Promise<Record<string, unknown>> {
    const { snapshot, styles } = await load(doc);
    const values = resolveStyles(styles, "node", property as StyleProperty, snapshot);
    return Object.fromEntries(values.map((v, i) => [String(snapshot.ids.idOf(i)), v]));
}

/**
 * Each edge's drawn value of a property, in order.
 * @param doc - the document
 * @param property - the property
 * @returns the values
 */
async function edges(doc: string, property: string): Promise<readonly unknown[]> {
    const { snapshot, styles } = await load(doc);
    return resolveStyles(styles, "edge", property as StyleProperty, snapshot);
}

describe("DOT styles: labels", () => {
    it("decodes entities in a plain label, as Graphviz draws them", async () => {
        expect((await nodes(`digraph { a [label="a&#946;&amp;"]; b [label="x & y"] }`, "label")).a).toBe("aβ&");
        expect((await nodes(`digraph { b [label="x & y"] }`, "label")).b).toBe("x & y");
    });

    it("draws a part-transparent font color's text so, and an opaque one with no opacity", async () => {
        const opacity = await nodes(`digraph { a [fontcolor="#377eb880"]; b [fontcolor=red] }`, "labelOpacity");
        expect(opacity.a).toBeCloseTo(128 / 255, 5);
        expect(opacity.b ?? 1).toBe(1);
    });

    it("draws a fontconfig pattern name in the viewer's default face, as Graphviz's SVG names a family none has", async () => {
        const font = await nodes(`digraph { a [fontname="DejaVu Sans:bold"]; b [fontname="Lato"] }`, "labelFont");
        expect(font.a).toBe("Times, serif");
        expect(font.b).toBe("Lato, sans-serif");
    });

    it("puts a node's label against the top or bottom of its box for labelloc t and b", async () => {
        const at = await nodes(`digraph { a [labelloc=t]; b [labelloc=b]; c [labelloc=c] }`, "labelPosition");
        expect([at.a, at.b, at.c]).toEqual(["inside-top", "inside-bottom", "center"]);
    });
});

describe("DOT styles: what Graphviz draws nothing of", () => {
    it("hides a node styled invisible, Graphviz's other spelling of invis", async () => {
        expect((await nodes(`digraph { a [style=invisible] }`, "visible")).a).toBe(false);
    });

    it("hides a plain node with an empty label, filled or not", async () => {
        const visible = await nodes(`digraph { a [shape=plain, style=filled, label=""]; b [shape=plain] }`, "visible");
        expect(visible.a).toBe(false);
        expect(visible.b ?? true).toBe(true);
    });

    it("keeps a plain node whose HTML label has no words, as Graphviz draws its cells and images", async () => {
        const doc = `digraph { a [shape=plain, label=<<TABLE><TR><TD><IMG SRC="x.png"/></TD></TR></TABLE>>] }`;
        expect((await nodes(doc, "visible")).a ?? true).toBe(true);
    });

    it('draws no edge under splines=none or splines=""', async () => {
        expect(await edges(`digraph { splines=none; a -> b; b -> c }`, "visible")).toEqual([false, false]);
        expect(await edges(`digraph { splines=""; a -> b }`, "visible")).toEqual([false]);
        expect(await edges(`digraph { splines=line; a -> b }`, "visible")).toEqual([null]);
    });
});

describe("DOT styles: outlines and shapes", () => {
    it("draws a second outline 4 points outside the first for peripheries=2 and doublecircle", async () => {
        const doc = `digraph {
            a [shape=box, peripheries=2, color=red, penwidth=1];
            b [shape=doublecircle];
            c [shape=tripleoctagon, penwidth=2];
            d [shape=doublecircle, peripheries=1];
            e [shape=box];
        }`;
        const width = await nodes(doc, "outerBorderWidth");
        const offset = await nodes(doc, "outerBorderOffset");
        const color = await nodes(doc, "outerBorderColor");
        expect([width.a, offset.a, color.a]).toEqual([1, 3, "#ff0000"]);
        expect([width.b, offset.b]).toEqual([1, 3]);
        expect([width.c, offset.c]).toEqual([2, 2]);
        expect(width.d ?? 0).toBe(0);
        expect(width.e ?? 0).toBe(0);
    });

    it("draws a striped cluster's color list as stripes left to right, as on a box", async () => {
        const doc = `digraph { subgraph cluster_s { style=striped; fillcolor="red:green:blue"; a } }`;
        expect((await nodes(doc, "stripeColors")).cluster_s).toBe("#ff0000 #008000 #0000ff");
        expect((await nodes(doc, "stripeDirection")).cluster_s).toBe("right");
    });

    it("turns a box by its orientation into the polygon Graphviz draws", async () => {
        const doc = `digraph { a [shape=box, orientation=30]; b [shape=box, orientation=90]; c [shape=box] }`;
        const shape = await nodes(doc, "shape");
        const points = await nodes(doc, "shapePoints");
        expect(shape.a).toBe("polygon");
        expect(points.a).toBe("0.267949,1 -1,0.267949 -0.267949,-1 1,-0.267949");
        expect([shape.b, shape.c]).toEqual(["rectangle", "rectangle"]);
    });
});

describe("DOT styles: edges", () => {
    it("fills an edge's arrowheads with its fillcolor", async () => {
        const doc = `digraph { a -> b [fillcolor="#ffd700", dir=both]; b -> c }`;
        expect(await edges(doc, "targetArrowColor")).toEqual(["#ffd700", null]);
        expect(await edges(doc, "sourceArrowColor")).toEqual(["#ffd700", null]);
    });

    it("keeps an open box and an open inverted triangle hollow, invempty among them", async () => {
        const doc = `digraph { a -> b [arrowhead=obox]; b -> c [arrowhead=invempty]; c -> d [arrowhead=olbox]; d -> e [arrowhead=oinv] }`;
        expect(await edges(doc, "targetArrow")).toEqual([
            "other:open-square",
            "other:open-inverted",
            "other:open-square",
            "other:open-inverted",
        ]);
        expect((await edges(doc, "targetArrowSide"))[2]).toBe("left");
    });

    it("keeps every shape of a stacked arrowhead, each with its own open and side, nearest the node first", async () => {
        const doc = `digraph { a -> b [arrowhead=boxdotnormal]; b -> c [arrowhead=lteeoldiamond]; c -> d [arrowhead=normal]; d -> e [dir=both, arrowtail=invodot] }`;
        expect(await edges(doc, "targetArrow")).toEqual(["square", "tee", "triangle", "triangle"]);
        expect(await edges(doc, "targetArrowParts")).toEqual(["circle triangle", "diamond-open:left", null, null]);
        expect((await edges(doc, "targetArrowSide"))[1]).toBe("left");
        expect((await edges(doc, "sourceArrowParts"))[3]).toBe("circle-open");
    });

    it("draws a color list with fractions as segments along the line, each a band with a hard switch", async () => {
        const doc = `digraph { a -> b [color="red;0.2:green;0.3:blue"]; b -> c [color="red:blue"] }`;
        expect(await edges(doc, "gradientColors")).toEqual(["#ff0000 #ff0000 #008000 #008000 #0000ff #0000ff", null]);
        expect((await edges(doc, "gradientStops"))[0]).toBe("0 0.2 0.2 0.5 0.5 1");
        expect((await edges(doc, "gradientKind"))[0]).toBe("linear");
    });
});

describe("DOT styles: writing what these read", () => {
    it("writes the arrow fill, the open box and an & in a label so they read back the same", async () => {
        const { snapshot, styles } = await load(
            `digraph { a [label="x &amp; y"]; a -> b [fillcolor=gold, arrowhead=obox] }`,
        );
        const text = await registry.exportGraphToString(snapshot, "dot", { styles });
        const plainText = text.replace(/"graphty\.styles"="(?:[^"\\]|\\.)*",?\s*/, "");
        const back = await load(plainText);
        expect(resolveStyles(back.styles, "edge", "targetArrowColor", back.snapshot)).toEqual(["#ffd700"]);
        expect(resolveStyles(back.styles, "edge", "targetArrow", back.snapshot)).toEqual(["other:open-square"]);
        expect(resolveStyles(back.styles, "node", "label", back.snapshot)[0]).toBe("x & y");
    });
});
