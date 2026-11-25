/**
 * graph-io's `url` source through `session.data`: a graph file at a web address with a query
 * string loads, its address is kept in the load's params, a credential remembered for the
 * address's origin is used on the load and on Refresh, and a saved project reopens with the load
 * waiting against that address.
 */

import { assert, describe, it } from "vitest";

import { createGraphSession, credentials, type GraphSession, GraphtyError, replayFetch } from "../../../session";
import { attachCredentials } from "../../../src/session/sources/credentialLookup";

const HOST = "https://files.example.com";
const URL_WITH_QUERY = `${HOST}/data/buildings.csv?v=1`;
const CSV = "source,target\na,b\nb,c\n";

/**
 * A fetch that answers every request for the address with the CSV, needing a credential.
 * @param times - how many requests it answers
 * @returns the fetch
 */
function csvFetch(times: number): ReturnType<typeof replayFetch> {
    return replayFetch(Array.from({ length: times }, () => ({ url: URL_WITH_QUERY, body: CSV, credential: true })));
}

/**
 * Run a test against a fresh headless session, disposed afterwards.
 * @param body - the test
 * @returns settles when it is done
 */
async function withSession(body: (session: GraphSession) => Promise<void>): Promise<void> {
    const session = createGraphSession();
    try {
        await body(session);
    } finally {
        session.dispose();
    }
}

describe("the url source in a session", () => {
    it("loads by address, finds the remembered credential by its origin, and refreshes with it", async () => {
        await withSession(async (session) => {
            const asked: string[] = [];
            attachCredentials(session.data, (source, origin) => {
                asked.push(`${source} ${origin}`);
                return Promise.resolve(credentials.bearer("remembered"));
            });
            const fetch = csvFetch(2);
            await session.data.import({ source: "url", config: { url: URL_WITH_QUERY } }, { fetch });
            assert.strictEqual(session.data.nodes().length, 3);
            assert.deepEqual(asked, [`url ${HOST}`]);

            const [load] = session.data.loads();
            const settings = session.data.sourceSettings(session.data.sources()[0].key);
            assert.strictEqual(settings?.config.url, URL_WITH_QUERY, "the address keeps its query");
            assert.strictEqual(settings?.endpoint, `${HOST}/data/buildings.csv`);

            await session.data.refresh(load.key, { fetch });
            assert.deepEqual(
                fetch.calls.map((c) => c.credential),
                [true, true],
            );
        });
    });

    it("saves the address and reopens with the load waiting against it", async () => {
        let text = "";
        await withSession(async (session) => {
            await session.data.import(
                { source: "url", config: { url: URL_WITH_QUERY } },
                { fetch: csvFetch(1), credential: credentials.bearer("typed") },
            );
            ({ text } = await session.project.save());
        });
        assert.notInclude(text, "typed");

        await withSession(async (session) => {
            await session.project.open(text);
            const [pending] = session.data.pendingSourceLoads();
            assert.strictEqual(pending.endpoint, `${HOST}/data/buildings.csv`);
            assert.strictEqual(pending.params.url, URL_WITH_QUERY);
            assert.isFalse(pending.isLocalNetwork);
            const fetch = csvFetch(1);
            await session.data.runPendingSourceLoad(pending.id, { fetch, credential: credentials.bearer("again") });
            assert.strictEqual(fetch.calls.length, 1);
            assert.strictEqual(session.data.nodes().length, 3);
        });
    });

    it("keeps the file's own id column, and under source-steps lists no id column the file never had", async () => {
        const url = `${HOST}/data/people.csv`;
        const people = "person_id,name\np1,Ann\np2,Bob\n";
        const fetch = (): ReturnType<typeof replayFetch> => replayFetch([{ url, body: people }]);
        await withSession(async (session) => {
            await session.data.import({ source: "url", config: { url } }, { fetch: fetch() });
            assert.strictEqual(session.data.node("p1")?.person_id, "p1");
        });

        const steps = createGraphSession({ features: ["source-steps"] });
        await steps.data.import({ source: "url", config: { url } }, { fetch: fetch() });
        const key = steps.data.sources()[0]?.key ?? "";
        const facts = steps.data.sourceTable(key).summary();
        assert.strictEqual(facts.mapping.key, "person_id");
        assert.sameMembers([...(facts.tables[0]?.columns ?? [])], ["person_id", "name"]);
        assert.strictEqual(steps.data.node("p1")?.person_id, "p1");
        assert.strictEqual(steps.data.node("p1")?.name, "Ann");
        await steps.data.refresh(key, { fetch: fetch() });
        assert.strictEqual(steps.data.nodes().length, 2);
        assert.strictEqual(steps.data.node("p2")?.person_id, "p2");
        const { text } = await steps.project.save();
        const other = createGraphSession({ features: ["source-steps"] });
        await other.project.open(text);
        assert.strictEqual(other.data.sourceTable(key).summary().mapping.key, "person_id");
        other.dispose();
        steps.dispose();
    });

    it("reopens a CSV node table keyed by the id column it was loaded with, not the importer's default now", async () => {
        // person_id and name are both filled and distinct: graph-io's default picks person_id,
        // an older default picked name. A reopened load must key the rows as they were saved.
        const peopleUrl = `${HOST}/data/people.csv`;
        const people = "person_id,name,age\np1,Ann,30\np2,Bob,41\np3,Cy,25\n";
        const peopleFetch = (): ReturnType<typeof replayFetch> => replayFetch([{ url: peopleUrl, body: people }]);
        let text = "";
        await withSession(async (session) => {
            await session.data.import({ source: "url", config: { url: peopleUrl } }, { fetch: peopleFetch() });
            assert.sameMembers(
                session.data.nodes().map((node) => node.id),
                ["p1", "p2", "p3"],
            );
            const settings = session.data.sourceSettings(session.data.sources()[0].key);
            assert.strictEqual(settings?.config.idColumn, "person_id", "the column the import used is saved");
            ({ text } = await session.project.save());
        });

        await withSession(async (session) => {
            await session.project.open(text);
            const [pending] = session.data.pendingSourceLoads();
            assert.strictEqual(pending.params.idColumn, "person_id");
            await session.data.runPendingSourceLoad(pending.id, { fetch: peopleFetch() });
            assert.sameMembers(
                session.data.nodes().map((node) => node.id),
                ["p1", "p2", "p3"],
                "the same nodes, none added under other ids",
            );
        });
    });

    it("refuses a file at the address its format cannot read as E_PARSE_FAILED, naming the format", async () => {
        await withSession(async (session) => {
            const url = `${HOST}/friends.csv`;
            const fetch = replayFetch([{ url, body: "user_id,friend_id\nu1,u2\nu2,u3\n" }]);
            const error: unknown = await session.data.import({ source: "url", config: { url } }, { fetch }).then(
                () => null,
                (caught: unknown) => caught,
            );
            if (!(error instanceof GraphtyError)) {
                assert.fail("expected a GraphtyError");
            }
            assert.strictEqual(error.code, "E_PARSE_FAILED");
            assert.strictEqual(error.details.format, "csv");
        });
    });
});

