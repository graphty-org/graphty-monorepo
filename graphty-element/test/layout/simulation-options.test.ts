/**
 * What a reader sets on a force layout, and what the simulation behind it is actually handed.
 *
 * The three force layouts -- ForceAtlas2, Spring and Spring Electrical -- publish the options a
 * picker renders and a reader fills in, and `@graphty/layout`'s simulations take options of their
 * own. Three names differ, and each difference is a name the element published years before the
 * simulation seam existed: ForceAtlas2's `scalingFactor` is the simulation's `scale`, its
 * `weighted` boolean is the simulation's `weight`, and `nodeSize` is offered by neither although
 * one of the two used to accept it. This file is where those three are pinned, because a mapping
 * that quietly drops a key looks exactly like a control that does nothing.
 *
 * Nothing here builds a graph or a renderer: the mapping is a pure function of the options, the
 * behaviour configuration and -- for the iteration rule -- a node count.
 */
import { GraphBuilder } from "@graphty/graph-format";
import type { ForceAtlas2Options, FruchtermanReingoldOptions, SpringElectricalOptions } from "@graphty/layout";
import { assert, describe, it } from "vitest";

import { ForceAtlas2Layout } from "../../src/layout/ForceAtlas2LayoutEngine";
import { iterationsPerStepFor, resolveNodeMass } from "../../src/layout/SimulationLayoutEngine";
import { resolveSimulationOptions } from "../../src/managers/LayoutManager";

/** `behavior.layout` as the element resolves it, with everything at its default. */
const BEHAVIOR = {
    type: "ngraph",
    preSteps: 0,
    stepMultiplier: 1,
    minDelta: 0,
    zoomStepInterval: 1,
    maxInFlight: 2,
} as const;

/**
 * The ForceAtlas2 options a simulation would be built with.
 * @param options - What the reader set.
 * @param behavior - `behavior.layout`, defaulted.
 * @returns The mapped options.
 */
function forceAtlas2(
    options: Record<string, unknown> = {},
    behavior: Record<string, unknown> = {},
): ForceAtlas2Options {
    const resolved = resolveSimulationOptions("forceatlas2", options, { ...BEHAVIOR, ...behavior });
    return resolved.model as ForceAtlas2Options;
}

