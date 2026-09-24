/**
 * @file Whether a style layer survives the order a render function has to use.
 *
 * WHY THIS FILE EXISTS, for a reader who has never opened this package. graphty-element paints
 * nodes and edges from a stack of style layers. A consumer changes that stack through write verbs
 * -- `session.styles.add`, `update`, `remove`, `move` -- and each of them hands back a `Run`: a
 * promise-shaped handle that either resolves with the layer or rejects with a coded refusal. The
 * published contract is that a write verb never throws and can be "fired from a click handler and
 * forgotten" (`docs/guide/styling.md`), because the refusal arrives on the run.
 *
 * A render function CANNOT await that run. It is called synchronously and must return markup, so
 * the only order available to it is: issue the style edits, set the data, return. Every existing
 * test of this system does the opposite -- it loads the data first and then awaits each edit --
 * and both of those choices independently hide a defect. Awaiting hides a run that is discarded
 * before it starts; loading first hides a load path that is never painted at all. So the orders
 * this file uses are not exotic: they are the orders the product's own stories use, and they were
 * the only orders nothing covered.
 *
 * THE TWO SEAMS UNDER TEST.
 *
 * The first is the operation queue. A style write is queued work, and the queue cancels work that
 * a newer operation has made obsolete -- a layout over positions that have moved, an algorithm
 * over data that has changed. A style edit is neither of those: it is a standing instruction about
 * how to paint whatever the graph holds, so arriving data cannot make it stale. What must hold is
 * that issuing an edit and then setting the data in the same tick leaves the layer in the stack,
 * painting, with its run settled -- and, whatever the queue decides, that the run SETTLES. A run
 * that neither resolves nor rejects is worse than a refusal: a consumer awaiting it waits forever
 * and nothing is reported anywhere.
 *
 * The second is the load path. Data reaches the element two ways -- handed in as records, or read
 * by a data source from a string, a file or a URL -- and a consumer chooses between them by which
 * method they call, not by what they expect the picture to be. Both must end with every element
 * painted from the style stack.
 *
 * WHAT IS ASSERTED, AND WITH WHAT INSTRUMENT. `session.styles.explain({ node })` is the
 * element's own answer to "what is this node painted, and which layers painted it". It reads the
 * bindings the repaint prepared, so it is sensitive to both failures at once: a layer that never
 * reached the stack contributes nothing, and a graph that was never painted has nothing prepared
 * to read, so it reports no contributions at all -- not even from the element's own default
 * layers. That last reading is the one a passing test cannot fake, because no story, no default
 * and no palette produces an empty explanation for a node that is on screen.
 *
 * Pixels are `style-paint-pixels.test.ts`; the stack's own rules are `style-layers.test.ts`.
 * Neither is touched by this file.
 */

import { afterEach, assert, beforeEach, describe, it } from "vitest";

import type { LayerSpec } from "../../src/catalog/types";
import { Graph } from "../../src/Graph";
import type { GraphSession } from "../../src/session";

/** How long a write verb's run is given to settle before it counts as stranded. */
const SETTLE_BUDGET_MS = 8000;

/** Per-test budget, generous because each case builds a real Babylon scene. */
const TEST_TIMEOUT_MS = 30_000;

/**
 * Four nodes in two named halves.
 *
 * The halves are uneven so that a layer which matched the wrong half, or matched everything, is
 * not hidden by a coincidence of arithmetic.
 */
const NODES = [
    { id: "a", half: "left" },
    { id: "b", half: "left" },
    { id: "c", half: "left" },
    { id: "d", half: "right" },
];

/** A line through all four, so the graph is connected and the layout has something to do. */
const EDGES = [
    { src: "a", dst: "b" },
    { src: "b", dst: "c" },
    { src: "c", dst: "d" },
];

/** The same graph as a document the built-in JSON data source reads. */
const NODES_AS_JSON = JSON.stringify({ nodes: NODES, edges: EDGES });

/** What the layer under test paints, chosen so no default and no palette produces it. */
const LEFT_COLOR = "#ff00aa";

/** What the second layer paints, so a stack of two can be told apart. */
const RIGHT_COLOR = "#00ccff";

let container: HTMLDivElement;
let graph: Graph;
let session: GraphSession;

