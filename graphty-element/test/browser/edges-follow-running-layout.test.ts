/**
 * @file Edges, arrowheads, labels and self-loops follow their nodes on every frame the element
 * draws while a layout moves the nodes, on both render paths, in 2D and 3D. Read off the pixels of
 * each frame inside the frame (test/helpers/drawn-frames.ts), with the node centers the element
 * reports for that same frame: an edge left where its nodes were, an arrowhead short of its target
 * or ink stranded on an old pose fails the frame it is drawn in.
 *
 * Every other force-layout check waits for a still frame, so an edge that lags only while the
 * layout runs passes them all. The fixture is several disjoint components with data added after the
 * first frame, so the batched path keeps rows with no Node object (the graphty app's state); the
 * lazy check runs before the layout starts. Never call `getNode`, `getEdges` or `edgeBetween`
 * before that check: they build rows and hide the defect. The "and then" cases call them on
 * purpose, part way through a run. Other "and then" steps remove a node, an edge, a node and then add one, or undo
 * and redo a removal: a removal renumbers the batched rows while the layout places nodes by row, so they also check
 * that each kept node keeps its own place in layout space across the step (undo stops the layout by design, so
 * those steps check the picture at rest instead).
 *
 * The "and then" steps include a real wheel zoom, a real drag on empty canvas (it turns the 3D camera
 * and pans the 2D one) and a resize of the element; a node pushed past the canvas's edge by one of
 * them is not required to be drawn. A last case removes the element while ngraph runs, inserts it
 * again in a later task (a new engine, row table and picking buffers), checks the frames of the
 * layout it resumes and hovers nodes with the real mouse.
 *
 * Run (from graphty-element; about four minutes for each project):
 *   ../tools/with-browser.sh ../tools/low-priority.sh npx vitest run --project=browser \
 *     test/browser/edges-follow-running-layout.test.ts
 * and the same with --project=minimum-work, which splits each change across frames. The file sets
 * each case's render path itself, so "forced-batched" skips it. A failing frame is printed as a PNG
 * data URL with the node centers the element reported in it.
 */

import "../../src/graphty-element";

import { afterEach, assert, describe, it, vi } from "vitest";

import type { Graphty } from "../../index.js";
import { operationQueueOf } from "../../src/Graph";
import { dataManagerInternals } from "../../src/managers/DataManager";
import type { RenderPath } from "../../src/meshes/NodeBatch";
import { drawnFrames, recordDrawnFrames } from "../helpers/drawn-frames";
import {
    arrowTipsOff,
    drawnRadius,
    furthestMove,
    keptPlaceJump,
    layoutPlaces,
    type Picture,
    strayInk,
    undrawnEdges,
    undrawnNodes,
} from "../helpers/drawn-invariants";
import { drag, hover, nodePoint, wheel } from "../helpers/real-input";
import { edgeBetween } from "../helpers/testSetup";

type View = "2d" | "3d";
type Kind = "arrow" | "undirected" | "curved" | "dashed" | "labeled" | "self-loop";
type Pair = readonly [string, string];

const SIZE = 400;

/** Twelve pairs and two triangles: 30 nodes in 14 components, none joined to another. */
const PAIRS_OF_TWO = Array.from({ length: 12 }, (_, i) => [`p${String(i)}a`, `p${String(i)}b`] as const);
const TRIANGLES = [0, 1].map((t) => [`t${String(t)}a`, `t${String(t)}b`, `t${String(t)}c`] as const);
const IDS = [...PAIRS_OF_TWO.flat(), ...TRIANGLES.flat()];
const JOINS: Pair[] = [
    ...PAIRS_OF_TWO,
    ...TRIANGLES.flatMap(([a, b, c]) => [[a, b] as const, [b, c] as const, [c, a] as const]),
];
/** A self-loop on the first node of each pair, for the "self-loop" kind. */
const LOOPS: Pair[] = PAIRS_OF_TWO.map(([a]) => [a, a] as const);

