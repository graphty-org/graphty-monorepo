/**
 * Every default of a program that is a rule over the graph (`ToolDefaults.derived`: a label from the id,
 * an arrow on a directed edge, an edge's width from its weight, its color from its end nodes) is stated by every
 * reader that names the program as the file's writer. Each case is a small file the program's reader recognizes;
 * a program default with no case here fails, so a new one cannot go unchecked.
 */
import { describe, expect, it } from "vitest";

import { importGraph } from "../../src/registry.js";
import type { GraphFormatName } from "../../src/sniff.js";
import { TOOL_DEFAULTS, type ToolDerivedDefault } from "../../src/styles/defaults.js";
import { resolveStyles } from "../../src/styles/internal.js";

/** A file one reader reads as the program's, and what the reader states for each derived default on it. */
interface Case {
    readonly reader: string;
    readonly format: GraphFormatName;
    readonly text: string;
    /** Per derived kind: the target, the property, and its value on the first element. */
    readonly expect: Partial<
        Record<ToolDerivedDefault["kind"], readonly [target: "node" | "edge", property: string, value: unknown]>
    >;
}

const GEXF = (body: string): string =>
    '<?xml version="1.0" encoding="UTF-8"?><gexf xmlns="http://gexf.net/1.3" xmlns:viz="http://gexf.net/1.3/viz" version="1.3">' +
    `<graph defaultedgetype="directed">${body}</graph></gexf>`;

const CASES: Readonly<Record<string, readonly Case[]>> = {
    graphviz: [
        {
            reader: "dot",
            format: "dot",
            text: "digraph { a -> b }",
            expect: { labelFromId: ["node", "label", "a"], targetArrowOnDirected: ["edge", "targetArrow", "triangle"] },
        },
        {
            reader: "gml (Graphviz gv2gml)",
            format: "gml",
            text: 'graph [ version 2 directed 1\nnode [ id 0 name "a" ]\nnode [ id 1 name "b" ]\nedge [ source 0 target 1 ] ]\n',
            expect: { labelFromId: ["node", "label", "a"], targetArrowOnDirected: ["edge", "targetArrow", "triangle"] },
        },
    ],
    gephi: [
        {
            reader: "gexf",
            format: "gexf",
            text: GEXF(
                '<nodes><node id="a"><viz:color r="255" g="0" b="0"/></node><node id="b"><viz:color r="0" g="0" b="255"/></node></nodes>' +
                    '<edges><edge id="e" source="a" target="b" weight="3"/></edges>',
            ),
            expect: {
                colorFromEndNodes: ["edge", "color", "#7f007f"],
                widthFromWeight: ["edge", "width", 3],
                targetArrowOnDirected: ["edge", "targetArrow", "triangle"],
            },
        },
        {
            reader: "graphml (Gephi)",
            format: "graphml",
            text:
                '<?xml version="1.0" encoding="UTF-8"?><graphml xmlns="http://graphml.graphdrawing.org/xmlns">' +
                '<key id="r" for="node" attr.name="r" attr.type="int"/><key id="g" for="node" attr.name="g" attr.type="int"/>' +
                '<key id="b" for="node" attr.name="b" attr.type="int"/><key id="weight" for="edge" attr.name="weight" attr.type="double"/>' +
                '<graph edgedefault="directed"><node id="a"><data key="r">255</data><data key="g">0</data><data key="b">0</data></node>' +
                '<node id="b"><data key="r">0</data><data key="g">0</data><data key="b">255</data></node>' +
                '<edge source="a" target="b"><data key="weight">3</data></edge></graph></graphml>',
            expect: {
                colorFromEndNodes: ["edge", "color", "#7f007f"],
                widthFromWeight: ["edge", "width", 3],
                targetArrowOnDirected: ["edge", "targetArrow", "triangle"],
            },
        },
        {
            reader: "gml (Gephi)",
            format: "gml",
            text:
                'Creator "Gephi"\ngraph [ directed 1\n' +
                'node [ id 1 label "a" graphics [ fill "#FF0000" ] ]\nnode [ id 2 label "b" graphics [ fill "#0000FF" ] ]\n' +
                "edge [ source 1 target 2 value 3 ] ]\n",
            expect: {
                colorFromEndNodes: ["edge", "color", "#7f007f"],
                widthFromWeight: ["edge", "width", 3],
                targetArrowOnDirected: ["edge", "targetArrow", "triangle"],
            },
        },
    ],
    "vis-network": [
        {
            reader: "json (vis-network)",
            format: "json",
            text: JSON.stringify({
                nodes: [
                    { id: 1, label: "One", color: "#ff0000" },
                    { id: 2, label: "Two", color: "#0000ff" },
                ],
                edges: [{ from: 1, to: 2 }],
            }),
            // vis-network inherits the source node's border color, which it derives darker from the fill
            expect: { colorFromSourceNode: ["edge", "color", "#cc0000"] },
        },
    ],
    pajek: [
        {
            reader: "pajek",
            format: "pajek",
            text: '*Vertices 2\n1 "One"\n2 "Two"\n*Arcs\n1 2\n',
            expect: { targetArrowOnDirected: ["edge", "targetArrow", "triangle"] },
        },
    ],
    networkx: [
        {
            reader: "json (networkx node-link)",
            format: "json",
            text: JSON.stringify({
                directed: true,
                multigraph: false,
                graph: {},
                nodes: [{ id: "a" }, { id: "b" }],
                links: [{ source: "a", target: "b" }],
            }),
            expect: { targetArrowOnDirected: ["edge", "targetArrow", "triangle"] },
        },
    ],
};

