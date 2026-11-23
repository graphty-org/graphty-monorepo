/**
 * @file The runs a selection's `measure` step reads, at their corners: node options bound to the
 * selection (empty, more than one node for a one-node option), a step's own computation over only
 * the links that pass its `links` rule, a computation or a session run that fails, a run canceled
 * outside the step, Cancel and Run on a step's own computation, and a touching step on Hovered or
 * selected under the live limit. Each test reads `session.scope.watchSteps` and counts what the
 * consumer executor ran.
 */

import { assert, describe, it } from "vitest";

import type { StepsReading } from "../../../session";
import type { RuleTree, UnionLeaf, UnionStep } from "../../../src/catalog/types";
import { createGraphSession, type GraphSession } from "../../../src/session";
import { createRunResult } from "../../../src/session/results";
import type { RunExecutionContext, RunOutcome } from "../../../src/session/runs";

/** A path a-b-c-d-e plus a heavy edge a-e, so `links` can leave the heavy one out. */
const NODES = ["a", "b", "c", "d", "e"];
const EDGES = [
    { source: "a", target: "b", weight: 1 },
    { source: "b", target: "c", weight: 1 },
    { source: "c", target: "d", weight: 1 },
    { source: "d", target: "e", weight: 1 },
    { source: "a", target: "e", weight: 9 },
];

/** What the consumer executor saw: one entry per execution. */
interface Executions {
    readonly calls: { algorithm: string; nodes: number; edges: number; params: Record<string, unknown> }[];
    /** When set, every execution waits for `release`. */
    hold: boolean;
    release?: () => void;
    /** When set, every execution rejects with this code. */
    failWith?: string;
}

/**
 * An executor that publishes each node's degree inside the run's scope as `value`, counting
 * every execution.
 * @param executions - Where executions are counted.
 * @returns The executor.
 */
function counting(executions: Executions) {
    return async (context: RunExecutionContext): Promise<RunOutcome> => {
        executions.calls.push({
            algorithm: context.algorithm,
            nodes: context.scope.nodeCount,
            edges: context.scope.edgeCount,
            params: { ...context.params },
        });
        if (executions.hold) {
            await new Promise<void>((resolve) => {
                executions.release = resolve;
            });
        }

        if (executions.failWith !== undefined) {
            throw Object.assign(new Error("refused"), { code: executions.failWith });
        }

        const inside = context.scope.nodes;
        return {
            result: createRunResult({
                runId: context.runId,
                measured: { nodes: inside.size, edges: context.scope.edgeCount },
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
                nodes: [...inside].map((id, at) => ({ id, values: { value: at } })),
            }),
        };
    };
}

/**
 * The five-node graph on a session with the counting executor.
 * @param executions - Where executions are counted.
 * @returns The session.
 */
async function ring(executions: Executions): Promise<GraphSession> {
    const session = createGraphSession({ runs: { execute: counting(executions) } });
    await session.data.addNodes(NODES.map((id) => ({ id })));
    await session.data.addEdges(EDGES);
    return session;
}

/**
 * A node union of one branch from None adding one step.
 * @param step - The step.
 * @returns The leaf.
 */
function adding(step: UnionStep): UnionLeaf {
    return { kind: "union", side: "nodes", within: "graph", branches: [{ start: "none", steps: [step] }] };
}

/**
 * The first reading after `act` whose first step passes `until`.
 * @param session - The session.
 * @param rule - The rule watched.
 * @param until - What the reading waits for.
 * @param act - What to do once watching.
 * @returns The reading.
 */
async function readingWhen(
    session: GraphSession,
    rule: RuleTree,
    until: (reading: StepsReading) => boolean,
    act: () => unknown = () => undefined,
): Promise<StepsReading> {
    let watch: { end(): void; readonly current: StepsReading } | undefined;
    const heard = new Promise<StepsReading>((resolve) => {
        watch = session.scope.watchSteps(rule, (reading) => {
            if (until(reading)) {
                resolve(reading);
            }
        });
    });
    await act();
    const now = watch?.current;
    const reading = now !== undefined && until(now) ? now : await heard;
    watch?.end();
    return reading;
}

const reasonIs =
    (code: string) =>
    (reading: StepsReading): boolean =>
        reading.branches[0].steps[0].reason?.code === code;

