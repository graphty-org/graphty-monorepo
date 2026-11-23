/**
 * @file `session.scope`'s step helpers at their corners: `asUnion` for every flat rule shape it
 * converts or declines, keep and exclude; `setOptions` refusals and clearing a limit;
 * `watchSteps`, `allowRun` and `checkStep` refusals; `branchOf`; and the live references a filter
 * condition freezes inside `not` and `all`, on a measure's bound option and a member step.
 */

import { assert, describe, it } from "vitest";

import type { RuleTree, UnionLeaf } from "../../../src/catalog/types";
import { isGraphtyError } from "../../../src/errors";
import { createGraphSession, type GraphSession } from "../../../src/session";

const NODES = ["a", "b", "c", "d", "e"];

/**
 * A path a-b-c-d-e whose nodes carry a role and whose edges carry a weight.
 * @returns The session.
 */
async function path(): Promise<GraphSession> {
    const session = createGraphSession();
    await session.data.addNodes(NODES.map((id, at) => ({ id, role: at % 2 === 0 ? "staff" : "guest" })));
    await session.data.addEdges(NODES.slice(1).map((id, at) => ({ source: NODES[at], target: id, weight: at + 1 })));
    return session;
}

const STAFF: RuleTree = { kind: "categories", attribute: "data.role", values: ["staff"] };
const GUEST: RuleTree = { kind: "categories", attribute: "data.role", values: ["guest"] };
const HEAVY: RuleTree = { kind: "range", attribute: "data.weight", min: 3 };
const NODE_SIDE = { side: "nodes", within: "graph" } as const;

/**
 * The code a call throws.
 * @param call - The call.
 * @returns The code, or null when it did not throw a GraphtyError.
 */
function codeOf(call: () => unknown): string | null {
    try {
        call();
    } catch (error) {
        return isGraphtyError(error) ? error.code : null;
    }

    return null;
}

