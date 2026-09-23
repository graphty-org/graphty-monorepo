/**
 * @file The assertions that read what the element DREW, rather than what its style model computed.
 *
 * WHY THESE EXIST. Everything the element says about styling was already covered: which elements a
 * selector resolves, what the repaint reports it painted, what the painter resolves per element,
 * what a legend says. All of it is the element checking its own arithmetic, and all of it went on
 * agreeing with itself while the screen showed the element's fallback appearance -- a black 48px
 * label reported on a node with no label object and no label mesh anywhere in the scene.
 *
 * So these assertions deliberately ask different questions:
 *
 * - has every element been painted by the stack AT ALL, whichever load path brought it in;
 * - is the layer somebody asked for actually in the stack;
 * - did a write verb's run reach an answer -- either answer -- within a bounded time;
 * - and, for text, how many near-black pixels are on the canvas where the label should be.
 *
 * THE LAST ONE IS THE INVERSE OF THE SAMPLER IN `style-paint-pixels.test.ts`. That file looks for
 * the most COLOURFUL pixel near a node and skips anything whose channel spread is under 24,
 * "because that is grey, which is the background, the edges and a specular highlight". A default
 * label is black text on whitesmoke, which is pure grey by that measure -- so the one instrument
 * in the repository that read pixels was calibrated to ignore exactly the thing the blank label
 * stories were about. Reading text back needs the opposite measurement, and {@link darkPixelsNear}
 * is it.
 */

import { Matrix, Vector3 } from "@babylonjs/core";
import { assert } from "vitest";

import type { Run } from "../../session";
import type { Graph } from "../../src/Graph";
import { bootstrapEdgePaint, bootstrapNodePaint } from "../../src/managers/StylePainter";
import type { ElementSession, GraphSession } from "../../src/session";
import type { ElementPaint } from "../../src/session/styles/repaint";

/**
 * The mesh key a node wears before the style stack has ever painted it.
 *
 * READ OFF THE ELEMENT rather than written down here, so that renaming the element's own fallback
 * cannot leave this file quietly asserting a string nothing produces any more.
 */
const BOOTSTRAP_NODE_KEY = bootstrapNodePaint().meshKey;

/** The same, for an edge. */
const BOOTSTRAP_EDGE_KEY = bootstrapEdgePaint().meshKey;

/** How many frames to render before reading the buffer, by default. */
const DEFAULT_FRAMES = 60;

/** How long to leave between those frames, in milliseconds. */
const DEFAULT_FRAME_MS = 10;

/**
 * How bright a pixel's strongest channel may be and still count as ink.
 *
 * A default label is black on whitesmoke. Anything above this is paper, a lit node or an edge.
 */
const INK_MAX_CHANNEL = 110;

/**
 * How far apart a pixel's strongest and weakest channel may be and still count as ink.
 *
 * Text is grey -- its three channels move together. A dark BLUE node is dark and is not text, and
 * this is what tells the two apart.
 */
const INK_MAX_SPREAD = 40;

/** How far from a node's projected centre {@link darkPixelsNear} looks, by default, in pixels. */
const DEFAULT_INK_RADIUS = 70;

/**
 * How many offending elements a failure message lists.
 *
 * The count is always stated in full; the list is cut so that a graph where nothing was painted
 * reports a sentence rather than fifty thousand indices.
 */
const MAX_LISTED = 10;

/** One frame read back off the GPU, with the dimensions needed to index it. */
export interface Frame {
    /** Four bytes per pixel, bottom row first, as WebGL hands them back. */
    readonly pixels: Uint8Array;
    /** The render width in pixels. */
    readonly width: number;
    /** The render height in pixels. */
    readonly height: number;
}

/** How much ink was found in a neighbourhood, and how big the neighbourhood was. */
export interface InkReading {
    /** Pixels dark enough and grey enough to be text. */
    readonly ink: number;
    /** Pixels looked at, so a caller can quote a ratio. */
    readonly sampled: number;
}

/** What {@link assertRunSettles} saw the run do. */
export type RunOutcomeKind = "resolved" | "rejected";

/**
 * What the last style pass painted, per element, for a graph with a view.
 *
 * A CAST, AND IT SHOULD NOT HAVE TO BE. `Graph.getSession()` is declared as returning
 * `GraphSession`, whose surface stops at `styles`; the object behind it is an `ElementSession` and
 * carries `paint`. `ElementPaint` is a READ surface by construction -- it holds no `repaint` and
 * no `invalidate`, exactly so that whoever draws cannot paint behind the stack's back -- so there
 * is nothing dangerous in reading it, and a consumer asking "has the stack painted this element
 * yet" has no other way to ask. The narrowing is recorded as a handover note rather than papered
 * over quietly here.
 * @param graph - The graph.
 * @returns What the last pass painted.
 */
