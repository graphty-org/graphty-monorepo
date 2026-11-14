/**
 * @file A graph whose ids are numbers (GML, a CSV of integers) is styled and filtered by the ids a
 * model writes, which are always text: the tools must match `"1"` to the node `1`, and a write
 * that paints nothing must come back as a refusal the model reads, never as a success.
 */

import { assert, describe, it } from "vitest";

import { assistantSession, ScriptedAssistant } from "../../helpers/assistant";

/** Six nodes with integer ids, as the GML importer loads karate.gml. */
const NUMERIC = {
    nodes: Array.from({ length: 6 }, (_, i) => ({ id: i + 1 })),
    edges: Array.from({ length: 5 }, (_, i) => ({ source: i + 1, target: i + 2 })),
};

/**
 * A node's resolved color.
 * @param session - The session.
 * @param id - The node.
 * @returns The color as the style stack resolves it.
 */
function colorOf(session: Awaited<ReturnType<typeof assistantSession>>, id: number): unknown {
    const merged = session.styles.explain({ node: id as never }).merged as unknown as Record<string, unknown>;
    return merged["node.color"] ?? (merged.node as Record<string, unknown> | undefined)?.color;
}

describe("numeric node ids", () => {
    it("paints the nodes a model names by text ids, and says how many it painted", async () => {
        const session = await assistantSession(NUMERIC);
        const assistant = new ScriptedAssistant(session);
        await assistant.say("odd ids red", [
            { tool: "style", args: { action: "add", ids: ["1", "3", "5"], values: { "node.color": "red" } } },
        ]);
        const [added] = assistant.lastResults();
        assert.strictEqual(added.code, "style.add-layer", JSON.stringify(added));
        for (const id of [1, 3, 5]) {
            assert.match(JSON.stringify(colorOf(session, id)), /red|#ff0000/i, `node ${String(id)} is not red`);
        }

        assert.notMatch(JSON.stringify(colorOf(session, 2)), /red|#ff0000/i);
        assert.strictEqual(added.params.matched, 3, JSON.stringify(added));
        assert.deepStrictEqual(added.params.painted, { "node.color": 3 }, JSON.stringify(added));
    });

    it("refuses a layer whose ids name no node, instead of reporting it added", async () => {
        const session = await assistantSession(NUMERIC);
        const assistant = new ScriptedAssistant(session);
        await assistant.say("color 99", [
            { tool: "style", args: { action: "add", ids: ["99", "98"], values: { "node.color": "red" } } },
        ]);
        const [added] = assistant.lastResults();
        assert.notStrictEqual(added.code, "style.add-layer", JSON.stringify(added));
        assert.lengthOf(
            session.styles.list().filter((layer) => layer.source.by === "plugin"),
            0,
        );
    });
});

describe("a style write that paints nothing is refused", () => {
    it("refuses a layer that a layer above covers everywhere, and rolls it back", async () => {
        const session = await assistantSession();
        await session.styles.add({
            name: "reader",
            target: "node",
            selector: { match: "everything" },
            set: { "node.color": "blue" },
        });
        const assistant = new ScriptedAssistant(session);
        await assistant.say("red under", [
            {
                tool: "style",
                args: { action: "add", where: "all", values: { "node.color": "red" }, position: "bottom" },
            },
        ]);
        const [added] = assistant.lastResults();
        assert.strictEqual(added.code, "AI_PAINTED_NOTHING", JSON.stringify(added));
        assert.strictEqual(added.params.matched, 5);
        assert.lengthOf(
            session.styles.list().filter((layer) => layer.source.by === "plugin"),
            0,
        );
    });

    it("refuses an update whose new target matches nothing", async () => {
        const session = await assistantSession();
        const assistant = new ScriptedAssistant(session);
        await assistant.say("red", [
            { tool: "style", args: { action: "add", name: "mine", where: "all", values: { "node.color": "red" } } },
        ]);
        await assistant.say("only the missing", [
            { tool: "style", args: { action: "update", layer: "mine", where: "data.type == 'router'" } },
        ]);
        const [updated] = assistant.lastResults();
        assert.strictEqual(updated.code, "AI_EMPTY_MATCH", JSON.stringify(updated));
    });
});