describe("asUnion", () => {
    it("converts a leaf, an any of leaves, an all of leaves and nots, and a not of a leaf", async () => {
        const session = await path();
        const { asUnion } = session.scope;
        assert.deepEqual(asUnion(STAFF, NODE_SIDE)?.branches, [{ start: "all", steps: [{ op: "keep", rule: STAFF }] }]);
        assert.deepEqual(asUnion({ kind: "any", of: [STAFF, GUEST] }, NODE_SIDE)?.branches, [
            { start: "none", steps: [{ op: "add", rule: STAFF }] },
            { start: "none", steps: [{ op: "add", rule: GUEST }] },
        ]);
        assert.deepEqual(asUnion({ kind: "all", of: [STAFF, { kind: "not", of: GUEST }] }, NODE_SIDE)?.branches, [
            {
                start: "all",
                steps: [
                    { op: "keep", rule: STAFF },
                    { op: "except", rule: GUEST },
                ],
            },
        ]);
        assert.deepEqual(asUnion({ kind: "not", of: STAFF }, NODE_SIDE)?.branches, [
            { start: "all", steps: [{ op: "except", rule: STAFF }] },
        ]);
        const union: UnionLeaf = { kind: "union", ...NODE_SIDE, branches: [] };
        assert.strictEqual(asUnion(union, NODE_SIDE), union, "a union is itself");
        session.dispose();
    });

    it("declines nesting it cannot flatten, and a keep condition's edge value leaf", async () => {
        const session = await path();
        const { asUnion } = session.scope;
        const nested: RuleTree = { kind: "all", of: [STAFF, GUEST] };
        assert.isNull(asUnion({ kind: "any", of: [STAFF, nested] }, NODE_SIDE));
        assert.isNull(asUnion({ kind: "all", of: [STAFF, { kind: "any", of: [STAFF, GUEST] }] }, NODE_SIDE));
        assert.isNull(asUnion({ kind: "not", of: nested }, NODE_SIDE));
        const edges = { side: "edges", within: "graph", effect: "keep" } as const;
        assert.isNull(asUnion(HEAVY, edges), "an edge range with no reading also keeps the nodes at its ends");
        assert.isNull(asUnion({ kind: "any", of: [HEAVY] }, edges));
        assert.isNotNull(asUnion({ ...HEAVY, nodes: "ends" }, edges), "a reading names which nodes it keeps");
        assert.isNotNull(asUnion({ kind: "text", reads: "id", mode: "substring", text: "a" }, edges));
        session.dispose();
    });

    it("reads an exclude condition as what it leaves", async () => {
        const session = await path();
        const { asUnion } = session.scope;
        const exclude = { ...NODE_SIDE, effect: "exclude" } as const;
        assert.deepEqual(asUnion(STAFF, exclude)?.branches, [{ start: "all", steps: [{ op: "except", rule: STAFF }] }]);
        assert.deepEqual(asUnion({ kind: "not", of: STAFF }, exclude)?.branches, [
            { start: "none", steps: [{ op: "add", rule: STAFF }] },
        ]);
        assert.deepEqual(asUnion({ kind: "any", of: [STAFF, GUEST] }, exclude)?.branches, [
            {
                start: "all",
                steps: [
                    { op: "except", rule: STAFF },
                    { op: "except", rule: GUEST },
                ],
            },
        ]);
        assert.deepEqual(asUnion({ kind: "all", of: [STAFF, { kind: "not", of: GUEST }] }, exclude)?.branches, [
            { start: "all", steps: [{ op: "except", rule: STAFF }] },
            { start: "none", steps: [{ op: "add", rule: GUEST }] },
        ]);
        const nested: RuleTree = { kind: "all", of: [STAFF, GUEST] };
        assert.isNull(asUnion({ kind: "union", ...NODE_SIDE, branches: [] }, exclude));
        assert.isNull(asUnion({ kind: "not", of: nested }, exclude));
        assert.isNull(asUnion({ kind: "any", of: [nested] }, exclude));
        assert.isNull(asUnion({ kind: "all", of: [{ kind: "any", of: [STAFF] }] }, exclude));
        session.dispose();
    });

    it("what a converted exclude condition leaves is what the condition shows", async () => {
        const session = await path();
        const rule: RuleTree = {
            kind: "all",
            of: [STAFF, { kind: "not", of: { kind: "member", of: { nodes: ["a"] } } }],
        };
        await session.visibility.addCondition({ effect: "exclude", rule });
        const shown = [...session.visibility.nodes].map(String).sort();
        const leaf = session.scope.asUnion(rule, { ...NODE_SIDE, effect: "exclude" });
        assert.isNotNull(leaf);
        const resolved = await session.scope.resolve({
            define: { kind: "rule", where: leaf, reading: "clipped" },
        });
        assert.deepEqual([...resolved.nodes].map(String).sort(), shown);
        assert.deepEqual(shown, ["a", "b", "d"]);
        session.dispose();
    });
});

