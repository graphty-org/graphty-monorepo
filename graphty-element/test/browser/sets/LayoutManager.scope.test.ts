/**
 * @file A layout over a set, through a real graph (design/sets/sets-design.md section 11): the
 * scope is carried from one layout to the next, its members are frozen when a layout starts, a
 * removed set lets the layout go without throwing, and the element's `layoutScope` property and
 * `layout-scope` attribute read and write through.
 */

import "../../../src/graphty-element";

import { maskTest } from "@graphty/graph-format";
import { afterEach, assert, beforeEach, describe, it } from "vitest";

import type { Graphty } from "../../../index.js";
import { setLayout as layoutCommand } from "../../../src/ai/commands/LayoutCommands";
import { isGraphtyError } from "../../../src/errors";
import { Graph, operationQueueOf } from "../../../src/Graph";
import type { Node } from "../../../src/Node";
import type { ElementSession } from "../../../src/session/types";

/** Twenty nodes on a path, each with a group attribute. */
const IDS = Array.from({ length: 20 }, (_, index) => `n${String(index)}`);

/** The first half: what the scoped layouts below lay out. */
const MEMBERS = IDS.slice(0, 10);

/**
 * Put a graph on the page holding the twenty-node path.
 * @returns The graph.
 */
async function pathGraph(): Promise<{ graph: Graph; container: HTMLDivElement }> {
    const container = document.createElement("div");
    container.style.width = "400px";
    container.style.height = "300px";
    document.body.appendChild(container);
    const graph = new Graph(container);
    await graph.init();
    await graph.addNodes(IDS.map((id, index) => ({ id, group: index < 10 ? 1 : 2 })));
    await graph.addEdges(IDS.slice(1).map((id, index) => ({ src: IDS[index], dst: id })));
    await operationQueueOf(graph).waitForCompletion();

    return { graph, container };
}

/**
 * Whether the running layout holds exactly the nodes outside `members`.
 * @param graph - The graph.
 * @param members - The ids the layout should move.
 * @returns A list of disagreements, empty when the hold agrees.
 */
function holdDisagreements(graph: Graph, members: readonly string[]): string[] {
    const mask = graph.getLayoutManager().layoutEngine?.holdMask ?? null;
    if (mask === null) {
        return ["no hold"];
    }

    const wrong: string[] = [];
    for (const node of graph.getDataManager().nodes.values()) {
        if (maskTest(mask, node.index) === members.includes(String(node.id))) {
            wrong.push(String(node.id));
        }
    }

    return wrong;
}

