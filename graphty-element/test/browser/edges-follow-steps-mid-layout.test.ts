/**
 * @file Edges follow their nodes on every frame after a step taken part way through a running
 * ngraph layout, on both render paths, in 2D and 3D. The steps call `getNode` and `getEdges` on
 * purpose; others remove a node, an edge, a node and then add one, or undo and redo a removal: a
 * removal renumbers the batched rows while the layout places nodes by row, so they also check that
 * each kept node keeps its own place in layout space across the step (undo stops the layout by
 * design, so those steps check the picture at rest instead).
 *
 * The steps include a real wheel zoom, a real drag on empty canvas (it turns the 3D camera and pans
 * the 2D one) and a resize of the element; a node pushed past the canvas's edge by one of them is
 * not required to be drawn. A last case removes the element while ngraph runs, inserts it again in
 * a later task (a new engine, row table and picking buffers), checks the frames of the layout it
 * resumes and hovers nodes with the real mouse.
 *
 * Run (from graphty-element):
 *   ../tools/with-browser.sh ../tools/low-priority.sh npx vitest run --project=browser test/browser/edges-follow-steps-mid-layout.test.ts
 * and the same with --project=minimum-work, which splits each change across frames. The file sets
 * each case's render path itself, so "forced-batched" skips it. A failing frame is printed as a PNG
 * data URL with the node centers the element reported in it. The fixture and the frame checks are
 * in test/helpers/edges-follow.ts.
 */

import { afterEach, assert, describe, it, vi } from "vitest";

import type { Graphty } from "../../index.js";
import { operationQueueOf } from "../../src/Graph";
import { minimumWorkPerFrame, setMinimumWorkPerFrame } from "../../src/managers/minimumWork";
import { drawnFrames } from "../helpers/drawn-frames";
import { furthestMove, keptPlaceJump, layoutPlaces } from "../helpers/drawn-invariants";
import {
    addInk,
    assertAtRest,
    assertFollowed,
    assertLazy,
    checkWhileMoving,
    cleanUp,
    cleanups,
    everything,
    IDS,
    JOINS,
    mounted,
    type Pair,
    type Shown,
    SIZE,
} from "../helpers/edges-follow";
import { drag, hover, nodePoint, wheel } from "../helpers/real-input";
import { edgeBetween } from "../helpers/testSetup";

afterEach(cleanUp);

/** One step taken part way through a running layout, and what is shown after it. */
interface AndThen {
    /** What the step is. */
    name: string;
    /** Take the step. */
    step: (element: Graphty) => Promise<void>;
    /** What is shown once it is taken; everything by default. */
    after?: (element: Graphty) => Shown;
    /**
     * Frames drawn while the step is being taken are left unchecked: a removal or an undo is drawn in some frame
     * before its promise settles, and neither the old nor the new list of what is shown holds for that frame alone
     * (a removed node has no place left to look for stray ink at). Every frame after the step settles is checked.
     */
    uncheckedWhileTaken?: boolean;
    /**
     * The step stops the layout: undo and redo stop a running layout and put back the arrangement the history
     * holds (design/undo/undo-design.md section 6.2), as the build from before the renderer optimizations does. The
     * frames after it are checked while anything still moves, then the picture at rest.
     */
    stopsLayout?: boolean;
    /**
     * Every node the step keeps keeps its own place in layout space across the step (checked by
     * {@link keptPlaceJump}): rows renumbered under a running layout must not hand one node another's place.
     */
    keepsPlaces?: boolean;
}

/** Moving frames a removal step must be followed by, checked: the renumbered rows' first landings and more. */
const STEP_FRAMES = 5;

/** The nodes kept by the filter step: the first six pairs. */
const KEPT: readonly string[] = IDS.slice(0, 12);

/**
 * The id the element gave an edge of the arrow fixture: it numbers edges in the order they were added, and
 * {@link mounted} adds them in one write, in the order {@link JOINS} lists them. Read this way, not through
 * `edgeBetween`, so removing an edge does not first build its Edge object.
 * @param pair - The edge.
 * @returns Its id.
 */
function fixtureEdgeId(pair: Pair): string {
    const i = JOINS.findIndex(([a, b]) => a === pair[0] && b === pair[1]);
    assert.isAtLeast(i, 0, `${pair.join("-")} is a fixture edge`);
    return String(i);
}

