/**
 * @file The Graphviz layouts in Chromium: the module Worker they run in, what stops it, what a
 * crash and a syntax error answer, and the layouts chosen by name and by a DOT file's
 * recommendation in a real element.
 */

import { afterEach, assert, beforeEach, describe, it, vi } from "vitest";

import manyEdgesOneLine from "../../../graph-io/test/conformance/fixtures/dot/authored/many-edges-one-line.gv?raw";
import { Graph, operationQueueOf } from "../../src/Graph";
import { graphvizAvailability } from "../../src/layout/graphviz/availability";
import { runGraphviz } from "../../src/layout/graphviz/host";
import { drawnFrames } from "../helpers/drawn-frames";

/** A graph that takes Graphviz far longer than a millisecond: a 300-node grid for circo. */
const SLOW_DOT = `graph { ${Array.from({ length: 300 }, (_unused, i) => `n${String(i)} -- n${String((i * 7 + 1) % 300)}; n${String(i)} -- n${String((i + 1) % 300)};`).join(" ")} }`;

describe("the Graphviz Worker", () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("is available in Chromium with the package installed", async () => {
        assert.deepEqual(await graphvizAvailability(), { available: true });
    });

    it("lays a graph out in a Worker and ends the Worker after the answer", async () => {
        const terminate = vi.spyOn(Worker.prototype, "terminate");

        const reply = await runGraphviz({ kind: "layout", dot: "digraph { a -> b; b -> c }", engine: "dot" });

        assert.isTrue(reply.ok, JSON.stringify(reply));
        assert.strictEqual(terminate.mock.calls.length, 1, "one Worker per layout, stopped once it answered");
    });

    it("stops the Worker when the layout is aborted, and the next layout succeeds", async () => {
        const terminate = vi.spyOn(Worker.prototype, "terminate");
        const controller = new AbortController();

        const running = runGraphviz({ kind: "layout", dot: SLOW_DOT, engine: "circo" }, { signal: controller.signal });
        controller.abort(new DOMException("no longer wanted", "AbortError"));
        const outcome = await running.then(
            () => "answered",
            (error: unknown) => (error as Error).name,
        );

        assert.strictEqual(outcome, "AbortError");
        assert.strictEqual(terminate.mock.calls.length, 1);
        const next = await runGraphviz({ kind: "layout", dot: "graph { a -- b }", engine: "neato" });
        assert.isTrue(next.ok);
    });

    it("stops the Worker past the time budget with graphviz.timeout, and the next layout succeeds", async () => {
        const terminate = vi.spyOn(Worker.prototype, "terminate");

        const reply = await runGraphviz({ kind: "layout", dot: SLOW_DOT, engine: "circo" }, { timeoutMs: 1 });

        assert.deepEqual(reply, { ok: false, code: "graphviz.timeout", params: { engine: "circo", ms: 1 } });
        assert.strictEqual(terminate.mock.calls.length, 1);
        const next = await runGraphviz({ kind: "layout", dot: "graph { a -- b }", engine: "twopi" });
        assert.isTrue(next.ok);
    });

    it("answers graphviz.crashed for circo's stack overflow, and the next layout succeeds", async () => {
        const reply = await runGraphviz({ kind: "layout", dot: manyEdgesOneLine, engine: "circo" });

        assert.isFalse(reply.ok);
        assert.strictEqual(!reply.ok && reply.code, "graphviz.crashed");
        assert.strictEqual(!reply.ok && reply.params.engine, "circo");
        const next = await runGraphviz({ kind: "layout", dot: manyEdgesOneLine, engine: "dot" });
        assert.isTrue(next.ok, "a fresh Worker and a fresh instance");
    });

    it("answers graphviz.syntax with the line and the text near it", async () => {
        const reply = await runGraphviz({ kind: "layout", dot: "digraph {\n a -> ;\n}", engine: "dot" });

        assert.deepEqual(reply, { ok: false, code: "graphviz.syntax", params: { engine: "dot", line: 2, near: ";" } });
    });
});

