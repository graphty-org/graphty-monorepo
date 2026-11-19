/**
 * @file The acts under the source-steps experiment -- Merge, Make an edge, Extract, Move columns,
 * Rename, pick and Use, deleting a step and Add -- ported from the reference model's cases: phases
 * 2, 6, 11 and 12; roundtrips "second bank, Merge", "reader edits" and "Make an edge (3.6
 * conformance)"; type-rules-and-untyped-sources "Only 2 Keep" and "Only 2 Drop";
 * delete-join-then-add; late findings settled 3.6, 4.3 and 5.2/9.1; review round 3 (weighted
 * transfers plus a Make an edge) and round 8 (3.1); settled mechanisms "Rename" and "reader edits";
 * rename-collision-and-copy-path 4.4; reference-reopen-and-rename 4.4.
 */

import { assert, describe, it } from "vitest";

import { createGraphSession, type GraphSession } from "../../../src/session";

const TRANSACTIONS = [
    "txn_id,account_id,merchant_id,amount,holder_name,merchant_name,category,device_id,os",
    "T-1,A-1,M-1,10,Ann,Shop,food,D-1,ios",
    "T-2,A-1,M-2,20,Ann,Cafe,food,D-1,ios",
    "T-3,A-2,M-1,5,Bo,Shop,food,,",
    "T-4,A-3,M-3,7,Cy,Cash,atm,D-2,android",
].join("\n");

const ACCOUNTS = ["account_id,holder,email,opened", "A-1,Ann,a@x,2020", "A-2,Bob,b@x,2021", "A-9,Dee,d@x,2022"].join(
    "\n",
);

const MERCHANTS = ["merchant_id,city", "M-1,Oslo", "M-2,Bergen"].join("\n");

const BANK_B = ["txn_id,account_id,merchant_id,amount", "X-1,A-1,M-1,4", "X-2,B-7,M-9,6"].join("\n");

const KYC = ["alert_id,account_id,score", "K-0,A-1,5", "K-1,A-2,3", "K-2,A-77,1"].join("\n");

/**
 * Assert that a call is refused with a code.
 * @param call - The call.
 * @param code - The code.
 * @returns The error's details.
 */
async function refused(call: () => Promise<unknown>, code: string): Promise<Record<string, unknown>> {
    let caught: unknown = null;
    try {
        await call();
    } catch (error) {
        caught = error;
    }
    assert.strictEqual((caught as { code?: string } | null)?.code, code);
    return (caught as { details?: Record<string, unknown> }).details ?? {};
}

/**
 * Load an edge file under the experiment.
 * @param session - The session.
 * @param data - The CSV.
 * @param name - Its name.
 * @param mode - `"merge"` to add it beside what is loaded.
 * @returns The source's id.
 */
async function edgeFile(session: GraphSession, data: string, name: string, mode?: "merge"): Promise<string> {
    await session.data.import(
        { type: "csv", config: { data }, name },
        {
            ...(mode === undefined ? {} : { mode }),
            edges: {
                from: { column: "account_id", space: "account" },
                to: { column: "merchant_id", space: "merchant" },
                id: "txn_id",
            },
        },
    );
    return session.data.sources().at(-1)?.key ?? "";
}

/**
 * Phase 1: the transactions draw at once, their ends typed by end rules.
 * @returns The session and the transactions' source.
 */
async function phase1(): Promise<{ session: GraphSession; t: string }> {
    const session = createGraphSession({ features: ["source-steps"] });
    const t = await edgeFile(session, TRANSACTIONS, "transactions.csv");
    await session.data.declareType({ name: "account", kind: "node", rules: [{ source: t, end: "source" }] });
    await session.data.declareType({ name: "merchant", kind: "node", rules: [{ source: t, end: "target" }] });
    await session.data.declareType({ name: "transfer", kind: "edge", rules: [{ source: t }] });
    return { session, t };
}

/**
 * Phase 2: holder onto accounts, merchant fields onto merchants, devices extracted.
 * @returns The session, the transactions' source and the devices' part.
 */
