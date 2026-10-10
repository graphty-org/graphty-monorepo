/**
 * @file The element has to be able to say when the picture has stopped changing.
 *
 * `graph-settled` does not say it. That event fires the instant the layout engine reports
 * convergence, inside the same update pass that merely ASKS for the final framing -- the camera
 * is moved a pass later, and drawn a pass after that. So everything that photographs a graph by
 * waiting for `graph-settled` photographs a camera in motion, which on a force layout was
 * measured at tens of thousands of projected pixels away from the picture that eventually lands.
 *
 * `waitForStableFrame()` is the answer to the question those consumers are actually asking, and
 * it belongs to the element rather than to any one of them: a screenshot, a video frame, a
 * thumbnail service and a visual regression snapshot all need the same four things to have
 * happened -- the queue drained, the layout converged, the camera framed, and a frame DRAWN in
 * that state.
 *
 * What is pinned here:
 * - the frame is not called final while the layout is still converging,
 * - once it is called final, nothing the element drives moves again,
 * - the wait fails loudly instead of handing back a moving picture,
 * - and the two frame-pumping methods do what their names say: `stepFrames` updates the model and
 *   draws nothing, `renderFrames` draws.
 *
 * Driven by the element's own render loop, because the whole question is about the relationship
 * between an update pass and the render that follows it.
 */

import { afterEach, assert, beforeEach, describe, it, vi } from "vitest";

import { Graph, operationQueueOf } from "../../src/Graph";
// Imported for its side effect as well as its type: it is what defines <graphty-element>.
import { Graphty } from "../../src/graphty-element";
import { waitForGraphSettled } from "../../stories/helpers";

/** Enough nodes and edges that the force layout visibly moves them between frames. */
const NODES = Array.from({ length: 30 }, (_unused, index) => ({ id: `n${String(index)}` }));

/** A path plus a few chords, so the simulation has something to pull against. */
const EDGES = [
    ...NODES.slice(1).map((node, index) => ({ src: NODES[index].id, dst: node.id })),
    { src: "n0", dst: "n10" },
    { src: "n5", dst: "n20" },
    { src: "n12", dst: "n29" },
];

/** How long the layout, the framing and the frame after them are given. */
const STABLE_TIMEOUT_MS = 15000;

/** How many frames to keep drawing after the element says the picture is final. */
const TAIL_FRAMES = 24;

/** How many frames to draw with every shader held back, before letting them arrive. */
const HELD_FRAMES = 10;

/**
 * How many pixels may change colour bucket before two frames count as different pictures.
 * The same margin `channel-paints.test.ts` uses: two renderings of one scene agree exactly.
 */
const PIXEL_CHANGE = 32;

/** Four bits per channel, three channels. */
const BUCKETS = 16 * 16 * 16;

/**
 * How many pixels moved bucket between two frames.
 * @param one - One frame's histogram.
 * @param other - The other's.
 * @returns The pixels that changed bucket, each counted once.
 */
function pixelsMoved(one: Uint32Array, other: Uint32Array): number {
    let moved = 0;

    for (let bucket = 0; bucket < BUCKETS; bucket++) {
        moved += Math.abs(one[bucket] - other[bucket]);
    }

    return moved / 2;
}

/**
 * Wait until the graph's own render loop has drawn some frames.
 * @param graph - The graph whose render loop to count.
 * @param count - How many frames.
 */
async function framesDrawn(graph: Graph, count: number): Promise<void> {
    const scene = graph.getScene();

    await new Promise<void>((resolve) => {
        let drawn = 0;
        const observer = scene.onAfterRenderObservable.add(() => {
            drawn++;

            if (drawn >= count) {
                scene.onAfterRenderObservable.remove(observer);
                resolve();
            }
        });
    });
}

/** Shader sources held back by {@link holdShadersBack}, and the way to let them through. */
interface HeldShaders {
    /** How many shader fetches are being held. */
    readonly held: number;
    /** Let every held fetch, and every later one, through. */
    release: () => void;
    /** Settles once every fetch held so far has finished. */
    arrived: () => Promise<unknown>;
}

/** Where the camera is and where every node is, as one comparable value. */
interface Picture {
    camera: string;
    nodes: string;
}