export function paintOf(graph: Graph): ElementPaint {
    return (graph.getSession() as ElementSession).paint;
}

/**
 * The channels the style stack painted onto one element.
 * @param paint - What the last pass painted.
 * @param target - Nodes or edges.
 * @param index - The dense index.
 * @returns The channel names, which is empty for an element nothing painted.
 */
function paintedChannels(paint: ElementPaint, target: "node" | "edge", index: number): readonly string[] {
    return Object.keys(paint.styleOf(target, index));
}

/**
 * Every element in the graph has been painted by the style stack at least once.
 *
 * THE ONE ASSERTION THAT COVERS A WHOLE FAULT CLASS. The element's fallback appearance happens to
 * equal its own default layer's colour, so a graph the stack never painted looks correct until
 * something asks for a colour the fallback does not have. Three separate readings say so here, and
 * they come from different machinery: the resolved style per element, which is the columnar model;
 * the explanation a consumer would read, which is built from the bindings the pass prepared; and
 * the source mesh each node is actually drawn from, which is the scene.
 *
 * The empty-graph check is part of it rather than a courtesy. Every wait helper the stories use
 * resolves on timeout instead of failing, so a failed fetch leaves a story rendering an empty
 * canvas and passing -- and an assertion that skipped an empty graph would go on passing with it.
 * @param graph - The graph, which must have loaded something.
 * @param context - What is being checked, for the failure message.
 */
export function assertEveryElementPainted(graph: Graph, context = "the graph"): void {
    const session = graph.getSession();
    const paint = paintOf(graph);
    const { nodeCount, edgeCount } = session.data.statistics();

    assert.isAbove(nodeCount, 0, `${context}: the graph holds no nodes, so nothing was drawn at all`);

    const unpaintedNodes: number[] = [];
    for (let index = 0; index < nodeCount; index++) {
        if (paintedChannels(paint, "node", index).length === 0) {
            unpaintedNodes.push(index);
        }
    }

    assert.deepStrictEqual(
        unpaintedNodes.slice(0, MAX_LISTED),
        [],
        `${context}: ${String(unpaintedNodes.length)} of ${String(nodeCount)} nodes carry no painted channel ` +
            "at all, so the style stack never painted them",
    );

    const unpaintedEdges: number[] = [];
    for (let index = 0; index < edgeCount; index++) {
        if (paintedChannels(paint, "edge", index).length === 0) {
            unpaintedEdges.push(index);
        }
    }

    assert.deepStrictEqual(
        unpaintedEdges.slice(0, MAX_LISTED),
        [],
        `${context}: ${String(unpaintedEdges.length)} of ${String(edgeCount)} edges carry no painted channel at all`,
    );

    assertStackExplainsAnElement(graph, context);

    const stranded = strandedOnBootstrap(graph);

    assert.deepStrictEqual(
        stranded.slice(0, MAX_LISTED),
        [],
        `${context}: ${String(stranded.length)} nodes are still drawn from the element's fallback mesh ` +
            `("${BOOTSTRAP_NODE_KEY}"), which means no repaint ever reached them`,
    );
}

/**
 * The nodes still drawn from the element's own fallback mesh.
 *
 * Separate from the assertion because it is also a WAIT condition. The style model and the scene
 * are a frame apart by design -- a pass marks an element dirty and the render loop hands the new
 * paint over on its next tick -- so a caller that has only just drained the queues polls this
 * until it empties, and only then asserts on it.
 * @param graph - The graph.
 * @returns The ids, in the order the graph holds them.
 */
export function strandedOnBootstrap(graph: Graph): readonly string[] {
    return graph
        .getNodes()
        .filter((node) => {
            const metadata = node.mesh.metadata as { styleId?: unknown } | null | undefined;

            return metadata?.styleId === BOOTSTRAP_NODE_KEY || metadata?.styleId === BOOTSTRAP_EDGE_KEY;
        })
        .map((node) => String(node.id));
}

/**
 * The element can say WHY one node looks the way it does.
 *
 * The reading a consumer has, and the one that was silently empty: prepared bindings are built by
 * the repaint, so a graph that was never repainted explains nothing -- not even the element's own
 * default layer, which is in the stack and locked and cannot be absent for any other reason.
 * @param graph - The graph.
 * @param context - What is being checked, for the failure message.
 */