/** How many moving frames each case checks. */
const MOVING_FRAMES = 30;
/** Fewer moving frames than this and the case proves nothing: the layout barely ran. */
const ENOUGH_FRAMES = 10;
/** The most frames a case draws waiting for its moving frames. */
const FRAME_BOUND = 600;
/** Frames in a row with nothing moving that end a transition's run. */
const STILL_FRAMES = 30;
/** A frame whose nodes are drawn smaller than this radius, in CSS pixels, cannot be read. */
const MIN_RADIUS_PX = 2;
/** A node whose drawn center moved less than this, in CSS pixels, did not move this frame. */
const STILL_PX = 0.5;

/** The edges a kind loads, and which of them are directed. */
function edgesOf(kind: Kind): { pairs: Pair[]; directed: (pair: Pair, i: number) => boolean } {
    switch (kind) {
        case "arrow":
            // Directed and undirected side by side: the pairs alternate, the triangles are directed.
            return { pairs: JOINS, directed: (_, i) => i >= PAIRS_OF_TWO.length || i % 2 === 0 };
        case "curved":
            return { pairs: JOINS, directed: () => true };
        case "self-loop":
            return { pairs: [...JOINS, ...LOOPS], directed: () => false };
        default:
            return { pairs: JOINS, directed: () => false };
    }
}

/** The labels' background: a hue no node or edge ink has. */
const LABEL_GREEN = "#00c000";
/** How far a label's ink may be from its edge's middle, in CSS pixels: half its box's diagonal and more. */
const LABEL_REACH = 24;

/**
 * Label ink away from the middle of every edge, as drawn in this frame: a label left behind.
 * @param picture - The frame.
 * @param middles - Where each edge's middle is drawn.
 * @returns Up to five stray points.
 */
function strayLabels(picture: Picture, middles: readonly { x: number; y: number }[]): string[] {
    const stray: string[] = [];
    picture.each((p, x, y) => {
        const green = p[1] > p[0] + 40 && p[1] > p[2] + 40;
        if (green && !middles.some((m) => Math.hypot(x - m.x, y - m.y) <= LABEL_REACH)) {
            stray.push(`${String(Math.round(x))},${String(Math.round(y))}`);
        }

        return stray.length < 5;
    });
    return stray;
}

/** How far round from the straight line to its other node a curve may leave a node, in degrees. */
const CURVE_SPREAD = 75;

/**
 * The curved edges with no edge ink just outside one of their nodes, on the side facing the other
 * node: a curve's middle bows by an amount the test does not model, but both its ends leave their
 * nodes, so a curve left behind by a move shows at its ends.
 * @param picture - The frame.
 * @param pairs - The edges.
 * @param at - Where each node is drawn in this frame.
 * @returns The ends with no ink, as "source-target at node".
 */
function curveEndsOff(
    picture: Picture,
    pairs: readonly Pair[],
    at: ReadonlyMap<string, { x: number; y: number }>,
): string[] {
    const ink = (p: readonly number[] | undefined): boolean => {
        if (p === undefined) {
            return false;
        }

        // Magenta, faint or full: red and blue alike, green under both.
        return Math.abs(p[0] - p[2]) < 40 && p[0] > p[1] + 6 && p[2] > p[1] + 6;
    };
    const nodeBlue = (p: readonly number[] | undefined): boolean =>
        p !== undefined && p[2] > p[0] + 60 && p[2] > p[1] + 60;
    return pairs.flatMap(([a, b]) =>
        (
            [
                [a, b],
                [b, a],
            ] as const
        ).flatMap(([from, to]) => {
            const p = at.get(from);
            const q = at.get(to);
            if (p === undefined || q === undefined) {
                return [`${a}-${b} at ${from}: not placed`];
            }

            const reach = drawnRadius(picture, [p]) + 3;
            if (Math.hypot(q.x - p.x, q.y - p.y) <= 2 * reach) {
                return [];
            }

            const toward = Math.atan2(q.y - p.y, q.x - p.x);
            for (let deg = -CURVE_SPREAD; deg <= CURVE_SPREAD; deg += 3) {
                const angle = toward + (deg * Math.PI) / 180;
                for (const r of [reach, reach + 1, reach + 2]) {
                    const pixel = picture.at(p.x + Math.cos(angle) * r, p.y + Math.sin(angle) * r);
                    // Edge ink, or another node drawn over where the curve leaves: nothing to tell.
                    if (ink(pixel) || nodeBlue(pixel)) {
                        return [];
                    }
                }
            }

            return [`${a}-${b} at ${from}: no edge ink leaves the node`];
        }),
    );
}

