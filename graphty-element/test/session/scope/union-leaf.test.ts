/**
 * @file The `union` rule leaf: branches folded from a start by ordered Add, Keep and Except steps,
 * and the step leaves that read a reference (`hops`, `touching`, `nonempty`, `same-value`), on Les
 * Miserables. Each test reads the result through the public API: a scope's members, a style
 * layer's count, a filter condition's visible nodes.
 */

import { assert, describe, it } from "vitest";

import type { NodeId, RuleTree, UnionLeaf, UnionStep } from "../../../src/catalog/types";
import { isGraphtyError } from "../../../src/errors";
import { createGraphSession, type GraphSession } from "../../../src/session";
import { lesMiserables } from "../../helpers/les-miserables";

const LES_MISERABLES = await lesMiserables();
const IDS = (LES_MISERABLES.ids ?? []).map(String);

/** A made-up role per character, so a category leaf has something to read: every third is staff. */
const ROLE = (at: number): string => (at % 3 === 0 ? "staff" : "guest");
/** A made-up list column: tags. */
const TAGS = (at: number): string[] => (at % 2 === 0 ? ["red", "blue"] : ["red"]);

/**
 * A session holding Les Miserables with a role, a score (missing on every fifth) and tags.
 * @returns The session.
 */
async function lesMis(): Promise<GraphSession> {
    const session = createGraphSession();
    await session.data.addNodes(
        IDS.map((id, at) => ({
            id,
            role: ROLE(at),
            tags: TAGS(at),
            ...(at % 5 === 0 ? {} : { score: at }),
        })),
    );
    await session.data.addEdges(
        [...LES_MISERABLES.src].map((src, e) => ({ source: IDS[src], target: IDS[LES_MISERABLES.dst[e]] })),
    );
    return session;
}

/**
 * The node ids a rule holds, sorted.
 * @param session - The session.
 * @param where - The rule.
 * @returns The ids.
 */
async function nodesOf(session: GraphSession, where: RuleTree): Promise<string[]> {
    const resolved = await session.scope.resolve({ define: { kind: "rule", where, reading: "clipped" } });
    return [...resolved.nodes].map(String).sort();
}

/**
 * A node union of one branch.
 * @param start - Its start.
 * @param steps - Its steps.
 * @returns The leaf.
 */
function one(start: "all" | "none", steps: readonly UnionStep[]): UnionLeaf {
    return { kind: "union", side: "nodes", within: "graph", branches: [{ start, steps }] };
}

const DEGREE_6_TO_10: RuleTree = { kind: "range", attribute: "graphty.degree", min: 6, max: 10 };
const TOP_DEGREE: RuleTree = { kind: "threshold", path: "graphty.degree", top: 10 };
const STAFF: RuleTree = { kind: "categories", attribute: "data.role", values: ["staff"] };

/**
 * Every character's degree, read from the snapshot's edge list.
 * @returns The degree by id.
 */
function degrees(): Map<string, number> {
    const counts = new Map<string, number>(IDS.map((id) => [id, 0]));
    LES_MISERABLES.src.forEach((src, e) => {
        const dst = LES_MISERABLES.dst[e];
        counts.set(IDS[src], (counts.get(IDS[src]) ?? 0) + 1);
        counts.set(IDS[dst], (counts.get(IDS[dst]) ?? 0) + 1);
    });
    return counts;
}

/**
 * The neighbors of a character, and the character.
 * @param id - The character.
 * @returns The ids, sorted.
 */
function withNeighbors(id: string): string[] {
    const out = new Set([id]);
    LES_MISERABLES.src.forEach((src, e) => {
        const a = IDS[src];
        const b = IDS[LES_MISERABLES.dst[e]];
        if (a === id) {
            out.add(b);
        }

        if (b === id) {
            out.add(a);
        }
    });
    return [...out].sort();
}

