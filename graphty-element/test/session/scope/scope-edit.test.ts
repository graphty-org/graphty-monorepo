/**
 * @file `session.scope.edit()` and the selections a run removal leaves waiting: a selection
 * editor's Done keeps the runs its final steps read and drops the rest, its Cancel drops every
 * run it started, and removing a run a selection reads names that selection and never re-runs it.
 * Counted work: every execution of the fake executor is counted, and Done and Cancel visit no more
 * per run they remove as the graph grows.
 */

import { assert, describe, it } from "vitest";

import type { StepsReading } from "../../../session";
import type { RuleTree, UnionLeaf } from "../../../src/catalog/types";
import { createGraphSession, type GraphSession } from "../../../src/session";
import { createRunResult } from "../../../src/session/results";
import type { RunExecutionContext, RunOutcome } from "../../../src/session/runs";
import { assertScalesLinearly, visitsDuring } from "../../helpers/cost";

const IDS = ["a", "b", "c", "d", "e"];

/**
 * A session over a path a-b-c-d-e (or of `size` nodes) whose executor gives every node the value 1,
 * counting runs.
 * @param size - How many nodes; the five named ones by default.
 * @returns The session and the executions so far, by algorithm.
 */
async function pathSession(size?: number): Promise<{ session: GraphSession; executions: string[] }> {
    const ids = size === undefined ? IDS : Array.from({ length: size }, (_, at) => `n${String(at)}`);
    const executions: string[] = [];
    const execute = (context: RunExecutionContext): Promise<RunOutcome> => {
        executions.push(context.algorithm);
        return Promise.resolve({
            result: createRunResult({
                runId: context.runId,
                measured: { nodes: context.scope.nodeCount, edges: 0 },
                caveats: {
                    exact: true,
                    direction: "as-loaded",
                    precision: "f64",
                    method: context.algorithm,
                    facts: [],
                    notes: [],
                },
                durationMs: 1,
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
                nodes: [...context.scope.nodes].map((id) => ({ id, values: { value: 1 } })),
            }),
        });
    };
    const session = createGraphSession({ runs: { execute } });
    await session.data.addNodes(ids.map((id) => ({ id })));
    await session.data.addEdges(ids.slice(1).map((id, at) => ({ source: ids[at], target: id })));
    return { session, executions };
}

/**
 * A one-step selection keeping the nodes whose value from an algorithm is at least 1.
 * @param algorithm - The algorithm the step measures.
 * @returns The rule.
 */
function measuring(algorithm: string): UnionLeaf {
    const step: RuleTree = { kind: "measure", algorithm, field: "value", test: { kind: "range", min: 1, max: 1 } };
    return {
        kind: "union",
        side: "nodes",
        within: "graph",
        branches: [{ start: "all", steps: [{ op: "keep", rule: step }] }],
    };
}

/**
 * Watch a rule until its step reads a finished run.
 * @param session - The session.
 * @param rule - The rule.
 * @returns The run id the step reads.
 */
function readRun(session: GraphSession, rule: UnionLeaf): Promise<string> {
    const ran = (reading: StepsReading): string | null => {
        const [step] = reading.branches[0].steps;
        return reading.branches[0].state === "ready" ? step.run : null;
    };
    return new Promise((resolve) => {
        const watch = session.scope.watchSteps(rule, (reading) => {
            const run = ran(reading);
            if (run !== null) {
                watch.end();
                resolve(run);
            }
        });
        // A run that already answers the step is read at once, with no change to hear.
        const now = ran(watch.current);
        if (now !== null) {
            watch.end();
            resolve(now);
        }
    });
}

