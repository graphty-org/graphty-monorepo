/**
 * What the repaint paints, and -- just as load-bearing -- what it refuses to touch.
 *
 * Every assertion about a COUNT here is a correctness assertion and a cost assertion at the same
 * time. "Adding a layer over three nodes repaints three nodes" is what stops an algorithm's layer
 * painting the whole graph, and it is also the reason a single-layer edit fits in a frame. The
 * budget itself is asserted next door, in `repaint.bench.test.ts`.
 */

import { assert, describe, it } from "vitest";

import type { LayerSpec, Path } from "../../../src/catalog/types";
import {
    type CompiledLayer,
    createStylesApi,
    type ElementLayerSpec,
    type RepaintContext,
    type SessionStylesApi,
    type StyleChange,
} from "../../../src/session/styles/index";
import { channelRole, createStyleInterner, meshChannelsFor, type StyleRole } from "../../../src/session/styles/intern";
import type { SelectorSource } from "../../../src/session/styles/predicate";
import {
    createLayerRepaint,
    type RepaintEngine,
    type RepaintProblem,
    type RepaintSources,
    type ResolvedStyle,
} from "../../../src/session/styles/repaint";

/** One element's columns, keyed by the path a selector or a binding names. */
type Row = Readonly<Record<Path, unknown>>;

/**
 * Six nodes, arranged so that every case has an element in it: three a community run measured,
 * four a centrality run measured, and two that no run measured at all.
 */
const NODES: readonly Row[] = [
    { "data.kind": "host", "data.weight": 0, "results.louvain.group": "a", "results.betweenness.score": 0 },
    { "data.kind": "host", "data.weight": 4, "results.louvain.group": "b", "results.betweenness.score": 4 },
    { "data.kind": "switch", "data.weight": 8, "results.louvain.group": "a", "results.betweenness.score": 8 },
    { "data.kind": "switch", "data.weight": 12, "results.betweenness.score": 12 },
    { "data.kind": "host" },
    { "data.kind": "switch" },
];

/** Which nodes each run measured, which is what a `has` selector walks instead of the node list. */
const MEASURED: Readonly<Record<Path, readonly number[]>> = {
    "results.louvain.group": [0, 1, 2],
    "results.betweenness.score": [0, 1, 2, 3],
};

/** The element's own layer, seeded at the bottom of every stack below. */
const ELEMENT_BASE: ElementLayerSpec = {
    name: "Default",
    source: { by: "element", reason: "default" },
    selector: { match: "everything" },
    set: { "node.color": "#333333" },
};

/** A context that never cancels and reports to nobody. */
function quietContext(): RepaintContext {
    return { signal: new AbortController().signal, report: () => undefined };
}

interface Harness {
    /** The engine under test. */
    readonly engine: RepaintEngine;
    /** The stack it paints from. */
    readonly styles: SessionStylesApi;
    /** Every change announcement, which is where the painted counts arrive. */
    readonly changes: StyleChange[];
    /** Every node index whose columns were read, in the order they were read. */
    readonly reads: number[];
    /** Paint every element from the whole stack, as a first draw does. */
    paintAll(): Promise<{ nodes: number; edges: number }>;
    /** The stack, compiled. */
    stack(): readonly CompiledLayer[];
}

/**
 * A session of six nodes and no edges, with a repaint bound to it.
 * @param rows - The node columns. Defaults to {@link NODES}.
 * @param extra - Anything to override on the repaint's sources.
 * @returns The harness.
 */
function makeHarness(rows: readonly Row[] = NODES, extra: Partial<RepaintSources> = {}): Harness {
    const changes: StyleChange[] = [];
    const reads: number[] = [];

    const elements: SelectorSource = {
        nodeValue: (index, path) => {
            reads.push(index);

            return rows[index]?.[path];
        },
        edgeValue: () => undefined,
        nodeIdOf: (index) => `n${String(index)}`,
        edgeIdOf: (index) => `e${String(index)}`,
    };

    const engine = createLayerRepaint({
        nodeCount: () => rows.length,
        edgeCount: () => 0,
        elements,
        measured: (path, target) => (target === "node" ? MEASURED[path] : undefined),
        ...extra,
    });

    const styles = createStylesApi({
        elements,
        base: [ELEMENT_BASE],
        repaint: engine.repaint,
        onChange: (change) => {
            changes.push(change);
        },
    });

    return {
        engine,
        styles,
        changes,
        reads,
        paintAll: () => engine.repaintAll(styles.compiled(), quietContext()),
        stack: () => styles.compiled(),
    };
}

