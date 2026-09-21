/**
 * @file The style layer stack, over a real graph, in a real browser.
 *
 * Every other test of this system supplies its own world: a fixed table of five nodes, a
 * hand-written run result, and a repaint that records what it was asked for and paints nothing.
 * That shape is right for testing the stack's rules, and it cannot test the one thing that only
 * exists here -- a selector compiled against a real snapshot's columns, repainted by the real
 * columnar pass, over the results a real algorithm published, across a freeze that renumbers the
 * index space underneath a live stack.
 *
 * WHAT IS ASSERTED, AND WHAT IS DELIBERATELY NOT. The renderer does not read this system yet:
 * `Node.ts`, `Edge.ts` and `Styles.ts` still fetch a style through the old static table. So
 * nothing here asserts a mesh, a material or a pixel -- that would be an assertion about the OLD
 * system wearing this file's name. What is asserted is what the MODEL resolves.
 *
 * HOW "WHAT THE MODEL RESOLVES" IS READ, since it is not obvious. `StyleChange.painted` is the
 * real columnar pass reporting the dirty set it just walked, so it is how many elements a layer
 * actually reached -- a layer that quietly matched the whole graph and a layer that quietly
 * matched none are both visible in that one number. WHICH elements comes from the other side: a
 * run's `RunResult.node(id)` answers per element whether the run produced anything for it, so
 * "the layer painted exactly what the run measured" is a count from the repaint checked against
 * membership from the result. The graph below is built so that every count in this file is
 * distinct -- three hosts, two services, one storage node, four route nodes, five reached nodes,
 * six nodes -- because a selector that matched the wrong group would otherwise be hidden by a
 * coincidence of arithmetic.
 */

import { afterEach, assert, beforeEach, describe, it } from "vitest";

import type { LayerSpec } from "../../src/catalog/types";
import { isGraphtyError } from "../../src/errors";
import { Graph } from "../../src/Graph";
import type { GraphSession } from "../../src/session";
import type { StyleChange } from "../../src/session/styles";

/**
 * Six nodes in three groups of different sizes, one of them connected to nothing.
 *
 * The sizes differ on purpose: a layer meant for the hosts that matched the services instead
 * would report the same count if the two groups were the same size. The unconnected node is the
 * one an algorithm has the least to say about, which is what tells "measured everything" apart
 * from "measured everything it could reach".
 */
const NODES = [
    { id: "a", type: "host" },
    { id: "b", type: "host" },
    { id: "c", type: "host" },
    { id: "d", type: "service" },
    { id: "e", type: "service" },
    { id: "f", type: "storage" },
];

/** A line from a to e with one shortcut across it, so the cheapest route is not the only route. */
const EDGES = [
    { src: "a", dst: "b" },
    { src: "b", dst: "c" },
    { src: "a", dst: "c" },
    { src: "c", dst: "d" },
    { src: "d", dst: "e" },
];

/** How many nodes of {@link NODES} carry `type: "host"`. */
const HOSTS = 3;

/** How many nodes of {@link NODES} carry `type: "service"`. */
const SERVICES = 2;

/** How many nodes a breadth-first walk from a reaches: everything except the unconnected one. */
const REACHED = 5;

/** The nodes on the cheapest route from a to e: a, c, d, e. */
const ROUTE_NODES = 4;

/** The edges of that route: a-c, c-d, d-e. */
const ROUTE_EDGES = 3;

/** A second dataset whose node count and host count both differ from the first. */
const RELOADED_NODES = [
    { id: "p", type: "host" },
    { id: "q", type: "host" },
    { id: "r", type: "host" },
    { id: "s", type: "host" },
    { id: "t", type: "service" },
];

/** Edges of the second dataset. */
const RELOADED_EDGES = [
    { src: "p", dst: "q" },
    { src: "q", dst: "r" },
    { src: "r", dst: "s" },
    { src: "s", dst: "t" },
];

/** How many nodes of {@link RELOADED_NODES} carry `type: "host"`. */
const RELOADED_HOSTS = 4;

let container: HTMLDivElement;
let graph: Graph;
let session: GraphSession;
/** Every change the session announced, newest last. */
let changes: StyleChange[];
let stopWatching: (() => void) | null = null;

/**
 * A layer that paints one kind of node.
 * @param type - The `type` attribute to match.
 * @param name - What to call the layer, so two of them can be told apart in one stack.
 * @returns The specification.
 */