describe("a CSV column of codes", () => {
    const ROWS = ["id,duns,rating", "V1,081676307,5", "V2,081 781 036,n/a", "V3,500000000,2", ""].join("\n");

    it("stays text on every row of a file or a URL, so a join's column is one type; other columns type each cell", async () => {
        const url = `${HOST}/data/vendors.csv`;
        for (const source of [
            { source: "url", config: { url } },
            { type: "csv", config: { data: ROWS }, name: "vendors.csv" },
        ]) {
            for (const features of [[], ["source-steps" as const]]) {
                const session = createGraphSession({ features });
                await session.data.import(source, { fetch: replayFetch([{ url, body: ROWS }]) });
                const nodes = session.data.nodes();
                assert.deepStrictEqual(
                    nodes.map((node) => node.duns),
                    ["081676307", "081 781 036", "500000000"],
                );
                if (!("source" in source)) {
                    assert.deepStrictEqual(
                        nodes.map((node) => node.rating),
                        [5, "n/a", 2],
                    );
                }
                session.dispose();
            }
        }
    });

    it("is one type once merged with a file whose codes are all led by a zero", async () => {
        const session = createGraphSession({ features: ["source-steps"] });
        await session.data.import(
            { type: "csv", config: { data: "id,duns\nS1,081676307\nS2,081571578\n" }, name: "a.csv" },
            { key: "id" },
        );
        const b = await session.data.stage({ type: "csv", config: { data: ROWS }, name: "b.csv" }, { key: "id" });
        const draft = session.data.draft();
        draft.merge({
            from: { source: b, field: "duns" },
            into: { source: session.data.sources()[0].key, field: "duns" },
            ignoreSpaces: true,
        });
        await draft.commit();
        assert.deepStrictEqual([...new Set(session.data.nodes().map((node) => typeof node.duns))], ["string"]);
        session.dispose();
    });
});
