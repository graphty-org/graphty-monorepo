/**
 * A one-pass layout (`SimpleLayoutEngine`, the class a third party extends) driven through the
 * layout manager with no renderer: what the protected helpers hand a subclass's `doLayout` --
 * the start coordinates after an add, node rows by id, coordinate records by id -- how a removal
 * made while the layout is paused waits for the resume, a layout that refuses the graph, and the
 * rows a layout publishes under renderPath "batched", where a stored row has no `Node` of its own.
 *
 * Every case goes through `LayoutManager` over a NullEngine scene, with a real data store and a
 * real position array, so each freeze the engine hears is one the store made.
 */
// Registers the element's engines, which is what `setLayout` looks them up in.
import "../../src/layout/index";

import { NullEngine, Scene } from "@babylonjs/core";
import { afterEach, assert, describe, it } from "vitest";

import type { AuthoredLayoutDescriptor } from "../../src/catalog/types";
import { WRITABLE_LANE } from "../../src/data/lane";
import type { GraphtyError } from "../../src/errors";
import { LayoutEngine, SimpleLayoutEngine } from "../../src/layout/LayoutEngine";
import { DataManager } from "../../src/managers/DataManager";
import { EventManager } from "../../src/managers/EventManager";
import { DefaultGraphContext } from "../../src/managers/GraphContext";
import { LayoutManager, layoutManagerInternals } from "../../src/managers/LayoutManager";
import { StatsManager } from "../../src/managers/StatsManager";
import { MeshCache } from "../../src/meshes/MeshCache";
import { Styles } from "../../src/Styles";

/** What one run of the probe saw. */
interface Run {
    /** The graph's node count. */
    readonly nodes: number;
    /** `startPositions(3)`, as a plain array, or null. */
    readonly start: number[] | null;
}

/**
 * A third party's one-pass layout: it places row `i` at (i, 2i, 0) in layout units, and records
 * what the protected helpers handed it on each run.
 */
class StartProbe extends SimpleLayoutEngine {
    static override type = "test-start-probe";
    static override maxDimensions = 3;
    static override descriptor: AuthoredLayoutDescriptor = {
        id: "test-start-probe",
        plainName: "Start probe",
        technicalName: "one-pass layout recording its start coordinates",
        description: "Places row i at (i, 2i, 0) and records what it was started from.",
        family: "geometric",
        kind: "batch",
        maxDimensions: 3,
        sizeRating: "any",
        structuralInputs: [],
        engine: "test-start-probe",
        options: [],
    };

    /** Every run, in order. */
    readonly runs: Run[] = [];

    doLayout(): void {
        this.stale = false;
        const n = this.graph.nodeCount;
        const start = this.startPositions(3);
        this.runs.push({ nodes: n, start: start === null ? null : Array.from(start) });
        const positions = new Float32Array(3 * n);
        for (let row = 0; row < n; row++) {
            positions[3 * row] = row;
            positions[3 * row + 1] = 2 * row;
        }

        this.result = { positions, dim: 3, n };
    }

    /**
     * The protected row helpers, as a subclass reaches them.
     * @returns what each answered
     */
    helpers(): {
        rowOfA: number;
        rowOfNumber: number;
        missing: number;
        record: number[] | null;
        noRecord: null;
        refusal: unknown;
    } {
        let refusal: unknown = null;
        try {
            this.requireRow("zz", "root");
        } catch (error) {
            refusal = error;
        }

        const record = this.rowsOfRecord({ a: [1, 2, 3], b: [4], zz: [9, 9] }, 2);
        return {
            rowOfA: this.rowOfId("a"),
            rowOfNumber: this.rowOfId(7),
            missing: this.rowOfId("zz"),
            record: record === null ? null : Array.from(record),
            noRecord: this.rowsOfRecord(null, 3) as null,
            refusal,
        };
    }
}

LayoutEngine.register(StartProbe);

