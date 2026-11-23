/**
 * @file Corners of the source-steps build that the other source-steps files leave out, each driven
 * through the public session API: an edge row with no source end, reader edges to nodes no source
 * holds, a reader edit left unbound when its source goes, Make an edge through a field of node 1
 * that is not its key (matched, unmatched and fan-out, in both directions), a merge whose repeated
 * rows take the first or the last value, a reader node added twice, and a node time role over a
 * value that is not a time.
 */

import { assert, describe, it } from "vitest";

import { createGraphSession, type GraphSession } from "../../../src/session";

/**
 * A CSV input.
 * @param data - The CSV text.
 * @param name - Its name.
 * @returns What `import` and `stage` take.
 */
function csv(data: string, name: string): { type: string; config: { data: string }; name: string } {
    return { type: "csv", config: { data }, name };
}

/**
 * A session with the source-steps experiment on.
 * @returns The session.
 */
function stepsSession(): GraphSession {
    return createGraphSession({ features: ["source-steps"] });
}

/**
 * The ends of every edge, as `source>target`, sorted.
 * @param session - The session.
 * @returns The pairs.
 */
function pairs(session: GraphSession): string[] {
    return session.data
        .edges()
        .map((e) => `${String(e.source)}>${String(e.target)}`)
        .sort();
}

describe("source-steps build: edge rows and reader edits", () => {
    it("an edge row with no source end draws no edge and no node, and the step counts it", async () => {
        const session = stepsSession();
        await session.data.import(csv("source,target\n,b\na,c\n", "edges.csv"));
        assert.deepEqual(pairs(session), ["a>c"]);
        assert.isUndefined(session.data.node("b"), "the row's target end is not built either");
        assert.deepEqual(session.data.count(), { nodes: 2, edges: 1 });
        const [step] = session.data.steps();
        assert.strictEqual(step.buckets?.emptyKey, 1);
        assert.strictEqual(step.buckets?.newEdges, 1);
        session.dispose();
    });

    it("a reader edge to a node no source holds adds that node, and a second edge meets it", async () => {
        const session = stepsSession();
        await session.data.import(csv("source,target\na,b\n", "edges.csv"));
        await session.data.addEdges([
            { source: "a", target: "zz" },
            { source: "zz", target: "yy" },
        ]);
        assert.deepEqual(session.data.count(), { nodes: 4, edges: 3 });
        assert.deepEqual(pairs(session), ["a>b", "a>zz", "zz>yy"]);
        assert.isDefined(session.data.node("zz"));
        assert.isDefined(session.data.node("yy"));
        session.dispose();
    });

    it("a reader node added again under a key the reader already added keeps the first", async () => {
        const session = stepsSession();
        await session.data.import(csv("source,target\na,b\n", "edges.csv"));
        await session.data.addNodes([{ id: "q" }]);
        await session.data.addNodes([{ id: "q", x: 1 }]);
        assert.deepEqual(session.data.count(), { nodes: 3, edges: 1 });
        assert.deepEqual(session.data.node("q"), { id: "q" });
        session.dispose();
    });

    it("an edit of a node whose source is removed is reported unbound, and the node goes", async () => {
        const session = stepsSession();
        await session.data.import(csv("id,name\np1,Ann\n", "p.csv"), { type: "person" });
        await session.data.import(csv("id,name\nq1,Quin\n", "q.csv"), { type: "person", mode: "merge" });
        const [p] = session.data.sources().map((s) => s.key);
        await session.data.updateNodes([{ id: "p1", values: { name: "Zed" } }]);
        assert.strictEqual(session.data.node("p1")?.name, "Zed");
        const result = await session.data.removeSource(p);
        assert.deepEqual(result.removed, { nodes: 1, edges: 0 });
        const unbound = (result.issues ?? []).filter((i) => i.code === "W_REFERENCE_UNBOUND");
        assert.lengthOf(unbound, 1);
        assert.deepEqual(unbound[0]?.code === "W_REFERENCE_UNBOUND" ? unbound[0].params.ref : null, {
            space: "person",
            key: "p1",
        });
        assert.isUndefined(session.data.node("p1"));
        assert.strictEqual(session.data.node("q1")?.name, "Quin", "the other source's node stays");
        session.dispose();
    });
});

