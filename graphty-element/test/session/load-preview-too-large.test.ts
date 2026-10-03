/**
 * @file The too-large refusal names its limit, from a preview and from an import alike, so a
 * reader can be told the number the load ran into. The ceiling is mocked small.
 */

import { assert, describe, it, vi } from "vitest";

vi.mock("../../src/session/limits", async (importOriginal) => {
    const original = await importOriginal<typeof import("../../src/session/limits")>();
    return { ...original, DEFAULT_LIMITS: { ...original.DEFAULT_LIMITS, renderCeiling: 3 } };
});

const { createGraphSession } = await import("../../src/session");

const FOUR = JSON.stringify({ nodes: [{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }], edges: [] });

/**
 * The error a promise rejects with.
 * @param promise - the promise
 * @returns the error, or null when it resolved
 */
async function refusal(
    promise: Promise<unknown>,
): Promise<{ code?: string; details?: Record<string, unknown> } | null> {
    return promise.then(
        () => null,
        (error: unknown) => error as { code?: string; details?: Record<string, unknown> },
    );
}

describe("E_TOO_LARGE on a load", () => {
    it("names the limit in a preview and in an import", async () => {
        const session = createGraphSession();
        const source = { type: "json", config: { data: FOUR } };

        const previewed = await refusal(session.data.preview(source));
        assert.strictEqual(previewed?.code, "E_TOO_LARGE");
        assert.strictEqual(previewed?.details?.limit, 3);

        const imported = await refusal(session.data.import(source));
        assert.strictEqual(imported?.code, "E_TOO_LARGE");
        assert.strictEqual(imported?.details?.limit, 3);
        session.dispose();
    });
});
