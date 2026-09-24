/**
 * @file Every way a graph can arrive, crossed with every moment a layer can be asked for.
 *
 * WHY A MATRIX RATHER THAN TWO TESTS. Two defects put the blank stories on screen, and neither is
 * about a layer, a selector or a channel -- both are about ORDER. One is "a style edit issued
 * before the data is set is discarded, and the run it handed back never settles"; the other is "a
 * graph loaded from a data source is never painted by the style stack at all". Between them they
 * blanked over fifty stories, and the whole repository could not see either, because every style
 * test in it loads the data first and then AWAITS the layer. Awaiting is what hides the first;
 * adding the layer after the load is what hides the second.
 *
 * So the thing worth testing is not the two defects. It is the surface they live on: three ways a
 * graph arrives times four moments a layer can be asked for, with every cell ending in the same
 * two facts -- every element has been painted by the stack, and every write verb's run reached an
 * answer. A future load path or a future write verb has a row or a column to go in, and a defect
 * of this shape has nowhere left to hide.
 *
 * THE FOURTH COLUMN IS THE ONE THE STORIES USE, and it is the one nothing covered. A render
 * function cannot await anything -- it returns an element synchronously -- so `stories/helpers.ts`
 * fires each style edit and forgets it, which it documents as deliberate: "a style edit is a
 * queued run that reports its own refusal, and a render function cannot await one". Thirty-four
 * variants of operation order in `property-order-independence.test.ts` and every one of them awaits
 * every step.
 */

import { afterEach, assert, beforeEach, describe, it } from "vitest";

import type { Layer, LayerSpec, Run } from "../../session";
/*
 * A value import, not a type import, and that is load-bearing: importing the package is what
 * defines the `<graphty-element>` custom element, and a module whose every binding is type-only is
 * erased before it can do that.
 */
import { Graphty } from "../../src/graphty-element";
import {
    assertEveryElementPainted,
    assertLayerPainted,
    assertRunSettles,
    assertStackContains,
} from "../helpers/paint-assertions";

/** A square, so every node has a degree of two and nothing can be right by being empty. */
const NODES = [{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }];

/** Its edges. */
const EDGES = [
    { src: "a", dst: "b" },
    { src: "b", dst: "c" },
    { src: "c", dst: "d" },
    { src: "d", dst: "a" },
];

/** The same graph as a JSON document, for the data-source column. */
const JSON_DOCUMENT = JSON.stringify({ nodes: NODES, edges: EDGES });

/**
 * The layer every cell asks for.
 *
 * It paints a channel the element's own default layer also paints, which is deliberate: what is
 * asserted is not that the colour is crimson but that THIS layer is among the layers that painted
 * the node. A channel nothing else writes would let a cell pass on a stack that had collapsed to
 * one layer.
 */
const LAYER: LayerSpec = {
    name: "Load matrix - every node crimson",
    target: "node",
    selector: { match: "everything" },
    set: { "node.color": "crimson" },
};

/** How long an element may take to build its renderer. */
const MOUNT_TIMEOUT_MS = 10000;

/** How long a write verb's run may take to commit or refuse. */
const RUN_TIMEOUT_MS = 5000;

/** Mounting an element and loading a graph is slower than the five-second default. */
const TEST_TIMEOUT_MS = 30000;

/** How long to leave for the microtasks a property setter starts before draining the queue. */
const TICK_MS = 50;

/** The ways a graph can arrive in the element. */
const LOAD_PATHS = ["the nodeData property", "addNodes and addEdges", "addDataFromSource"] as const;

/** One of them. */
type LoadPath = (typeof LOAD_PATHS)[number];

/** The moments a layer can be asked for, relative to the load. */
const TIMINGS = [
    "with no layer at all",
    "with the layer added before the load and awaited",
    "with the layer added before the load and not awaited",
    "with the layer added after the load",
] as const;

let container: HTMLDivElement;
let element: Graphty;