/** A bfs from the selected node, every node it reaches passing. */
const BFS_FROM_SELECTION: UnionStep = {
    op: "add",
    rule: { kind: "measure", algorithm: "bfs", field: "value", bind: { source: "selection" } },
};

describe("a measure step's bound options", () => {
    it("with nothing selected the step is empty, naming the option it could not bind", async () => {
        const executions: Executions = { calls: [], hold: false };
        const session = await ring(executions);
        const step = session.scope.watchSteps(adding(BFS_FROM_SELECTION), () => undefined).current.branches[0].steps[0];
        assert.strictEqual(step.state, "applied", "an empty reference adds nothing; the step itself applies");
        assert.deepEqual(step.reason, { code: "reference-empty", params: { option: "source" } });
        assert.strictEqual(step.count, 0);
        assert.deepEqual(executions.calls, [], "nothing to run from");
        session.dispose();
    });

    it("with two nodes selected a one-node option is inert, and nothing runs", async () => {
        const executions: Executions = { calls: [], hold: false };
        const session = await ring(executions);
        await session.selection.apply({ nodes: ["a", "c"] });
        const step = session.scope.watchSteps(adding(BFS_FROM_SELECTION), () => undefined).current.branches[0].steps[0];
        assert.strictEqual(step.state, "inert");
        assert.deepEqual(step.reason, { code: "one-node-only", params: { option: "source" } });
        assert.deepEqual(executions.calls, []);
        session.dispose();
    });

    it("with one node selected the step's own computation runs from it, and its members arrive", async () => {
        const executions: Executions = { calls: [], hold: false };
        const session = await ring(executions);
        await session.selection.apply({ nodes: ["c"] });
        const reading = await readingWhen(session, adding(BFS_FROM_SELECTION), (each) => each.total.count > 0);
        assert.strictEqual(reading.total.count, NODES.length, "every measured node passes an untested measure");
        assert.deepEqual(
            executions.calls.map((call) => [call.algorithm, call.params.source]),
            [["bfs", "c"]],
        );
        assert.lengthOf(session.runs.list(), 0, "a step's own computation is never a session run");
        session.dispose();
    });
});

describe("a measure step's own computation", () => {
    it("with links reads only the edges that pass them, over the graph and over what is visible", async () => {
        const executions: Executions = { calls: [], hold: false };
        const session = await ring(executions);
        const light: RuleTree = { kind: "range", attribute: "data.weight", max: 2 };
        const step: UnionStep = {
            op: "add",
            rule: { kind: "measure", algorithm: "degree", field: "value" },
            links: light,
        };
        await readingWhen(session, adding(step), (each) => each.total.count > 0);
        assert.deepEqual(
            executions.calls.map((call) => call.edges),
            [4],
            "the heavy edge does not pass the links rule",
        );

        await session.visibility.addCondition({ effect: "exclude", rule: { kind: "member", of: { nodes: ["e"] } } });
        const visible: UnionLeaf = { ...adding(step), within: "visible" };
        await readingWhen(session, visible, (each) => each.total.count > 0);
        assert.deepEqual(
            executions.calls.slice(1).map((call) => [call.nodes, call.edges]),
            [[4, 3]],
            "the visible base leaves e and its two edges out; links leave none of the rest out",
        );
        session.dispose();
    });

    it("that fails waits with run-failed and the error's code", async () => {
        const executions: Executions = { calls: [], hold: false, failWith: "E_STEP_BROKE" };
        const session = await ring(executions);
        const step: UnionStep = {
            op: "keep",
            rule: { kind: "measure", algorithm: "degree", field: "value" },
            computedOn: "so-far",
        };
        const leaf: UnionLeaf = {
            kind: "union",
            side: "nodes",
            within: "graph",
            branches: [{ start: "all", steps: [step] }],
        };
        const reading = await readingWhen(session, leaf, reasonIs("run-failed"));
        assert.strictEqual(reading.branches[0].steps[0].state, "pending");
        assert.deepEqual(reading.branches[0].steps[0].reason?.params, { error: "E_STEP_BROKE" });
        assert.lengthOf(executions.calls, 1, "a failed computation is not retried by reading it again");
        session.scope.watchSteps(leaf, () => undefined).end();
        assert.lengthOf(executions.calls, 1);
        session.dispose();
    });

    it("Cancel stops it and leaves it waiting for Run; Run starts it again", async () => {
        const executions: Executions = { calls: [], hold: true };
        const session = await ring(executions);
        const step: UnionStep = {
            id: "s1",
            op: "keep",
            rule: { kind: "measure", algorithm: "degree", field: "value" },
            computedOn: "so-far",
        };
        const leaf: UnionLeaf = {
            kind: "union",
            side: "nodes",
            within: "graph",
            branches: [{ id: "b1", start: "all", steps: [step] }],
        };
        const { rule } = session.scope.watchSteps(leaf, () => undefined).current;
        const computing = session.scope.watchSteps(rule, () => undefined).current;
        assert.strictEqual(computing.branches[0].steps[0].reason?.code, "computing");
        assert.lengthOf(executions.calls, 1);

        const canceled = await readingWhen(session, rule, reasonIs("run-needed"), () => {
            session.scope.cancelRun(rule, "s1");
        });
        assert.deepEqual(Object.keys(canceled.branches[0].steps[0].reason?.params ?? {}), ["estimateMs"]);
        assert.lengthOf(executions.calls, 1, "a canceled computation does not start again unasked");

        executions.hold = false;
        const done = await readingWhen(
            session,
            rule,
            (each) => each.branches[0].steps[0].state === "applied" && each.total.count > 0,
            () => {
                session.scope.allowRun(rule, "s1");
            },
        );
        assert.strictEqual(done.total.count, NODES.length);
        assert.lengthOf(executions.calls, 2, "Run starts it once more");
        session.dispose();
    });
});

