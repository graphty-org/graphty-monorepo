/**
 * @file The frame's node walk follows only the rows the coordinate lane says changed, which is right while one
 * engine has placed every node. A static engine that takes the nodes over afterwards (a layout whose module
 * arrived after the data) placed each node from its own answer, and its first publish changed only the rows
 * where that answer differed from the lane: every other node kept where it was first drawn, for good. Under a
 * slow machine the CytoscapeSession story drew half its nodes at the file's unscaled coordinates.
 */

import type { Scene as BabylonScene } from "@babylonjs/core";
import { assert, describe, it } from "vitest";

import { WRITABLE_LANE } from "../../src/data/lane";
import { StaticLayoutEngine } from "../../src/layout/LayoutEngine";
import type { DataManager } from "../../src/managers/DataManager";
import type { GraphContext } from "../../src/managers/GraphContext";
import type { LayoutManager } from "../../src/managers/LayoutManager";
import type { StatsManager } from "../../src/managers/StatsManager";
import { UpdateManager } from "../../src/managers/UpdateManager";

/** A node that counts the times the walk placed it. */
class CountingNode {
    updates = 0;

    constructor(readonly index: number) {}

    update(): void {
        this.updates += 1;
    }
}

/**
 * A static engine at rest: nothing owed, so the walk asks only the lane which rows moved.
 * @returns It.
 */
function restingStaticEngine(): StaticLayoutEngine {
    const engine = Object.create(StaticLayoutEngine.prototype) as StaticLayoutEngine;
    engine.stale = false;
    return engine;
}

describe("a static engine that takes the nodes over", () => {
    it("places every node once, though its publish changed no row of the lane", () => {
        const nodes = Array.from({ length: 12 }, (_, at) => new CountingNode(at));
        // The lane holds every row already (seeded with the data), and nothing writes it again here.
        const lane = { changes: 12, rowsChangedSince: (since: number) => (since === 12 ? [] : null) };
        const layoutManager = {
            layoutEngine: undefined as StaticLayoutEngine | undefined,
            nodes: [] as CountingNode[],
            placeGroups: () => undefined,
            publishOrReport: () => true,
        };
        const dataManager = {
            [WRITABLE_LANE]: lane,
            nodes: new Map(nodes.map((node) => [node.index, node])),
            groups: [],
        } as unknown as DataManager;
        const observable = { add: () => null, remove: () => true };
        const scene = {
            onAfterRenderObservable: observable,
            onBeforeRenderObservable: observable,
            onBeforeDrawPhaseObservable: observable,
            onNewMeshAddedObservable: observable,
            onMeshRemovedObservable: observable,
            getEngine: () => ({ onResizeObservable: observable }),
        } as unknown as BabylonScene;
        const monitor = { beginMonitoring: () => undefined, endMonitoring: () => undefined };
        const manager = new UpdateManager(
            null as never,
            { edgeUpdate: monitor, nodeUpdate: monitor } as unknown as StatsManager,
            layoutManager as unknown as LayoutManager,
            dataManager,
            null as never,
            { getScene: () => scene } as unknown as GraphContext,
        );
        // The frame's node walk; private, reached as the frame loop reaches it.
        const walk = (): void => {
            (manager as unknown as { updateNodes(): void }).updateNodes();
        };

        // The data arrived first: the walk follows the lane with no engine and no node in it.
        walk();
        assert.deepStrictEqual(
            nodes.map((node) => node.updates),
            nodes.map(() => 0),
        );

        // The layout arrives and takes every node; its answer is what the lane already holds.
        layoutManager.layoutEngine = restingStaticEngine();
        layoutManager.nodes = nodes;
        walk();
        assert.deepStrictEqual(
            nodes.map((node) => node.updates),
            nodes.map(() => 1),
            "every node is placed once under the engine that took it over",
        );

        // From then on a frame with no lane change places nothing.
        walk();
        assert.deepStrictEqual(
            nodes.map((node) => node.updates),
            nodes.map(() => 1),
        );
    });
});