describe("the force layouts' option mapping", () => {
    it("turns ForceAtlas2's scalingFactor into the simulation's scale", () => {
        // The one-shot engine multiplied every published coordinate by `scalingFactor`; the
        // simulation's `scale` is the same multiplier in the same scene units, so a reader who had
        // tuned one gets the arrangement they had.
        assert.strictEqual(forceAtlas2({ scalingFactor: 250 }).scale, 250);
        assert.strictEqual(forceAtlas2().scale, 100, "and its default travels with it");
    });

    it("accepts a gravity of zero and refuses a gravity below it", () => {
        // Zero gravity is a legal ForceAtlas2 setting -- nothing pulls the graph towards the
        // centre -- and the Storybook slider has always started there while the schema called it
        // positive, so the lowest value the control offered was the one value it refused.
        assert.strictEqual(forceAtlas2({ gravity: 0 }).gravity, 0);
        assert.throws(() => forceAtlas2({ gravity: -1 }));
    });

    it("turns the weighted boolean into the simulation's weight", () => {
        // `weight: true` is what names the snapshot's own weight column, which is the one column
        // the element has; `false` is a reader with weights declining to be arranged by them.
        assert.strictEqual(forceAtlas2({ weighted: true }).weight, true);
        assert.strictEqual(forceAtlas2({ weighted: false }).weight, false);
    });

    it("leaves iterationsPerStep unset unless a knob is set, and lets the layout's own value win", () => {
        assert.isNull(
            resolveSimulationOptions("forceatlas2", {}, BEHAVIOR).iterationsPerStep,
            "unset means the bridge decides from the graph size at every load",
        );
        assert.strictEqual(
            resolveSimulationOptions("forceatlas2", {}, { ...BEHAVIOR, iterationsPerStep: 6 }).iterationsPerStep,
            6,
            "the behaviour knob is what a host sets once for every layout",
        );
        assert.strictEqual(
            resolveSimulationOptions("forceatlas2", { iterationsPerStep: 3 }, { ...BEHAVIOR, iterationsPerStep: 6 })
                .iterationsPerStep,
            3,
            "and a value set on this one layout beats it",
        );
    });

    it("raises the automatic iteration count fourfold above a quarter of a million nodes", () => {
        // One readback per batch costs longer than a frame at that size, so the element computes
        // more per batch and accepts a lower position refresh rate.
        assert.strictEqual(iterationsPerStepFor(null, 2, 250_000), 2);
        assert.strictEqual(iterationsPerStepFor(null, 2, 250_001), 8);
        assert.strictEqual(iterationsPerStepFor(5, 2, 250_001), 5, "an explicit count is the count, whatever the size");
        assert.strictEqual(iterationsPerStepFor(5, 2, 10), 5);
    });

    it("keeps two accelerated batches in flight unless a host says otherwise", () => {
        assert.strictEqual(resolveSimulationOptions("forceatlas2", {}, BEHAVIOR).maxInFlight, 2);
        assert.strictEqual(
            resolveSimulationOptions("forceatlas2", {}, { ...BEHAVIOR, maxInFlight: 1 }).maxInFlight,
            1,
        );
        assert.strictEqual(resolveSimulationOptions("forceatlas2", { maxInFlight: 4 }, BEHAVIOR).maxInFlight, 4);
    });

    it("maps Spring's spring constant and iteration budget, and keeps both of its multipliers live", () => {
        const model = resolveSimulationOptions("spring", { k: 0.5, iterations: 120 }, BEHAVIOR)
            .model as FruchtermanReingoldOptions;

        assert.strictEqual(model.k, 0.5);
        assert.strictEqual(model.iterations, 120);

        // Spring publishes TWO multipliers and both were live: the one-shot layout fitted its
        // arrangement into a box of `scale`, and the element then published every coordinate
        // multiplied by `scalingFactor`. The simulation has one, so it gets their product --
        // otherwise a Spring graph would come out a hundredth of the size of the same graph
        // arranged by ForceAtlas2.
        assert.strictEqual(model.scale, 100, "the defaults, 100 and 1, land where they always did");
        assert.strictEqual(
            (resolveSimulationOptions("spring", { scale: 3 }, BEHAVIOR).model as FruchtermanReingoldOptions).scale,
            300,
        );
        assert.strictEqual(
            (resolveSimulationOptions("spring", { scalingFactor: 2, scale: 3 }, BEHAVIOR)
                .model as FruchtermanReingoldOptions).scale,
            6,
        );
    });

    it("gives the bridge the product too, so the refit cannot swallow a published multiplier", () => {
        // THE RADIUS IS THE WHOLE OF THE SIZE. The bridge fits every simulation arrangement to
        // the radius it is given, so a multiplier that reaches only the simulation is divided
        // straight back out and its slider moves nothing on screen. Both layouts that publish a
        // "Scale" control are checked, because the defect is one line and covers both.
        assert.strictEqual(resolveSimulationOptions("spring", {}, BEHAVIOR).scalingFactor, 100, "the default");
        assert.strictEqual(resolveSimulationOptions("spring", { scale: 10 }, BEHAVIOR).scalingFactor, 1000);
        assert.strictEqual(
            resolveSimulationOptions("spring", { scalingFactor: 250, scale: 2 }, BEHAVIOR).scalingFactor,
            500,
        );
        assert.strictEqual(
            resolveSimulationOptions("spring-electrical", { scale: 3 }, BEHAVIOR).scalingFactor,
            300,
            "spring-electrical publishes no scaling factor and takes the element's default",
        );
        assert.strictEqual(
            resolveSimulationOptions("forceatlas2", { scalingFactor: 250 }, BEHAVIOR).scalingFactor,
            250,
            "ForceAtlas2 publishes no scale, so its radius is its scaling factor alone",
        );
    });

    it("maps Spring Electrical's five ngraph names, with ngraph's defaults", () => {
        const defaults = resolveSimulationOptions("spring-electrical", {}, BEHAVIOR)
            .model as SpringElectricalOptions;

        assert.deepEqual(
            [
                defaults.springLength,
                defaults.springCoefficient,
                defaults.gravity,
                defaults.dragCoefficient,
                defaults.timeStep,
            ],
            [10, 0.8, -12, 0.9, 0.5],
        );

        const set = resolveSimulationOptions(
            "spring-electrical",
            { springLength: 30, springCoefficient: 0.5, gravity: -6, dragCoefficient: 0.7, timeStep: 0.25 },
            BEHAVIOR,
        ).model as SpringElectricalOptions;

        assert.deepEqual(
            [set.springLength, set.springCoefficient, set.gravity, set.dragCoefficient, set.timeStep],
            [30, 0.5, -6, 0.7, 0.25],
        );
    });

    it("resolves a node-mass record by node id, not by insertion order", () => {
        // The record is keyed by the id the reader knows. The simulation is indexed by the dense
        // row the snapshot assigned, and the two orders are not the same -- which is the whole
        // reason the element resolves the record itself rather than passing it on.
        const builder = new GraphBuilder({ directed: false, addMissingNodes: true });
        builder.addEdge("c", "a");
        builder.addEdge("a", "b");
        const snapshot = builder.freeze({ label: "node-mass" });

        const masses = resolveNodeMass({ a: 10, b: 20, c: 30 }, snapshot);

        assert.strictEqual(masses?.length, snapshot.nodeCount, "one mass per dense row");
        for (let row = 0; row < snapshot.nodeCount; row += 1) {
            const id = String(snapshot.ids.idOf(row));
            assert.strictEqual(masses?.[row], { a: 10, b: 20, c: 30 }[id], `row ${String(row)} is ${id}'s mass`);
        }
    });

    it("gives a node the element knows no mass for one more than its degree", () => {
        const builder = new GraphBuilder({ directed: false, addMissingNodes: true });
        builder.addEdge("hub", "leaf");
        builder.addEdge("hub", "other");
        const snapshot = builder.freeze({ label: "node-mass-fallback" });
        const degree = snapshot.outDegree();

        // The reader named one of the three nodes, so the other two get the element's own fallback.
        const masses = resolveNodeMass({ hub: 9 }, snapshot);

        for (let row = 0; row < snapshot.nodeCount; row += 1) {
            const id = String(snapshot.ids.idOf(row));
            const expected = id === "hub" ? 9 : degree[row] + 1;
            assert.strictEqual(masses?.[row], expected, "a hub holds its ground and a leaf is pushed about");
        }

        // The other two forms are the SIMULATION's to resolve, at every load, on either path.
        assert.isNull(resolveNodeMass(null, snapshot), "no masses asked for");
        assert.isNull(resolveNodeMass("mass", snapshot), "a column named by the reader");
        assert.strictEqual(forceAtlas2().nodeMass, null, "and nothing is asked for by default");
    });

    it("never offers nodeSize, and tells the simulation so", () => {
        // The published schema has never carried it, and an accelerator refuses any value but
        // null, so a layout that accepted one would build on the processor and fail on the device
        // -- two paths that draw different pictures, which is the divergence the design forbids.
        assert.strictEqual(forceAtlas2().nodeSize, null);
        assert.isUndefined(
            ForceAtlas2Layout.zodOptionsSchema.nodeSize,
            "no published option carries one, so nothing a reader sets can reach the simulation",
        );
        assert.strictEqual(
            forceAtlas2({ nodeSize: { a: 3 } }).nodeSize,
            null,
            "and a caller who names it anyway is still handed null",
        );
    });
});
