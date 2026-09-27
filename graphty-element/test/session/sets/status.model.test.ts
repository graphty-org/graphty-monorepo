/**
 * @file The status model (design/sets/sets-design.md sections 5.2 and 5.3), 1,000 sequences: random
 * runs, re-runs, run removals, set creations, removals and restores, and redefinitions of the set a
 * run's scope names; after every step each live set's status must carry the freshness and the
 * earlier runs a plain model computes, and `values-not-kept` exactly when the model kept no capture.
 *
 * The model knows nothing of the element's status code: it counts executions per run, records which
 * execution each holding set holds, which captures each re-run would keep, and which version of the
 * base set each run over it last read.
 */

import fc from "fast-check";
import { assert, describe, it } from "vitest";

import type { SetId } from "../../../src/catalog/types";
import { resultExecutionOf } from "../../../src/session/results/ResultsApi";
import { createSetAs, setsStoreOf } from "../../../src/session/sets/SetsApi";
import type { SetStatus } from "../../../src/session/sets/types";
import { fcParams } from "../../helpers/fc-params";
import { type Harness, makeSession } from "../helpers";
import { type Published, publishing } from "../visibility/results";

const RUNS = ["louv", "pr"] as const;
type RunName = (typeof RUNS)[number];

/** What a set was made as, in the model's terms. */
type Made =
    | { readonly kind: "fixed" }
    | { readonly kind: "from-louv"; readonly execution: number }
    | { readonly kind: "follow-pr" }
    | { readonly kind: "hold-louv"; readonly execution: number; readonly group: number }
    | { readonly kind: "reads"; readonly target: SetId };

type Op =
    | { readonly op: "run"; readonly run: RunName }
    | { readonly op: "rerun"; readonly run: RunName }
    | { readonly op: "remove-run"; readonly run: RunName }
    | { readonly op: "create"; readonly make: number; readonly group: number; readonly pick: number }
    | { readonly op: "remove-set"; readonly pick: number }
    | { readonly op: "restore-set"; readonly pick: number }
    | { readonly op: "redefine-base" };

const OP: fc.Arbitrary<Op> = fc.oneof(
    fc.record({ op: fc.constant("run" as const), run: fc.constantFrom(...RUNS) }),
    fc.record({ op: fc.constant("rerun" as const), run: fc.constantFrom(...RUNS) }),
    fc.record({ op: fc.constant("remove-run" as const), run: fc.constantFrom(...RUNS) }),
    fc.record({ op: fc.constant("create" as const), make: fc.nat(4), group: fc.nat(1), pick: fc.nat(20) }),
    fc.record({ op: fc.constant("create" as const), make: fc.nat(4), group: fc.nat(1), pick: fc.nat(20) }),
    fc.record({ op: fc.constant("remove-set" as const), pick: fc.nat(20) }),
    fc.record({ op: fc.constant("restore-set" as const), pick: fc.nat(20) }),
    fc.record({ op: fc.constant("redefine-base" as const) }),
);

const GROUPS: Published = { shape: "community", nodes: new Map([["a", { group: 0 }], ["b", { group: 1 }]]) };
const SCORES: Published = { shape: "node-metric", nodes: new Map([["a", { value: 1 }], ["b", { value: 5 }]]) };
const BASE = [
    { kind: "fixed", nodes: ["a", "b"], reading: "induced" },
    { kind: "fixed", nodes: ["a"], reading: "induced" },
] as const;

/** The plain model. */
class Model {
    /** Per run: its execution count (the current execution), or absent when the run does not exist. */
    readonly executions = new Map<RunName, number>();
    /** Which version of the base set `pr` last read, while `pr` exists. */
    prRead = 0;
    /** The base set's current version. */
    base = 0;
    /** Live sets, and removed ones that may come back. */
    readonly live = new Map<SetId, Made>();
    readonly removed = new Map<SetId, Made>();
    /** Captures `louv` keeps: `execution/group`. */
    captures = new Set<string>();
    private nextExecution = 0;

