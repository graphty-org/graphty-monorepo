/**
 * @file A run scoped by a selector settles its scope as a target does: the word the facts line
 * teaches names the message's selection, and a selector takes the same repairs.
 */

import { assert, describe, it } from "vitest";

import type { GraphSession } from "../../session";
import { assistantSession, callsTurn, ScriptedAssistant, textTurn } from "../helpers/assistant";

const ON = ["assistant"];
const WHOLE = { tool: "run_algorithm", args: { name: "degree", style: false } };

/**
 * A run over a scope.
 * @param where - The scope's selector.
 * @returns The call.
 */
function scoped(where: string): { tool: string; args: Record<string, unknown> } {
    return { tool: "run_algorithm", args: { name: "pagerank", style: false, scope: { where } } };
}

/**
 * Send one message with `a` and `b` selected, one batch per call.
 * @param bound - Whether the message is bound to the selection.
 * @param calls - The calls.
 * @returns The session and what the model read for each call.
 */
async function send(
    bound: boolean,
    ...calls: { tool: string; args: Record<string, unknown> }[]
): Promise<{ session: GraphSession; read: ReturnType<ScriptedAssistant["lastResults"]> }> {
    const session = await assistantSession(undefined, ON);
    await session.selection.apply({ ids: ["a", "b"] });
    const assistant = new ScriptedAssistant(session, { gate: false });
    assistant.engine.push(...calls.map((call, turn) => callsTurn([call], turn)), textTurn("done"));
    await assistant.controller.execute("which is the bridge?", bound ? { scope: "selection" } : undefined);
    return { session, read: assistant.lastResults() };
}

describe("a run scoped on a message bound to a selection", () => {
    it("runs on the selection, and keeps the whole-graph run before it", async () => {
        const { session, read } = await send(true, WHOLE, scoped("selection"));

        assert.deepEqual(
            read.map((result) => result.code),
            ["AI_OK", "AI_OK"],
            JSON.stringify(read),
        );
        const [whole, part] = session.runs.list();
        assert.strictEqual(whole.scope.nodeCount, 5);
        assert.deepEqual(part.scope.spec, { nodes: ["a", "b"] });
        assert.strictEqual(part.status, "succeeded");
    });

    it("limits a selector to the selection", async () => {
        const { session } = await send(true, scoped("type == 'server'"));

        assert.deepEqual(session.runs.list()[0].scope.spec, { nodes: ["a"] });
    });

    it("reads all as the selection", async () => {
        const { session } = await send(true, scoped("all"));

        assert.deepEqual(session.runs.list()[0].scope.spec, { nodes: ["a", "b"] });
    });
});

describe("a run scoped with no selection bound", () => {
    it("repairs its selector as a target's, and says so", async () => {
        const { session, read } = await send(false, scoped("type == 'server'"));

        assert.deepEqual(session.runs.list()[0].scope.spec, { where: "data.type == 'server'" });
        assert.strictEqual(read[0].params.rewritten, "data.type == 'server'");
    });

    it("takes all as the whole graph", async () => {
        const { session } = await send(false, scoped("all"));

        assert.strictEqual(session.runs.list()[0].scope.spec, "graph");
    });
});
