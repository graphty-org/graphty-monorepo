/**
 * @file The renderer half of the doors test: every row of the element, `Graph`, `Node`, `Edge`
 * and manager roots in `src/session/commands/doors.ts` that dispatches, or will once ported, is
 * called on a real `Graph` with a spy on its session's dispatcher. A `knownGap` door must
 * dispatch nothing; a `dispatches` or `partial` door exactly the commands its row expects. Then,
 * for every property row that dispatches, the getter reads the value set, the value before after
 * an undo, and the value set again after a redo.
 *
 * The session's own roots are called by `test/session/history/doors.test.ts`, which also holds
 * the ratchet over every row.
 */

import "../../src/graphty-element";
// Loaded up front: `loadFromFile` imports it dynamically before it dispatches, and on a cold
// dev server serving that import can outlast the harness's settle bound, so the door would be
// read as dispatching nothing.
import "../../src/data/format-detection";

import { afterEach, assert, describe, it, vi } from "vitest";

import type { Graphty } from "../../index.js";
import { Graph, operationQueueOf } from "../../src/Graph";
import { type Door, DOOR_ROOTS } from "../../src/session/commands/doors";
import { dispatcherOf } from "../../src/session/GraphSession";
import type { GraphSession } from "../../src/session/types";
import { callOf, checkDispatches, dispatchesOf } from "../session/history/door-harness";

/** Per-root budget: each builds a real Babylon scene and calls every row once. */
const ROOT_TIMEOUT_MS = 60_000;

/** A small graph every door can find its way around. */
const NODES = [{ id: "n1" }, { id: "n2" }, { id: "n3" }];
const EDGES = [
    { src: "n1", dst: "n2" },
    { src: "n2", dst: "n3" },
];

/** What a root's rows are called on, and the session whose dispatcher is watched. */
interface Target {
    readonly object: object;
    readonly session: GraphSession;
}

const cleanups: (() => void)[] = [];

afterEach(() => {
    for (const cleanup of cleanups.splice(0)) {
        cleanup();
    }
});

/**
 * A real `Graph` holding the small graph, laid out in one pass.
 * @returns The graph.
 */
async function loadedGraph(): Promise<Graph> {
    const container = document.createElement("div");
    container.style.width = "400px";
    container.style.height = "300px";
    document.body.appendChild(container);
    const graph = new Graph(container);
    await graph.init();
    await graph.setLayout("circular");
    await graph.addNodes(NODES);
    await graph.addEdges(EDGES);
    await operationQueueOf(graph).waitForCompletion();
    cleanups.push(() => {
        graph.dispose();
        container.remove();
    });
    return graph;
}

/**
 * A mounted `<graphty-element>`.
 * @returns The element, once its graph exists.
 */
async function mountedElement(): Promise<Graphty> {
    const element = document.createElement("graphty-element");
    element.style.display = "block";
    element.style.width = "400px";
    element.style.height = "300px";
    document.body.appendChild(element);
    await element.updateComplete;
    await operationQueueOf(element.graph).waitForCompletion();
    await element.graph.addNodes(NODES);
    await element.graph.addEdges(EDGES);
    cleanups.push(() => {
        element.remove();
    });
    return element;
}

/** How the renderer half reaches an instance of each root whose rows it calls. */
const RENDERER_ROOTS: Readonly<Record<string, () => Promise<Target>>> = {
    Graphty: async () => {
        const element = await mountedElement();
        return { object: element, session: element.session };
    },
    Graph: async () => {
        const graph = await loadedGraph();
        return { object: graph, session: graph.getSession() };
    },
    Node: async () => {
        const graph = await loadedGraph();
        const node = graph.getNode("n1");
        assert.isDefined(node);
        return { object: node, session: graph.getSession() };
    },
    DataManager: async () => {
        const graph = await loadedGraph();
        return { object: graph.getDataManager(), session: graph.getSession() };
    },
    LayoutManager: async () => {
        const graph = await loadedGraph();
        return { object: graph.getLayoutManager(), session: graph.getSession() };
    },
    // Not reachable through a public member of Graph; the manager rule makes it a root anyway.
    AlgorithmManager: async () => {
        const graph = await loadedGraph();
        return {
            object: (graph as unknown as { algorithmManager: object }).algorithmManager,
            session: graph.getSession(),
        };
    },
};

