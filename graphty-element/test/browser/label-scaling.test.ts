/**
 * @file Counted-work scaling of labels: a style layer that gives every node (or every edge) a
 * label, drawn by the next frame, and the frame after the layer is removed, run on a graph of n and
 * of 4n nodes and may do no more than 4x the work, not 16x (issue #2762).
 *
 * Every label is a plane with its own material and texture, and Babylon walks scene-wide lists
 * when a material property is set or a material or texture is disposed, so building or disposing
 * labels one by one cost the size of the scene per label. Counted, never timed: see `visitsDuring`.
 */
import "../../src/graphty-element";

import { afterAll, assert, beforeAll, describe, it, vi } from "vitest";

import type { Graphty } from "../../index.js";
import { operationQueueOf } from "../../src/Graph";
import { dispatcherOf } from "../../src/session/GraphSession";
import { assertScalesLinearly, visitsDuring } from "../helpers/cost";

const SIZES = [100, 400] as const;

/**
 * Wait until every queued operation has run and the pass that derives it has painted it.
 * @param element - The element.
 */
async function settled(element: Graphty): Promise<void> {
    await operationQueueOf(element.graph).waitForCompletion();
    await dispatcherOf(element.graph.getSession()).lane.settled();
    await element.graph.getSession().styles.settled();
}

/**
 * Mount a graphty-element with `size` nodes on a path, its render loop stopped.
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
    element.graph.engine.stopRenderLoop();
    await element.graph.setLayout("random");
    await element.graph.addNodes(Array.from({ length: size }, (_, at) => ({ id: `n${String(at)}` })));
    await element.graph.addEdges(
        Array.from({ length: size - 1 }, (_, at) => ({ source: `n${String(at)}`, target: `n${String(at + 1)}` })),
    );
    await settled(element);
    element.graph.update();
    return element;
}

/**
 * How many nodes or edges of the element carry a label mesh in the scene.
 * @param element - The element.
 * @param target - Nodes or edges.
 * @returns The count.
 */
function labelled(element: Graphty, target: "node" | "edge"): number {
    const data = element.graph.getDataManager();
    const items = target === "node" ? [...data.nodes.values()] : [...data.edges.values()];
    const meshes = new Set(element.graph.scene.meshes);
    return items.filter((item) => {
        const mesh = item.label?.labelMesh;
        return mesh !== null && mesh !== undefined && !mesh.isDisposed() && meshes.has(mesh);
    }).length;
}

describe("a label on every element", () => {
    const scope = globalThis as { __GRAPHTY_STRICT_STATE__?: boolean };
    let strict: boolean | undefined;

    beforeAll(() => {
        strict = scope.__GRAPHTY_STRICT_STATE__;
        scope.__GRAPHTY_STRICT_STATE__ = false;
    });

    afterAll(() => {
        scope.__GRAPHTY_STRICT_STATE__ = strict;
    });

    for (const target of ["node", "edge"] as const) {
        it(`draws and removes ${target} labels with work in proportion to the graph`, async () => {
            const removed: number[] = [];
            await assertScalesLinearly(
                async (size) => {
                    const element = await mount(size);
                    try {
                        const count = target === "node" ? size : size - 1;
                        assert.strictEqual(labelled(element, target), 0, "no labels to begin with");
                        const layer = await element.graph.getSession().styles.add({
                            name: "labels",
                            target,
                            selector: { match: "everything" },
                            set: { [`${target}.label`]: "WORDS" },
                        });
                        await settled(element);
                        // The frame is what builds the labels the pass painted.
                        const visits = await visitsDuring(() => {
                            element.graph.update();
                        });
                        assert.strictEqual(labelled(element, target), count, `every ${target} has a label`);

                        await element.graph.getSession().styles.remove(layer.id);
                        await settled(element);
                        removed.push(
                            await visitsDuring(() => {
                                element.graph.update();
                            }),
                        );
                        assert.strictEqual(labelled(element, target), 0, "every label was taken down");
                        return visits;
                    } finally {
                        element.remove();
                    }
                },
                {
                    sizes: SIZES,
                    growth: "linear",
                    counter: `elements visited by the frame that draws ${target} labels`,
                },
            );
            await assertScalesLinearly((size) => removed[SIZES.indexOf(size as (typeof SIZES)[number])], {
                sizes: SIZES,
                growth: "linear",
                counter: `elements visited by the frame that removes ${target} labels`,
            });
        });
    }
});

describe("removing labelled elements", () => {
    const scope = globalThis as { __GRAPHTY_STRICT_STATE__?: boolean };
    let strict: boolean | undefined;

    beforeAll(() => {
        strict = scope.__GRAPHTY_STRICT_STATE__;
        scope.__GRAPHTY_STRICT_STATE__ = false;
    });

    afterAll(() => {
        scope.__GRAPHTY_STRICT_STATE__ = strict;
    });

    // Each removed label's material and texture used to leave Babylon's scene and engine lists by
    // a search of each, one label at a time, so removing labelled nodes cost the scene per label
    // (issue #2804).
    for (const target of ["node", "edge"] as const) {
        it(`removes half the nodes, then clears, with ${target} labels in proportion to the graph`, async () => {
            const cleared: number[] = [];
            await assertScalesLinearly(
                async (size) => {
                    const element = await mount(size);
                    try {
                        await element.graph.getSession().styles.add({
                            name: "labels",
                            target,
                            selector: { match: "everything" },
                            set: { [`${target}.label`]: "WORDS" },
                        });
                        await settled(element);
                        element.graph.update();
                        assert.isAbove(labelled(element, target), size / 2, `the ${target}s have labels`);

                        const half = Array.from({ length: size / 2 }, (_, at) => `n${String(2 * at)}`);
                        const visits = await visitsDuring(async () => {
                            await element.graph.removeNodes(half);
                            await settled(element);
                        });
                        assert.strictEqual(element.graph.getDataManager().nodes.size, size / 2);

                        cleared.push(
                            await visitsDuring(async () => {
                                element.graph.clearData();
                                await settled(element);
                            }),
                        );
                        assert.strictEqual(element.graph.getDataManager().nodes.size, 0);
                        return visits;
                    } finally {
                        element.remove();
                    }
                },
                {
                    sizes: SIZES,
                    growth: "linear",
                    counter: `elements visited removing half of the ${target}-labelled nodes`,
                },
            );
            await assertScalesLinearly((size) => cleared[SIZES.indexOf(size as (typeof SIZES)[number])], {
                sizes: SIZES,
                growth: "linear",
                counter: `elements visited clearing a ${target}-labelled graph`,
            });
        });
    }
});
