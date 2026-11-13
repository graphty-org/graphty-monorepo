/**
 * A load whose bind fails keeps its error for the next step() even when a stage setter (setClusters, setCollision,
 * setDrawn) chains its own bind after it (issue #7203): the setters used to swallow the load bind's rejection, so
 * step() threw a misleading E_NOT_LOADED (or ran on stale bind groups) instead of the real code.
 *
 * run-twice exempt: it asserts which error step() rejects with, not a kernel's numbers.
 */

import { type GpuContext } from "../../src/context.js";
import { hasErrorCode, WebGpuGraphError } from "../../src/errors.js";
import { ForceSimulation } from "../../src/layouts/force-simulation.js";
import { createForceAtlas2 } from "../../src/layouts/forceatlas2.js";
import { type ForceAtlas2Stats } from "../../src/types/layout.js";
import { type ForceAtlas2Options } from "../../src/types/options.js";
import { KARATE_EDGES, snapshotOf } from "../helpers/graphs.js";
import { acquire, requireGpu } from "../setup/gpu.js";

const SETTERS: readonly [string, (sim: ForceSimulation<ForceAtlas2Options, ForceAtlas2Stats>, n: number) => void][] = [
    ["setClusters", (sim, n) => sim.setClusters({ communities: new Uint32Array(n) })],
    ["setCollision", (sim, n) => sim.setCollision({ radii: new Float32Array(n).fill(1) })],
    ["setDrawn", (sim, n) => sim.setDrawn({ slots: 2, rows: new Float32Array(4 * n) })],
];

describe("a failed load bind reaches step() through a stage setter (issue #7203)", () => {
    for (const [name, set] of SETTERS) {
        it(`${name} after a failed bind: step() rejects with the bind's own code`, async (t) => {
            requireGpu(t);
            const ctx: GpuContext = await acquire({ label: `failed-bind/${name}` });
            const snapshot = snapshotOf(KARATE_EDGES);
            const sim = createForceAtlas2(ctx) as ForceSimulation<ForceAtlas2Options, ForceAtlas2Stats>;
            assert.ok(sim instanceof ForceSimulation, "the factory returns a ForceSimulation");
            const warm = vi
                .spyOn(ctx.pipelines, "warm")
                .mockRejectedValueOnce(new WebGpuGraphError("E_SHADER_COMPILE", "injected compile failure"));
            try {
                sim.load(snapshot, new Float32Array(3 * snapshot.nodeCount));
                set(sim, snapshot.nodeCount);
                const error: unknown = await sim.step(1).then(
                    () => null,
                    (err: unknown) => err,
                );
                assert.ok(hasErrorCode(error, "E_SHADER_COMPILE"), `step() rejected with ${String(error)}`);
            } finally {
                warm.mockRestore();
                sim.dispose();
                ctx.release(snapshot);
                ctx.dispose();
            }
        });
    }
});