describe("a measure step's session run", () => {
    it("that fails waits with run-failed and the run's error code", async () => {
        const executions: Executions = { calls: [], hold: false, failWith: "E_BASE_BROKE" };
        const session = await ring(executions);
        const step: UnionStep = { op: "add", rule: { kind: "measure", algorithm: "degree", field: "value" } };
        const reading = await readingWhen(session, adding(step), reasonIs("run-failed"));
        const [run] = session.runs.list();
        assert.strictEqual(run.status, "failed");
        assert.deepEqual(reading.branches[0].steps[0].reason?.params, { error: run.error?.code ?? null });
        session.dispose();
    });

    it("canceled outside the step is never restarted unasked: the step waits for Run", async () => {
        const executions: Executions = { calls: [], hold: true };
        const session = await ring(executions);
        const step: UnionStep = { id: "s1", op: "add", rule: { kind: "measure", algorithm: "degree", field: "value" } };
        const { rule } = session.scope.watchSteps(adding(step), () => undefined).current;
        await readingWhen(session, rule, () => session.runs.list().length === 1);
        const [run] = session.runs.list();
        const waiting = await readingWhen(session, rule, reasonIs("run-needed"), () => {
            session.runs.get(run.id)?.cancel();
        });
        assert.strictEqual(waiting.branches[0].steps[0].state, "pending");
        assert.lengthOf(executions.calls, 1, "no second run started");

        executions.hold = false;
        await readingWhen(
            session,
            rule,
            (each) => each.branches[0].steps[0].state === "applied" && each.total.count > 0,
            () => {
                session.scope.allowRun(rule, "s1");
            },
        );
        assert.lengthOf(executions.calls, 2, "Run starts one more");
        session.dispose();
    });
});

describe("a touching step on Hovered or selected", () => {
    it("waits, run-paused, over the live limit while the pointer is on a node", async () => {
        const session = await ring({ calls: [], hold: false });
        session.scope.setOptions({ liveMs: 0 });
        const touching: UnionLeaf = {
            kind: "union",
            side: "edges",
            within: "graph",
            branches: [
                {
                    start: "none",
                    steps: [{ op: "add", rule: { kind: "touching", of: "hovered-or-selected", ends: "either" } }],
                },
            ],
        };
        session.selection.hover("a");
        const step = session.scope.watchSteps(touching, () => undefined).current.branches[0].steps[0];
        assert.strictEqual(step.reason?.code, "run-paused");
        // One walk over the base's 5 nodes and 5 edges, at one microsecond each.
        assert.closeTo(Number(step.reason?.params.estimateMs), 0.01, 1e-9);
        session.dispose();
    });
});
