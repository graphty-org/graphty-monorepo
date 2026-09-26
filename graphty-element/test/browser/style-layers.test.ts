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

afterEach(async () => {
    stopWatching?.();
    stopWatching = null;

    // Drained before the graph is thrown away. A style edit is a queued run, and the element
    // schedules a repaint behind every finished run -- so disposing while the queue still holds
    // one runs that repaint against a store the dispose has already emptied.
    await graph.operationQueue.waitForCompletion();
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
        const second = await session.styles.encode({ run: run.id, channel: "node.color", palette: "inferno" });

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
 * WHAT A READER IS TOLD ABOUT A PICTURE THAT WAS REALLY PAINTED.
 *
 * `legend()` says what an encoding MEANS and `explain()` says why one element looks the way it
 * does. Both are reads of the prepared bindings the last repaint painted from, reached through
 * `StylesSources.encoding` -- and that is what makes them a reading of the object that made the
 * picture rather than a second guess at it. Preparing a fresh set to answer with would walk every
 * bound column again and could disagree with what is on screen the moment the data moved.
 *
 * Which is why these tests belong in this file rather than beside the unit tests. Everywhere else
 * the encoding lookup is a fixture handing back bindings somebody wrote by hand; here it is a
 * real degree run over a real snapshot, repainted by the real columnar pass, and the domain the
 * legend reports is the one the pass measured off the column -- 0 for the unconnected node up to
 * 3 for the busiest one. A hand-written binding cannot get that wrong and this cannot get it
 * right by accident.
 */
describe("what a reader is told about a real run", () => {
    it("resolves a real element id, and refuses one the graph does not hold", async () => {
        const run = session.runs.start("degree", {}, { as: "degree" });
        await run;
        await session.styles.encode({ run: run.id, channel: "node.color" });

        assert.doesNotThrow(() => session.styles.explain({ node: "c" }));
        // The element's own edge id, which is a counter. The first edge this fixture added gets
        // "0"; the pair string it used to be is now an id naming nothing.
        assert.doesNotThrow(() => session.styles.explain({ edge: "0" }));
        assert.strictEqual(syncCodeOf(() => session.styles.explain({ node: "zz" })), "E_BAD_COMMAND");
    });

    it("names the layer that painted one element, and the colour it painted", async () => {
        const run = session.runs.start("degree", {}, { as: "degree" });
        await run;
        const layer = await session.styles.encode({ run: run.id, channel: "node.color" });

        // c has the most edges of any node here, so the encoding reached it and put it at the top
        // of the ramp. Asking about c rather than about the unconnected node is deliberate: an
        // element the run never measured is not painted, and would answer nothing for the right
        // reason while proving nothing about the wire.
        const explanation = session.styles.explain({ node: "c" });

        assert.include(
            explanation.contributions.map((entry) => entry.layerId),
            layer.id,
            "the encoding layer is named as what painted this node",
        );
        assert.property(explanation.merged, "node.color");
        assert.include(
            explanation.channels.map((entry) => entry.channel),
            "node.color",
            "and the channel it drives is reported",
        );
        assert.isDefined(session.styles.get(layer.id), "the layer itself is in the stack and painting");
        assert.strictEqual(painted().nodes, NODES.length, "and the pass really did visit every node");
    });

    it("produces a legend whose domain is the one the pass measured", async () => {
        const run = session.runs.start("degree", {}, { as: "degree" });
        await run;
        const layer = await session.styles.encode({ run: run.id, channel: "node.color" });

        const blocks = session.styles.legend();
        const block = blocks.find((entry) => entry.layerId === layer.id);

        assert.isDefined(block, "the encoding layer earns a legend block");
        assert.strictEqual(block.channel, "node.color");
        assert.isDefined(block.field, "a block over a measured column names the field it reads");
        assert.strictEqual(block.field.path, `results.${run.id}.value`, "and it names the column it reads");
        assert.isDefined(block.domain, "a continuous encoding reports the domain it ramps over");
        // Read off the graph rather than restated: f is connected to nothing and c carries three
        // edges (a-c, b-c, c-d), so the column the pass measured runs 0 to 3.
        assert.strictEqual(block.domain.min, 0);
        assert.strictEqual(block.domain.max, 3);
        assert.isNotEmpty(block.swatches, "and it carries swatches a reader can match against");
    });

    /**
     * THE ONE MOMENT THE LEGEND COULD GO BLANK OVER A PICTURE NOBODY CHANGED.
     *
     * A run announces that it has ended BEFORE the auto-apply policy is consulted, and the
     * session forgets every prepared binding on that announcement -- correctly, because a run
     * that has just published has replaced the column those bindings settled their domains
     * against. Then the policy is asked, and on a re-run it declines: a re-run keeps its id, so
     * it already has its layers and gets no new ones. Nothing repaints.
     *
     * The graph is still on screen, painted, unchanged. If "what the last pass painted from" had
     * been forgotten along with "what the next pass must work out again", this is where a reader
     * would watch the legend empty itself under a picture that had not moved.
     */
    it("still describes the picture after a re-run that repaints nothing", async () => {
        const run = session.runs.start("degree", {}, { as: "degree" });
        await run;
        const layer = await session.styles.encode({ run: run.id, channel: "node.color" });
        const before = session.styles.legend().find((entry) => entry.layerId === layer.id);

        assert.isDefined(before, "the legend describes the run's encoding to begin with");

        await run.rerun();

        const after = session.styles.legend().find((entry) => entry.layerId === layer.id);

        assert.isDefined(after, "and it still describes it afterwards");
        assert.deepStrictEqual(after.domain, before.domain, "over the same domain, because the picture is the same");
        assert.isNotEmpty(
            session.styles.explain({ node: "c" }).contributions,
            "and one node can still say what painted it",
        );
    });
});

/**
 * WHICH LAYERS BELONG TO A RUN, WHICH IS THE QUESTION BEFORE "ARE YOU SURE".
 *
 * A layer built from a run records the run in its own `source`, so `runs.bindings(id)` is a read
 * of the stack rather than a second register that could disagree with it. Two things depend on
 * it: a confirmation dialog that wants to say "Removes 2 style layers" BEFORE anything is
 * removed, and `runs.remove(id)` itself, which has to take those layers with it -- a layer left
 * behind reads a column whose run has gone, and paints from numbers nobody can produce again.
 */
describe("the layers a run put on the graph", () => {
    it("names them, and takes them away with the run", async () => {
        const run = session.runs.start("degree", {}, { as: "degree" });
        await run;
        const layer = await session.styles.encode({ run: run.id, channel: "node.color" });

        assert.deepStrictEqual(session.runs.bindings(run.id), [layer.id], "the run knows what it painted");

        const removal = session.runs.remove(run.id);

        assert.deepStrictEqual(removal.layerIds, [layer.id], "and says so before it goes");

        // The removal is a style edit, which is queued like every other one.
        await graph.operationQueue.waitForCompletion();

        assert.isUndefined(
            session.styles.get(layer.id),
            "the layer went with the run rather than being left to read a column that has gone",
        );
    });

    it("names none for a run nothing was painted from", async () => {
        const run = session.runs.start("degree", {}, { as: "degree" });
        await run;

        assert.deepStrictEqual(session.runs.bindings("no-such-run"), []);
        assert.deepStrictEqual(
            session.runs.bindings(run.id),
            [],
            "a run whose suggestion has not landed reports nothing rather than guessing",
        );
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

/**
 * A NODE REMOVED UNDER A LIVE STACK.
 *
 * The engine keeps what each layer painted, and each element's paint, by dense index. Removing a
 * node freezes a new snapshot, so both have to be worked out again in the new index space before
 * anything relies on them -- otherwise a later `runs.remove` has no record of what its layer
 * painted and leaves the paint on the survivors, and until then every node after the removed one
 * shows the paint of the node that used to sit at its index.
 */
describe("a stack over a graph a node was removed from", () => {
    /**
     * The colour the element paints one node, at its index in the current snapshot.
     *
     * Read through the snapshot rather than `Node.index` so the freeze that renumbers the
     * survivors has happened, as it has for every session read.
     * @param id - The node id.
     * @returns The colour, serialized so two can be compared.
     */
    function colorOf(id: string): string {
        const index = session.data.snapshot().ids.indexOf(id);

        assert.isAtLeast(index, 0, `node ${id} is in the graph`);

        return JSON.stringify(graph.getStylePainter().nodePaint(index)?.color ?? null);
    }

    it("takes a removed run's paint back from every surviving node", async () => {
        const base = colorOf("a");
        const run = session.runs.start("degree", {}, { as: "degree" });
        await run;
        await session.styles.encode({ run: run.id, channel: "node.color" });
        assert.notStrictEqual(colorOf("a"), base, "the encoding painted a");

        await graph.removeNodes(["f"]);
        session.runs.remove(run.id);
        await graph.operationQueue.waitForCompletion();

        for (const id of ["a", "b", "c", "d", "e"]) {
            assert.strictEqual(colorOf(id), base, `node ${id} is back to the colour beneath the layer`);
        }
    });

    it("keeps each survivor's own paint after a node in the middle goes", async () => {
        const run = session.runs.start("degree", {}, { as: "degree" });
        await run;
        await session.styles.encode({ run: run.id, channel: "node.color" });
        const survivors = ["a", "c", "d", "e", "f"];
        const before = new Map(survivors.map((id) => [id, colorOf(id)]));

        // b sits at index 1, so every node after it moves down one index. The run's measurements
        // are kept by node, so each survivor still carries the degree it was painted from.
        await graph.removeNodes(["b"]);
        await graph.operationQueue.waitForCompletion();

        for (const id of survivors) {
            assert.strictEqual(colorOf(id), before.get(id), `node ${id} shows its own paint, not its neighbour's`);
        }
    });
});
