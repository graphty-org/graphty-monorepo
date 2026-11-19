/**
 * @file Save and reopen of sources and steps under the source-steps experiment (design
 * design/data/multiple-data-sources-design.md, sections 7.15 and 10): the `graphty-sources` member
 * carries each source with its mapping, copy id and rows as read, the ordered steps, the type
 * registry and the reader's operations; reopen rebuilds the graph from them and checks it against
 * the embedded graph. Ported from the reference model's save cases (the copy half: every source is
 * saved as a copy).
 */

import { assert, describe, it } from "vitest";

import { createGraphSession, defineSource, type GraphSession, registerSource } from "../../../session";
import { ACCOUNTS, BANK_B, edgeFile, full, KYC, phase2, phase6, refused, spaces } from "./scenario";

registerSource(
    defineSource({
        id: "save-reopen-network",
        descriptor: { plainName: "Network", defaultEndpoint: "https://save-reopen.example.com", params: [] },
        records: () => Promise.resolve({ nodes: [{ id: "a" }, { id: "b" }], edges: [{ source: "a", target: "b" }] }),
    }),
);

/** What the `save-reopen-resume` source returns now; a test grows it to show a fresh read. */
let resumeNodes = ["a", "b"];
registerSource(
    defineSource({
        id: "save-reopen-resume",
        descriptor: { plainName: "Network", defaultEndpoint: "https://save-reopen.example.com", params: [] },
        records: () =>
            Promise.resolve({
                nodes: resumeNodes.map((id) => ({ id })),
                edges: [{ source: "a", target: "b" }],
            }),
    }),
);

/** Saved text with its clock readings and session id blanked, so two saves compare. */
function comparable(text: string): string {
    return text
        .replaceAll(/"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z"/gu, '"T"')
        .replace(/"kind":"graphty-session","version":1,"id":"[0-9a-f]+"/u, '"kind":"graphty-session"');
}

/**
 * The parsed file's members by kind.
 * @param text - The saved text.
 * @returns Each member by its kind.
 */
function members(text: string): Record<string, Record<string, unknown>> {
    const doc = JSON.parse(text) as { members: Record<string, unknown>[] };
    return Object.fromEntries(doc.members.map((m) => [m.kind as string, m]));
}

/**
 * Save a session and open the file in a fresh one with the experiment on.
 * @param session - The session to save; disposed.
 * @returns The opened session, the saved text and the open's problems.
 */
async function reopen(session: GraphSession): Promise<{ q: GraphSession; text: string; problems: unknown[] }> {
    const { text } = await session.project.save();
    session.dispose();
    const q = createGraphSession({ features: ["source-steps"] });
    const report = await q.project.open(text);
    return { q, text, problems: [...report.problems] };
}

/**
 * The nodes and edges the graph holds, sorted, ids and records as read.
 * @param session - The session.
 * @returns The text.
 */
function graphOf(session: GraphSession): string {
    const sorted = (r: Readonly<Record<string, unknown>>): string =>
        JSON.stringify(Object.fromEntries(Object.entries(r).sort(([a], [b]) => (a < b ? -1 : 1))));
    return JSON.stringify([
        session.data.nodes({ scope: "graph" }).map(sorted).sort(),
        session.data
            .edges({ scope: "graph" })
            .map(({ id: _id, ...e }) => sorted(e))
            .sort(),
    ]);
}

