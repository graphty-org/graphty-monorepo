/**
 * @file What an edge is called, and why it stopped being called after its two endpoints.
 *
 * `Edge.id` used to be `"srcId:dstId"`. Two things were wrong with that, and both were silent.
 * It could not name two edges between the same pair at all, so a repeated record was dropped
 * before anything could count it. And it collided for any node id containing a colon: an edge
 * from `a:b` to `c` and an edge from `a` to `b:c` had the same id, so one of them replaced the
 * other in every map keyed by it.
 *
 * `Edge.id` is now the element-assigned counter the store stamps into each edge's
 * `graphty.edgeId` column, printed. The pin-lifecycle half of this file's subject matter lives in
 * `test/unit/node-index-pinned.test.ts`; the two were only ever together because `index` landed
 * for nodes and edges at the same time.
 *
 * The harness is a real `NullEngine` scene and the managers `Node` and `Edge` call into, so the
 * field initialisers actually run and the store really assigns rows.
 */
import { NullEngine, type Scene as BabylonScene, Scene } from "@babylonjs/core";
import { INVALID_INDEX } from "@graphty/graph-format";
import { afterEach, assert, describe, it } from "vitest";

import type { AdHocData, EdgeStyleConfig } from "../../src/config";
import { edgeCounterOf, edgeIdOf } from "../../src/data/edgeIdentity";
import { Edge } from "../../src/Edge";
import { SimpleLayoutEngine } from "../../src/layout/LayoutEngine";
import { DataManager } from "../../src/managers/DataManager";
import { EventManager } from "../../src/managers/EventManager";
import { DefaultGraphContext, type GraphContext } from "../../src/managers/GraphContext";
import { LayoutManager } from "../../src/managers/LayoutManager";
import { StatsManager } from "../../src/managers/StatsManager";
import type { EdgePaint } from "../../src/managers/StylePainter";
import { MeshCache } from "../../src/meshes/MeshCache";
import { Styles } from "../../src/Styles";

const EDGE_STYLE: EdgeStyleConfig = {
    line: { type: "solid", color: "#AAAAAA", width: 0.5 },
};

/**
 * The paint the one hand-built edge here is drawn from.
 *
 * An `Edge` is handed its paint rather than an id to look a style up by, because the session's
 * paint is addressed by the dense index the store assigns AFTER construction. One style, so one
 * key. Every other edge in this file is built by the data manager, which supplies its own.
 */
const EDGE_PAINT: EdgePaint = { meshKey: "test-edge", style: EDGE_STYLE };

/** A layout engine that holds its nodes and edges and never moves anything. */
class StillLayout extends SimpleLayoutEngine {
    static override type = "still-edge-identity";

    override positions: Record<string | number, number[]> = {};

    /** Mark the (absent) positions as fresh. */
    doLayout(): void {
        this.stale = false;
    }
}

interface Harness {
    context: GraphContext;
    dataManager: DataManager;
    scene: BabylonScene;
    dispose(): void;
}

/**
 * Build a minimal but REAL graph context against a NullEngine scene.
 * @returns A harness whose dispose() tears down the Babylon scene
 */
function createHarness(): Harness {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    const meshCache = new MeshCache();
    const styles = Styles.default();
    const eventManager = new EventManager();
    const statsManager = new StatsManager(eventManager);
    const dataManager = new DataManager(eventManager, styles);
    const layoutManager = new LayoutManager(eventManager, dataManager, styles);
    layoutManager.layoutEngine = new StillLayout();

    const context = new DefaultGraphContext(() => styles, dataManager, layoutManager, meshCache, scene, statsManager, {});
    dataManager.setGraphContext(context);

    return {
        context,
        dataManager,
        scene,
        dispose(): void {
            dataManager.dispose();
            scene.dispose();
            engine.dispose();
        },
    };
}

let harness: Harness | undefined;

afterEach(() => {
    harness?.dispose();
    harness = undefined;
});

describe("the two functions that write and read an edge id", () => {
    it("prints a counter, and reads the same counter back", () => {
        assert.strictEqual(edgeIdOf(0), "0");
        assert.strictEqual(edgeIdOf(41), "41");
        assert.strictEqual(edgeCounterOf("41"), 41);
    });

    it("refuses an id no element ever handed out, rather than resolving it to some edge", () => {
        // Number() would take every one of these. "0x10" would then name edge 16, " 3 " would
        // name edge 3, and "" would name edge 0 -- three ids nothing was ever stamped with,
        // each quietly selecting a real edge.
        for (const nonsense of ["", " 3 ", "0x10", "1e2", "-1", "3.5", "a:b"]) {
            assert.strictEqual(edgeCounterOf(nonsense), INVALID_INDEX, `"${nonsense}" names no edge`);
        }
    });
});