/** The colour one node is painted, as a hex string, or "unpainted". */
function colorOf(engine: RepaintEngine, index: number): string {
    const style: ResolvedStyle = engine.styleOf("node", index);

    return style["node.color"]?.hex ?? "unpainted";
}

/** How much the last edit painted. */
function paintedNodes(harness: Harness): number {
    return harness.changes[harness.changes.length - 1]?.painted?.nodes ?? -1;
}

describe("what a repaint paints", () => {
    it("paints every element a layer that selects everything matches", async () => {
        const harness = makeHarness();
        const report = await harness.paintAll();

        assert.strictEqual(report.nodes, NODES.length);
        assert.strictEqual(colorOf(harness.engine, 0), "#333333");
        assert.strictEqual(colorOf(harness.engine, 5), "#333333");
    });

    it("paints only the elements a run measured", async () => {
        const harness = makeHarness();

        await harness.paintAll();
        await harness.styles.add({
            name: "Communities",
            selector: { match: "has", path: "results.louvain.group" },
            set: { "node.color": "#ff0000" },
        });

        assert.strictEqual(paintedNodes(harness), 3);
        assert.strictEqual(colorOf(harness.engine, 0), "#ff0000");
        assert.strictEqual(colorOf(harness.engine, 2), "#ff0000");
        assert.strictEqual(colorOf(harness.engine, 3), "#333333", "node 3 was not in the run");
        assert.strictEqual(colorOf(harness.engine, 5), "#333333", "node 5 was not in the run");
    });

    it("leaves an element the encoding has nothing to say about to the layers beneath it", async () => {
        const harness = makeHarness();

        await harness.paintAll();
        await harness.styles.add({
            name: "Weight",
            selector: { match: "everything" },
            encode: { "node.color": { by: "data.weight", scale: "linear", palette: "viridis" } },
        });

        // Every node is repainted, because the selector says so -- but the two that carry no
        // weight are not PAINTED, because "skip" is what a missing value defaults to.
        assert.strictEqual(paintedNodes(harness), NODES.length);
        assert.notStrictEqual(colorOf(harness.engine, 0), "#333333");
        assert.strictEqual(colorOf(harness.engine, 4), "#333333");
        assert.strictEqual(colorOf(harness.engine, 5), "#333333");
    });

    it("lets the layer later in the stack win the channel both write", async () => {
        const harness = makeHarness();

        await harness.paintAll();
        await harness.styles.add({
            name: "Lower",
            selector: { match: "everything" },
            set: { "node.color": "#00ff00" },
        });
        await harness.styles.add({
            name: "Upper",
            selector: { match: "expression", where: 'data.kind == `"switch"`' },
            set: { "node.color": "#0000ff" },
        });

        assert.strictEqual(colorOf(harness.engine, 0), "#00ff00");
        assert.strictEqual(colorOf(harness.engine, 2), "#0000ff");
    });

    it("paints nothing for a layer that is disabled, while still repainting what it covered", async () => {
        const harness = makeHarness();

        await harness.paintAll();
        const layer = await harness.styles.add({
            name: "Communities",
            selector: { match: "has", path: "results.louvain.group" },
            set: { "node.color": "#ff0000" },
        });

        assert.strictEqual(colorOf(harness.engine, 0), "#ff0000");

        await harness.styles.update(layer.id, { enabled: false });

        assert.strictEqual(paintedNodes(harness), 3, "the elements it had covered are repainted");
        assert.strictEqual(colorOf(harness.engine, 0), "#333333");
    });
});

