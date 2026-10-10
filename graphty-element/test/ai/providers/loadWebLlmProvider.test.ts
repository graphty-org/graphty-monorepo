/**
 * @file Building the in-browser provider without `@mlc-ai/web-llm` installed rejects with
 * `E_MISSING_PACKAGE`, and building any other provider never loads the package.
 *
 * `enableAiControl({ provider: "webllm" })` builds its provider through `loadWebLlmProvider`;
 * test/browser/ai/enable-webllm.test.ts covers that path with the package present.
 */
import { assert, describe, it, vi } from "vitest";

import { createProvider, loadWebLlmProvider } from "../../../src/ai/providers";
import { isGraphtyError } from "../../../src/errors";

/** How many times anything asked for `@mlc-ai/web-llm`. */
const loads = vi.hoisted(() => ({ count: 0 }));

vi.mock("@mlc-ai/web-llm", () => {
    loads.count++;
    throw new Error("Cannot find package '@mlc-ai/web-llm'");
});

describe("loadWebLlmProvider without @mlc-ai/web-llm", () => {
    it("does not load the package for another provider", () => {
        createProvider("mock");
        createProvider("openai");

        assert.strictEqual(loads.count, 0);
    });

    it("rejects with E_MISSING_PACKAGE naming the package", async () => {
        const error: unknown = await loadWebLlmProvider().then(
            () => null,
            (err: unknown) => err,
        );

        assert.ok(isGraphtyError(error), String(error));
        assert.strictEqual(error.code, "E_MISSING_PACKAGE");
        assert.deepStrictEqual(error.details, { package: "@mlc-ai/web-llm", feature: "webllm" });
        assert.strictEqual(loads.count, 1);
    });
});
