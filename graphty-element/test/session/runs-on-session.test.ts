import { assert, describe, it } from "vitest";

import type { GraphStore } from "../../src/data/GraphStore";
import { isGraphtyError } from "../../src/errors";
import { createRunResult } from "../../src/session/results";
import type { RunChange, RunExecutionContext, RunOutcome } from "../../src/session/runs";
import { type Harness, makeSession } from "./helpers";

/** An executor a test can hold, plus the store it measures once the harness exists. */
interface Runner {
    /** The executor to hand the session. */
    execute: (context: RunExecutionContext) => Promise<RunOutcome>;
    /** What the session was asked to run, in order. */
    calls: RunExecutionContext[];
    /** The store to measure. Assigned once the harness the executor belongs to exists. */
    store: GraphStore | null;
}

/**
 * An executor that publishes a degree-shaped result for the graph it is pointed at.
 *
 * It is the element's executor in miniature: it is handed a run id, it returns a result object,
 * and it writes nothing anywhere. A session with no renderer has no algorithm of its own to
 * call, which is exactly why the executor is a parameter rather than something the session finds.
 * @returns The runner.
 */
function degreeExecutor(): Runner {
    const runner: Runner = {
        calls: [],
        store: null,
        execute: async (context) => {
            runner.calls.push(context);
            context.report({ phase: "measuring", completed: 1, total: 2 });
            await Promise.resolve();

            const { store } = runner;

            if (store === null) {
                throw new Error("the runner was never pointed at a store");
            }

            const snapshot = store.getSnapshot();
            const degrees = snapshot.degree();
            const nodes = [];

            for (let index = 0; index < snapshot.nodeCount; index++) {
                nodes.push({ id: snapshot.ids.idOf(index), values: { value: degrees[index] } });
            }

            return {
                result: createRunResult({
                    runId: context.runId,
                    shape: "node-metric",
                    fields: [
                        {
                            name: "value",
                            plainName: "Connections",
                            technicalName: "degree",
                            kind: "node",
                            type: "number",
                            path: `results.${context.runId}.value`,
                        },
                    ],
                    measured: { nodes: snapshot.nodeCount, edges: snapshot.edgeCount },
                    graph: { normalization: "none" },
                    nodes,
                    caveats: {
                        exact: true,
                        direction: "as-loaded",
                        precision: "f64",
                        method: "degree",
                        notes: [],
                    },
                    durationMs: 1,
                }),
            };
        },
    };

    return runner;
}

/**
 * A session whose runs are answered by {@link degreeExecutor}.
 * @returns The harness and the runner behind it.
 */
function withRunner(): { harness: Harness; runner: Runner } {
    const runner = degreeExecutor();
    const harness = makeSession({ runs: { execute: runner.execute } });
    runner.store = harness.store;

    return { harness, runner };
}

