/**
 * @file `session.scope.watchSteps`: a selection built from branches read live -- counts, states,
 * reasons, members and the order icon -- with the ids and colors a write fills, the frozen
 * references a filter stores, and the runs a `measure` step reads under the run limits.
 */

import { assert, describe, it } from "vitest";

import type { StepsReading } from "../../../session";
import type { RuleTree, UnionLeaf } from "../../../src/catalog/types";
import { isGraphtyError } from "../../../src/errors";
import { createGraphSession, type GraphSession } from "../../../src/session";
import { createRunResult } from "../../../src/session/results";
import type { RunExecutionContext, RunOutcome } from "../../../src/session/runs";
import { lesMiserables } from "../../helpers/les-miserables";

const LES_MISERABLES = await lesMiserables();
const IDS = (LES_MISERABLES.ids ?? []).map(String);
const ROLE = (at: number): string => (at % 3 === 0 ? "staff" : "guest");

/** How many times the fake executor ran, by scope size: counted work, not time. */
interface Executions {
    readonly sizes: number[];
    release?: () => void;
    hold: boolean;
}

/**
 * An executor that publishes each node's degree inside the run's scope as `value`.
 * @param executions - Where each execution is counted.
 * @returns The executor.
 */
function degreeInScope(executions: Executions) {
    return async (context: RunExecutionContext): Promise<RunOutcome> => {
        executions.sizes.push(context.scope.nodeCount);
        if (executions.hold) {
            await new Promise<void>((resolve) => {
                executions.release = resolve;
            });
        }

        const inside = context.scope.nodes;
        const degree = new Map<string, number>();
        LES_MISERABLES.src.forEach((src, e) => {
            const [a, b] = [IDS[src], IDS[LES_MISERABLES.dst[e]]];
            if (inside.has(a) && inside.has(b)) {
                degree.set(a, (degree.get(a) ?? 0) + 1);
                degree.set(b, (degree.get(b) ?? 0) + 1);
            }
        });
        return {
            result: createRunResult({
                runId: context.runId,
                measured: { nodes: inside.size, edges: 0 },
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
                nodes: [...inside].map((id) => ({ id, values: { value: degree.get(String(id)) ?? 0 } })),
            }),
        };
    };
}

/**
 * Les Miserables with a role per character, on a session with the fake executor.
 * @param executions - Where executions are counted.
 * @returns The session.
 */
async function lesMis(executions: Executions = { sizes: [], hold: false }): Promise<GraphSession> {
    const session = createGraphSession({ runs: { execute: degreeInScope(executions) } });
    await session.data.addNodes(IDS.map((id, at) => ({ id, role: ROLE(at) })));
    await session.data.addEdges(
        [...LES_MISERABLES.src].map((src, e) => ({ source: IDS[src], target: IDS[LES_MISERABLES.dst[e]] })),
    );
    return session;
}

const STAFF: RuleTree = { kind: "categories", attribute: "data.role", values: ["staff"] };
const DEGREE_6_TO_10: RuleTree = { kind: "range", attribute: "graphty.degree", min: 6, max: 10 };

/**
 * The next reading a watch hears.
 * @param session - The session.
 * @param rule - The rule.
 * @param act - What to do once watching.
 * @returns The reading.
 */
async function nextReading(session: GraphSession, rule: RuleTree, act: () => unknown): Promise<StepsReading> {
    let watch: { end(): void } | undefined;
    const heard = new Promise<StepsReading>((resolve) => {
        watch = session.scope.watchSteps(rule, resolve);
    });
    await act();
    const reading = await heard;
    watch?.end();
    return reading;
}

