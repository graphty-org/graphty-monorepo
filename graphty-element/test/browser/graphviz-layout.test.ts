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

    it("draws each edge along the route dot laid it, and an edge dot drew straight as one segment", async () => {
        await graph.addNodes([{ id: "a" }, { id: "b" }, { id: "c" }]);
        // a -> c goes round b, which dot puts on the rank between them
        await graph.addEdges([
            { src: "a", dst: "b" },
            { src: "b", dst: "c" },
            { src: "a", dst: "c" },
        ]);
        await graph.setLayout("graphviz-dot");
        await settled();
        await graph.waitForStableFrame();

        const edges = [...graph.getDataManager().edges.values()];
        const curve = (src: string, dst: string): { x: number; y: number }[] | null =>
            edges.find((e) => e.srcId === src && e.dstId === dst)?.drawnCurve ?? null;
        assert.isNull(curve("a", "b"), "a straight edge stays one segment");
        const routed = curve("a", "c");
        assert.isNotNull(routed, "the routed edge is drawn through its route");
        const [a, c] = [at("a"), at("c")];
        const length = Math.hypot(c.x - a.x, c.y - a.y);
        const off = Math.max(
            ...(routed ?? []).map((p) => Math.abs((p.x - a.x) * (c.y - a.y) - (p.y - a.y) * (c.x - a.x)) / length),
        );
        assert.isAbove(off / length, 0.05, "it bows off the line between its nodes, round b");
    });

    it("draws a dashed edge along the route dot laid it too, its dashes round b (issue #3102)", async () => {
        await graph.addNodes([{ id: "a" }, { id: "b" }, { id: "c" }]);
        await graph.addEdges([
            { src: "a", dst: "b" },
            { src: "b", dst: "c" },
            { src: "a", dst: "c" },
        ]);
        await graph.getSession().styles.add({
            name: "dashed",
            target: "edge",
            selector: { match: "everything" },
            set: { "edge.style": "dash" },
        });
        await graph.setLayout("graphviz-dot");
        await settled();
        await graph.waitForStableFrame();

        const edge = [...graph.getDataManager().edges.values()].find((e) => e.srcId === "a" && e.dstId === "c");
        const dashes = edge?.drawnPattern ?? [];
        assert.isAbove(dashes.length, 2, "the edge is drawn as dashes");
        const [a, c] = [at("a"), at("c")];
        const length = Math.hypot(c.x - a.x, c.y - a.y);
        const off = Math.max(
            ...dashes.map(
                ({ position: p }) => Math.abs((p.x - a.x) * (c.y - a.y) - (p.y - a.y) * (c.x - a.x)) / length,
            ),
        );
        assert.isAbove(off / length, 0.05, "its dashes bow off the line between its nodes, round b");
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

    it("draws a DOT file's clusters as Graphviz draws them: its margin past the members, its label's room on top", async () => {
        // Graphviz draws a cluster 8 points (1/9 of a one-inch node) past its members, and a labelled
        // one taller by its label at the top; a group drawn round its members by itself reaches its
        // largest member's radius (half a node) past them on every side. The label is set after the
        // inner cluster opens, so Graphviz gives the inner cluster none.
        const session = graph.getSession();
        await session.data.import(
            {
                type: "dot",
                config: {
                    data: 'digraph { node [shape=box, width=1, height=0.5]; subgraph cluster_outer { a; subgraph cluster_inner { b; c } label="outer words" } a -> b; x -> a }',
                },
            },
            { styles: "file", layout: "recommended" },
        );
        await settled();
        await graph.waitForStableFrame();

        assert.strictEqual(session.layout.id, "graphviz-dot");
        const manager = graph.getLayoutManager();
        const width = 2 * (graph.getNode("a")?.drawnHalfExtents.x ?? Number.NaN);
        const margins = (group: string, members: string[]): { side: number; bottom: number; top: number } => {
            const box = manager.groupBox(group);
            assert.isDefined(box, group);
            const ends = members.map((id) => {
                const half = graph.getNode(id)?.drawnHalfExtents ?? { x: Number.NaN, y: Number.NaN };
                return { x0: at(id).x - half.x, x1: at(id).x + half.x, y0: at(id).y - half.y, y1: at(id).y + half.y };
            });
            const { center, half } = box ?? { center: { x: 0, y: 0 }, half: { x: 0, y: 0 } };
            return {
                side: (Math.min(...ends.map((e) => e.x0)) - (center.x - half.x)) / width,
                bottom: (Math.min(...ends.map((e) => e.y0)) - (center.y - half.y)) / width,
                top: (center.y + half.y - Math.max(...ends.map((e) => e.y1))) / width,
            };
        };

        const inner = margins("cluster_inner", ["b", "c"]);
        assert.closeTo(inner.side, 8 / 72, 0.01, "the inner cluster's margin at its side");
        assert.closeTo(inner.bottom, 8 / 72, 0.01, "and at its bottom");
        assert.closeTo(inner.top, 8 / 72, 0.01, "a cluster opened before its parent's label has no label room");
        const outer = margins("cluster_outer", ["a", "b", "c"]);
        assert.closeTo(outer.bottom, 16 / 72, 0.01, "the outer cluster's margin past the inner one's");
        assert.isAbove(outer.top - outer.bottom, 0.15, "and its label's room on top");
    });

    it("lays a DOT file's rank subgraph and edge lengths out as Graphviz does", async () => {
        // Without the rank subgraph c is a rank below a; without minlen y is one rank below x, as z is.
        const session = graph.getSession();
        await session.data.import(
            {
                type: "dot",
                config: {
                    data: "digraph { r -> a; r -> b; b -> c; { rank=same; a; c } x -> y [minlen=3]; x -> z }",
                },
            },
            { layout: "recommended" },
        );
        await settled();

        assert.strictEqual(session.layout.id, "graphviz-dot");
        assert.closeTo(at("a").y, at("c").y, 1e-4, "a and c on one rank");
        const drop = (id: string): number => at("x").y - at(id).y;
        assert.closeTo(drop("y") / drop("z"), 3, 0.01, "y three ranks below x, z one");
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

    it("keeps a DOT file's nodes apart when its styles are not drawn (issue #5293)", async () => {
        // Without the file's styles the element draws its own node size, not the size Graphviz gives the file's
        // nodes, so Graphviz must lay the nodes out at that drawn size or they land on top of each other.
        const session = graph.getSession();
        await session.data.import(
            {
                type: "dot",
                config: {
                    data: "digraph { layout=dot; rankdir=LR; start -> parse -> check -> plan -> run -> report; check -> report; parse -> report }",
                },
            },
            { layout: "recommended" },
        );
        await settled();

        assert.strictEqual(session.layout.id, "graphviz-dot");
        const ids = ["start", "parse", "check", "plan", "run", "report"];
        for (const [i, a] of ids.entries()) {
            for (const b of ids.slice(i + 1)) {
                const gap = Math.hypot(at(a).x - at(b).x, at(a).y - at(b).y);
                const width = (graph.getNode(a)?.drawnRadius ?? 0) + (graph.getNode(b)?.drawnRadius ?? 0);
                assert.isAtLeast(gap, width, `${a} and ${b} overlap`);
            }
        }
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
            // as Graphviz reads the file (the recommendation sizes a DOT file's nodes as Graphviz does), or drawn
            const box = /shape="?box"?, (?:fixedsize="false", )?width="?([\d.]+)"?, height="?([\d.]+)"?/.exec(line);
            assert.isNotNull(box, `a box, not the default circle: ${line}`);
            assert.closeTo(Number(box?.[1]), 2, 0.02, line);
            assert.closeTo(Number(box?.[2]), 0.5, 0.02, line);
        }
    });

    it("draws a DOT file the same whether or not a frame is drawn between its load and its layout", async () => {
        // dot-real-depcruise stores no positions and was drawn at 0.75 of the canvas in one oracle
        // run and 1.29 in the next: on a busy machine no frame fell between its styles and its
        // layout. The same file must give the same drawing however its data arrives.
        const file = "digraph { rankdir=LR; node [shape=box, width=2, height=0.5]; a -> b; a -> c }";
        await graph
            .getSession()
            .data.import({ type: "dot", config: { data: file } }, { styles: "file", layout: "recommended" });
        await settled();
        const ids = ["a", "b", "c"];
        const drawn = ids.map(at);

        graph.dispose();
        graph = new Graph(container);
        await graph.init();
        const asked = vi.spyOn(Worker.prototype, "postMessage");
        const held: FrameRequestCallback[] = [];
        const raf = window.requestAnimationFrame;
        window.requestAnimationFrame = (callback) => held.push(callback);
        try {
            // The frame already queued runs; the one it asks for next is held until Graphviz is asked.
            await vi.waitFor(() => {
                assert.isNotEmpty(held);
            });
            await graph
                .getSession()
                .data.import({ type: "dot", config: { data: file } }, { styles: "file", layout: "recommended" });
            await vi.waitFor(() => {
                assert.isTrue(asked.mock.calls.length > 0, "Graphviz asked before any frame is drawn");
            });
        } finally {
            vi.restoreAllMocks();
            window.requestAnimationFrame = raf;
            for (const callback of held.splice(0)) {
                callback(performance.now());
            }
        }
        await settled();
        const late = ids.map(at);

        ids.forEach((id, i) => {
            assert.closeTo(late[i].x, drawn[i].x, 1e-3, `${id}.x`);
            assert.closeTo(late[i].y, drawn[i].y, 1e-3, `${id}.y`);
        });
    });

    /**
     * How far an edge's drawn route strays from the line between its two nodes, over that line's length.
     * @param src - the source node
     * @param dst - the target node
     * @returns the largest distance off the line, as a fraction of its length; 0 for an edge drawn straight
     */
    function bow(src: string, dst: string): number {
        const edge = [...graph.getDataManager().edges.values()].find((e) => e.srcId === src && e.dstId === dst);
        const [a, c] = [at(src), at(dst)];
        const length = Math.hypot(c.x - a.x, c.y - a.y);
        const off = (edge?.drawnCurve ?? []).map(
            (p) => Math.abs((p.x - a.x) * (c.y - a.y) - (p.y - a.y) * (c.x - a.x)) / length,
        );
        return Math.max(0, ...off) / length;
    }

    /** A DOT file whose nodes carry their place, as `neato -n2` draws it; its edges store no route. */
    const PLACED =
        'digraph { graph [bb="0,0,400,250", splines=true]; node [shape=circle, width=0.3, fixedsize=true, label=""]; ' +
        'a [pos="20,180!"]; c [pos="380,180!"]; block [shape=box, width=1, height=1, pos="200,180!"]; ' +
        's [pos="20,20!"]; t [pos="380,20!"]; wall [shape=box, width=1, height=1, pos="200,20!"]; ' +
        "a -> c; s -> t [headport=w] }";

    it("has Graphviz route a placed DOT file's edges round its nodes, and keeps every node where the file put it", async () => {
        // Graphviz draws a file whose nodes carry `pos` and whose edges do not with `neato -n2`: the
        // nodes stay, and each edge is routed round the nodes in its way.
        const session = graph.getSession();
        await session.data.import(
            { type: "dot", config: { data: PLACED } },
            { styles: "file", layout: "recommended", styleOptions: { lengths: "file" } },
        );
        await settled();
        await graph.waitForStableFrame();

        assert.strictEqual(session.layout.id, "fixed");
        assert.strictEqual(session.layout.options.edgeRoutes, "graphviz");
        assert.closeTo(at("c").x - at("a").x, 360, 1e-3, "the nodes where the file put them");
        assert.closeTo(at("a").y - at("s").y, 160, 1e-3);
        assert.isAbove(bow("a", "c"), 0.1, "the edge goes round the block between its nodes");
        // a line drawn straight into the port would run from the first point drawn to the last
        const edge = [...graph.getDataManager().edges.values()].find((e) => e.srcId === "s");
        const drawn = edge?.drawnCurve ?? [];
        const [p, q] = [drawn[0], drawn.at(-1)];
        const chord = p && q ? Math.hypot(q.x - p.x, q.y - p.y) : 0;
        const sag = Math.max(
            0,
            ...drawn.map((r) => (p && q ? Math.abs((r.x - p.x) * (q.y - p.y) - (r.y - p.y) * (q.x - p.x)) / chord : 0)),
        );
        assert.isAbove(
            sag / chord,
            0.1,
            "an edge into a port goes round the wall on its way to it, as Graphviz routes it",
        );
    });

    it("draws a DOT file's edge label where dot put it, beside the line, not on its middle", async () => {
        // dot ranks an edge label as a node of its own and draws it to the right of the edge
        const session = graph.getSession();
        await session.data.import(
            { type: "dot", config: { data: 'digraph { a -> b [label="a long edge label"] }' } },
            { styles: "file", layout: "recommended" },
        );
        await settled();
        await graph.waitForStableFrame();

        assert.strictEqual(session.layout.id, "graphviz-dot");
        const [a, b] = [at("a"), at("b")];
        const label = [...graph.getDataManager().edges.values()][0]?.label?.labelMesh?.position;
        assert.isDefined(label, "the edge label is drawn");
        const length = Math.hypot(b.x - a.x, b.y - a.y);
        const off = ((label?.x ?? 0) - a.x) * (b.y - a.y) - ((label?.y ?? 0) - a.y) * (b.x - a.x);
        // y grows upward: a negative turn from a -> b is to its right
        assert.isBelow(off / length / length, -0.1, "right of the line going from a to b");
    });

    it("draws a DOT edge's xlabel, headlabel and taillabel where dot put them (issue #5273)", async () => {
        const session = graph.getSession();
        await session.data.import(
            { type: "dot", config: { data: 'digraph { a -> b [xlabel="outside", headlabel="H", taillabel="T"] }' } },
            { styles: "file", layout: "recommended" },
        );
        await settled();
        await graph.waitForStableFrame();

        assert.strictEqual(session.layout.id, "graphviz-dot");
        const edge = [...graph.getDataManager().edges.values()][0];
        const laid = graph.getLayoutManager().layoutEngine?.getEdgePosition(edge);
        const [a, b] = [at("a"), at("b")];
        /**
         * Where a place given along and across the edge is.
         * @param place - the place, from the layout
         * @param name - which label
         * @returns the point
         */
        const point = (place: readonly [number, number] | undefined, name: string): { x: number; y: number } => {
            assert.isDefined(place, `Graphviz placed the ${name}`);
            const [along, across] = place ?? [Number.NaN, Number.NaN];
            return {
                x: a.x + along * (b.x - a.x) - across * (b.y - a.y),
                y: a.y + along * (b.y - a.y) + across * (b.x - a.x),
            };
        };
        const drawn = [
            ["external label", edge.label, point(laid?.labelAt, "external label")],
            ["head label", edge.arrowHeadText, point(laid?.headLabelAt, "head label")],
            ["tail label", edge.arrowTailText, point(laid?.tailLabelAt, "tail label")],
        ] as const;
        const length = Math.hypot(b.x - a.x, b.y - a.y);
        for (const [name, label, want] of drawn) {
            const position = label?.labelMesh?.position;
            assert.isDefined(position, `the ${name} is drawn`);
            assert.closeTo(position?.x ?? Number.NaN, want.x, 0.02 * length, `the ${name} centered where dot put it`);
            assert.closeTo(position?.y ?? Number.NaN, want.y, 0.02 * length, `the ${name} centered where dot put it`);
        }
    });

    it("draws a DOT edge's label at lp and its xlabel beside it at xlp (issue #5288)", async () => {
        const session = graph.getSession();
        await session.data.import(
            { type: "dot", config: { data: 'digraph { a -> b [label="inside", xlabel="outside"] }' } },
            { styles: "file", layout: "recommended" },
        );
        await settled();
        await graph.waitForStableFrame();

        const edge = [...graph.getDataManager().edges.values()][0];
        const laid = graph.getLayoutManager().layoutEngine?.getEdgePosition(edge);
        const [a, b] = [at("a"), at("b")];
        const length = Math.hypot(b.x - a.x, b.y - a.y);
        const drawn = [
            ["label", edge.label, laid?.labelAt],
            ["external label", edge.xlabelLabel, laid?.xlabelAt],
        ] as const;
        for (const [name, label, place] of drawn) {
            assert.isDefined(place, `Graphviz placed the ${name}`);
            const [along, across] = place ?? [Number.NaN, Number.NaN];
            const want = {
                x: a.x + along * (b.x - a.x) - across * (b.y - a.y),
                y: a.y + along * (b.y - a.y) + across * (b.x - a.x),
            };
            const position = label?.labelMesh?.position;
            assert.isDefined(position, `the ${name} is drawn`);
            assert.closeTo(position?.x ?? Number.NaN, want.x, 0.02 * length, `the ${name} centered where dot put it`);
            assert.closeTo(position?.y ?? Number.NaN, want.y, 0.02 * length, `the ${name} centered where dot put it`);
        }
        assert.notDeepEqual(laid?.labelAt, laid?.xlabelAt, "two places");
    });

    it('lays a DOT file out with lengths "file" at a point to the scene unit, 72 to the inch', async () => {
        // The file's lengths are kept as points, so Graphviz's half-inch ranksep is 36 scene units:
        // the boxes' centres are the file's half-inch box (Graphviz sizes the nodes as it does the
        // file's own) plus 36 apart, 72 as Graphviz draws them.
        const session = graph.getSession();
        await session.data.import(
            { type: "dot", config: { data: "digraph { node [shape=box, width=2, height=0.5]; a -> b }" } },
            { styles: "file", layout: "recommended", styleOptions: { lengths: "file" } },
        );
        await settled();

        assert.strictEqual(session.layout.id, "graphviz-dot");
        assert.strictEqual(session.layout.options.scale, 72);
        const step = Math.hypot(at("a").x - at("b").x, at("a").y - at("b").y);
        assert.closeTo(step, 72, 1, `its centres ${String(step)} apart`);
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