describe("a layout over a set", () => {
    let graph: Graph;
    let container: HTMLDivElement;
    let session: ElementSession;
    let id: string;

    beforeEach(async () => {
        ({ graph, container } = await pathGraph());
        session = graph.getSession() as ElementSession;
        id = session.sets.create({ kind: "fixed", nodes: MEMBERS, reading: "induced" }, { name: "First half" });
    });

    afterEach(() => {
        graph.dispose();
        container.remove();
    });

    it("carries the scope: explicit sets it, absent keeps it, 'graph' clears it", async () => {
        await graph.setLayout("ngraph", {}, { scope: { set: id } });
        assert.deepEqual(graph.getLayoutScope(), { set: id });
        assert.deepEqual(holdDisagreements(graph, MEMBERS), []);

        // A layoutConfig change is exactly this call: the same layout, new options, no scope.
        await graph.setLayout("ngraph", { springLength: 20 });
        assert.deepEqual(graph.getLayoutScope(), { set: id }, "changing an option did not un-scope it");
        assert.deepEqual(holdDisagreements(graph, MEMBERS), [], "and non-members are still held");

        await graph.setLayout("d3", {}, { scope: "graph" });
        assert.isUndefined(graph.getLayoutScope(), "an unscoped layout reads undefined, never 'graph'");
        assert.isNull(graph.getLayoutManager().layoutEngine?.holdMask ?? null);
    });

    it("keeps layoutScope and the hold in agreement when the assistant switches layouts", async () => {
        await graph.setLayout("ngraph", {}, { scope: { set: id } });

        const result = await layoutCommand.execute(graph, { type: "d3" });

        assert.isTrue(result.success, result.message);
        assert.strictEqual(graph.getLayoutManager().layoutType, "d3");
        assert.deepEqual(graph.getLayoutScope(), { set: id });
        assert.deepEqual(holdDisagreements(graph, MEMBERS), []);
    });

    it("lists the running layout among the set's users", async () => {
        await graph.setLayout("ngraph", {}, { scope: { set: id } });

        const users = session.sets.usedBy(id);

        assert.deepEqual(
            users.filter((user) => user.kind === "layout").map((user) => user.label),
            ["Layout (ngraph)"],
        );
    });

    it("lets go without throwing when the set a running layout names is removed", async () => {
        await graph.setLayout("ngraph", {}, { scope: { set: id } });

        session.sets.remove(id);
        assert.isNull(graph.getLayoutManager().layoutEngine?.holdMask ?? null, "the layout runs unscoped");
        assert.deepEqual(session.sets.usedBy(id), []);

        // A carried reference to the removed set never refuses; an explicit one does.
        await graph.setLayout("d3", {});
        assert.isNull(graph.getLayoutManager().layoutEngine?.holdMask ?? null);
        let error: unknown;
        try {
            await graph.setLayout("ngraph", {}, { scope: { set: id } });
        } catch (caught) {
            error = caught;
        }
        assert.isTrue(isGraphtyError(error) && error.code === "E_BAD_COMMAND", String(error));
    });

    it("refuses an explicit scope with no members with E_SCOPE_EMPTY, as a run does", async () => {
        const empty = session.sets.create(
            { kind: "fixed", nodes: ["not-a-node"], reading: "induced" },
            { name: "Empty" },
        );
        const codeOf = async (scope: unknown): Promise<unknown> => {
            try {
                await graph.setLayout("ngraph", {}, { scope: scope as never });
            } catch (caught) {
                return isGraphtyError(caught) ? caught.code : caught;
            }

            return null;
        };

        assert.strictEqual(await codeOf({ set: empty }), "E_SCOPE_EMPTY");
        assert.isNull(
            graph.getLayoutManager().layoutEngine?.holdMask ?? null,
            "nothing was held for the refused scope",
        );
    });

    it("refuses an explicit scope on a layout that cannot hold nodes still, with E_UNSUPPORTED", async () => {
        let error: unknown;
        try {
            await graph.setLayout("circular", {}, { scope: { set: id } });
        } catch (caught) {
            error = caught;
        }

        assert.isTrue(isGraphtyError(error) && error.code === "E_UNSUPPORTED", String(error));
    });

    it("does not move the hold on a click, a filter change or an attribute edit", async () => {
        await graph.setLayout("ngraph", {}, { scope: { where: "data.group == `1`" } });
        assert.deepEqual(holdDisagreements(graph, MEMBERS), []);

        await session.selection.apply({ nodes: ["n15"] });
        await session.visibility.set({ kind: "expression", where: "data.group == `2`" });
        await graph.updateNodes([
            { id: "n15", group: 1 },
            { id: "n0", group: 2 },
        ]);
        await operationQueueOf(graph).waitForCompletion();
        graph.getDataManager().getSnapshot();

        assert.deepEqual(holdDisagreements(graph, MEMBERS), [], "the members are the ones the layout started with");
    });

    it("holds a node added after the layout started", async () => {
        await graph.setLayout("ngraph", {}, { scope: { set: id } });

        await graph.addNodes([{ id: "late" }]);
        await graph.addEdges([{ src: "n0", dst: "late" }]);
        await operationQueueOf(graph).waitForCompletion();
        graph.getDataManager().getSnapshot();

        assert.deepEqual(holdDisagreements(graph, MEMBERS), [], "the newcomer is held, the members are not");
    });

    it("never writes the hold into the pin lane, and an unpin does not release a held node", async () => {
        await graph.setLayout("ngraph", {}, { scope: { set: id } });
        const outsider = graph.getDataManager().getNode("n19") as Node;

        assert.isFalse(outsider.isPinned(), "held, not pinned");
        outsider.pin();
        outsider.unpin();

        assert.deepEqual(holdDisagreements(graph, MEMBERS), []);
    });
});

describe("the default layout", () => {
    it("carries a scope set before it ran", async () => {
        const container = document.createElement("div");
        document.body.appendChild(container);
        const graph = new Graph(container);
        try {
            // Before init: the constructor has queued the default layout, which has not run yet.
            await graph.setLayoutScope({ nodes: ["n0"] });
            await graph.init();
            await operationQueueOf(graph).waitForCompletion();

            assert.strictEqual(graph.getLayoutManager().layoutType, "ngraph");
            assert.deepEqual(graph.getLayoutScope(), { nodes: ["n0"] });
            assert.isNotNull(graph.getLayoutManager().layoutEngine?.holdMask ?? null, "the default layout is scoped");
        } finally {
            graph.dispose();
            container.remove();
        }
    });
});

