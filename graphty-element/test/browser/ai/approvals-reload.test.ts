/**
 * @file Approvals that survive the element, in IndexedDB: an element whose assistant held a change
 * goes, and a new one on the same database asks about it again (`replayed: true`) and runs it when
 * approved; two elements answering one request run it once, and the other hears it was resolved
 * elsewhere; an element with another key never sees the request.
 */

import "../../../src/graphty-element";

import { afterEach, assert, describe, it } from "vitest";

import type { Graphty } from "../../../index.js";
import type { ExecutionResult } from "../../../src/ai/AiController";
import type { MockLlmProvider } from "../../../src/ai/providers/MockLlmProvider";
import type { AiApprovalRequestedEvent } from "../../../src/events";

const mounted: Graphty[] = [];
const databases: string[] = [];

/**
 * A fresh database's name, deleted after the test.
 * @returns The name.
 */
function databaseName(): string {
    const name = `graphty-ai-approvals-${crypto.randomUUID()}`;
    databases.push(name);
    return name;
}

/**
 * An element on the page, its assistant not yet enabled.
 * @param id - The element's id.
 * @returns The element.
 */
async function place(id: string): Promise<Graphty> {
    const element = document.createElement("graphty-element");
    element.id = id;
    element.style.display = "block";
    element.style.width = "400px";
    element.style.height = "300px";
    document.body.appendChild(element);
    mounted.push(element);
    await element.waitForSettled();
    return element;
}

/**
 * Enable the assistant on the mock provider, asking about every write, remembering in the browser.
 * @param element - The element.
 * @param database - The IndexedDB database.
 * @param key - The scope, when not the element's own.
 */
async function enable(element: Graphty, database: string, key?: string): Promise<void> {
    await element.enableAiControl({
        provider: "mock",
        approvals: "writes",
        history: { store: "browser", database, ...(key === undefined ? {} : { key }) },
    });
}

/**
 * Ask the assistant to add node F, which the policy holds.
 * @param element - The element.
 * @returns The request's id.
 */
async function holdAddition(element: Graphty): Promise<string> {
    const provider = element.getAiManager()?.getProvider() as MockLlmProvider;
    provider.setResponse("add a node", {
        text: "",
        toolCalls: [{ id: "0", name: "edit_data", arguments: { action: "add_nodes", records: [{ id: "F" }] } }],
    });
    const held = await element.aiCommand("add a node");
    assert.strictEqual(held.code, "AI_CONFIRMATION_NEEDED", JSON.stringify(held));
    return String(held.params?.request);
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

describe("approvals remembered in the browser", () => {
    it("come back in a new element on the same database, and approving runs the change", async () => {
        const database = databaseName();
        const first = await place("approvals-reload");
        await enable(first, database);
        const request = await holdAddition(first);
        first.disableAiControl();
        first.remove();

        const second = await place("approvals-reload");
        await enable(second, database);
        // A listener added once enableAiControl resolved still hears the request again.
        const asked = await nextRequest(second);

        assert.isTrue(asked.replayed);
        assert.strictEqual(asked.request.id, request);
        assert.deepStrictEqual(
            second.getPendingAiApprovals().map((pending) => pending.id),
            [request],
        );
        assert.strictEqual(second.session.status.counts.nodes, 0, "nothing ran before the approval");

        const result = await second.resolveAiApproval(request, { approve: true });

        assert.strictEqual(result.code, "AI_COMPLETED", JSON.stringify(result));
        assert.exists(second.session.data.node("F"));
        assert.deepStrictEqual(second.getPendingAiApprovals(), []);
        assert.deepStrictEqual(second.getAiConversation()?.pending, []);
    });

    it("run once when two elements approve one request; the other hears it was resolved elsewhere", async () => {
        const database = databaseName();
        const one = await place("approvals-one");
        await enable(one, database, "shared");
        const request = await holdAddition(one);
        const two = await place("approvals-two");
        await enable(two, database, "shared");
        assert.deepStrictEqual(
            two.getPendingAiApprovals().map((pending) => pending.id),
            [request],
        );

        const results: ExecutionResult[] = await Promise.all([
            one.resolveAiApproval(request, { approve: true }),
            two.resolveAiApproval(request, { approve: true }),
        ]);

        const codes = results.map((result) => `${String(result.code)}:${String(result.params?.reason ?? "")}`).sort();
        assert.deepStrictEqual(codes, ["AI_APPROVAL_STALE:resolved-elsewhere", "AI_COMPLETED:"]);
        const added = [one, two].filter((element) => element.session.data.node("F") !== undefined);
        assert.lengthOf(added, 1, "the change ran in one element only");
    });

    it("keeps another key's requests apart", async () => {
        const database = databaseName();
        const one = await place("approvals-keys");
        await enable(one, database, "key-one");
        await holdAddition(one);

        const other = await place("approvals-keys-other");
        await enable(other, database, "key-two");

        assert.deepStrictEqual(other.getPendingAiApprovals(), []);
        assert.isNull(other.getAiConversation()?.pending.at(0) ?? null);
    });
});