describe("source-steps build: Make an edge through a field that is not node 1's key", () => {
    const ACCOUNTS = "account_id,email\nA-1,a@x\nA-2,b@x\nA-3,b@x\n";
    // K-1 names one account, K-2 an email two accounts share, K-3 an email no account has
    const ALERTS = "alert_id,email\nK-1,a@x\nK-2,b@x\nK-3,c@x\n";

    for (const [direction, edge] of [
        ["into-from", "A-1>K-1"],
        ["from-into", "K-1>A-1"],
    ] as const) {
        it(`${direction}: one email meets one account, a shared email fans out and an unknown one is unmatched`, async () => {
            const session = stepsSession();
            const accounts = await session.data.stage(csv(ACCOUNTS, "accounts.csv"), {
                key: "account_id",
                type: "account",
            });
            await session.data.add(accounts);
            const alerts = await session.data.stage(csv(ALERTS, "alerts.csv"), { key: "alert_id", type: "alert" });
            await session.data.connect({
                from: { source: alerts, field: "email" },
                into: { source: accounts, field: "email" },
                direction,
                edgeType: "flags",
            });
            assert.deepEqual(pairs(session), [edge]);
            assert.deepEqual(session.data.count(), { nodes: 6, edges: 1 }, "every alert stays a node");
            const buckets = session.data.steps().at(-1)?.buckets;
            assert.strictEqual(buckets?.matched, 1);
            assert.strictEqual(buckets?.fanOut, 1, "b@x names two accounts, so K-2 is left out");
            assert.strictEqual(buckets?.unmatched, 1, "c@x names none");
            session.dispose();
        });
    }
});

describe("source-steps build: a merge's repeated rows", () => {
    for (const [repeated, alert, score, differ] of [
        ["first", "K-1", 5, 0],
        ["last", "K-2", 9, 2],
    ] as const) {
        it(`repeated ${repeated}: two alerts of one account give the ${repeated} one's values`, async () => {
            const session = stepsSession();
            await session.data.import(csv("account_id,holder\nA-1,Ann\nA-2,Bo\n", "accounts.csv"), {
                key: "account_id",
                type: "account",
            });
            const kyc = await session.data.stage(
                csv("alert,account_id,score\nK-1,A-1,5\nK-2,A-1,9\nK-3,A-2,\n", "kyc.csv"),
                {
                    key: "alert",
                    type: "alert",
                },
            );
            const [{ space }] = session.data.spaces();
            await session.data.merge({ from: { source: kyc, field: "account_id" }, into: { space }, repeated });
            assert.deepEqual(session.data.count(), { nodes: 2, edges: 0 }, "every alert folds into its account");
            const a1 = session.data.node("A-1", { space });
            assert.strictEqual(a1?.holder, "Ann");
            assert.strictEqual(a1?.alert, alert);
            assert.strictEqual(a1?.score, score);
            assert.strictEqual(session.data.node("A-2", { space })?.alert, "K-3");
            assert.strictEqual(session.data.steps().at(-1)?.buckets?.rowsDiffer, differ);
            session.dispose();
        });
    }
});

describe("source-steps build: a node time role", () => {
    it("a value that is not a time leaves its node untimed and times the rest", async () => {
        const session = stepsSession();
        await session.data.import(csv("id,when\na,2024-01-01T00:00:00Z\nb,soon\n", "n.csv"), { type: "thing" });
        const [{ key }] = session.data.sources();
        await session.data.setRole({ kind: "node", name: "when" }, "time", { source: key });
        const counts = session.data.valueCounts("graphty.time", { kind: "node" });
        assert.deepEqual(counts.values, [{ value: Date.parse("2024-01-01T00:00:00Z"), count: 1 }]);
        assert.strictEqual(counts.missing, 1);
        assert.strictEqual(session.data.node("b")?.when, "soon", "the cell is kept as read");
        session.dispose();
    });
});
