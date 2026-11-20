/**
 * @file Counted-work scaling of the run controls of a selection built from steps:
 * `session.scope.setOptions`, `allowRun` and `cancelRun`, and ending a `watchSteps` watch, each run
 * on a path graph of n and of 4n nodes. The elements they visit (Map, Set and Array iterator steps
 * and array scans, see `visitsDuring`) may grow no faster than their reach: the options and the end
 * of a watch are bookkeeping, about the same at any size; a run allowed or canceled re-reads the
 * step, which reaches every node at most once. Counted, never timed (issue #1643).
 */

import { assert, describe, it } from "vitest";

import type { StepsReading, StepsWatch } from "../../../session";
import type { RuleTree, UnionLeaf } from "../../../src/catalog/types";
import { createGraphSession, type GraphSession } from "../../../src/session";
import { createRunResult } from "../../../src/session/results";
import type { RunExecutionContext, RunOutcome } from "../../../src/session/runs";
import { assertScalesLinearly, type Growth, visitsDuring } from "../../helpers/cost";
import { withConsumerStrictState } from "../helpers";

/** The two graph sizes: big enough that a quadratic path is 16x, small enough to stay cheap. */
const SIZES = [200, 800] as const;

/** A step that reads a run: the top five nodes by the run's `value`. */
const TOP_BY_MEASURE: RuleTree = {
    kind: "measure",
    algorithm: "degree",
    field: "value",
    test: { kind: "threshold", top: 5 },
};

/** Holds every run until released, so a case can catch one computing. */
interface Hold {
    held: boolean;
    release?: () => void;
}

/**
 * An executor that publishes each node's position on the path as `value`.
 * @param hold - Whether, and how, a run waits before it publishes.
 * @returns The executor.
 */
function positions(hold: Hold): (context: RunExecutionContext) => Promise<RunOutcome> {
    return async (context) => {
        if (hold.held) {
            await new Promise<void>((resolve) => {
                hold.release = resolve;
            });
        }

        const nodes = [...context.scope.nodes].map((id, at) => ({ id, values: { value: at } }));
        return {
            result: createRunResult({
                runId: context.runId,
                measured: { nodes: nodes.length, edges: 0 },
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
                nodes,
            }),
        };
    };
}

/** A path session whose measure step waits for the reader's Run, and the step's rule and id. */
interface Waiting {
    readonly session: GraphSession;
    readonly hold: Hold;
    readonly rule: UnionLeaf;
    readonly stepId: string;
}

/**
 * A session over a path of `size` nodes holding one measure step that waits for `allowRun`.
 * Build it inside `withConsumerStrictState`.
 * @param size - The node count.
 * @param held - Whether its runs wait to be released.
 * @returns The session, the step's rule and its id.
 */
async function waitingStep(size: number, held: boolean): Promise<Waiting> {
    const hold: Hold = { held };
    const session = createGraphSession({ runs: { execute: positions(hold) } });
    const ids = Array.from({ length: size }, (_, at) => `n${String(at)}`);
    await session.data.addNodes(ids.map((id) => ({ id })));
    await session.data.addEdges(ids.slice(1).map((id, at) => ({ source: ids[at], target: id })));
    session.scope.setOptions({ askAboveMs: 0 });
    const filled = session.scope.watchSteps(
        {
            kind: "union",
            side: "nodes",
            within: "graph",
            branches: [{ start: "none", steps: [{ op: "add", rule: TOP_BY_MEASURE }] }],
        },
        () => undefined,
    );
    const { rule } = filled.current;
    filled.end();
    const [step] = rule.branches[0].steps;
    assert.exists(step.id);
    return { session, hold, rule, stepId: step.id };
}

/**
 * The first reading of `rule` that `done` accepts, heard after `act` runs.
 * @param session - The session.
 * @param rule - The rule watched.
 * @param done - Whether a reading is the one waited for.
 * @param act - What to do once watching.
 * @returns The reading.
 */
async function readingAfter(
    session: GraphSession,
    rule: UnionLeaf,
    done: (reading: StepsReading) => boolean,
    act: () => void,
): Promise<StepsReading> {
    let watch: StepsWatch | undefined;
    const heard = new Promise<StepsReading>((resolve) => {
        watch = session.scope.watchSteps(rule, (reading) => {
            if (done(reading)) {
                resolve(reading);
            }
        });
    });
    act();
    const reading = await heard;
    watch?.end();
    return reading;
}

/**
 * The step's reason code in a reading.
 * @param reading - The reading.
 * @returns The code, or none.
 */
function reasonOf(reading: StepsReading): string | undefined {
    return reading.branches[0].steps[0].reason?.code;
}

/** One method under test. */
interface Case {
    /** `Owner.method`, as the cost-coverage registry spells it. */
    readonly method: string;
    readonly growth: Growth;
    /** Whether the step's runs wait to be released. */
    readonly held: boolean;
    /**
     * Build the state the call needs and return the call.
     * @param waiting - The session and its waiting step.
     * @returns The call to count.
     */
    prepare(waiting: Waiting): Promise<() => unknown>;
}

const CASES: readonly Case[] = [
    {
        method: "ScopeApi.setOptions",
        growth: "constant",
        held: false,
        prepare: ({ session }) =>
            Promise.resolve(() => {
                session.scope.setOptions({ liveMs: 50, askAboveMs: 10 });
                assert.strictEqual(session.scope.options.liveMs, 50);
            }),
    },
    {
        method: "ScopeApi.allowRun",
        growth: "linear",
        held: false,
        prepare: ({ session, rule, stepId }) =>
            Promise.resolve(async () => {
                const ran = await readingAfter(
                    session,
                    rule,
                    (reading) => reading.branches[0].steps[0].state === "applied",
                    () => {
                        session.scope.allowRun(rule, stepId);
                    },
                );
                assert.strictEqual(ran.total.count, 5, "the allowed run selected the top five");
            }),
    },
    {
        method: "ScopeApi.cancelRun",
        growth: "linear",
        held: true,
        prepare: async ({ session, rule, stepId }) => {
            await readingAfter(
                session,
                rule,
                (reading) => reasonOf(reading) === "computing",
                () => {
                    session.scope.allowRun(rule, stepId);
                },
            );
            return async () => {
                await readingAfter(
                    session,
                    rule,
                    (reading) => reasonOf(reading) === "run-needed",
                    () => {
                        session.scope.cancelRun(rule, stepId);
                    },
                );
            };
        },
    },
    {
        method: "StepsWatch.end",
        growth: "constant",
        held: false,
        prepare: ({ session, rule }) => {
            const watch = session.scope.watchSteps(rule, () => undefined);
            return Promise.resolve(() => {
                watch.end();
            });
        },
    },
];

describe("the run controls of a selection built from steps do work in proportion to their reach", () => {
    for (const { method, growth, held, prepare } of CASES) {
        const reach = growth === "linear" ? "no more than linear in the graph" : "about the same at any size";
        it(`${method}: ${reach}`, async () => {
            await assertScalesLinearly(
                (size) =>
                    withConsumerStrictState(async () => {
                        const waiting = await waitingStep(size, held);
                        const call = await prepare(waiting);
                        const visits = await visitsDuring(call);
                        waiting.hold.release?.();
                        waiting.session.dispose();
                        return visits;
                    }),
                { sizes: SIZES, growth, counter: `elements visited by ${method}` },
            );
        });
    }
});
