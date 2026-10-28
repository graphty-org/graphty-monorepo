/**
 * @file A helper's held change survives the element, in IndexedDB: an element whose helper's write
 * was held for approval goes, and a new one on the same database asks about it again
 * (`replayed: true`, `agent` set); approving it continues the helper, then the main model. Two
 * elements approving one request run it once, and the other hears it was resolved elsewhere.
 */

import "../../../src/graphty-element";

import { afterEach, assert, describe, it } from "vitest";

import type { Graphty } from "../../../index.js";
import type { ExecutionResult } from "../../../src/ai/AiController";
import type { LlmResponse } from "../../../src/ai/providers/types";
import type { AiApprovalRequestedEvent } from "../../../src/events";
import { QueuedProvider } from "../../helpers/queued-provider";

const mounted: Graphty[] = [];
const databases: string[] = [];

const EDITOR = { name: "editor", purpose: "Add nodes.", commands: ["edit_data"] };
const HAND_OFF: LlmResponse = {
    text: "",
    toolCalls: [{ id: "d", name: "delegate", arguments: { agent: "editor", task: "Add node F." } }],
};
const ADD_F: LlmResponse = {
    text: "",
    toolCalls: [{ id: "add", name: "edit_data", arguments: { action: "add_nodes", records: [{ id: "F" }] } }],
};
const HELPER_DONE: LlmResponse = { text: "Added F.", toolCalls: [] };
const MAIN_DONE: LlmResponse = { text: "The editor added F.", toolCalls: [] };

/**
 * A fresh database's name, deleted after the test.
 * @returns The name.
 */
function databaseName(): string {
    const name = `graphty-ai-plans-${crypto.randomUUID()}`;
    databases.push(name);
    return name;
}

/**
 * An element on the page, its assistant on a provider that gives these responses in order, with
 * the editor helper, asking about every write, remembering in the browser.
 * @param id - The element's id.
 * @param database - The IndexedDB database.
 * @param responses - The model's responses, main and helper turns alike.
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
        agents: [EDITOR],
        approvals: "writes",
        history: { store: "browser", database, ...(key === undefined ? {} : { key }) },
    });
    return { element, provider };
}

/**
 * The next `ai-approval-requested` an element sends to the DOM.
 * @param element - The element.
 * @returns The event's detail.
 */
function nextRequest(element: Graphty): Promise<Pick<AiApprovalRequestedEvent, "request" | "replayed">> {
    return new Promise((resolve) => {
        element.addEventListener(
            "ai-approval-requested",
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

describe("a helper's held change remembered in the browser", () => {
    it("comes back in a new element on the same database, and approving runs the helper, then the main", async () => {
        const database = databaseName();
        const { element: first } = await place("plans-reload", database, [HAND_OFF, ADD_F]);
        const held = await first.aiCommand("add a node");
        assert.strictEqual(held.code, "AI_CONFIRMATION_NEEDED", JSON.stringify(held));
        const id = String(held.params?.request);
        first.disableAiControl();
        first.remove();

        const { element: second, provider } = await place("plans-reload", database, [HELPER_DONE, MAIN_DONE]);
        // A listener added once enableAiControl resolved still hears the request again.
        const again = await nextRequest(second);

        assert.isTrue(again.replayed);
        assert.strictEqual(again.request.id, id);
        assert.strictEqual(again.request.agent, "editor");
        assert.deepStrictEqual(
            again.request.calls.map((call) => call.tool),
            ["edit_data"],
        );
        assert.lengthOf(provider.getCallHistory(), 0, "nothing was sent before the approval");
        assert.notExists(second.session.data.node("F"));

        const result = await second.resolveAiApproval(id, { approve: true });

        assert.strictEqual(result.code, "AI_COMPLETED", JSON.stringify(result));
        assert.strictEqual(result.llmText, "The editor added F.");
        assert.exists(second.session.data.node("F"));
        assert.deepStrictEqual(second.getPendingAiApprovals(), []);
        assert.deepStrictEqual(second.getAiConversation()?.pending, []);
        const helperSaid = (second.getAiConversation()?.messages ?? []).flatMap((message) =>
            message.role === "assistant" && message.agent === "editor" && message.text !== "" ? [message.text] : [],
        );
        assert.deepStrictEqual(helperSaid, ["Added F."], "the helper's answer is in the transcript under its name");
    });

    it("runs once when two elements approve it; the other hears it was resolved elsewhere", async () => {
        const database = databaseName();
        const { element: one } = await place(
            "plans-one",
            database,
            [HAND_OFF, ADD_F, HELPER_DONE, MAIN_DONE],
            "shared",
        );
        const held = await one.aiCommand("add a node");
        const id = String(held.params?.request);
        const { element: two } = await place("plans-two", database, [HELPER_DONE, MAIN_DONE], "shared");
        assert.deepStrictEqual(
            two.getPendingAiApprovals().map((pending) => [pending.id, pending.agent]),
            [[id, "editor"]],
        );

        const results: ExecutionResult[] = await Promise.all([
            one.resolveAiApproval(id, { approve: true }),
            two.resolveAiApproval(id, { approve: true }),
        ]);

        const codes = results.map((result) => `${String(result.code)}:${String(result.params?.reason ?? "")}`).sort();
        assert.deepStrictEqual(codes, ["AI_APPROVAL_STALE:resolved-elsewhere", "AI_COMPLETED:"]);
        const added = [one, two].filter((element) => element.session.data.node("F") !== undefined);
        assert.lengthOf(added, 1, "the change ran in one element only");
    });
});
