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

    it("hands over an HTML-like label's text, whose words take the room", () => {
        const structure = graphvizStructure(
            rowOf,
            [{ srcId: "a", dstId: "b", data: { label: "<<b>bold</b> words>" } }],
            new Map(),
            [],
        );

        assert.strictEqual(structure.edges?.[0].attributes?.label, "bold words");
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
});