/**
 * What the arrow fixture shows once some nodes (and every edge touching one) and some edges are gone and others
 * added.
 * @param gone - The nodes removed.
 * @param goneEdges - The edges removed.
 * @param added - The nodes and undirected edges added.
 * @param added.ids - The nodes.
 * @param added.pairs - The edges.
 * @returns What is shown.
 */
function shownWithout(
    gone: readonly string[],
    goneEdges: readonly Pair[] = [],
    added: { ids: readonly string[]; pairs: readonly Pair[] } = { ids: [], pairs: [] },
): Shown {
    const all = everything("arrow");
    const kept = (pair: Pair): boolean =>
        !pair.some((id) => gone.includes(id)) && !goneEdges.some(([a, b]) => a === pair[0] && b === pair[1]);
    return {
        ids: [...all.ids.filter((id) => !gone.includes(id)), ...added.ids],
        pairs: [...all.pairs.filter(kept), ...added.pairs],
        arrows: all.arrows.filter(kept),
    };
}

/**
 * Removing a node or an edge renumbers the rows after it on the batched path (the store freezes again), while the
 * layout keeps placing nodes by row and landings are copied by row: an old place on a renumbered row, or a pulled
 * line or arrowhead left joining the old rows, shows in the frames after the step. Undo brings the rows back
 * through the records. Pairs with an even number are directed in the arrow fixture, odd ones are not.
 */
const REMOVALS: readonly AndThen[] = [
    {
        name: "a node of an arrowed pair removed",
        step: async (element) => {
            await element.session.data.removeNodes(["p8a"]);
        },
        after: () => shownWithout(["p8a"]),
        uncheckedWhileTaken: true,
        keepsPlaces: true,
    },
    {
        name: "a plain edge removed",
        step: async (element) => {
            const before = element.session.data.snapshot().edgeCount;
            await element.session.data.removeEdges([fixtureEdgeId(["p9a", "p9b"])]);
            assert.strictEqual(element.session.data.snapshot().edgeCount, before - 1, "one edge went");
        },
        after: () => shownWithout([], [["p9a", "p9b"]]),
        uncheckedWhileTaken: true,
        keepsPlaces: true,
    },
    {
        name: "an arrowed edge removed",
        step: async (element) => {
            const before = element.session.data.snapshot().edgeCount;
            await element.session.data.removeEdges([fixtureEdgeId(["p10a", "p10b"])]);
            assert.strictEqual(element.session.data.snapshot().edgeCount, before - 1, "one edge went");
        },
        after: () => shownWithout([], [["p10a", "p10b"]]),
        uncheckedWhileTaken: true,
        keepsPlaces: true,
    },
    {
        // The add after the removal freezes the store over the renumbered rows again.
        name: "a node removed and another added",
        step: async (element) => {
            await element.session.data.removeNodes(["p11a"]);
            await element.session.data.addNodes([{ id: "late", position: { x: 0, y: 0, z: 0 } }]);
            await element.session.data.addEdges([{ source: "late", target: "p6a", directed: false }]);
        },
        after: () => shownWithout(["p11a"], [], { ids: ["late"], pairs: [["late", "p6a"]] }),
        uncheckedWhileTaken: true,
        keepsPlaces: true,
    },
    {
        name: "a triangle corner's removal undone",
        step: async (element) => {
            await element.session.data.removeNodes(["t1a"]);
            const undone = await element.session.undo();
            assert.strictEqual(undone.kind, "undone", "the removal was undone");
        },
        uncheckedWhileTaken: true,
        stopsLayout: true,
    },
    {
        name: "a triangle corner's removal undone and redone",
        step: async (element) => {
            await element.session.data.removeNodes(["t1a"]);
            await element.session.undo();
            const redone = await element.session.redo();
            assert.strictEqual(redone.kind, "redone", "the removal was redone");
        },
        after: () => shownWithout(["t1a"]),
        uncheckedWhileTaken: true,
        stopsLayout: true,
    },
];