/**
 * A layer painting one half, selected by an expression over the node's own data.
 *
 * An expression rather than a list of ids on purpose: the expression is compiled against the
 * snapshot's columns, and in every test below those columns do not exist yet when the layer is
 * issued. "The layer painted the rows that arrived afterwards" is the claim, and a selector that
 * had to be compiled late is what makes it a claim about the repaint rather than about bookkeeping.
 * @param half - Which half to paint.
 * @param color - What to paint it.
 * @returns The specification.
 */
function halfLayer(half: string, color: string): LayerSpec {
    return {
        name: `The ${half} half`,
        target: "node",
        selector: { match: "expression", where: `data.half == \`"${half}"\`` },
        set: { "node.color": color },
    };
}

/**
 * Whether a run reached an answer, and which, inside a budget.
 *
 * Both answers are acceptable to this helper: a refusal is a legitimate outcome of a write verb
 * and is what the published contract promises for one the element will not perform. What is not
 * acceptable is neither, which is what `"neither"` records.
 * @param work - The run.
 * @param ms - The budget.
 * @returns What it did.
 */
async function outcomeOf(work: PromiseLike<unknown>, ms = SETTLE_BUDGET_MS): Promise<"resolved" | "rejected" | "neither"> {
    let timer: ReturnType<typeof setTimeout> | undefined;

    const settled = Promise.resolve(work).then(
        () => "resolved" as const,
        () => "rejected" as const,
    );
    const expired = new Promise<"neither">((resolve) => {
        timer = setTimeout(() => {
            resolve("neither");
        }, ms);
    });

    try {
        return await Promise.race([settled, expired]);
    } finally {
        clearTimeout(timer);
    }
}

/**
 * What the style stack resolved for one node's colour, as `#rrggbb`.
 * @param id - The node id.
 * @returns The colour, or null when nothing painted that node's colour at all.
 */
function colorOf(id: string): string | null {
    return session.styles.explain({ node: id }).merged["node.color"]?.hex.toLowerCase() ?? null;
}

/**
 * The names of the layers that painted any part of one node.
 * @param id - The node id.
 * @returns The names, bottom first.
 */
function paintersOf(id: string): string[] {
    return session.styles.explain({ node: id }).contributions.map((contribution) => contribution.name);
}

/**
 * The names of the layers in the stack, bottom first.
 * @returns The names.
 */
function layerNames(): string[] {
    return session.styles.list().map((layer) => layer.name);
}

beforeEach(async () => {
    container = document.createElement("div");
    container.style.width = "800px";
    container.style.height = "600px";
    document.body.appendChild(container);
    graph = new Graph(container);
    await graph.init();
    session = graph.getSession();
    // Deliberately NO data here. Every test below is about what happens to an edit issued while
    // the graph is still empty, so a beforeEach that loaded a graph would be the thing under test.
});

afterEach(async () => {
    // Drained before the graph is thrown away: a style edit is queued work and the element
    // repaints behind every finished run, so disposing with one in flight runs that repaint
    // against a store the dispose has already emptied.
    await graph.operationQueue.waitForCompletion();
    graph.dispose();
    container.remove();
});

describe("a layer issued before the data arrives, and not awaited", () => {
    it(
        "is in the stack once the queue has drained",
        async () => {
            const run = session.styles.add(halfLayer("left", LEFT_COLOR));

            void graph.addNodes(NODES);
            void graph.addEdges(EDGES);

            await graph.operationQueue.waitForCompletion();
            await outcomeOf(run);

            assert.include(layerNames(), "The left half", "the layer a render function asked for is not in the stack");
        },
        TEST_TIMEOUT_MS,
    );

    it(
        "paints the rows that arrived after it",
        async () => {
            const run = session.styles.add(halfLayer("left", LEFT_COLOR));

            void graph.addNodes(NODES);
            void graph.addEdges(EDGES);

            await graph.operationQueue.waitForCompletion();
            await outcomeOf(run);
            await session.styles.settled();

            assert.strictEqual(colorOf("a"), LEFT_COLOR, "the left half is not painted what the layer asked for");
            assert.strictEqual(colorOf("c"), LEFT_COLOR, "the left half is not painted what the layer asked for");
            assert.notStrictEqual(colorOf("d"), LEFT_COLOR, "the layer reached a node its selector excludes");
        },
        TEST_TIMEOUT_MS,
    );

    it(
        "settles its run, whichever way the queue decides",
        async () => {
            const run = session.styles.add(halfLayer("left", LEFT_COLOR));

            void graph.addNodes(NODES);
            void graph.addEdges(EDGES);

            const outcome = await outcomeOf(run);

            assert.notStrictEqual(
                outcome,
                "neither",
                `a write verb's run neither resolved nor rejected within ${SETTLE_BUDGET_MS} ms, so a consumer awaiting it waits forever`,
            );
        },
        TEST_TIMEOUT_MS,
    );

    it(
        "keeps both layers of a two-layer stack issued in the same tick",
        async () => {
            const left = session.styles.add(halfLayer("left", LEFT_COLOR));
            const right = session.styles.add(halfLayer("right", RIGHT_COLOR));

            void graph.addNodes(NODES);
            void graph.addEdges(EDGES);

            await graph.operationQueue.waitForCompletion();
            await outcomeOf(left);
            await outcomeOf(right);
            await session.styles.settled();

            assert.deepStrictEqual(
                layerNames().filter((name) => name.endsWith(" half")),
                ["The left half", "The right half"],
                "a render function's layers did not both reach the stack, bottom first",
            );
            assert.strictEqual(colorOf("a"), LEFT_COLOR, "the lower layer did not paint");
            assert.strictEqual(colorOf("d"), RIGHT_COLOR, "the upper layer did not paint");
        },
        TEST_TIMEOUT_MS,
    );
});

