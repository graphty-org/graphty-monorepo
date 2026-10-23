/**
 * @file `estimate` and `plan` for a layout choice: whether the layout can run on the graph as it
 * stands, why not, and roughly how long it takes, kept until the session's input tick moves.
 */

import { assert, describe, it, vi } from "vitest";

import { type Harness, loadGexfCorpus, makeSession } from "./helpers";

const layout = vi.hoisted(() => ({ planarCalls: 0 }));

vi.mock("@graphty/layout", async (importOriginal) => {
    const original = await importOriginal<typeof import("@graphty/layout")>();
    return {
        ...original,
        planar: (...args: Parameters<typeof original.planar>) => {
            layout.planarCalls++;
            return original.planar(...args);
        },
    };
});

/**
 * A session over the Les Miserables network: 77 nodes, 254 edges, not planar.
 * @returns The harness, loaded.
 */
async function lesMiserables(): Promise<Harness> {
    const harness = makeSession();
    await loadGexfCorpus(harness, "lesmiserables.gexf");
    return harness;
}

describe("estimating a layout choice", () => {
    it("refuses a planar layout on a graph with unavoidable crossings, with a reason", async () => {
        const { session } = await lesMiserables();
        const estimate = session.estimate({ op: "layout.set", id: "planar" });

        assert.isFalse(estimate.available);
        assert.match(estimate.reason ?? "", /crossings/);
        const plan = await session.plan({ op: "layout.set", id: "planar" });
        assert.isFalse(plan.ok);
        assert.strictEqual(plan.blocked?.reason, estimate.reason);
    });

    it("costs force in finite seconds", async () => {
        const { session } = await lesMiserables();
        const estimate = session.estimate({ op: "layout.set", id: "force" });

        assert.isTrue(estimate.available);
        assert.isTrue(Number.isFinite(estimate.seconds));
        assert.isAbove(estimate.seconds, 0);
        assert.strictEqual(estimate.costClass, "iterative");
    });

    it("needs a start node for a tree, and one the graph holds", async () => {
        const { session } = await lesMiserables();

        assert.isFalse(session.estimate({ op: "layout.set", id: "hierarchical" }).available);
        assert.isFalse(
            session.estimate({ op: "layout.set", id: "hierarchical", options: { start: "nobody" } }).available,
        );
        assert.isTrue(session.estimate({ op: "layout.set", id: "hierarchical", options: { start: "11.0" } }).available);
    });

    it("centres radial on the best-connected node when none is named, and refuses a named one that is absent", async () => {
        const { session } = await lesMiserables();

        assert.isTrue(session.estimate({ op: "layout.set", id: "radial" }).available);
        assert.isFalse(session.estimate({ op: "layout.set", id: "radial", options: { root: "nobody" } }).available);
    });

    it("needs a grouping for the grouping layouts, and exactly two groups for two columns", () => {
        const harness = makeSession();
        harness.add(
            [
                { id: "a", side: "left", tier: 1 },
                { id: "b", side: "right", tier: 2 },
                { id: "c", side: "left", tier: 3 },
            ],
            [{ src: "a", dst: "b" }],
        );
        const { session } = harness;

        for (const id of ["shell", "layers", "bipartite"]) {
            assert.match(session.estimate({ op: "layout.set", id }).reason ?? "", /needs groupBy/, id);
            assert.match(
                session.estimate({ op: "layout.set", id, options: { groupBy: "missing" } }).reason ?? "",
                /no node carries/,
                id,
            );
        }

        assert.isTrue(session.estimate({ op: "layout.set", id: "bipartite", options: { groupBy: "side" } }).available);
        assert.match(
            session.estimate({ op: "layout.set", id: "bipartite", options: { groupBy: "tier" } }).reason ?? "",
            /exactly two groups/,
        );
        assert.isTrue(session.estimate({ op: "layout.set", id: "shell", options: { groupBy: "tier" } }).available);
    });

    it("runs the planarity test once per change to the graph", async () => {
        const harness = await lesMiserables();
        const { session } = harness;
        layout.planarCalls = 0;

        session.estimate({ op: "layout.set", id: "planar" });
        session.estimate({ op: "layout.set", id: "planar" });
        session.estimate({ op: "layout.set", id: "planar", options: { scale: 2 } });
        assert.strictEqual(layout.planarCalls, 1);

        harness.add([{ id: "newcomer" }]);
        session.estimate({ op: "layout.set", id: "planar" });
        assert.strictEqual(layout.planarCalls, 2);
    });
});