function typeLayer(type: string, name = `Every ${type}`): LayerSpec {
    return {
        name,
        target: "node",
        selector: { match: "expression", where: `data.type == \`"${type}"\`` },
        set: { "node.color": "#ff9900" },
    };
}

/**
 * How much the repaint that the call under test triggered actually visited.
 * @returns The report, which is never null on a session that paints.
 */
function painted(): { nodes: number; edges: number } {
    const change = changes.at(-1);

    assert.isDefined(change, "the session announced no change at all");
    assert.isNotNull(change.painted, "this session runs a repaint, so it reports what it painted");

    return change.painted;
}

/**
 * The code an asynchronous call refused with.
 * @param call - The call.
 * @returns The code, or null when it did not refuse.
 */
async function codeOf(call: () => PromiseLike<unknown>): Promise<string | null> {
    try {
        await call();
    } catch (error) {
        return isGraphtyError(error) ? error.code : "not-a-graphty-error";
    }

    return null;
}

/**
 * The code a synchronous read refused with.
 * @param read - The read.
 * @returns The code, or null when it did not refuse.
 */
function syncCodeOf(read: () => unknown): string | null {
    try {
        read();
    } catch (error) {
        return isGraphtyError(error) ? error.code : "not-a-graphty-error";
    }

    return null;
}

/** Throw away the graph's data and load a different one, the way a second file does. */
async function reload(): Promise<void> {
    graph.getDataManager().clear();
    await graph.addNodes(RELOADED_NODES);
    await graph.addEdges(RELOADED_EDGES);
    await graph.operationQueue.waitForCompletion();
}

beforeEach(async () => {
    container = document.createElement("div");
    container.style.width = "800px";
    container.style.height = "600px";
    document.body.appendChild(container);
    graph = new Graph(container);
    await graph.init();

    session = graph.getSession();
    changes = [];
    stopWatching = session.on("style:changed", (change) => {
        changes.push(change);
    });

    await graph.addNodes(NODES);
    await graph.addEdges(EDGES);
    await graph.operationQueue.waitForCompletion();
});

afterEach(() => {
    stopWatching?.();
    stopWatching = null;
    graph.dispose();
    container.remove();
});

describe("a layer over a real loaded graph", () => {
    it("resolves the group its selector names, and not one of the other two", async () => {
        await session.styles.add(typeLayer("host"));
        assert.deepStrictEqual(painted(), { nodes: HOSTS, edges: 0 }, "a node layer paints no edges");

        await session.styles.add(typeLayer("service"));
        assert.strictEqual(painted().nodes, SERVICES);

        await session.styles.add(typeLayer("storage"));
        assert.strictEqual(painted().nodes, 1);
    });

    it("resolves none when nothing matches, rather than everything", async () => {
        await session.styles.add(typeLayer("router"));

        assert.strictEqual(painted().nodes, 0, "an empty answer, not a universal one");
        assert.strictEqual(session.styles.list().length, 3, "a layer that paints nothing is still a layer");
    });

    it("paints the whole graph only when the layer says so outright", async () => {
        await session.styles.add({ ...typeLayer("host", "Everything"), selector: { match: "everything" } });

        assert.strictEqual(painted().nodes, NODES.length);
    });

    it("refuses the empty selector that used to mean everything", async () => {
        const code = await codeOf(() =>
            session.styles.add({ ...typeLayer("host"), selector: { match: "expression", where: "" } }),
        );

        assert.strictEqual(code, "E_SELECTOR_EMPTY");
        assert.strictEqual(session.styles.list().length, 2);
    });

    it("reads the snapshot's own id map for an ids selector", async () => {
        await session.styles.add({
            ...typeLayer("host", "Two by name"),
            selector: { match: "ids", nodes: ["b", "f"] },
        });

        // Two nodes from two different groups, so neither group's count can stand in for this.
        assert.strictEqual(painted().nodes, 2);
    });
});

