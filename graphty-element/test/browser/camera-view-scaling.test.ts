/**
 * @file Counted-work scaling of the camera presets and the background: each call runs on a mounted
 * `<graphty-element>` holding a graph of n and of 4n nodes, and the elements it visits (Map, Set
 * and Array iterator steps and array scans, see `visitsDuring`) may grow no faster than its reach.
 * A preset is one record and the background one setting, so saving, importing or removing one, or
 * setting the background, does about the same work at either size. The view mode is counted by
 * `view-mode-scaling.test.ts`. Counted, never timed (issue #1643).
 *
 * The render loop is stopped, so no frame runs while a call is counted, and strict state is off,
 * as it is for a consumer (see `data-path-scaling.test.ts`).
 */
import "../../src/graphty-element";

import { afterAll, assert, beforeAll, describe, it, vi } from "vitest";

import type { Graphty } from "../../index.js";
import { operationQueueOf } from "../../src/Graph";
import { dispatcherOf } from "../../src/session/GraphSession";
import { assertScalesLinearly, type Growth, visitsDuring } from "../helpers/cost";

/** The two graph sizes: big enough that a quadratic path is 16x, small enough to stay cheap. */
const SIZES = [100, 400] as const;

/** A saved camera state: one record, the same at any graph size. */
const CAMERA = { position: { x: 0, y: 0, z: 10 }, target: { x: 0, y: 0, z: 0 } };

/**
 * Mount a graphty-element with `size` nodes on a path, its render loop stopped and a static layout.
 * @param size - The node count.
 * @returns The element.
 */
async function mount(size: number): Promise<Graphty> {
    const element = document.createElement("graphty-element");
    element.style.width = "400px";
    element.style.height = "300px";
    element.style.display = "block";
    document.body.appendChild(element);
    await element.updateComplete;
    await vi.waitFor(() => {
        assert.isTrue(element.graph.initialized, "the element initialised its graph");
    });
    const { graph } = element;
    graph.engine.stopRenderLoop();
    await graph.setLayout("random");
    const ids = Array.from({ length: size }, (_, at) => `n${String(at)}`);
    await graph.addNodes(ids.map((id) => ({ id })));
    await graph.addEdges(ids.slice(1).map((id, at) => ({ source: ids[at], target: id })));
    await settled(element);
    return element;
}

/**
 * Wait until every queued operation has run and the pass that derives it has drawn it.
 * @param element - The element.
 */
async function settled(element: Graphty): Promise<void> {
    await operationQueueOf(element.graph).waitForCompletion();
    await dispatcherOf(element.graph.getSession()).lane.settled();
}

/** One call under test. */
interface Case {
    /** Every public method (`Owner.method`, as the cost-coverage registry spells it) the call covers. */
    readonly methods: readonly string[];
    /** `linear` when the call reaches every node, `constant` when it reaches one record. */
    readonly growth: Growth;
    /**
     * Build the state the call needs and return the call.
     * @param element - A mounted element.
     * @returns The call to count.
     */
    prepare(element: Graphty): Promise<() => unknown>;
    /**
     * Check that the call did what it is for, so a count of work that never happened cannot pass.
     * @param element - The element, after the call.
     */
    check(element: Graphty): void;
}

/**
 * Whether a preset is saved under the name.
 * @param element - The element.
 * @param name - The name.
 * @returns Whether it is.
 */
function saved(element: Graphty, name: string): boolean {
    return element.graph.getSession().views.has(name);
}

const CASES: readonly Case[] = [
    {
        methods: ["Graph.saveCameraPreset"],
        growth: "constant",
        prepare: (element) => Promise.resolve(() => element.graph.saveCameraPreset("Saved")),
        check: (element) => {
            assert.isTrue(saved(element, "Saved"));
        },
    },
    {
        methods: ["Graphty.saveCameraPreset"],
        growth: "constant",
        prepare: (element) => Promise.resolve(() => element.saveCameraPreset("Saved", CAMERA)),
        check: (element) => {
            assert.isTrue(saved(element, "Saved"));
        },
    },
    {
        methods: ["Graph.importCameraPresets"],
        growth: "constant",
        prepare: (element) => Promise.resolve(() => element.graph.importCameraPresets({ Imported: CAMERA })),
        check: (element) => {
            assert.isTrue(saved(element, "Imported"));
        },
    },
    {
        methods: ["Graphty.importCameraPresets"],
        growth: "constant",
        prepare: (element) => Promise.resolve(() => element.importCameraPresets({ Imported: CAMERA })),
        check: (element) => {
            assert.isTrue(saved(element, "Imported"));
        },
    },
    {
        methods: ["Graph.removeCameraPreset"],
        growth: "constant",
        prepare: async (element) => {
            element.graph.saveCameraPreset("Saved", CAMERA);
            await settled(element);
            return () => element.graph.removeCameraPreset("Saved");
        },
        check: (element) => {
            assert.isFalse(saved(element, "Saved"));
        },
    },
    {
        methods: ["Graphty.removeCameraPreset"],
        growth: "constant",
        prepare: async (element) => {
            element.saveCameraPreset("Saved", CAMERA);
            await settled(element);
            return () => element.removeCameraPreset("Saved");
        },
        check: (element) => {
            assert.isFalse(saved(element, "Saved"));
        },
    },
    {
        methods: ["Graph.setBackground"],
        growth: "constant",
        prepare: (element) =>
            Promise.resolve(() => {
                element.graph.setBackground({ backgroundType: "color", color: "#123456" });
            }),
        check: (element) => {
            assert.deepInclude(element.graph.getStyles().config.graph.background, { color: "#123456" });
        },
    },
];

describe("the camera presets and the background do work in proportion to their reach", () => {
    const scope = globalThis as { __GRAPHTY_STRICT_STATE__?: boolean };
    let strict: boolean | undefined;

    beforeAll(() => {
        strict = scope.__GRAPHTY_STRICT_STATE__;
        scope.__GRAPHTY_STRICT_STATE__ = false;
    });

    afterAll(() => {
        scope.__GRAPHTY_STRICT_STATE__ = strict;
    });

    for (const { methods, growth, prepare, check } of CASES) {
        const reach = growth === "linear" ? "no more than linear in the graph" : "about the same at any size";
        it(`${methods.join(", ")}: ${reach}`, async () => {
            await assertScalesLinearly(
                async (size) => {
                    const element = await mount(size);
                    try {
                        const call = await prepare(element);
                        const visits = await visitsDuring(async () => {
                            await call();
                            await settled(element);
                        });
                        check(element);
                        return visits;
                    } finally {
                        element.remove();
                    }
                },
                { sizes: SIZES, growth, counter: `elements visited by ${methods.join(", ")}` },
            );
        });
    }
});