describe("watchSteps", () => {
    it("reads every branch and step: counts, ids, colors, the base and the order icon", async () => {
        const session = await lesMis();
        const rule: UnionLeaf = {
            kind: "union",
            side: "nodes",
            within: "graph",
            branches: [
                {
                    start: "all",
                    steps: [
                        { op: "keep", rule: DEGREE_6_TO_10 },
                        { op: "add", rule: STAFF },
                    ],
                },
                { start: "none", steps: [{ op: "add", rule: { kind: "hops", of: { nodes: ["Valjean"] }, max: 1 } }] },
            ],
        };
        const { current } = session.scope.watchSteps(rule, () => undefined);
        assert.strictEqual(current.total.of, IDS.length);
        assert.deepEqual(
            current.branches.map((branch) => branch.id),
            ["b1", "b2"],
        );
        assert.deepEqual(
            current.branches.flatMap((branch) => branch.steps.map((step) => step.id)),
            ["s1", "s2", "s3"],
        );
        assert.notStrictEqual(current.branches[0].color, current.branches[1].color);
        const [keep, add] = current.branches[0].steps;
        assert.strictEqual(keep.state, "applied");
        assert.isFalse(keep.orderMatters);
        assert.isTrue(add.orderMatters, "an Add below a Keep depends on its place");
        assert.isAbove(add.count, keep.count);
        const resolved = await session.scope.resolve(current.result);
        assert.strictEqual(resolved.nodes.size, current.total.count);
        assert.strictEqual(
            current.branchOf("Valjean"),
            current.branches[0].steps[1].count > 0 ? current.branchOf("Valjean") : null,
        );
        assert.isNotNull(current.branchOf("Valjean"));
    });

    it("an untouched step reads inert with test-unset and changes no count", async () => {
        const session = await lesMis();
        const rule: UnionLeaf = {
            kind: "union",
            side: "nodes",
            within: "graph",
            branches: [{ start: "all", steps: [{ op: "keep", rule: { kind: "range", attribute: "graphty.degree" } }] }],
        };
        const { current } = session.scope.watchSteps(rule, () => undefined);
        const [step] = current.branches[0].steps;
        assert.strictEqual(step.state, "inert");
        assert.deepEqual(step.reason, { code: "test-unset", params: {} });
        assert.strictEqual(current.total.count, IDS.length);
    });

    it("hears the selection move a step that reads it, and counts the input of So far", async () => {
        const session = await lesMis();
        const rule: UnionLeaf = {
            kind: "union",
            side: "nodes",
            within: "graph",
            branches: [{ start: "none", steps: [{ op: "add", rule: { kind: "hops", of: "selection", max: 1 } }] }],
        };
        const before = session.scope.watchSteps(rule, () => undefined).current;
        assert.deepEqual(before.branches[0].steps[0].reason, { code: "reference-empty", params: {} });
        const after = await nextReading(session, rule, () => session.selection.apply({ nodes: ["Valjean"] }));
        assert.isAbove(after.total.count, 1);
        assert.isNull(after.branches[0].steps[0].reason);
    });

    it("converts a tier 4 flat card: an all of leaves is one branch starting with all", async () => {
        const session = await lesMis();
        const flat: RuleTree = { kind: "all", of: [DEGREE_6_TO_10, { kind: "not", of: STAFF }] };
        const leaf = session.scope.asUnion(flat, { side: "nodes", within: "graph" });
        assert.deepEqual(leaf?.branches[0].start, "all");
        assert.deepEqual(
            leaf?.branches[0].steps.map((step) => step.op),
            ["keep", "except"],
        );
        const flatCount = (await session.scope.count({ define: { kind: "rule", where: flat, reading: "clipped" } }))
            .nodes;
        assert.strictEqual(
            session.scope.watchSteps(flat, () => undefined, { side: "nodes", within: "graph" }).current.total.count,
            flatCount,
        );
        assert.isNull(
            session.scope.asUnion(
                { kind: "all", of: [{ kind: "any", of: [STAFF] }] },
                { side: "nodes", within: "graph" },
            ),
        );
    });

    it("checkStep names the refusal a filter would give", async () => {
        const session = await lesMis();
        const step = { op: "keep" as const, rule: STAFF };
        assert.deepEqual(session.scope.checkStep(step, { side: "nodes", within: "visible", host: "filter" }), {
            code: "circular-scope",
            params: {},
        });
        assert.isNull(session.scope.checkStep(step, { side: "nodes", within: "graph", host: "filter" }));
        assert.strictEqual(
            session.scope.checkStep(
                { op: "add", rule: { kind: "union", side: "nodes", within: "graph", branches: [] } },
                {
                    side: "nodes",
                    within: "graph",
                    host: "selector",
                },
            )?.code,
            "nested-union",
        );
    });

    it("the branch palette never wraps", async () => {
        const session = await lesMis();
        session.scope.setOptions({ branchPalette: ["#009E73"] });
        const two: UnionLeaf = {
            kind: "union",
            side: "nodes",
            within: "graph",
            branches: [
                { start: "none", steps: [] },
                { start: "none", steps: [] },
            ],
        };
        let code: string | undefined;
        try {
            session.scope.watchSteps(two, () => undefined);
        } catch (error) {
            code = isGraphtyError(error) ? error.code : undefined;
        }

        assert.strictEqual(code, "E_CAP_EXCEEDED");
        assert.deepEqual(session.scope.options.branchPalette, ["#009E73"]);
    });
});

