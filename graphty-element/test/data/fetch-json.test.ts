import { assert, describe, it, vi } from "vitest";

import { fetchJson } from "../../src/data/source-bytes";
import { GraphtyError } from "../../src/errors/GraphtyError";

describe("fetchJson", () => {
    it("reads the document at the URL", async () => {
        const value = await fetchJson('data:application/json,{"majorVersion":"1"}');

        assert.deepStrictEqual(value, { majorVersion: "1" });
    });

    it("refuses an HTTP failure with E_FETCH_FAILED", async () => {
        vi.stubGlobal("fetch", () => Promise.resolve(new Response("missing", { status: 404 })));
        try {
            const error: unknown = await fetchJson("missing.json").catch((e: unknown) => e);
            assert.instanceOf(error, GraphtyError);
            assert.strictEqual(error.code, "E_FETCH_FAILED");
            assert.strictEqual(error.details.status, 404);
        } finally {
            vi.unstubAllGlobals();
        }
    });

    it("refuses a body that is not JSON with E_PARSE_FAILED", async () => {
        const error: unknown = await fetchJson("data:text/plain,not%20json").catch((e: unknown) => e);
        assert.instanceOf(error, GraphtyError);
        assert.strictEqual(error.code, "E_PARSE_FAILED");
    });
});
