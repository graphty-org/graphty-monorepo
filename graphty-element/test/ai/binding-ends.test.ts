/**
 * @file A message is limited to its selection only while that selection holds something: once it
 * is empty the message is about the whole graph for the rest of its run, an answer included.
 */

import { assert, describe, it } from "vitest";

import type { GraphSession } from "../../src/session";
import { assistantSession, callsTurn, ScriptedAssistant, textTurn } from "../helpers/assistant";

const CLEAR = { tool: "select", args: { action: "clear" } };
const COUNT = { tool: "query", args: { action: "count", where: "all" } };
const PAINT = { tool: "style", args: { action: "add", where: "all", values: { "node.color": "#ff0000" } } };
const QUESTION = { tool: "ask_reader", args: { question: "Which?", choices: ["all of them", "none"] } };

/**
 * A session with `a` and `b` selected.
 * @returns The session.
 */
async function selected(): Promise<GraphSession> {
    const session = await assistantSession(undefined, ["assistant"]);
    await session.selection.apply({ ids: ["a", "b"] });
    return session;
}

/**
 * Send one message bound to the selection, one batch per call.
 * @param assistant - The assistant.
 * @param calls - The calls.
 */
async function send(
    assistant: ScriptedAssistant,
    ...calls: { tool: string; args?: Record<string, unknown> }[]
): Promise<void> {
    assistant.engine.push(...calls.map((call, turn) => callsTurn([call], turn)));
    if (calls.at(-1) !== QUESTION) {
        assistant.engine.push(textTurn("done"));
    }

    await assistant.controller.execute("about these", { scope: "selection" });
}

/**
 * How many nodes the message's last read counted.
 * @param assistant - The assistant.
 * @returns The count.
 */
function lastCount(assistant: ScriptedAssistant): unknown {
    return (assistant.lastResults().at(-1)?.data as { nodes?: unknown } | undefined)?.nodes;
}

describe("a message bound to a selection, once the selection is empty", () => {
    it("reads the whole graph after a clear, and the model is told", async () => {
        const assistant = new ScriptedAssistant(await selected(), { gate: false });
        await send(assistant, CLEAR, COUNT);

        assert.strictEqual(assistant.lastResults()[0].params.messageScope, "whole-graph");
        assert.strictEqual(lastCount(assistant), 5, JSON.stringify(assistant.lastResults()));
    });

    it("reads the whole graph in the batch of the clear", async () => {
        const assistant = new ScriptedAssistant(await selected(), { gate: false });
        assistant.engine.push(callsTurn([CLEAR, COUNT]), textTurn("done"));
        await assistant.controller.execute("about these", { scope: "selection" });

        assert.strictEqual(lastCount(assistant), 5, JSON.stringify(assistant.lastResults()));
    });

    it("does not bring the old ids back with a later select", async () => {
        const session = await selected();
        const assistant = new ScriptedAssistant(session, { gate: false });
        await send(assistant, CLEAR, { tool: "select", args: { action: "set", where: "all" } }, COUNT);

        assert.lengthOf(session.selection.nodes, 5);
        assert.strictEqual(lastCount(assistant), 5, JSON.stringify(assistant.lastResults()));
    });

    it("runs an answer unbound, when the question was asked after the clear", async () => {
        const session = await selected();
        const assistant = new ScriptedAssistant(session, { history: "memory", questions: true });
        await send(assistant, CLEAR, QUESTION);
        const [question] = assistant.controller.getPendingQuestions();

        assistant.engine.push(callsTurn([COUNT]), textTurn("done"));
        await assistant.controller.answerQuestion(question.id, "all of them");

        assert.strictEqual(lastCount(assistant), 5, JSON.stringify(assistant.lastResults()));
    });

    it("runs an answer unbound, when the reader emptied the selection while it waited", async () => {
        const session = await selected();
        const assistant = new ScriptedAssistant(session, { history: "memory", questions: true });
        await send(assistant, QUESTION);
        const [question] = assistant.controller.getPendingQuestions();
        session.selection.clear();

        assistant.engine.push(callsTurn([COUNT]), textTurn("done"));
        await assistant.controller.answerQuestion(question.id, "all of them");

        assert.strictEqual(lastCount(assistant), 5, JSON.stringify(assistant.lastResults()));
    });

    it("runs an approved batch unbound, when it was held after the clear", async () => {
        const session = await selected();
        const assistant = new ScriptedAssistant(session, { history: "memory", approvals: "writes" });
        await send(assistant, CLEAR, PAINT);
        const [approval] = assistant.controller.getPendingApprovals();
        // A reader's select while it waits does not bring the old ids back.
        await session.selection.apply({ ids: ["c"] });

        await assistant.controller.resolveAiApproval(approval.id, { approve: true });

        const selector = session.styles.list().at(-1)?.selector;
        assert.notDeepEqual(selector, { match: "ids", nodes: ["a", "b"] });
        assert.notDeepEqual(selector, { match: "ids", nodes: ["c"] });
    });

    it("keeps an approved batch to what its request named, when the reader emptied the selection", async () => {
        const session = await selected();
        const assistant = new ScriptedAssistant(session, { history: "memory", approvals: "writes" });
        await send(assistant, PAINT);
        const [approval] = assistant.controller.getPendingApprovals();
        session.selection.clear();

        await assistant.controller.resolveAiApproval(approval.id, { approve: true });

        assert.deepEqual(session.styles.list().at(-1)?.selector, { match: "ids", nodes: ["a", "b"] });
    });

    it("stays limited while a question is asked and answered under a selection that holds something", async () => {
        const session = await selected();
        const assistant = new ScriptedAssistant(session, { history: "memory", questions: true });
        await send(assistant, QUESTION);
        const [question] = assistant.controller.getPendingQuestions();

        assistant.engine.push(callsTurn([COUNT]), textTurn("done"));
        await assistant.controller.answerQuestion(question.id, "all of them");

        assert.strictEqual(lastCount(assistant), 2, JSON.stringify(assistant.lastResults()));
    });
});