/** The edge style each kind adds over the magenta ink. */
const KIND_STYLE: Record<Kind, Record<string, unknown>> = {
    arrow: {},
    undirected: {},
    curved: { "edge.curvature": true },
    // Short gaps, so a point an edge is read at falls on a dash.
    dashed: { "edge.style": "dash", "edge.dashLength": 3, "edge.dashGap": 0.3 },
    labeled: { "edge.label": "M", "edge.labelBackground": LABEL_GREEN },
    "self-loop": {},
};

const cleanups: (() => void)[] = [];
afterEach(() => {
    for (const cleanup of cleanups.splice(0)) {
        cleanup();
    }
});

/**
 * The style layers that give nodes and edges the inks the frame checks tell apart.
 * @param element - The element.
 * @param kind - The edges loaded.
 */
async function addInk(element: Graphty, kind: Kind): Promise<void> {
    await element.session.styles.add({
        name: "Node ink",
        target: "node",
        selector: { match: "everything" },
        set: { "node.color": "#2040ff", "node.size": 1 },
    });
    await element.session.styles.add({
        name: "Edge ink",
        target: "edge",
        selector: { match: "everything" },
        set: { "edge.color": "#ff00ff", "edge.width": 6, ...KIND_STYLE[kind] },
    });
}

/**
 * An element already drawn, empty, then given the disjoint fixture: the way a file loads in the
 * graphty app, and the only way rows are stored with no Node on the batched path.
 * @param path - The render path.
 * @param view - 2D or 3D.
 * @param kind - The edges.
 * @returns The element.
 */
async function mounted(path: RenderPath, view: View, kind: Kind): Promise<Graphty> {
    const element = document.createElement("graphty-element");
    element.renderPath = path;
    // The CPU simulations: the GPU lane is checked on its own.
    element.setAttribute("acceleration", "off");
    element.style.display = "block";
    element.style.width = `${String(SIZE)}px`;
    element.style.height = `${String(SIZE)}px`;
    document.body.appendChild(element);
    cleanups.push(() => {
        element.remove();
    });
    await element.updateComplete;
    await element.setViewMode(view);
    await addInk(element, kind);
    await operationQueueOf(element.graph).waitForCompletion();
    await element.waitForStableFrame();

    await element.session.data.addNodes(
        IDS.map((id, i) => ({
            id,
            side: i < 12 ? "kept" : "dropped",
            position: { x: (i % 6) * 4 - 10, y: Math.floor(i / 6) * 4 - 8, z: 0 },
        })),
    );
    const { pairs, directed } = edgesOf(kind);
    await element.session.data.addEdges(
        pairs.map((pair, i) => ({ source: pair[0], target: pair[1], directed: directed(pair, i) })),
    );
    await element.graph.setLayout("fixed", { dim: 3 });
    await operationQueueOf(element.graph).waitForCompletion();
    await element.waitForStableFrame();
    return element;
}

/**
 * On the batched path the fixture must still hold rows with no Node: one that built them all would
 * test the objects code under the batched name.
 * @param element - The element.
 */
function assertLazy(element: Graphty): void {
    if (element.renderPath !== "batched") {
        return;
    }

    const built = dataManagerInternals.nodesBuilt(element.graph.getDataManager());
    assert.isBelow(built, IDS.length, "some node rows have no Node before the layout runs");
}

/** What a run of moving frames showed. */
interface Run {
    /** Frames where at least one node moved, each checked. */
    moving: number;
    /** Of those, the frames checked from the start of the "and then" step on. */
    afterStep: number;
    /** What was wrong, frame by frame. */
    misses: string[];
    /** The largest distance any node moved between the first and last moving frames, in CSS pixels. */
    travelled: number;
    /** The first frame with a miss, as a PNG data URL, for the failure. */
    picture: string | undefined;
    /** The node centers the element reported in that frame, as JSON. */
    centers: string | undefined;
    /** Moving frames checked after the "and then" step settled; 0 with no step. */
    afterTaken: number;
}

