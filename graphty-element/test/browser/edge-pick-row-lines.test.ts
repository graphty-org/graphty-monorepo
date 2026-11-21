/**
 * @file Picking a plain edge with a real pointer, on both render paths.
 *
 * On the `"batched"` path a plain edge (no arrowhead, dash or label) is drawn as a row line, with no `Edge`
 * object. It must be hovered, clicked and found by `elementAt` exactly as on `"objects"`, and picking it must
 * build no `Edge`. An undirected graph draws every edge plain.
 */

import "../../src/graphty-element";

import { Vector3 } from "@babylonjs/core/Maths/math.vector.js";
import { afterEach, assert, describe, it } from "vitest";

import type { Graphty } from "../../index.js";
import { operationQueueOf, renderManagerOf } from "../../src/Graph";
import { dataManagerInternals } from "../../src/managers/DataManager";
import { edgePickWork } from "../../src/render/PickService";
import { click, hover, nextFrame } from "../helpers/real-input";

/** The adapter the browser project was launched with; empty when it has no WebGPU. */
const ADAPTER = (import.meta.env as Record<string, string | undefined>).GRAPHTY_BROWSER_GPU ?? "";

const cleanups: (() => void)[] = [];

afterEach(() => {
    for (const cleanup of cleanups.splice(0)) {
        cleanup();
    }
});

type Antialias = boolean | "at-rest" | "shader";

/**
 * Two parallel undirected edges, a-b above c-d, drawn.
 * @param path - The render path.
 * @param viewMode - The view.
 * @param renderer - The engine.
 * @param antialias - How the canvas multisamples, which picks the line program on `"batched"`.
 * @returns The element.
 */
async function plainEdges(
    path: "batched" | "objects",
    viewMode: "2d" | "3d",
    renderer: "webgl" | "webgpu",
    antialias: Antialias = true,
): Promise<Graphty> {
    const element = document.createElement("graphty-element");
    element.renderer = renderer;
    element.renderPath = path;
    element.antialias = antialias;
    element.directed = false;
    element.style.display = "block";
    element.style.width = "500px";
    element.style.height = "400px";
    document.body.appendChild(element);
    cleanups.push(() => {
        element.remove();
    });
    await element.updateComplete;
    await element.setViewMode(viewMode);
    await operationQueueOf(element.graph).waitForCompletion();
    await element.session.data.addNodes([
        { id: "a", position: { x: -6, y: 3, z: 0 } },
        { id: "b", position: { x: 6, y: 3, z: 0 } },
        { id: "c", position: { x: -6, y: -3, z: 0 } },
        { id: "d", position: { x: 6, y: -3, z: 0 } },
    ]);
    await element.session.data.addEdges([
        { src: "a", dst: "b" },
        { src: "c", dst: "d" },
    ]);
    await element.graph.setLayout("fixed", { dim: viewMode === "2d" ? 2 : 3 });
    await operationQueueOf(element.graph).waitForCompletion();
    await element.waitForStableFrame();
    return element;
}

/**
 * Click with a real pointer and wait until the click has done what it does: on `"batched"` WebGPU a click whose
 * point no read of the edge ID target answers waits for one, a frame or more later.
 * @param element - The element.
 * @param point - Where, in CSS pixels.
 * @param options - Modifier keys.
 * @param options.shift - Hold Shift.
 */
async function clickSettled(
    element: Graphty,
    point: { x: number; y: number },
    options?: { shift?: boolean },
): Promise<void> {
    await click(element, point, options);
    const target = element.graph.getEdgeIdTarget();
    while (target !== null && target.counts.pending > 0) {
        await nextFrame();
    }

    await operationQueueOf(element.graph).waitForCompletion();
}

/**
 * The middle of the line between two nodes, read off the row table (no `Edge` is built).
 * @param element - The element.
 * @param from - One node.
 * @param to - The other.
 * @returns The point, in CSS pixels.
 */