interface Harness {
    readonly dataManager: DataManager;
    readonly manager: LayoutManager;
    readonly errors: GraphtyError[];
    at(id: string): { x: number; y: number; z: number };
    placed(id: string): boolean;
    /** Freeze the store, as the element does on its next frame, and step the layout once. */
    settle(): void;
}

const teardown: (() => void)[] = [];

afterEach(() => {
    for (const dispose of teardown.splice(0)) {
        dispose();
    }
});

/**
 * A layout manager over a NullEngine scene.
 * @param ids - The nodes to add, in a ring.
 * @param batched - Whether rows are drawn batched (renderPath "batched"), with no `Node` per row.
 * @returns The harness.
 */
function harness(ids: readonly string[], batched = false): Harness {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    const styles = Styles.default();
    const eventManager = new EventManager();
    const errors: GraphtyError[] = [];
    eventManager.onGraphError.add((e) => {
        if (e.type === "error") {
            errors.push(e.error as GraphtyError);
        }
    });
    const dataManager = new DataManager(eventManager, styles);
    if (batched) {
        dataManager.renderLimits = {
            ceilings: () => undefined,
            batched: () => true,
            objectRows: () => 0,
            objectEdges: () => 0,
        };
    }

    const manager = new LayoutManager(eventManager, dataManager, styles);
    const context = new DefaultGraphContext(
        () => styles,
        dataManager,
        manager,
        new MeshCache(),
        scene,
        new StatsManager(eventManager),
        {},
    );
    dataManager.setGraphContext(context);
    manager.setGraphContext(context);
    teardown.push(() => {
        manager.dispose();
        scene.dispose();
        engine.dispose();
    });

    dataManager.addNodes(ids.map((id) => ({ id })));
    dataManager.addEdges(ids.map((src, i) => ({ src, dst: ids[(i + 1) % ids.length] })));

    const rowOf = (id: string): number => {
        const row = dataManager.getSnapshot().ids.indexOf(id);
        assert.isAtLeast(row, 0, `${id} has a row`);
        return row;
    };

    return {
        dataManager,
        manager,
        errors,
        at(id) {
            const out = { x: 0, y: 0, z: 0 };
            dataManager.positions.read(rowOf(id), out);
            return out;
        },
        placed(id) {
            return dataManager.positions.isPlaced(rowOf(id));
        },
        settle() {
            // The store freezes lazily, on the first read of its snapshot: that read is what tells the
            // layout about the change. A one-pass layout is re-run when the element's update pass
            // next publishes it, which is what the publish here stands in for.
            dataManager.getSnapshot();
            manager.step();
            manager.layoutEngine?.publishPositions();
        },
    };
}

/**
 * The running probe.
 * @param h - The harness.
 * @returns The engine.
 */
function probe(h: Harness): StartProbe {
    const engine = h.manager.layoutEngine;
    assert.instanceOf(engine, StartProbe, "the probe is the layout");
    return engine;
}

describe("a one-pass layout started from the coordinates already drawn", () => {
    it("starts its first run from nothing, and the run after an add from every existing node", async () => {
        const h = harness(["a", "b", "c"]);
        await layoutManagerInternals.setLayout(h.manager, "test-start-probe", {});
        h.settle();
        const engine = probe(h);
        assert.isAtLeast(engine.runs.length, 1);
        assert.isNull(engine.runs[0].start, "the first run follows no add");
        const before = { a: h.at("a"), b: h.at("b"), c: h.at("c") };

        h.dataManager.addNodes([{ id: "d" }]);
        h.settle();

        const last = engine.runs.at(-1);
        assert.isDefined(last);
        assert.strictEqual(last.nodes, 4, "the re-run reads the grown graph");
        assert.isNotNull(last.start, "a run after an add is offered the existing coordinates");
        assert.lengthOf(last.start, 12, "three values a row");
        // Row order is the store's: a, b, c, then d. The start is in layout units.
        const s = engine.scalingFactor;
        for (const [i, id] of (["a", "b", "c"] as const).entries()) {
            assert.closeTo(last.start[3 * i], before[id].x / s, 1e-4, `${id}'s x`);
            assert.closeTo(last.start[3 * i + 1], before[id].y / s, 1e-4, `${id}'s y`);
        }

        assert.isTrue(Number.isNaN(last.start[9]), "the new node has no start");
        for (const id of ["a", "b", "c"] as const) {
            assert.deepEqual(h.at(id), before[id], `${id} stays where it was`);
        }

        assert.isTrue(h.placed("d"), "the new node is placed");
    });

    it("starts the run after a removal from nothing: it re-arranges the whole graph", async () => {
        const h = harness(["a", "b", "c", "d"]);
        await layoutManagerInternals.setLayout(h.manager, "test-start-probe", {});
        h.settle();
        const engine = probe(h);

        h.dataManager.removeNodeAndIncidentEdges("b");
        h.dataManager.addNodes([{ id: "e" }]);
        h.settle();

        const last = engine.runs.at(-1);
        assert.isDefined(last);
        assert.strictEqual(last.nodes, 4);
        assert.isNull(last.start, "a freeze that also removed is not an add");
    });
});

