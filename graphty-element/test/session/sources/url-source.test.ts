/**
 * graph-io's `url` source through `session.data`: a graph file at a web address with a query
 * string loads, its address is kept in the load's params, a credential remembered for the
 * address's origin is used on the load and on Refresh, and a saved project reopens with the load
 * waiting against that address.
 */

import { assert, describe, it } from "vitest";

import { createGraphSession, credentials, type GraphSession, replayFetch } from "../../../session";
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
});
