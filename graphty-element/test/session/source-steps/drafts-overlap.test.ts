/**
 * @file The key-overlap question on a draft (design design/data/multiple-data-sources-design.md,
 * section 5.5) under the source-steps experiment. Each case runs three ways alike: through
 * `data.add`, through a draft's `add`, and through a draft opened with `askOverlap`, which asks the
 * question, refuses its commit until it is answered, and takes the answer. Ported from the reference
 * model's roundtrips cases "second bank, Keep separate (5.5 conformance)", "second bank, Merge" and
 * "edge-only bank B: Add meets existing keys, never asks", review-round-9 "accounts.csv added after
 * the split meets only nodes edge ends built", and late-findings "Add of a staged source asks the
 * overlap question before and after save/reopen alike" and "a staged source's Type survives save
 * and reopen".
 */

import { assert, describe, it } from "vitest";

import { createGraphSession, type GraphSession, type SourceOverlapQuestion } from "../../../src/session";
import { ACCOUNTS, BANK_B, MERCHANTS, phase2, phase6, refused, spaces } from "./scenario";

/** How a test adds the staged source. */
type Way = "data.add" | "draft" | "asking draft";

const WAYS: readonly Way[] = ["data.add", "draft", "asking draft"];

/** Bank B: two accounts bank A's accounts.csv holds, one only its transactions name, one new; two edges. */
const BANK_B_PAIR = {
    type: "json",
    config: {
        data: JSON.stringify({
            nodes: [{ id: "A-1" }, { id: "A-2" }, { id: "A-3" }, { id: "B-7" }],
            edges: [
                { source: "A-1", target: "B-7" },
                { source: "A-2", target: "A-3" },
            ],
        }),
    },
    name: "bankB.json",
} as const;

/**
 * Add a staged source one way. The asking draft answers its question with `overlap` (keep separate
 * when absent), after checking the commit is refused until then.
 * @param session - The session.
 * @param source - The staged source.
 * @param way - How.
 * @param overlap - The answer.
 * @returns The questions the asking draft asked before its answer; empty for the other ways.
 */
async function addAs(
    session: GraphSession,
    source: string,
    way: Way,
    overlap?: "merge" | "separate",
): Promise<readonly SourceOverlapQuestion[]> {
    const options = overlap === undefined ? {} : { overlap };
    if (way === "data.add") {
        await session.data.add(source, options);
        return [];
    }
    if (way === "draft") {
        const d = session.data.draft();
        d.add(source, options);
        assert.deepStrictEqual(d.preview().questions, [], "a draft opened without askOverlap asks nothing");
        await d.commit();
        return [];
    }
    const d = session.data.draft({ askOverlap: true });
    d.add(source);
    const { questions } = d.preview();
    for (const q of questions) {
        const details = await refused(() => d.commit(), "E_OVERLAP_UNANSWERED");
        assert.deepStrictEqual(details, { space: q.params.space, source: q.params.source });
        d.answerOverlap(q.params.source, overlap ?? "separate");
    }
    assert.deepStrictEqual(d.preview().questions, [], "answered, nothing is open");
    await d.commit();
    return questions;
}

/**
 * The space a NodeId names: the key's one space, else the part before `:<key>`.
 * @param session - The session.
 * @param id - The NodeId.
 * @returns The space.
 */
function spaceOf(session: GraphSession, id: string): string {
    return session.data.ref(id)?.space ?? id.slice(0, id.lastIndexOf(":"));
}

/**
 * Phase 6 with bank B staged as accounts.
 * @returns The session, accounts.csv's source and bank B's.
 */
async function stagedBankB(): Promise<{ session: GraphSession; a: string; b: string }> {
    const { session, a } = await phase6();
    const b = await session.data.stage(BANK_B_PAIR, { type: "account" });
    return { session, a, b };
}

/**
 * Save a session and open the file in a fresh one with the experiment on.
 * @param session - The session to save; disposed.
 * @returns The opened session.
 */
async function reopened(session: GraphSession): Promise<GraphSession> {
    const { text } = await session.project.save();
    session.dispose();
    const q = createGraphSession({ features: ["source-steps"] });
    await q.project.open(text);
    return q;
}