describe("the union leaf", () => {
    it("adds two steps from None: the result is the union of what each step matches", async () => {
        const session = await lesMis();
        const union = await nodesOf(
            session,
            one("none", [
                { op: "add", rule: TOP_DEGREE },
                { op: "add", rule: STAFF },
            ]),
        );
        const each = new Set([...(await nodesOf(session, TOP_DEGREE)), ...(await nodesOf(session, STAFF))]);
        assert.deepEqual(union, [...each].sort());
        assert.isAbove(union.length, 10);
    });

    it("keeps and excepts from All, in order, over the whole graph", async () => {
        const session = await lesMis();
        const got = await nodesOf(
            session,
            one("all", [
                { op: "keep", rule: DEGREE_6_TO_10 },
                { op: "except", rule: STAFF },
            ]),
        );
        const want = IDS.filter((id, at) => {
            const degree = degrees().get(id) ?? 0;
            return degree >= 6 && degree <= 10 && ROLE(at) !== "staff";
        }).sort();
        assert.deepEqual(got, want);
        assert.isAbove(want.length, 0);
    });

    it("folds the branches that are on, and a branch switched off removes only its own members", async () => {
        const session = await lesMis();
        const a = { start: "all" as const, steps: [{ op: "keep" as const, rule: DEGREE_6_TO_10 }] };
        const b = { start: "none" as const, steps: [{ op: "add" as const, rule: withNeighborsRule("Valjean") }] };
        const both = await nodesOf(session, { kind: "union", side: "nodes", within: "graph", branches: [a, b] });
        const onlyA = await nodesOf(session, {
            kind: "union",
            side: "nodes",
            within: "graph",
            branches: [a, { ...b, on: false }],
        });
        const aAlone = await nodesOf(session, DEGREE_6_TO_10);
        assert.deepEqual(both, [...new Set([...aAlone, ...withNeighbors("Valjean")])].sort());
        assert.deepEqual(onlyA, aAlone);
    });

    it("an untouched range is inert: it changes nothing whatever its verb", async () => {
        const session = await lesMis();
        const untouched: RuleTree = { kind: "range", attribute: "graphty.degree" };
        assert.deepEqual(await nodesOf(session, one("all", [{ op: "keep", rule: untouched }])), [...IDS].sort());
        assert.deepEqual(await nodesOf(session, one("none", [{ op: "add", rule: untouched }])), []);
    });

    it("swapping two Keep steps on the base changes nothing", async () => {
        const session = await lesMis();
        const ab = await nodesOf(
            session,
            one("all", [
                { op: "keep", rule: DEGREE_6_TO_10 },
                { op: "keep", rule: STAFF },
            ]),
        );
        const ba = await nodesOf(
            session,
            one("all", [
                { op: "keep", rule: STAFF },
                { op: "keep", rule: DEGREE_6_TO_10 },
            ]),
        );
        assert.deepEqual(ab, ba);
    });

    it("ranks a step computed on So far over its input, and over the base otherwise", async () => {
        const session = await lesMis();
        const top3: RuleTree = { kind: "threshold", path: "graphty.degree", top: 3 };
        const onBase = await nodesOf(
            session,
            one("all", [
                { op: "keep", rule: STAFF },
                { op: "keep", rule: top3 },
            ]),
        );
        const onSoFar = await nodesOf(
            session,
            one("all", [
                { op: "keep", rule: STAFF },
                { op: "keep", rule: top3, computedOn: "so-far" },
            ]),
        );
        const staffByDegree = IDS.filter((_id, at) => ROLE(at) === "staff").sort(
            (x, y) => (degrees().get(y) ?? 0) - (degrees().get(x) ?? 0),
        );
        assert.isAtLeast(onSoFar.length, 3);
        assert.includeMembers(onSoFar, staffByDegree.slice(0, 1));
        assert.isBelow(onBase.length, onSoFar.length);
    });
});

/**
 * "within 1 hop of" one node.
 * @param id - The node.
 * @returns The leaf.
 */
function withNeighborsRule(id: NodeId): RuleTree {
    return { kind: "hops", of: { nodes: [id] }, max: 1 };
}