describe("source-steps: save and reopen", () => {
    it("phase 14: the member carries the section 10 names and reopen builds the same graph", async () => {
        const { session } = await full();
        const graph = graphOf(session);
        const steps = session.data.steps().map((s) => [s.op, s.source]);
        const spaced = spaces(session);
        const { q, text, problems } = await reopen(session);
        const member = members(text)["graphty-sources"];
        assert.includeMembers(Object.keys(member), ["loads", "sources", "types", "joins"]);
        const sources = member.sources as { id: string; kind: string; copy: Record<string, unknown> }[];
        assert.strictEqual(sources.at(-1)?.id, "reader", "the reader source is last");
        assert.isTrue(sources.slice(0, -1).every((s) => s.copy.nodes !== undefined || s.copy.edges !== undefined));
        assert.deepStrictEqual(problems, []);
        assert.strictEqual(graphOf(q), graph);
        assert.deepStrictEqual(
            q.data.steps().map((s) => [s.op, s.source]),
            steps,
        );
        assert.deepStrictEqual(spaces(q), spaced);
        q.dispose();
    });

    it("save, reopen, save is a fixed point", async () => {
        const { session, t } = await full();
        await session.data.addNodes([{ id: "X-1", score: 1 }]);
        await session.data.updateNodes([{ id: "A-1", values: { email: "ann@x" } }]);
        const { q, text } = await reopen(session);
        assert.strictEqual(q.data.node("A-1")?.email, "ann@x", "a reader edit comes back");
        assert.deepStrictEqual(q.data.lineage({ space: "source:reader", key: "X-1" })?.supplied, ["reader"]);
        assert.isNotNull(q.data.lineage({ load: t, key: "T-1" }));
        // A reopened source cannot be read again by this session, so it no longer lists `reloadable`.
        const { q: r, text: again } = await reopen(q);
        assert.strictEqual(comparable(again), comparable(text).replaceAll(',"reloadable":true', ""));
        assert.strictEqual(comparable((await r.project.save()).text), comparable(again));
        r.dispose();
    });

    it("a staged source survives save, reopen, save (section 10 item 16)", async () => {
        const { session } = await phase2();
        const a = await session.data.stage(
            { type: "csv", config: { data: "account_id\nA-1\n" }, name: "a.csv" },
            { key: "account_id" },
        );
        const { q } = await reopen(session);
        assert.strictEqual(q.data.sources().find((s) => s.key === a)?.state, "staged");
        const again = members((await q.project.save()).text)["graphty-sources"];
        assert.isTrue((again.sources as { id: string }[]).some((s) => s.id === a));
        q.dispose();
    });

    it("part minting (3.3): save and reopen keep part 2's keys, and a deleted part is never minted again", async () => {
        const { session } = await phase6();
        const k = await session.data.stage(
            { type: "csv", config: { data: KYC }, name: "kyc.csv" },
            { key: "alert_id" },
        );
        const connect = (direction?: "from-into"): Promise<number> =>
            session.data.connect({
                from: { source: k, field: "account_id" },
                into: { space: "account" },
                ...(direction === undefined ? {} : { direction }),
            });
        assert.strictEqual(await connect(), 1);
        assert.strictEqual(await connect("from-into"), 2);
        await session.data.removeStep(session.data.steps().findIndex((s) => s.buckets?.part === 1 && s.source === k));
        assert.strictEqual(await connect(), 3);
        const part2 = (s: GraphSession): boolean[] =>
            ["2/K-0", "2/K-1"].map((key) => s.data.lineage({ load: k, key }) !== null);
        const { q } = await reopen(session);
        assert.deepStrictEqual(part2(q), [true, true]);
        await q.data.removeStep(q.data.steps().findIndex((s) => s.buckets?.part === 3 && s.source === k));
        const { q: r } = await reopen(q);
        assert.strictEqual(
            await r.data.connect({ from: { source: k, field: "account_id" }, into: { space: "account" } }),
            4,
        );
        r.dispose();
    });

    it("a part deleted with its step is not reused after reopen, so its type rules type nothing new", async () => {
        const { session, t, part } = await phase2();
        const extracted = session.data
            .steps()
            .filter((s) => s.source === t && (s.buckets?.part === part || s.reads.includes("device_id")))
            .map((s) => s.index)
            .filter((index) => index > 0);
        for (const index of extracted.reverse()) {
            await session.data.removeStep(index);
        }
        const { q } = await reopen(session);
        const next = await q.data.extract(t, { column: "os", type: "platform" });
        assert.notStrictEqual(next, part);
        assert.deepStrictEqual(
            q.data.spaces().find((s) => s.space === "platform")?.nodes,
            2,
            "the new part's nodes are typed platform",
        );
        q.dispose();
    });

    it("Delete the Merge's steps and Add accounts.csv again: same graph before and after save and reopen", async () => {
        const deleteThenAdd = async (s: GraphSession, a: string): Promise<number> => {
            await s.data.removeStep(s.data.steps().findIndex((x) => x.op === "join.merge" && x.source === a));
            await s.data.removeStep(s.data.steps().findIndex((x) => x.op === "join.add" && x.source === a));
            assert.strictEqual(s.data.sources().find((x) => x.key === a)?.state, "staged");
            await s.data.add(a, { overlap: "merge" });
            return spaces(s).account ?? 0;
        };
        const one = await phase6();
        const before = await deleteThenAdd(one.session, one.a);
        one.session.dispose();
        const two = await phase6();
        const { q } = await reopen(two.session);
        assert.strictEqual(await deleteThenAdd(q, two.a), before);
        q.dispose();
    });

    it("5.1: end types and a Type picked on a staged source survive save and reopen", async () => {
        const { session } = await phase6();
        const b = await session.data.stage(
            { type: "csv", config: { data: BANK_B }, name: "bankB.csv" },
            {
                edges: {
                    from: { column: "account_id", space: "account", type: "account" },
                    to: { column: "merchant_id", space: "merchant", type: "merchant" },
                    id: "txn_id",
                },
            },
        );
        const { q } = await reopen(session);
        await q.data.add(b);
        const untyped = q.data
            .nodes({ scope: "graph" })
            .filter(
                (n) =>
                    q.data.sourcesOf(n.id).includes(b) &&
                    q.data.lineage({ space: "account", key: String(n.id) }) === null,
            )
            .filter((n) => q.data.lineage({ space: "merchant", key: String(n.id) }) === null);
        assert.deepStrictEqual(untyped, [], "bank B's ends keep the types picked while it was staged");
        q.dispose();
    });

    it("3.10: clash rules, picks and renames survive save and reopen", async () => {
        const session = createGraphSession({ features: ["source-steps"] });
        await session.data.import(
            { type: "csv", config: { data: "id,amt,name\np1,10,Anne\n" }, name: "crm.csv" },
            { key: "id", type: "person" },
        );
        const b = await session.data.stage(
            { type: "csv", config: { data: "id,amt,name\np1,30,Annie\n" }, name: "erp.csv" },
            { key: "id", type: "person" },
        );
        await session.data.merge({
            from: { source: b, field: "id" },
            into: { space: "person" },
            clash: { amt: "max" },
        });
        await session.data.pick({ space: "person", key: "p1" }, "name", b);
        const { q } = await reopen(session);
        assert.strictEqual(q.data.values({ space: "person", key: "p1" }, "amt")?.shown, 30, "max of 10 and 30");
        assert.strictEqual(q.data.values({ space: "person", key: "p1" }, "name")?.shown, "Annie");
        assert.strictEqual(q.data.edits()[0]?.picked, b);
        q.dispose();
    });

    it("a node only an edge names is saved with that edge source in _source.loads", async () => {
        const session = createGraphSession({ features: ["source-steps"] });
        await session.data.import(
            { type: "csv", config: { data: "a,b\nn1,n2\n" }, name: "edges.csv" },
            { edges: { from: { column: "a", space: "person" }, to: { column: "b", space: "person" } } },
        );
        const id = session.data.sources()[0]?.key;
        const { text } = await session.project.save();
        const { nodes } = members(text)["graphty-data"].graph as { nodes: Record<string, unknown>[] };
        assert.strictEqual(nodes.length, 2);
        for (const n of nodes) {
            assert.deepStrictEqual(n["_source.loads"], [id]);
        }
        session.dispose();
    });

    it("Refresh after reopen of an embedded file is refused as not-reloadable (7.12)", async () => {
        const session = createGraphSession({ features: ["source-steps"] });
        const t = await edgeFile(session, "txn_id,account_id,merchant_id\nT-1,A-1,M-1\n", "t.csv");
        const { q } = await reopen(session);
        const details = await refused(() => q.data.reloadSource(t, {}), "E_UNSUPPORTED");
        assert.strictEqual(details.reason, "not-reloadable");
        q.dispose();
    });

    it("a file whose embedded graph differs from its steps opens the embedded graph and reports it", async () => {
        const session = createGraphSession({ features: ["source-steps"] });
        await edgeFile(session, "txn_id,account_id,merchant_id\nT-1,A-1,M-1\n", "t.csv");
        const doc = JSON.parse((await session.project.save()).text) as { members: Record<string, unknown>[] };
        session.dispose();
        const data = doc.members.find((m) => m.kind === "graphty-data") as {
            graph: { nodes: Record<string, unknown>[] };
        };
        // A release without the experiment changed a built node: the steps no longer build the graph.
        const built = data.graph.nodes.find((n) => n.id === "A-1");
        assert.isDefined(built);
        built.note = "edited";
        data.graph.nodes.push({ id: "edited" });
        const q = createGraphSession({ features: ["source-steps"] });
        const report = await q.project.open(JSON.stringify(doc));
        assert.deepStrictEqual(
            report.problems.map((p) => p.code),
            ["W_SOURCE_STEPS_IGNORED"],
        );
        assert.include(
            q.data.nodes({ scope: "graph" }).map((n) => n.id),
            "edited",
        );
        assert.deepStrictEqual(q.data.steps(), []);
        q.dispose();
    });

    it("with the experiment off, a file carrying sources and steps opens its embedded graph, as before", async () => {
        const session = createGraphSession({ features: ["source-steps"] });
        await edgeFile(session, "txn_id,account_id,merchant_id\nT-1,A-1,M-1\n", "t.csv");
        await session.data.stage(
            { type: "csv", config: { data: ACCOUNTS }, name: "accounts.csv" },
            { key: "account_id" },
        );
        const { text } = await session.project.save();
        session.dispose();
        const off = createGraphSession({ features: [] });
        const report = await off.project.open(text);
        assert.deepStrictEqual(
            report.problems.map((p) => p.code),
            ["E_BAD_DOCUMENT"],
            "the member is skipped whole",
        );
        assert.sameMembers(
            off.data.nodes({ scope: "graph" }).map((n) => n.id),
            ["A-1", "M-1"],
        );
        const saved = (await off.project.save()).text;
        assert.include(saved, '"joins"', "the skipped member is written back as read");
        off.dispose();
    });
    it("a copy whose rows hold a list or an object value saves and reopens with no problems", async () => {
        const session = createGraphSession({ features: ["source-steps"] });
        await session.data.import({
            type: "json",
            config: {
                data: JSON.stringify({
                    nodes: [
                        { id: "a", tags: ["x", "y"] },
                        { id: "b", pos: { x: 1, y: [2, 3] } },
                    ],
                    edges: [{ source: "a", target: "b" }],
                }),
            },
        });
        const graph = graphOf(session);
        const steps = session.data.steps().map((s) => [s.op, s.source]);
        const { q, text, problems } = await reopen(session);
        assert.deepStrictEqual(problems, []);
        assert.strictEqual(graphOf(q), graph);
        assert.deepStrictEqual(
            q.data.steps().map((s) => [s.op, s.source]),
            steps,
        );
        assert.lengthOf(steps, 1);
        // A reopened source cannot be read again by this session, so it no longer lists `reloadable`.
        const again = (await q.project.save()).text;
        assert.strictEqual(comparable(again), comparable(text).replaceAll(',"reloadable":true', ""));
        q.dispose();
    });

    it("a registered network source saves and reopens with no problems", async () => {
        const session = createGraphSession({ features: ["source-steps"] });
        await session.data.import({ source: "save-reopen-network", config: {} });
        const [load] = session.data.loads().map((l) => l.key);
        const [key] = session.data.sources().map((s) => s.key);
        // The save writes each record's load under its source's key, as the member's loads entry is.
        const graph = graphOf(session).replaceAll(`\\"${load}\\"`, `\\"${key}\\"`);
        const steps = session.data.steps().map((s) => [s.op, s.source]);
        const { q, problems } = await reopen(session);
        assert.deepStrictEqual(problems, []);
        assert.strictEqual(graphOf(q), graph);
        assert.lengthOf(steps, 1);
        assert.deepStrictEqual(
            q.data.steps().map((s) => [s.op, s.source]),
            steps,
        );
        q.dispose();
    });

    it("a reopened network source keeps its load: it waits, resumes into the same source and refreshes", async () => {
        resumeNodes = ["a", "b"];
        const session = createGraphSession({ features: ["source-steps"] });
        await session.data.import({ source: "save-reopen-resume", config: {} });
        const steps = session.data.steps().map((s) => s.op);
        const { q, text } = await reopen(session);
        const [key] = q.data.sources().map((s) => s.key);
        assert.deepStrictEqual(
            q.data.loads().map((l) => l.key),
            [key],
            "the nodes and the ledger name one load",
        );
        assert.deepStrictEqual(
            q.data.pendingSourceLoads().map((p) => p.id),
            [key],
        );
        type Load = { source: Record<string, unknown> };
        const loadsOf = (saved: string): Load[] => members(saved)["graphty-sources"].loads as Load[];
        assert.deepStrictEqual(
            loadsOf((await q.project.save()).text)[0]?.source,
            loadsOf(text)[0]?.source,
            "the endpoint and the total are saved again unchanged",
        );
        resumeNodes = ["a", "b", "c"];
        await q.data.runPendingSourceLoad(key);
        assert.sameMembers(
            q.data.nodes({ scope: "graph" }).map((n) => n.id),
            ["a", "b", "c"],
        );
        assert.deepStrictEqual(
            q.data.steps().map((s) => s.op),
            steps,
            "still exactly one join.add",
        );
        assert.lengthOf(q.data.sources(), 1);
        assert.deepStrictEqual(q.data.pendingSourceLoads(), []);
        resumeNodes = ["a", "b", "c", "d"];
        await q.data.refresh(key);
        assert.sameMembers(
            q.data.nodes({ scope: "graph" }).map((n) => n.id),
            ["a", "b", "c", "d"],
        );
        q.dispose();
    });

    it("a renamed source keeps its name after save and reopen", async () => {
        const session = createGraphSession({ features: ["source-steps"] });
        await session.data.import({ type: "csv", config: { data: "source,target\na,b\n" }, name: "one.csv" });
        await session.data.renameSource("Mine", session.data.sources()[0]?.key);
        assert.deepStrictEqual(
            session.data.sources().map((s) => s.name),
            ["Mine"],
        );
        const { q } = await reopen(session);
        assert.deepStrictEqual(
            q.data.sources().map((s) => s.name),
            ["Mine"],
        );
        q.dispose();
    });

    it("a file saved without the experiment, opened with it and given a merged file, keeps its steps", async () => {
        const off = createGraphSession({ features: [] });
        await off.data.import({ type: "csv", config: { data: "source,target\na,b\n" } });
        const { text: old } = await off.project.save();
        off.dispose();
        const on = createGraphSession({ features: ["source-steps"] });
        assert.deepStrictEqual((await on.project.open(old)).problems, []);
        await on.data.import({ type: "csv", config: { data: "source,target\nc,d\n" } }, { mode: "merge" });
        const graph = graphOf(on);
        const steps = on.data.steps().map((s) => [s.op, s.source]);
        assert.lengthOf(steps, 1);
        const { q, problems } = await reopen(on);
        assert.deepStrictEqual(problems, []);
        assert.strictEqual(graphOf(q), graph);
        assert.deepStrictEqual(
            q.data.steps().map((s) => [s.op, s.source]),
            steps,
        );
        q.dispose();
    });

    it("a file saved without the experiment, opened with it and given a staged then added source, keeps it", async () => {
        const off = createGraphSession({ features: [] });
        await off.data.import({ type: "csv", config: { data: "source,target,w\nx,y,1\ny,z,2\n" } });
        const { text: old } = await off.project.save();
        off.dispose();
        const on = createGraphSession({ features: ["source-steps"] });
        await on.project.open(old);
        const key = await on.data.stage({ type: "csv", config: { data: "id,score\nq,5\n" } }, { key: "id" });
        await on.data.add(key);
        const graph = graphOf(on);
        const steps = on.data.steps().map((s) => [s.op, s.source]);
        const state = on.data.sources().find((s) => s.key === key);
        assert.isDefined(state);
        const { q, problems } = await reopen(on);
        assert.deepStrictEqual(problems, []);
        assert.strictEqual(graphOf(q), graph);
        assert.deepStrictEqual(
            q.data.steps().map((s) => [s.op, s.source]),
            steps,
        );
        assert.deepStrictEqual(
            q.data.sources().find((s) => s.key === key),
            state,
        );
        q.dispose();
    });
});
