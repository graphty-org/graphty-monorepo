import { readFileSync } from "node:fs";
import { join } from "node:path";

import { assert, describe, it } from "vitest";

import { ConnectedComponentsAlgorithm } from "../../../src/algorithms/ConnectedComponentsAlgorithm";
import { createGraphSession } from "../../../src/session";
import { createRunResult } from "../../../src/session/results";
import type { RunExecutionContext, RunOutcome } from "../../../src/session/runs";
import { LAYOUT_ENGINE, RUN_ENGINE, withAcceleratorPackage } from "../../../src/session/runs/engine";
import { createFakeAccelerator } from "../../../src/testing/fakeAccelerator";
import { createSessionGraph } from "../../helpers/session-graph";

/** A fake accelerator of a backend and package no real one has, so what is recorded is its own. */
const fakeGpu = (): ReturnType<typeof createFakeAccelerator> =>
    createFakeAccelerator({ members: { backend: "test-gpu", package: { name: "x-accel", version: "9.9.9" } } });

/**
 * A sibling package's version, from its package.json.
 * @param folder - The package's folder in the monorepo.
 * @returns The version.
 */
function versionOf(folder: string): string {
    return (
        JSON.parse(readFileSync(join(__dirname, "../../../..", folder, "package.json"), "utf8")) as {
            version: string;
        }
    ).version;
}

describe("the engine a run and a layout record", () => {
    it("lists the element and the algorithms for a run, at the versions the packages state", () => {
        assert.sameMembers(Object.keys(RUN_ENGINE.packages), ["@graphty/graphty-element", "@graphty/algorithms"]);
        assert.strictEqual(RUN_ENGINE.packages["@graphty/algorithms"], versionOf("algorithms"));
    });

    it("lists the element and the layout for a layout, at the versions the packages state", () => {
        assert.sameMembers(Object.keys(LAYOUT_ENGINE.packages), ["@graphty/graphty-element", "@graphty/layout"]);
        assert.strictEqual(LAYOUT_ENGINE.packages["@graphty/layout"], versionOf("layout"));
    });

    it("adds the attached accelerator's package, and nothing for none", () => {
        const accelerator = { name: "x", backend: "test-gpu", package: { name: "x-accel", version: "9.9.9" } };
        const engine = withAcceleratorPackage(RUN_ENGINE, accelerator);
        assert.deepStrictEqual(engine.packages, { ...RUN_ENGINE.packages, "x-accel": "9.9.9" });
        assert.strictEqual(withAcceleratorPackage(RUN_ENGINE, null), RUN_ENGINE);
    });
});

describe("the hardware a run records", () => {
    const pieces = {
        nodes: [{ id: "A" }, { id: "B" }, { id: "C" }],
        edges: [{ srcId: "A", dstId: "B", weight: 1 }],
    };

    it("is the backend of the accelerator the work reached, and the CPU below the threshold", async () => {
        const graph = await createSessionGraph(pieces);
        const fake = fakeGpu();
        graph.acceleration.setAccelerator(fake);
        graph.acceleration.setMinNodes(0);
        const on = new ConnectedComponentsAlgorithm(graph);
        await on.run();
        assert.strictEqual(fake.calls.connectedComponents, 1);
        assert.strictEqual(on.result?.summary().caveats.accelerator, "test-gpu");

        graph.acceleration.setMinNodes(1000);
        const off = new ConnectedComponentsAlgorithm(graph);
        await off.run();
        assert.strictEqual(fake.calls.connectedComponents, 1, "below the threshold the device is not asked");
        assert.strictEqual(off.result?.summary().caveats.accelerator, "cpu");
    });

    it("puts that backend and the accelerator's package in the run's engine", async () => {
        // What the element's own executor hands back: the result, and its caveats as the run's.
        const execute = (context: RunExecutionContext): Promise<RunOutcome> => {
            const result = createRunResult({
                runId: context.runId,
                shape: "node-metric",
                fields: [],
                measured: { nodes: context.scope.nodeCount, edges: context.scope.edgeCount },
                caveats: {
                    exact: true,
                    direction: "as-loaded",
                    precision: "f32",
                    method: "connectedComponents",
                    accelerator: "test-gpu",
                    facts: [],
                    notes: [],
                },
                durationMs: 1,
            });
            return Promise.resolve({ result, caveats: result.summary().caveats });
        };
        const session = createGraphSession({ runs: { execute } });
        session.setAccelerator(fakeGpu());
        await session.data.addNodes([{ id: "a" }, { id: "b" }]);
        await session.runs.start("components", undefined, { as: "parts", style: false });
        const record = session.runs.get("parts")?.record;
        assert.strictEqual(record?.engine.accelerator, "test-gpu");
        assert.strictEqual(record?.engine.packages["x-accel"], "9.9.9");
        assert.strictEqual(record?.engine.packages["@graphty/algorithms"], versionOf("algorithms"));
        session.dispose();
    });
});