const AND_THEN: readonly AndThen[] = [
    {
        // Builds the lazy rows' Node and Edge objects while they move.
        name: "getNode and getEdges",
        step: async (element) => {
            assert.isDefined(element.getNode("p3a"));
            assert.isAbove(element.getEdges().length, 0);
            await Promise.resolve();
        },
    },
    {
        name: "a restyle of one edge and one node",
        step: async (element) => {
            const edge = edgeBetween(element.graph, "p2a", "p2b");
            assert.isDefined(edge);
            await element.session.styles.add({
                name: "One edge",
                target: "edge",
                selector: { match: "ids", edges: [edge.id] },
                set: { "edge.color": "#b000b0", "edge.width": 10 },
            } as never);
            await element.session.styles.add({
                name: "One node",
                target: "node",
                selector: { match: "ids", nodes: ["p4a"] },
                set: { "node.size": 2 },
            });
        },
    },
    {
        name: "the pointer hovering a node",
        step: async (element) => {
            await hover(element, nodePoint(element, "p5a"));
        },
    },
    {
        name: "a node added",
        step: async (element) => {
            await element.session.data.addNodes([{ id: "late", position: { x: 0, y: 0, z: 0 } }]);
            await element.session.data.addEdges([{ source: "late", target: "p6a", directed: false }]);
        },
        after: () => {
            const all = everything("arrow");
            return { ...all, ids: [...all.ids, "late"], pairs: [...all.pairs, ["late", "p6a"]] };
        },
        // the control for the removals: an add renumbers no row
        keepsPlaces: true,
    },
    {
        name: "a node hidden by a style",
        step: async (element) => {
            await element.session.styles.add({
                name: "Hide one",
                target: "node",
                selector: { match: "ids", nodes: ["p7a"] },
                set: { "node.visible": false },
            });
        },
        after: () => {
            const all = everything("arrow");
            const touches = (pair: Pair): boolean => pair.includes("p7a");
            return {
                ids: all.ids.filter((id) => id !== "p7a"),
                pairs: all.pairs.filter((pair) => !touches(pair)),
                arrows: all.arrows.filter((pair) => !touches(pair)),
                allowed: all.pairs.filter(touches),
            };
        },
    },
    {
        name: "a switch to the other view",
        step: async (element) => {
            await element.setViewMode(element.viewMode === "2d" ? "3d" : "2d");
        },
    },
    {
        name: "a filter keeping six pairs",
        step: async (element) => {
            await element.session.visibility.addCondition({
                id: "kept",
                effect: "keep",
                rule: { kind: "categories", attribute: "data.side", values: ["kept"] },
            });
        },
        after: () => {
            const all = everything("arrow");
            const kept = (pair: Pair): boolean => KEPT.includes(pair[0]) && KEPT.includes(pair[1]);
            return { ids: KEPT, pairs: all.pairs.filter(kept), arrows: all.arrows.filter(kept) };
        },
    },
    {
        name: "zoomToFit",
        step: async (element) => {
            element.zoomToFit();
            await Promise.resolve();
        },
    },
    {
        name: "a real wheel zoom",
        step: async (element) => {
            await wheel(element, { x: SIZE / 2, y: SIZE / 2 }, -150);
        },
    },
    {
        // From the corner, which no node reaches: in 3D the drag turns the camera, in 2D it pans.
        name: "a real camera orbit drag",
        step: async (element) => {
            await drag(element, { x: 4, y: 4 }, { x: 74, y: 44 }, 8);
        },
    },
    {
        name: "a resize of the element",
        step: async (element) => {
            element.style.width = "343px";
            element.style.height = "301px";
            await Promise.resolve();
        },
    },
    {
        name: "a screenshot",
        step: async (element) => {
            const shot = await element.captureScreenshot();
            assert.isAbove(shot.blob.size, 0, "the screenshot has a picture");
        },
    },
    ...REMOVALS,
];