/**
 * Where the nodes that are not drawn but have edges still allowed sit on screen: their place in
 * the layout, projected. A hidden node's edges are still drawn on the objects path.
 * @param element - The element.
 * @param ids - The nodes drawn.
 * @param allowed - The edges allowed but not required.
 * @returns The places.
 */
function hiddenAt(
    element: Graphty,
    ids: readonly string[],
    allowed: readonly Pair[],
): Map<string, { x: number; y: number }> {
    const out = new Map<string, { x: number; y: number }>();
    for (const id of allowed.flat()) {
        if (!ids.includes(id) && !out.has(id)) {
            const place = { x: 0, y: 0, z: 0 };
            element.session.positions.read(element.session.snapshot().ids.requireIndex(id), place);
            out.set(id, element.worldToScreen(place));
        }
    }

    return out;
}

/**
 * The frame check: every node drawn where the element says it is, every edge between its nodes as
 * drawn, no node or edge ink anywhere else, and each arrowed edge reaching its target. Skips a frame in which no node moved.
 * @param element - The element.
 * @param kind - The edges loaded.
 * @param shown - The nodes and edges expected on screen now.
 * @returns The check, and the centers it saw first and last.
 */
function frameCheck(
    element: Graphty,
    kind: Kind,
    shown: () => Shown | undefined,
): {
    check: (picture: Picture) => Promise<string[]> | undefined;
    travelled: () => number;
    centers: (frame: number) => Map<string, { x: number; y: number }> | undefined;
} {
    let last = new Map<string, { x: number; y: number }>();
    let first: Map<string, { x: number; y: number }> | undefined;
    const seen: Map<string, { x: number; y: number }>[] = [];
    const centers = (ids: readonly string[]): Map<string, { x: number; y: number }> =>
        new Map(
            ids.flatMap((id) => {
                const at = element.nodeScreenPosition(id);
                return at === undefined ? [] : [[id, { x: at.x, y: at.y }] as const];
            }),
        );
    const furthest = (a: Map<string, { x: number; y: number }>, b: Map<string, { x: number; y: number }>): number =>
        Math.max(
            0,
            ...[...b].map(([id, p]) => {
                const q = a.get(id);
                return q === undefined ? Infinity : Math.hypot(p.x - q.x, p.y - q.y);
            }),
        );
    return {
        check: (picture) => {
            const showing = shown();
            if (showing === undefined) {
                // A frame drawn while a removal or an undo is under way: either state may be drawn.
                return undefined;
            }

            const { ids: all, pairs: allPairs, arrows: allArrows, allowed = [] } = showing;
            const everywhere = centers(all);
            const moved = furthest(last, everywhere);
            last = everywhere;
            if (moved < STILL_PX) {
                return undefined;
            }

            // A camera move or a resize can put a node past the canvas's edge, where it is not drawn: only
            // the nodes wholly on the canvas, and the edges between two of them, must be drawn. Any edge's
            // ink is still allowed, and the nodes off it still count as places ink may be.
            const radius = drawnRadius(picture, [...everywhere.values()]);
            const canvas = element.graph.engine.getRenderingCanvas();
            const width = canvas?.clientWidth ?? 0;
            const height = canvas?.clientHeight ?? 0;
            const margin = radius + 2;
            const inView = (id: string): boolean => {
                const c = everywhere.get(id);
                return (
                    c !== undefined && c.x >= margin && c.y >= margin && c.x <= width - margin && c.y <= height - margin
                );
            };
            const ids = all.filter(inView);
            const both = (pair: Pair): boolean => inView(pair[0]) && inView(pair[1]);
            const pairs = allPairs.filter(both);
            const now = new Map([...everywhere].filter(([id]) => inView(id)));
            if (radius < MIN_RADIUS_PX) {
                // Framed so far out that a node is a pixel and an edge a faint tint: nothing can be
                // told apart. Not counted, so a run must still show enough frames that can be read.
                return undefined;
            }

            first ??= everywhere;
            seen.push(now);
            // All three read the picture and the node centers now, in this frame, before they await.
            const curves = kind === "curved" ? curveEndsOff(picture, pairs, now) : [];
            // Every edge is read, so every node counts as drawn over an edge, and only those in view are kept.
            const undrawn =
                kind === "curved"
                    ? Promise.resolve([])
                    : undrawnEdges(element, allPairs, picture).then((found) => found.filter(both));
            const stray =
                kind === "curved"
                    ? Promise.resolve([])
                    : strayInk(element, all, [...allPairs, ...allowed], picture, hiddenAt(element, all, allowed));
            const tips =
                kind === "curved"
                    ? Promise.resolve([])
                    : arrowTipsOff(element, allArrows, picture).then((found) => found.filter(both));
            const labels =
                kind === "labeled"
                    ? strayLabels(
                          picture,
                          allPairs.flatMap(([a, b]) => {
                              const p = everywhere.get(a);
                              const q = everywhere.get(b);
                              return p === undefined || q === undefined
                                  ? []
                                  : [{ x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 }];
                          }),
                      )
                    : [];
            const missing = undrawnNodes(element, ids, picture);
            return Promise.all([undrawn, stray, tips, missing]).then(([u, s, t, m]) => [
                ...(m.length > 0 ? [`nodes not drawn at their places: ${m.join(" ")}`] : []),
                ...curves.map((miss) => `curve ${miss}`),
                ...(labels.length > 0 ? [`label ink away from every edge at ${labels.join(" ")}`] : []),
                ...u.map(([a, b]) => `edge ${a}-${b} not drawn between its nodes`),
                ...(s.length > 0 ? [`stray ink at ${s.join(" ")}`] : []),
                ...t.map(([a, b]) => `arrow ${a}->${b} short of its target`),
            ]);
        },
        travelled: () => (first === undefined ? 0 : furthest(first, last)),
        centers: (frame) => seen[frame - 1],
    };
}