describe("a message bound to a selection left alone", () => {
    it("stays limited to it, and the model hears nothing new", async () => {
        const assistant = new ScriptedAssistant(await selected(), { gate: false });
        await send(assistant, COUNT, { tool: "query", args: { action: "count", where: "data.type == 'server'" } });

        const [all, part] = assistant.lastResults();
        assert.strictEqual((all.data as { nodes: number }).nodes, 2, JSON.stringify(all));
        assert.strictEqual((part.data as { nodes: number }).nodes, 1, JSON.stringify(part));
        assert.isUndefined(all.params.messageScope);
    });

    it("stays limited after a select that still holds something", async () => {
        const assistant = new ScriptedAssistant(await selected(), { gate: false });
        await send(assistant, { tool: "select", args: { action: "remove", ids: ["a"] } }, COUNT);

        assert.strictEqual(lastCount(assistant), 2, JSON.stringify(assistant.lastResults()));
    });
});

describe("a batch that removes what is selected", () => {
    const remove = { tool: "edit_data", args: { action: "remove_nodes", where: "all" } };

    it("leaves the message limited when it rolls back, since the selection comes back", async () => {
        const session = await selected();
        const assistant = new ScriptedAssistant(session, { gate: false });
        const fails = { tool: "edit_data", args: { action: "remove_nodes", ids: ["no-such-node"] } };
        assistant.engine.push(callsTurn([remove, fails]), callsTurn([COUNT], 1), textTurn("done"));
        await assistant.controller.execute("about these", { scope: "selection" });

        const [taken, refused] = assistant.lastResults();
        assert.isTrue(taken.params.rolledBack, JSON.stringify(taken));
        assert.notStrictEqual(refused.code, "AI_OK");
        assert.lengthOf(session.selection.nodes, 2);
        assert.strictEqual(lastCount(assistant), 2, JSON.stringify(assistant.lastResults()));
    });

    it("ends the binding once it commits, since nothing is selected", async () => {
        const session = await selected();
        const assistant = new ScriptedAssistant(session, { gate: false });
        await send(assistant, remove, COUNT);

        assert.strictEqual(session.status.counts.nodes, 3);
        assert.strictEqual(lastCount(assistant), 3, JSON.stringify(assistant.lastResults()));
    });
});