describe("writes", () => {
    it("a style layer stores its union with ids and colors filled", async () => {
        const session = await lesMis();
        const { id } = await session.styles.add({
            name: "Staff",
            target: "node",
            selector: {
                match: "rule",
                where: {
                    kind: "union",
                    side: "nodes",
                    within: "visible",
                    branches: [{ start: "none", steps: [{ op: "add", rule: STAFF }] }],
                },
            },
            set: { "node.color": "#d33" },
        });
        const selector = session.styles.get(id)?.selector as { where: UnionLeaf };
        assert.strictEqual(selector.where.branches[0].id, "b1");
        assert.strictEqual(selector.where.branches[0].steps[0].id, "s1");
        assert.isString(selector.where.branches[0].color);
    });

    it("a filter condition freezes Selected to node ids; selecting another node changes nothing", async () => {
        const session = await lesMis();
        await session.selection.apply({ nodes: ["Valjean"] });
        const near: UnionLeaf = {
            kind: "union",
            side: "nodes",
            within: "graph",
            branches: [{ start: "none", steps: [{ op: "add", rule: { kind: "hops", of: "selection", max: 1 } }] }],
        };
        await session.visibility.addCondition({ effect: "keep", rule: near });
        const kept = [...session.visibility.nodes].map(String).sort();
        const [condition] = session.visibility.conditions;
        const stored = condition.rule as UnionLeaf;
        assert.strictEqual(stored.branches[0].steps[0].frozenFrom, "selection");
        assert.deepEqual((stored.branches[0].steps[0].rule as { of: unknown }).of, { nodes: ["Valjean"] });

        await session.selection.apply({ nodes: ["Javert"] });
        assert.deepEqual([...session.visibility.nodes].map(String).sort(), kept);
    });
});

const TOP_BY_MEASURE: RuleTree = {
    kind: "measure",
    algorithm: "degree",
    field: "value",
    test: { kind: "threshold", top: 5 },
};

describe("measure steps and runs", () => {
    it("a measure on the base starts one ordinary run without suggested styles, then reads it", async () => {
        const executions: Executions = { sizes: [], hold: false };
        const session = await lesMis(executions);
        const layers = session.styles.list().length;
        const rule: UnionLeaf = {
            kind: "union",
            side: "nodes",
            within: "graph",
            branches: [{ start: "none", steps: [{ op: "add", rule: TOP_BY_MEASURE }] }],
        };
        const watch = session.scope.watchSteps(rule, () => undefined);
        assert.strictEqual(watch.current.branches[0].state, "pending");
        assert.strictEqual(watch.current.branches[0].steps[0].reason?.code, "computing");
        const ready = await new Promise<StepsReading>((resolve) => {
            const each = session.scope.watchSteps(rule, (reading) => {
                if (reading.branches[0].state === "ready") {
                    each.end();
                    resolve(reading);
                }
            });
        });
        watch.end();
        assert.isAtLeast(ready.total.count, 5);
        assert.strictEqual(session.runs.list().length, 1, "one run, listed with the other runs");
        assert.strictEqual(session.styles.list().length, layers, "a condition is not a repaint");
        assert.strictEqual(ready.branches[0].steps[0].run, session.runs.list()[0].id);
        assert.deepEqual(executions.sizes, [IDS.length]);
    });

    it("a measure computed on So far is the step's own computation: no session run", async () => {
        const executions: Executions = { sizes: [], hold: false };
        const session = await lesMis(executions);
        const staff = IDS.filter((_id, at) => ROLE(at) === "staff").length;
        const rule: UnionLeaf = {
            kind: "union",
            side: "nodes",
            within: "graph",
            branches: [
                {
                    start: "all",
                    steps: [
                        { op: "keep", rule: STAFF },
                        { op: "keep", rule: TOP_BY_MEASURE, computedOn: "so-far" },
                    ],
                },
            ],
        };
        const ready = await new Promise<StepsReading>((resolve) => {
            const each = session.scope.watchSteps(rule, (reading) => {
                if (reading.branches[0].state === "ready") {
                    each.end();
                    resolve(reading);
                }
            });
        });
        // The top 5 of the staff by degree among the staff: whole tie groups only, so at most 5.
        assert.isAbove(ready.total.count, 0);
        assert.isAtMost(ready.total.count, 5);
        assert.strictEqual(session.runs.list().length, 0);
        assert.deepEqual(executions.sizes, [staff]);
    });

    it("above the ask limit a step waits for allowRun; Cancel leaves it waiting", async () => {
        const executions: Executions = { sizes: [], hold: true };
        const session = await lesMis(executions);
        session.scope.setOptions({ askAboveMs: 0 });
        const { rule } = session.scope.watchSteps(
            {
                kind: "union",
                side: "nodes",
                within: "graph",
                branches: [{ start: "none", steps: [{ op: "add", rule: TOP_BY_MEASURE }] }],
            },
            () => undefined,
        ).current;
        const waiting = session.scope.watchSteps(rule, () => undefined).current;
        const [step] = waiting.branches[0].steps;
        assert.strictEqual(step.state, "pending");
        assert.strictEqual(step.reason?.code, "run-needed");
        assert.isNumber(step.reason?.params.estimateMs);
        assert.strictEqual(waiting.total.count, 0, "a branch never ready contributes nothing");
        assert.deepEqual(executions.sizes, []);

        const computing = await nextReading(session, rule, () => {
            session.scope.allowRun(rule, step.id);
        });
        assert.strictEqual(computing.branches[0].steps[0].reason?.code, "computing");

        const cancelled = await nextReading(session, rule, () => {
            session.scope.cancelRun(rule, step.id);
        });
        assert.strictEqual(cancelled.branches[0].steps[0].reason?.code, "run-needed");
        executions.release?.();
    });
});