function between(element: Graphty, from: string, to: string): { x: number; y: number } {
    const a = element.nodeScreenPosition(from);
    const b = element.nodeScreenPosition(to);
    assert.isDefined(a);
    assert.isDefined(b);
    return { x: ((a?.x ?? 0) + (b?.x ?? 0)) / 2, y: ((a?.y ?? 0) + (b?.y ?? 0)) / 2 };
}

describe("picking a plain edge with a real pointer", () => {
    const cases: {
        path: "batched" | "objects";
        viewMode: "2d" | "3d";
        renderer: "webgl" | "webgpu";
        antialias?: Antialias;
    }[] = [];
    for (const path of ["objects", "batched"] as const) {
        for (const renderer of ["webgl", "webgpu"] as const) {
            for (const viewMode of ["2d", "3d"] as const) {
                cases.push({ path, viewMode, renderer });
            }
        }
    }

    // The lean line program, the shader-smoothed one, and lean while moving, on each engine and view.
    for (const antialias of [false, "shader", "at-rest"] as const) {
        for (const renderer of ["webgl", "webgpu"] as const) {
            for (const viewMode of ["2d", "3d"] as const) {
                cases.push({ path: "batched", viewMode, renderer, antialias });
            }
        }
    }

    for (const { path, viewMode, renderer, antialias } of cases) {
        it.skipIf(renderer === "webgpu" && ADAPTER === "")(
            `hovers, finds and selects it on ${path}, ${viewMode}, ${renderer}, antialias ${String(antialias ?? true)}`,
            async () => {
                const element = await plainEdges(path, viewMode, renderer, antialias);
                const { graph } = element;
                const canvas = graph.scene.getEngine().getInputElement();
                assert.isNotNull(canvas);
                const manager = graph.getDataManager();
                const [ab] = dataManagerInternals.incidentEdgeIds(manager, "a");
                const [cd] = dataManagerInternals.incidentEdgeIds(manager, "c");
                if (path === "batched") {
                    assert.strictEqual(element.rowCounts.pulledEdges, 2, "both edges are row lines");
                    assert.strictEqual(dataManagerInternals.edgesLive(manager), 0, "no Edge is built");
                }

                const top = between(element, "a", "b");
                const bottom = between(element, "c", "d");

                // Hover: the cursor says the line is there.
                await hover(element, { x: 5, y: 5 });
                await element.waitForStableFrame();
                const target = graph.getEdgeIdTarget();
                const readsBefore = target?.counts.reads ?? 0;
                await hover(element, top);
                // On WebGPU the hover answers once the edge ID target is read back, a frame or more after the move
                // is handled (and the browser may hand the move over only at the next frame): wait until the cursor
                // shows the line or a read of the target has come back without it. WebGL and objects answer at once.
                if (path === "batched" && renderer === "webgpu") {
                    while (
                        canvas?.style.cursor !== "pointer" &&
                        (target === null || target.counts.reads === readsBefore || target.counts.pending > 0)
                    ) {
                        await nextFrame();
                    }
                }

                assert.strictEqual(canvas?.style.cursor, "pointer", "the cursor shows the line");
                assert.deepEqual(element.elementAt(top), { kind: "edge", id: ab }, "elementAt finds the top edge");
                assert.deepEqual(element.elementAt(bottom), { kind: "edge", id: cd }, "and the bottom one");
                if (path === "batched") {
                    assert.strictEqual(
                        dataManagerInternals.edgesLive(manager),
                        0,
                        "a hover or elementAt builds no Edge",
                    );
                }

                // A node is selected; a click on an edge replaces it with the edge.
                const node = element.nodeScreenPosition("c");
                await clickSettled(element, { x: node?.x ?? 0, y: node?.y ?? 0 });
                assert.deepEqual(element.session.selection.nodes, ["c"], "the node is selected first");
                await clickSettled(element, bottom);
                assert.deepEqual(element.session.selection.edges, [cd], "the click selects the edge");
                assert.deepEqual(element.session.selection.nodes, [], "and replaces the node");

                // Shift adds the other edge.
                await clickSettled(element, top, { shift: true });
                assert.sameMembers([...element.session.selection.edges], [ab, cd], "shift adds the top edge");
            },
        );
    }
});