describe.each(["objects", "batched"] as const)("and then, part way through ngraph on the %s path", (path) => {
    describe.each(["2d", "3d"] as const)("in %s", (view) => {
        it.each(AND_THEN)("arrowed and plain edges follow every frame after $name", async (andThen) => {
            const { step, after, uncheckedWhileTaken = false, stopsLayout = false, keepsPlaces = false } = andThen;
            const element = await mounted(path, view, "arrow");
            assertLazy(element);
            let taking = false;
            let taken = false;
            // A node kept by a removal keeps its own place: rows renumbered under a running layout must not hand
            // one node another's place. Read in layout space, beside the fastest a node moved in the frame before.
            const continuous = keepsPlaces;
            let jump = "";
            const run = await checkWhileMoving(element, "arrow", () => element.setLayout("ngraph", { seed: 7 }), {
                during: async () => {
                    const scene = element.graph.getScene();
                    const kept = (after?.(element) ?? everything("arrow")).ids.filter((id) =>
                        (IDS as readonly string[]).includes(id),
                    );
                    const earlier = layoutPlaces(element, kept);
                    await drawnFrames(scene, 1);
                    const before = layoutPlaces(element, kept);
                    const speed = furthestMove(earlier, before);
                    let drawn = 0;
                    const counting = scene.onAfterRenderObservable.add(() => {
                        drawn++;
                    });
                    taking = true;
                    await step(element);
                    taken = true;
                    scene.onAfterRenderObservable.remove(counting);
                    if (continuous) {
                        jump = keptPlaceJump(before, layoutPlaces(element, kept), speed, drawn);
                    }
                },
                shown: () => {
                    if (taking && !taken && uncheckedWhileTaken) {
                        return undefined;
                    }

                    return taken && after !== undefined ? after(element) : everything("arrow");
                },
                untilStopped: stopsLayout,
            });
            assert.isTrue(taken, "the step was taken while the nodes moved");
            assert.strictEqual(jump, "", "a node kept by the step kept its own place");
            if (uncheckedWhileTaken && !stopsLayout) {
                assert.isAtLeast(run.afterTaken, STEP_FRAMES, "the nodes went on moving after the step");
            }

            if (!stopsLayout) {
                // A step that stops the layout leaves no moving frames after it: its picture is checked at rest.
                assert.isAtLeast(run.afterStep, 5, "frames were checked during and after the step");
            }

            assertFollowed(run);
            if (stopsLayout) {
                assert.isFalse(element.isRunning(), "the step stopped the layout");
                await assertAtRest(element, "arrow", after?.(element) ?? everything("arrow"));
            }
        });
    });
});

describe.each(["objects", "batched"] as const)(
    "removed part way through ngraph and inserted again on the %s path",
    (path) => {
        it("draws every edge between its nodes on every frame, and hovers the node under the real pointer", async () => {
            const element = await mounted(path, "2d", "arrow");
            assertLazy(element);
            // One layout round per frame from the start, as checkWhileMoving does for its own runs:
            // switched on only after the inks are added again below, their repaint would be split
            // part way and frames would be read with edges not yet painted.
            const wasOn = minimumWorkPerFrame();
            setMinimumWorkPerFrame(true);
            cleanups.push(() => {
                setMinimumWorkPerFrame(wasOn);
            });
            await element.setLayout("ngraph", { seed: 7 });
            await drawnFrames(element.graph.getScene(), 5);
            assert.isTrue(element.isRunning(), "removed while the layout runs");
            const first = element.graph.engine;

            // Removed past the current task: the graph shuts down and frees its engine.
            element.remove();
            await vi.waitFor(() => {
                assert.isTrue(first.isDisposed, "the first engine was released");
            });
            document.body.appendChild(element);
            await vi.waitFor(() => {
                assert.isTrue(element.graph.initialized, "the new graph finished initialising");
            });
            assert.notStrictEqual(element.graph.engine, first, "a new engine draws it");
            assert.strictEqual(element.renderPath, path, "the render path came back");
            assert.strictEqual(element.session.data.snapshot().nodeCount, IDS.length, "the nodes came back");
            assert.isTrue(element.isRunning(), "the layout runs again");
            assertLazy(element);
            // Style layers added through the session are not declared by the page, so they do not
            // come back with the new graph: add the inks again to read the frames.
            await addInk(element, "arrow");
            assertFollowed(await checkWhileMoving(element, "arrow", () => Promise.resolve()));

            while (element.isRunning()) {
                await drawnFrames(element.graph.getScene(), 1);
            }

            await assertAtRest(element, "arrow");
            const missed: string[] = [];
            for (const id of ["p0a", "p6b", "p11a", "t1c"]) {
                const point = nodePoint(element, id);
                await hover(element, point);
                await operationQueueOf(element.graph).waitForCompletion();
                await element.waitForStableFrame();
                const hovered = String(element.session.selection.hovered ?? "none");
                const at = element.elementAt(point);
                if (hovered !== id || at?.id !== id) {
                    missed.push(`${id}: hovered ${hovered}, elementAt ${String(at?.id ?? "none")}`);
                }
            }

            assert.deepEqual(missed, [], "the real pointer on a node hovers it after the element came back");
        });
    },
);
