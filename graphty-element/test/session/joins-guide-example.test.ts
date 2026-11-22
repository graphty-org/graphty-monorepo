/**
 * @file The examples of the "Joining Data" guide (`docs/guide/joins.md`), run over a headless
 * session so the documented code keeps doing what the guide says. The guide's lines are copied
 * with `element.session` as `session`.
 */

import { assert, describe, it } from "vitest";

import { createGraphSession, type GraphSession } from "../../session";

/**
 * A session holding a small gene network.
 * @returns the session
 */
async function genes(): Promise<GraphSession> {
    const session = createGraphSession();
    const edges = "source,target\nTP53,MDM2\nTP53,CDKN1A\nMDM2,MDM4\nTP53,ATM\n";
    await session.data.import({ type: "csv", config: { data: edges }, name: "interactions.csv" });
    return session;
}

describe("the joins guide's examples", () => {
    it("joins values onto genes, counts it first, edits it and takes it back", async () => {
        const session = await genes();
        const file = new File(["symbol,log2fc\nTP53,2.5\nmdm2,-1.2\nATM,0.4\nBRCA1,3.1\n"], "expression.csv");

        // The guide's canonical example.
        const { data } = session;
        const draft = await data.prepare({ config: { file } }, { onto: "graph" });
        const suggestion = draft.suggestJoin();
        const report = draft.joinReport(suggestion);
        await draft.load({ join: suggestion });

        assert.deepEqual(suggestion, {
            shape: "node-values",
            keys: [{ file: "symbol", graph: "id" }],
            confident: true,
        });
        assert.deepInclude(report, { matched: 2, notInGraph: 1, extraIgnoringCase: 1 });
        assert.strictEqual(session.data.node("TP53")?.log2fc, 2.5);

        const join = data.joins().at(-1); // the newest join
        if (join) {
            await data.editJoin(join.source, { ...join.choices, ignoreCase: true });
            assert.strictEqual(session.data.node("MDM2")?.log2fc, -1.2);
            await data.removeSource(join.source);
        }

        assert.deepEqual(data.joins(), []);
        assert.isUndefined(session.data.node("TP53")?.log2fc);
        session.dispose();
    });

    it("joins door entries as one edge per person and building with the visits counted", async () => {
        const session = createGraphSession();
        const people = "id,name,person_id\nada,Ada,E1\nbob,Bob,E2\ncy,Cy,E3\n";
        const buildings = "id,city\nB1,Oslo\nB2,Rome\n";
        await session.data.import({ type: "csv", config: { data: people }, name: "people.csv" });
        await session.data.import(
            { type: "csv", config: { data: buildings }, name: "buildings.csv" },
            { mode: "merge" },
        );
        const entries = "person_id,building_id,time\nE1,B1,08:01\nE1,B1,12:40\nE2,B2,09:15\nE3,B1,10:00\n";
        const file = new File([entries], "door-entries.csv");

        const draft = await session.data.prepare({ config: { file } }, { onto: "graph" });
        const suggestion = draft.suggestJoin();
        // { shape: "edges", keys: [{ file: "person_id", graph: "data.person_id" }, { file: "building_id", graph: "id" }] }
        await draft.load({ join: { ...suggestion, aggregate: { time: ["count", "first", "last"] } } });

        assert.deepEqual(suggestion.keys, [
            { file: "person_id", graph: "data.person_id" },
            { file: "building_id", graph: "id" },
        ]);
        assert.lengthOf(session.data.edges(), 3);
        const visits = session.data.edges().find((edge) => edge.source === "ada" && edge.target === "B1");
        assert.deepInclude(visits, { "time (count)": 2, "time (first)": "08:01", "time (last)": "12:40" });
        session.dispose();
    });

    it("links accounts that share a phone or a device", async () => {
        const session = createGraphSession();
        const accounts = "id,opened\na1,2024\na2,2024\na3,2025\na4,2025\n";
        await session.data.import({ type: "csv", config: { data: accounts }, name: "accounts.csv" });
        const identifiers = "account,phone,device\na1,555-0101,d1\na2,555-0101,d1\na3,555-0199,d2\na4,555-0102,d2\n";
        const file = new File([identifiers], "identifiers.csv");

        const draft = await session.data.prepare({ config: { file } }, { onto: "graph" });
        const suggestion = draft.suggestJoin();
        // suggestion.link: { columns: ["phone", "device"] }
        await draft.load({ join: { ...suggestion, shape: "link" } });

        assert.deepEqual(suggestion.link, { columns: ["phone", "device"] });
        const pairs = session.data.edges().map((edge) => [edge.source, edge.target, edge.shared]);
        assert.sameDeepMembers(pairs, [
            ["a1", "a2", 2],
            ["a3", "a4", 1],
        ]);
        session.dispose();
    });
});
