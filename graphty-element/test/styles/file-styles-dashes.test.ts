/**
 * @file A file's dashed and dotted lines, loaded with `styles: "file"`, are drawn in the dash pattern of the program
 * that wrote the file (graph-io's `ToolDefaults.dashes`), as dash and gap lengths in line widths: yEd's dots are a
 * width long with three widths between them and its dashes six widths long with two between, Graphviz's are the same
 * few pixels whatever the line's width.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { assert, describe, it } from "vitest";

import { createGraphSession, type GraphSession } from "../../session";
import { EdgeMesh } from "../../src/meshes/EdgeMesh";
import { fileStylesOn } from "../helpers/file-styles-on";

fileStylesOn();

const CORPUS = join(__dirname, "..", "..", "..", "graph-io", "test", "corpus", "styles");

/**
 * The dash length and gap the styles resolve for the edge between two nodes.
 * @param session - The session.
 * @param source - The edge's source id.
 * @param target - The edge's target id.
 * @returns The two channels' values.
 */
function dashOf(session: GraphSession, source: string, target: string): [unknown, unknown] {
    const edge = session.data.edges().find((e) => String(e.source) === source && String(e.target) === target);
    if (edge === undefined) {
        assert.fail(`no edge ${source}->${target}`);
    }
    const merged = session.styles.explain({ edge: edge.id }).merged as Record<string, unknown>;
    return [merged["edge.dashLength"], merged["edge.dashGap"]];
}

/**
 * Load a file with its styles.
 * @param type - The reader.
 * @param data - The file.
 * @returns The session.
 */
async function load(type: string, data: Uint8Array): Promise<GraphSession> {
    const session = createGraphSession();
    await session.data.import({ type, config: { data } }, { styles: "file" });
    return session;
}

describe("a line's own dash length and gap", () => {
    it("draws a dashed or dotted line with either as one joined line, whose dashes take any length", () => {
        assert.isTrue(EdgeMesh.drawsAsPattern({ line: { type: "dash" } }));
        assert.isFalse(EdgeMesh.drawsAsPattern({ line: { type: "dash", dashLength: 6 } }));
        assert.isFalse(EdgeMesh.drawsAsPattern({ line: { type: "dot", dashGap: 3 } }));
        // a pattern with no dashes keeps its elements
        assert.isTrue(EdgeMesh.drawsAsPattern({ line: { type: "star", dashGap: 3 } }));
    });
});

describe("a file's dash patterns", () => {
    it("draws yEd's dotted lines a width on and three off, whatever the width", async () => {
        const data = new Uint8Array(readFileSync(join(CORPUS, "gml/fidelity/synthetic-coverage.gml")));
        const session = await load("gml", data);
        try {
            // width 3 and width 1, both dotted
            assert.deepEqual(dashOf(session, "4", "15"), [1, 3]);
            assert.deepEqual(dashOf(session, "12", "13"), [1, 3]);
        } finally {
            session.dispose();
        }
    });

    it("draws Graphviz's dashes 5 px on and 2 off and its dots 1 on and 5 off, in widths", async () => {
        const text = "digraph { a -> b [style=dashed, penwidth=2]; c -> d [style=dotted]; e -> f; }";
        const session = await load("dot", new TextEncoder().encode(text));
        try {
            assert.deepEqual(dashOf(session, "a", "b"), [2.5, 1]);
            assert.deepEqual(dashOf(session, "c", "d"), [1, 5]);
            // a solid line has no pattern
            assert.deepEqual(dashOf(session, "e", "f"), [undefined, undefined]);
        } finally {
            session.dispose();
        }
    });
});