async function phase2(): Promise<{ session: GraphSession; t: string; part: number }> {
    const { session, t } = await phase1();
    await session.data.moveColumns(t, { columns: ["holder_name"], to: "source" });
    await session.data.moveColumns(t, { columns: ["merchant_name", "category"], to: "target" });
    const part = await session.data.extract(t, { column: "device_id", type: "device", columns: ["os"] });
    await session.data.declareType({ name: "used", kind: "edge", rules: [{ source: t, part }] });
    return { session, t, part };
}

/**
 * Phase 6: holder renamed so the columns meet, accounts.csv staged and merged on account_id.
 * @param unmatchedFrom - What an account no transaction names does.
 * @returns The session and the two sources.
 */
async function phase6(unmatchedFrom?: "keep" | "drop"): Promise<{ session: GraphSession; t: string; a: string }> {
    const { session, t } = await phase2();
    await session.data.renameColumn({ kind: "edge", name: "holder_name" }, "holder", { source: t });
    const a = await session.data.stage(
        { type: "csv", config: { data: ACCOUNTS }, name: "accounts.csv" },
        { key: "account_id", type: "account" },
    );
    await session.data.merge({
        from: { source: a, field: "account_id" },
        into: { space: "account" },
        ...(unmatchedFrom === undefined ? {} : { unmatchedFrom }),
    });
    return { session, t, a };
}

/**
 * Merchants merged, then bank B staged and added with no join.
 * @returns The session and the sources.
 */
async function full(): Promise<{ session: GraphSession; t: string; a: string; m: string; b: string }> {
    const r = await phase6();
    const { session } = r;
    const m = await session.data.stage(
        { type: "csv", config: { data: MERCHANTS }, name: "merchants.csv" },
        { key: "merchant_id", type: "merchant" },
    );
    await session.data.merge({ from: { source: m, field: "merchant_id" }, into: { space: "merchant" } });
    const b = await edgeFile(session, BANK_B, "bankB.csv", "merge");
    return { ...r, m, b };
}

/**
 * How many nodes of each space the graph holds.
 * @param session - The session.
 * @returns Nodes by space.
 */
function spaces(session: GraphSession): Record<string, number> {
    return Object.fromEntries(session.data.spaces().map((s) => [s.space, s.nodes]));
}

/**
 * The NodeIds of an edge's ends.
 * @param session - The session.
 * @returns `source>target` for every edge.
 */
function ends(session: GraphSession): string[] {
    return session.data
        .edges()
        .map((e) => `${String(e.source)}>${String(e.target)}`)
        .sort();
}