describe("the element's own layers, on a rendered graph", () => {
    it("are at the bottom of the stack and marked as the element's", () => {
        const stack = session.styles.list();

        assert.strictEqual(stack.length, 2, "one for nodes, one for edges");
        assert.deepStrictEqual(
            stack.map((layer) => layer.target),
            ["node", "edge"],
        );

        for (const layer of stack) {
            assert.deepStrictEqual(layer.source, { by: "element", reason: "default" });
            assert.isTrue(layer.locked);
        }
    });

    it("refuse to be removed, edited or moved, and the stack is unchanged by the refusal", async () => {
        const [base] = session.styles.list();

        assert.isDefined(base);
        assert.strictEqual(await codeOf(() => session.styles.remove(base.id)), "E_PROTECTED");
        assert.strictEqual(await codeOf(() => session.styles.update(base.id, { name: "Mine now" })), "E_PROTECTED");
        assert.strictEqual(await codeOf(() => session.styles.move(base.id, null)), "E_PROTECTED");
        assert.strictEqual(session.styles.list().length, 2);
    });

    it("are never swept away by a source sweep that names everything", async () => {
        await session.styles.add(typeLayer("host"));

        const swept = await session.styles.removeBySource(() => true);

        assert.strictEqual(swept.length, 1, "the consumer's layer went, the element's stayed");
        assert.strictEqual(session.styles.list().length, 2);
    });

    it("are not in a document a consumer saves", async () => {
        await session.styles.add(typeLayer("host"));

        const saved = session.styles.toDocument();

        assert.strictEqual(saved.layers.length, 1, "what a document holds is what somebody chose");
    });
});

describe("an encoding over a real algorithm run", () => {
    it("writes a selector scoped to what the run measured, so the consumer cannot get it wrong", async () => {
        const run = session.runs.start("degree", {}, { as: "degree" });
        await run;

        const layer = await session.styles.encode({ run: run.id, channel: "node.color" });

        assert.deepStrictEqual(layer.selector, { match: "has", path: "results.degree.value" });
        assert.deepStrictEqual(layer.source, { by: "run", runId: "degree", algorithm: "degree", params: run.params });
        assert.strictEqual(layer.kind, "encoding");
    });

    it("resolves every node degree measured, the unconnected one included", async () => {
        const run = session.runs.start("degree", {}, { as: "degree" });
        const result = await run;

        await session.styles.encode({ run: run.id, channel: "node.color" });

        // Degree has something to say about a node with no edges: the answer is zero.
        assert.strictEqual(result.node("f")?.value, 0);
        assert.strictEqual(painted().nodes, NODES.length);
    });

    it("leaves an element the run never measured out of the layer entirely", async () => {
        // A breadth-first walk from a reaches everything except the unconnected node, and it
        // publishes a row only for what it reached. That is the whole claim in one run: an
        // element the algorithm has nothing to say about is not in the layer at all, rather than
        // in it carrying a default.
        const run = session.runs.start("bfs", { source: "a" }, { as: "reach" });
        const result = await run;

        const layer = await session.styles.encode({ run: run.id, channel: "node.color" });

        assert.isUndefined(result.node("f"), "the walk never reached f");
        assert.isDefined(result.node("e"), "it did reach e");
        assert.deepStrictEqual(layer.selector, { match: "has", path: "results.reach.level" });
        assert.strictEqual(painted().nodes, REACHED);
        assert.isBelow(REACHED, NODES.length, "a run that measured five of six must not resolve six");
    });

    it("replaces the layer already painting that channel from that run, rather than stacking one", async () => {
        const run = session.runs.start("degree", {}, { as: "degree" });
        await run;

        const first = await session.styles.encode({ run: run.id, channel: "node.color" });
        const second = await session.styles.encode({ run: run.id, channel: "node.color", palette: "magma" });

        assert.strictEqual(second.id, first.id, "taken over in place, keeping the id");
        assert.strictEqual(session.styles.list().length, 3, "two element layers and one encoding, not two encodings");
    });

    it("refuses a run this session never held", async () => {
        assert.strictEqual(
            await codeOf(() => session.styles.encode({ run: "nosuchrun", channel: "node.color" })),
            "E_UNKNOWN_RUN",
        );
    });
});