describe("the step leaves", () => {
    it("hops: within 1 hop of Valjean is Valjean and his neighbors; 0 hops is Valjean alone", async () => {
        const session = await lesMis();
        assert.deepEqual(
            await nodesOf(session, one("none", [{ op: "add", rule: withNeighborsRule("Valjean") }])),
            withNeighbors("Valjean"),
        );
        assert.deepEqual(
            await nodesOf(
                session,
                one("none", [{ op: "add", rule: { kind: "hops", of: { nodes: ["Valjean"] }, max: 0 } }]),
            ),
            ["Valjean"],
        );
        const connected = await nodesOf(
            session,
            one("none", [{ op: "add", rule: { kind: "hops", of: { nodes: ["Valjean"] } } }]),
        );
        assert.isAbove(connected.length, withNeighbors("Valjean").length);
    });

    it("touching: edges with either, both or exactly one end in the reference", async () => {
        const session = await lesMis();
        const count = async (ends: "either" | "both" | "one"): Promise<number> => {
            const leaf: UnionLeaf = {
                kind: "union",
                side: "edges",
                within: "graph",
                branches: [
                    {
                        start: "none",
                        steps: [{ op: "add", rule: { kind: "touching", of: { nodes: ["Valjean", "Javert"] }, ends } }],
                    },
                ],
            };
            return (await session.scope.count({ define: { kind: "rule", where: leaf, reading: "listed" } })).edges;
        };
        const either = await count("either");
        const both = await count("both");
        const oneEnd = await count("one");
        assert.strictEqual(either, both + oneEnd);
        assert.strictEqual(both, 1);
        assert.isAbove(oneEnd, 10);
    });

    it("nonempty and hovered-or-selected follow the selection: nothing at rest, everything with a lone selected node", async () => {
        const session = await lesMis();
        const leaf = one("all", [
            { op: "keep", rule: { kind: "nonempty", of: "hovered-or-selected" } },
            { op: "except", rule: { kind: "hops", of: "hovered-or-selected", max: 1 } },
        ]);
        assert.deepEqual(await nodesOf(session, leaf), []);

        await session.selection.apply({ nodes: ["Valjean"] });
        const faded = await nodesOf(session, leaf);
        assert.strictEqual(faded.length, IDS.length - withNeighbors("Valjean").length);

        session.selection.hover("Javert");
        assert.strictEqual((await nodesOf(session, leaf)).length, IDS.length - withNeighbors("Javert").length);
    });

    it("a chosen reference that holds no node matches nothing", async () => {
        const session = await lesMis();
        assert.deepEqual(
            await nodesOf(session, one("none", [{ op: "add", rule: { kind: "hops", of: "selection", max: 1 } }])),
            [],
        );
    });

    it("same-value: the elements sharing a value with the reference", async () => {
        const session = await lesMis();
        const got = await nodesOf(
            session,
            one("none", [{ op: "add", rule: { kind: "same-value", path: "data.role", as: { nodes: ["Myriel"] } } }]),
        );
        const myriel = ROLE(IDS.indexOf("Myriel"));
        assert.deepEqual(got, IDS.filter((_id, at) => ROLE(at) === myriel).sort());
    });

    it("by-size: the categories with a member count in range, counted over the base", async () => {
        const session = await lesMis();
        const staffCount = IDS.filter((_id, at) => ROLE(at) === "staff").length;
        const got = await nodesOf(
            session,
            one("none", [{ op: "add", rule: { kind: "by-size", path: "data.role", max: staffCount } }]),
        );
        assert.deepEqual(got, IDS.filter((_id, at) => ROLE(at) === "staff").sort());
        const largest = await nodesOf(
            session,
            one("none", [{ op: "add", rule: { kind: "by-size", path: "data.role", top: 1 } }]),
        );
        assert.deepEqual(largest, IDS.filter((_id, at) => ROLE(at) === "guest").sort());
    });
});

