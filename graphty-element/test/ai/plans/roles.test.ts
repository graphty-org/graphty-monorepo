/**
 * @file A helper configuration that cannot run is rejected before anything is built: `checkAgents`
 * throws an `AiConfigError` naming the helper, the field and why (`enableAiControl` rejects with it:
 * test/browser/ai/result-codes.test.ts).
 */

import { assert, describe, it } from "vitest";

import { type AiAgentRole, type AiAgentsSetting, AiConfigError } from "../../../src/ai/agents";
import { checkAgents } from "../../../src/ai/plans/roles";

const COUNTER: AiAgentRole = { name: "counter", purpose: "Count nodes.", commands: ["query"] };

/**
 * The error a configuration is rejected with.
 * @param setting - The helpers.
 * @returns The error.
 */
function rejection(setting: AiAgentsSetting): AiConfigError {
    try {
        checkAgents(setting);
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
    ])("rejects %s, naming the field", (_case, roles, field, reason) => {
        const error = rejection(roles);
        assert.strictEqual(error.code, "AI_CONFIG_INVALID");
        assert.deepInclude(error.params, { field, reason });
        assert.strictEqual(error.params.agent, roles.at(-1)?.name);
    });

    it("names the unknown command", () => {
        assert.strictEqual(rejection([{ ...COUNTER, commands: ["paint"] }]).params.command, "paint");
    });
});