describe("an edit repaints a dirty set, not the graph", () => {
    it("repaints nothing for a layer that matches nothing", async () => {
        const harness = makeHarness();

        await harness.paintAll();
        await harness.styles.add({
            name: "Nothing",
            selector: { match: "ids", nodes: [] },
            set: { "node.color": "#ff0000" },
        });

        assert.strictEqual(paintedNodes(harness), 0);
    });

    it("repaints the elements the previous version matched as well as the new one", async () => {
        const harness = makeHarness();

        await harness.paintAll();
        const layer = await harness.styles.add({
            name: "Moving",
            selector: { match: "has", path: "results.louvain.group" },
            set: { "node.color": "#ff0000" },
        });

        await harness.styles.update(layer.id, { selector: { match: "ids", nodes: ["n3"] } });

        // Three it used to match, one it matches now, none of them shared.
        assert.strictEqual(paintedNodes(harness), 4);
        assert.strictEqual(colorOf(harness.engine, 0), "#333333", "it lost the paint it had");
        assert.strictEqual(colorOf(harness.engine, 3), "#ff0000");
    });

    it("gives an element back what the layers beneath it painted when a layer is removed", async () => {
        const harness = makeHarness();

        await harness.paintAll();
        const layer = await harness.styles.add({
            name: "Communities",
            selector: { match: "has", path: "results.louvain.group" },
            set: { "node.color": "#ff0000" },
        });

        assert.strictEqual(colorOf(harness.engine, 1), "#ff0000");

        await harness.styles.remove(layer.id);

        assert.strictEqual(paintedNodes(harness), 3);
        assert.strictEqual(colorOf(harness.engine, 1), "#333333");
    });

    it("runs the layers beneath a new one over an element nothing has painted yet", async () => {
        // No first draw: these elements have never had the stack applied. A layer added on top
        // of an already-painted element may skip what is beneath it, and this one may not --
        // there is nothing underneath to skip over.
        const harness = makeHarness();

        await harness.styles.add({
            name: "Sizes",
            selector: { match: "has", path: "results.louvain.group" },
            set: { "node.size": 3 },
        });

        assert.deepStrictEqual(Object.keys(harness.engine.styleOf("node", 0)).sort(), ["node.color", "node.size"]);
        assert.strictEqual(colorOf(harness.engine, 0), "#333333", "the base layer ran too");
    });

    it("runs the whole stack again for a layer inserted underneath another", async () => {
        const harness = makeHarness();

        await harness.paintAll();
        const top = await harness.styles.add({
            name: "Top",
            selector: { match: "ids", nodes: ["n0"] },
            set: { "node.color": "#0000ff" },
        });

        await harness.styles.add(
            {
                name: "Slid underneath",
                selector: { match: "ids", nodes: ["n0", "n1"] },
                set: { "node.color": "#00ff00" },
            },
            { below: top.id },
        );

        assert.strictEqual(colorOf(harness.engine, 0), "#0000ff", "the layer above still wins");
        assert.strictEqual(colorOf(harness.engine, 1), "#00ff00");
    });

    it("never reads a column for an element outside the dirty set", async () => {
        const harness = makeHarness();

        await harness.paintAll();
        harness.reads.length = 0;

        await harness.styles.add({
            name: "Communities",
            selector: { match: "has", path: "results.louvain.group" },
            set: { "node.color": "#ff0000" },
        });

        assert.isNotEmpty(harness.reads);
        assert.deepStrictEqual(
            [...new Set(harness.reads)].sort((left, right) => left - right),
            [0, 1, 2],
            "the three the run measured, and no others",
        );
    });

    it("iterates the run's measured column rather than the element list", async () => {
        // Every node above ten is a landmine: an implementation that walks the node list to find
        // what a run-bound layer matches steps on one. That a run-bound layer iterates the run's
        // measured column is stated here as a test rather than as an ambition.
        const measured = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
        const elements: SelectorSource = {
            nodeValue: (index, path) => {
                if (index >= measured.length) {
                    throw new Error(`the repaint read node ${String(index)}, which no run measured`);
                }

                return path === "results.pagerank.score" ? index : undefined;
            },
            edgeValue: () => undefined,
            nodeIdOf: (index) => `n${String(index)}`,
        };

        const engine = createLayerRepaint({
            nodeCount: () => 50_000,
            edgeCount: () => 0,
            elements,
            measured: (path) => (path === "results.pagerank.score" ? measured : undefined),
        });
        const styles = createStylesApi({ elements, repaint: engine.repaint });

        await styles.add({
            name: "PageRank",
            selector: { match: "has", path: "results.pagerank.score" },
            encode: { "node.size": { by: "results.pagerank.score", scale: "linear", range: [1, 4] } },
        });

        assert.strictEqual(engine.styleOf("node", 0)["node.size"], 1);
        assert.strictEqual(engine.styleOf("node", 9)["node.size"], 4);
        assert.isUndefined(engine.styleOf("node", 10)["node.size"]);
    });
});

