/**
 * @file A remembered conversation survives the element: with `history: "browser"` an element
 * saves its conversation in IndexedDB, and a new element with the same id, on the same page and
 * database, reopens it. Elements with different ids keep their conversations apart.
 */

import "../../../src/graphty-element";

import { afterEach, assert, describe, it } from "vitest";

import type { Graphty } from "../../../index.js";

const mounted: Graphty[] = [];
const databases: string[] = [];

/**
 * A fresh database's name, deleted after the test.
 * @returns The name.
 */
function databaseName(): string {
    const name = `graphty-ai-history-${crypto.randomUUID()}`;
    databases.push(name);
    return name;
}

/**
 * Mount an element with the assistant on the mock provider, remembering in the browser.
 * @param id - The element's id.
 * @param database - The IndexedDB database.
 * @returns The element, its assistant enabled.
 */
async function mount(id: string, database: string): Promise<Graphty> {
    const element = document.createElement("graphty-element");
    element.id = id;
    element.style.display = "block";
    element.style.width = "400px";
    element.style.height = "300px";
    document.body.appendChild(element);
    mounted.push(element);
    await element.waitForSettled();
    await element.enableAiControl({ provider: "mock", history: { store: "browser", database } });
    return element;
}

/**
 * What a conversation's messages said, by role.
 * @param element - The element.
 * @returns Each message as `role:text`.
 */
function said(element: Graphty): string[] {
    return (element.getAiConversation()?.messages ?? []).map((message) => `${message.role}:${message.text}`);
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

describe("a conversation remembered in the browser", () => {
    it("comes back in a new element with the same id and database", async () => {
        const database = databaseName();
        const first = await mount("history-graph", database);
        await first.aiCommand("how many nodes?");
        await first.aiCommand("and edges?");
        const expected = [
            "reader:how many nodes?",
            "assistant:This is a mock response.",
            "reader:and edges?",
            "assistant:This is a mock response.",
        ];
        assert.deepStrictEqual(said(first), expected);
        const { id } = first.getAiConversation() ?? {};
        first.disableAiControl();
        first.remove();

        const second = await mount("history-graph", database);
        assert.strictEqual(second.getAiConversation()?.id, id);
        assert.deepStrictEqual(said(second), expected);
    });

    it("keeps two elements' conversations apart", async () => {
        const database = databaseName();
        const one = await mount("history-one", database);
        const two = await mount("history-two", database);
        await one.aiCommand("only for one");

        assert.deepStrictEqual(said(two), []);
        assert.deepStrictEqual(await two.listAiConversations(), []);
        assert.strictEqual((await one.listAiConversations()).length, 1);
        assert.strictEqual((await two.listAiConversations({ allKeys: true })).length, 1);

        const again = await mount("history-two", database);
        assert.deepStrictEqual(said(again), []);
    });
});
