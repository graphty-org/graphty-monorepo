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

    it("hands Graphviz the styled node sizes when no frame is drawn between the load and its layout", async () => {
        // A node's mesh takes its styled size when a frame draws the paint, and a load starts its
        // recommended layout in the same step as its styles. Hold every frame back from the load
        // until Graphviz has been asked, as a busy machine does: the layout must still read the
        // 2 x 0.5 inch boxes the file draws, not the unstyled default circles.
        const dots: string[] = [];
        const post = Worker.prototype.postMessage;
        vi.spyOn(Worker.prototype, "postMessage").mockImplementation(function (
            this: Worker,
            message: unknown,
            ...rest: [StructuredSerializeOptions?]
        ) {
            const { dot } = (message ?? {}) as { dot?: unknown };
            if (typeof dot === "string") {
                dots.push(dot);
            }
            post.call(this, message, ...rest);
        });
        const held: FrameRequestCallback[] = [];
        const raf = window.requestAnimationFrame;
        window.requestAnimationFrame = (callback) => held.push(callback);
        try {
            // The frame already queued runs; the one it asks for next is held.
            await vi.waitFor(() => {
                assert.isNotEmpty(held);
            });
            await graph
                .getSession()
                .data.import(
                    { type: "dot", config: { data: "digraph { node [shape=box, width=2, height=0.5]; a -> b }" } },
                    { styles: "file", layout: "recommended" },
                );
            await vi.waitFor(() => {
                assert.lengthOf(dots, 1);
            });
        } finally {
            vi.restoreAllMocks();
            window.requestAnimationFrame = raf;
            for (const callback of held.splice(0)) {
                callback(performance.now());
            }
        }

        const nodes = dots[0].split("\n").filter((line) => /^n\d+ \[/.test(line));
        assert.lengthOf(nodes, 2);
        // The file's 2 x 0.5 inches, drawn about one point (1/72 inch) smaller.
        for (const line of nodes) {
            const box = /shape=box, width=([\d.]+), height=([\d.]+)/.exec(line);
            assert.isNotNull(box, `a box, not the default circle: ${line}`);
            assert.closeTo(Number(box?.[1]), 2, 0.02, line);
            assert.closeTo(Number(box?.[2]), 0.5, 0.02, line);
        }
    });

    // twopi spaces its rings, and patchwork sizes its cells, without reading a node's width: both
    // must be told the drawn size, or nodes 1.5 units wide land 1 unit apart and draw as one blob.
    for (const engine of ["twopi", "patchwork"]) {
        it(`keeps ${engine}'s nodes from overlapping as the element draws them`, async () => {
            const pairs = "a b a c b d c d d e e f e g f h g h h a c i i j j h b k k l l f".split(" ");
            const ids = [...new Set(pairs)];
            await graph.addNodes(ids.map((id) => ({ id })));
            await graph.addEdges(pairs.flatMap((src, i) => (i % 2 === 0 ? [{ src, dst: pairs[i + 1] }] : [])));
            await graph.setLayout(`graphviz-${engine}`);
            await settled();

            for (const [i, a] of ids.entries()) {
                for (const b of ids.slice(i + 1)) {
                    const gap = Math.hypot(at(a).x - at(b).x, at(a).y - at(b).y);
                    const width = (graph.getNode(a)?.drawnRadius ?? 0) + (graph.getNode(b)?.drawnRadius ?? 0);
                    assert.isAtLeast(gap, width, `${a} and ${b} overlap`);
                }
            }
        });
    }
});