describe("style identity", () => {
    it("does not mint a source mesh per colour", async () => {
        const harness = makeHarness();

        await harness.paintAll();
        await harness.styles.add({
            name: "Betweenness",
            selector: { match: "has", path: "results.betweenness.score" },
            encode: { "node.color": { by: "results.betweenness.score", scale: "linear", palette: "viridis" } },
        });

        const colors = new Set([0, 1, 2, 3].map((index) => colorOf(harness.engine, index)));

        assert.isAbove(colors.size, 1, "the ramp really did paint different colours");
        assert.strictEqual(harness.engine.meshCount("node"), 1, "colour is per-instance state");
    });

    it("mints one source mesh per distinct shape", async () => {
        const harness = makeHarness();

        await harness.paintAll();
        await harness.styles.add({
            name: "Hosts",
            selector: { match: "expression", where: 'data.kind == `"host"`' },
            set: { "node.shape": "box" },
        });
        await harness.styles.add({
            name: "Switches",
            selector: { match: "expression", where: 'data.kind == `"switch"`' },
            set: { "node.shape": "cylinder" },
        });

        // Three: the default an unpainted element keeps, plus one per shape.
        assert.strictEqual(harness.engine.meshCount("node"), 3);
        assert.strictEqual(harness.engine.meshKeyOf("node", 0), harness.engine.meshKeyOf("node", 1));
        assert.notStrictEqual(harness.engine.meshKeyOf("node", 0), harness.engine.meshKeyOf("node", 2));
        assert.deepStrictEqual(harness.engine.meshStyleOf("node", harness.engine.meshKeyOf("node", 0)), {
            "node.shape": "box",
        });
    });

    it("gives an arrow-headed edge and an arrow-tailed edge two source meshes", async () => {
        // An edge has TWO numeric mesh channels, width and animation speed, so the channels after
        // them sit at a different place in the interned sequence depending on which of the two an
        // edge carries. These two styles both folded to the same sequence before a number was
        // announced by a tag of its own, and the second edge was drawn from the first's mesh --
        // with its arrow on the wrong end.
        const elements: SelectorSource = {
            nodeValue: () => undefined,
            edgeValue: () => undefined,
            nodeIdOf: (index) => `n${String(index)}`,
            edgeIdOf: (index) => `e${String(index)}`,
        };
        const engine = createLayerRepaint({ nodeCount: () => 0, edgeCount: () => 2, elements });
        const styles = createStylesApi({ elements, repaint: engine.repaint });

        await styles.add({
            name: "Head",
            target: "edge",
            selector: { match: "ids", edges: ["e0"] },
            set: { "edge.width": 0, "edge.arrowHead": "normal" },
        });
        await styles.add({
            name: "Tail",
            target: "edge",
            selector: { match: "ids", edges: ["e1"] },
            set: { "edge.animationSpeed": 0, "edge.arrowTail": "normal" },
        });

        const head = engine.meshKeyOf("edge", 0);
        const tail = engine.meshKeyOf("edge", 1);

        assert.notStrictEqual(head, tail);
        assert.deepStrictEqual(engine.meshStyleOf("edge", head), { "edge.width": 0, "edge.arrowHead": "normal" });
        assert.deepStrictEqual(engine.meshStyleOf("edge", tail), {
            "edge.arrowTail": "normal",
            "edge.animationSpeed": 0,
        });
    });

    it("keeps colour, opacity and labels out of a mesh's identity", () => {
        const colorRole: StyleRole = channelRole("node.color");

        assert.strictEqual(colorRole, "instance");
        assert.strictEqual(channelRole("node.opacity"), "instance");
        assert.strictEqual(channelRole("edge.color"), "instance");
        assert.strictEqual(channelRole("node.label"), "content");
        assert.strictEqual(channelRole("node.shape"), "mesh");
        assert.strictEqual(channelRole("node.size"), "mesh");

        for (const channel of meshChannelsFor("node")) {
            assert.strictEqual(channelRole(channel), "mesh");
        }

        assert.notInclude([...meshChannelsFor("node")], "node.color");
        assert.notInclude([...meshChannelsFor("edge")], "edge.color");
    });
});

