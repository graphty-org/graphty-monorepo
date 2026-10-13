/**
 * @file Questions that survive the element, in IndexedDB: an element whose assistant asked the
 * reader a question goes, and a new one on the same database asks it again (`replayed: true`);
 * answering it continues the message. Two elements answering one question continue it once, and
 * the other hears it was resolved elsewhere.
 */

import "../../../src/graphty-element";

import { afterEach, assert, describe, it } from "vitest";

import type { Graphty } from "../../../index.js";
import type { ExecutionResult } from "../../../src/ai/AiController";
import type { LlmResponse } from "../../../src/ai/providers/types";
import type { AiQuestionAskedEvent } from "../../../src/events";
import { QueuedProvider } from "../../helpers/queued-provider";

const mounted: Graphty[] = [];
const databases: string[] = [];

const ASK: LlmResponse = {
    text: "",
    toolCalls: [{ id: "q", name: "ask_reader", arguments: { question: "Add which node?", choices: ["F", "G"] } }],
};
const ADD_F: LlmResponse = {
    text: "",
    toolCalls: [{ id: "add", name: "edit_data", arguments: { action: "add_nodes", records: [{ id: "F" }] } }],
};
const DONE: LlmResponse = { text: "Added F.", toolCalls: [] };

/**
 * A fresh database's name, deleted after the test.
 * @returns The name.
 */
function databaseName(): string {
    const name = `graphty-ai-questions-${crypto.randomUUID()}`;
    databases.push(name);
    return name;
}

/**
 * An element on the page, its assistant on a provider that gives these responses in order, with
 * questions on, remembering in the browser.
 * @param id - The element's id.
 * @param database - The IndexedDB database.
 * @param responses - The model's responses.
 * @param key - The scope, when not the element's own.
 * @returns The element and its provider.
 */
async function place(
    id: string,
    database: string,
    responses: LlmResponse[],
    key?: string,
): Promise<{ element: Graphty; provider: QueuedProvider }> {
    const element = document.createElement("graphty-element");
    element.id = id;
    element.style.display = "block";
    element.style.width = "400px";
    element.style.height = "300px";
    document.body.appendChild(element);
    mounted.push(element);
    await element.waitForSettled();
    const provider = new QueuedProvider();
    provider.queue.push(...responses);
    await element.enableAiControl({
        provider: "mock",
        providerInstance: provider,
        questions: true,
        history: { store: "browser", database, ...(key === undefined ? {} : { key }) },
    });
    return { element, provider };
}

/**
 * The next `ai-question-asked` an element sends to the DOM.
 * @param element - The element.
 * @returns The event's detail.
 */
function nextQuestion(element: Graphty): Promise<Pick<AiQuestionAskedEvent, "request" | "replayed">> {
    return new Promise((resolve) => {
        element.addEventListener(
            "ai-question-asked",
            (event) => {
                resolve(event.detail);
            },
            { once: true },
        );
    });
}

afterEach(async () => {
    for (const element of mounted.splice(0)) {
        element.disableAiControl();
        element.remove();
    }

    await Promise.all(
        databases.splice(0).map(
            (name) =>
                new Promise<void>((resolve) => {
                    const request = indexedDB.deleteDatabase(name);
                    request.onsuccess = () => {
                        resolve();
                    };
                    request.onerror = () => {
                        resolve();
                    };
                    request.onblocked = () => {
                        resolve();
                    };
                }),
        ),
    );
});

describe("questions remembered in the browser", () => {
    it("come back in a new element on the same database, and answering continues the message", async () => {
        const database = databaseName();
        const { element: first } = await place("questions-reload", database, [ASK]);
        const asked = await first.aiCommand("add a node");
        assert.strictEqual(asked.code, "AI_QUESTION_ASKED", JSON.stringify(asked));
        const id = String(asked.params?.request);
        first.disableAiControl();
        first.remove();

        const { element: second, provider } = await place("questions-reload", database, [ADD_F, DONE]);
        // A listener added once enableAiControl resolved still hears the question again.
        const again = await nextQuestion(second);

        assert.isTrue(again.replayed);
        assert.strictEqual(again.request.id, id);
        assert.deepStrictEqual(again.request.choices, ["F", "G"]);
        assert.deepStrictEqual(
            second.getPendingAiQuestions().map((question) => question.id),
            [id],
        );
        assert.lengthOf(provider.getCallHistory(), 0, "nothing was sent before the answer");

        const result = await second.answerAiQuestion(id, "F");

        assert.strictEqual(result.code, "AI_COMPLETED", JSON.stringify(result));
        assert.strictEqual(result.llmText, "Added F.");
        assert.exists(second.session.data.node("F"));
        assert.deepStrictEqual(second.getPendingAiQuestions(), []);
        const reader = (second.getAiConversation()?.messages ?? []).flatMap((message) =>
            message.role === "reader" ? [message.text] : [],
        );
        assert.deepStrictEqual(reader, ["add a node", "F"], "the answer is the reader's message");
    });

    it("continue once when two elements answer one question; the other hears it was resolved elsewhere", async () => {
        const database = databaseName();
        const { element: one } = await place("questions-one", database, [ASK, ADD_F, DONE], "shared");
        const asked = await one.aiCommand("add a node");
        const id = String(asked.params?.request);
        const { element: two } = await place("questions-two", database, [ADD_F, DONE], "shared");
        assert.deepStrictEqual(
            two.getPendingAiQuestions().map((question) => question.id),
            [id],
        );

        const results: ExecutionResult[] = await Promise.all([
            one.answerAiQuestion(id, "F"),
            two.answerAiQuestion(id, "F"),
        ]);

        const codes = results.map((result) => `${String(result.code)}:${String(result.params?.reason ?? "")}`).sort();
        assert.deepStrictEqual(codes, ["AI_APPROVAL_STALE:resolved-elsewhere", "AI_COMPLETED:"]);
        const added = [one, two].filter((element) => element.session.data.node("F") !== undefined);
        assert.lengthOf(added, 1, "the message continued in one element only");
    });
});
