/**
 * @file A message taken back did not happen: it leaves the selection it found and nothing to redo,
 * so Redo can never apply a removal the reader was asked about with no request in sight. A reader's
 * own Undo of a running message is the reader's act, and does what an Undo always does.
 */

import { assert, describe, it } from "vitest";

import type { GraphSession } from "../../session";
import type { FakeTurn } from "../../src/ai/engine/FakeEngine";
import { assistantSession, callsTurn, ScriptedAssistant, textTurn } from "../helpers/assistant";

const REMOVE = { tool: "edit_data", args: { action: "remove_nodes", ids: ["b", "c"] } };
const RENAME = { tool: "edit_data", args: { action: "update_nodes", ids: ["b"], values: { team: "green" } } };
/** A write the style tool refuses: no such property. */
const REFUSED = { tool: "style", args: { action: "add", where: "data.type == 'server'", values: { "node.nope": 1 } } };

/** A model turn that cannot reach the model. */
const OFFLINE: FakeTurn = () => {
    throw new Error("offline");
};

/**
 * A freshly opened graph with `a` selected, and a removal of `b` and `c` waiting for the reader.
 * @returns The session, the assistant and the request's id.
 */
async function heldRemoval(): Promise<{ session: GraphSession; assistant: ScriptedAssistant; id: string }> {
    const session = await assistantSession();
    await session.selection.apply({ nodes: ["a"] });
    session.history.clear();
    const assistant = new ScriptedAssistant(session, { approvals: { ask: ["edit_data"] } });
    assistant.engine.push(callsTurn([REMOVE]));
    await assistant.controller.execute("take out b and c");
    const [request] = assistant.controller.getPendingApprovals();
    return { session, assistant, id: request.id };
}

/**
 * Assert a removal left nothing behind.
 * @param session - The session.
 */
function assertNothingLeft(session: GraphSession): void {
    assert.exists(session.data.node("b"), "the removal was taken back");
    assert.isFalse(session.canUndo, "Undo is dim");
    assert.isFalse(session.canRedo, "Redo is dim: it would remove with no request");
    assert.deepStrictEqual([...session.selection.nodes], ["a"], "the selection is the one it found");
}

describe("a message taken back", () => {
    it("leaves nothing after a removal the reader approved, when the model then fails", async () => {
        const { session, assistant, id } = await heldRemoval();
        assistant.engine.push(OFFLINE);

        const result = await assistant.controller.resolveAiApproval(id, { approve: true });

        assert.isFalse(result.success);
        assertNothingLeft(session);
    });

    it("leaves nothing after a removal the reader approved, when a later write fails", async () => {
        const { session, assistant, id } = await heldRemoval();
        assistant.engine.push(callsTurn([REFUSED], 1), textTurn("That did not work."));

        const result = await assistant.controller.resolveAiApproval(id, { approve: true });

        assert.strictEqual(result.code, "AI_TOOL_FAILED");
        assertNothingLeft(session);
    });

    it("keeps a rule the selection came from", async () => {
        const session = await assistantSession();
        const rule = { where: "data.type == 'server'" };
        await session.selection.apply(rule);
        const assistant = new ScriptedAssistant(session);
        assistant.engine.push(callsTurn([RENAME]), OFFLINE);

        await assistant.controller.execute("rename b");

        assert.isFalse(session.canRedo, "the message wrote, and was taken back");
        assert.deepStrictEqual(session.selection.origin, rule);
    });

    it("leaves a step the reader undid earlier on Redo, when it took nothing back", async () => {
        const session = await assistantSession();
        await session.data.addNodes([{ id: "f" }]);
        await session.undo();
        const assistant = new ScriptedAssistant(session);
        assistant.engine.push(OFFLINE);

        await assistant.controller.execute("say hello");

        assert.isTrue(session.canRedo);
    });
});

describe("a reader's own Undo of a running message", () => {
    it("stays an Undo: Redo lit, and the selection it made", async () => {
        const session = await assistantSession();
        await session.selection.apply({ nodes: ["a"] });
        const assistant = new ScriptedAssistant(session);
        const stop = session.on("history:changed", ({ reason }) => {
            if (reason === "record") {
                stop();
                void session.undo();
            }
        });
        assistant.engine.push(callsTurn([RENAME]), OFFLINE);

        const result = await assistant.controller.execute("rename b");

        assert.strictEqual(result.code, "AI_UNDONE");
        assert.isTrue(session.canRedo, "the reader may still redo it");
        assert.deepStrictEqual([...session.selection.nodes], ["b"], "an Undo selects what it changed");
    });
});