export function assertStackExplainsAnElement(graph: Graph, context = "the graph"): void {
    const [first] = graph.getNodes();

    assert.isDefined(first, `${context}: the graph drew no node objects`);

    let explained;

    try {
        explained = graph.getSession().styles.explain({ node: first.id });
    } catch (refusal) {
        // A refusal here is itself a finding rather than a fault in the test: the renderer drew a
        // node the session cannot look up by the id that node carries, which means the two halves
        // disagree about what the graph contains.
        assert.fail(
            `${context}: the element drew a node whose id is "${String(first.id)}" and its own session cannot ` +
                `find a node with that id -- ${refusal instanceof Error ? refusal.message : String(refusal)}`,
        );
    }

    assert.isNotEmpty(
        explained.contributions,
        `${context}: no layer at all claims to have painted node "${String(first.id)}" -- the element's own ` +
            "default layer is locked into the bottom of every stack, so an empty answer here means no pass ran",
    );
}

/**
 * One named layer actually painted an element, rather than merely being in the stack.
 *
 * THE TWO FACTS ARE DIFFERENT, and the difference is the whole of the blank layered stories: a
 * layer can be in `styles.list()`, enabled, with a selector that matches every node, and still
 * have painted nothing, because a pass has to run for any of that to reach an element. A layer
 * that landed is not a layer that painted.
 * @param graph - The graph.
 * @param layerName - What the layer is called.
 * @param context - What is being checked, for the failure message.
 */
export function assertLayerPainted(graph: Graph, layerName: string, context = "the caller"): void {
    const [first] = graph.getNodes();

    assert.isDefined(first, `${context}: the graph drew no node objects`);

    const { contributions } = graph.getSession().styles.explain({ node: first.id });
    const names = contributions.map((contribution) => contribution.name);

    assert.include(
        names,
        layerName,
        `${context}: "${layerName}" painted nothing on node "${String(first.id)}". The layers that did paint it ` +
            `are [${names.join(", ")}]`,
    );
}

/**
 * Every named layer is in the stack.
 *
 * Asserted by NAME rather than by id, because a name is what a story, a template or a person
 * wrote and an id is minted by the element.
 * @param session - The session holding the stack.
 * @param expected - The layer names that must be present.
 * @param context - What asked for them, for the failure message.
 */
export function assertStackContains(session: GraphSession, expected: readonly string[], context = "the caller"): void {
    const present = session.styles.list().map((layer) => layer.name);
    const missing = expected.filter((name) => !present.includes(name));

    assert.deepStrictEqual(
        missing,
        [],
        `${context}: asked for ${String(expected.length)} layers, the stack holds ` +
            `[${present.join(", ")}], so [${missing.join(", ")}] never landed`,
    );
}

/**
 * A run reaches an answer -- either answer -- within a bounded time.
 *
 * NEITHER OUTCOME IS A FAILURE HERE. The element's published contract is that no write verb throws
 * and that a malformed specification, an unknown id or a locked layer "arrives as a rejected run";
 * a caller may fire one from a click handler and forget it. What this catches is the third outcome
 * the contract does not allow: a run that never commits and never refuses, which reports nothing
 * to a console, nothing to the paint problems and nothing to whoever is awaiting it, because
 * nobody is.
 * @param run - The run to watch.
 * @param ms - How long it may take.
 * @param what - What the run was asked to do, for the failure message.
 * @returns Which way it settled, so a caller can go on to assert the outcome it expected.
 */
export async function assertRunSettles<T>(run: Run<T>, ms: number, what: string): Promise<RunOutcomeKind> {
    let timer: ReturnType<typeof setTimeout> | undefined;

    const settled = Promise.resolve(run).then(
        (): RunOutcomeKind => "resolved",
        (): RunOutcomeKind => "rejected",
    );

    const timedOut = new Promise<null>((resolve) => {
        timer = setTimeout(() => {
            resolve(null);
        }, ms);
    });

    const outcome = await Promise.race([settled, timedOut]);

    if (timer !== undefined) {
        clearTimeout(timer);
    }

    assert.isNotNull(
        outcome,
        `${what}: the run neither committed nor refused within ${String(ms)}ms, so nothing will ever hear about it`,
    );

    return outcome as RunOutcomeKind;
}

/**
 * Render until the shaders have compiled, then read the frame off the GPU.
 *
 * Babylon compiles a shader asynchronously and the instanced colour buffer is a define on that
 * shader, so the first frames draw in the source material's own colour rather than the instance's.
 * @param graph - The graph to read.
 * @param frames - How many frames to render first.
 * @param frameMs - How long to leave between them.
 * @returns The frame.
 */