describe("the work of a plain edge pick on batched", () => {
    /** A 20 by 20 grid of short vertical lines, each its own pair of nodes. */
    const LINES = 400;

    /**
     * Wait until a hover's read of the edge ID target has come back: at once on WebGL, a frame or more later on
     * WebGPU.
     * @param element - The element.
     * @param readsBefore - The target's reads before the move.
     */
    async function readBack(element: Graphty, readsBefore: number): Promise<void> {
        const target = element.graph.getEdgeIdTarget();
        assert.isNotNull(target);
        while (target !== null && (target.counts.reads === readsBefore || target.counts.pending > 0)) {
            await nextFrame();
        }
    }

    /**
     * The grid of lines, drawn on `"batched"`.
     * @param renderer - The engine.
     * @param viewMode - The view.
     * @returns The element, and the nodes as added.
     */
    async function lineGrid(
        renderer: "webgl" | "webgpu",
        viewMode: "2d" | "3d",
    ): Promise<{ element: Graphty; nodes: { id: string; position: { x: number; y: number; z: number } }[] }> {
        const element = document.createElement("graphty-element");
        element.renderer = renderer;
        element.renderPath = "batched";
        element.directed = false;
        element.style.display = "block";
        element.style.width = "500px";
        element.style.height = "400px";
        document.body.appendChild(element);
        cleanups.push(() => {
            element.remove();
        });
        await element.updateComplete;
        await element.setViewMode(viewMode);
        await operationQueueOf(element.graph).waitForCompletion();
        const nodes = Array.from({ length: LINES * 2 }, (_, i) => {
            const line = Math.floor(i / 2);
            return {
                id: `n${String(i)}`,
                position: {
                    x: (line % 20) * 5,
                    y: Math.floor(line / 20) * 4 + (i % 2 === 0 ? 1.5 : -1.5),
                    z: 0,
                },
            };
        });
        const edges = Array.from({ length: LINES }, (_, i) => ({
            src: `n${String(i * 2)}`,
            dst: `n${String(i * 2 + 1)}`,
        }));
        await element.session.data.addNodes(nodes);
        await element.session.data.addEdges(edges);
        await element.graph.setLayout("fixed", { dim: viewMode === "2d" ? 2 : 3 });
        await operationQueueOf(element.graph).waitForCompletion();
        await element.waitForStableFrame();
        return { element, nodes };
    }

    for (const [renderer, viewMode] of [
        ["webgl", "2d"],
        ["webgpu", "2d"],
        ["webgl", "3d"],
        ["webgpu", "3d"],
    ] as const) {
        it.skipIf(renderer === "webgpu" && ADAPTER === "")(
            `measures only the lines near a hover and a press, and builds no Edge, on ${renderer}, ${viewMode}`,
            async () => {
                const { element, nodes } = await lineGrid(renderer, viewMode);
                const manager = element.graph.getDataManager();
                assert.strictEqual(element.rowCounts.pulledEdges, LINES, "every edge is a row line");
                const canvas = element.graph.scene.getEngine().getInputElement();
                const reads = (): number => element.graph.getEdgeIdTarget()?.counts.reads ?? 0;

                // The first move may rebuild and draw the edge ID target.
                let before = reads();
                await hover(element, { x: 2, y: 2 });
                await readBack(element, before);
                await element.waitForStableFrame();
                const empty = edgePickWork.rowLines;
                before = reads();
                await hover(element, { x: 3, y: 3 });
                await readBack(element, before);
                assert.strictEqual(edgePickWork.rowLines - empty, 0, "over empty canvas no line is measured");

                const mid = between(element, "n420", "n421");
                const near = edgePickWork.rowLines;
                before = reads();
                await hover(element, mid);
                await readBack(element, before);
                const measured = edgePickWork.rowLines - near;
                assert.isAbove(measured, 0, "the line under the pointer is measured");
                assert.isBelow(measured, 10, "only the lines near the pointer are measured");
                assert.strictEqual(canvas?.style.cursor, "pointer", "the cursor shows the line");
                assert.strictEqual(dataManagerInternals.edgesLive(manager), 0, "a hover builds no Edge");

                // A press where the pointer rests: WebGL reads the target now, WebGPU takes the hover's read.
                const [id] = dataManagerInternals.incidentEdgeIds(manager, "n420");
                const beforePress = edgePickWork.rowLines;
                assert.deepEqual(element.elementAt(mid), { kind: "edge", id }, "elementAt names the line");
                const pressed = edgePickWork.rowLines - beforePress;
                assert.isAbove(pressed, 0, "elementAt measures the line under the point");
                assert.isBelow(pressed, 10, "and only the lines near it, as a hover does");
                assert.strictEqual(dataManagerInternals.edgesLive(manager), 0, "elementAt builds no Edge");
                const beforeClick = edgePickWork.rowLines;
                await clickSettled(element, mid);
                assert.deepEqual(element.session.selection.edges, [id], "the click selects it");
                assert.isBelow(edgePickWork.rowLines - beforeClick, 20, "the click measures only lines near it");
                assert.isAtMost(
                    dataManagerInternals.edgesLive(manager),
                    1,
                    "no Edge but at most the selected one is built",
                );

                // Clear the selection, rest the pointer on the line again, and pan the next line under it: the
                // hover's read no longer answers, and the press finds the line that is there now.
                await clickSettled(element, { x: 3, y: 3 });
                assert.deepEqual(element.session.selection.edges, [], "a click on empty canvas clears it");
                await element.waitForStableFrame();
                before = reads();
                await hover(element, mid);
                await readBack(element, before);
                // A Node built now, as a selection or a hover builds one lazily, moves no line: the hover's read
                // still answers the press (a Node built into its row used to throw that read away).
                assert.isUndefined(dataManagerInternals.builtNode(manager, "n0"), "n0 has no Node yet");
                dataManagerInternals.buildRow(manager, "n0");
                assert.isDefined(dataManagerInternals.builtNode(manager, "n0"), "n0 has its Node now");
                const rested = edgePickWork.rowLines;
                assert.deepEqual(element.elementAt(mid), { kind: "edge", id }, "the line is found again");
                assert.isBelow(edgePickWork.rowLines - rested, 10, "by the lines near the point");

                // Rows written into the edge ID target so far, to count what the next selection and its clearing write.
                const target = element.graph.getEdgeIdTarget();
                assert.isNotNull(target);
                const written = target?.counts.rowsWritten ?? Number.NaN;

                // Move the rows instead: the line under the pointer goes into the gap beside it and the next line
                // takes its place. The hover's read no longer answers, and the press finds the line there now.
                const [nextId] = dataManagerInternals.incidentEdgeIds(manager, "n422");
                const live = dataManagerInternals.edgesLive(manager);
                const at = (i: number): { x: number; y: number; z: number } => nodes[i].position;
                await element.session.positions.set([
                    { id: "n420", ...at(420), x: at(420).x + 2.5 },
                    { id: "n421", ...at(421), x: at(421).x + 2.5 },
                    { id: "n422", ...at(420) },
                    { id: "n423", ...at(421) },
                ]);
                await operationQueueOf(element.graph).waitForCompletion();
                await element.waitForStableFrame();
                const swapped = between(element, "n422", "n423");
                assert.closeTo(swapped.x, mid.x, 1, "the next line is where the pointer rests");
                assert.closeTo(swapped.y, mid.y, 1, "on both axes");
                assert.deepEqual(
                    element.elementAt(mid),
                    { kind: "edge", id: nextId },
                    "elementAt names the moved-in line",
                );
                assert.strictEqual(dataManagerInternals.edgesLive(manager), live, "and builds no Edge for it");

                // A click there, with no read taken since the rows moved: it measures only the lines near it (on
                // WebGPU it waits for the target's read rather than measuring every line) and selects the line.
                const beforeMovedClick = edgePickWork.rowLines;
                await clickSettled(element, mid);
                assert.deepEqual(element.session.selection.edges, [nextId], "the click selects the moved-in line");
                assert.isBelow(edgePickWork.rowLines - beforeMovedClick, 20, "measuring only the lines near it");
                await clickSettled(element, { x: 3, y: 3 });
                assert.isAtMost(
                    (target?.counts.rowsWritten ?? Number.NaN) - written,
                    8,
                    "a selection and its clearing rewrite the rows they change in the edge ID target, not every line",
                );
                if (viewMode === "3d") {
                    return;
                }

                // Back, then pan the camera so the next line lies under the pointer.
                await element.session.positions.set([
                    { id: "n420", ...at(420) },
                    { id: "n421", ...at(421) },
                    { id: "n422", ...at(422) },
                    { id: "n423", ...at(423) },
                ]);
                await operationQueueOf(element.graph).waitForCompletion();
                await element.waitForStableFrame();
                before = reads();
                await hover(element, mid);
                await readBack(element, before);
                assert.deepEqual(element.elementAt(mid), { kind: "edge", id }, "the first line is back");
                const next = between(element, "n422", "n423");
                const state = element.getCameraState();
                const pan = state.pan ?? { x: 0, y: 0 };
                await element.setCameraState({ pan: { x: pan.x + 1, y: pan.y } }, { animate: false });
                await element.waitForStableFrame();
                const perUnit = between(element, "n420", "n421").x - mid.x;
                assert.notStrictEqual(perUnit, 0, "the pan moves the lines");
                await element.setCameraState(
                    { pan: { x: pan.x + (mid.x - next.x) / perUnit, y: pan.y } },
                    { animate: false },
                );
                await element.waitForStableFrame();
                const moved = between(element, "n422", "n423");
                assert.closeTo(moved.x, mid.x, 1, "the next line is under the pointer now");
                assert.deepEqual(element.elementAt(mid), { kind: "edge", id: nextId }, "elementAt names it");
            },
        );
    }

    for (const viewMode of ["2d", "3d"] as const) {
        it.skipIf(ADAPTER === "")(
            `elementAt measures only the lines near a point no hover read, still and moving, on webgpu, ${viewMode}`,
            async () => {
                const { element, nodes } = await lineGrid("webgpu", viewMode);
                const manager = element.graph.getDataManager();
                const target = element.graph.getEdgeIdTarget();
                assert.isNotNull(target);
                if (target === null) {
                    return;
                }

                /** Wait until every whole read of the edge ID target the frames drawn so far sent has come back. */
                const wholeBack = async (): Promise<void> => {
                    await element.waitForStableFrame();
                    while (target.counts.wholeReads === 0 || target.counts.wholePending > 0) {
                        await nextFrame();
                    }
                };

                // A hover starts no whole reads; the first elementAt (here over empty canvas) does.
                const { reads } = target.counts;
                await hover(element, { x: 2, y: 2 });
                await readBack(element, reads);
                await element.waitForStableFrame();
                assert.strictEqual(target.counts.wholeReads + target.counts.wholePending, 0, "a hover reads no whole");
                assert.isNull(element.elementAt({ x: 2, y: 2 }), "nothing is at the corner");
                await wholeBack();

                // elementAt where no hover has been: WebGPU cannot read the target now, and the whole read answers.
                const mid = between(element, "n210", "n211");
                const [id] = dataManagerInternals.incidentEdgeIds(manager, "n210");
                let before = edgePickWork.rowLines;
                assert.deepEqual(element.elementAt(mid), { kind: "edge", id }, "elementAt names the line");
                assert.isAbove(edgePickWork.rowLines - before, 0, "it measures the line under the point");
                assert.isBelow(edgePickWork.rowLines - before, 10, "and only the lines near it");

                // Move the rows: the next line takes the place of the first. Once a frame has drawn them, the read of
                // that frame answers.
                const [nextId] = dataManagerInternals.incidentEdgeIds(manager, "n212");
                const at = (i: number): { x: number; y: number; z: number } => nodes[i].position;
                await element.session.positions.set([
                    { id: "n210", ...at(210), x: at(210).x + 2.5 },
                    { id: "n211", ...at(211), x: at(211).x + 2.5 },
                    { id: "n212", ...at(210) },
                    { id: "n213", ...at(211) },
                ]);
                await operationQueueOf(element.graph).waitForCompletion();
                await wholeBack();
                before = edgePickWork.rowLines;
                assert.deepEqual(element.elementAt(mid), { kind: "edge", id: nextId }, "it names the moved-in line");
                assert.isBelow(edgePickWork.rowLines - before, 10, "measuring only the lines near it");
                assert.strictEqual(dataManagerInternals.edgesLive(manager), 0, "no Edge is built");
                if (viewMode === "3d") {
                    return;
                }

                // Pan a little, and ask in the very frame that draws the pan, before any read of it can come back (as
                // while a layout or the camera keeps moving): the read of the picture before it answers.
                const { activeCamera: camera } = element.graph.scene;
                assert.isNotNull(camera);
                const asked = await new Promise<{ hit: unknown; lines: number }>((resolve) => {
                    element.graph.scene.onAfterRenderObservable.addOnce(() => {
                        const start = edgePickWork.rowLines;
                        const hit = element.elementAt(mid);
                        resolve({ hit, lines: edgePickWork.rowLines - start });
                    });
                    if (camera !== null) {
                        camera.position.x += 0.3;
                    }

                    renderManagerOf(element.graph).requestFrame();
                });
                assert.deepEqual(asked.hit, { kind: "edge", id: nextId }, "the line is still found");
                assert.isAbove(asked.lines, 0, "it is measured");
                assert.isBelow(asked.lines, 40, "with only the lines near it, from the read before the pan");

                // Pan farther than the wider window covers (two columns of lines, about 45 pixels) and ask in the
                // frame that draws it: the read before the pan names no line under the point now, so every line is
                // measured, and the answer is the one the settled picture gives.
                await wholeBack();
                const far = await new Promise<{ hit: unknown; lines: number }>((resolve) => {
                    element.graph.scene.onAfterRenderObservable.addOnce(() => {
                        const start = edgePickWork.rowLines;
                        const hit = element.elementAt(mid);
                        resolve({ hit, lines: edgePickWork.rowLines - start });
                    });
                    if (camera !== null) {
                        camera.position.x += 10;
                    }

                    renderManagerOf(element.graph).requestFrame();
                });
                await wholeBack();
                const settled = element.elementAt(mid);
                assert.isNotNull(settled, "a line lies under the point after the pan");
                assert.deepEqual(
                    far.hit,
                    settled,
                    "in the frame of the pan elementAt names the line the settled picture does",
                );
                assert.isAtLeast(far.lines, LINES, "found by measuring every line");

                // With no elementAt asking, the whole reads stop after a bounded number of changed frames.
                const panned = async (): Promise<void> => {
                    await new Promise<void>((resolve) => {
                        element.graph.scene.onAfterRenderObservable.addOnce(() => {
                            resolve();
                        });
                        if (camera !== null) {
                            camera.position.x += 0.01;
                        }

                        renderManagerOf(element.graph).requestFrame();
                    });
                };
                const sent = (): number => target.counts.wholeReads + target.counts.wholePending;
                const first = sent();
                for (let i = 0; i < 70; i++) {
                    await panned();
                }
                await wholeBack();
                const stopped = sent();
                assert.isAbove(stopped, first, "changed frames are read while elementAt asked lately");
                assert.isAtMost(stopped - first, 61, "at most 60 reads after the last question");
                for (let i = 0; i < 5; i++) {
                    await panned();
                }
                assert.strictEqual(sent(), stopped, "then changed frames are read no more");
            },
        );
    }
});