describe("scope.edit", () => {
    it("Cancel removes every run the visit started and keeps the runs that were there before", async () => {
        const { session, executions } = await pathSession();
        const before = session.runs.start("closeness", {}, { scope: "graph", style: false });
        await before;
        const edit = session.scope.edit();
        const started = await readRun(session, measuring("degree"));
        assert.deepEqual(edit.started, [started]);
        await edit.discard();
        assert.deepEqual(
            session.runs.list().map((run) => run.id),
            [before.id],
        );
        assert.deepEqual(executions, ["closeness", "degree"]);
    });

    it("Done keeps the run a selection reads as an ordinary run and drops the one a settings change left", async () => {
        const { session, executions } = await pathSession();
        const edit = session.scope.edit();
        // The reader tried PageRank first, then settled on degree.
        const dropped = await readRun(session, measuring("pagerank"));
        const kept = await readRun(session, measuring("degree"));
        const layer = await session.styles.add({
            name: "Layer 1",
            target: "node",
            selector: { match: "rule", where: measuring("degree") },
            set: { "node.color": "#d55e00" },
        });
        await edit.commit();
        assert.deepEqual(
            session.runs.list().map((run) => run.id),
            [kept],
        );
        assert.notStrictEqual(dropped, kept);
        assert.deepEqual(session.runs.readers(kept), [{ kind: "layer", id: layer.id }]);
        assert.deepEqual(executions, ["pagerank", "degree"]);
    });

    it("Cancel keeps the reader's run when a step in the visit changed a setting its name does not carry", async () => {
        const { session } = await pathSession();
        const before = session.runs.start("louvain", {}, { scope: "graph", style: false });
        await before;
        const edit = session.scope.edit();
        const rule = measuring("louvain");
        const step = rule.branches[0].steps[0].rule as Extract<RuleTree, { kind: "measure" }>;
        const tuned: UnionLeaf = {
            ...rule,
            branches: [{ start: "all", steps: [{ op: "keep", rule: { ...step, params: { maxIterations: 1 } } }] }],
        };
        const started = await readRun(session, tuned);
        assert.notStrictEqual(started, before.id);
        await edit.discard();
        assert.deepEqual(
            session.runs.list().map((run) => [run.id, JSON.stringify(run.params)]),
            [[before.id, JSON.stringify(before.params)]],
        );
    });

    it("a run the visit did not start is never removed, even when nothing reads it", async () => {
        const { session } = await pathSession();
        const analyze = session.runs.start("degree", {}, { scope: "graph", style: false });
        await analyze;
        const edit = session.scope.edit();
        // The card reuses the run Analyze made: one run per algorithm, settings and scope.
        assert.strictEqual(await readRun(session, measuring("degree")), analyze.id);
        assert.deepEqual(edit.started, []);
        await edit.commit();
        assert.deepEqual(
            session.runs.list().map((run) => run.id),
            [analyze.id],
        );
    });
});

describe("runs.readers and RunRemoval.selections", () => {
    it("names the layer and the filter whose steps read a run, and the removal leaves them waiting", async () => {
        const { session, executions } = await pathSession();
        const rule = measuring("degree");
        const run = await readRun(session, rule);
        const layer = await session.styles.add({
            name: "Layer 1",
            target: "node",
            selector: { match: "rule", where: rule },
            set: { "node.color": "#d55e00" },
        });
        await session.visibility.addCondition({ id: "f1", effect: "keep", rule });
        assert.deepEqual(session.runs.readers(run), [
            { kind: "layer", id: layer.id },
            { kind: "filter", id: "f1" },
        ]);
        const removal = session.runs.remove(run);
        assert.deepEqual(removal.selections, [
            { kind: "layer", id: layer.id },
            { kind: "filter", id: "f1" },
        ]);
        assert.strictEqual(removal.removedLayers, 0, "a layer that reads the run in its selector stays");
        // The selection waits: never re-run unasked.
        const watch = session.scope.watchSteps(rule, () => undefined);
        assert.strictEqual(watch.current.branches[0].steps[0].reason?.code, "run-needed");
        watch.end();
        assert.deepEqual(executions, ["degree"]);
        assert.deepEqual(session.runs.list(), []);
    });
});

describe("scope.edit counted work", () => {
    it("Cancel visits about as much per removed run on a 4x larger graph as the run's own results", async () => {
        await assertScalesLinearly(
            async (size) => {
                const { session } = await pathSession(size);
                const edit = session.scope.edit();
                await readRun(session, measuring("degree"));
                await readRun(session, measuring("pagerank"));
                const visits = await visitsDuring(() => edit.discard());
                assert.deepEqual(session.runs.list(), [], "both runs removed");
                return visits;
            },
            { sizes: [200, 800], counter: "elements visited by discard()" },
        );
    });

    it("Done visits no more than linearly in the graph to keep one run and drop another", async () => {
        await assertScalesLinearly(
            async (size) => {
                const { session } = await pathSession(size);
                const edit = session.scope.edit();
                await readRun(session, measuring("pagerank"));
                const kept = await readRun(session, measuring("degree"));
                await session.styles.add({
                    name: "Layer 1",
                    target: "node",
                    selector: { match: "rule", where: measuring("degree") },
                    set: { "node.color": "#d55e00" },
                });
                const visits = await visitsDuring(() => edit.commit());
                assert.deepEqual(
                    session.runs.list().map((run) => run.id),
                    [kept],
                );
                return visits;
            },
            { sizes: [200, 800], counter: "elements visited by commit()" },
        );
    });
});