describe("the interner behind a mesh key", () => {
    it("gives one key to two identical sequences and mints the style once", () => {
        const interner = createStyleInterner<{ mark: number }>();
        let mints = 0;

        /**
         * Intern one shape-and-size pair.
         * @param shape - The shape.
         * @param size - The size.
         * @returns The key.
         */
        const intern = (shape: string, size: number): number => {
            interner.begin();
            interner.pushText(shape);
            interner.pushNumber(size);

            return interner.end(() => {
                mints++;

                return { mark: mints };
            });
        };

        const first = intern("box", 2);

        assert.strictEqual(intern("box", 2), first);
        assert.notStrictEqual(intern("box", 3), first);
        assert.notStrictEqual(intern("sphere", 2), first);
        assert.strictEqual(interner.size, 3);
        assert.strictEqual(mints, 3, "the style object is built once per distinct style");
        assert.deepStrictEqual(interner.get(first), { mark: 1 });
        assert.isUndefined(interner.get(99));
    });

    it("tells an absent channel apart from a false one", () => {
        const interner = createStyleInterner<string>();

        interner.begin();
        interner.pushAbsent();
        const absent = interner.end(() => "absent");

        interner.begin();
        interner.pushFlag(false);
        const off = interner.end(() => "off");

        assert.notStrictEqual(absent, off);
        assert.strictEqual(interner.size, 2);
    });

    it("keeps a number in one channel apart from a word in the next", () => {
        // A number is two whole numbers where every other kind of value is one, so the values
        // after it slide. Without a tag announcing the number, these two sequences are identical
        // and two genuinely different styles share one key.
        const bits = new ArrayBuffer(8);
        const asFloat = new Float64Array(bits);
        const asInts = new Int32Array(bits);

        asInts[0] = 0x3ff0_0000;
        asInts[1] = 0;

        const interner = createStyleInterner<string>();

        interner.begin();
        interner.pushNumber(1);
        interner.pushAbsent();
        const numberFirst = interner.end(() => "number first");

        interner.begin();
        interner.pushAbsent();
        interner.pushNumber(asFloat[0]);
        const numberSecond = interner.end(() => "number second");

        assert.notStrictEqual(numberFirst, numberSecond);
        assert.strictEqual(interner.size, 2);
    });

    it("reads every NaN and every zero as one value", () => {
        const interner = createStyleInterner<string>();

        /**
         * Intern one number.
         * @param value - The number.
         * @returns The key.
         */
        const intern = (value: number): number => {
            interner.begin();
            interner.pushNumber(value);

            return interner.end(() => String(value));
        };

        assert.strictEqual(intern(Number.NaN), intern(Number.NaN));
        assert.strictEqual(intern(0), intern(-0));
        assert.strictEqual(interner.size, 2);
    });

    it("stays flat as the number of distinct styles grows", () => {
        const interner = createStyleInterner<number>();

        for (let value = 0; value < 5000; value++) {
            interner.begin();
            interner.pushNumber(value);
            interner.end(() => value);
        }

        assert.strictEqual(interner.size, 5000);

        interner.begin();
        interner.pushNumber(4999);

        assert.strictEqual(interner.end(() => -1), 4999, "an existing style is found, not re-minted");
        assert.strictEqual(interner.size, 5000);
    });
});