describe("knowing the picture is final", () => {
    let container: HTMLElement;
    let graph: Graph;

    /**
     * Everything that would make the rendered picture different, in one string.
     *
     * Read from the LAYOUT ENGINE rather than from the meshes, because the engine is where the
     * meshes get their positions and so cannot lag them, and from the camera state the element
     * publishes, because framing is the half of the picture the layout does not own.
     * @returns The camera and the node positions, as text.
     */
    function picture(): Picture {
        const engine = graph.getLayoutManager().layoutEngine;
        const nodes = [...graph.getLayoutManager().nodes].map((node) => {
            const at = engine?.getNodePosition(node);
            return `${String(node.id)}:${JSON.stringify(at)}`;
        });

        return { camera: JSON.stringify(graph.getCameraState()), nodes: nodes.join("|") };
    }

    /**
     * A coarse colour histogram of what is on the canvas now, without drawing anything.
     * @returns One count per four-bit-per-channel colour bucket.
     */
    async function histogram(): Promise<Uint32Array> {
        const { engine } = graph;
        const pixels = (await engine.readPixels(
            0,
            0,
            engine.getRenderWidth(),
            engine.getRenderHeight(),
        )) as unknown as Uint8Array;
        const counts = new Uint32Array(BUCKETS);

        for (let at = 0; at < pixels.length; at += 4) {
            counts[((pixels[at] >> 4) << 8) | ((pixels[at + 1] >> 4) << 4) | (pixels[at + 2] >> 4)]++;
        }

        return counts;
    }

    /**
     * Hold back every shader source this graph's engine fetches from now on, until released.
     *
     * Babylon fetches a shader's source with a dynamic `import()` the first time an effect needs
     * a variant, through the `extraInitializationsAsync` step of `createEffect`. Holding that
     * step stands in for a slow module server -- the pre-push gate, where the dev server shares a
     * process with thousands of unit tests. Effects already compiled are cached and unaffected.
     * @returns The held fetches, and the way to release them.
     */
    function holdShadersBack(): HeldShaders {
        const engine = graph.engine as unknown as {
            createEffect: (base: unknown, options: unknown, ...rest: unknown[]) => unknown;
        };
        const createEffect = engine.createEffect.bind(engine);
        let release = (): void => undefined;
        const gate = new Promise<void>((resolve) => {
            release = resolve;
        });
        const fetches: Promise<void>[] = [];

        engine.createEffect = (base, options, ...rest) => {
            const initialise = (options as { extraInitializationsAsync?: () => Promise<void> } | null)
                ?.extraInitializationsAsync;

            if (initialise === undefined) {
                return createEffect(base, options, ...rest);
            }

            return createEffect(
                base,
                {
                    ...(options as object),
                    extraInitializationsAsync: () => {
                        const fetch = gate.then(initialise);
                        fetches.push(fetch);

                        return fetch;
                    },
                },
                ...rest,
            );
        };

        return {
            get held() {
                return fetches.length;
            },
            release,
            arrived: () => Promise.allSettled(fetches),
        };
    }

    /**
     * Draw some frames with the shaders still held, check the element does not call that picture
     * final, then let the shaders through and wait for the picture the element calls final.
     * @param shaders - The held shaders.
     * @param what - What the held shaders draw, for the failure messages.
     * @returns The final picture, and a later one drawn once every held shader has arrived.
     */
    async function finalAndLater(
        shaders: HeldShaders,
        what: string,
    ): Promise<{ final: Uint32Array; later: Uint32Array }> {
        await framesDrawn(graph, HELD_FRAMES);
        assert.isAbove(shaders.held, 0, `no shader for ${what} was fetched, so holding them back proves nothing`);
        assert.isFalse(
            graph.isFrameStable,
            `the picture was called final while the shaders for ${what} were held back`,
        );

        shaders.release();
        await graph.waitForStableFrame({ timeoutMs: STABLE_TIMEOUT_MS });
        const final = await histogram();

        await shaders.arrived();
        await framesDrawn(graph, TAIL_FRAMES);
        const later = await histogram();

        return { final, later };
    }

    beforeEach(async () => {
        container = document.createElement("div");
        container.style.width = "400px";
        container.style.height = "300px";
        document.body.appendChild(container);
        graph = new Graph(container);
        await graph.init();
    });

    afterEach(() => {
        graph.dispose();
        container.remove();
    });

    it("does not call the picture final at the moment the layout settles", async () => {
        let stableWhenSettled: boolean | undefined;
        let drawnWhenSettled: number | undefined;
        let drawn = 0;

        graph.getScene().onAfterRenderObservable.add(() => {
            drawn++;
        });

        graph.on("graph-settled", () => {
            stableWhenSettled ??= graph.isFrameStable;
            drawnWhenSettled ??= drawn;
        });

        await graph.addNodes(NODES);
        await graph.addEdges(EDGES);
        await graph.waitForStableFrame({ timeoutMs: STABLE_TIMEOUT_MS });

        const drawnWhenFinal = drawn;

        assert.isFalse(
            stableWhenSettled,
            "graph-settled fires a pass before the final framing is even requested, so the picture it announces is not the final one",
        );
        assert.isTrue(graph.isFrameStable, "the wait resolved, so the element says the picture is final");
        assert.isDefined(drawnWhenSettled, "the layout settled");
        assert.isAbove(
            drawnWhenFinal,
            drawnWhenSettled ?? 0,
            "frames were drawn between the layout settling and the picture being called final -- which is where the camera is framed",
        );
        assert.isTrue(
            graph.getUpdateManager().zoomToFitCompleted,
            "the camera had been framed by the time the picture was called final",
        );
    });

    it("resolves only once nothing moves again", async () => {
        await graph.addNodes(NODES);
        await graph.addEdges(EDGES);
        await graph.waitForStableFrame({ timeoutMs: STABLE_TIMEOUT_MS });

        const before = picture();

        await framesDrawn(graph, TAIL_FRAMES);

        const after = picture();

        assert.equal(after.camera, before.camera, "the camera moved after the picture was called final");
        assert.equal(after.nodes, before.nodes, "the nodes moved after the picture was called final");
    });

    it("announces the final picture once, on an event any consumer can subscribe to", async () => {
        let announcements = 0;

        graph.on("graph-frame-stable", () => {
            announcements++;
        });

        await graph.addNodes(NODES);
        await graph.addEdges(EDGES);
        await graph.waitForStableFrame({ timeoutMs: STABLE_TIMEOUT_MS });

        assert.equal(announcements, 1, "one settlement, one announcement");
        assert.isTrue(
            graph.getUpdateManager().zoomToFitCompleted,
            "the camera had been framed before the announcement",
        );
    });

    it("does not call the picture final while a style edit is still waiting to be drawn", async () => {
        await graph.addNodes(NODES);
        await graph.addEdges(EDGES);
        await graph.waitForStableFrame({ timeoutMs: STABLE_TIMEOUT_MS });

        let drawn = 0;

        graph.getScene().onAfterRenderObservable.add(() => {
            drawn++;
        });

        // A style edit resolves once the style pass has run; the meshes catch up on the next
        // update pass the render loop runs. Between the two, the picture on screen is the old
        // one, and a consumer photographing it must be told to wait.
        await graph.getSession().styles.add({
            name: "recolour",
            target: "node",
            selector: { match: "everything" },
            set: { "node.color": "#ff00ff" },
        });

        const drawnAtEdit = drawn;

        if (graph.getStylePainter().hasPending) {
            assert.isFalse(graph.isFrameStable, "the edit is not on screen yet, so the frame is not final");
        }

        await graph.waitForStableFrame({ timeoutMs: STABLE_TIMEOUT_MS });

        assert.isFalse(graph.getStylePainter().hasPending, "the wait resolved with the edit still undrawn");
        assert.isAbove(drawn, drawnAtEdit, "a frame showing the edit was drawn before the wait resolved");
    });

    it("does not call the picture final while a mesh's shader is still arriving", async () => {
        // THE MECHANISM, NOT A TIMING GUESS. Babylon 8 fetches a StandardMaterial's shader
        // source with a dynamic `import()` the first time a material needs a new variant, and
        // a mesh whose shader is not ready is SKIPPED by the frame -- silently, with no error
        // and nothing in the scene graph to say so. Every node and every label is drawn
        // through a StandardMaterial. In the pre-push gate the dev server that answers that
        // import shares a process with thousands of unit tests, so the import took long
        // enough for the layout, the framing and the style pass to finish first, and the
        // element called a frame with no nodes and no labels in it final.
        //
        // Holding the import back until everything else has finished stands in for that
        // server: the layout settles and the camera is framed while no node can be drawn.
        const shaders = holdShadersBack();

        await graph.addNodes(NODES);
        await graph.addEdges(EDGES);
        await vi.waitFor(
            () => {
                assert.isTrue(graph.getUpdateManager().zoomToFitCompleted, "the camera was framed");
            },
            { timeout: STABLE_TIMEOUT_MS },
        );

        const { final, later } = await finalAndLater(shaders, "the nodes");

        assert.isAtMost(
            pixelsMoved(final, later),
            PIXEL_CHANGE,
            "the picture called final was missing meshes whose shaders had not arrived yet",
        );
    });

    it("does not call the picture final while a glow's shaders are still arriving", async () => {
        // The same hole one level up. A glow is drawn by an effect LAYER -- a render target,
        // two blur passes and a merge -- and each of those fetches its shader source the same
        // way. Until they arrive the layer composes nothing, again silently, so the frame
        // shows the node without its glow.
        //
        // The layout plays no part here, so it is one that arrives finished: settling the
        // physics layout first was most of this test's time.
        await graph.setLayout("circular");
        await graph.addNodes(NODES);
        await graph.addEdges(EDGES);
        await graph.waitForStableFrame({ timeoutMs: STABLE_TIMEOUT_MS });

        const shaders = holdShadersBack();

        await graph.getSession().styles.add({
            name: "glow",
            target: "node",
            selector: { match: "everything" },
            set: { "node.glow": "#ff00ff" },
        });
        await graph.waitForSettled();

        const { final, later } = await finalAndLater(shaders, "the glow");

        assert.isAtMost(
            pixelsMoved(final, later),
            PIXEL_CHANGE,
            "the picture called final was missing a glow whose shaders had not arrived yet",
        );
    });

    it("fails out loud rather than handing back a moving picture", async () => {
        // Deliberately not awaited: the queue is busy, so a one millisecond wait cannot be
        // satisfied honestly, and the only two answers are a rejection and a lie.
        const loading = graph.addNodes(NODES);
        let message = "";

        try {
            await graph.waitForStableFrame({ timeoutMs: 1 });
            assert.fail("the wait resolved on a graph that was still loading");
        } catch (error) {
            message = error instanceof Error ? error.message : String(error);
        }

        assert.include(message, "still changing", "the failure says the picture was not final");
        assert.include(message, "1 ms", "the failure says how long it waited");

        await loading;
    });
});