describe("picking a curved edge, and a line while the layout moves it", () => {
    const engines: { path: "batched" | "objects"; renderer: "webgl" | "webgpu" }[] = [];
    for (const path of ["objects", "batched"] as const) {
        for (const renderer of ["webgl", "webgpu"] as const) {
            engines.push({ path, renderer });
        }
    }

    for (const { path, renderer } of engines) {
        it.skipIf(renderer === "webgpu" && ADAPTER === "")(
            `hovers, finds and selects a curved edge on ${path}, ${renderer}`,
            async () => {
                const element = await plainEdges(path, "2d", renderer);
                const { graph } = element;
                await element.session.styles.add({
                    name: "curved",
                    target: "edge",
                    selector: { match: "everything" },
                    set: { "edge.curvature": true },
                });
                await operationQueueOf(graph).waitForCompletion();
                await element.waitForStableFrame();
                const manager = graph.getDataManager();
                const [ab] = dataManagerInternals.incidentEdgeIds(manager, "a");
                const edge = manager.edges.get(ab);
                const curve = edge?.drawnCurve ?? null;
                assert.isNotNull(curve, "the edge is drawn as a curve");
                // The curve's middle, off the straight line between its nodes: graph-root's space to the world.
                const root = graph.scene.getTransformNodeByName("graph-root")?.computeWorldMatrix(true);
                const middle = (curve ?? [])[Math.floor((curve ?? []).length / 2)];
                const world = root === undefined ? middle : Vector3.TransformCoordinates(middle, root);
                const point = graph.worldToScreen(world);
                const straight = between(element, "a", "b");
                assert.isAbove(Math.hypot(point.x - straight.x, point.y - straight.y), 8, "the curve bows away");

                const canvas = graph.scene.getEngine().getInputElement();
                const target = graph.getEdgeIdTarget();
                const readsBefore = target?.counts.reads ?? 0;
                await hover(element, point);
                if (path === "batched" && renderer === "webgpu") {
                    while (
                        canvas?.style.cursor !== "pointer" &&
                        (target === null || target.counts.reads === readsBefore || target.counts.pending > 0)
                    ) {
                        await nextFrame();
                    }
                }

                assert.strictEqual(canvas?.style.cursor, "pointer", "the cursor shows the curve");
                assert.deepEqual(element.elementAt(point), { kind: "edge", id: ab }, "elementAt finds it");
                assert.isNull(element.elementAt(straight), "nothing is on the straight line it no longer takes");
                await clickSettled(element, point);
                assert.deepEqual(element.session.selection.edges, [ab], "the click selects it");
            },
        );

        it.skipIf(renderer === "webgpu" && ADAPTER === "")(
            `finds a plain line where a running layout has moved it on ${path}, ${renderer}`,
            async () => {
                const element = document.createElement("graphty-element");
                element.renderer = renderer;
                element.renderPath = path;
                element.directed = false;
                element.style.display = "block";
                element.style.width = "500px";
                element.style.height = "400px";
                document.body.appendChild(element);
                cleanups.push(() => {
                    element.remove();
                });
                await element.updateComplete;
                await element.setViewMode("2d");
                await operationQueueOf(element.graph).waitForCompletion();
                await element.session.data.addNodes([{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }]);
                await element.session.data.addEdges([{ src: "a", dst: "b" }]);
                await element.graph.setLayout("ngraph", { dim: 2, seed: 7 });
                const manager = element.graph.getDataManager();
                const [ab] = dataManagerInternals.incidentEdgeIds(manager, "a");

                // Each frame the layout runs, rest the pointer on the line where it is drawn now, then ask what
                // is there: a press after the rows moved cannot use a read taken before they did.
                let whileRunning = 0;
                while (element.graph.isRunning()) {
                    await nextFrame();
                    if (!element.graph.isRunning()) {
                        continue;
                    }

                    const mid = between(element, "a", "b");
                    const a = element.nodeScreenPosition("a");
                    if (a === undefined || Math.hypot(a.x - mid.x, a.y - mid.y) < 12) {
                        continue;
                    }

                    assert.deepEqual(element.elementAt(mid), { kind: "edge", id: ab }, "elementAt finds the line");
                    whileRunning++;
                }

                assert.isAbove(whileRunning, 0, "the line was asked for while the layout moved it");
                if (path === "batched") {
                    assert.strictEqual(dataManagerInternals.edgesLive(manager), 0, "no Edge is built");
                }
            },
        );
    }
});