    /** @returns A fresh execution number, distinct across runs and re-creations. */
    mint(): number {
        return ++this.nextExecution;
    }

    /**
     * What `louv` keeps across a re-run: every held item of the execution being replaced, and every
     * earlier capture still held.
     * @param current - The execution being replaced.
     */
    rerunLouvain(current: number): void {
        const next = new Set<string>();
        for (const made of this.live.values()) {
            if (made.kind === "hold-louv") {
                const key = `${made.execution}/${made.group}`;
                if (made.execution === current || this.captures.has(key)) {
                    next.add(key);
                }
            }
        }

        this.captures = next;
    }

    /**
     * A live set's expected status.
     * @param id - The set.
     * @returns Freshness, earlier runs, and whether values were not kept.
     */
    expect(id: SetId): { freshness: SetStatus["freshness"]; earlier: string[]; notKept: boolean } {
        const made = this.live.get(id);
        if (made === undefined) {
            return { freshness: "detached", earlier: [], notKept: false };
        }

        const louv = this.executions.get("louv");
        switch (made.kind) {
            case "fixed":
                return { freshness: "current", earlier: [], notKept: false };
            case "from-louv":
                return { freshness: "current", earlier: louv !== undefined && louv !== made.execution ? ["louv"] : [], notKept: false };
            case "follow-pr":
                if (!this.executions.has("pr")) {
                    return { freshness: "detached", earlier: [], notKept: false };
                }

                return { freshness: this.prRead === this.base ? "current" : "out-of-date", earlier: [], notKept: false };
            case "hold-louv":
                if (louv === undefined) {
                    return { freshness: "detached", earlier: [], notKept: false };
                }

                if (louv === made.execution) {
                    return { freshness: "current", earlier: [], notKept: false };
                }

                return { freshness: "current", earlier: ["louv"], notKept: !this.captures.has(`${made.execution}/${made.group}`) };
            case "reads": {
                const input = this.expect(made.target);
                return { freshness: input.freshness, earlier: [], notKept: false };
            }
            default:
                throw new Error("unknown kind");
        }
    }
}

/** The real session and the ids the model's numbers stand for. */
interface Real {
    readonly harness: Harness;
    readonly base: SetId;
    /** Model execution number to the real token. */
    readonly tokens: Map<number, string>;
}

/**
 * A fresh session: two nodes, one edge, a base set and no runs.
 * @returns The real side.
 */
function realSession(): Real {
    const table = new Map<string, Published>([
        ["louv", GROUPS],
        ["pr", SCORES],
    ]);
    const harness = makeSession({ directed: false, runs: { execute: publishing(table) } });
    harness.add([{ id: "a" }, { id: "b" }], [{ src: "a", dst: "b" }]);
    const base = harness.session.sets.create(BASE[0], { name: "Base" });

    return { harness, base, tokens: new Map() };
}

/**
 * Record the real token of a run's current execution under a fresh model number.
 * @param model - The model.
 * @param real - The real side.
 * @param run - The run.
 */
function stamp(model: Model, real: Real, run: RunName): void {
    const execution = model.mint();
    model.executions.set(run, execution);
    const token = resultExecutionOf(real.harness.session.results, run);
    assert.isString(token);
    real.tokens.set(execution, token as string);
}

/**
 * Apply one op to both sides.
 * @param op - The op.
 * @param model - The model.
 * @param real - The real side.
 */
