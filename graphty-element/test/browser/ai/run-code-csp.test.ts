/**
 * @file In-page code on a page whose content security policy forbids compiling WebAssembly
 * (`script-src 'self'`, no `'wasm-unsafe-eval'`): the element reports `in-page-code` unsupported,
 * leaves `run_code` out and says so once on `ai-capability-unavailable`; asked for as `required`,
 * every command resolves `AI_HOSTED_TOOL_UNSUPPORTED`. The policy is put on this test's own page
 * before the element probes (a policy cannot be lifted again, so this file holds only this case;
 * run-code.test.ts runs the same probe on a page without one).
 */

import "../../../src/graphty-element";

import { afterEach, assert, describe, it } from "vitest";

import type { Graphty } from "../../../index.js";

const mounted: Graphty[] = [];

afterEach(() => {
    for (const element of mounted.splice(0)) {
        element.disableAiControl();
        element.remove();
    }
});

/**
 * An element with the assistant on the mock provider, in-page code asked for.
 * @param required - Whether in-page code is `required`.
 * @returns The element and the tools its capability events named.
 */
async function assistant(required: boolean): Promise<{ element: Graphty; reported: string[] }> {
    const element = document.createElement("graphty-element");
    element.style.display = "block";
    element.style.width = "200px";
    element.style.height = "150px";
    document.body.appendChild(element);
    mounted.push(element);
    await element.waitForSettled();
    const reported: string[] = [];
    element.addListener("ai-capability-unavailable", (event) => {
        if (event.type === "ai-capability-unavailable") {
            reported.push(`${event.tool}:${event.code}:${String(event.params.tool)}`);
        }
    });
    await element.enableAiControl({ provider: "mock", tools: { inPageCode: required ? { required } : true } });
    return { element, reported };
}

describe("in-page code under a content security policy without 'wasm-unsafe-eval'", () => {
    it("is unsupported: left out, reported once, and fatal when required", async () => {
        const meta = document.createElement("meta");
        meta.httpEquiv = "Content-Security-Policy";
        meta.content = "script-src 'self'";
        document.head.append(meta);
        assert.throws(() => new WebAssembly.Module(new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0])));

        const optional = await assistant(false);
        assert.strictEqual(optional.element.getAiCapabilities()?.tools["in-page-code"], "unsupported");
        const result = await optional.element.aiCommand("hello");
        await optional.element.aiCommand("hello again");
        assert.strictEqual(result.code, "AI_COMPLETED", "the command still runs");
        assert.deepStrictEqual(
            optional.reported,
            ["in-page-code:AI_HOSTED_TOOL_UNSUPPORTED:in-page-code"],
            "reported once, not per command",
        );

        const required = await assistant(true);
        const refused = await required.element.aiCommand("hello");
        assert.strictEqual(refused.code, "AI_HOSTED_TOOL_UNSUPPORTED");
        assert.strictEqual(refused.params?.tool, "in-page-code");
    });
});