/** What a case shows on screen while it runs: the nodes and edges a frame is checked against. */
interface Shown {
    /** The nodes drawn. */
    ids: readonly string[];
    /** The edges that must be drawn between their nodes. */
    pairs: readonly Pair[];
    /** The directed edges among them, whose tips are checked. */
    arrows: readonly Pair[];
    /** Edges whose ink is allowed but not required: those of a node hidden part way. */
    allowed?: readonly Pair[];
}

/** How a run goes beyond its start. */
interface RunOptions {
    /** Called once, after a third of the frames, for an "and then" step. */
    during?: () => Promise<void>;
    /** The nodes and edges expected on screen, or undefined to leave a frame unchecked; everything by default. */
    shown?: () => Shown | undefined;
    /**
     * After `start` returns: draw on until enough moving frames or the layout settles (default);
     * draw on until enough moving frames or {@link STILL_FRAMES} frames in a row where nothing
     * moved (a transition, which outlives the layout's own settling); or stop at once (a drag).
     */
    afterStart?: "until settled" | "until still" | "stop";
    /** Also end once the layout has stopped running: an undo stops it and restores the arrangement, with no settle. */
    untilStopped?: boolean;
}

/**
 * Every node and edge a kind loads.
 * @param kind - The edges loaded.
 * @returns What is shown.
 */
function everything(kind: Kind): Shown {
    const { pairs, directed } = edgesOf(kind);
    return {
        ids: IDS,
        pairs,
        arrows: kind === "arrow" || kind === "curved" ? pairs.filter((p, i) => directed(p, i)) : [],
    };
}

/**
 * Start what moves the nodes and check up to {@link MOVING_FRAMES} frames in which they move,
 * drawing frames until that many have been checked or the layout settles.
 * @param element - The element.
 * @param kind - The edges loaded.
 * @param start - What sets the nodes moving.
 * @param options - What else the run does.
 * @returns What the frames showed.
 */
