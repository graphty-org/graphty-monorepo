/**
 * @file An edge's tooltip, drawn while a real pointer is over the edge, on both render paths.
 *
 * `edge.tooltip` is a style option and nothing more: with no layer writing it, hovering an edge
 * draws nothing (the `graphty-edge-hover` event still says which edge the pointer is on). With a
 * layer, the words are drawn where the pointer met the line, on a straight, a curved and a
 * patterned line, in 2D and 3D, on `"objects"` and on `"batched"` (where a plain line has no `Edge`
 * object and none may be built to show its tooltip), and they go when the pointer leaves.
 */

import "../../src/graphty-element";

import type { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh.js";
import { afterEach, assert, describe, it } from "vitest";

import type { Graphty } from "../../index.js";
import type { EdgeEventDetail } from "../../src/events";
import * as graphModule from "../../src/Graph";
import { dataManagerInternals } from "../../src/managers/DataManager";
import { hover, nextFrame } from "../helpers/real-input";

/** The adapter the browser project was launched with; empty when it has no WebGPU. */
const ADAPTER = (import.meta.env as Record<string, string | undefined>).GRAPHTY_BROWSER_GPU ?? "";

/** Three edges, one of each kind of line, far enough apart that a pointer on one is on no other. */
const EDGES = [
    { src: "a", dst: "b", kind: "straight" },
    { src: "c", dst: "d", kind: "curved" },
    { src: "e", dst: "f", kind: "patterned" },
] as const;

/** Where the pointer rests when it is over nothing: the canvas's top-left corner. */
const NOWHERE = { x: 4, y: 4 };

const cleanups: (() => void)[] = [];

afterEach(() => {
    for (const cleanup of cleanups.splice(0)) {
        cleanup();
    }
});

/**
 * The three edges, drawn, with the curved one curved and the patterned one dashed.
 * @param path - The render path.
 * @param viewMode - The view.
 * @param renderer - The engine.
 * @returns The element, and each edge's id by its kind.
 */
async function threeEdges(
    path: "batched" | "objects",
    viewMode: "2d" | "3d",
    renderer: "webgl" | "webgpu",
): Promise<{ element: Graphty; ids: Record<(typeof EDGES)[number]["kind"], string> }> {
    const element = document.createElement("graphty-element");
    element.renderer = renderer;
    element.renderPath = path;
    element.directed = false;
    element.style.display = "block";
    element.style.width = "400px";
    element.style.height = "400px";
    document.body.appendChild(element);
    cleanups.push(() => {
        element.remove();
    });
    await element.updateComplete;
    await element.setViewMode(viewMode);
    await graphModule.operationQueueOf(element.graph).waitForCompletion();
    await element.session.data.addNodes(
        ["a", "b", "c", "d", "e", "f"].map((id, i) => ({
            id,
            position: { x: i % 2 === 0 ? -6 : 6, y: 8 - 8 * Math.floor(i / 2), z: 0 },
        })),
    );
    await element.session.data.addEdges(EDGES.map((edge) => ({ ...edge })));
    await element.graph.setLayout("fixed", { dim: viewMode === "2d" ? 2 : 3 });
    await graphModule.operationQueueOf(element.graph).waitForCompletion();

    const manager = element.graph.getDataManager();
    const idAt = (node: string): string => dataManagerInternals.incidentEdgeIds(manager, node)[0];
    const ids = { straight: idAt("a"), curved: idAt("c"), patterned: idAt("e") };
    await element.session.styles.add({
        name: "curve one",
        target: "edge",
        selector: { match: "ids", edges: [ids.curved] },
        set: { "edge.curvature": true },
    });
    await element.session.styles.add({
        name: "dash one",
        target: "edge",
        selector: { match: "ids", edges: [ids.patterned] },
        set: { "edge.style": "dash" },
    });
    await element.waitForStableFrame();
    return { element, ids };
}

/**
 * A point on an edge's drawn line: the middle of the run of pixels straight down the canvas through the
 * middle of its two nodes that `elementAt` finds the edge on, so a curved line is met on its curve.
 * @param element - The element.
 * @param from - One node.
 * @param to - The other.
 * @param id - The edge.
 * @returns The point, in CSS pixels.
 */
function onLine(element: Graphty, from: string, to: string, id: string): { x: number; y: number } {
    const a = element.nodeScreenPosition(from);
    const b = element.nodeScreenPosition(to);
    assert.isDefined(a);
    assert.isDefined(b);
    const x = ((a?.x ?? 0) + (b?.x ?? 0)) / 2;
    const hits: number[] = [];
    for (let y = 0; y < 400; y++) {
        const found = element.elementAt({ x, y });
        if (found?.kind === "edge" && found.id === id) {
            hits.push(y);
        }
    }

    assert.isNotEmpty(hits, `edge ${id} is drawn somewhere below x ${String(x)}`);
    return { x, y: hits[Math.floor(hits.length / 2)] };
}

/**
 * The tooltip planes on the scene: any rich-text plane, as the fixture draws no other words.
 * @param element - The element.
 * @returns They.
 */
function tooltips(element: Graphty): AbstractMesh[] {
    return element.graph.scene.meshes.filter((mesh) => mesh.name.startsWith("richTextPlane_") && !mesh.isDisposed());
}

/**
 * Move the real pointer and wait until the move has been answered: at once on WebGL and objects, once the
 * edge ID target is read back on `"batched"` WebGPU.
 * @param element - The element.
 * @param point - Where, in CSS pixels.
 */
async function pointTo(element: Graphty, point: { x: number; y: number }): Promise<void> {
    const target = element.graph.getEdgeIdTarget();
    const readsBefore = target?.counts.reads ?? 0;
    await hover(element, point);
    if (element.renderer === "webgpu" && target !== null) {
        while (target.counts.reads === readsBefore || target.counts.pending > 0) {
            await nextFrame();
        }
    }

    element.graph.scene.render();
}

describe("an edge tooltip a layer asks for, under a real pointer", () => {
    const cases: { path: "batched" | "objects"; viewMode: "2d" | "3d"; renderer: "webgl" | "webgpu" }[] = [];
    for (const path of ["objects", "batched"] as const) {
        for (const renderer of ["webgl", "webgpu"] as const) {
            for (const viewMode of ["2d", "3d"] as const) {
                cases.push({ path, viewMode, renderer });
            }
        }
    }

    for (const { path, viewMode, renderer } of cases) {
        it.skipIf(renderer === "webgpu" && ADAPTER === "")(
            `is drawn on a straight, a curved and a patterned edge on ${path}, ${viewMode}, ${renderer}`,
            async () => {
                const { element, ids } = await threeEdges(path, viewMode, renderer);
                const manager = element.graph.getDataManager();
                const builtBefore = dataManagerInternals.edgesBuilt(manager);
                const heard: EdgeEventDetail[] = [];
                element.addEventListener("graphty-edge-hover", (event) => {
                    heard.push(event.detail);
                });

                // No layer writes a tooltip: hovering says which edge, and draws nothing.
                const straight = onLine(element, "a", "b", ids.straight);
                await pointTo(element, NOWHERE);
                await pointTo(element, straight);
                assert.deepEqual(heard, [{ edgeId: ids.straight }], "the hover is heard, with no tooltip");
                assert.lengthOf(tooltips(element), 0, "and no tooltip is drawn without a style");

                await element.session.styles.add({
                    name: "what each edge is",
                    target: "edge",
                    selector: { match: "everything" },
                    encode: { "edge.tooltip": { template: ["{data.kind}"] } },
                });
                await element.waitForStableFrame();
                assert.lengthOf(tooltips(element), 0, "a tooltip is hover-only: nothing at rest");
                if (path === "batched") {
                    // A tooltip is not drawn by the line, so the straight line stays a row line with no `Edge`.
                    assert.isFalse(
                        dataManagerInternals.builtEdges(manager).has(ids.straight),
                        "a straight line with a tooltip is still drawn with no Edge",
                    );
                }

                for (const { src, dst, kind } of EDGES) {
                    const point = onLine(element, src, dst, ids[kind]);
                    heard.length = 0;
                    await pointTo(element, NOWHERE);
                    await pointTo(element, point);

                    assert.deepEqual(
                        heard,
                        [{ edgeId: ids[kind], tooltip: kind }],
                        `${kind}: the hover carries the words`,
                    );
                    const drawn = tooltips(element);
                    assert.lengthOf(drawn, 1, `${kind}: one tooltip is drawn`);
                    const [plane] = drawn;
                    assert.isTrue(plane.isEnabled() && plane.isVisible, `${kind}: and it is shown`);
                    plane.computeWorldMatrix(true);
                    const corners = plane
                        .getBoundingInfo()
                        .boundingBox.vectorsWorld.map((corner) => element.graph.worldToScreen(corner));
                    const xs = corners.map((corner) => corner.x);
                    const ys = corners.map((corner) => corner.y);
                    const near = 8;
                    assert.isTrue(
                        point.x >= Math.min(...xs) - near &&
                            point.x <= Math.max(...xs) + near &&
                            point.y >= Math.min(...ys) - near &&
                            point.y <= Math.max(...ys) + near,
                        `${kind}: drawn where the pointer met the line, at ${JSON.stringify(point)}, not over ` +
                            `x ${String(Math.min(...xs))}..${String(Math.max(...xs))}, ` +
                            `y ${String(Math.min(...ys))}..${String(Math.max(...ys))}`,
                    );

                    await pointTo(element, NOWHERE);
                    assert.lengthOf(tooltips(element), 0, `${kind}: the tooltip goes when the pointer leaves`);
                }

                if (path === "batched") {
                    // Only the patterned line is an `Edge` on "batched"; a tooltip builds none.
                    assert.strictEqual(
                        dataManagerInternals.edgesBuilt(manager),
                        builtBefore,
                        "showing a tooltip builds no Edge",
                    );
                }
            },
        );
    }
});
