/**
 * @file A value a reader cannot read as its column's type is dropped, and the node or edge it
 * belongs to is kept: the load raises no refused-row issue for it, whether the file comes from a
 * web address or from disk.
 */

import { readFileSync } from "node:fs";

import { afterEach, assert, describe, it, vi } from "vitest";

import { createGraphSession, type GraphSession } from "../../src/session";

/** A yeast network whose nodes "?" and "YER056CA" hold "null" in three number columns. */
const YEAST = readFileSync(new URL("../fixtures/graphs/yeast-galactose.graphml", import.meta.url), "utf8");
const NAME = "yeast-galactose.graphml";

/**
 * A session holding the yeast network, loaded from the given config.
 * @param config - the source config
 * @returns the session
 */
async function load(config: Record<string, unknown>): Promise<GraphSession> {
    const session = createGraphSession();
    const draft = await session.data.prepare({ config, name: NAME });
    await draft.load();
    return session;
}

afterEach(() => {
    vi.restoreAllMocks();
});

describe("a dropped value is not a refused row", () => {
    it("loads every edge from a web address with no refused-row issue", async () => {
        vi.spyOn(globalThis, "fetch").mockImplementation(() => Promise.resolve(new Response(YEAST, { status: 200 })));
        const session = await load({ url: `https://data.example.com/${NAME}` });
        assert.strictEqual(session.data.nodes().length, 331);
        assert.strictEqual(session.data.edges().length, 361);
        assert.deepEqual(
            session.data.issues({ includeIgnored: true }).map((each) => each.id),
            [],
        );
    });

    it("loads every edge from a local file with no refused-row issue", async () => {
        const session = await load({ file: new File([YEAST], NAME) });
        assert.strictEqual(session.data.nodes().length, 331);
        assert.strictEqual(session.data.edges().length, 361);
        assert.deepEqual(
            session.data.issues({ includeIgnored: true }).map((each) => each.id),
            [],
        );
    });
});