describe("Graphviz layouts in the element", () => {
    let container: HTMLDivElement;
    let graph: Graph;

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

    /** Let the element draw until its layout has published its answer. */
    async function settled(): Promise<void> {
        await operationQueueOf(graph).waitForCompletion();
        const manager = graph.getLayoutManager();
        while (!(manager.layoutEngine?.isSettled ?? false) || manager.running) {
            await drawnFrames(graph.getScene(), 1);
        }
    }

    /**
     * Where a node is drawn.
     * @param id - the node
     * @returns its x and y
     */
    function at(id: string): { x: number; y: number } {
        const position = graph.getNode(id)?.getPosition();
        assert.isDefined(position, id);
        return { x: position?.x ?? Number.NaN, y: position?.y ?? Number.NaN };
    }

    it("draws a chain with dot, left to right when asked", async () => {
        await graph.addNodes([{ id: "a" }, { id: "b" }, { id: "c" }]);
        await graph.addEdges([
            { src: "a", dst: "b" },
            { src: "b", dst: "c" },
        ]);
        await graph.setLayout("graphviz-dot", { rankdir: "LR" });
        await settled();

        const [a, b, c] = [at("a"), at("b"), at("c")];
        assert.strictEqual(a.y, b.y, "one row");
        assert.strictEqual(b.y, c.y);
        assert.isBelow(a.x, b.x, "in rank order");
        assert.isBelow(b.x, c.x);
    });

    it("draws a DOT file loaded with layout recommended with the engine the file names", async () => {
        const session = graph.getSession();
        await session.data.import(
            { type: "dot", config: { data: "graph { layout=twopi; root=hub; hub -- a; hub -- b; hub -- c; a -- d }" } },
            { layout: "recommended" },
        );
        await settled();

        assert.strictEqual(session.layout.id, "graphviz-twopi");
        const hub = at("hub");
        const radius = (id: string): number => Math.hypot(at(id).x - hub.x, at(id).y - hub.y);
        assert.closeTo(radius("a"), radius("b"), 1e-4, "the first ring around the root the file named");
        assert.isAbove(radius("d"), radius("a"), "the second ring further out");
    });

    it("lays a DOT file's cluster out as Graphviz does: its members together, the other nodes outside it", async () => {
        // In edge order dot puts x between a and b; the cluster keeps a and b side by side.
        const session = graph.getSession();
        await session.data.import(
            {
                type: "dot",
                config: { data: "digraph { r -> a; r -> x; r -> b; subgraph cluster_g { a; b } }" },
            },
            { layout: "recommended" },
        );
        await settled();

        assert.strictEqual(session.layout.id, "graphviz-dot");
        const [a, x, b] = [at("a").x, at("x").x, at("b").x];
        assert.isFalse(
            Math.min(a, b) < x && x < Math.max(a, b),
            `x at ${String(x)}, a at ${String(a)}, b at ${String(b)}`,
        );
    });

    it("draws a DOT file's nodes at their size against the space Graphviz leaves between them", async () => {
        // Graphviz draws this as two 2 x 0.5 inch boxes one inch apart (0.5 inch of node and the
        // 0.5 inch ranksep): each box is twice as wide as the step between their centres.
        const session = graph.getSession();
        await session.data.import(
            { type: "dot", config: { data: "digraph { node [shape=box, width=2, height=0.5]; a -> b }" } },
            { styles: "file", layout: "recommended" },
        );
        await settled();

        assert.strictEqual(session.layout.id, "graphviz-dot");
        const width = 2 * (graph.getNode("a")?.drawnHalfExtents.x ?? Number.NaN);
        const step = Math.hypot(at("a").x - at("b").x, at("a").y - at("b").y);
        assert.closeTo(width / step, 2, 0.1, `a box ${String(width)} wide, its centres ${String(step)} apart`);
    });
});
