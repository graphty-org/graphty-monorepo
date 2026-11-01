/**
 * @file `session.scope.watchSteps`: a selection built from branches read live -- counts, states,
 * reasons, members and the order icon -- with the ids and colors a write fills, the frozen
 * references a filter stores, and the runs a `measure` step reads under the run limits.
 */

import { assert, describe, it, vi } from "vitest";

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
                    {
                        name: "group",
                        plainName: "Group",
                        technicalName: "group",
                        kind: "node",
                        type: "integer",
                        measurement: "categorical",
                        unstable: true,
                        path: `results.${context.runId}.group`,
                    },
                ],
                nodes: [...inside].map((id) => ({
                    id,
                    values: { value: degree.get(String(id)) ?? 0, group: (degree.get(String(id)) ?? 0) % 3 },
                })),
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

    it("counts what each branch draws: overlap goes to the first branch, and a branch off draws none", async () => {
        const session = await lesMis();
        const near: RuleTree = { kind: "hops", of: { nodes: ["Valjean"] }, max: 1 };
        const rule: UnionLeaf = {
            kind: "union",
            side: "nodes",
            within: "graph",
            branches: [
                { start: "none", steps: [{ op: "add", rule: STAFF }] },
                { start: "none", steps: [{ op: "add", rule: near }] },
            ],
        };
        const watch = session.scope.watchSteps(rule, () => undefined);
        const [a, b] = watch.current.branches;
        assert.strictEqual(a.drawn, a.count);
        assert.isBelow(b.drawn, b.count, "B's staff members are drawn in A's color");
        assert.strictEqual(a.drawn + b.drawn, watch.current.total.count);
        watch.end();
        const off = session.scope.watchSteps(
            { ...rule, branches: [{ ...rule.branches[0], on: false }, rule.branches[1]] },
            () => undefined,
        );
        assert.strictEqual(off.current.branches[0].drawn, 0);
        assert.strictEqual(off.current.branches[1].drawn, off.current.branches[1].count);
        off.end();
    });

    it("a step that waits on its run says so, and so does a step after it", async () => {
        const session = await lesMis();
        const rule: UnionLeaf = {
            kind: "union",
            side: "nodes",
            within: "graph",
            branches: [
                {
                    start: "all",
                    steps: [
                        { op: "keep", rule: TOP_BY_MEASURE },
                        { op: "keep", rule: STAFF },
                    ],
                },
            ],
        };
        const watch = session.scope.watchSteps(rule, () => undefined);
        const [waiting, after] = watch.current.branches[0].steps;
        watch.end();
        assert.strictEqual(waiting.state, "pending");
        assert.isTrue(waiting.waiting);
        assert.strictEqual(after.reason?.code, "waits-for");
        assert.isTrue(after.waiting);
        assert.strictEqual(watch.current.branchesLeft, 5, "the default palette takes six branches");
    });

    it("a filter condition whose union tests an algorithm is written and keeps what the run measured", async () => {
        const session = await lesMis();
        const rule: UnionLeaf = {
            kind: "union",
            side: "nodes",
            within: "graph",
            branches: [{ start: "all", steps: [{ op: "keep", rule: TOP_BY_MEASURE }] }],
        };
        await session.visibility.addCondition({ effect: "keep", rule });
        await vi.waitFor(() => {
            assert.isAtLeast(session.visibility.nodes.size, 5);
            assert.isBelow(session.visibility.nodes.size, IDS.length);
        });
    });

    it("a measure with no test yet stays inert but starts its run, so a picker can show its values", async () => {
        const executions: Executions = { sizes: [], hold: false };
        const session = await lesMis(executions);
        const untested: RuleTree = { kind: "measure", algorithm: "degree", field: "value" };
        const rule: UnionLeaf = {
            kind: "union",
            side: "nodes",
            within: "graph",
            branches: [{ start: "all", steps: [{ op: "keep", rule: untested }] }],
        };
        const ran = await new Promise<StepsReading>((resolve) => {
            const each = session.scope.watchSteps(rule, (reading) => {
                if (reading.branches[0].steps[0].run !== null) {
                    each.end();
                    resolve(reading);
                }
            });
        });
        const [step] = ran.branches[0].steps;
        assert.strictEqual(step.state, "inert");
        assert.strictEqual(step.reason?.code, "test-unset");
        assert.strictEqual(ran.total.count, IDS.length, "an inert step changes nothing");
        assert.strictEqual(session.runs.list().length, 1);
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
        // Its values are reported on the step, spread over its input, so a test can be set from them.
        const { values } = ready.branches[0].steps[1];
        assert.strictEqual(values?.kind, "numeric");
        assert.strictEqual(values?.of, staff, "counted over the step's input");
        assert.isNull(ready.branches[0].steps[0].values, "a step reading no own computation has none");
    });

    it("an untested So far measure tells its watcher when its own values arrive", async () => {
        const session = await lesMis();
        const staff = IDS.filter((_id, at) => ROLE(at) === "staff").length;
        const untested: RuleTree = { kind: "measure", algorithm: "degree", field: "value" };
        const rule: UnionLeaf = {
            kind: "union",
            side: "nodes",
            within: "graph",
            branches: [
                {
                    start: "all",
                    steps: [
                        { op: "keep", rule: STAFF },
                        { op: "keep", rule: untested, computedOn: "so-far" },
                    ],
                },
            ],
        };
        // The step stays inert (no test) the whole time: only its values change, and that is news.
        const heard = await new Promise<StepsReading>((resolve) => {
            const each = session.scope.watchSteps(rule, (reading) => {
                if (reading.branches[0].steps[1].values !== null) {
                    each.end();
                    resolve(reading);
                }
            });
        });
        const step = heard.branches[0].steps[1];
        assert.strictEqual(step.state, "inert");
        assert.strictEqual(step.values?.kind, "numeric");
        assert.strictEqual(step.values?.of, staff);
        assert.strictEqual(step.values?.missing, 0);
    });

    it("the same So far step in two groups reads each group's own values", async () => {
        const session = await lesMis();
        const staff = IDS.filter((_id, at) => ROLE(at) === "staff").length;
        const guests = IDS.length - staff;
        const GUEST: RuleTree = { kind: "categories", attribute: "data.role", values: ["guest"] };
        const rule: UnionLeaf = {
            kind: "union",
            side: "nodes",
            within: "graph",
            branches: [STAFF, GUEST].map((first) => ({
                start: "all" as const,
                steps: [
                    { op: "keep" as const, rule: first },
                    { op: "keep" as const, rule: TOP_BY_MEASURE, computedOn: "so-far" as const },
                ],
            })),
        };
        const ready = await new Promise<StepsReading>((resolve) => {
            const each = session.scope.watchSteps(rule, (reading) => {
                if (reading.branches.every((branch) => branch.steps[1].values !== null)) {
                    each.end();
                    resolve(reading);
                }
            });
        });
        const [mine, theirs] = ready.branches.map((branch) => branch.steps[1].values);
        assert.strictEqual(mine?.of, staff);
        assert.strictEqual(mine?.missing, 0, "the staff group reads the staff computation, not the guests'");
        assert.strictEqual(theirs?.of, guests);
        assert.strictEqual(theirs?.missing, 0);
    });

    it("a layer with a So far step tells the key again once its computation lands after a filter change", async () => {
        const session = await lesMis();
        const where: UnionLeaf = {
            kind: "union",
            side: "nodes",
            within: "visible",
            branches: [
                {
                    start: "all",
                    steps: [
                        { op: "keep", rule: STAFF },
                        {
                            op: "keep",
                            rule: {
                                kind: "measure",
                                algorithm: "degree",
                                field: "value",
                                test: { kind: "range", min: 3 },
                            },
                            computedOn: "so-far",
                        },
                    ],
                },
            ],
        };
        const { id } = await session.styles.add({
            name: "Top staff",
            target: "node",
            selector: { match: "rule", where },
            set: { "node.color": "#D55E00" },
        });
        await session.styles.settled();
        // The key is read as the app reads it: again on every event that says the picture moved.
        const keyCount = (): number | undefined =>
            session.styles.legend().find((block) => block.layerId === id)?.scope?.count;
        let heard = keyCount();
        for (const event of ["style:batch-changed", "project:derived", "visibility:changed"] as const) {
            session.on(event, () => {
                heard = keyCount();
            });
        }
        const painted = (): number => session.styles.counts(id).painted["node.color"] ?? 0;

        await vi.waitFor(() => {
            assert.isAbove(painted(), 0);
        });
        const seen = [painted()];
        for (const step of ["add", "remove"] as const) {
            if (step === "add") {
                await session.visibility.addCondition({
                    effect: "keep",
                    rule: { kind: "range", attribute: "graphty.degree", min: 5 },
                });
            } else {
                await session.visibility.setConditions([]);
            }

            await vi.waitFor(() => {
                assert.notStrictEqual(painted(), seen.at(-1), "the step's own computation has landed");
                assert.strictEqual(heard, painted(), `after the filter ${step === "add" ? "is added" : "goes"}`);
            });
            seen.push(painted());
        }
    });

    it("a keep or exclude condition whose steps have no test yet removes nothing", async () => {
        const session = await lesMis();
        const untested: RuleTree = { kind: "range", attribute: "graphty.degree" };
        for (const start of ["none", "all"] as const) {
            for (const effect of ["keep", "exclude"] as const) {
                const { id } = await session.visibility.addCondition({
                    effect,
                    rule: {
                        kind: "union",
                        side: "nodes",
                        within: "graph",
                        branches: [{ start, steps: [{ op: start === "none" ? "add" : "keep", rule: untested }] }],
                    },
                });
                assert.strictEqual(session.visibility.nodes.size, IDS.length, `${effect} from ${start} hides nothing`);
                await session.visibility.removeCondition(id);
            }
        }
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

describe("scope.histogram", () => {
    it("bins degree over a step's input, and counts a category with the best-connected member of each", async () => {
        const session = await lesMis();
        const staff: RuleTree = STAFF;
        const all = session.scope.histogram("graphty.degree");
        const inStaff = session.scope.histogram("graphty.degree", {
            within: { define: { kind: "rule", where: staff, reading: "induced" } },
        });
        assert.strictEqual(all.kind, "numeric");
        assert.strictEqual(all.of, IDS.length);
        assert.strictEqual(inStaff.of, IDS.filter((_id, at) => ROLE(at) === "staff").length);
        if (inStaff.kind === "numeric") {
            assert.strictEqual(
                inStaff.bins.reduce((sum, bin) => sum + bin.count, 0),
                inStaff.of,
            );
        }

        const roles = session.scope.histogram("data.role");
        assert.strictEqual(roles.kind, "categorical");
        if (roles.kind === "categorical") {
            assert.deepEqual(
                roles.values.map((each) => each.value),
                ["guest", "staff"],
            );
            assert.isUndefined(roles.values[0].member, "a data column's values are stable");
        }
    });

    it("names the best-connected member of each value of an unstable field", async () => {
        const session = await lesMis();
        const run = await session.runs.start("degree", {}, { scope: "graph", style: false });
        const groups = session.scope.histogram(`results.${run.runId}.group`);
        assert.strictEqual(groups.kind, "categorical");
        const valjean =
            groups.kind === "categorical" ? groups.values.find((each) => each.member === "Valjean") : undefined;
        assert.isDefined(valjean, "Valjean, the best-connected character, names his group");
    });
});