describe("a layer the session cannot paint", () => {
    it("is reported and disabled for the pass, and the layers beneath it still paint", async () => {
        const rows: Row[] = Array.from({ length: 12 }, (_, index) => ({ "data.group": `g${String(index)}` }));
        const harness = makeHarness(rows);

        await harness.paintAll();
        await harness.styles.add({
            name: "Too many groups",
            selector: { match: "everything" },
            encode: { "node.color": { by: "data.group", scale: "ordinal", palette: "okabe-ito" } },
        });

        const problems: readonly RepaintProblem[] = harness.engine.problems();
        const [problem] = problems;

        assert.strictEqual(problem?.code, "E_CAP_EXCEEDED");
        assert.include(problem?.message ?? "", "okabe-ito");
        assert.strictEqual(colorOf(harness.engine, 0), "#333333", "the base layer painted anyway");
    });

    it("does not take the repaint down with it", async () => {
        const rows: Row[] = Array.from({ length: 12 }, (_, index) => ({ "data.group": `g${String(index)}` }));
        const harness = makeHarness(rows);

        await harness.paintAll();

        // The broken layer sits UNDER a good one, which is the arrangement that proves a refusal
        // is not a frame taken down: an exception here would leave the layer above unpainted.
        await harness.styles.add({
            name: "Too many groups",
            selector: { match: "everything" },
            encode: { "node.color": { by: "data.group", scale: "ordinal", palette: "okabe-ito" } },
        });
        await harness.styles.add({
            name: "Above it",
            selector: { match: "everything" },
            set: { "node.opacity": 0.5 },
        });

        assert.strictEqual(harness.engine.styleOf("node", 0)["node.opacity"], 0.5);
    });
});

describe("what the repaint hands back", () => {
    it("materialises only the channels something painted", async () => {
        const harness = makeHarness();

        await harness.paintAll();
        await harness.styles.add({
            name: "Sizes",
            selector: { match: "ids", nodes: ["n1"] },
            set: { "node.size": 4 },
        });

        assert.deepStrictEqual(Object.keys(harness.engine.styleOf("node", 1)).sort(), ["node.color", "node.size"]);
        assert.deepStrictEqual(Object.keys(harness.engine.styleOf("node", 0)), ["node.color"]);
    });

    it("answers with nothing for an element that does not exist", async () => {
        const harness = makeHarness();

        await harness.paintAll();

        assert.deepStrictEqual(harness.engine.styleOf("node", 99), {});
        assert.deepStrictEqual(harness.engine.styleOf("edge", 0), {});
        assert.strictEqual(harness.engine.meshKeyOf("node", 99), 0);
    });

    it("stops when it is cancelled rather than finishing quietly", async () => {
        const harness = makeHarness();
        const controller = new AbortController();

        controller.abort();

        let refusal = "resolved";

        try {
            await harness.engine.repaintAll(harness.stack(), {
                signal: controller.signal,
                report: () => undefined,
            });
        } catch (error) {
            refusal = error instanceof Error ? error.name : "not-an-error";
        }

        assert.strictEqual(refusal, "AbortError");
        assert.strictEqual(colorOf(harness.engine, 0), "unpainted");
    });
});

describe("a binding prepared against a column that has moved", () => {
    it("keeps the domain it was prepared with until the engine is told the data changed", async () => {
        const rows: Row[] = [{ "data.score": 0 }, { "data.score": 5 }, { "data.score": 10 }];
        const harness = makeHarness(rows);
        const spec: LayerSpec = {
            name: "Scores",
            selector: { match: "everything" },
            encode: { "node.size": { by: "data.score", scale: "linear", range: [0, 100] } },
        };

        await harness.paintAll();
        await harness.styles.add(spec);

        assert.strictEqual(harness.engine.styleOf("node", 1)["node.size"], 50);

        // The same layer, the same stack -- only the data underneath it moved.
        rows[2] = { "data.score": 20 };
        await harness.paintAll();

        assert.strictEqual(harness.engine.styleOf("node", 1)["node.size"], 50, "the old domain still stands");

        harness.engine.invalidate();
        await harness.paintAll();

        assert.strictEqual(harness.engine.styleOf("node", 1)["node.size"], 25, "the domain was read again");
    });
});