describe("every write verb, issued in the same tick as the data", () => {
    it(
        "settles add",
        async () => {
            const run = session.styles.add(halfLayer("left", LEFT_COLOR));

            void graph.addNodes(NODES);

            assert.notStrictEqual(await outcomeOf(run), "neither", "add() never settled");
        },
        TEST_TIMEOUT_MS,
    );

    it(
        "settles update",
        async () => {
            const layer = await session.styles.add(halfLayer("left", LEFT_COLOR));
            const run = session.styles.update(layer.id, { set: { "node.color": RIGHT_COLOR } });

            void graph.addNodes(NODES);

            assert.notStrictEqual(await outcomeOf(run), "neither", "update() never settled");
        },
        TEST_TIMEOUT_MS,
    );

    it(
        "settles remove",
        async () => {
            const layer = await session.styles.add(halfLayer("left", LEFT_COLOR));
            const run = session.styles.remove(layer.id);

            void graph.addNodes(NODES);

            assert.notStrictEqual(await outcomeOf(run), "neither", "remove() never settled");
        },
        TEST_TIMEOUT_MS,
    );

    it(
        "settles move",
        async () => {
            const lower = await session.styles.add(halfLayer("left", LEFT_COLOR));
            const upper = await session.styles.add(halfLayer("right", RIGHT_COLOR));
            const run = session.styles.move(upper.id, lower.id);

            void graph.addNodes(NODES);

            assert.notStrictEqual(await outcomeOf(run), "neither", "move() never settled");
        },
        TEST_TIMEOUT_MS,
    );
});

describe("a graph read by a data source", () => {
    it(
        "is painted from the style stack even with no layer added at all",
        async () => {
            await graph.addDataFromSource("json", { data: NODES_AS_JSON });
            await graph.operationQueue.waitForCompletion();
            await session.styles.settled();

            assert.isNotEmpty(
                paintersOf("a"),
                "no layer painted a node the data source loaded, not even the element's own defaults, so the stack never ran over this graph",
            );
            assert.isNotNull(colorOf("a"), "the element's own default layer never painted a colour onto a loaded node");
        },
        TEST_TIMEOUT_MS,
    );

    it(
        "paints a layer that was added before the load",
        async () => {
            const run = session.styles.add(halfLayer("left", LEFT_COLOR));

            await graph.addDataFromSource("json", { data: NODES_AS_JSON });
            await graph.operationQueue.waitForCompletion();
            await outcomeOf(run);
            await session.styles.settled();

            assert.include(layerNames(), "The left half", "the layer is not in the stack");
            assert.strictEqual(colorOf("a"), LEFT_COLOR, "the layer did not paint the rows the load brought in");
            assert.notStrictEqual(colorOf("d"), LEFT_COLOR, "the layer reached a node its selector excludes");
        },
        TEST_TIMEOUT_MS,
    );

    it(
        "paints every node it loaded, not only the first",
        async () => {
            await graph.addDataFromSource("json", { data: NODES_AS_JSON });
            await graph.operationQueue.waitForCompletion();
            await session.styles.settled();

            for (const { id } of NODES) {
                assert.isNotEmpty(paintersOf(id), `node "${id}" was never painted by the stack`);
            }
        },
        TEST_TIMEOUT_MS,
    );
});