describe("runs on the session", () => {
    it("refuses to run anything when nothing handed the session an executor", async () => {
        // The honest answer for a headless session: every algorithm this package ships is built
        // from the renderer, so a session with no element behind it genuinely cannot run one.
        const harness = makeSession();
        harness.add([{ id: "a" }, { id: "b" }], [{ src: "a", dst: "b" }]);

        const run = harness.session.runs.start("degree");

        try {
            await run;
            assert.fail("a session with no executor must not resolve a run");
        } catch (error) {
            assert.isTrue(isGraphtyError(error), "the refusal carries a code");
            assert.strictEqual(isGraphtyError(error) ? error.code : null, "E_UNSUPPORTED");
        }

        assert.strictEqual(run.status, "failed");
        harness.session.dispose();
    });

    it("starts a run, resolves to the result, and publishes it under the run's own path", async () => {
        const { harness } = withRunner();
        harness.add([{ id: "a" }, { id: "b" }, { id: "c" }], [{ src: "a", dst: "b" }, { src: "b", dst: "c" }]);

        const run = harness.session.runs.start("degree", undefined, { as: "degree" });
        const result = await run;

        assert.strictEqual(run.id, "degree");
        assert.strictEqual(run.status, "succeeded");
        assert.strictEqual(harness.session.results.path(run), "results.degree.value");
        assert.strictEqual(harness.session.results.get("degree"), result);
        assert.isTrue(harness.session.results.has(run, "value"));
        assert.deepStrictEqual(
            harness.session.results.roots.map((root) => root.runId),
            ["degree"],
        );
        assert.strictEqual(result.node("b")?.value, 2, "b sits between a and c");
        assert.strictEqual(result.summary().top[0].id, "b", "the summary ranks without anyone asking");
        harness.session.dispose();
    });

    it("hands the same run back for the same question rather than starting a second one", async () => {
        const { harness, runner } = withRunner();
        harness.add([{ id: "a" }, { id: "b" }]);

        const first = harness.session.runs.start("degree");
        await first;
        const second = harness.session.runs.start("degree");
        await second;

        assert.strictEqual(second, first, "one question, one run");
        assert.strictEqual(harness.session.runs.list().length, 1);
        assert.strictEqual(runner.calls.length, 1, "and the work was not redone under an unchanged graph");
        harness.session.dispose();
    });

    it("tells a watcher about every run, whoever started it", async () => {
        const { harness } = withRunner();
        harness.add([{ id: "a" }, { id: "b" }], [{ src: "a", dst: "b" }]);

        const seen: RunChange[] = [];
        const off = harness.session.on("run:changed", (change) => {
            seen.push(change);
        });

        await harness.session.runs.start("degree", undefined, { as: "degree" });

        const phases = seen.map((change) => change.phase);
        assert.strictEqual(phases[0], "queued", "a watcher hears about a run before it starts");
        assert.strictEqual(phases[1], "start");
        assert.include(phases, "progress");
        assert.strictEqual(phases[phases.length - 1], "end");
        assert.strictEqual(seen[0].run.id, "degree", "the record travels, not the run object");
        assert.strictEqual(seen[seen.length - 1].run.status, "succeeded");
        assert.isUndefined(
            (seen[0].run as unknown as { cancel?: unknown }).cancel,
            "a record is data: nothing on it can start or stop work",
        );

        off();
        seen.length = 0;
        await harness.session.runs.start("degree", undefined, { as: "again" });
        assert.strictEqual(seen.length, 0, "unsubscribing stops the telling");
        harness.session.dispose();
    });

    it("runs a command, and estimates the same one synchronously", () => {
        const { harness } = withRunner();
        harness.add([{ id: "a" }, { id: "b" }], [{ src: "a", dst: "b" }]);

        const command = { op: "algo.run", algorithm: "degree", as: "degree" } as const;
        const estimate = harness.session.estimate(command);

        assert.isTrue(estimate.available);
        assert.isBelow(estimate.seconds, 1, "counting two degrees is not slow");
        assert.include(estimate.basis, "n=2");
        assert.strictEqual(harness.session.run(command).id, "degree");
        harness.session.dispose();
    });

    it("plans a command: what it would write, and whether it would be allowed", async () => {
        const { harness } = withRunner();
        harness.add([{ id: "a" }, { id: "b" }], [{ src: "a", dst: "b" }]);

        const plan = await harness.session.plan({ op: "algo.run", algorithm: "degree" });

        assert.isTrue(plan.ok);
        assert.isUndefined(plan.blocked);
        assert.strictEqual(plan.effect.kind, "write");
        assert.isTrue(
            plan.effect.kind === "write" && plan.effect.fields.some((field) => field.name === "value"),
            "the plan names the fields the run would publish",
        );
        assert.strictEqual(plan.caveats.precision, "f64");
        harness.session.dispose();
    });

    it("blocks a plan whose scope the element cannot narrow to, and says why", async () => {
        // A predicate is the scope a session still cannot answer, because it has no query engine.
        // Resolving it to nothing would be indistinguishable from a predicate that genuinely
        // matched nothing, so it is refused and the plan carries the refusal.
        const { harness } = withRunner();
        harness.add([{ id: "a" }, { id: "b" }]);

        const plan = await harness.session.plan({
            op: "algo.run",
            algorithm: "degree",
            scope: { where: "data.type == `host`" },
        });

        assert.isFalse(plan.ok);
        assert.strictEqual(plan.blocked?.code, "E_UNSUPPORTED");
        assert.isFalse(plan.cost.available);
        assert.strictEqual(plan.effect.kind, "none");
        harness.session.dispose();
    });

    it("reports an unknown algorithm as unavailable rather than throwing at a button", () => {
        // `estimate` gates a control that is being drawn. A throw there takes the panel down over
        // a key somebody mistyped, so the answer is a disabled control with a reason on it.
        const harness = makeSession();

        const estimate = harness.session.estimate({ op: "algo.run", algorithm: "not-an-algorithm" });

        assert.isFalse(estimate.available);
        assert.strictEqual(estimate.confidence, "unknown");
        harness.session.dispose();
    });

    it("cancels everything still in flight when the session is disposed", async () => {
        // A holder rather than a bare variable: the assignment happens inside a callback, which
        // TypeScript cannot see, so a bare `let` would still be typed as null at the end.
        const gate: { release: (() => void) | null } = { release: null };
        const harness = makeSession({
            runs: {
                execute: async () => {
                    await new Promise<void>((resolve) => {
                        gate.release = resolve;
                    });
                    throw new Error("this run should never get here");
                },
            },
        });
        harness.add([{ id: "a" }, { id: "b" }]);

        const run = harness.session.runs.start("degree");
        await Promise.resolve();
        harness.session.dispose();

        try {
            await run;
            assert.fail("a disposed session must not leave a run resolving");
        } catch (error) {
            assert.strictEqual((error as Error).name, "AbortError", "a cancel is an AbortError");
        }

        assert.strictEqual(run.status, "canceled");
        gate.release?.();
    });
});
