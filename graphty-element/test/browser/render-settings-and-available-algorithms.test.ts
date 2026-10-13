/**
 * `setRenderSettings` changes the render settings it names, queued or not, and
 * `AlgorithmManager.getAvailableAlgorithms` lists every registered algorithm.
 *
 * Both used to be stubs that reported success and did nothing (issue #2342): the settings were
 * ignored and the list was always empty. Everything is read back through the public API.
 */
import "../../src/graphty-element";

import { afterEach, assert, describe, it, vi } from "vitest";

import { Algorithm, AlgorithmManager, type Graph, type Graphty } from "../../index.js";

/** A plugin algorithm, registered the way a third party registers one. */
class DoNothing extends Algorithm {
    static override type = "do-nothing";

    static override namespace = "test-2342";

    /**
     * Change nothing.
     * @param _graph - The graph.
     */
    override async run(_graph: Graph): Promise<void> {
        return Promise.resolve();
    }
}

Algorithm.register(DoNothing);

let mounted: Graphty | null = null;

afterEach(() => {
    mounted?.remove();
    mounted = null;
});

/**
 * Mount an element and wait until its graph is initialised.
 * @returns The element.
 */
async function mount(): Promise<Graphty> {
    const element = document.createElement("graphty-element");
    element.style.display = "block";
    element.style.width = "300px";
    element.style.height = "200px";
    document.body.appendChild(element);
    mounted = element;
    await element.updateComplete;
    await vi.waitFor(() => {
        assert.isTrue(element.graph.initialized, "the element initialised its graph");
    });
    return element;
}

describe("setRenderSettings", () => {
    it("switches drawing on demand once the queue reaches it", async () => {
        const element = await mount();
        assert.isFalse(element.renderOnDemand);

        await element.setRenderSettings({ onDemand: true });
        assert.isTrue(element.renderOnDemand);
        assert.deepEqual(element.layoutBehavior?.rendering, { onDemand: true });

        await element.setRenderSettings({ onDemand: false });
        assert.isFalse(element.renderOnDemand);
    });

    it("applies at once with skipQueue", async () => {
        const element = await mount();

        const call = element.setRenderSettings({ onDemand: true }, { skipQueue: true });
        assert.isTrue(element.renderOnDemand, "applied before the promise settles");
        await call;
        assert.isTrue(element.renderOnDemand);
    });

    it("keeps a field it is not handed", async () => {
        const element = await mount();
        await element.setRenderSettings({ onDemand: true });

        await element.setRenderSettings({});
        assert.isTrue(element.renderOnDemand);
    });

    it("applies the valid fields and warns about an unknown one, still resolving", async () => {
        const element = await mount();

        const warnings = await element.setRenderSettings({ onDemand: true, fps: 30 });
        assert.isTrue(element.renderOnDemand, "the valid field is applied");
        assert.deepEqual(element.layoutBehavior?.rendering, { onDemand: true }, "fps is not applied");
        assert.deepEqual(warnings, [
            {
                code: "W_RENDER_SETTING_IGNORED",
                params: { field: "fps", reason: "unknown-field", accepted: ["onDemand"] },
            },
        ]);
    });

    it("ignores a value the setting does not take and warns, still resolving", async () => {
        const element = await mount();

        const warnings = await element.setRenderSettings({ onDemand: "yes" }, { skipQueue: true });
        assert.isFalse(element.renderOnDemand, "the invalid value is not applied");
        assert.deepEqual(warnings, [
            {
                code: "W_RENDER_SETTING_IGNORED",
                params: { field: "onDemand", reason: "invalid-value", accepted: ["onDemand"] },
            },
        ]);
    });

    it("warns about nothing when every field is valid", async () => {
        const element = await mount();

        assert.deepEqual(await element.setRenderSettings({ onDemand: true }), []);
    });
});

describe("AlgorithmManager.getAvailableAlgorithms", () => {
    it("lists the built-ins and a registered plugin as namespace:type keys", async () => {
        const element = await mount();
        const manager = new AlgorithmManager(element.graph.getEventManager(), element.graph);

        const available = manager.getAvailableAlgorithms();

        for (const key of ["graphty:degree", "graphty:pagerank", "graphty:dijkstra", "test-2342:do-nothing"]) {
            assert.include(available, key);
        }
        assert.deepEqual(available, [...available].sort(), "sorted");
    });
});