describe("a simulation over a set", () => {
    const graphs: Graph[] = [];

    afterEach(() => {
        for (const graph of graphs.splice(0)) {
            graph.dispose();
        }
    });

    /**
     * Lay the path out with ForceAtlas2 from one circular arrangement, holding the second half
     * either as a scope or as pins, and read every node's coordinates.
     * @param hold - How the second half is held.
     * @returns The coordinates, by id.
     */
    async function arrange(hold: "scope" | "pins"): Promise<Map<string, [number, number, number]>> {
        const { graph } = await pathGraph();
        graphs.push(graph);
        graph.engine.stopRenderLoop();
        await graph.setLayout("circular");
        if (hold === "pins") {
            for (const id of IDS.slice(10)) {
                graph.getDataManager().getNode(id)?.pin();
            }
        }

        await graph.setLayout("forceatlas2", { seed: 7 }, hold === "scope" ? { scope: { nodes: MEMBERS } } : {});
        const layouts = graph.getLayoutManager();
        for (let frame = 0; frame < 20; frame++) {
            layouts.step();
        }

        const out = { x: 0, y: 0, z: 0 };
        const coords = new Map<string, [number, number, number]>();
        for (const node of graph.getDataManager().nodes.values()) {
            graph.getDataManager().positions.read(node.index, out);
            coords.set(String(node.id), [out.x, out.y, out.z]);
        }

        return coords;
    }

    it("holds the rest natively, exactly as a hand-pinned run", async () => {
        const scoped = await arrange("scope");
        const pinned = await arrange("pins");

        for (const nodeId of IDS) {
            assert.deepEqual(scoped.get(nodeId), pinned.get(nodeId), nodeId);
        }
    });
});

describe("the element's layoutScope", () => {
    let element: Graphty | null = null;
    const rejections: unknown[] = [];
    const onRejection = (event: PromiseRejectionEvent): void => {
        rejections.push(event.reason);
    };

    beforeEach(() => {
        window.addEventListener("unhandledrejection", onRejection);
    });

    afterEach(() => {
        window.removeEventListener("unhandledrejection", onRejection);
        rejections.length = 0;
        element?.parentElement?.remove();
        element = null;
    });

    /**
     * Mount an element holding the path, with a layout.
     * @param attributes - Attributes to set before it connects.
     * @returns The element, settled.
     */
    async function mount(attributes: Record<string, string> = {}): Promise<Graphty> {
        const container = document.createElement("div");
        container.style.width = "400px";
        container.style.height = "300px";
        document.body.appendChild(container);
        const mounted = document.createElement("graphty-element");
        for (const [name, value] of Object.entries(attributes)) {
            mounted.setAttribute(name, value);
        }

        mounted.nodeData = IDS.map((nodeId) => ({ id: nodeId }));
        mounted.edgeData = IDS.slice(1).map((nodeId, index) => ({ src: IDS[index], dst: nodeId }));
        mounted.layout = "ngraph";
        container.appendChild(mounted);
        element = mounted;
        await operationQueueOf(mounted.graph).waitForCompletion();

        return mounted;
    }

    it("reads and writes through, and reads undefined when unscoped", async () => {
        const mounted = await mount();
        assert.isUndefined(mounted.layoutScope);

        mounted.layoutScope = { nodes: MEMBERS };
        await operationQueueOf(mounted.graph).waitForCompletion();
        assert.deepEqual(mounted.layoutScope, { nodes: MEMBERS });
        assert.deepEqual(holdDisagreements(mounted.graph, MEMBERS), []);

        mounted.layoutConfig = { springLength: 20 };
        await operationQueueOf(mounted.graph).waitForCompletion();
        assert.deepEqual(holdDisagreements(mounted.graph, MEMBERS), [], "a layoutConfig change keeps the hold");

        mounted.layoutScope = undefined;
        await operationQueueOf(mounted.graph).waitForCompletion();
        assert.isUndefined(mounted.layoutScope);
        assert.isNull(mounted.graph.getLayoutManager().layoutEngine?.holdMask ?? null);
    });

    it("reads the layout-scope attribute as JSON", async () => {
        const mounted = await mount({ "layout-scope": JSON.stringify({ nodes: MEMBERS }) });
        await operationQueueOf(mounted.graph).waitForCompletion();

        assert.deepEqual(mounted.layoutScope, { nodes: MEMBERS });
        assert.deepEqual(holdDisagreements(mounted.graph, MEMBERS), []);
    });

    it("never produces an unhandled rejection, whatever it is given", async () => {
        const mounted = await mount();

        mounted.setAttribute("layout-scope", "not json");
        mounted.layoutScope = { bogus: true } as never;
        mounted.layoutScope = { set: "never-issued" };
        mounted.layout = "circular";
        await operationQueueOf(mounted.graph).waitForCompletion();
        await new Promise((resolve) => {
            setTimeout(resolve, 0);
        });

        assert.deepEqual(rejections, []);
        assert.isNull(mounted.graph.getLayoutManager().layoutEngine?.holdMask ?? null);
    });
});