/**
 * The rows of a root that the doors test calls.
 * @param doors - The root's rows.
 * @returns The called rows.
 */
function calledRows(doors: Readonly<Record<string, Door>>): [string, Door][] {
    return Object.entries(doors).filter(([, door]) => callOf(door) !== undefined);
}

describe("the renderer's doors", () => {
    for (const root of DOOR_ROOTS.filter((each) => each.half === "renderer" && each.doors !== undefined)) {
        const called = calledRows(root.doors ?? {});
        if (called.length === 0) {
            continue;
        }

        it(
            `${root.name}: every called row dispatches what its row says`,
            async () => {
                const reach = RENDERER_ROOTS[root.name] as (() => Promise<Target>) | undefined;
                assert.isDefined(reach, `the renderer half has no way to reach a ${root.name}`);
                const target = await reach();
                const dispatcher = dispatcherOf(target.session);
                for (const [member, door] of called) {
                    const call = callOf(door);
                    assert.isDefined(call);
                    const seen = await dispatchesOf(dispatcher, target.object, member, call);
                    checkDispatches(`${root.name}.${member}`, door, seen);
                }
            },
            ROOT_TIMEOUT_MS,
        );
    }
});

describe("the element's properties read back across undo and redo", () => {
    for (const root of DOOR_ROOTS.filter((each) => each.half === "renderer" && each.doors !== undefined)) {
        for (const [member, door] of Object.entries(root.doors ?? {})) {
            if (door.kind !== "dispatches" || door.call.kind !== "set") {
                continue;
            }

            const { value } = door.call;
            it(
                `${root.name}.${member}`,
                async () => {
                    const reach = RENDERER_ROOTS[root.name] as (() => Promise<Target>) | undefined;
                    assert.isDefined(reach);
                    const target = await reach();
                    const object = target.object as Record<string, unknown>;
                    const before = object[member];

                    object[member] = value;
                    // A setter whose command waits its turn on the queue is recorded once it has run.
                    await vi.waitFor(() => {
                        assert.lengthOf(target.session.history.pending, 0, "the assignment is recorded");
                    });
                    await target.session.history.restoreTo(target.session.history.steps.at(-1)?.id ?? null);
                    assert.deepEqual(object[member], value, "the getter reads the value set");

                    await target.session.undo();
                    assert.deepEqual(object[member], before, "undo restores what the getter read before");

                    await target.session.redo();
                    assert.deepEqual(object[member], value, "redo restores the value set");
                },
                ROOT_TIMEOUT_MS,
            );
        }
    }

    it("covers every property door: none is left on the gap list", () => {
        const gaps = DOOR_ROOTS.flatMap((root) =>
            Object.entries(root.doors ?? {}).flatMap(([member, door]) =>
                (door.kind === "knownGap" || door.kind === "partial") && door.call?.kind === "set"
                    ? [`${root.name}.${member}`]
                    : [],
            ),
        );
        assert.deepEqual(gaps, [], "property doors not yet checked across undo and redo");
    });
});

describe("the coordinate lane is read-only everywhere a consumer reaches it", () => {
    it(
        "hands out no writer through the data manager or the layout engine",
        async () => {
            const graph = await loadedGraph();
            const engine = graph.getLayoutManager().layoutEngine;
            assert.isDefined(engine);
            const views: [string, object][] = [
                ["DataManager.positions", graph.getDataManager().positions],
                ["LayoutEngine.nodePositions", engine.nodePositions],
            ];
            for (const [name, view] of views) {
                for (const writer of ["write", "fillUnplaced", "grow", "remap", "setPinned", "pinnedView", "view"]) {
                    assert.notProperty(view, writer, `${name} has no ${writer}`);
                }
            }
        },
        ROOT_TIMEOUT_MS,
    );
});