/**
 * Mount a `<graphty-element>` the way a page does and wait until its graph is live.
 * @returns The mounted element.
 */
async function mount(): Promise<Graphty> {
    container = document.createElement("div");
    container.style.width = "480px";
    container.style.height = "360px";
    document.body.appendChild(container);

    const mounted = document.createElement("graphty-element");

    assert.instanceOf(mounted, Graphty, "importing the package is what defines the custom element");

    mounted.style.width = "100%";
    mounted.style.height = "100%";
    mounted.style.display = "block";
    container.appendChild(mounted);

    const deadline = Date.now() + MOUNT_TIMEOUT_MS;

    while (!mounted.graph.initialized) {
        if (Date.now() > deadline) {
            throw new Error("the element never finished initialising");
        }

        await new Promise((resolve) => setTimeout(resolve, 20));
    }

    return mounted;
}

/**
 * Put the graph into the element by one of the three routes a consumer has.
 *
 * The property route is the one the stories and a plain HTML page take, and it is fire and forget
 * by construction -- a property setter cannot be awaited. The other two are awaitable, and are
 * awaited here, which is what a consumer would do.
 * @param target - The element to load.
 * @param path - Which route to take.
 */
async function load(target: Graphty, path: LoadPath): Promise<void> {
    switch (path) {
        case "the nodeData property":
            target.nodeData = NODES;
            target.edgeData = EDGES;
            break;
        case "addNodes and addEdges":
            await target.graph.addNodes(NODES);
            await target.graph.addEdges(EDGES);
            break;
        case "addDataFromSource":
            await target.addDataFromSource("json", { data: JSON_DOCUMENT });
            break;
        default:
            throw new Error(`no such load path: ${String(path)}`);
    }
}

/**
 * Wait until the element has nothing left in flight.
 *
 * Both halves are needed and they are different queues: the operation queue carries the data and
 * the layout, and `styles.settled()` is the element's own answer to "is there any painting I
 * started still on its way" -- the door it publishes precisely so that a consumer does not have
 * to count turns.
 * @param target - The element to wait on.
 */
async function settle(target: Graphty): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, TICK_MS));
    await target.graph.operationQueue.waitForCompletion();
    await target.session.styles.settled();
    await new Promise((resolve) => setTimeout(resolve, TICK_MS));
}

describe("whatever load path brought a graph in, the style stack has painted it", () => {
    beforeEach(async () => {
        element = await mount();
    });

    afterEach(() => {
        element.remove();
        container.remove();
    });

    for (const path of LOAD_PATHS) {
        for (const timing of TIMINGS) {
            it(
                `paints a graph loaded through ${path} ${timing}`,
                async () => {
                    const where = `${path}, ${timing}`;
                    const { session } = element;
                    let run: Run<Layer> | null = null;

                    if (timing === "with the layer added before the load and awaited") {
                        run = session.styles.add(LAYER);

                        const outcome = await assertRunSettles(run, RUN_TIMEOUT_MS, `${where}: the layer`);

                        assert.strictEqual(outcome, "resolved", `${where}: the element refused a valid layer`);
                    }

                    if (timing === "with the layer added before the load and not awaited") {
                        // Fired and forgotten, in the same tick as the load that follows. This is
                        // the order a render function is forced into, and the one order nothing
                        // else in the repository exercises.
                        run = session.styles.add(LAYER);
                    }

                    await load(element, path);

                    if (timing === "with the layer added after the load") {
                        run = session.styles.add(LAYER);
                    }

                    await settle(element);

                    if (run !== null) {
                        const outcome = await assertRunSettles(run, RUN_TIMEOUT_MS, `${where}: the layer`);

                        assert.strictEqual(outcome, "resolved", `${where}: the element refused a valid layer`);
                        assertStackContains(session, [LAYER.name], where);
                        assertLayerPainted(element.graph, LAYER.name, where);
                    }

                    assertEveryElementPainted(element.graph, where);
                },
                TEST_TIMEOUT_MS,
            );
        }
    }
});
