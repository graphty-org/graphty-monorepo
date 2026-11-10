/**
 * @file The pointer on both render paths: a node a batch draws answers a click, a double-click
 * and a hover as a node drawn as a mesh of its own does, without a drag handler built for it until
 * the pointer reaches it (design/rendering/row-renderer.md, 4.4 and stage 9).
 *
 * Every input is made by the browser's own input pipeline (test/helpers/real-input.ts) and every
 * outcome is read through the element's public API, or counted.
 */

import "../../src/graphty-element";

import { ActionManager, ExecuteCodeAction } from "@babylonjs/core";
import { afterEach, assert, describe, it } from "vitest";

import type { Graphty } from "../../index.js";
import { setDefaultFeatures } from "../../src/features/resolve";
import { operationQueueOf } from "../../src/Graph";
import type { RenderPath } from "../../src/meshes/NodeBatch";
import { dragHandlersBuilt } from "../../src/NodeBehavior";
import type { SourceExpanded } from "../../src/session/sources/types";
import { loadRecordedSeed, PEOPLE_SEED } from "../../stories/fixtures/expand/source";
import { click, hover, type Point } from "../helpers/real-input";

// The expand test loads a network source, which sits behind the network-data experiment.
setDefaultFeatures(["network-data"]);

const WIDTH = 400;
const HEIGHT = 300;

const cleanups: (() => void)[] = [];

afterEach(() => {
    for (const cleanup of cleanups.splice(0)) {
        cleanup();
    }
});

/**
 * A mounted 2D element on one render path.
 * @param path - The path.
 * @returns The element.
 */
async function mounted(path: RenderPath): Promise<Graphty> {
    const element = document.createElement("graphty-element");
    element.renderPath = path;
    element.style.display = "block";
    element.style.width = `${String(WIDTH)}px`;
    element.style.height = `${String(HEIGHT)}px`;
    document.body.appendChild(element);
    cleanups.push(() => {
        element.remove();
    });
    await element.updateComplete;
    await operationQueueOf(element.graph).waitForCompletion();
    return element;
}

/**
 * Settle the element after a change.
 * @param element - The element.
 */
async function settled(element: Graphty): Promise<void> {
    await element.graph.setLayout("fixed", { dim: 2 });
    await element.setViewMode("2d");
    await operationQueueOf(element.graph).waitForCompletion();
    await element.waitForStableFrame();
}

/**
 * Where a node is drawn.
 * @param element - The element.
 * @param id - The node.
 * @returns Its center in CSS pixels from the element's top-left corner.
 */
function at(element: Graphty, id: string | number): Point {
    const position = element.nodeScreenPosition(id);
    assert.isDefined(position, `node ${String(id)} is drawn`);
    return { x: position.x, y: position.y };
}

/**
 * Say which path draws every node, so a check below is about the path it names.
 * @param element - The element.
 * @param path - The path.
 * @param nodes - How many nodes the graph holds.
 */
function drawnOn(element: Graphty, path: RenderPath, nodes: number): void {
    const { batchedNodes, objectNodes } = element.rowCounts;
    assert.deepEqual(
        { batchedNodes, objectNodes },
        path === "batched" ? { batchedNodes: nodes, objectNodes: 0 } : { batchedNodes: 0, objectNodes: nodes },
    );
}

describe("pointer on rows", () => {
    for (const path of ["objects", "batched"] as const) {
        describe(`on the ${path} path`, () => {
            it("builds a drag handler only for the node the pointer reaches", async () => {
                const element = await mounted(path);
                const before = dragHandlersBuilt();
                await element.session.data.addNodes(
                    Array.from({ length: 20 }, (_, id) => ({
                        id,
                        position: { x: (id % 5) * 3 - 6, y: Math.floor(id / 5) * 3 - 4, z: 0 },
                    })),
                );
                await settled(element);
                drawnOn(element, path, 20);
                assert.equal(dragHandlersBuilt() - before, 0, "no node has a handler before the pointer comes");

                await hover(element, at(element, 7));
                await element.waitForStableFrame();

                assert.equal(dragHandlersBuilt() - before, 1, "the hovered node has one");
                assert.equal(element.session.selection.hovered, 7);
            });

            it("expands a node once on a click, a batched row through the roster", async () => {
                const element = await mounted(path);
                await loadRecordedSeed(element.session, "recorded", { position: { x: 0, y: 0, z: 0 } });
                await settled(element);
                drawnOn(element, path, 1);
                if (path === "batched") {
                    // A batched row answers without its mesh's actions, which go with the mesh in
                    // stage 11: take them off the hidden proxy now, so only the roster can answer.
                    // Through `drawnPickMesh`: a read of `mesh` would make the seed an object row.
                    const seed = element.graph.getNode(PEOPLE_SEED.id);
                    assert.isDefined(seed);
                    const own = seed.drawnPickMesh;
                    if (own !== null) {
                        own.actionManager = null;
                    }
                }

                element.layoutBehavior = { expand: { trigger: "click" } };
                let expansions = 0;
                const expanded = new Promise<SourceExpanded>((resolve) => {
                    element.session.on("source:expanded", (detail) => {
                        expansions++;
                        resolve(detail);
                    });
                });

                await click(element, at(element, PEOPLE_SEED.id));
                await expanded;
                await operationQueueOf(element.graph).waitForCompletion();
                await element.waitForStableFrame();

                assert.equal(expansions, 1);
                const snapshot = element.session.data.store.getSnapshot();
                assert.deepEqual([snapshot.nodeCount, snapshot.edgeCount], [5, 4]);
            });

            it("runs an action a consumer put on a node's mesh", async () => {
                const element = await mounted(path);
                await element.session.data.addNodes([{ id: "a", position: { x: 0, y: 0, z: 0 } }]);
                await settled(element);
                drawnOn(element, path, 1);
                const picked: string[] = [];
                const node = element.graph.getNode("a");
                assert.isDefined(node);
                const actions = node.mesh.actionManager;
                assert.instanceOf(actions, ActionManager, "the node's mesh carries the shared actions");
                actions.registerAction(
                    new ExecuteCodeAction({ trigger: ActionManager.OnPickTrigger }, (event) => {
                        const meta = event.source as { metadata?: { graphNode?: { id: unknown } } };
                        picked.push(String(meta.metadata?.graphNode?.id));
                    }),
                );

                await click(element, at(element, "a"));

                assert.deepEqual(picked, ["a"]);
                assert.equal(element.graph.rowCounts.objectNodes, 1, "a read of the mesh keeps the node on it");
            });
        });
    }
});