describe("source-steps: the acts", () => {
    it("phase 2: split one file into accounts, merchants and devices", async () => {
        const { session, t, part } = await phase2();
        assert.deepStrictEqual(spaces(session), { account: 3, merchant: 3, device: 2 });
        // Four transfers plus one used edge per account and device pair; the empty device is no node.
        assert.strictEqual(session.data.edges().length, 6);
        const extracted = session.data.steps().find((s) => s.buckets?.part === part);
        assert.strictEqual(extracted?.buckets?.emptyKey, 1, "an empty end never becomes a node");
        const acct = { space: "account", key: "A-1" };
        assert.deepStrictEqual(session.data.lineage(acct)?.supplied, [t], "the values step makes T a supplier");
        assert.strictEqual(session.data.values(acct, "holder_name")?.shown, "Ann");
        assert.isUndefined(
            session.data.edges().find((e) => e.txn_id === "T-1")?.merchant_name,
            "a moved column leaves the edges",
        );
        assert.isNotNull(session.data.lineage({ load: t, key: `${String(part)}/A-1|D-1` }), "keyed <part>/<from>|<to>");
        // Extract writes the node rule { source, part, end: target } (late findings, settled 4.3).
        const device = session.data.types().find((type) => type.name === "device");
        assert.deepStrictEqual(device?.rules, [{ source: t, part, end: "target" }]);
        assert.deepStrictEqual(session.data.lineage({ space: "device", key: "D-1" })?.supplied, [t]);
        session.dispose();
    });

    it("each act is one undo step", async () => {
        const { session, t } = await phase1();
        const steps = session.data.steps().length;
        const history = session.history.steps.length;
        await session.data.moveColumns(t, { columns: ["holder_name"], to: "source" });
        await session.data.extract(t, { column: "device_id", type: "device", columns: ["os"] });
        assert.lengthOf(session.history.steps, history + 2);
        assert.strictEqual(session.data.steps().length, steps + 3);
        await session.undo();
        assert.strictEqual(session.data.steps().length, steps + 1);
        assert.isUndefined(spaces(session).device);
        await session.undo();
        assert.strictEqual(session.data.steps().length, steps);
        session.dispose();
    });

    it("phase 6: after the merge, one undo step returns accounts.csv to staged", async () => {
        const { session, t, a } = await phase6();
        assert.deepStrictEqual(spaces(session), { account: 4, merchant: 3, device: 2 });
        assert.strictEqual(session.data.sources().find((s) => s.key === a)?.state, "built");
        const ref = { space: "account", key: "A-1" };
        const lineage = session.data.lineage(ref);
        assert.deepStrictEqual(lineage?.supplied, [t, a]);
        assert.deepInclude(lineage?.aliases ?? [], { space: `source:${a}`, key: "A-1" });
        const holder = session.data.values({ space: "account", key: "A-2" }, "holder");
        assert.deepStrictEqual(
            holder?.list.map((x) => x.source),
            [t, a],
        );
        assert.strictEqual(holder?.origin, t, "Keep: the held value stays");
        assert.strictEqual(session.data.cell(ref, "email")?.state, "value");
        assert.strictEqual(session.data.cell(ref, "nonexistent")?.state, "not-carried");
        await session.undo();
        assert.strictEqual(session.data.sources().find((s) => s.key === a)?.state, "staged");
        assert.deepStrictEqual(spaces(session), { account: 3, merchant: 3, device: 2 });
        session.dispose();
    });

    it("Only 2: Drop leaves out an account no transaction names; Keep keeps it", async () => {
        const kept = await phase6("keep");
        const dropped = await phase6("drop");
        assert.strictEqual(spaces(kept.session).account, 4);
        assert.strictEqual(spaces(dropped.session).account, 3);
        assert.isNull(dropped.session.data.lineage({ space: "account", key: "A-9" }));
        // The merged account carries accounts.csv's values either way.
        for (const { session } of [kept, dropped]) {
            assert.strictEqual(session.data.values({ space: "account", key: "A-1" }, "opened")?.shown, 2020);
            session.dispose();
        }
    });

    it("conflicts, pick and Use: a pick is a reader edit naming the source, one undo step", async () => {
        const { session, a } = await phase6();
        const ref = { space: "account", key: "A-2" };
        const open = session.data.conflicts({ column: "holder", only: "open" });
        assert.deepStrictEqual(
            open.map((c) => c.ref),
            [ref],
        );
        assert.strictEqual(open[0]?.rule, "keep");
        const history = session.history.steps.length;
        await session.data.pick(ref, "holder", a);
        assert.lengthOf(session.history.steps, history + 1);
        assert.strictEqual(session.data.values(ref, "holder")?.origin, "reader");
        assert.strictEqual(session.data.values(ref, "holder")?.shown, "Bob");
        assert.deepStrictEqual(session.data.cell(ref, "holder"), { state: "value", value: "Bob", edited: true });
        assert.strictEqual(session.data.edits().at(-1)?.picked, a);
        assert.lengthOf(session.data.conflicts({ column: "holder", only: "decided" }), 1);
        assert.strictEqual(session.data.node("A-2")?.holder, "Bob");
        await session.undo();
        assert.strictEqual(session.data.values(ref, "holder")?.shown, "Bo");
        // Use writes the same reader edit.
        await session.data.use(ref, "holder", a);
        assert.strictEqual(session.data.edits().at(-1)?.picked, a);
        await refused(() => session.data.pick(ref, "account_id", a), "E_EDIT_ROLE_COLUMN");
        await refused(() => session.data.pick(ref, "nothing", a), "E_BAD_COMMAND");
        session.dispose();
    });

    it("phase 11: removing merchants.csv gives the data without it", async () => {
        const { session, m } = await full();
        const withM = spaces(session);
        assert.strictEqual(session.data.values({ space: "merchant", key: "M-1" }, "city")?.shown, "Oslo");
        await session.data.removeSource(m);
        const without = await phase6();
        await edgeFile(without.session, BANK_B, "bankB.csv", "merge");
        assert.deepStrictEqual(spaces(session), spaces(without.session));
        assert.deepStrictEqual(ends(session), ends(without.session));
        assert.isUndefined(session.data.node("M-1")?.city);
        await session.undo();
        assert.deepStrictEqual(spaces(session), withM);
        session.dispose();
        without.session.dispose();
    });

    it("phase 12: deleting bank B's add step gives the graph without bank B", async () => {
        const { session, b } = await full();
        const before = ends(session).length;
        const index = session.data.steps().findIndex((s) => s.source === b);
        await session.data.removeStep(index);
        assert.strictEqual(ends(session).length, before - 2);
        assert.strictEqual(session.data.sources().find((s) => s.key === b)?.state, "staged");
        assert.isNull(session.data.lineage({ space: "account", key: "B-7" }));
        await session.undo();
        assert.strictEqual(ends(session).length, before);
        session.dispose();
    });

    it("deleting a merge's two steps returns accounts.csv to staged, and Add then meets T's accounts as before", async () => {
        const fresh = await phase2();
        const a1 = await fresh.session.data.stage(
            { type: "csv", config: { data: ACCOUNTS }, name: "accounts.csv" },
            { key: "account_id", type: "account" },
        );
        await fresh.session.data.add(a1);
        const merged = await phase2();
        const a2 = await merged.session.data.stage(
            { type: "csv", config: { data: ACCOUNTS }, name: "accounts.csv" },
            { key: "account_id", type: "account" },
        );
        await merged.session.data.merge({ from: { source: a2, field: "account_id" }, into: { space: "account" } });
        const at = (op: string): number => merged.session.data.steps().findIndex((s) => s.op === op && s.source === a2);
        await merged.session.data.removeStep(at("join.merge"));
        await merged.session.data.removeStep(at("join.add"));
        assert.strictEqual(merged.session.data.sources().find((s) => s.key === a2)?.state, "staged");
        await merged.session.data.add(a2);
        assert.deepStrictEqual(spaces(merged.session), spaces(fresh.session));
        assert.deepStrictEqual(
            merged.session.data.sources().find((s) => s.key === a2)?.issues,
            fresh.session.data.sources().find((s) => s.key === a1)?.issues,
        );
        await refused(() => merged.session.data.add(a2), "E_BAD_COMMAND");
        fresh.session.dispose();
        merged.session.dispose();
    });

    it("Make an edge (3.6 conformance): edges keyed <part>/<node 2 key>, from node 1 to node 2", async () => {
        const { session } = await phase6();
        const k = await session.data.stage(
            { type: "csv", config: { data: KYC }, name: "kyc.csv" },
            { key: "alert_id" },
        );
        const part = await session.data.connect({
            from: { source: k, field: "account_id" },
            into: { space: "account" },
        });
        assert.strictEqual(part, 1);
        const step = session.data.steps().at(-1);
        assert.strictEqual(step?.buckets?.matched, 2);
        assert.strictEqual(step?.buckets?.unmatched, 1);
        assert.isNotNull(session.data.lineage({ load: k, key: "1/K-0" }));
        assert.include(ends(session), "A-1>K-0", "edges run from node 1 to node 2");
        assert.isNull(
            session.data.lineage({ space: `source:${k}`, key: "K-0" })?.type,
            "an untyped staged source stays untyped",
        );
        // Part minting (3.3): parts 1, 2; delete 1, add: 3.
        assert.strictEqual(
            await session.data.connect({
                from: { source: k, field: "account_id" },
                into: { space: "account" },
                direction: "from-into",
            }),
            2,
        );
        assert.include(ends(session), "K-0>A-1");
        await session.data.removeStep(session.data.steps().findIndex((s) => s.buckets?.part === 1 && s.source === k));
        assert.strictEqual(
            await session.data.connect({ from: { source: k, field: "account_id" }, into: { space: "account" } }),
            3,
        );
        session.dispose();
    });

    it("Make an edge refuses a staged source in node 1's space and a source with no node rows", async () => {
        const { session, t } = await phase6();
        const k = await session.data.stage(
            { type: "csv", config: { data: KYC }, name: "kyc.csv" },
            { key: "alert_id", space: "account" },
        );
        const details = await refused(
            () => session.data.connect({ from: { source: k, field: "account_id" }, into: { space: "account" } }),
            "E_JOIN_SPACE_SAME",
        );
        assert.deepStrictEqual(details, { source: k, space: "account" });
        await refused(
            () => session.data.connect({ from: { source: t, field: "account_id" }, into: { space: "merchant" } }),
            "E_STEP_NEEDS_NODES",
        );
        await refused(
            () => session.data.merge({ from: { source: t, field: "account_id" }, into: { space: "account" } }),
            "E_STEP_NEEDS_NODES",
        );
        session.dispose();
    });

    it("a field of an edge source as node 1 is refused with E_AMBIGUOUS_ID (late findings, settled 5.2, 9.1)", async () => {
        const { session, t } = await phase6();
        const k = await session.data.stage(
            { type: "csv", config: { data: KYC }, name: "kyc.csv" },
            { key: "alert_id" },
        );
        await refused(
            () =>
                session.data.connect({
                    from: { source: k, field: "account_id" },
                    into: { source: t, field: "holder" },
                }),
            "E_AMBIGUOUS_ID",
        );
        assert.strictEqual(session.data.sources().find((s) => s.key === k)?.state, "staged", "nothing changed");
        // Naming the end by its space joins onto that end's nodes.
        await session.data.connect({
            from: { source: k, field: "account_id" },
            into: { source: t, field: "account_id", space: "account" },
        });
        assert.include(ends(session), "A-1>K-0");
        session.dispose();
    });

    it("a staged node-plus-edge source's ends in its proposed space follow its nodes (late findings, settled 3.6)", async () => {
        const { session } = await phase6();
        const nodes = ["alert_id,account_id", "K-1,A-1", "K-2,A-2"].join("\n");
        const k = await session.data.stage(
            { type: "csv", config: { data: nodes }, name: "k.csv" },
            { key: "alert_id", type: "account" },
        );
        assert.strictEqual(session.data.sources().find((s) => s.key === k)?.state, "staged");
        await session.data.merge({ from: { source: k, field: "account_id" }, into: { space: "account" } });
        assert.isNull(session.data.lineage({ space: "account", key: "K-1" }), "no stray account node");
        assert.deepStrictEqual(session.data.lineage({ space: "account", key: "A-1" })?.supplied.at(-1), k);
        session.dispose();
    });

    it("weighted transfers plus a Make an edge keep their weight; the made edges read none (review round 3)", async () => {
        const session = createGraphSession({ features: ["source-steps"] });
        await session.data.import(
            { type: "csv", config: { data: "a,m,w\nacct-1,m-1,10\nacct-2,m-2,3" }, name: "T" },
            {
                edges: { from: { column: "a", space: "account" }, to: { column: "m", space: "merchant" } },
            },
        );
        const weights = (): unknown[] => session.data.edges().map((e) => e.w);
        assert.deepStrictEqual(weights(), [10, 3]);
        const k = await session.data.stage(
            { type: "csv", config: { data: "alert_id,account_id\nK-1,acct-1" }, name: "kyc.csv" },
            { key: "alert_id" },
        );
        await session.data.connect({ from: { source: k, field: "account_id" }, into: { space: "account" } });
        assert.deepStrictEqual(weights(), [10, 3, undefined]);
        session.dispose();
    });

    it("values a step moved onto a node supply it, so another edge source reaching it only names it (review round 8)", async () => {
        const session = createGraphSession({ features: ["source-steps"] });
        const options = {
            edges: { from: { column: "acct", space: "account" }, to: { column: "merch", space: "merchant" } },
        } as const;
        await session.data.import(
            { type: "csv", config: { data: "acct,merch,acct_name\na1,m1,Ann" }, name: "T" },
            options,
        );
        const [t] = session.data.sources();
        await session.data.moveColumns(t.key, { columns: ["acct_name"], to: "source" });
        await session.data.import(
            { type: "csv", config: { data: "acct,merch\na1,m2" }, name: "B" },
            { ...options, mode: "merge" },
        );
        const b = session.data.sources()[1];
        const lineage = session.data.lineage({ space: "account", key: "a1" });
        assert.deepStrictEqual(lineage?.supplied, [t.key]);
        assert.deepStrictEqual(lineage?.named, [b?.key]);
        session.dispose();
    });

    it("Rename (4.4): a column a role, type rule or step reads refuses it; a value column takes its reader edits along", async () => {
        const { session, t } = await phase2();
        const rename = (from: string, to: string): Promise<void> =>
            session.data.renameColumn({ kind: "edge", name: from }, to, { source: t });
        await refused(() => rename("account_id", "acct"), "E_EDIT_ROLE_COLUMN");
        await refused(() => rename("device_id", "dev"), "E_EDIT_ROLE_COLUMN");
        await session.data.declareType({
            name: "big",
            kind: "edge",
            rules: [{ source: t, column: "amount", values: ["20"] }],
        });
        await refused(() => rename("amount", "amt"), "E_EDIT_ROLE_COLUMN");
        // A reader edit on a value column moves with the rename.
        const edge = session.data.edges().find((e) => e.txn_id === "T-1");
        await session.data.updateEdges([{ id: edge?.id ?? "", values: { note: "x" } }]);
        await session.data.declareType({ name: "noted", kind: "edge", rules: [{ source: t }] });
        const history = session.history.steps.length;
        await rename("os", "platform");
        assert.lengthOf(session.history.steps, history + 1);
        assert.strictEqual(session.data.values({ space: "device", key: "D-1" }, "platform")?.shown, "ios");
        session.dispose();
    });

    it("reader edits (3.8): a role column refuses a pick", async () => {
        const { session, t } = await phase1();
        await refused(() => session.data.pick({ load: t, key: "T-1" }, "account_id", t), "E_EDIT_ROLE_COLUMN");
        await refused(() => session.data.mergeNodes(["A-1", "A-2"]), "E_UNSUPPORTED");
        session.dispose();
    });

    it("4.4: renaming a column onto a name its own table carries is refused with name-taken", async () => {
        const session = createGraphSession({ features: ["source-steps"] });
        await session.data.import(
            { type: "csv", config: { data: "id,amount,amount_eur\np1,10,9\np2,20,18" }, name: "s.csv" },
            { key: "id", type: "payment" },
        );
        const [s] = session.data.sources();
        const details = await refused(
            () => session.data.renameColumn({ kind: "node", name: "amount_eur" }, "amount", { source: s.key }),
            "E_BAD_COMMAND",
        );
        assert.strictEqual(details.reason, "name-taken");
        assert.deepStrictEqual([session.data.node("p1")?.amount, session.data.node("p1")?.amount_eur], [10, 9]);
        session.dispose();
    });

    it("4.4: a rename in one source leaves a reader edit on a cell another source also carries", async () => {
        const session = createGraphSession({ features: ["source-steps"] });
        await session.data.import(
            { type: "csv", config: { data: "id,city\np1,Oslo" }, name: "crm.csv" },
            { key: "id", type: "person" },
        );
        await session.data.import(
            { type: "csv", config: { data: "id,city\np1,Bergen" }, name: "erp.csv" },
            { mode: "merge", key: "id", type: "person", overlap: "merge" },
        );
        const b = session.data.sources()[1]?.key ?? "";
        const ref = { space: "person", key: "p1" };
        await session.data.updateNodes([{ id: "p1", values: { city: "Trondheim" } }]);
        await session.data.renameColumn({ kind: "node", name: "city" }, "erp_city", { source: b });
        assert.strictEqual(session.data.values(ref, "city")?.shown, "Trondheim");
        assert.strictEqual(session.data.values(ref, "erp_city")?.shown, "Bergen");
        session.dispose();
    });

    it("every act is refused with E_FEATURE_OFF while the experiment is off", async () => {
        const session = createGraphSession();
        await refused(
            () => session.data.merge({ from: { source: "s", field: "f" }, into: { space: "x" } }),
            "E_FEATURE_OFF",
        );
        await refused(() => session.data.removeStep(0), "E_FEATURE_OFF");
        await refused(() => session.data.add("s"), "E_FEATURE_OFF");
        session.dispose();
    });
});
