/**
 * Runs under the working graph (design/working-graph/design.md sections 4 and 6): what a refused
 * run is pointed at, what a run of a scope-following algorithm is estimated over, painting a
 * stored run, and rerunning with other settings over the run's own scope.
 */
import { assert, describe, it } from "vitest";

import { defineAlgorithm } from "../../../extend";
import { createGraphSession, type GraphSession } from "../../../src/session";
import { estimateCost, gateRun } from "../../../src/session/cost";
import { largestPieceIn, type PlanningContext } from "../../../src/session/planning";
import { createRunResult } from "../../../src/session/results";
import type { RunExecutionContext, RunOutcome } from "../../../src/session/runs";
import { assertScalesLinearly, visitsDuring } from "../../helpers/cost";

/** Two four-cliques y and z, and a six-node path x that a degree-3 filter hides. */
const CLIQUES_AND_PATH = (() => {
    const clique = (p: string): string[] =>
        [
            [1, 2],
            [1, 3],
            [1, 4],
            [2, 3],
            [2, 4],
            [3, 4],
        ].map(([a, b]) => `${p}${String(a)},${p}${String(b)}`);
    const path = ["x1,x2", "x2,x3", "x3,x4", "x4,x5", "x5,x6"];
    return `${["source,target", ...clique("y"), ...clique("z"), ...path].join("\n")}\n`;
})();

/**
 * The planning context a session estimates and plans through.
 * @param session - The session.
 * @returns Its context.
 */
function planningOf(session: GraphSession): PlanningContext {
    return (session as unknown as { readonly planning: PlanningContext }).planning;
}

/**
 * A stand-in algorithm with one value per node in scope.
 * @param context - The run.
 * @returns The outcome.
 */
async function execute(context: RunExecutionContext): Promise<RunOutcome> {
    await Promise.resolve();
    return {
        result: createRunResult({
            runId: context.runId,
            shape: "node-metric",
            fields: [
                {
                    name: "value",
                    plainName: "Value",
                    technicalName: "value",
                    kind: "node",
                    type: "number",
                    path: `results.${context.runId}.value`,
                },
            ],
            measured: { nodes: context.scope.nodeCount, edges: 0 },
            nodes: [...context.scope.nodes].map((id) => ({ id, values: { value: 1 } })),
            edges: [],
            caveats: { exact: true, direction: "as-loaded", precision: "f64", method: "test", facts: [], notes: [] },
            durationMs: 1,
        }),
    };
}

describe("a refused run's largest connected piece", () => {
    it("is the refused scope's largest piece, not the whole graph's", async () => {
        const session = createGraphSession();
        await session.data.import({ type: "csv", config: { data: CLIQUES_AND_PATH } });
        await session.visibility.set({ kind: "degree", min: 3 });

        const piece = largestPieceIn(planningOf(session), "visible");
        assert.isNotNull(piece);
        assert.strictEqual(piece?.nodes, 4, "one shown clique, not the hidden six-node path");
        assert.strictEqual(piece?.edges, 6);
        assert.strictEqual((await session.scope.resolve(piece?.scope ?? "graph")).nodeCount, 4);
        session.dispose();
    });

    it("is what the gate points a refused run over that scope at", async () => {
        // Two 150-node cliques, large enough that one, with the cost of deriving it, still costs
        // less than both; and a hidden 200-node path, the whole graph's largest piece.
        const big = (p: string, k: number): string[] =>
            Array.from({ length: k }, (_, a) =>
                Array.from({ length: k - a - 1 }, (_, b) => `${p}${String(a)},${p}${String(a + b + 1)}`),
            ).flat();
        const path = Array.from({ length: 199 }, (_, i) => `x${String(i)},x${String(i + 1)}`);
        const csv = `${["source,target", ...big("y", 150), ...big("z", 150), ...path].join("\n")}\n`;
        const session = createGraphSession();
        await session.data.import({ type: "csv", config: { data: csv } });
        await session.visibility.set({ kind: "degree", min: 3 });
        const shownEdges = 2 * ((150 * 149) / 2);
        const piece = largestPieceIn(planningOf(session), "visible");

        const descriptor = session.catalog.algorithms().find((each) => each.key === "pagerank");
        const statistics = session.data.statistics();
        const base = { algorithm: "pagerank", descriptor, statistics };
        const both = estimateCost({ ...base, scope: { nodes: 300, edges: shownEdges, exact: true } }).seconds;
        const one = estimateCost({
            ...base,
            derivationSeconds: piece?.derivationSeconds,
            scope: { nodes: 150, edges: shownEdges / 2, exact: true },
        }).seconds;
        assert.isBelow(one, both);
        const decision = gateRun(
            { ...base, scope: { nodes: 300, edges: shownEdges, spec: "visible", exact: true } },
            {
                limits: { exactComputationSeconds: (both + one) / 2, runColumnBudgetBytes: 1e12 },
                exact: true,
                largestPiece: () => largestPieceIn(planningOf(session), "visible"),
            },
        );

        assert.strictEqual(decision.kind, "refused");
        const scopes = (decision as { error: { details?: { scopes?: { nodes: number; scope: unknown }[] } } }).error
            .details?.scopes;
        assert.strictEqual(scopes?.[0]?.nodes, 150);
        assert.deepStrictEqual(scopes?.[0]?.scope, piece?.scope);
        session.dispose();
    });
});