async function checkWhileMoving(
    element: Graphty,
    kind: Kind,
    start: () => Promise<unknown>,
    options: RunOptions = {},
): Promise<Run> {
    const { during, shown, afterStart = "until settled", untilStopped = false } = options;
    let settled = false;
    const onSettled = (): void => {
        settled = true;
    };
    element.addEventListener("graph-settled", onSettled);
    cleanups.push(() => {
        element.removeEventListener("graph-settled", onSettled);
    });
    const all = everything(kind);
    const frames = frameCheck(element, kind, shown ?? (() => all));
    const record = recordDrawnFrames(element, frames.check);
    await start();
    const scene = element.graph.getScene();
    let stepped = during === undefined;
    let checkedAtStep = 0;
    const drawOn = afterStart !== "stop";
    let still = 0;
    let atStep: number | undefined;
    const done = (): boolean =>
        record.checked >= MOVING_FRAMES ||
        (untilStopped && !element.isRunning()) ||
        (afterStart === "until settled" ? settled : still >= STILL_FRAMES);
    for (let i = 0; i < FRAME_BOUND && drawOn && !done(); i++) {
        const before = record.checked;
        await drawnFrames(scene, 1);
        still = record.checked === before ? still + 1 : 0;
        if (!stepped && record.checked >= MOVING_FRAMES / 3) {
            stepped = true;
            checkedAtStep = record.checked;
            await during?.();
            atStep = record.checked;
        }
    }

    if (!drawOn) {
        // The last move's frame.
        await drawnFrames(scene, 2);
    }

    const misses = await record.stop();
    const missed = /^frame (\d+):/.exec(misses[0] ?? "");
    const centers = missed === null ? undefined : frames.centers(Number(missed[1]));
    return {
        moving: record.checked,
        afterStep: record.checked - checkedAtStep,
        misses,
        travelled: frames.travelled(),
        picture: record.firstMiss(),
        centers: centers === undefined ? undefined : JSON.stringify(Object.fromEntries(centers)),
        afterTaken: atStep === undefined ? 0 : record.checked - atStep,
    };
}

/**
 * The checks every run must pass: it moved, over enough frames to show something, and no frame
 * drew an edge away from its nodes.
 * @param run - The run.
 * @param enough - The fewest moving frames that show something.
 */
function assertFollowed(run: Run, enough = ENOUGH_FRAMES): void {
    assert.isAtLeast(run.moving, enough, "the layout moved the nodes over enough drawn frames");
    assert.isAbove(run.travelled, 2, "the nodes ended somewhere other than where they started");
    if (run.misses.length > 0 && run.picture !== undefined) {
        // The frame itself, for whoever reads the failure: paste the data URL into a browser.
        console.log(`[edges-follow] first frame with a miss: ${run.picture}`);
        console.log(`[edges-follow] node centers in that frame: ${run.centers ?? "none"}`);
    }

    assert.strictEqual(
        run.misses.slice(0, 5).join("\n"),
        "",
        `${String(run.misses.length)} misses over ${String(run.moving)} frames`,
    );
}

/** The CPU simulations: ngraph seeded, d3, ForceAtlas2, Fruchterman-Reingold ("spring"). */
const LAYOUTS: readonly { layout: string; options: Record<string, unknown> }[] = [
    { layout: "ngraph", options: { seed: 7 } },
    { layout: "d3", options: {} },
    { layout: "forceatlas2", options: {} },
    { layout: "spring", options: {} },
];

describe.each(["objects", "batched"] as const)("on the %s path", (path) => {
    describe.each(["2d", "3d"] as const)("in %s", (view) => {
        it.each(LAYOUTS)("arrowed and plain edges follow every frame of $layout", async ({ layout, options }) => {
            const element = await mounted(path, view, "arrow");
            assertLazy(element);
            assertFollowed(await checkWhileMoving(element, "arrow", () => element.setLayout(layout, options)));
        });

        it.each(["undirected", "curved", "dashed", "labeled", "self-loop"] as const)(
            "%s edges follow every frame of ngraph",
            async (kind) => {
                const element = await mounted(path, view, kind);
                assertLazy(element);
                assertFollowed(await checkWhileMoving(element, kind, () => element.setLayout("ngraph", { seed: 7 })));
            },
        );
    });
});

