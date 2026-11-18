/**
 * @file The `limits` option raises the render ceilings, and only on the `"batched"` render path.
 *
 * Under `"objects"`, the element's default, the shipped ceilings stand: their reason is the heap
 * a node of meshes costs (`session/limits.ts`), and that reason still holds there. Under
 * `"batched"` the consumer's ceilings are the ones a load is refused at, and
 * `session.capabilities.limits` reports whichever are in force. Stage G2 of
 * design/rendering/cosmos-gap.md.
 */

import "../../src/graphty-element";

import { afterEach, assert, describe, it } from "vitest";

import type { Graphty } from "../../index.js";
import type { GraphtyError } from "../../src/errors";
import { operationQueueOf } from "../../src/Graph";
import { DEFAULT_LIMITS } from "../../src/session/limits";

const cleanups: (() => void)[] = [];

afterEach(() => {
    for (const cleanup of cleanups.splice(0)) {
        cleanup();
    }
});

/**
 * Mount an element.
 * @param path - The render path, set before anything else reaches the element.
 * @returns The element.
 */
async function mounted(path: "objects" | "batched"): Promise<Graphty> {
    const element = document.createElement("graphty-element");
    element.renderer = "webgl";
    element.renderPath = path;
    element.layout = "random";
    element.style.display = "block";
    element.style.width = "400px";
    element.style.height = "300px";
    document.body.appendChild(element);
    cleanups.push(() => {
        element.remove();
    });
    await element.updateComplete;
    await operationQueueOf(element.graph).waitForCompletion();
    return element;
}

/**
 * `count` node records, ids `n0`, `n1`, ...
 * @param count - How many.
 * @returns The records.
 */
function nodes(count: number): { id: string }[] {
    return Array.from({ length: count }, (_, i) => ({ id: `n${i}` }));
}

/**
 * The coded error a promise rejected with; fails the test when it resolved.
 * @param promise - The promise.
 * @returns The error.
 */
async function refusal(promise: Promise<unknown>): Promise<GraphtyError> {
    const outcome = await promise.then(
        () => null,
        (error: unknown) => error as GraphtyError,
    );
    assert.isNotNull(outcome, "expected a refusal");
    return outcome;
}

/**
 * Every `{ type, code, params }` the element raised as a `limits-warning` or an `error`.
 * @param element - The element.
 * @returns The list, filled as events arrive.
 */
function heard(element: Graphty): { type: string; code: string; params: unknown }[] {
    const seen: { type: string; code: string; params: unknown }[] = [];
    element.addEventListener("limits-warning", (event) => {
        const { code, params } = (event as CustomEvent<{ code: string; params: unknown }>).detail;
        seen.push({ type: "limits-warning", code, params });
    });
    element.addEventListener("error", (event) => {
        const { error } = (event as unknown as CustomEvent<{ error: GraphtyError }>).detail;
        seen.push({ type: "error", code: error.code, params: error.details });
    });
    return seen;
}

/**
 * Every `W_OBJECT_CAP` the element raised, as its params.
 * @param seen - What {@link heard} collected.
 * @returns The params, in order.
 */
function caps(seen: { code: string; params: unknown }[]): unknown[] {
    return seen.filter(({ code }) => code === "W_OBJECT_CAP").map(({ params }) => params);
}

/**
 * Give every node a border, which no batch draws, so each row wants an object of its own.
 * @param element - The element.
 */
async function ringed(element: Graphty): Promise<void> {
    await element.session.styles.add({
        name: "ring",
        target: "node",
        selector: { match: "everything" },
        set: { "node.borderColor": "#000000", "node.borderWidth": 0.1 },
    } as never);
}

