/**
 * Until click-to-expand lands, expanding and collapsing reject with E_SOURCE_UNSUPPORTED and change
 * nothing, and the records and pending list stay empty.
 */

import { assert, describe, it } from "vitest";

import { createGraphSession } from "../../../session";
import type { GraphtyError } from "../../../src/errors/GraphtyError";

describe("session.data source calls before they land", () => {
    it("reject with E_SOURCE_UNSUPPORTED and leave the history empty", async () => {
        const session = createGraphSession();
        try {
            const calls: Promise<unknown>[] = [session.data.expand(["a"]), session.data.collapse("a")];
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
