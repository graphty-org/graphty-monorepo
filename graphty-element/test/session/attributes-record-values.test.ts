/**
 * A column whose values are records with no prototype (a GML file's `graphics` block, as graph-io reads it and a
 * load through `data.prepare` keeps it) is described like any other: describing it once threw "Cannot convert object
 * to primitive value" and crashed every panel that lists columns, for a GML file that draws its nodes (OGDF's
 * ERDiagram.gml, opened from the graphty app's start page).
 */

import { assert, describe, it } from "vitest";

import { makeSession } from "./helpers";

describe("a column of prototype-less records", () => {
    it("is described as a mixed column that holds no node ids", async () => {
        const { session } = makeSession();
        // graph-io reads a GML record into an object with no prototype
        const draft = await session.data.prepare(
            {
                type: "gml",
                config: {
                    data: [
                        'Creator "ogdf::GraphAttributes::writeGML"',
                        "graph [",
                        '  node [ id 0 label "a" graphics [ w 10 h 10 fill "#ffd700" ] ]',
                        '  node [ id 1 label "b" graphics [ w 10 h 10 fill "#b0c4de" ] ]',
                        "  edge [ source 0 target 1 ]",
                        "]",
                    ].join("\n"),
                },
            },
            { guess: "values" },
        );
        await draft.load({});
        // the time panel's candidates read every column too
        assert.isArray(session.time.candidates());
        const column = session.data.attributes().find((each) => each.kind === "node" && each.name === "graphics");
        assert.isDefined(column);
        assert.equal(column?.type, "mixed");
        assert.isUndefined(column?.holdsNodeIds);
    });
});