describe("the limits option", () => {
    it("leaves the default refusal unchanged, code and text, at 100,001 nodes", async () => {
        const element = await mounted("objects");
        assert.strictEqual(DEFAULT_LIMITS.renderCeiling, 100_000);

        const error = await refusal(element.session.data.addNodes(nodes(100_001)));

        assert.strictEqual(error.code, "E_TOO_LARGE");
        assert.deepStrictEqual(error.details, {
            limit: 100_000,
            count: 100_001,
            of: "nodes",
            graph: { nodes: 0, edges: 0 },
        });
        assert.strictEqual(
            error.message,
            "Loading 100,001 more nodes would take the graph to 100,001, past the 100,000 this renderer can draw. " +
                "Load a subset of the graph.",
        );
        assert.deepStrictEqual(element.session.capabilities.limits, DEFAULT_LIMITS);
    });

    it("still refuses under objects with a raised limit, and says the limit is ignored", async () => {
        const element = await mounted("objects");
        const seen = heard(element);

        element.limits = { renderCeiling: 200_000 };

        assert.deepStrictEqual(seen, [
            { type: "limits-warning", code: "W_LIMITS_IGNORED", params: { renderPath: "objects" } },
        ]);
        assert.strictEqual(element.session.capabilities.limits.renderCeiling, 100_000);
        const error = await refusal(element.session.data.addNodes(nodes(100_001)));
        assert.strictEqual(error.code, "E_TOO_LARGE");
        assert.strictEqual((error.details as { limit: number }).limit, 100_000);
    });

    it("loads 200,000 nodes under batched with a raised limit, none of them an object row", async () => {
        const element = await mounted("batched");
        element.limits = { renderCeiling: 200_000 };

        await element.session.data.addNodes(nodes(200_000));
        await operationQueueOf(element.graph).waitForCompletion();
        await element.waitForStableFrame();

        assert.strictEqual(element.graph.getDataManager().nodes.size, 200_000);
        assert.strictEqual(element.rowCounts.objectNodes, 0);
        assert.strictEqual(element.rowCounts.batchedNodes, 200_000);
    });

    it("reports the limits in force, and a change of render path changes them", async () => {
        const element = await mounted("batched");
        const changes: number[] = [];
        element.session.on("capabilities:changed", ({ capabilities }) => {
            changes.push(capabilities.limits.renderCeiling);
        });

        element.limits = { renderCeiling: 300_000, edgesDrawn: 2_000_000 };
        assert.strictEqual(element.session.capabilities.limits.renderCeiling, 300_000);
        assert.strictEqual(element.session.capabilities.limits.edgesDrawn, 2_000_000);
        assert.strictEqual(element.session.capabilities.limits.largeGraphThreshold, DEFAULT_LIMITS.largeGraphThreshold);

        element.renderPath = "objects";
        assert.deepStrictEqual(element.session.capabilities.limits, DEFAULT_LIMITS);
        element.renderPath = "batched";
        assert.strictEqual(element.session.capabilities.limits.renderCeiling, 300_000);

        assert.deepStrictEqual(changes, [300_000, 100_000, 300_000]);
    });

    it("draws rows past the objectRows budget plain, and says so with W_OBJECT_CAP", async () => {
        const element = await mounted("batched");
        const seen = heard(element);
        element.limits = { objectRows: 10 };
        assert.strictEqual(element.session.capabilities.limits.objectRows, 10);

        await element.session.data.addNodes(nodes(50));
        await element.session.styles.add({
            name: "ring",
            target: "node",
            selector: { match: "everything" },
            set: { "node.borderColor": "#000000", "node.borderWidth": 0.1 },
        } as never);
        await operationQueueOf(element.graph).waitForCompletion();
        await element.waitForStableFrame();

        assert.strictEqual(element.rowCounts.objectNodes, 10);
        assert.strictEqual(element.rowCounts.batchedNodes, 40);
        assert.deepStrictEqual(
            seen.filter(({ code }) => code === "W_OBJECT_CAP"),
            [{ type: "limits-warning", code: "W_OBJECT_CAP", params: { of: "nodes", wanted: 50, cap: 10 } }],
        );
    });

    it("draws edges past the objectEdges budget as plain lines, and says so with W_OBJECT_CAP", async () => {
        const element = await mounted("batched");
        const seen = heard(element);
        element.limits = { objectEdges: 5 };

        await element.session.data.addNodes(nodes(31));
        await element.session.data.addEdges(Array.from({ length: 30 }, (_, i) => ({ src: "n0", dst: `n${i + 1}` })));
        await element.session.styles.add({
            name: "arrowed",
            target: "edge",
            selector: { match: "everything" },
            set: { "edge.arrowHead": "normal" },
        } as never);
        await operationQueueOf(element.graph).waitForCompletion();
        await element.waitForStableFrame();

        assert.strictEqual(element.rowCounts.objectEdges, 5);
        assert.strictEqual(element.rowCounts.pulledEdges, 25);
        assert.deepStrictEqual(
            seen.filter(({ code }) => code === "W_OBJECT_CAP"),
            [{ type: "limits-warning", code: "W_OBJECT_CAP", params: { of: "edges", wanted: 30, cap: 5 } }],
        );
    });

    it("counts the objects that exist now, so a clear and a reload get the whole objectRows budget back", async () => {
        const element = await mounted("batched");
        const seen = heard(element);
        element.limits = { objectRows: 10 };
        await element.session.styles.add({
            name: "ring",
            target: "node",
            selector: { match: "everything" },
            set: { "node.borderColor": "#000000", "node.borderWidth": 0.1 },
        } as never);

        for (let load = 0; load < 2; load++) {
            element.graph.clearData();
            await element.session.data.addNodes(nodes(8));
            await operationQueueOf(element.graph).waitForCompletion();
            await element.waitForStableFrame();
            assert.strictEqual(element.rowCounts.objectNodes, 8, `load ${load}`);
        }

        assert.deepStrictEqual(seen, []);
    });

    it("counts the edges that exist now, so a clear and a reload get the whole objectEdges budget back", async () => {
        const element = await mounted("batched");
        const seen = heard(element);
        element.limits = { objectEdges: 5 };
        await element.session.styles.add({
            name: "arrowed",
            target: "edge",
            selector: { match: "everything" },
            set: { "edge.arrowHead": "normal" },
        } as never);

        for (let load = 0; load < 2; load++) {
            element.graph.clearData();
            await element.session.data.addNodes(nodes(5));
            await element.session.data.addEdges(Array.from({ length: 4 }, (_, i) => ({ src: "n0", dst: `n${i + 1}` })));
            await operationQueueOf(element.graph).waitForCompletion();
            await element.waitForStableFrame();
            assert.strictEqual(element.rowCounts.objectEdges, 4, `load ${load}`);
        }

        assert.deepStrictEqual(seen, []);
    });

    it("keeps every bordered row an object row at the default budget", async () => {
        const element = await mounted("batched");
        const seen = heard(element);
        assert.strictEqual(element.session.capabilities.limits.objectRows, 100_000);
        assert.strictEqual(element.session.capabilities.limits.objectEdges, 1_000_000);

        await element.session.data.addNodes(nodes(50));
        await element.session.styles.add({
            name: "ring",
            target: "node",
            selector: { match: "everything" },
            set: { "node.borderColor": "#000000", "node.borderWidth": 0.1 },
        } as never);
        await operationQueueOf(element.graph).waitForCompletion();
        await element.waitForStableFrame();

        assert.strictEqual(element.rowCounts.objectNodes, 50);
        assert.deepStrictEqual(seen, []);
    });

    it("empties the rows held plain on a clear, so a reload past the budget reports W_OBJECT_CAP again", async () => {
        const element = await mounted("batched");
        const seen = heard(element);
        element.limits = { objectRows: 10 };
        await ringed(element);

        for (let load = 0; load < 2; load++) {
            element.graph.clearData();
            await element.session.data.addNodes(nodes(50));
            await operationQueueOf(element.graph).waitForCompletion();
            await element.waitForStableFrame();
            assert.strictEqual(element.rowCounts.objectNodes, 10, `load ${load}`);
            assert.strictEqual(element.rowCounts.batchedNodes, 40, `load ${load}`);
        }

        assert.deepStrictEqual(caps(seen), [
            { of: "nodes", wanted: 50, cap: 10 },
            { of: "nodes", wanted: 50, cap: 10 },
        ]);
    });

    it("repaints the rows held plain when the objectRows budget is raised", async () => {
        const element = await mounted("batched");
        element.limits = { objectRows: 10 };
        await ringed(element);
        await element.session.data.addNodes(nodes(50));
        await operationQueueOf(element.graph).waitForCompletion();
        await element.waitForStableFrame();
        assert.strictEqual(element.rowCounts.objectNodes, 10);

        element.limits = { objectRows: 100 };
        await operationQueueOf(element.graph).waitForCompletion();
        await element.waitForStableFrame();

        assert.strictEqual(element.rowCounts.objectNodes, 50);
        assert.strictEqual(element.rowCounts.batchedNodes, 0);
    });

    it("counts only the rows still held plain after a removal", async () => {
        const element = await mounted("batched");
        const seen = heard(element);
        element.limits = { objectRows: 10 };
        await ringed(element);
        await element.session.data.addNodes(nodes(50));
        await operationQueueOf(element.graph).waitForCompletion();
        await element.waitForStableFrame();

        await element.session.data.removeNodes(
            nodes(50)
                .slice(30)
                .map(({ id }) => id),
        );
        await element.session.styles.add({
            name: "tint",
            target: "node",
            selector: { match: "everything" },
            set: { "node.color": "#3366ff" },
        } as never);
        await operationQueueOf(element.graph).waitForCompletion();
        await element.waitForStableFrame();

        assert.strictEqual(element.rowCounts.batchedNodes, 20);
        assert.deepStrictEqual(caps(seen), [
            { of: "nodes", wanted: 50, cap: 10 },
            { of: "nodes", wanted: 30, cap: 10 },
        ]);
    });

    it("draws rows past the budget plain under 3D flat lighting, which batches nothing else", async () => {
        const element = await mounted("batched");
        const seen = heard(element);
        element.limits = { objectRows: 10 };
        await element.setViewMode("3d");
        element.lighting = "flat";
        await element.session.data.addNodes(nodes(50));
        await operationQueueOf(element.graph).waitForCompletion();
        await element.waitForStableFrame();

        assert.strictEqual(element.rowCounts.objectNodes, 10);
        assert.strictEqual(element.rowCounts.batchedNodes, 40);
        assert.deepStrictEqual(caps(seen), [{ of: "nodes", wanted: 50, cap: 10 }]);
    });

    it("labels a row held plain when label sampling picks it", async () => {
        const element = await mounted("batched");
        element.limits = { objectRows: 10 };
        const { graph } = element;
        // One cell holds the whole canvas, so one label is built: the lowest id, "a0", a row past the budget.
        graph.setLayoutBehavior({ labels: { sampleCell: 100_000 } });
        const ids = [
            ...Array.from({ length: 10 }, (_, i) => `z${i}`),
            ...Array.from({ length: 40 }, (_, i) => `a${i}`),
        ];
        await element.session.data.addNodes(
            ids.map((id, i) => ({ id, position: { x: (i % 7) * 0.2 - 0.6, y: Math.floor(i / 7) * 0.2 - 0.6, z: 0 } })),
        );
        await graph.setLayout("fixed", { dim: 3 });
        await graph.setCameraState({ position: { x: 0, y: 0, z: -11 }, target: { x: 0, y: 0, z: 0 } });
        await element.session.styles.add({
            name: "labels",
            target: "node",
            selector: { match: "everything" },
            set: { "node.label": "LABEL" },
        } as never);
        await operationQueueOf(graph).waitForCompletion();
        await element.waitForStableFrame();

        const labelled = ids.filter((id) => graph.getNode(id)?.label !== undefined);
        assert.deepStrictEqual(labelled, ["a0"]);
        assert.strictEqual(graph.nodeLabelCounts.hiddenBySampling, 49);
    });

    it("refuses a switch to objects above its defaults, and the path stays batched", async () => {
        const element = await mounted("batched");
        element.limits = { renderCeiling: 200_000 };
        await element.session.data.addNodes(nodes(100_001));
        await operationQueueOf(element.graph).waitForCompletion();
        const seen = heard(element);

        element.renderPath = "objects";

        assert.strictEqual(element.renderPath, "batched");
        assert.deepStrictEqual(seen, [
            {
                type: "error",
                code: "E_TOO_LARGE",
                params: { limit: 100_000, count: 100_001, of: "nodes", graph: { nodes: 100_001, edges: 0 } },
            },
        ]);
        assert.strictEqual(element.session.capabilities.limits.renderCeiling, 200_000);
    });
});