describe("what counts as an add", () => {
    it("re-arranges the whole graph when a node arrives in the freeze that took an edge away", async () => {
        const h = harness(["a", "b", "c", "d"]);
        await layoutManagerInternals.setLayout(h.manager, "test-start-probe", {});
        h.settle();
        const engine = probe(h);

        const [ab] = h.dataManager.getEdgesBetween("a", "b");
        assert.isDefined(ab, "the ring joins a and b");
        assert.isTrue(h.dataManager.removeEdge(ab.id));
        h.dataManager.addNodes([{ id: "x" }]);
        h.settle();

        const last = engine.runs.at(-1);
        assert.isDefined(last);
        assert.strictEqual(last.nodes, 5, "the re-run reads the grown graph");
        assert.isNull(last.start, "a freeze that rewired existing nodes is not an add");
    });

    it("re-arranges the whole graph when the freeze also joined two existing nodes", async () => {
        const h = harness(["a", "b", "c", "d"]);
        await layoutManagerInternals.setLayout(h.manager, "test-start-probe", {});
        h.settle();
        const engine = probe(h);

        h.dataManager.addNodes([{ id: "x" }]);
        h.dataManager.addEdges([{ src: "a", dst: "c" }]);
        h.settle();

        assert.isNull(engine.runs.at(-1)?.start ?? null, "an edge between existing nodes changes their picture");
    });
});

describe("a removal made while the layout is paused", () => {
    it("keeps every existing node until the resume, then re-arranges", async () => {
        const h = harness(["a", "b", "c", "d"]);
        await layoutManagerInternals.setLayout(h.manager, "test-start-probe", {});
        h.settle();
        const engine = probe(h);
        const before = { a: h.at("a"), c: h.at("c"), d: h.at("d") };

        h.manager.setPaused(true);
        h.dataManager.removeNodeAndIncidentEdges("b");
        h.settle();
        const runsPaused = engine.runs.length;

        for (const id of ["a", "c", "d"] as const) {
            assert.deepEqual(h.at(id), before[id], `${id} keeps its place while paused`);
        }

        h.manager.setPaused(false);
        h.settle();

        assert.isAbove(engine.runs.length, runsPaused, "the resume re-runs the layout");
        const last = engine.runs.at(-1);
        assert.isDefined(last);
        assert.isNull(last.start, "the held re-run arranges the whole graph");
        // Re-arranged: the probe puts row i at (i, 2i) layout units, and c is now row 1.
        assert.closeTo(h.at("c").x, engine.scalingFactor, 1e-3, "c moved to the second row's place");
    });

    it("places a node added during the pause among the kept ones", async () => {
        const h = harness(["a", "b", "c"]);
        await layoutManagerInternals.setLayout(h.manager, "test-start-probe", {});
        h.settle();
        const engine = probe(h);
        const a = h.at("a");

        h.manager.setPaused(true);
        h.dataManager.removeNodeAndIncidentEdges("b");
        h.settle();
        h.dataManager.addNodes([{ id: "x" }]);
        h.settle();

        assert.deepEqual(h.at("a"), a, "a keeps its place through both freezes");
        assert.isTrue(h.placed("x"), "the added node is placed while paused");
        h.manager.setPaused(false);
        h.settle();
        assert.isNull(engine.runs.at(-1)?.start ?? null, "the resume re-arranges the whole graph");
    });
});