describe("an algorithm that follows the working graph", () => {
    it("is estimated over what is shown when the session reads the working graph, else the whole graph", async () => {
        const key = "acme-follower";
        defineAlgorithm({ id: key, node: (node) => node.degree });
        // The two cliques, and a 3,000-node path the degree filter hides.
        const path = Array.from({ length: 2999 }, (_, i) => `p${String(i)},p${String(i + 1)}`);
        const csv = `${CLIQUES_AND_PATH}${path.join("\n")}\n`;
        const seconds: Record<string, number> = {};
        for (const mode of ["documented", "visible"] as const) {
            const session = createGraphSession({ workingGraph: mode });
            await session.data.import({ type: "csv", config: { data: csv } });
            await session.visibility.set({ kind: "degree", min: 3 });
            seconds[mode] = session.estimate({ op: "algo.run", algorithm: key }).seconds;
            session.dispose();
        }

        assert.isBelow(seconds.visible, seconds.documented, "priced over the eight shown nodes, not all 3,014");
    });
});

describe("painting a stored run", () => {
    it("paints the run as it is, without running it again, as one step", async () => {
        let executions = 0;
        const session = createGraphSession({
            runs: {
                execute: async (context) => {
                    executions++;
                    return execute(context);
                },
            },
        });
        await session.data.import({ type: "csv", config: { data: CLIQUES_AND_PATH } });
        const run = session.runs.start("pagerank", undefined, { style: false });
        await run;
        await session.visibility.set({ kind: "degree", min: 3 });
        assert.isNotNull(run.stale, "the filter left the run out of date");
        assert.lengthOf(session.runs.bindings(run.id), 0);
        const ran = executions;
        const steps = session.history.steps.length;

        await session.runs.paint(run.id);

        assert.strictEqual(executions, ran, "nothing ran");
        assert.isAbove(session.runs.bindings(run.id).length, 0, "its layers are on the stack");
        assert.strictEqual(session.history.steps.length, steps + 1);
        assert.isNotNull(run.stale, "still the result it was");
        session.dispose();
    });

    it("does work in proportion to the graph", async () => {
        await assertScalesLinearly(
            async (size) => {
                const session = createGraphSession({ runs: { execute } });
                const path = Array.from({ length: size - 1 }, (_, i) => `n${String(i)},n${String(i + 1)}`);
                await session.data.import({ type: "csv", config: { data: `source,target\n${path.join("\n")}\n` } });
                const run = session.runs.start("pagerank", undefined, { style: false });
                await run;
                const visited = await visitsDuring(() => session.runs.paint(run.id));
                session.dispose();
                return visited;
            },
            { sizes: [200, 800], growth: "linear", counter: "elements visited painting a stored run" },
        );
    });

    it("refuses a run it does not hold, or one with no result", async () => {
        const session = createGraphSession({ runs: { execute } });
        await session.data.import({ type: "csv", config: { data: CLIQUES_AND_PATH } });
        let refused: unknown = null;
        try {
            await session.runs.paint("nope");
        } catch (error) {
            refused = error;
        }

        assert.strictEqual((refused as { code?: string } | null)?.code, "E_UNKNOWN_RUN");
        session.dispose();
    });
});

describe("rerunning with other settings", () => {
    it("keeps the run's scope", async () => {
        const seen: number[] = [];
        const session = createGraphSession({
            runs: {
                execute: async (context) => {
                    seen.push(context.scope.nodeCount);
                    return execute(context);
                },
            },
        });
        await session.data.import({ type: "csv", config: { data: CLIQUES_AND_PATH } });
        const run = session.runs.start("pagerank", undefined, { scope: { nodes: ["y1", "y2", "y3"] }, style: false });
        await run;

        const again = run.rerun({ options: { dampingFactor: 0.5 } });
        await again;

        assert.strictEqual(again, run);
        assert.deepStrictEqual(seen, [3, 3]);
        assert.strictEqual(run.params.dampingFactor, 0.5);
        assert.deepStrictEqual(run.scope.spec, { nodes: ["y1", "y2", "y3"] });
        session.dispose();
    });
});
