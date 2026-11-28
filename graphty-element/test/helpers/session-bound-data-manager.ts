/**
 * @file The element's data manager bound to a real session, with no renderer, as a drawn graph binds
 * it: `Graph` binds the manager to its session's dispatcher and hands each pass's `graph` slice to
 * `DataManager.reconcile`. The element itself needs a document, which the node projects have not
 * got, so the wiring is done here over a NullEngine scene and nothing else.
 */

import { NullEngine, Scene } from "@babylonjs/core";
import { afterEach, assert } from "vitest";

import { SimpleLayoutEngine } from "../../src/layout/LayoutEngine";
import { DataManager, dataManagerInternals, laneStoreOf } from "../../src/managers/DataManager";
import { EventManager } from "../../src/managers/EventManager";
import { DefaultGraphContext } from "../../src/managers/GraphContext";
import { LayoutManager, layoutManagerInternals } from "../../src/managers/LayoutManager";
import { StatsManager } from "../../src/managers/StatsManager";
import { MeshCache } from "../../src/meshes/MeshCache";
import { createElementSession, dispatcherOf } from "../../src/session/GraphSession";
import type { ElementSession } from "../../src/session/types";
import { Styles } from "../../src/Styles";

/** A layout engine that holds its nodes and edges and never moves anything. */
class StillLayout extends SimpleLayoutEngine {
    static override type = "still-session-bound";

    override positions: Record<string | number, number[]> = {};

    /** Mark the (absent) positions as fresh. */
    doLayout(): void {
        this.stale = false;
    }
}

/** A data manager bound to a session, and what its passes did. */
export interface BoundDataManager {
    readonly session: ElementSession;
    readonly dataManager: DataManager;
    readonly eventManager: EventManager;
    /** How many nodes and edges the passes built and tore down, from `reconcile`'s answers. */
    readonly passes: { added: number; removed: number }[];
    /** What `sliceProblems` found after each pass: the drawn maps keyed unlike the slice. */
    readonly problems: string[];
}

/** How the bound data manager stores its rows. */
export interface BoundDataManagerOptions {
    /** Rows drawn under renderPath "batched". */
    readonly batched?: boolean;
    /** Store each edge with no `Edge`, building one only when the edge maps are read. */
    readonly unbuiltEdges?: boolean;
}

const teardown: (() => void)[] = [];

afterEach(() => {
    for (const dispose of teardown.splice(0)) {
        dispose();
    }
});

/**
 * A data manager over a NullEngine scene, bound to an element session as a drawn graph binds it.
 * Disposed after the test, which also asserts that every pass drew exactly what its slice holds.
 * @param options - How it stores its rows.
 * @returns The harness.
 */
export function sessionBoundDataManager(options: BoundDataManagerOptions = {}): BoundDataManager {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    const styles = Styles.default();
    const eventManager = new EventManager();
    const dataManager = new DataManager(eventManager, styles);
    if (options.batched === true) {
        dataManager.renderLimits = { ceilings: () => undefined, batched: () => true };
    }

    if (options.unbuiltEdges === true) {
        dataManagerInternals.storeEdgesUnbuilt(dataManager, true);
    }

    const layoutManager = new LayoutManager(eventManager, dataManager, styles);
    layoutManagerInternals.setEngine(layoutManager, new StillLayout());
    const context = new DefaultGraphContext(
        () => styles,
        dataManager,
        layoutManager,
        new MeshCache(),
        scene,
        new StatsManager(eventManager),
        {},
    );
    dataManager.setGraphContext(context);
    const session = createElementSession({ store: laneStoreOf(dataManager) });
    const dispatcher = dispatcherOf(session);
    dataManager.bindSession(dispatcher, {
        rowsAdded: () => undefined,
        loading: () => undefined,
        removing: () => undefined,
    });
    const passes: { added: number; removed: number }[] = [];
    const problems: string[] = [];
    const { lane } = dispatcher;
    lane.register("graph", (_rendered, target, dirty) => {
        passes.push(dataManager.reconcile(target.graph, dirty, lane.cause));
        problems.push(...dataManager.sliceProblems(target.graph));
        return Promise.resolve();
    });
    teardown.push(() => {
        session.dispose();
        layoutManager.dispose();
        dataManager.dispose();
        scene.dispose();
        engine.dispose();
        assert.deepStrictEqual(problems, [], "every pass drew exactly what its slice holds");
    });
    return { session, dataManager, eventManager, passes, problems };
}

/**
 * The drawn node ids, sorted.
 * @param dataManager - The manager.
 * @returns The ids.
 */
export function drawnNodes(dataManager: DataManager): string[] {
    return [...dataManager.nodes.keys()].map(String).sort();
}

/**
 * The drawn edges as `source>target`, sorted. Builds the `Edge` of every edge stored with none.
 * @param dataManager - The manager.
 * @returns The pairs.
 */
export function drawnEdges(dataManager: DataManager): string[] {
    return [...dataManager.edges.values()].map((edge) => `${String(edge.srcId)}>${String(edge.dstId)}`).sort();
}
