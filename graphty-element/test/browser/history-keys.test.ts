/**
 * @file The element handles Ctrl+Z itself: Mod+Z on the focused canvas undoes one step and
 * Shift+Mod+Z redoes it, and the key's default is prevented so a host binding the same keys can
 * tell it was handled. `history-keys="false"` leaves the keys to the host. Every history change
 * is mirrored as a `graphty-history-change` DOM event. See design/undo/undo-design.md section 10.2.
 */

import "../../src/graphty-element";

import { afterEach, assert, describe, it } from "vitest";
import { userEvent } from "vitest/browser";

import type { Graphty } from "../../index.js";
import { operationQueueOf } from "../../src/Graph";

const cleanups: (() => void)[] = [];

afterEach(() => {
    for (const cleanup of cleanups.splice(0)) {
        cleanup();
    }
});

/**
 * A mounted element holding two nodes added as two steps, with its canvas focused.
 * @param historyKeys - The `history-keys` attribute, when given.
 * @returns The element.
 */
async function focusedElement(historyKeys?: string): Promise<Graphty> {
    const element = document.createElement("graphty-element");
    if (historyKeys !== undefined) {
        element.setAttribute("history-keys", historyKeys);
    }

    element.style.display = "block";
    element.style.width = "400px";
    element.style.height = "300px";
    document.body.appendChild(element);
    cleanups.push(() => {
        element.remove();
    });
    await element.updateComplete;
    await operationQueueOf(element.graph).waitForCompletion();
    await element.session.data.addNodes([{ id: "a" }]);
    await element.session.data.addNodes([{ id: "b" }]);
    element.graph.canvas.focus();
    return element;
}

/**
 * Count the key presses a window-level host binding would act on: those whose default nobody
 * prevented.
 * @returns The count so far.
 */
function hostBinding(): () => number {
    let unhandled = 0;
    const listener = (event: KeyboardEvent): void => {
        if (!event.defaultPrevented && event.key.toLowerCase() === "z") {
            unhandled++;
        }
    };
    window.addEventListener("keydown", listener);
    cleanups.push(() => {
        window.removeEventListener("keydown", listener);
    });
    return () => unhandled;
}

describe("history keys", () => {
    it("one Mod+Z on the focused canvas undoes one step, and the host sees it handled", async () => {
        const element = await focusedElement();
        const unhandled = hostBinding();
        const changes: { reason: string; position: number; canRedo: boolean }[] = [];
        element.addEventListener("graphty-history-change", (event) => {
            changes.push((event as CustomEvent<(typeof changes)[number]>).detail);
        });
        const { position } = element.session.history;

        await userEvent.keyboard("{Control>}z{/Control}");
        assert.strictEqual(element.session.history.position, position - 1, "the cursor moved back one step");
        assert.strictEqual(unhandled(), 0, "the host binding skipped the key the element handled");
        const undone = changes.find((change) => change.reason === "undo");
        assert.include(undone, { position: position - 1, canRedo: true }, "the undo reached the DOM");

        await userEvent.keyboard("{Control>}{Shift>}z{/Shift}{/Control}");
        assert.strictEqual(element.session.history.position, position, "Shift+Mod+Z redid it");
    });

    it('history-keys="false" leaves the key to the host', async () => {
        const element = await focusedElement("false");
        assert.isFalse(element.historyKeys);
        const unhandled = hostBinding();
        const { position } = element.session.history;

        await userEvent.keyboard("{Control>}z{/Control}");
        assert.strictEqual(element.session.history.position, position, "the element did not undo");
        assert.strictEqual(unhandled(), 1, "the host binding saw the key");
    });
});
