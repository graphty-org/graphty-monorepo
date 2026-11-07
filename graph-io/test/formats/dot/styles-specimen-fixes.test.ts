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
    it("draws nothing of an invis node but keeps it, as Graphviz still draws the edges that end at it", async () => {
        // dot-real-linux-kernel's HI -> HI_ ends at a `shape=point, style=invis` node, and dot-synth-nodes'
        // n_lingrad2 -> n_invis at the invisible ellipse's rim: both edges are in Graphviz's SVG, the nodes are not
        const doc = `digraph { a [style=invis, label="a"]; b [style="filled,invisible", shape=point]; c -> a; c -> b }`;
        for (const id of ["a", "b"]) {
            expect((await nodes(doc, "visible"))[id] ?? true).toBe(true);
            expect((await nodes(doc, "fillOpacity"))[id]).toBe(0);
            expect((await nodes(doc, "borderWidth"))[id]).toBe(0);
            expect((await nodes(doc, "label"))[id]).toBe("");
        }
        // its shape and size stay, so an edge stops at its rim as Graphviz's does
        expect((await nodes(doc, "shape")).a).toBe("ellipse");
        expect((await nodes(doc, "width")).a).toBe(54);
        expect(await edges(doc, "visible")).toEqual([null, null]);
    });

    it("hides an edge styled invis", async () => {
        expect(await edges(`digraph { a -> b [style=invis] }`, "visible")).toEqual([false]);
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

    it("draws every further outline as a ring of its own: peripheries=3 and tripleoctagon draw two", async () => {
        const doc = `digraph {
            a [shape=box, peripheries=3];
            b [shape=tripleoctagon];
            c [shape=doublecircle, peripheries=4];
            d [shape=doublecircle];
        }`;
        const count = await nodes(doc, "outerBorderCount");
        expect([count.a, count.b, count.c]).toEqual([2, 2, 3]);
        expect(count.d ?? 1).toBe(1);
    });

    it("draws a striped cluster's color list as stripes left to right, as on a box", async () => {
        const doc = `digraph { subgraph cluster_s { style=striped; fillcolor="red:green:blue"; a } }`;
        expect((await nodes(doc, "stripeColors")).cluster_s).toBe("#ff0000 #008000 #0000ff");
        expect((await nodes(doc, "stripeDirection")).cluster_s).toBe("right");
    });

    it("holds a cylinder's label as a box does, its width exactly the padded label", async () => {
        const fit = await nodes(
            `digraph { c [shape=cylinder, label="cylinder"]; h [shape=house, label="house"] }`,
            "labelFit",
        );
        expect([fit.c, fit.h]).toEqual(["bounds", "inside"]);
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

    it("reads at most four shapes of an arrow name, a none among them, as Graphviz does", async () => {
        const doc = `digraph { a -> b [arrowhead=normalnormalnormalnormalnormal]; b -> c [arrowhead=boxboxboxboxbox]; c -> d [arrowhead=nonenormalnormalnormalnormal]; d -> e [arrowhead="${"dot".repeat(20000)}"] }`;
        expect(await edges(doc, "targetArrowParts")).toEqual([
            "triangle triangle triangle",
            "square square square",
            "triangle triangle",
            "circle circle circle",
        ]);
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

describe("DOT styles: an arrow's whole name written back (#5925, #5947)", () => {
    const NAMES = [
        "crowodot",
        "dotodot",
        "boxdotnormal",
        "lteeoldiamond",
        "normalnormal",
        "dotcurve",
        "doticurve",
        "crowobox",
        "normaloinv",
        "boxboxboxbox",
    ];

    /**
     * Each edge's written arrow attribute.
     * @param doc - the document
     * @param attribute - `arrowhead` or `arrowtail`
     * @returns the names, and the text without its style block
     */
    async function written(doc: string, attribute: string): Promise<{ names: string[]; text: string }> {
        const { snapshot, styles } = await load(doc);
        const text = await registry.exportGraphToString(snapshot, "dot", { styles });
        const names = [...text.matchAll(new RegExp(`\\b${attribute}="?([\\w-]+)`, "g"))].map((m) => m[1]);
        return { names, text: text.replace(/"graphty\.styles"="(?:[^"\\]|\\.)*",?\s*/, "") };
    }

    it("writes each compound arrowhead's whole name, which reads back as the same arrow", async () => {
        const doc = `digraph { ${NAMES.map((name, i) => `n${String(i)} -> n${String(i + 1)} [arrowhead=${name}];`).join(" ")} }`;
        const { names, text } = await written(doc, "arrowhead");
        expect(names).toEqual(NAMES);
        const back = await load(text);
        const before = await load(doc);
        for (const property of ["targetArrow", "targetArrowParts"] as const) {
            expect(resolveStyles(back.styles, "edge", property, back.snapshot)).toEqual(
                resolveStyles(before.styles, "edge", property, before.snapshot),
            );
        }
    });

    it("writes a compound arrowtail's whole name", async () => {
        const { names } = await written(`digraph { a -> b [dir=both, arrowtail=lteeoldiamond] }`, "arrowtail");
        expect(names).toEqual(["lteeoldiamond"]);
    });

    it("writes a lone arrow's name, with no side as it always did", async () => {
        const { names } = await written(
            `digraph { a -> b [arrowhead=crow]; b -> c [arrowhead=odot]; c -> d [arrowhead=curve]; d -> e [arrowhead=normal] }`,
            "arrowhead",
        );
        expect(names).toEqual(["crow", "odot", "curve"]);
    });

    it("writes a lone arrow's side and open form, which read back as the same arrow without the style block", async () => {
        const LONE = [
            ...["lbox", "rbox", "olbox", "orbox", "lnormal", "rnormal", "olnormal", "ornormal", "ldot", "rdot"],
            ...["oldot", "ordot", "lcrow", "rcrow", "lvee", "rvee", "ltee", "rtee", "ldiamond", "rdiamond"],
            ...["oldiamond", "ordiamond", "linv", "rinv", "olinv", "orinv", "lcurve", "rcurve", "licurve", "ricurve"],
            "icurve",
        ];
        const doc = `digraph { ${LONE.map((name, i) => `n${String(i)} -> n${String(i + 1)} [arrowhead=${name}];`).join(" ")} }`;
        const { names, text } = await written(doc, "arrowhead");
        expect(names).toEqual(LONE);
        const back = await load(text);
        const before = await load(doc);
        for (const property of ["targetArrow", "targetArrowSide"] as const) {
            expect(resolveStyles(back.styles, "edge", property, back.snapshot)).toEqual(
                resolveStyles(before.styles, "edge", property, before.snapshot),
            );
        }
    });

    it("writes a lone arrowtail's side", async () => {
        const { names } = await written(`digraph { a -> b [dir=both, arrowtail=lbox] }`, "arrowtail");
        expect(names).toEqual(["lbox"]);
    });

    /**
     * A file's edge with its target arrow set by a rule.
     * @param value - the neutral arrow
     * @returns what is written, and the properties noted as approximated
     */
    async function withArrow(value: string): Promise<{ name: string | undefined; noted: unknown[] }> {
        const { snapshot, styles } = await load(`digraph { a -> b [arrowhead=crow] }`);
        const rule = {
            id: "arrow",
            target: "edge",
            role: "group",
            origin: "declared",
            where: { all: true },
            set: { targetArrow: value },
        } as const;
        const withRule = { ...styles, styles: { ...styles.styles, rules: [...styles.styles.rules, rule] } };
        const text = await registry.exportGraphToString(snapshot, "dot", { styles: withRule });
        return {
            name: /arrowhead="?([\w-]+)/.exec(text)?.[1],
            noted: registry
                .checkExport(snapshot, "dot", { styles: withRule })
                .filter((l) => l.code === "W_STYLE_APPROXIMATED" && l.style?.property === "targetArrow"),
        };
    }

    it("writes a lone other: arrow Graphviz has a name for by that name", async () => {
        for (const [value, name] of [
            ["other:inv-curve", "icurve"],
            ["other:open-half-circle", "icurve"],
            ["other:curve", "curve"],
        ]) {
            expect((await withArrow(value)).name).toBe(name);
        }
    });

    it("writes a lone other: arrow Graphviz has no name for as its plain arrow, with an approximation note", async () => {
        for (const value of ["other:kite", "other:cross", "other:deltoid", "other:skewed-dash"]) {
            const { name, noted } = await withArrow(value);
            expect(name).toBe("normal");
            expect(noted).toHaveLength(1);
        }
    });

    it("keeps a lone other: name Graphviz reads as it was written", async () => {
        const NAMES = ["empty", "ediamond", "open", "halfopen", "invempty", "lteeoldiamond", "lempty", "oempty"];
        for (const name of NAMES) {
            expect((await withArrow(`other:${name}`)).name).toBe(name);
        }
    });

    it("keeps a name of Graphviz's deprecated modifiers a file holds", async () => {
        const NAMES = ["ebox", "halfbox", "lempty", "oempty", "emptydot"];
        const doc = `digraph { ${NAMES.map((name, i) => `n${String(i)} -> n${String(i + 1)} [arrowhead=${name}];`).join(" ")} }`;
        expect((await written(doc, "arrowhead")).names).toEqual(NAMES);
    });

    it("leaves out of the name a shape Graphviz has no name for, and any past the fourth", async () => {
        const { snapshot, styles } = await load(`digraph { a -> b [arrowhead=crow] }`);
        const rule = (parts: string): ExtractedStyles => ({
            ...styles,
            styles: {
                ...styles.styles,
                rules: [
                    ...styles.styles.rules,
                    {
                        id: "parts",
                        target: "edge",
                        role: "group",
                        origin: "declared",
                        where: { all: true },
                        set: { targetArrowParts: parts },
                    },
                ],
            },
        });
        const nameOf = async (parts: string): Promise<string | undefined> =>
            /arrowhead=(\w+)/.exec(await registry.exportGraphToString(snapshot, "dot", { styles: rule(parts) }))?.[1];
        expect(await nameOf("other:kite half circle")).toBe("crowdot");
        expect(await nameOf("circle circle circle circle")).toBe("crowdotdotdot");
    });
});