describe("the row helpers a one-pass layout reads", () => {
    it("finds rows by id, refuses an unknown one with its code, and reads a coordinate record", async () => {
        const h = harness(["a", "b", "7"]);
        await layoutManagerInternals.setLayout(h.manager, "test-start-probe", {});
        h.settle();
        const out = probe(h).helpers();

        assert.strictEqual(out.rowOfA, 0);
        assert.strictEqual(out.rowOfNumber, 2, "the number 7 names node '7'");
        assert.strictEqual(out.missing, -1 >>> 0, "an id the graph lacks has no row");
        assert.isNull(out.noRecord);
        assert.isNotNull(out.record);
        // Two values a row: a's first two, b's one value and a zero, and '7' unplaced.
        assert.deepEqual(out.record.slice(0, 4), [1, 2, 4, 0]);
        assert.isTrue(out.record.slice(4).every(Number.isNaN), "a row the record leaves out is NaN");
        const refusal = out.refusal as GraphtyError;
        assert.strictEqual(refusal.code, "E_UNKNOWN_ELEMENT");
        assert.deepInclude(refusal.details as object, {
            kind: "node",
            id: "zz",
            option: "root",
            layout: "test-start-probe",
        });
    });
});

describe("a layout that refuses the graph", () => {
    it("places nothing and reports the refusal by its code", async () => {
        // K5 is not planar.
        const ids = ["a", "b", "c", "d", "e"];
        const h = harness([]);
        h.dataManager.addNodes(ids.map((id) => ({ id })));
        const edges = [];
        for (let i = 0; i < ids.length; i++) {
            for (let j = i + 1; j < ids.length; j++) {
                edges.push({ src: ids[i], dst: ids[j] });
            }
        }

        h.dataManager.addEdges(edges);
        let refused: unknown = null;
        try {
            await layoutManagerInternals.setLayout(h.manager, "planar", {});
            h.settle();
        } catch (error) {
            refused = error;
        }

        const reported = (refused as GraphtyError | null) ?? h.errors.at(-1);
        assert.isDefined(reported, "the refusal reaches the caller or the error event");
        assert.strictEqual(reported.code, "E_NOT_PLANAR");
        for (const id of ids) {
            assert.isFalse(h.placed(id), `${id} is not placed`);
        }
    });
});

describe('a one-pass layout under renderPath "batched"', () => {
    it("places every stored row, and takes a restored arrangement into its answer", async () => {
        const h = harness(["a", "b", "c", "d", "e"], true);
        await layoutManagerInternals.setLayout(h.manager, "circular", {});
        h.settle();
        for (const id of ["a", "b", "c", "d", "e"]) {
            assert.isTrue(h.placed(id), `${id} is placed by row`);
        }

        // A restore writes the array and hands it to the engine; its next publish must not put
        // the answer it computed before back over the restored rows.
        const row = h.dataManager.getSnapshot().ids.indexOf("c");
        h.dataManager[WRITABLE_LANE].write(row, 11, 22, 0);
        h.manager.loadArrangement(true, true);
        const engine = h.manager.layoutEngine;
        assert.isDefined(engine);
        engine.publishPositions();
        assert.deepEqual(h.at("c"), { x: 11, y: 22, z: 0 }, "the restored place survives the next publish");
    });

    it("re-runs the probe by row, and keeps existing rows after an add", async () => {
        const h = harness(["a", "b", "c"], true);
        await layoutManagerInternals.setLayout(h.manager, "test-start-probe", {});
        h.settle();
        const b = h.at("b");
        h.dataManager.addNodes([{ id: "d" }]);
        h.settle();
        assert.deepEqual(h.at("b"), b, "b stays put");
        assert.isTrue(h.placed("d"));
    });
});