/**
 * Run the transition clock one 60 Hz frame per drawn frame, so a move takes the same number of
 * frames however slow the machine draws them (as layout-transition.test.ts does for particles).
 * @param element - The element.
 */
function frameClock(element: Graphty): void {
    const scene = element.graph.getScene();
    let clock = performance.now();
    const now = vi.spyOn(performance, "now").mockImplementation(() => clock);
    const tick = scene.onBeforeRenderObservable.add(() => {
        clock += 1000 / 60;
    });
    cleanups.push(() => {
        scene.onBeforeRenderObservable.remove(tick);
        now.mockRestore();
    });
}

/**
 * Once the nodes have stopped: every edge between its nodes and no ink anywhere else, read off a
 * still frame. An edge that missed the last move stays where the move began.
 * @param element - The element.
 * @param kind - The edges loaded.
 */
async function assertAtRest(element: Graphty, kind: Kind, shown: Shown = everything(kind)): Promise<void> {
    await operationQueueOf(element.graph).waitForCompletion();
    await element.waitForStableFrame();
    const { ids, pairs, arrows } = shown;
    if (kind === "curved") {
        return;
    }

    assert.deepEqual(await undrawnNodes(element, ids), [], "at rest, nodes not drawn at their places");
    assert.deepEqual(await undrawnEdges(element, pairs), [], "at rest, edges not drawn between their nodes");
    assert.deepEqual(await strayInk(element, ids, pairs), [], "at rest, ink away from every node and edge");
    assert.deepEqual(await arrowTipsOff(element, arrows), [], "at rest, arrows short of their targets");
}

/** The transitions that move drawn nodes, each into the layout it moves them to. */
const TRANSITIONS = [
    { transition: "glide", layout: "circular", options: {} },
    { transition: "glide", layout: "ngraph", options: { seed: 7 } },
    { transition: "staggered-glide", layout: "circular", options: {} },
] as const;

describe.each(["objects", "batched"] as const)("through a layout transition on the %s path", (path) => {
    describe.each(["2d", "3d"] as const)("in %s", (view) => {
        describe.each(TRANSITIONS)("$transition into $layout", ({ transition, layout, options }) => {
            it.each(["arrow", "undirected", "curved", "dashed", "labeled", "self-loop"] as const)(
                "%s edges follow every frame of the move and rest between their nodes",
                async (kind) => {
                    const element = await mounted(path, view, kind);
                    assertLazy(element);
                    frameClock(element);
                    await element.session.config.set({ layoutTransition: { transition, seconds: 1 } });
                    assertFollowed(
                        await checkWhileMoving(element, kind, () => element.setLayout(layout, options), {
                            afterStart: "until still",
                        }),
                    );
                    await assertAtRest(element, kind);
                },
            );
        });

        // Particles draw each node as a cloud on the way, so no frame of the move shows the node: only
        // the landing is checked.
        it("arrowed edges rest between their nodes after a particle-morph", async () => {
            const element = await mounted(path, view, "arrow");
            assertLazy(element);
            frameClock(element);
            await element.session.config.set({ layoutTransition: { transition: "particle-morph", seconds: 0.5 } });
            await element.setLayout("circular");
            await element.waitForSettled();
            await assertAtRest(element, "arrow");
        });
    });
});

describe.each(["objects", "batched"] as const)("under a node dragged with the real mouse on the %s path", (path) => {
    describe.each(["2d", "3d"] as const)("in %s", (view) => {
        it.each(["arrow", "curved", "self-loop"] as const)(
            "%s edges of a triangle corner follow every frame of the drag",
            async (kind) => {
                const element = await mounted(path, view, kind);
                assertLazy(element);
                const from = nodePoint(element, "t0a");
                const to = { x: from.x + 70, y: from.y + 50 };
                const run = await checkWhileMoving(element, kind, () => drag(element, from, to, 12), {
                    afterStart: "stop",
                });
                assertFollowed(run, 5);
                const at = element.nodeScreenPosition("t0a");
                assert.isDefined(at);
                assert.isBelow(Math.hypot(at.x - to.x, at.y - to.y), 3, "the node ended under the pointer");
                await assertAtRest(element, kind);
            },
        );
    });
});

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
