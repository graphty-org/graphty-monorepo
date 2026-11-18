/**
 * @file `attachKeymap` answers Escape, Mod+Z and Shift+Mod+Z on the root it is given, and only
 * there, and leaves alone a press it does nothing with.
 */

import { assert, describe, it } from "vitest";

import { KEYMAP_DESCRIPTORS } from "../../catalog";
import { attachKeymap, createGraphSession, type GraphSession, type KeymapReport } from "../../session";

/**
 * A keydown as the browser builds it, made from Node's own `Event`: the session runs with no DOM.
 * @param key - `KeyboardEvent.key`.
 * @param init - Modifiers held.
 * @returns The event.
 */
function keydown(key: string, init: KeyboardEventInit = {}): KeyboardEvent {
    const modifiers = { ctrlKey: false, metaKey: false, shiftKey: false, altKey: false, isComposing: false, ...init };
    return Object.assign(new Event("keydown", { cancelable: true }), { key, ...modifiers }) as unknown as KeyboardEvent;
}

/**
 * Press a key on a root, as the browser delivers it.
 * @param root - Where the press lands.
 * @param key - `KeyboardEvent.key`.
 * @param init - Modifiers held.
 * @returns The event, to read `defaultPrevented`.
 */
function press(root: EventTarget, key: string, init: KeyboardEventInit = {}): KeyboardEvent {
    const event = keydown(key, init);
    root.dispatchEvent(event);
    return event;
}

/**
 * The next `history:changed`.
 * @param session - The session.
 * @returns A promise settled by it.
 */
function nextHistoryChange(session: GraphSession): Promise<void> {
    return new Promise((resolve) => {
        const off = session.on("history:changed", () => {
            off();
            resolve();
        });
    });
}

describe("attachKeymap", () => {
    it("publishes its keys as a read-only list", () => {
        assert.deepEqual(
            KEYMAP_DESCRIPTORS.map((entry) => [entry.action, [...entry.keys]]),
            [
                ["deselect", ["Escape"]],
                ["undo", ["Mod+Z"]],
                ["redo", ["Shift+Mod+Z", "Mod+Y"]],
            ],
        );
        assert.isTrue(Object.isFrozen(KEYMAP_DESCRIPTORS) && Object.isFrozen(KEYMAP_DESCRIPTORS[0]));
    });

    it("clears the selection on Escape, as a reader's change, and only when something is selected", async () => {
        const session = createGraphSession();
        await session.data.addNodes([{ id: "a" }, { id: "b" }]);
        const causes: string[] = [];
        session.on("selection:changed", (delta) => causes.push(delta.cause));
        const root = new EventTarget();
        const detach = attachKeymap(session, root);

        assert.isFalse(press(root, "Escape").defaultPrevented, "an empty selection leaves Escape to the page");
        await session.selection.apply({ nodes: ["a"] });
        assert.isTrue(press(root, "Escape").defaultPrevented);
        assert.strictEqual(session.selection.size, 0);
        assert.strictEqual(causes.at(-1), "user");

        detach();
        await session.selection.apply({ nodes: ["a"] });
        press(root, "Escape");
        assert.strictEqual(session.selection.size, 1, "a detached keymap answers nothing");
        session.dispose();
    });

    it("undoes on Mod+Z and redoes on Shift+Mod+Z and Mod+Y", async () => {
        const session = createGraphSession();
        const root = new EventTarget();
        attachKeymap(session, root);
        assert.isFalse(press(root, "z", { ctrlKey: true }).defaultPrevented, "nothing to undo leaves the key");

        await session.data.addNodes([{ id: "a" }]);
        const undone = nextHistoryChange(session);
        assert.isTrue(press(root, "z", { ctrlKey: true }).defaultPrevented);
        await undone;
        assert.isFalse(session.canUndo);
        assert.isTrue(session.canRedo);
        const redone = nextHistoryChange(session);
        assert.isTrue(press(root, "Z", { metaKey: true, shiftKey: true }).defaultPrevented);
        await redone;
        assert.isTrue(session.canUndo);
        assert.isFalse(press(root, "y", { ctrlKey: true }).defaultPrevented, "nothing left to redo");
        session.dispose();
    });

    it("leaves alone a press already handled, or with Alt", async () => {
        const session = createGraphSession();
        await session.data.addNodes([{ id: "a" }]);
        await session.selection.apply({ nodes: ["a"] });
        const root = new EventTarget();
        attachKeymap(session, root);
        press(root, "Escape", { altKey: true });
        const handled = keydown("Escape");
        handled.preventDefault();
        root.dispatchEvent(handled);
        assert.strictEqual(session.selection.size, 1);
        session.dispose();
    });
    it("reports what it did: the counts a deselect cleared, and an undo before it starts", async () => {
        const session = createGraphSession();
        await session.data.addNodes([{ id: "a" }, { id: "b" }]);
        await session.selection.apply({ nodes: ["a", "b"] });
        const reports: KeymapReport[] = [];
        let stepsBefore = -1;
        const root = new EventTarget();
        attachKeymap(session, root, {
            onAction: (report) => {
                reports.push(report);
                if (report.action === "undo") {
                    stepsBefore = session.history.position;
                }
            },
        });

        press(root, "Escape");
        assert.deepEqual(reports[0], { action: "deselect", nodes: 2, edges: 0 });
        assert.strictEqual(session.selection.size, 0, "reported once cleared");

        const { position } = session.history;
        press(root, "z", { ctrlKey: true });
        const undo = reports[1];
        assert.strictEqual(undo.action, "undo");
        assert.strictEqual(stepsBefore, position, "reported before the undo starts");
        const outcome = await (undo as Extract<KeymapReport, { action: "undo" | "redo" }>).done;
        assert.strictEqual(outcome.kind, "undone");
        session.dispose();
    });

    it("takes the host's rule for where the keys are its own, in place of the typing rule", async () => {
        const session = createGraphSession();
        await session.data.addNodes([{ id: "a" }]);
        await session.selection.apply({ nodes: ["a"] });
        const field = Object.assign(new EventTarget(), { tagName: "INPUT" });
        const actions: string[] = [];
        const root = new EventTarget();
        attachKeymap(session, root, {
            ignore: (event, action) => {
                actions.push(action);
                return event.target !== field;
            },
        });
        press(root, "Escape");
        assert.strictEqual(session.selection.size, 1, "the host kept this Escape");
        const fromField = keydown("Escape");
        Object.defineProperty(fromField, "target", { value: field });
        root.dispatchEvent(fromField);
        assert.strictEqual(session.selection.size, 0, "the host's rule let a field's Escape through");
        assert.deepEqual(actions, ["deselect", "deselect"]);
        session.dispose();
    });
});
