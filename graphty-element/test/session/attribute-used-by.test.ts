/**
 * @file `AttributeDescriptor.usedBy`: which layers and runs read a column (issue #923).
 */

import { assert, describe, it } from "vitest";

import type { RunExecutionContext, RunOutcome } from "../../src/session/runs/Run";
import { makeSession } from "./helpers";
import { stubResult } from "./runs/harness";

/**
 * An executor that finishes at once and says it weighed the edges by `trips`.
 * @param context - the run
 * @returns the outcome
 */
function weighsByTrips(context: RunExecutionContext): Promise<RunOutcome> {
    return Promise.resolve({
        result: stubResult(context.runId),
        caveats: { weight: { attribute: "trips", meaning: "strength" } },
    });
}

describe("AttributeDescriptor.usedBy", () => {
    it("names the layers that read a column and the runs that weighed edges by it", async () => {
        const { session } = makeSession({ runs: { execute: weighsByTrips } });
        await session.data.addNodes([
            { id: "a", team: "red", age: 30, note: "x" },
            { id: "b", team: "blue", age: 40, note: "y" },
        ]);
        await session.data.addEdges([{ source: "a", target: "b", trips: 3 }]);
        const usedBy = (kind: "node" | "edge", name: string): unknown =>
            session.data.attributes().find((each) => each.kind === kind && each.name === name)?.usedBy;

        assert.isUndefined(usedBy("node", "team"));
        const layer = await session.styles.add({
            name: "Red team",
            target: "node",
            selector: { match: "expression", where: 'data.team == `"red"`' },
            set: { "node.color": "#ff0000" },
        });
        assert.deepStrictEqual(usedBy("node", "team"), [{ kind: "layer", id: layer.id }]);
        assert.isUndefined(usedBy("node", "note"), "a column nothing reads is not in use");
        assert.isUndefined(usedBy("edge", "team"), "a node layer does not read an edge column");

        const run = session.runs.start("pagerank");
        await run;
        assert.deepStrictEqual(usedBy("edge", "trips"), [{ kind: "run", id: run.id }]);

        await session.styles.remove(layer.id);
        assert.isUndefined(usedBy("node", "team"));
        session.dispose();
    });
});
