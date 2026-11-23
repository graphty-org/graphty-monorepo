/**
 * Reading a drawing back for the fidelity comparison must not change how it is drawn. Under
 * `renderPath: "batched"` a node's `mesh` getter holds that node off its batch for good, so a
 * reader that touched `node.mesh` turned every batched row into an object row before the
 * comparison and the screenshot after it: the batched run of the fidelity corpus and the
 * graph-io-fidelity Storybook compared objects against objects and never covered a batch.
 */
import "../../src/graphty-element";

import { afterEach, assert, describe, it } from "vitest";

import { SPECIMEN_SAMPLES } from "../../../graph-io/test/fidelity/specimens/index";
import type { Graphty } from "../../index.js";
import { operationQueueOf } from "../../src/Graph";
import { type DrawnNode, readDrawn } from "../fidelity/drawn-scene";
import { drawnScene, mountSample, unmount } from "../fidelity/mount";
import { compareWithOracle } from "../fidelity/oracle/oracle-library";

// Of the samples with an oracle, the GML specimen sheets are the ones with a node whose file style a batch draws
// (every other file-styled node sets a border or a size mode, which keep it an object).
const SAMPLE = "gml-specimen-node-shapes";

const cleanups: (() => void)[] = [];

afterEach(() => {
    unmount();
    for (const cleanup of cleanups.splice(0)) {
        cleanup();
    }
});

/**
 * A plain graph every node of which a batch draws: nine nodes in three colors.
 * @returns the element
 */
async function plainGraph(): Promise<Graphty> {
    const element = document.createElement("graphty-element");
    element.style.cssText = "display:block;width:400px;height:300px";
    element.viewMode = "2d";
    element.renderPath = "batched";
    document.body.appendChild(element);
    cleanups.push(() => {
        element.remove();
    });
    await element.updateComplete;
    const nodes = Array.from({ length: 9 }, (_, id) => ({
        id,
        position: { x: (id % 3) * 2 - 2, y: Math.floor(id / 3) * 2 - 2, z: 0 },
    }));
    await element.session.data.addNodes(nodes);
    await element.graph.setLayout("fixed", { dim: 2 });
    for (const [i, color] of ["#e11d48", "#16a34a", "#2563eb"].entries()) {
        await element.session.styles.add({
            name: `tone ${color}`,
            target: "node",
            selector: { match: "ids", nodes: nodes.filter((n) => n.id % 3 === i).map((n) => n.id) },
            set: { "node.color": color },
        } as never);
    }
    await operationQueueOf(element.graph).waitForCompletion();
    await element.waitForStableFrame();
    return element;
}

/**
 * What the comparison reads of a node's body.
 * @param node - the drawn node
 * @returns its place, box, fill and visibility
 */
function body(node: DrawnNode | undefined): unknown {
    assert.isDefined(node);
    const r = (v: number): number => Math.round(v * 10) / 10;
    return {
        x: r(node.x),
        y: r(node.y),
        box: [r(node.box.x0), r(node.box.y0), r(node.box.x1), r(node.box.y1)],
        fill: node.fillDrawn,
        opacity: node.fillOpacity,
        visible: node.visible,
        shown: node.shown,
    };
}

describe("the fidelity comparison under renderPath batched", () => {
    it("leaves a sample's batched node on its batch", async () => {
        const sample = SPECIMEN_SAMPLES.find((s) => s.id === SAMPLE);
        assert.isDefined(sample);
        const { element, sha256, command } = await mountSample(sample);
        element.renderPath = "batched";
        await element.waitForStableFrame();
        const before = element.rowCounts.batchedNodes;
        assert.isAbove(before, 0, "the sheet's plain node is drawn by a node batch");

        drawnScene(element, sha256, command);
        await compareWithOracle(SAMPLE, element, sha256, command);
        await element.waitForStableFrame();

        assert.strictEqual(element.rowCounts.batchedNodes, before, "reading the drawing took no node off its batch");
    });

    it("reads a batched node as the objects path draws it, and leaves it batched", async () => {
        const element = await plainGraph();
        assert.strictEqual(element.rowCounts.batchedNodes, 9);
        const batched = readDrawn(element.graph);
        await element.waitForStableFrame();
        assert.strictEqual(element.rowCounts.batchedNodes, 9, "reading the drawing took no node off its batch");

        element.renderPath = "objects";
        await element.waitForStableFrame();
        assert.strictEqual(element.rowCounts.batchedNodes, 0);
        const objects = readDrawn(element.graph);
        assert.strictEqual(batched.nodes.size, 9);
        for (const id of objects.nodes.keys()) {
            assert.deepEqual(body(batched.nodes.get(id)), body(objects.nodes.get(id)), `node ${id}`);
        }
    });
});