async function apply(op: Op, model: Model, real: Real): Promise<void> {
    const { session } = real.harness;
    const live = [...model.live.keys()];
    switch (op.op) {
        case "run":
            if (!model.executions.has(op.run)) {
                await session.runs.start("degree", undefined, { as: op.run, scope: op.run === "pr" ? { set: real.base } : "graph", style: false });
                stamp(model, real, op.run);
                if (op.run === "pr") {
                    model.prRead = model.base;
                }
            }

            return;
        case "rerun": {
            const current = model.executions.get(op.run);
            if (current !== undefined) {
                await session.runs.get(op.run)?.rerun();
                if (op.run === "louv") {
                    model.rerunLouvain(current);
                }

                stamp(model, real, op.run);
                if (op.run === "pr") {
                    model.prRead = model.base;
                }
            }

            return;
        }
        case "remove-run":
            session.runs.remove(op.run);
            model.executions.delete(op.run);
            if (op.run === "louv") {
                model.captures = new Set();
            }

            return;
        case "create": {
            const louv = model.executions.get("louv");
            const token = louv === undefined ? undefined : real.tokens.get(louv);
            let made: Made;
            let id: SetId;
            if (op.make === 1 && louv !== undefined && token !== undefined) {
                made = { kind: "from-louv", execution: louv };
                id = createSetAs(session.sets, { kind: "fixed", nodes: ["a"], reading: "induced" }, undefined, {
                    kind: "result",
                    item: { run: "louv", key: { field: "group", value: 0 }, execution: token },
                });
            } else if (op.make === 2) {
                made = { kind: "follow-pr" };
                id = session.sets.create({ kind: "rule", where: "results.pr.value > `2`", reading: "induced" });
            } else if (op.make === 3 && louv !== undefined && token !== undefined) {
                made = { kind: "hold-louv", execution: louv, group: op.group };
                id = session.sets.create({
                    kind: "rule",
                    where: { kind: "item", item: { run: "louv", key: { field: "group", value: op.group }, execution: token } },
                    reading: "induced",
                });
            } else if (op.make === 4 && live.length > 0) {
                const target = live[op.pick % live.length];
                made = { kind: "reads", target };
                id = session.sets.create({ kind: "rule", where: { kind: "scope", scope: { set: target } }, reading: "induced" });
            } else {
                made = { kind: "fixed" };
                id = session.sets.create({ kind: "fixed", nodes: ["b"], reading: "induced" });
            }

            model.live.set(id, made);
            return;
        }
        case "remove-set":
            if (live.length > 0) {
                const id = live[op.pick % live.length];
                session.sets.remove(id);
                model.removed.set(id, model.live.get(id) as Made);
                model.live.delete(id);
            }

            return;
        case "restore-set": {
            const removed = [...model.removed.keys()];
            if (removed.length > 0) {
                // What an undo of the removal does: put the last record back.
                const id = removed[op.pick % removed.length];
                const store = setsStoreOf(session.sets);
                const record = store.tombstone(id)?.record;
                assert.isDefined(record);
                store.transact(() => {
                    store.put(record);
                });
                model.live.set(id, model.removed.get(id) as Made);
                model.removed.delete(id);
            }

            return;
        }
        case "redefine-base":
            model.base = 1 - model.base;
            session.sets.redefine(real.base, BASE[model.base]);
            return;
        default:
            throw new Error("unknown op");
    }
}

describe("status follows a plain model through runs, re-runs and restores", () => {
    it("matches the model after every step", async () => {
        await fc.assert(
            fc.asyncProperty(fc.array(OP, { maxLength: 24 }), async (ops) => {
                const model = new Model();
                const real = realSession();
                for (const op of ops) {
                    await apply(op, model, real);
                    for (const id of model.live.keys()) {
                        const actual = real.harness.session.sets.status({ set: id });
                        const expected = model.expect(id);
                        const where = `${id} after ${JSON.stringify(op)}`;
                        assert.strictEqual(actual.freshness, expected.freshness, where);
                        assert.deepStrictEqual([...actual.earlierRuns], expected.earlier, where);
                        assert.strictEqual(
                            actual.reasons.some((reason) => reason.kind === "values-not-kept"),
                            expected.notKept,
                            where,
                        );
                    }
                }
            }),
            fcParams(1000),
        );
    });
});
