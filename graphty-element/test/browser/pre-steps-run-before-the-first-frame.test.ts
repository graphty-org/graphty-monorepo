/**
 * @file `preSteps` says the simulation is run before the first frame is drawn. For the commonest
 * graph there is, it was not run at all.
 *
 * WHAT `preSteps` IS FOR. A force layout is a simulation, and an unstepped one is a graph in
 * mid-flight: how far it has flown when the picture is taken depends on when the picture is taken.
 * `element.layoutBehavior = { layout: { preSteps: 2000 } }` is the element's answer to that -- run
 * the simulation this many times before anything is drawn, so the same data draws the same picture
 * twice. It is what a screenshot test, a thumbnail and a printed page all rest on.
 *
 * WHAT WENT WRONG. The setting was read in exactly one place: the pre-step loop that runs when a
 * layout is built. The element's own graph builds its default layout in its constructor, before
 * any data can possibly have arrived, so that loop ran against an engine holding zero nodes -- and
 * an engine with nothing in it reports itself settled, so the loop stopped on its first iteration
 * and the configured count was gone. Nothing threw and nothing was reported. The graph then
 * arranged itself over the following seconds inside the render loop instead, which is precisely
 * the mid-flight picture `preSteps` exists to prevent, and a consumer who set it to eight thousand
 * got exactly the same drifting graph as a consumer who left it at zero.
 *
 * Every graph whose data arrives after it is constructed was affected, which is nearly all of
 * them: an element whose `nodeData` is assigned, an element pointed at a URL, an element filled in
 * from a fetch. A graph handed its data before the layout was chosen was the only one that worked.
 *
 * WHAT IS PINNED HERE. Both orders. A layout chosen while the graph already holds data runs its
 * pre-steps there and then; a layout chosen before the data exists runs them on the first frame
 * that has a node to move, which is still before that frame is drawn. Not where the steps are
 * taken -- that is how, and how may change -- but that by the time the reader can see the graph,
 * the simulation has been run the number of times they asked for.
 *
 * HOW IT IS MEASURED. Through a layout engine written the way a third party writes one, handed to
 * `LayoutEngine.register` and chosen by name. It counts the steps the element takes and it never
 * reports itself settled, so nothing can stop the count early and the question "had the steps been
 * taken yet" has an exact answer. The count is read inside Babylon's `onBeforeRenderObservable`,
 * which fires after the element's per-frame update and before the frame is drawn -- so what the
 * assertions read is the state of the simulation at the moment the picture would have been taken.
 */

import "../../src/graphty-element";

import { afterAll, afterEach, assert, describe, test } from "vitest";

import {
    type AuthoredLayoutDescriptor,
    clearRegisteredLayoutsForTesting,
    type Edge,
    type EdgePosition,
    LayoutEngine,
    type Node,
    type Position,
} from "../../extend";
import type { Graphty } from "../../index.js";

/**
 * How many pre-steps the graphs below ask for.
 *
 * Far more than the element's own incremental placement takes (ten) or than a frame of the render
 * loop takes (one), so a count at or above it cannot have come from anything except the pre-steps
 * themselves.
 */
const PRE_STEPS = 500;

/** How long the element needs to connect, drain its queue and draw. */
const SETTLE_MS = 1000;

/** How long any wait below is allowed to take before it is called a failure. */
const PATIENCE_MS = 5000;

/** Roughly one animation frame, which is what the waits below poll at. */
const FRAME_MS = 16;

/** Four nodes, which is enough for "the graph has something to arrange". */
const NODES = [{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }];

/** A path through them. */
const EDGES = [
    { src: "a", dst: "b" },
    { src: "b", dst: "c" },
    { src: "c", dst: "d" },
];

/**
 * A live layout engine that counts what the element does to it and is never finished.
 *
 * It walks every node one unit further along the x axis per step and reports itself unsettled for
 * ever, so no settle check can cut a run of steps short. That is the whole point: the number of
 * steps the element took is then exactly the number it decided to take.
 */
class CountedStepsLayout extends LayoutEngine {
    static type = "test-counted-steps";
    static maxDimensions = 3;

    static descriptor: AuthoredLayoutDescriptor = {
        id: "test-counted-steps",
        plainName: "Counted steps",
        technicalName: "Step-counting test simulation",
        description: "Walks every node along one axis and counts how often the element steps it.",
        family: "geometric",
        kind: "live",
        maxDimensions: 3,
        sizeRating: "any",
        structuralInputs: [],
        engine: "test-counted-steps",
        options: [],
    };

    /** The engine the element is using right now, so a test can read it without reaching inside. */
    static latest: CountedStepsLayout | null = null;

    /** How many times the element has stepped this simulation. */
    stepCount = 0;

    private readonly nodeList: Node[] = [];
    private readonly edgeList: Edge[] = [];
    private readonly placed = new Map<Node, Position>();

    constructor() {
        super();
        CountedStepsLayout.latest = this;
    }

    /** How many nodes this engine has been given, which is how a test knows there is work to do. */
    get nodeCount(): number {
        return this.nodeList.length;
    }

    /**
     * Nothing to set up.
     * @returns a promise that is already resolved
     */
    init(): Promise<void> {
        return Promise.resolve();
    }

    addNode(n: Node): void {
        this.nodeList.push(n);
        this.placed.set(n, { x: this.nodeList.length * 10, y: 0, z: 0 });
    }

    addEdge(e: Edge): void {
        this.edgeList.push(e);
    }

