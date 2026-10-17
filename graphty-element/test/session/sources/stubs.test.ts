/**
 * Until loading, expanding and the credential store land, the session's source calls reject with
 * E_SOURCE_UNSUPPORTED and change nothing, and the records and pending list are empty.
 */

import { assert, describe, it } from "vitest";

import { createGraphSession } from "../../../session";
import type { GraphtyError } from "../../../src/errors/GraphtyError";

describe("session.data source calls before they land", () => {
    it("reject with E_SOURCE_UNSUPPORTED and leave the history empty", async () => {
        const session = createGraphSession();
        try {
            const calls: Promise<unknown>[] = [
                session.data.import({ source: "ndex", config: { uuid: "u" } }),
                session.data.testSource({ source: "ndex", config: { uuid: "u" } }),
                session.data.listSource({ source: "ndex", config: {} }),
                session.data.expand(["a"]),
                session.data.collapse("a"),
                session.data.more(),
                session.data.runPendingSourceLoad("load-1"),
            ];
            for (const call of calls) {
                const error = (await call.then(
                    () => null,
                    (e: unknown) => e,
                )) as GraphtyError | null;
                assert.strictEqual(error?.code, "E_SOURCE_UNSUPPORTED");
            }
            assert.deepEqual(session.data.loads(), []);
            assert.deepEqual(session.data.pendingSourceLoads(), []);
            assert.strictEqual(session.history.steps.length, 0);
        } finally {
            session.dispose();
        }
    });
});
