/**
 * @file A helper configuration that cannot run is rejected before anything is built: `checkAgents`
 * throws an `AiConfigError` naming the helper, the field and why (`enableAiControl` rejects with it:
 * test/browser/ai/result-codes.test.ts).
 */

import { assert, describe, it } from "vitest";

import {
    type AiAgentRole,
    type AiAgentsSetting,
    AiConfigError,
    MAX_AGENT_NAME_LENGTH,
    MAX_AGENT_PURPOSE_LENGTH,
    MAX_AGENTS,
} from "../../../src/ai/agents";
import { AiController } from "../../../src/ai/AiController";
import { CommandRegistry } from "../../../src/ai/commands";
import { checkAgents } from "../../../src/ai/roles";

const COUNTER: AiAgentRole = { name: "counter", purpose: "Count nodes.", commands: ["query"] };

/**
 * The error a configuration is rejected with.
 * @param setting - The helpers.
 * @returns The error.
 */
function rejection(setting: AiAgentsSetting, main?: string): AiConfigError {
    try {
        checkAgents(setting, main);
    } catch (error) {
        assert.instanceOf(error, AiConfigError);
        return error;
    }

    return assert.fail("accepted");
}

describe("checkAgents", () => {
    it("accepts roles naming the assistant's tools, as a list or as { roles }", () => {
        checkAgents([COUNTER, { name: "stylist", purpose: "Color.", commands: ["style", "select"] }]);
        checkAgents({ roles: [{ ...COUNTER, provider: "anthropic", model: "claude-haiku-4-5-20251001" }] });
    });

    it.each([
        ["an unknown command", [{ ...COUNTER, commands: ["query", "paint"] }], "commands", "unknown-command"],
        ["a loop-owned tool", [{ ...COUNTER, commands: ["delegate"] }], "commands", "unknown-command"],
        ["a duplicate name", [COUNTER, COUNTER], "name", "duplicate"],
        ["a reserved name", [{ ...COUNTER, name: "main" }], "name", "reserved"],
        ["an empty name", [{ ...COUNTER, name: " " }], "name", "empty"],
        ["an empty purpose", [{ ...COUNTER, purpose: "" }], "purpose", "empty"],
        ["the in-browser model", [{ ...COUNTER, provider: "webllm" as const }], "provider", "unsupported"],
        ["a name past the limit", [{ ...COUNTER, name: "n".repeat(MAX_AGENT_NAME_LENGTH + 1) }], "name", "too-long"],
        [
            "a purpose past the limit",
            [{ ...COUNTER, purpose: "x".repeat(MAX_AGENT_PURPOSE_LENGTH + 1) }],
            "purpose",
            "too-long",
        ],
    ])("rejects %s, naming the field", (_case, roles, field, reason) => {
        const error = rejection(roles);
        assert.strictEqual(error.code, "AI_CONFIG_INVALID");
        assert.deepInclude(error.params, { field, reason });
        assert.strictEqual(error.params.agent, roles.at(-1)?.name);
    });

    it("names the unknown command", () => {
        assert.strictEqual(rejection([{ ...COUNTER, commands: ["paint"] }]).params.command, "paint");
    });

    it(`rejects more than ${String(MAX_AGENTS)} helpers`, () => {
        const roles = Array.from({ length: MAX_AGENTS + 1 }, (_, at) => ({ ...COUNTER, name: `h${String(at)}` }));
        assert.deepInclude(rejection(roles).params, { field: "agents", reason: "too-many", limit: MAX_AGENTS });
        checkAgents(roles.slice(0, MAX_AGENTS));
    });

    it.each([
        ["the in-browser model", "webllm"],
        ["a provider of the host's own", "my-provider"],
    ])("rejects a model alone on %s, which the element cannot build a second of", (_case, main) => {
        const modelled = [{ ...COUNTER, model: "small-model" }];
        assert.deepInclude(rejection(modelled, main).params, {
            agent: "counter",
            field: "model",
            reason: "unsupported",
        });
        assert.deepInclude(
            rejection({ roles: [COUNTER], router: "classifier", classifierModel: "small-model" }, main).params,
            { field: "classifierModel", reason: "unsupported" },
        );
        // With a provider of its own, the role builds that one instead.
        checkAgents([{ ...COUNTER, provider: "anthropic", model: "claude-haiku-4-5-20251001" }], main);
    });

    it("rejects web tools beside a command on a main provider that cannot mix them, and accepts it elsewhere", () => {
        const searcher = [{ ...COUNTER, tools: { webSearch: true } }];
        assert.deepInclude(rejection(searcher, "google").params, {
            agent: "counter",
            field: "tools",
            reason: "unsupported",
        });
        checkAgents(searcher, "anthropic");
        checkAgents([{ ...COUNTER, provider: "openai" as const, tools: { webSearch: true } }], "google");
    });

    it("accepts a model alone on one of the element's remote providers", () => {
        checkAgents({ roles: [{ ...COUNTER, model: "gemini-small" }], classifierModel: "gemini-small" }, "google");
    });

    it("is checked by new AiController too, not only by enableAiControl", () => {
        const bad = [{ ...COUNTER, commands: ["paint"] }];
        assert.throws(
            () =>
                new AiController({
                    provider: { name: "google" } as never,
                    commandRegistry: new CommandRegistry(),
                    graph: {} as never,
                    agents: bad,
                }),
            AiConfigError,
        );
    });
});