describe("the additions to existing leaves", () => {
    it("threshold: percentile and from low", async () => {
        const session = await lesMis();
        const lowest = await nodesOf(session, { kind: "threshold", path: "data.score", top: 2, from: "low" });
        assert.deepEqual(lowest, [IDS[1], IDS[2]].sort());
        const tenPercent = await nodesOf(session, { kind: "threshold", path: "data.score", percentile: 10 });
        const measured = IDS.filter((_id, at) => at % 5 !== 0).length;
        assert.strictEqual(tenPercent.length, Math.ceil(measured / 10));
    });

    it("range and threshold: missing include keeps the unmeasured", async () => {
        const session = await lesMis();
        const unmeasured = IDS.filter((_id, at) => at % 5 === 0).length;
        const above = await nodesOf(session, { kind: "range", attribute: "data.score", min: 1_000 });
        const withMissing = await nodesOf(session, {
            kind: "range",
            attribute: "data.score",
            min: 1_000,
            missing: "include",
        });
        assert.strictEqual(above.length, 0);
        assert.strictEqual(withMissing.length, unmeasured);
    });

    it("categories: match any and all read list values", async () => {
        const session = await lesMis();
        const both = await nodesOf(session, {
            kind: "categories",
            attribute: "data.tags",
            values: ["red", "blue"],
            match: "all",
        });
        const any = await nodesOf(session, {
            kind: "categories",
            attribute: "data.tags",
            values: ["blue"],
            match: "any",
        });
        assert.deepEqual(both, IDS.filter((_id, at) => at % 2 === 0).sort());
        assert.deepEqual(any, both);
    });

    it("degree paths read with no run", async () => {
        const session = await lesMis();
        const got = await nodesOf(session, DEGREE_6_TO_10);
        const want = IDS.filter((id) => {
            const d = degrees().get(id) ?? 0;
            return d >= 6 && d <= 10;
        }).sort();
        assert.deepEqual(got, want);
    });
});

/**
 * The refusal a call throws, or undefined.
 * @param call - The call.
 * @returns The error's details.
 */
async function refusal(call: () => unknown): Promise<Record<string, unknown> | undefined> {
    try {
        await call();
    } catch (error) {
        if (isGraphtyError(error)) {
            return { code: error.code, ...(error.details as Record<string, unknown>) };
        }

        throw error;
    }

    return undefined;
}

describe("the doors", () => {
    it("refuses a union inside a step, and a step leaf outside a union", async () => {
        const session = await lesMis();
        const nested = one("all", [{ op: "keep", rule: one("all", []) }]);
        assert.include(await refusal(() => nodesOf(session, nested)), {
            code: "E_BAD_COMMAND",
            reason: "nested-union",
        });
        assert.include(await refusal(() => nodesOf(session, withNeighborsRule("Valjean"))), {
            code: "E_BAD_COMMAND",
            reason: "reference-outside-union",
        });
    });

    it("refuses a filter condition whose union reads the visible graph", async () => {
        const session = await lesMis();
        const leaf: UnionLeaf = { ...one("all", [{ op: "keep", rule: STAFF }]), within: "visible" };
        assert.include(await refusal(() => session.visibility.addCondition({ effect: "keep", rule: leaf })), {
            code: "E_BAD_COMMAND",
            reason: "circular-scope",
        });
    });

    it("a filter condition keeps what a full-graph union holds", async () => {
        const session = await lesMis();
        await session.visibility.addCondition({ effect: "keep", rule: one("all", [{ op: "keep", rule: STAFF }]) });
        assert.deepEqual(
            [...session.visibility.nodes].map(String).sort(),
            IDS.filter((_id, at) => ROLE(at) === "staff").sort(),
        );
    });

    it("a style layer's union over the filtered graph follows the filter and the selection", async () => {
        const session = await lesMis();
        const leaf: UnionLeaf = {
            kind: "union",
            side: "nodes",
            within: "visible",
            branches: [{ start: "none", steps: [{ op: "add", rule: { kind: "hops", of: "selection", max: 1 } }] }],
        };
        const { id } = await session.styles.add({
            name: "Near the selection",
            target: "node",
            selector: { match: "rule", where: leaf },
            set: { "node.color": "#d33" },
        });
        assert.strictEqual(session.styles.counts(id).matched, 0);

        await session.selection.apply({ nodes: ["Valjean"] });
        await session.styles.settled();
        assert.strictEqual(session.styles.counts(id).matched, withNeighbors("Valjean").length);

        await session.visibility.addCondition({ effect: "keep", rule: STAFF });
        await session.styles.settled();
        const staffNear = withNeighbors("Valjean").filter((each) => ROLE(IDS.indexOf(each)) === "staff");
        assert.strictEqual(session.styles.counts(id).matched, staffNear.length);
    });
});
