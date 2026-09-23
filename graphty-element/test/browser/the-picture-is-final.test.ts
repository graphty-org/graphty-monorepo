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

import { afterEach, assert, beforeEach, describe, it } from "vitest";

import { Graph } from "../../src/Graph";
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

/** How long to keep drawing after the element says the picture is final. */
const TAIL_MS = 400;

/** Room for the settle, the tail and a cold start. */
const CASE_TIMEOUT_MS = 30000;

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

    it(
        "does not call the picture final at the moment the layout settles",
        async () => {
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
        },
        CASE_TIMEOUT_MS,
    );

    it(
        "resolves only once nothing moves again",
        async () => {
            await graph.addNodes(NODES);
            await graph.addEdges(EDGES);
            await graph.waitForStableFrame({ timeoutMs: STABLE_TIMEOUT_MS });

            const before = picture();

            await new Promise((resolve) => setTimeout(resolve, TAIL_MS));

            const after = picture();

            assert.equal(after.camera, before.camera, "the camera moved after the picture was called final");
            assert.equal(after.nodes, before.nodes, "the nodes moved after the picture was called final");
        },
        CASE_TIMEOUT_MS,
    );

    it(
        "announces the final picture once, on an event any consumer can subscribe to",
        async () => {
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
        },
        CASE_TIMEOUT_MS,
    );

    it(
        "does not call the picture final while a style edit is still waiting to be drawn",
        async () => {
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
        },
        CASE_TIMEOUT_MS,
    );

    it(
        "fails out loud rather than handing back a moving picture",
        async () => {
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
        },
        CASE_TIMEOUT_MS,
    );
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
        await graph.operationQueue.waitForCompletion();

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

    it(
        "does not hand a story back until the element says the picture is final",
        async () => {
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
        },
        CASE_TIMEOUT_MS,
    );
});