describe("every rule-default of a program is stated by its readers", () => {
    for (const [tool, defaults] of TOOL_DEFAULTS) {
        // a label from a column is the planner's for every program (plan.ts derivedRules), not a reader's
        const derived = defaults.derived.filter((d) => d.kind !== "labelFromColumn");
        if (derived.length === 0) {
            continue;
        }
        it(`${tool}: every derived default has a case`, () => {
            for (const c of CASES[tool] ?? [{ expect: {} }]) {
                expect(Object.keys(c.expect).sort(), tool).toEqual(derived.map((d) => d.kind).sort());
            }
        });
        for (const c of CASES[tool] ?? []) {
            it(`${tool}: the ${c.reader} reader states ${Object.keys(c.expect).join(", ")}`, async () => {
                const { snapshot, styles } = await importGraph(c.text, { format: c.format, styles: true });
                expect(styles?.styles.source.tool).toBe(tool);
                if (styles === null || styles === undefined) {
                    return;
                }
                for (const [kind, [target, property, value]] of Object.entries(c.expect)) {
                    expect(resolveStyles(styles, target, property as never, snapshot)[0], kind).toEqual(value);
                }
            });
        }
    }
});

describe("Graphviz's GML (gv2gml) node label", () => {
    // a Graphviz layout (neato -n2 -Tdot) writes every node's label, its \N default included, so gv2gml writes a
    // laid-out node's `label` unless the label is empty: Graphviz then draws none (#5572)
    it("labels a laid-out node gv2gml wrote with no label key with nothing, and one with a label by its label", async () => {
        const text =
            'graph [ version 2 directed 1 bb "0,0,100,100" layout "neato"\n' +
            'node [ id 0 name "0" graphics [ x 10 y 10 w 12 H 12 type "ellipse" ] ]\n' +
            'node [ id 1 name "1" label "1" graphics [ x 50 y 50 w 12 H 12 type "ellipse" ] ] ]\n';
        const { snapshot, styles } = await importGraph(text, { format: "gml", styles: true });
        if (styles === null || styles === undefined) {
            throw new Error("no styles");
        }
        expect(styles.styles.source.tool).toBe("graphviz");
        const label = resolveStyles(styles, "node", "label", snapshot);
        expect(label[0] ?? null).toBeNull();
        expect(label[1]).toBe("1");
    });
});
