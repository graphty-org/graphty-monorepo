/**
 * @file What a graph's data hands a Graphviz layout besides node sizes: the edge attributes that
 * move dot's nodes, each cluster's label and font, and the file's rank subgraphs, by row.
 */

import { assert, describe, it } from "vitest";

import { graphvizStructure } from "../../src/layout/graphviz/structure";

describe("the structure a Graphviz layout reads from the graph's data", () => {
    const rows = new Map<string | number, number>([
        ["a", 0],
        ["b", 1],
        ["c", 2],
        ["g", 3],
    ]);
    const rowOf = (id: string | number): number => rows.get(id) ?? -1;

    it("hands over each edge's weight, minlen, constraint and label, in the order the edges arrived", () => {
        const structure = graphvizStructure(
            rowOf,
            [
                {
                    srcId: "b",
                    dstId: "c",
                    data: {
                        weight: 5,
                        minlen: 2,
                        constraint: false,
                        label: "<b>bold</b> words",
                        fontsize: 9,
                        color: "red",
                    },
                },
                { srcId: "a", dstId: "b", data: { label: "plain <not html", xlabel: "x", weight: "" } },
                { srcId: "a", dstId: "missing", data: {} },
            ],
            new Map(),
            [],
        );

        assert.deepEqual(structure.edges, [
            {
                src: 1,
                dst: 2,
                attributes: {
                    weight: "5",
                    minlen: "2",
                    constraint: "false",
                    label: "<b>bold</b> words",
                    fontsize: "9",
                },
            },
            // an external label is handed over too, for Graphviz to place (issue #5273)
            { src: 0, dst: 1, attributes: { label: "plain <not html", xlabel: "x" } },
        ]);
    });

    it("hands over an HTML-like label as HTML, whose table takes room its words alone do not (issue #5253)", () => {
        const structure = graphvizStructure(
            rowOf,
            [{ srcId: "a", dstId: "b", data: { label: "<<b>bold</b> words>" } }],
            new Map(),
            [],
        );

        assert.strictEqual(structure.edges?.[0].attributes?.label, "<<b>bold</b> words>");
    });

    it("hands over each group's label, font and margin, and each rank subgraph's rows", () => {
        const structure = graphvizStructure(
            rowOf,
            [],
            new Map([[3, { label: "src", fontsize: 9, fontname: "Helvetica", margin: 4, fillcolor: "red" }]]),
            [{ rank: "same", members: ["a", "c", "missing"] }],
        );

        assert.deepEqual(structure.groupAttributes?.get(3), {
            label: "src",
            fontsize: "9",
            fontname: "Helvetica",
            margin: "4",
        });
        assert.deepEqual(structure.ranks, [{ rank: "same", rows: [0, 2] }]);
    });

    it("names the cluster an lhead or ltail clips the edge at as the cluster its group is handed over as (issue #5253)", () => {
        const structure = graphvizStructure(
            rowOf,
            [
                { srcId: "a", dstId: "b", data: { lhead: "g", ltail: "missing" } },
                { srcId: "b", dstId: "c", data: { ltail: "g", lhead: "c" } },
            ],
            new Map([[3, {}]]),
            [],
        );

        // a name that is no group handed over is one Graphviz ignores too
        assert.deepEqual(
            structure.edges?.map((edge) => edge.attributes),
            [{ lhead: "cluster_n3" }, { ltail: "cluster_n3" }],
        );
    });
});
