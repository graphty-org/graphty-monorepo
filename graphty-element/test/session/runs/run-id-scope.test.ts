/**
 * @file A derived run id names a RESULT, hashed from the frozen scope (design/sets/sets-design.md
 * section 15.3, item 34). The same unscoped call under another filter is another result: it never
 * re-executes the first one over a different graph, so a style layer bound to the first keeps
 * painting from the graph the first one read. Parameters and the seed are not in the id.
 */

import { assert, describe, it } from "vitest";

import type { LayerSpec, NodeId, RunId } from "../../../src/catalog/types";
import type { RunExecutionContext, RunOutcome } from "../../../src/session/runs";
import { type Harness, makeSession } from "../helpers";
import { resultOf } from "../visibility/results";

const RED = "#ff0000";

/**
 * A metric that publishes 1 for every node of the scope it was given, and records each execution.
 * @returns The executor and the log of the scopes it ran over.
 */
function scopeEcho(): { execute: (context: RunExecutionContext) => Promise<RunOutcome>; ran: NodeId[][] } {
    const ran: NodeId[][] = [];
    const execute = (context: RunExecutionContext): Promise<RunOutcome> => {
        const nodes = [...context.scope.nodes].sort();
        ran.push(nodes);

        return Promise.resolve({
            result: resultOf(context.runId, { shape: "node-metric", nodes: new Map(nodes.map((id) => [id, { value: 1 }])) }),
        });
    };

    return { execute, ran };
}

/**
 * The path a-b-c-d-e, with the echoing executor.
 * @param execute - The executor.
 * @returns The harness.
 */
function harnessOf(execute: (context: RunExecutionContext) => Promise<RunOutcome>): Harness {
    const h = makeSession({ directed: false, runs: { execute } });
    h.add(
        ["a", "b", "c", "d", "e"].map((id) => ({ id })),
        ["ab", "bc", "cd", "de"].map(([src, dst]) => ({ src, dst })),
    );

    return h;
}

/**
 * A layer painting red every node a run published a value for.
 * @param run - The run id.
 * @returns The layer.
 */
function boundTo(run: RunId): LayerSpec {
    return { name: "Bound", selector: { match: "has", path: `results.${run}.value` }, set: { "node.color": RED } };
}

/**
 * Whether the stack paints a node red.
 * @param h - The harness.
 * @param id - The node.
 * @returns True when some layer paints it red.
 */
function red(h: Harness, id: NodeId): boolean {
    return h.session.styles.explain({ node: id }).merged["node.color"]?.hex === RED;
}

describe("a derived run id hashes the frozen scope", () => {
    it("makes the same unscoped call under two filters two results, and leaves a layer bound to the first painting from the first graph", async () => {
        const echo = scopeEcho();
        const h = harnessOf(echo.execute);

        await h.session.visibility.set({ kind: "member", of: { nodes: ["a", "b", "c"] } });
        const first = h.session.runs.start("degree", undefined, { style: false });
        await first;
        await h.session.styles.add(boundTo(first.id));
        const firstResult = first.result;

        await h.session.visibility.set({ kind: "member", of: { nodes: ["c", "d", "e"] } });
        const second = h.session.runs.start("degree", undefined, { style: false });
        await second;

        assert.notStrictEqual(second.id, first.id, "another filter is another result");
        assert.strictEqual(h.session.runs.list().length, 2);
        assert.deepStrictEqual(echo.ran, [["a", "b", "c"], ["c", "d", "e"]], "the first result was never re-executed");
        assert.strictEqual(first.result, firstResult);
        assert.deepStrictEqual([...first.scope.nodes].sort(), ["a", "b", "c"]);
        assert.deepStrictEqual(
            ["a", "b", "c", "d", "e"].map((id) => red(h, id)),
            [true, true, true, false, false],
            "the layer bound to the first result paints from the graph the first result read",
        );

        // Back under the first filter, the call answers the first result again, and nothing moved.
        await h.session.visibility.set({ kind: "member", of: { nodes: ["a", "b", "c"] } });
        const again = h.session.runs.start("degree", undefined, { style: false });
        await again;
        assert.strictEqual(again, first);
        assert.strictEqual(echo.ran.length, 2);
        h.session.dispose();
    });

    it("makes the same selection-scoped call over two selections two results", async () => {
        const echo = scopeEcho();
        const h = harnessOf(echo.execute);

        await h.session.selection.apply({ nodes: ["a", "b"] });
        const first = h.session.runs.start("degree", undefined, { scope: "selection", style: false });
        await first;
        await h.session.selection.apply({ nodes: ["d", "e"] });
        const second = h.session.runs.start("degree", undefined, { scope: "selection", style: false });
        await second;

        assert.notStrictEqual(second.id, first.id);
        assert.deepStrictEqual(echo.ran, [["a", "b"], ["d", "e"]]);
        h.session.dispose();
    });

    it("keeps the seed out of the id: a new seed re-runs the result a layer is bound to", async () => {
        const echo = scopeEcho();
        const h = harnessOf(echo.execute);

        const first = h.session.runs.start("degree", undefined, { scope: "graph", seed: 1, style: false });
        await first;
        const second = h.session.runs.start("degree", undefined, { scope: "graph", seed: 2, style: false });
        await second;

        assert.strictEqual(second, first, "one result, now holding the run with the new seed");
        assert.strictEqual(first.record.seed, 2);
        assert.strictEqual(echo.ran.length, 2);
        h.session.dispose();
    });
});
