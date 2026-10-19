/**
 * A model bind() that a newer bind() superseded while its pipelines compiled creates no bind group (issue #96): the
 * K2 (`fa2-attraction`) kernel caches its bind groups per buffer set, so a group created before the superseded
 * check would hold the old load's buffers until the next rebind. Every force model is driven the same way: two
 * loads of one node count capture two ModelResources, then the model binds the first and, without awaiting it, the
 * second.
 *
 * run-twice exempt: it asserts which buffers get bound, not a kernel's numbers.
 */

import { type GraphSnapshot } from "@graphty/graph-format";

import { type GpuContext } from "../../src/context.js";
import { Kernel, type KernelBindings } from "../../src/kernel/kernel.js";
import { ForceSimulation, type ModelResources } from "../../src/layouts/force-simulation.js";
import { createForceAtlas2 } from "../../src/layouts/forceatlas2.js";
import { createFruchtermanReingold } from "../../src/layouts/fruchterman-reingold.js";
import { createSpringElectrical } from "../../src/layouts/spring-electrical.js";
import { KARATE_EDGES, snapshotOf } from "../helpers/graphs.js";
import { acquire, requireGpu } from "../setup/gpu.js";

/** A ring over karate's node count, so both loads share every shared-buffer size and only the graph differs. */
function ring(n: number): GraphSnapshot {
    return snapshotOf(Array.from({ length: n }, (_, i): [number, number] => [i, (i + 1) % n]));
}

const MODELS = [
    ["ForceAtlas2", createForceAtlas2],
    ["Fruchterman-Reingold", createFruchtermanReingold],
    ["spring-electrical", createSpringElectrical],
] as const;

describe("a superseded model bind (issue #96)", () => {
    for (const [name, create] of MODELS) {
        it(`${name}: no fa2-attraction bind group is created over the superseded load's graph`, async (t) => {
            requireGpu(t);
            const ctx: GpuContext = await acquire({ label: `superseded-bind/${name}` });
            const first = snapshotOf(KARATE_EDGES);
            const second = ring(first.nodeCount);
            const sim = create(ctx);
            try {
                if (!(sim instanceof ForceSimulation)) {
                    throw new Error(`${name}: the factory did not return a ForceSimulation`);
                }
                const { model } = sim;
                const binds: [ModelResources, Readonly<Record<string, number | boolean>>][] = [];
                const original = model.bind.bind(model);
                vi.spyOn(model, "bind").mockImplementation((resources, overrides) => {
                    binds.push([resources, overrides]);
                    return original(resources, overrides);
                });
                const positions = new Float32Array(3 * first.nodeCount);
                sim.load(first, positions);
                await sim.step(1);
                sim.load(second, positions);
                await sim.step(1);
                expect(binds.length).toBe(2);
                const [[resA, overridesA], [resB, overridesB]] = binds;
                const colIdxA = resA.core.colIdx?.buffer;
                expect(colIdxA).toBeDefined();
                expect(resB.core.colIdx?.buffer).not.toBe(colIdxA);

                const attractionGroups: KernelBindings[] = [];
                const kernelBind = Kernel.prototype.bind;
                const spy = vi.spyOn(Kernel.prototype, "bind").mockImplementation(function (
                    this: Kernel,
                    resources: KernelBindings,
                ) {
                    if (this.spec.id === "fa2-attraction") {
                        attractionGroups.push(resources);
                    }
                    return kernelBind.call(this, resources);
                });
                try {
                    const superseded = original(resA, overridesA);
                    const current = original(resB, overridesB);
                    await Promise.all([superseded, current]);
                } finally {
                    spy.mockRestore();
                }
                expect(attractionGroups.length).toBeGreaterThan(0);
                for (const group of attractionGroups) {
                    expect(group.colIdx?.buffer, "a bind group over the superseded load's colIdx").not.toBe(colIdxA);
                }
                // the model is bound to the second load and still runs
                await sim.step(1);
            } finally {
                sim.dispose();
                ctx.release(first);
                ctx.release(second);
                ctx.dispose();
            }
        });
    }
});