describe("a layer bound to what one run chose", () => {
    it("resolves the route the run found, and none of the graph around it", async () => {
        const run = session.runs.start("shortest-path", { source: "a", target: "e" }, { as: "route" });
        const result = await run;

        // A route NAMES a subset rather than measuring everything, so it is painted with
        // highlight() rather than encoded -- one layer for the nodes it chose and one for the
        // edges, because a layer paints one half of a graph and never both.
        const layers = await session.styles.highlight({ run: run.id });

        assert.strictEqual(layers.length, 2);
        assert.deepStrictEqual(
            layers.map((layer) => layer.target),
            ["node", "edge"],
        );

        // a -> c -> d -> e is cheaper than a -> b -> c -> d -> e, so b was looked at and passed
        // over, and f was never reachable at all.
        assert.strictEqual(result.node("c")?.onPath, true);
        assert.strictEqual(result.node("b")?.onPath, false, "looked at, not chosen");

        // THE COUNT IS THE POINT: a run that chose four of six nodes must resolve four, not six,
        // and that is the whole performance claim of a run-bound layer.
        assert.deepStrictEqual(painted(), { nodes: ROUTE_NODES, edges: ROUTE_EDGES });
        assert.isBelow(ROUTE_NODES, NODES.length, "four of six, not six of six");
        assert.isBelow(ROUTE_EDGES, EDGES.length, "three of five, not five of five");
    });

    it("asks the membership column for its value, so the elements it passed over stay unpainted", async () => {
        const run = session.runs.start("shortest-path", { source: "a", target: "e" }, { as: "route" });
        await run;

        const [nodeLayer] = await session.styles.highlight({ run: run.id });

        assert.isDefined(nodeLayer);
        // Every node the search looked at carries `onPath`, false included, so a presence test
        // would paint the whole neighbourhood in the colour of the route. The layer tests the
        // VALUE, and the count above is what proves it.
        assert.deepStrictEqual(nodeLayer.selector, { match: "expression", where: "results.route.onPath == `true`" });
        assert.strictEqual(nodeLayer.kind, "highlight");
    });

    it("replaces the previous highlight rather than painting a second one over it", async () => {
        const first = session.runs.start("shortest-path", { source: "a", target: "e" }, { as: "first_route" });
        await first;
        await session.styles.highlight({ run: first.id });

        const second = session.runs.start("shortest-path", { source: "b", target: "e" }, { as: "second_route" });
        await second;
        await session.styles.highlight({ run: second.id });

        const highlights = session.styles.list().filter((layer) => layer.kind === "highlight");

        assert.strictEqual(highlights.length, 2, "one for the nodes and one for the edges of ONE route");
        assert.isTrue(highlights.every((layer) => layer.source.by === "run" && layer.source.runId === "second_route"));
    });

    /*
     * A HYPHEN IN A RUN ID IS WHY highlight() QUOTES THE SEGMENT IT INTERPOLATES.
     *
     * highlight() composes the expression "results.<runId>.<field> == `true`" and hands it to the
     * expression parser, which reads an unquoted name as [A-Za-z_][A-Za-z0-9_]* exactly as
     * JMESPath does (src/session/styles/predicate.ts). Written plain, a run called "first-route"
     * lexes as a subtraction and the layer is refused before it reaches the stack.
     *
     * This is not an exotic id. assertRunId admits hyphens by name, and deriveRunId MINTS them:
     * the default id of a run is algorithmSlug(algorithm) plus a digest, and the slug keeps the
     * key's hyphens. So every default-id run of "shortest-path", "min-cut" and
     * "bipartite-matching" -- the shape highlight() exists for -- was refused, and those
     * algorithms drew no picture at all. The three tests above pass either way, because they name
     * their runs with an underscore; this one is the one that fails when the quoting goes.
     */
    it("quotes its own generated selector, so a run id carrying a hyphen still paints", async () => {
        const run = session.runs.start("shortest-path", { source: "a", target: "e" });
        await run;

        assert.include(run.id, "-", "the default id of a hyphenated algorithm key carries the hyphen");

        const [nodeLayer] = await session.styles.highlight({ run: run.id });

        assert.isDefined(nodeLayer);
        assert.deepStrictEqual(nodeLayer.selector, {
            match: "expression",
            where: `results.${JSON.stringify(run.id)}.onPath == \`true\``,
        });
        assert.strictEqual(session.styles.list().length, 4, "the element's two, plus one per half of the route");
        assert.deepStrictEqual(painted(), { nodes: ROUTE_NODES, edges: ROUTE_EDGES });
    });
});