describe("the id an edge carries", () => {
    it("is the element's counter, in the order the records arrived", () => {
        harness = createHarness();
        harness.dataManager.addNodes([{ id: "a" }, { id: "b" }, { id: "c" }]);
        harness.dataManager.addEdges([
            { source: "a", target: "b" },
            { source: "b", target: "c" },
        ]);

        assert.deepStrictEqual([...harness.dataManager.edges.keys()], ["0", "1"]);
        assert.strictEqual(harness.dataManager.getEdge("0")?.srcId, "a", "the first record kept the first id");
        assert.strictEqual(harness.dataManager.getEdge("1")?.srcId, "b");
    });

    it("is the counter the store stamped, not merely a number this manager kept on the side", () => {
        harness = createHarness();
        harness.dataManager.addNodes([{ id: "a" }, { id: "b" }]);
        harness.dataManager.addEdges([{ source: "a", target: "b" }]);

        const edge = harness.dataManager.getEdge("0");
        assert.isDefined(edge);
        const snapshot = harness.dataManager.getSnapshot();
        assert.strictEqual(
            snapshot.edgeIndexOf(edgeCounterOf(edge.id)),
            edge.index,
            "the id resolves through graph-format's own edge id index to this edge's row",
        );
    });

    it("tells apart two edges whose endpoint ids contain colons", () => {
        // `a:b -> c` and `a -> b:c` both printed as "a:b:c" under the old pair-string id, so one
        // of them replaced the other in `dataManager.edges` and the graph quietly held one edge.
        harness = createHarness();
        harness.dataManager.addNodes([{ id: "a" }, { id: "b" }, { id: "c" }, { id: "a:b" }, { id: "b:c" }]);
        harness.dataManager.addEdges([
            { source: "a:b", target: "c" },
            { source: "a", target: "b:c" },
        ]);

        assert.strictEqual(harness.dataManager.edges.size, 2, "two edges, not one");
        const ids = [...harness.dataManager.edges.keys()];
        assert.strictEqual(new Set(ids).size, 2, "with two distinct ids");
        assert.strictEqual(harness.dataManager.getSnapshot().edgeCount, 2, "and the store holds both");
    });

    it("belongs to an edge that has a store row, because an edge without one is never built", () => {
        harness = createHarness();
        harness.dataManager.addNodes([{ id: "a" }, { id: "b" }]);
        // Neither record answers any endpoint spelling the batch resolved, so graph-format will
        // not hold an edge between them. Such a record used to become a render object with
        // INVALID_INDEX -- permanently visible, because the per-frame mask forces an unplaced
        // edge visible, and unfilterable because a filter is addressed by index.
        harness.dataManager.addEdges([
            { source: "a", target: "b" },
            { source: null, target: null },
        ]);

        assert.strictEqual(harness.dataManager.edges.size, 1, "the unusable record became no edge");
        for (const edge of harness.dataManager.edges.values()) {
            assert.notStrictEqual(edge.index, INVALID_INDEX, "every Edge the manager holds has a row");
        }

        assert.strictEqual(harness.dataManager.lastImport?.counts.rejected, 1, "and the rejection is reported");
    });

    it("is on a fresh Edge before the store has seen it, with no index yet", () => {
        // What an `Edge` is on its own: the id is handed in, the index is not, and INVALID_INDEX
        // is the honest answer until the manager registers it.
        harness = createHarness();
        harness.dataManager.addNodes([{ id: "src" }, { id: "dst" }]);

        const edge = new Edge(harness.context, "src", "dst", 7, EDGE_PAINT, {} as unknown as AdHocData);

        assert.strictEqual(edge.index, INVALID_INDEX, "index is INVALID_INDEX until the edge reaches the builder");
        assert.strictEqual(edge.id, "7", "the id is the counter it was handed, printed");
    });
});

describe("how many edges share an endpoint pair", () => {
    it("reports each parallel edge's rank and how many there are", () => {
        harness = createHarness();
        harness.dataManager.addNodes([{ id: "a" }, { id: "b" }]);
        harness.dataManager.addEdges([
            { source: "a", target: "b" },
            { source: "a", target: "b" },
        ]);

        const [first, second] = harness.dataManager.getEdgesBetween("a", "b");
        assert.strictEqual(first.parallelRank, 0);
        assert.strictEqual(second.parallelRank, 1);
        assert.strictEqual(first.parallelCount, 2);
        assert.strictEqual(second.parallelCount, 2);
    });

    it("re-reads them after a removal, rather than carrying a stale number", () => {
        harness = createHarness();
        harness.dataManager.addNodes([{ id: "a" }, { id: "b" }]);
        harness.dataManager.addEdges([
            { source: "a", target: "b" },
            { source: "a", target: "b" },
        ]);

        const [, second] = harness.dataManager.getEdgesBetween("a", "b");
        harness.dataManager.removeEdge("0");

        assert.strictEqual(second.parallelRank, 0, "the survivor slid down");
        assert.strictEqual(second.parallelCount, 1);
    });
});

describe("the element's own paint is unaffected by any of this", () => {
    it("draws no label on an edge nothing named", () => {
        // The label used to fall back to the id, so an unlabelled edge read "alice:bob" on screen.
        // Under a counter the same fallback would read "17", an internal number with no meaning to
        // a reader, so the fallback is gone rather than reworded.
        harness = createHarness();
        harness.dataManager.addNodes([{ id: "a" }, { id: "b" }]);
        harness.dataManager.addEdges([{ source: "a", target: "b" }]);

        assert.isNull(harness.dataManager.getEdge("0")?.label ?? null, "no label was configured, so none is drawn");
    });
});
