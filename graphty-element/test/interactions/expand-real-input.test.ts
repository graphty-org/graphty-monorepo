/**
 * @file Click-to-expand under real input: the browser's own input pipeline double-clicks a node a
 * recorded network source loaded (test/helpers/real-input.ts), and the outcome is read through the
 * public API -- how many nodes and edges the graph holds, the node's `_source` facts, the history.
 *
 * With the default configuration a double-click changes nothing; with
 * `behavior.expand.trigger: "double-click"` it brings the recorded neighbors, a second one continues
 * the partial node from its cursor, and collapse and undo restore the exact counts.
 */

import "../../src/graphty-element";

import { afterEach, assert, describe, it } from "vitest";

import type { Graphty } from "../../index.js";
import { operationQueueOf } from "../../src/Graph";
import { sourceFactsOf } from "../../src/session/sources/ids";
import type { SourceExpanded, SourceLoadOptions } from "../../src/session/sources/types";
import { loadRecordedSeed, PEOPLE_SEED } from "../../stories/fixtures/expand/source";
import { click, doubleClick, type Point } from "../helpers/real-input";

const WIDTH = 400;
const HEIGHT = 300;

const cleanups: (() => void)[] = [];

afterEach(() => {
    for (const cleanup of cleanups.splice(0)) {
        cleanup();
    }
});

/**
 * A mounted 2D element holding the recorded source's seed node at the origin, drawn.
 * @param load - more options for the seed's load, such as its own `expand`
 * @returns The element.
 */
async function mounted(load: SourceLoadOptions = {}): Promise<Graphty> {
    const element = document.createElement("graphty-element");
    element.style.display = "block";
    element.style.width = `${String(WIDTH)}px`;
    element.style.height = `${String(HEIGHT)}px`;
    document.body.appendChild(element);
    cleanups.push(() => {
        element.remove();
    });
    await element.updateComplete;
    await operationQueueOf(element.graph).waitForCompletion();
    await loadRecordedSeed(element.session, "recorded", { position: { x: 0, y: 0, z: 0 } }, load);
    await element.graph.setLayout("fixed", { dim: 2 });
    await element.setViewMode("2d");
    await operationQueueOf(element.graph).waitForCompletion();
    await element.waitForStableFrame();
    return element;
}

/**
 * A mounted element that saved a load whose own trigger is a click, and opened that file again:
 * the load is waiting, as in a project someone sent.
 * @returns The element.
 */
async function reopened(): Promise<Graphty> {
    const element = await mounted({ expand: { trigger: "click" } });
    const { text } = await element.session.project.save();
    await element.session.project.open(text, { discard: true });
    await operationQueueOf(element.graph).waitForCompletion();
    await element.waitForStableFrame();
    assert.lengthOf(element.session.data.pendingSourceLoads(), 1, "the load waits to be run");
    return element;
}

/**
 * Where the seed is drawn.
 * @param element - The element.
 * @returns Its centre in CSS pixels from the element's top-left corner.
 */
function seedAt(element: Graphty): Point {
    const position = element.nodeScreenPosition(PEOPLE_SEED.id);
    assert.isDefined(position, "the seed is drawn");
    assert.isTrue(position.visible, "the seed is on screen");
    return { x: position.x, y: position.y };
}

/**
 * Double-click the seed and wait for the expansion it starts to finish.
 * @param element - The element.
 * @returns What `source:expanded` carried.
 */
async function expandSeed(element: Graphty): Promise<SourceExpanded> {
    const expanded = new Promise<SourceExpanded>((resolve) => {
        const off = element.session.on("source:expanded", (detail) => {
            off();
            resolve(detail);
        });
    });
    await doubleClick(element, seedAt(element));
    const detail = await expanded;
    await element.waitForStableFrame();
    return detail;
}

/**
 * How many nodes and edges the graph holds.
 * @param element - The element.
 * @returns [nodes, edges].
 */
function counts(element: Graphty): [number, number] {
    const snapshot = element.session.data.store.getSnapshot();
    return [snapshot.nodeCount, snapshot.edgeCount];
}