/**
 * WHAT A READER IS TOLD, AND THE ONE WIRE THAT IS NOT CONNECTED.
 *
 * `legend()` and `explain()` are reads of the PREPARED BINDINGS the last repaint painted from --
 * that is what makes them a reading of the object that made the picture rather than a second
 * guess at it -- and a session supplies those through `StylesSources.encoding`.
 *
 * A session supplies none. `createGraphSession` builds the styles API without an `encoding`
 * member (`src/session/GraphSession.ts:1042-1058`), and it has nothing to supply: the columnar
 * repaint prepares a binding per layer and keeps it in a private `WeakMap`, and `RepaintEngine`
 * (`src/session/styles/repaint.ts:144-202`) publishes no way to read one back. So both verbs fall
 * through to the "nothing is prepared" default on every real graph, not only on a headless one.
 *
 * The two tests below pin THAT rather than asserting the contract and failing, so the suite stays
 * honest about where the migration has got to. What the contract says is written in each one, and
 * each has to be inverted when the wire lands. The half that IS connected -- resolving an element
 * id against the real snapshot -- is asserted for real, because that half is the element's to get
 * wrong on every freeze.
 */
describe("what a reader is told about a real run", () => {
    it("resolves a real element id, and refuses one the graph does not hold", async () => {
        const run = session.runs.start("degree", {}, { as: "degree" });
        await run;
        await session.styles.encode({ run: run.id, channel: "node.color" });

        assert.doesNotThrow(() => session.styles.explain({ node: "c" }));
        assert.doesNotThrow(() => session.styles.explain({ edge: "a:b" }));
        assert.strictEqual(syncCodeOf(() => session.styles.explain({ node: "zz" })), "E_BAD_COMMAND");
    });

    it("does NOT yet explain what painted one element, because no prepared binding reaches it", async () => {
        const run = session.runs.start("degree", {}, { as: "degree" });
        await run;
        const layer = await session.styles.encode({ run: run.id, channel: "node.color" });

        const explanation = session.styles.explain({ node: "c" });

        // THE CONTRACT: c has the most edges, so the encoding painted it, and this should name
        // `layer.id` as a contributor and carry a colour in `merged`.
        assert.deepStrictEqual(explanation.contributions, [], "invert this when the session supplies encoding");
        assert.deepStrictEqual(explanation.merged, {});
        assert.deepStrictEqual(explanation.channels, []);
        assert.isDefined(session.styles.get(layer.id), "the layer itself is in the stack and painting");
        assert.strictEqual(painted().nodes, NODES.length, "and the pass really did visit every node");
    });

    it("does NOT yet produce a legend for a real run, for the same reason", async () => {
        const run = session.runs.start("degree", {}, { as: "degree" });
        await run;
        await session.styles.encode({ run: run.id, channel: "node.color" });

        // THE CONTRACT: one sequential block on node.color, reading results.degree.value, over a
        // domain of 0 (the unconnected node) to 3 (the busiest one).
        assert.deepStrictEqual(session.styles.legend(), [], "invert this when the session supplies encoding");
    });
});

describe("a stack that outlives its dataset", () => {
    it("keeps its layers, and resolves them against the graph that is there now", async () => {
        const layer = await session.styles.add(typeLayer("host"));
        assert.strictEqual(painted().nodes, HOSTS);

        await reload();

        assert.strictEqual(session.styles.list().length, 3, "a dataset boundary does not empty the stack");

        // The repaint against the NEW snapshot: four hosts of five nodes, not the three of six it
        // was compiled against. The layer holds a closure over the session's columns, and the
        // columns are read from whichever snapshot the store holds now.
        await session.styles.update(layer.id, { name: "Hosts in orange, still" });
        assert.strictEqual(painted().nodes, RELOADED_HOSTS);
    });

    it("leaves a layer bound to a run of the previous dataset painting nothing, not everything", async () => {
        const run = session.runs.start("degree", {}, { as: "degree" });
        await run;
        const layer = await session.styles.encode({ run: run.id, channel: "node.color" });
        assert.strictEqual(painted().nodes, NODES.length);

        await reload();

        // Nothing in the new dataset was measured by that run, and the layer selects on the
        // measurement. An empty answer is the correct one; the whole graph would not be.
        await session.styles.update(layer.id, { name: "Degree, over a graph it never saw" });
        assert.strictEqual(painted().nodes, 0);
    });

    it("keeps refusing to give up the element's own layers across the boundary", async () => {
        await reload();

        const stack = session.styles.list();

        assert.strictEqual(stack.length, 2);
        assert.isTrue(stack.every((layer) => layer.locked));
    });
});