export async function readFrame(graph: Graph, frames = DEFAULT_FRAMES, frameMs = DEFAULT_FRAME_MS): Promise<Frame> {
    const { engine } = graph;

    for (let frame = 0; frame < frames; frame++) {
        graph.scene.render();
        await new Promise<void>((done) => {
            setTimeout(done, frameMs);
        });
    }

    const width = engine.getRenderWidth();
    const height = engine.getRenderHeight();
    const pixels = (await engine.readPixels(0, 0, width, height)) as unknown as Uint8Array;

    return { pixels, width, height };
}

/**
 * Where one node is drawn, in the frame's own pixel coordinates.
 * @param graph - The graph.
 * @param frame - The frame, for its dimensions.
 * @param nodeId - The node to locate.
 * @returns The pixel coordinates, counting from the bottom row as WebGL does.
 */
function projectNode(graph: Graph, frame: Frame, nodeId: string | number): { x: number; y: number } {
    const node = graph.getNodes().find((candidate) => String(candidate.id) === String(nodeId));

    assert.isDefined(node, `the graph holds a node called ${String(nodeId)}`);

    const camera = graph.scene.activeCamera;

    assert.isNotNull(camera, "a graph that has rendered has an active camera");

    const projected = Vector3.Project(
        node.mesh.absolutePosition,
        // Identity, because `absolutePosition` is already world space. The matrix the scene hands
        // back is view times projection, which is the rest of the journey.
        Matrix.Identity(),
        graph.scene.getTransformMatrix(),
        camera.viewport.toGlobal(frame.width, frame.height),
    );

    return { x: Math.round(projected.x), y: Math.round(frame.height - projected.y) };
}

/**
 * How much text-coloured ink is on the canvas near one node.
 *
 * THE MEASUREMENT THAT PROVED THE LABELS WERE ABSENT: zero dark pixels in the whole neighbourhood
 * of a node whose resolved style confidently reported a black label. Text is dark AND grey, so
 * both conditions are required -- a dark blue node is dark and is not a label.
 * @param graph - The graph to read.
 * @param nodeId - The node whose label is being looked for.
 * @param radius - How far from the node's projected centre to look, in pixels.
 * @param frame - A frame already read, when the caller is making several readings of one picture.
 * @returns The ink count and how many pixels were looked at.
 */
export async function darkPixelsNear(
    graph: Graph,
    nodeId: string | number,
    radius = DEFAULT_INK_RADIUS,
    frame?: Frame,
): Promise<InkReading> {
    const read = frame ?? (await readFrame(graph));
    const centre = projectNode(graph, read, nodeId);

    let ink = 0;
    let sampled = 0;

    for (let y = centre.y - radius; y <= centre.y + radius; y++) {
        for (let x = centre.x - radius; x <= centre.x + radius; x++) {
            if (x < 0 || y < 0 || x >= read.width || y >= read.height) {
                continue;
            }

            const offset = (y * read.width + x) * 4;
            const r = read.pixels[offset];
            const g = read.pixels[offset + 1];
            const b = read.pixels[offset + 2];
            const peak = Math.max(r, g, b);
            const spread = peak - Math.min(r, g, b);

            sampled++;

            if (peak <= INK_MAX_CHANNEL && spread <= INK_MAX_SPREAD) {
                ink++;
            }
        }
    }

    return { ink, sampled };
}

/**
 * A short digest of what one graph actually drew.
 *
 * FOR COMPARING TWO PICTURES WITH EACH OTHER, which is the one question no per-story visual
 * baseline can answer: Chromatic compares a story to its own past and never to its siblings, so
 * "these thirteen stories are byte-identical to one another" is invisible to it. Two stories that
 * promise different pictures and hash the same have collapsed onto one.
 * @param graph - The graph to read.
 * @param frame - A frame already read, when the caller has one.
 * @returns The digest, as hex.
 */
export async function canvasHash(graph: Graph, frame?: Frame): Promise<string> {
    const read = frame ?? (await readFrame(graph));

    // FNV-1a, 32 bit. Chosen for being four lines rather than for its statistics: the question is
    // "did these two frames come out the same", and a collision between two genuinely different
    // pictures is far less likely than the pair of agreeing pictures this exists to notice.
    let hash = 0x811c9dc5;

    for (let offset = 0; offset < read.pixels.length; offset++) {
        hash ^= read.pixels[offset];
        hash = Math.imul(hash, 0x01000193);
    }

    return (hash >>> 0).toString(16).padStart(8, "0");
}
