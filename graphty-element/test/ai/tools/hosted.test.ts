/**
 * @file Resolving the web tools a configuration asks for against what a provider and model can
 * run, and what one turn of the research helper is offered: the hosts web fetch may reach and the
 * uses left.
 */

import { assert, describe, it } from "vitest";

import { NO_HOSTED_TOOLS } from "../../../src/ai/engine/types";
import { capabilitiesOf, resolveTools, turnHostedTools } from "../../../src/ai/tools/hosted";
import { readerGave, readerUrls } from "../../../src/ai/tools/readerUrls";
import { AI_HOSTED_TOOL_CAPABILITIES, aiHostedToolStatus } from "../../../src/catalog/ai";

const BOTH = { "web-search": "available", "web-fetch": "available" } as const;

describe("capabilities", () => {
    it("takes web tools from the engine, and the catalog's table", () => {
        // Google's web fetch is URL context: available, its page text never handed back.
        assert.deepStrictEqual(AI_HOSTED_TOOL_CAPABILITIES.google, {
            "web-search": "available",
            "web-fetch": "available",
            "in-page-code": "available",
        });
        assert.strictEqual(aiHostedToolStatus("google", "gemini-3.8-flash", "web-fetch"), "available");
        assert.strictEqual(aiHostedToolStatus("openai", "gpt-4o", "web-fetch"), "unsupported");
        assert.deepStrictEqual(capabilitiesOf("google", "gemini-3.8-flash", BOTH).tools, {
            "web-search": "available",
            "web-fetch": "available",
            "in-page-code": "available",
        });
        // The provider-API engine offers only what the catalog lists as available.
        assert.strictEqual(
            capabilitiesOf("openai", "gpt-4o", { "web-search": "available", "web-fetch": "unsupported" }).tools[
                "web-fetch"
            ],
            "unsupported",
        );
        assert.deepStrictEqual(capabilitiesOf("mock", "mock", NO_HOSTED_TOOLS).tools["web-search"], "unsupported");
        // A provider instance of the consumer's own: whatever its engine runs.
        assert.deepStrictEqual(capabilitiesOf("mine", "", BOTH).tools["web-fetch"], "available");
        // A helper's own provider, with no engine yet: the catalog's.
        assert.strictEqual(capabilitiesOf("anthropic", "claude-haiku-4-5-20251001").tools["web-fetch"], "available");
    });
});

describe("resolving the tool options", () => {
    it("keeps what the provider can run as asked and reports the rest", () => {
        const google = capabilitiesOf("google", "gemini-3.8-flash", {
            "web-search": "available",
            "web-fetch": "unsupported",
        });
        const resolved = resolveTools({ webSearch: { maxUses: 2 }, webFetch: true }, google);
        assert.deepStrictEqual(resolved.offered, [{ tool: "web-search", maxUses: 2 }]);
        assert.deepStrictEqual(resolved.unavailable, [
            {
                tool: "web-fetch",
                params: { provider: "google", model: "gemini-3.8-flash", tool: "web-fetch" },
                required: false,
            },
        ]);
    });

    it("leaves out a domain-limited search on Google, which has no domain filter", () => {
        const google = capabilitiesOf("google", "gemini-3.8-flash", {
            "web-search": "available",
            "web-fetch": "unsupported",
        });
        const resolved = resolveTools({ webSearch: { allowedDomains: ["example.org"], required: true } }, google);
        assert.deepStrictEqual(resolved.offered, []);
        assert.isTrue(resolved.unavailable[0].required);
    });

    it("asks for nothing by default", () => {
        assert.deepStrictEqual(resolveTools(undefined, capabilitiesOf("mine", "", BOTH)), {
            offered: [],
            unavailable: [],
            inPageCode: false,
        });
        assert.deepStrictEqual(resolveTools({ webSearch: false }, capabilitiesOf("mine", "", BOTH)).offered, []);
    });
});

describe("one turn's web tools", () => {
    it("lets web fetch reach the configured hosts and the hosts the reader wrote, never another", () => {
        const setting = [{ tool: "web-fetch" as const, allowedDomains: ["docs.example.org"] }];
        assert.deepStrictEqual(
            turnHostedTools(setting, "compare (https://a.example.com/x) and http://b.example.net.", {}),
            [{ tool: "web-fetch", allowedDomains: ["docs.example.org", "a.example.com", "b.example.net"] }],
        );
        assert.deepStrictEqual(turnHostedTools([{ tool: "web-fetch" }], "no address here", {}), []);
        assert.deepStrictEqual(turnHostedTools([{ tool: "web-fetch" }], "see example.com/x", {}), [], "not a URL");
    });

    it("offers the uses left, and nothing once they are spent", () => {
        const setting = [{ tool: "web-search" as const, maxUses: 3 }];
        assert.deepStrictEqual(turnHostedTools(setting, "", { "web-search": 1 }), [{ tool: "web-search", maxUses: 2 }]);
        assert.deepStrictEqual(turnHostedTools(setting, "", { "web-search": 3 }), []);
        assert.deepStrictEqual(turnHostedTools([{ tool: "web-search" }], "", { "web-search": 9 }), [
            { tool: "web-search" },
        ]);
    });
});

describe("the reader's URLs", () => {
    it("are whole words, with the punctuation around them taken off", () => {
        assert.deepStrictEqual(
            readerUrls("read <https://x.org/a>, then ftp://y.org and https://z.org.").map((url) => url.href),
            ["https://x.org/a", "https://z.org/"],
        );
        assert.isTrue(readerGave(new URL("https://x.org/a"), "read (https://x.org/a)"));
        assert.isFalse(readerGave(new URL("https://x.org/a"), "read https://x.org/ab"));
    });
});
