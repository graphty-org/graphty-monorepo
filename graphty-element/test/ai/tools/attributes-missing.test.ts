/**
 * @file The attributes read says how many elements carry no value, so a model asked which
 * attributes are missing values reads the count instead of guessing from samples (#9000).
 */

import { assert, describe, it } from "vitest";

import { assistantSession, ScriptedAssistant } from "../../helpers/assistant";

const GAPPY = {
    nodes: [
        { id: "a", expression: 1, kind: "gene" },
        { id: "b", expression: 2, kind: "gene" },
        { id: "c", kind: "gene" },
        { id: "d", kind: "gene" },
    ],
    edges: [{ source: "a", target: "b" }],
};

describe("query attributes", () => {
    it("counts the nodes missing a value, and says nothing for a complete column", async () => {
        const session = await assistantSession(GAPPY);
        const assistant = new ScriptedAssistant(session);
        await assistant.say("what is missing?", [{ tool: "query", args: { action: "attributes" } }]);
        const [result] = assistant.lastResults();
        const columns = result.data as { path: string; kind: string; missing?: number }[];
        const byPath = new Map(columns.filter((c) => c.kind === "node").map((c) => [c.path, c]));
        assert.strictEqual(byPath.get("data.expression")?.missing, 2, JSON.stringify(columns));
        assert.notProperty(byPath.get("data.kind"), "missing");
    });
});
