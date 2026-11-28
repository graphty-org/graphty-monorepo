/**
 * @file The fixture and frame checks of the edges-follow tests (test/browser/edges-follow-*.test.ts):
 * edges, arrowheads, labels and self-loops follow their nodes on every frame the element draws
 * while something moves the nodes. Read off the pixels of each frame inside the frame
 * (test/helpers/drawn-frames.ts), with the node centers the element reports for that same frame.
 *
 * The fixture is several disjoint components with data added after the first frame, so the batched
 * path keeps rows with no Node object (the graphty app's state); the lazy check runs before the
 * layout starts. Never call `getNode`, `getEdges` or `edgeBetween` before that check: they build
 * rows and hide the defect.
 *
 * The cases are in several files so that test sharding (by file) can spread them: as one file of
 * 198 cases, run in both the "browser" and "minimum-work" projects, they took about 27 minutes of
 * one CI shard's 26-minute step (#10172).
 */

import "../../src/graphty-element";

import { assert, vi } from "vitest";

import type { Graphty } from "../../index.js";
import { operationQueueOf } from "../../src/Graph";
import { dataManagerInternals } from "../../src/managers/DataManager";
import { minimumWorkPerFrame, setMinimumWorkPerFrame } from "../../src/managers/minimumWork";
import type { RenderPath } from "../../src/meshes/NodeBatch";
import { drawnFrames, recordDrawnFrames } from "./drawn-frames";
import { arrowTipsOff, drawnRadius, type Picture, strayInk, undrawnEdges, undrawnNodes } from "./drawn-invariants";

type View = "2d" | "3d";
type Kind = "arrow" | "undirected" | "curved" | "dashed" | "labeled" | "self-loop";
export type Pair = readonly [string, string];

export const SIZE = 400;

/** Twelve pairs and two triangles: 30 nodes in 14 components, none joined to another. */
const PAIRS_OF_TWO = Array.from({ length: 12 }, (_, i) => [`p${String(i)}a`, `p${String(i)}b`] as const);
const TRIANGLES = [0, 1].map((t) => [`t${String(t)}a`, `t${String(t)}b`, `t${String(t)}c`] as const);
export const IDS = [...PAIRS_OF_TWO.flat(), ...TRIANGLES.flat()];
export const JOINS: Pair[] = [
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

/** What a case undoes when it ends: its element, its clock. */
export const cleanups: (() => void)[] = [];

/** Undo what the case left behind: each test file runs it after each case. */
export function cleanUp(): void {
    for (const cleanup of cleanups.splice(0)) {
        cleanup();
    }
}

/**
 * The style layers that give nodes and edges the inks the frame checks tell apart.
 * @param element - The element.
 * @param kind - The edges loaded.
 */
export async function addInk(element: Graphty, kind: Kind): Promise<void> {
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
export async function mounted(path: RenderPath, view: View, kind: Kind): Promise<Graphty> {
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
export function assertLazy(element: Graphty): void {
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
export interface Shown {
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
export function everything(kind: Kind): Shown {
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
export async function checkWhileMoving(
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
    // A layout run takes one layout round per drawn frame. Otherwise a slow frame catches up
    // several rounds (UpdateManager's catch-up, by the clock), so under load the layout settles in
    // fewer drawn frames than ENOUGH_FRAMES and the case checks almost nothing. The "minimum-work"
    // project has the mode on already, so it is put back as it was.
    const wasOn = minimumWorkPerFrame();
    setMinimumWorkPerFrame(wasOn || afterStart === "until settled");
    try {
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
    } finally {
        setMinimumWorkPerFrame(wasOn);
    }
}

/**
 * The checks every run must pass: it moved, over enough frames to show something, and no frame
 * drew an edge away from its nodes.
 * @param run - The run.
 * @param enough - The fewest moving frames that show something.
 */
export function assertFollowed(run: Run, enough = ENOUGH_FRAMES): void {
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

/**
 * Run the transition clock one 60 Hz frame per drawn frame, so a move takes the same number of
 * frames however slow the machine draws them (as layout-transition.test.ts does for particles).
 * @param element - The element.
 */
export function frameClock(element: Graphty): void {
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
export async function assertAtRest(element: Graphty, kind: Kind, shown: Shown = everything(kind)): Promise<void> {
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