describe("pumping frames by hand", () => {
    let container: HTMLElement;
    let graph: Graph;

    beforeEach(() => {
        container = document.createElement("div");
        container.style.width = "400px";
        container.style.height = "300px";
        document.body.appendChild(container);
        // Never `init()`ed on purpose: nothing drives the render loop, so every frame drawn here
        // is one these methods drew.
        graph = new Graph(container);
    });

    afterEach(() => {
        graph.dispose();
        container.remove();
    });

    it("draws nothing when asked to step the model, and draws when asked to render", async () => {
        await graph.addNodes([{ id: "a" }, { id: "b" }]);
        await operationQueueOf(graph).waitForCompletion();

        let drawn = 0;
        graph.getScene().onAfterRenderObservable.add(() => {
            drawn++;
        });

        const updateManager = graph.getUpdateManager();
        const updatesBefore = updateManager.getRenderFrameCount();

        updateManager.stepFrames(3);

        assert.equal(drawn, 0, "stepFrames runs update passes and is not a renderer");
        assert.equal(updateManager.getRenderFrameCount(), updatesBefore + 3, "three update passes ran");

        updateManager.renderFrames(3);

        assert.equal(drawn, 3, "renderFrames draws one frame per pass");
        assert.equal(updateManager.getRenderFrameCount(), updatesBefore + 6, "three more update passes ran");
    });
});

describe("the helper every story captures through", () => {
    let container: HTMLElement;

    beforeEach(() => {
        container = document.createElement("div");
        container.style.width = "400px";
        container.style.height = "300px";
        document.body.appendChild(container);
    });

    afterEach(() => {
        container.remove();
    });

    it("does not hand a story back until the element says the picture is final", async () => {
        const element = document.createElement("graphty-element");

        // Reads as a formality and is not one: `Graphty` is the class this file imports, and
        // naming it in a VALUE position is what keeps the import -- and with it the
        // `customElements.define` that makes the tag above an element rather than an unknown
        // one. Imported only for its type, it is erased and the tag stays inert.
        assert.instanceOf(element, Graphty, "<graphty-element> is defined");

        container.appendChild(element);
        element.nodeData = NODES;
        element.edgeData = EDGES;

        assert.isFalse(element.isFrameStable, "nothing has been drawn yet");

        await waitForGraphSettled(container);

        assert.isTrue(
            element.isFrameStable,
            "the helper returned before the picture stopped changing, which is how a story gets photographed mid-flight",
        );
    });
});