describe("the step options and refusals", () => {
    it("setOptions refuses a limit that is not a finite number from 0, and an empty or non-color palette", async () => {
        const session = await path();
        for (const bad of [
            { liveMs: -1 },
            { liveMs: Number.NaN },
            { askAboveMs: Number.POSITIVE_INFINITY },
            { askAboveMs: "5" as unknown as number },
            { branchPalette: [] },
            { branchPalette: [1 as unknown as string] },
        ]) {
            assert.strictEqual(
                codeOf(() => session.scope.setOptions(bad)),
                "E_OPTION_RANGE",
                JSON.stringify(bad),
            );
        }

        assert.deepEqual(session.scope.options, {}, "a refused option changes nothing");
        session.scope.setOptions({ liveMs: 5, askAboveMs: 10 });
        session.scope.setOptions({ liveMs: undefined });
        assert.deepEqual(session.scope.options, { askAboveMs: 10 }, "undefined clears one limit and keeps the other");
        session.dispose();
    });

    it("watchSteps refuses a flat rule with no side and base, and allowRun a step id the rule lacks", async () => {
        const session = await path();
        assert.strictEqual(
            codeOf(() => session.scope.watchSteps(STAFF, () => undefined)),
            "E_BAD_COMMAND",
        );
        const watch = session.scope.watchSteps(STAFF, () => undefined, NODE_SIDE);
        assert.strictEqual(
            codeOf(() => session.scope.allowRun(watch.current.rule, "s99")),
            "E_BAD_COMMAND",
        );
        assert.strictEqual(
            codeOf(() => session.scope.cancelRun(watch.current.rule, "s99")),
            "E_BAD_COMMAND",
        );
        watch.end();
        session.dispose();
    });

    it("branchOf names the branch holding an element, and null for an unknown id or a non-member", async () => {
        const session = await path();
        const watch = session.scope.watchSteps(
            {
                kind: "union",
                ...NODE_SIDE,
                branches: [
                    { start: "none", steps: [{ op: "add", rule: { kind: "member", of: { nodes: ["a"] } } }] },
                    { start: "none", steps: [{ op: "add", rule: { kind: "member", of: { nodes: ["b"] } } }] },
                ],
            },
            () => undefined,
        );
        const reading = watch.current;
        assert.strictEqual(reading.branchOf("a"), "b1");
        assert.strictEqual(reading.branchOf("b"), "b2");
        assert.isNull(reading.branchOf("c"), "in no branch");
        assert.isNull(reading.branchOf("nobody"), "not in the graph");
        assert.deepEqual([...(reading.branches[1].members as { nodes: Iterable<unknown> }).nodes].map(String), ["b"]);
        watch.end();
        session.dispose();
    });
});

describe("a filter condition freezes the live references it holds", () => {
    it("inside not and all: a member step on the selection and a measure bound to it", async () => {
        const session = await path();
        await session.selection.apply({ nodes: ["c"] });
        const member: UnionLeaf = {
            kind: "union",
            ...NODE_SIDE,
            branches: [{ start: "none", steps: [{ op: "add", rule: { kind: "member", of: "selection" } }] }],
        };
        const measured: UnionLeaf = {
            kind: "union",
            ...NODE_SIDE,
            branches: [
                {
                    start: "none",
                    steps: [
                        {
                            op: "add",
                            rule: {
                                kind: "measure",
                                algorithm: "bfs",
                                field: "distance",
                                bind: { source: "selection" },
                            },
                        },
                    ],
                },
            ],
        };
        await session.visibility.addCondition({
            effect: "keep",
            rule: { kind: "all", of: [{ kind: "not", of: member }, measured] },
        });
        const [condition] = session.visibility.conditions;
        const stored = condition.rule as unknown as { of: [{ of: UnionLeaf }, UnionLeaf] };
        const [notMember, storedMeasure] = stored.of;
        const memberStep = notMember.of.branches[0].steps[0];
        assert.strictEqual(memberStep.frozenFrom, "selection");
        assert.deepEqual((memberStep.rule as { of: unknown }).of, { nodes: ["c"] });
        const measureStep = storedMeasure.branches[0].steps[0];
        assert.strictEqual(measureStep.frozenFrom, "selection");
        assert.deepEqual((measureStep.rule as { bind: unknown }).bind, { source: { nodes: ["c"] } });
        session.dispose();
    });

    it("leaves a condition with no live reference as written", async () => {
        const session = await path();
        const fixed: UnionLeaf = {
            kind: "union",
            ...NODE_SIDE,
            branches: [
                {
                    start: "none",
                    steps: [
                        { op: "add", rule: { kind: "member", of: { nodes: ["a"] } } },
                        {
                            op: "add",
                            rule: {
                                kind: "measure",
                                algorithm: "bfs",
                                field: "distance",
                                bind: { source: { nodes: ["a"] } },
                            },
                        },
                    ],
                },
            ],
        };
        const rule: RuleTree = { kind: "any", of: [{ kind: "not", of: fixed }, STAFF] };
        await session.visibility.addCondition({ effect: "keep", rule });
        const stored = session.visibility.conditions[0].rule as unknown as { of: [{ of: UnionLeaf }] };
        assert.isTrue(stored.of[0].of.branches[0].steps.every((step) => step.frozenFrom === undefined));
        session.dispose();
    });
});