    step(): void {
        this.stepCount++;

        for (const node of this.nodeList) {
            const at = this.coordsOf(node);

            this.placed.set(node, { x: at.x + 1, y: at.y, z: at.z ?? 0 });
        }
    }

    getNodePosition(n: Node): Position {
        return { ...this.coordsOf(n) };
    }

    setNodePosition(n: Node, p: Position): void {
        this.placed.set(n, { x: p.x, y: p.y, z: p.z ?? 0 });
        this.writeNodePosition(n, p.x, p.y, p.z ?? 0);
    }

    getEdgePosition(e: Edge): EdgePosition {
        return { src: this.getNodePosition(e.srcNode), dst: this.getNodePosition(e.dstNode) };
    }

    pin(): void {
        // Nothing here holds a node still; the element's position array keeps the pin.
    }

    unpin(): void {
        // See `pin`.
    }

    get nodes(): Iterable<Node> {
        return this.nodeList;
    }

    get edges(): Iterable<Edge> {
        return this.edgeList;
    }

    /** Never. Nothing may cut a run of pre-steps short while this engine is being measured. */
    get isSettled(): boolean {
        return false;
    }

    /**
     * Where this engine currently holds a node.
     * @param n - the node to read
     * @returns its coordinates, which are the origin for a node nothing has placed
     */
    private coordsOf(n: Node): Position {
        return this.placed.get(n) ?? { x: 0, y: 0, z: 0 };
    }
}

LayoutEngine.register(CountedStepsLayout);

let mounted: Graphty | null = null;

/**
 * Put an empty element on the page, asking for the counting layout and for pre-steps.
 * @returns the element, with no data on it yet
 */
function mountEmpty(): Graphty {
    const container = document.createElement("div");

    container.style.width = "400px";
    container.style.height = "300px";
    document.body.appendChild(container);

    const element = document.createElement("graphty-element");

    element.layoutBehavior = { layout: { preSteps: PRE_STEPS } };
    element.layout = CountedStepsLayout.type;
    container.appendChild(element);
    mounted = element;

    return element;
}

/**
 * Wait for the element to finish everything it has been asked to do.
 * @param element - the mounted element
 */
async function settle(element: Graphty): Promise<void> {
    await element.graph.operationQueue.waitForCompletion();
    await new Promise((resolve) => setTimeout(resolve, SETTLE_MS));
}

/**
 * Wait until something is true, or give up.
 * @param condition - what is being waited for
 * @returns true if it came true in time
 */
async function until(condition: () => boolean): Promise<boolean> {
    const deadline = Date.now() + PATIENCE_MS;

    while (Date.now() < deadline) {
        if (condition()) {
            return true;
        }

        await new Promise((resolve) => setTimeout(resolve, FRAME_MS));
    }

    return condition();
}

afterEach(() => {
    mounted?.parentElement?.remove();
    mounted = null;
    CountedStepsLayout.latest = null;
});

afterAll(() => {
    // The catalogue is global, so a later file asking what the element can offer must not be shown
    // this file's plugin.
    clearRegisteredLayoutsForTesting();
});

describe("the pre-steps a layout is configured with", () => {
    test("have been taken by the first frame that draws data which arrived later", async () => {
        const element = mountEmpty();

        await settle(element);

        const engine = CountedStepsLayout.latest;

        assert.isNotNull(engine, "the element was asked for the counting layout and did not build one");
        assert.equal(engine.nodeCount, 0, "the graph was mounted with no data, which is the case under test");

        // Read at the first frame that has a node to draw. Babylon fires this after the element's
        // per-frame update and before the frame itself, so this is the state of the simulation at
        // the moment the picture would have been taken.
        let stepsAtFirstFrameWithANode: number | null = null;

        element.graph.scene.onBeforeRenderObservable.add(() => {
            if (stepsAtFirstFrameWithANode === null && engine.nodeCount > 0) {
                stepsAtFirstFrameWithANode = engine.stepCount;
            }
        });

        element.nodeData = NODES;
        element.edgeData = EDGES;

        const drew = await until(() => stepsAtFirstFrameWithANode !== null);

        assert.isTrue(drew, "the graph never drew a frame with a node in it");
        assert.isAtLeast(
            stepsAtFirstFrameWithANode ?? 0,
            PRE_STEPS,
            `the graph asked for ${PRE_STEPS} pre-steps and its data arrived after it was constructed, and the ` +
                "first frame that drew that data was drawn with the simulation barely started. That frame is a " +
                "graph in mid-flight, which is the one thing preSteps exists to prevent. The pre-step loop ran " +
                "when the layout was built, against a graph holding no nodes: see LayoutManager.",
        );
    });

    test("are still taken there and then for a layout chosen after the data has arrived", async () => {
        const element = mountEmpty();

        element.nodeData = NODES;
        element.edgeData = EDGES;
        await settle(element);

        const before = CountedStepsLayout.latest?.stepCount ?? 0;

        await element.graph.setLayout(CountedStepsLayout.type);

        const engine = CountedStepsLayout.latest;

        assert.isNotNull(engine, "the element was asked for the counting layout again and did not build one");
        assert.isAtLeast(
            engine.stepCount,
            PRE_STEPS,
            "a layout chosen while the graph already held its data came back from `setLayout` without having " +
                `run the ${PRE_STEPS} pre-steps it was configured with -- so the first frame after the switch ` +
                "draws a graph in mid-flight",
        );
        assert.notEqual(before, engine.stepCount, "the new engine is not the one the counts were read from");
    });
});