/**
 * The nodes in a space a source supplies.
 * @param session - The session.
 * @param space - The space.
 * @param source - The source.
 * @returns How many.
 */
function suppliedIn(session: GraphSession, space: string, source: string): number {
    return session.data
        .nodes()
        .filter((n) => spaceOf(session, String(n.id)) === space && session.data.sourcesOf(n.id).includes(source))
        .length;
}

describe("source-steps drafts: the key-overlap question", () => {
    for (const way of WAYS) {
        it(`second bank, Keep separate (5.5 conformance), by ${way}: no edge of the source ends on a bank A node`, async () => {
            const { session, a, b } = await stagedBankB();
            const asked = await addAs(session, b, way);
            if (way === "asking draft") {
                assert.deepStrictEqual(asked, [
                    {
                        code: "W_SPACE_OVERLAP",
                        params: { space: "account", count: 2, of: 4, source: b, sources: [a] },
                    },
                ]);
            }
            const added = session.data.sources({ staged: true }).find((s) => s.key === b);
            assert.deepStrictEqual(added?.issues, [
                { code: "W_SPACE_OVERLAP", params: { space: "account", count: 2, of: 4 } },
            ]);
            assert.deepStrictEqual(spaces(session), {
                account: 4,
                merchant: 3,
                device: 2,
                [`source:${b}`]: 4,
            });
            const ends = session.data
                .edges()
                .filter((e) => session.data.sourcesOf(e.id, { kind: "edge" }).includes(b))
                .flatMap((e) => [String(e.source), String(e.target)]);
            assert.lengthOf(ends, 4);
            assert.isTrue(ends.every((id) => spaceOf(session, id) === `source:${b}`));
            assert.isFalse(ends.some((id) => spaceOf(session, id) === "account"));
            session.dispose();
        });

        it(`second bank, Merge, by ${way}: its meeting accounts are bank A's nodes`, async () => {
            const { session, a, b } = await stagedBankB();
            await addAs(session, b, way, "merge");
            const shared = session.data
                .nodes()
                .filter((n) => {
                    const by = session.data.sourcesOf(n.id);
                    return by.includes(a) && by.includes(b);
                })
                .map((n) => String(n.id));
            assert.deepStrictEqual(shared.sort(), ["A-1", "A-2"], "the two keys the question counted");
            assert.strictEqual(spaces(session).account, 5, "B-7 joins them in account");
            assert.isUndefined(spaces(session)[`source:${b}`]);
            const ends = session.data
                .edges()
                .filter((e) => session.data.sourcesOf(e.id, { kind: "edge" }).includes(b))
                .flatMap((e) => [String(e.source), String(e.target)]);
            assert.isTrue(
                ends.every((id) => spaceOf(session, id) === "account"),
                "its edge ends follow",
            );
            session.dispose();
        });

        it(`edge-only bank B, by ${way}: Add meets existing keys, never asks; its own end space keeps it apart`, async () => {
            const { session } = await phase6();
            const m = await session.data.stage(
                { type: "csv", config: { data: MERCHANTS }, name: "merchants.csv" },
                { key: "merchant_id", type: "merchant" },
            );
            await session.data.merge({ from: { source: m, field: "merchant_id" }, into: { space: "merchant" } });
            const b = await session.data.stage(
                { type: "csv", config: { data: BANK_B }, name: "bankB.csv" },
                {
                    edges: {
                        from: { column: "account_id", space: "bankB-account" },
                        to: { column: "merchant_id", space: "merchant" },
                        id: "txn_id",
                    },
                },
            );
            const asked = await addAs(session, b, way);
            assert.deepStrictEqual(asked, []);
            assert.isUndefined(session.data.sources({ staged: true }).find((s) => s.key === b)?.issues);
            assert.deepStrictEqual(spaces(session), {
                account: 4,
                merchant: 4,
                device: 2,
                "bankB-account": 2,
            });
            session.dispose();
        });

        it(`5.5: accounts.csv added after the split, by ${way}, meets only nodes edge ends built, so it asks nothing`, async () => {
            const { session, t } = await phase2();
            assert.isTrue(
                session.data.sourcesOf("A-1").includes(t),
                "precondition: transactions.csv supplies the account (holder moved onto it)",
            );
            const a = await session.data.stage(
                { type: "csv", config: { data: ACCOUNTS }, name: "accounts.csv" },
                { key: "account_id", type: "account" },
            );
            const asked = await addAs(session, a, way);
            assert.deepStrictEqual(asked, []);
            assert.isUndefined(session.data.sources({ staged: true }).find((s) => s.key === a)?.issues);
            session.dispose();
        });

        it(`settled (5.1), by ${way}: Add of a staged source asks the overlap question before and after save/reopen alike`, async () => {
            for (const reopen of [false, true]) {
                const staged = await stagedBankB();
                const session = reopen ? await reopened(staged.session) : staged.session;
                const asked = await addAs(session, staged.b, way);
                const issues = session.data.sources({ staged: true }).find((s) => s.key === staged.b)?.issues ?? [];
                assert.isTrue(
                    issues.some((i) => i.code === "W_SPACE_OVERLAP"),
                    `reopened=${String(reopen)}: the question is asked`,
                );
                if (way === "asking draft") {
                    assert.lengthOf(asked, 1, `reopened=${String(reopen)}: the draft asks it`);
                }
                assert.strictEqual(
                    suppliedIn(session, "account", staged.b),
                    0,
                    `reopened=${String(reopen)}: Keep separate by default`,
                );
                session.dispose();
            }
        });

        it(`settled (5.1), by ${way}: a staged source's Type survives save and reopen`, async () => {
            const { session, b } = await stagedBankB();
            const q = await reopened(session);
            await addAs(q, b, way, "separate");
            const own = q.data.nodes().filter((n) => spaceOf(q, String(n.id)) === `source:${b}`);
            assert.isAbove(own.length, 0);
            assert.isTrue(
                own.every(
                    (n) =>
                        q.data.lineage({ space: `source:${b}`, key: String(n.id).split(":").at(-1) ?? "" })?.type ===
                        "account",
                ),
                "bank B's own accounts keep the staged Type",
            );
            q.dispose();
        });
    }

    it("an answer can be changed and taken back until the commit", async () => {
        const { session, b } = await stagedBankB();
        const d = session.data.draft({ askOverlap: true });
        d.add(b);
        d.answerOverlap(b, "merge");
        assert.deepStrictEqual(d.preview().questions, []);
        assert.strictEqual(d.preview().after.nodes - d.preview().before.nodes, 1, "only B-7 is new");
        d.answerOverlap(b, "separate");
        assert.strictEqual(d.preview().after.nodes - d.preview().before.nodes, 4, "all four in their own space");
        assert.isTrue(d.undo());
        assert.strictEqual(d.preview().after.nodes - d.preview().before.nodes, 1, "back to Merge");
        assert.isTrue(d.undo());
        assert.lengthOf(d.preview().questions, 1, "back to open");
        await refused(() => d.commit(), "E_OVERLAP_UNANSWERED");
        d.answerOverlap(b, "merge");
        await d.commit();
        assert.strictEqual(spaces(session).account, 5);
        await session.undo();
        assert.strictEqual(
            session.data.sources({ staged: true }).find((s) => s.key === b)?.state,
            "staged",
            "one undo step",
        );
        session.dispose();
    });

    it("a question goes with its source: removed or never added, nothing is open", async () => {
        const { session, b } = await stagedBankB();
        const d = session.data.draft({ askOverlap: true });
        d.add(b);
        assert.lengthOf(d.preview().questions, 1);
        d.removeSource(b);
        assert.deepStrictEqual(d.preview().questions, []);
        await refused(() => Promise.resolve(d.answerOverlap(b, "merge")), "E_BAD_COMMAND");
        d.dispose();
        session.dispose();
    });

    it("an add given an overlap answers it at once, and answering a source never asked is refused", async () => {
        const { session, b } = await stagedBankB();
        const d = session.data.draft({ askOverlap: true });
        d.add(b, { overlap: "merge" });
        assert.deepStrictEqual(d.preview().questions, []);
        const details = await refused(() => Promise.resolve(d.answerOverlap(b, "separate")), "E_BAD_COMMAND");
        assert.deepStrictEqual(details, { reason: "no-question", source: b });
        await d.commit();
        assert.strictEqual(spaces(session).account, 5);
        session.dispose();
    });

    it("a re-add given an overlap replaces the question its earlier add asked", async () => {
        const { session, b } = await stagedBankB();
        const d = session.data.draft({ askOverlap: true });
        d.add(b);
        assert.lengthOf(d.preview().questions, 1);
        d.removeStep(d.steps().length - 1);
        d.add(b, { overlap: "merge" });
        assert.deepStrictEqual(d.preview().questions, [], "the re-add answered it");
        await refused(() => Promise.resolve(d.answerOverlap(b, "separate")), "E_BAD_COMMAND");
        await d.commit();
        assert.strictEqual(spaces(session).account, 5, "merged, as the re-add said");
        session.dispose();
    });

    /**
     * Phase 6 with bank B and bank C (the same keys) staged as accounts.
     * @returns The session, accounts.csv's source, bank B's and bank C's.
     */
    async function stagedBankBC(): Promise<{ session: GraphSession; a: string; b: string; c: string }> {
        const { session, a, b } = await stagedBankB();
        const c = await session.data.stage({ ...BANK_B_PAIR, name: "bankC.json" }, { type: "account" });
        return { session, a, b, c };
    }

    /**
     * A source's issues as `data.sources()` lists them.
     * @param session - The session.
     * @param id - The source.
     * @returns Its issues.
     */
    function issuesOf(session: GraphSession, id: string): unknown {
        return session.data.sources({ staged: true }).find((s) => s.key === id)?.issues;
    }

    it("two overlapping sources in one draft: an answer recounts the later question, and the commit matches data.add", async () => {
        const seq = await stagedBankBC();
        await seq.session.data.add(seq.b, { overlap: "merge" });
        await seq.session.data.add(seq.c, { overlap: "merge" });

        const { session, a, b, c } = await stagedBankBC();
        const d = session.data.draft({ askOverlap: true });
        d.add(b);
        d.add(c);
        d.answerOverlap(b, "merge");
        assert.deepStrictEqual(
            d.preview().questions.map((q) => q.params),
            [{ space: "account", count: 4, of: 4, source: c, sources: [a, b] }],
            "C now meets all four keys, bank A's and bank B's",
        );
        d.answerOverlap(c, "merge");
        await d.commit();
        assert.deepStrictEqual(issuesOf(session, c), issuesOf(seq.session, seq.c));
        assert.deepStrictEqual(issuesOf(session, b), issuesOf(seq.session, seq.b));
        assert.deepStrictEqual(spaces(session), spaces(seq.session));
        seq.session.dispose();
        session.dispose();
    });

    it("an asked source answered merge after one kept separate carries the issues data.add gives it", async () => {
        const seq = await stagedBankBC();
        await seq.session.data.add(seq.b);
        await seq.session.data.add(seq.c, { overlap: "merge" });

        const { session, b, c } = await stagedBankBC();
        await session.data.add(b);
        const d = session.data.draft({ askOverlap: true });
        d.add(c);
        d.answerOverlap(c, "merge");
        await d.commit();
        assert.deepStrictEqual(issuesOf(session, c), issuesOf(seq.session, seq.c));
        const { [`source:${seq.b}`]: kept, ...rest } = spaces(seq.session);
        assert.deepStrictEqual(spaces(session), { ...rest, [`source:${b}`]: kept });
        seq.session.dispose();
        session.dispose();
    });

    /**
     * Phase 6 with bank B (two of bank A's accounts and B-7) and bank C (B-7 and C-9) staged as
     * accounts: C meets only B-7, a key bank B brings.
     * @returns The session, accounts.csv's source, bank B's and bank C's.
     */
    async function stagedChain(): Promise<{ session: GraphSession; a: string; b: string; c: string }> {
        const { session, a } = await phase6();
        const json = (nodes: readonly string[], edge: readonly [string, string], name: string) =>
            ({
                type: "json",
                config: {
                    data: JSON.stringify({
                        nodes: nodes.map((id) => ({ id })),
                        edges: [{ source: edge[0], target: edge[1] }],
                    }),
                },
                name,
            }) as const;
        const b = await session.data.stage(json(["A-1", "A-2", "B-7"], ["A-1", "B-7"], "bankB.json"), {
            type: "account",
        });
        const c = await session.data.stage(json(["B-7", "C-9"], ["B-7", "C-9"], "bankC.json"), { type: "account" });
        return { session, a, b, c };
    }

    it("an answer that brings a source's keys to a later source asks that source, as data.add would", async () => {
        const seq = await stagedChain();
        await seq.session.data.add(seq.b, { overlap: "merge" });
        await seq.session.data.add(seq.c);

        const { session, b, c } = await stagedChain();
        const d = session.data.draft({ askOverlap: true });
        d.add(b);
        d.add(c);
        assert.deepStrictEqual(
            d.preview().questions.map((q) => q.params.source),
            [b],
            "kept separate, bank B leaves C nothing to meet",
        );
        d.answerOverlap(b, "merge");
        assert.deepStrictEqual(
            d.preview().questions.map((q) => q.params),
            [{ space: "account", count: 1, of: 2, source: c, sources: [b] }],
            "merged, bank B's B-7 is in account, and C meets it",
        );
        await refused(() => d.commit(), "E_OVERLAP_UNANSWERED");
        d.answerOverlap(c, "separate");
        await d.commit();
        assert.deepStrictEqual(issuesOf(session, c), issuesOf(seq.session, seq.c));
        assert.deepStrictEqual(issuesOf(session, b), issuesOf(seq.session, seq.b));
        const { [`source:${seq.c}`]: kept, ...rest } = spaces(seq.session);
        assert.deepStrictEqual(spaces(session), { ...rest, [`source:${c}`]: kept });
        seq.session.dispose();
        session.dispose();
    });

    it("an answer that takes away what a later source met closes its question", async () => {
        const seq = await stagedChain();
        await seq.session.data.add(seq.b, { overlap: "separate" });
        await seq.session.data.add(seq.c);

        const { session, b, c } = await stagedChain();
        const d = session.data.draft({ askOverlap: true });
        d.add(b);
        d.answerOverlap(b, "merge");
        d.add(c);
        assert.deepStrictEqual(
            d.preview().questions.map((q) => q.params),
            [{ space: "account", count: 1, of: 2, source: c, sources: [b] }],
        );
        d.answerOverlap(b, "separate");
        assert.deepStrictEqual(d.preview().questions, [], "C meets nothing now");
        await d.commit();
        assert.deepStrictEqual(issuesOf(session, c), issuesOf(seq.session, seq.c));
        assert.deepStrictEqual(issuesOf(session, b), issuesOf(seq.session, seq.b));
        const { [`source:${seq.b}`]: kept, ...rest } = spaces(seq.session);
        assert.deepStrictEqual(spaces(session), { ...rest, [`source:${b}`]: kept });
        seq.session.dispose();
        session.dispose();
    });

    /**
     * The spaces a session holds, each source's own space named by the bank it is.
     * @param session - The session.
     * @param named - Each source and the name to give its own space.
     * @returns How many nodes each space holds.
     */
    function namedSpaces(session: GraphSession, named: Readonly<Record<string, string>>): Record<string, number> {
        return Object.fromEntries(
            Object.entries(spaces(session)).map(([space, n]) => {
                const own = Object.entries(named).find(([id]) => space === `source:${id}`);
                return [own === undefined ? space : `source:${own[1]}`, n];
            }),
        );
    }

    it("an add given Keep separate stays separate when a later answer brings keys to it, as data.add keeps it", async () => {
        const seq = await stagedChain();
        await seq.session.data.add(seq.b, { overlap: "merge" });
        await seq.session.data.add(seq.c, { overlap: "separate" });

        const { session, b, c } = await stagedChain();
        const d = session.data.draft({ askOverlap: true });
        d.add(b);
        d.add(c, { overlap: "separate" });
        d.answerOverlap(b, "merge");
        assert.deepStrictEqual(d.preview().questions, [], "C's answer was given, so nothing is asked");
        await refused(() => Promise.resolve(d.answerOverlap(c, "merge")), "E_BAD_COMMAND");
        await d.commit();
        assert.deepStrictEqual(
            namedSpaces(session, { [b]: "B", [c]: "C" }),
            namedSpaces(seq.session, { [seq.b]: "B", [seq.c]: "C" }),
        );
        assert.deepStrictEqual(issuesOf(session, c), issuesOf(seq.session, seq.c));
        assert.deepStrictEqual(issuesOf(session, b), issuesOf(seq.session, seq.b));
        seq.session.dispose();
        session.dispose();
    });

    it("an add given Keep separate takes the proposed space when a later answer takes away what it met", async () => {
        const seq = await stagedChain();
        await seq.session.data.add(seq.b, { overlap: "separate" });
        await seq.session.data.add(seq.c, { overlap: "separate" });

        const { session, b, c } = await stagedChain();
        const d = session.data.draft({ askOverlap: true });
        d.add(b);
        d.answerOverlap(b, "merge");
        d.add(c, { overlap: "separate" });
        d.answerOverlap(b, "separate");
        assert.deepStrictEqual(d.preview().questions, []);
        await d.commit();
        assert.deepStrictEqual(
            namedSpaces(session, { [b]: "B", [c]: "C" }),
            namedSpaces(seq.session, { [seq.b]: "B", [seq.c]: "C" }),
        );
        assert.deepStrictEqual(issuesOf(session, c), issuesOf(seq.session, seq.c));
        assert.deepStrictEqual(issuesOf(session, b), issuesOf(seq.session, seq.b));
        seq.session.dispose();
        session.dispose();
    });

    it("an add given Merge follows a later answer as data.add would", async () => {
        const seq = await stagedChain();
        await seq.session.data.add(seq.b, { overlap: "merge" });
        await seq.session.data.add(seq.c, { overlap: "merge" });

        const { session, b, c } = await stagedChain();
        const d = session.data.draft({ askOverlap: true });
        d.add(b);
        d.add(c, { overlap: "merge" });
        d.answerOverlap(b, "merge");
        assert.deepStrictEqual(d.preview().questions, []);
        await d.commit();
        assert.deepStrictEqual(
            namedSpaces(session, { [b]: "B", [c]: "C" }),
            namedSpaces(seq.session, { [seq.b]: "B", [seq.c]: "C" }),
        );
        assert.deepStrictEqual(issuesOf(session, c), issuesOf(seq.session, seq.c));
        seq.session.dispose();
        session.dispose();
    });

    /**
     * Bank B added and merged, then bank C added and asked about B-7, in a draft opened with
     * `askOverlap`; and a session where only bank C was added, as the draft is about to leave it.
     * @returns The draft's session, bank B, bank C and the draft; the sequential session and bank C.
     */
    async function chainAskedOfC() {
        const seq = await stagedChain();
        await seq.session.data.add(seq.c);
        const { session, b, c } = await stagedChain();
        const d = session.data.draft({ askOverlap: true });
        d.add(b);
        d.answerOverlap(b, "merge");
        d.add(c);
        assert.deepStrictEqual(
            d.preview().questions.map((q) => q.params),
            [{ space: "account", count: 1, of: 2, source: c, sources: [b] }],
        );
        return { session, b, c, d, seq };
    }

    for (const how of ["removeSource", "removeStep"] as const) {
        it(`${how} of the source a later one met closes that one's question, as data.add asks nothing`, async () => {
            const { session, b, c, d, seq } = await chainAskedOfC();
            if (how === "removeSource") {
                d.removeSource(b);
            } else {
                const step = d.steps().find((row) => row.op === "join.add" && row.source === b);
                assert.isDefined(step);
                d.removeStep(step.index);
            }
            assert.deepStrictEqual(d.preview().questions, [], "C meets nothing now");
            await d.commit();
            assert.deepStrictEqual(issuesOf(session, c), issuesOf(seq.session, seq.c));
            assert.deepStrictEqual(
                namedSpaces(session, { [b]: "B", [c]: "C" }),
                namedSpaces(seq.session, { [seq.b]: "B", [seq.c]: "C" }),
            );
            seq.session.dispose();
            session.dispose();
        });
    }

    it("a draft's import asks the question as its add does", async () => {
        const { session } = await phase6();
        const d = session.data.draft({ askOverlap: true });
        const b = await d.import(BANK_B_PAIR, { type: "account" });
        assert.deepStrictEqual(
            d.preview().questions.map((q) => [q.params.source, q.params.count]),
            [[b, 2]],
        );
        d.answerOverlap(b, "merge");
        await d.commit();
        assert.strictEqual(spaces(session).account, 5);
        session.dispose();
    });
});