describe("click-to-expand under real input", () => {
    it("does nothing on a double-click with the default configuration", async () => {
        const element = await mounted();
        const steps = element.session.history.steps.length;
        let started = 0;
        element.session.on("source:expand-start", () => {
            started++;
        });

        await doubleClick(element, seedAt(element));
        await element.waitForStableFrame();

        assert.deepEqual(counts(element), [1, 0]);
        assert.strictEqual(started, 0);
        assert.lengthOf(element.session.history.steps, steps);
    });

    it("expands, continues a partial node, and collapse and undo restore the exact counts", async () => {
        const element = await mounted();
        element.layoutBehavior = { expand: { trigger: "double-click" } };
        const steps = element.session.history.steps.length;

        const first = await expandSeed(element);
        assert.deepEqual(first.params, { seeds: [PEOPLE_SEED.id], added: [4, 4], partial: true });
        assert.deepEqual(counts(element), [5, 4]);
        const partial = sourceFactsOf(element.session.data.node(PEOPLE_SEED.id));
        assert.strictEqual(partial.expansion, "partial");
        assert.isDefined(element.session.data.node("javert"), "a recorded neighbor is in the graph");

        const second = await expandSeed(element);
        assert.deepEqual(second.params, { seeds: [PEOPLE_SEED.id], added: [2, 2], partial: false });
        assert.deepEqual(counts(element), [7, 6]);
        const complete = sourceFactsOf(element.session.data.node(PEOPLE_SEED.id));
        assert.strictEqual(complete.expansion, "complete");
        assert.lengthOf(element.session.history.steps, steps + 2, "each expansion is one step");

        const collapsed = await element.session.data.collapse(PEOPLE_SEED.id);
        assert.lengthOf(collapsed.removedNodes, 6);
        assert.deepEqual(counts(element), [1, 0]);

        await element.session.undo();
        assert.deepEqual(counts(element), [7, 6], "undo puts back exactly what collapse took");
        await element.session.undo();
        assert.deepEqual(counts(element), [5, 4]);
        await element.session.undo();
        assert.deepEqual(counts(element), [1, 0]);
    });

    it("expands on a double-click the load itself asked for, over the default configuration", async () => {
        const element = await mounted({ expand: { trigger: "double-click", depth: 1 } });
        assert.deepEqual(element.session.data.loads().at(-1)?.expand, { trigger: "double-click", depth: 1 });

        const first = await expandSeed(element);

        assert.deepEqual(first.params, { seeds: [PEOPLE_SEED.id], added: [4, 4], partial: true });
        assert.deepEqual(counts(element), [5, 4]);
    });

    it("expands on a single click when the trigger is click", async () => {
        const element = await mounted();
        element.layoutBehavior = { expand: { trigger: "click" } };
        const expanded = new Promise<SourceExpanded>((resolve) => {
            const off = element.session.on("source:expanded", (detail) => {
                off();
                resolve(detail);
            });
        });

        await click(element, seedAt(element));
        await expanded;

        assert.deepEqual(counts(element), [5, 4]);
    });

    it("src-58: fetches nothing on a click at a reopened file's node, whatever trigger the file names", async () => {
        const element = await reopened();
        let asked = 0;
        element.session.on("source:expand-start", () => {
            asked++;
        });
        element.session.on("source:expand-failed", () => {
            asked++;
        });

        // the file's own trigger is not taken, so a click is only a click: no expansion is even tried
        await click(element, seedAt(element));
        await element.waitForStableFrame();
        assert.strictEqual(asked, 0);
        assert.deepEqual(counts(element), [1, 0]);
    });

    it("src-58: refuses a click the page's own trigger asks for until the application runs the load", async () => {
        const element = await reopened();
        element.layoutBehavior = { expand: { trigger: "click" } };
        let started = 0;
        element.session.on("source:expand-start", () => {
            started++;
        });
        const refused = new Promise<string>((resolve) => {
            const off = element.session.on("source:expand-failed", ({ code }) => {
                off();
                resolve(code);
            });
        });

        await click(element, seedAt(element));
        assert.strictEqual(await refused, "E_SOURCE_PENDING");
        assert.strictEqual(started, 0, "nothing was fetched");
        assert.deepEqual(counts(element), [1, 0]);
    });
});
