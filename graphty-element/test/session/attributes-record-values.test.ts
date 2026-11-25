/**
 * A column whose values are records with no prototype (a GML file's `graphics` block, as graph-io reads it) is
 * described like any other: describing it once threw "Cannot convert object to primitive value" and crashed every
 * panel that lists columns, for any GML file that draws its nodes (OGDF's ERDiagram.gml).
 */

import { assert, describe, it } from "vitest";

import { makeSession } from "./helpers";

describe("a column of prototype-less records", () => {
    it("is described as a mixed column that holds no node ids", async () => {
        const { session } = makeSession();
        const graphics = (fill: string): Record<string, unknown> =>
            Object.assign(Object.create(null) as Record<string, unknown>, { fill, w: 10 });
        await session.data.addNodes([
            { id: "a", graphics: graphics("#ffd700") },
            { id: "b", graphics: graphics("#b0c4de") },
        ]);
        const column = session.data.columns().find((each) => each.kind === "node" && each.name === "graphics");
        assert.isDefined(column);
        assert.equal(column?.type, "mixed");
        assert.isUndefined(column?.holdsNodeIds);
    });
});
