/**
 * The app shell keeps the reader's work through graphty-element's autosave: a note added to a
 * node, and a note still being typed, come back when the shell is mounted again, with the
 * "restored" notice. Real element, real IndexedDB, real typing; nothing mocked.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import { afterEach, assert, beforeEach, describe, it } from "vitest";
import { userEvent } from "vitest/browser";

import { findSample } from "../../../data/sampleManifest";
import { fireEvent, render, waitFor } from "../../../test/test-utils";
import { AppShell } from "../AppShell";

type ElementUnderTest = import("@graphty/graphty-element").Graphty;

/**
 * Deletes autosave's database and this tab's own-entry record, so each test starts with nothing
 * kept.
 * @returns settles once the database is gone.
 */
function forgetAutosave(): Promise<void> {
    sessionStorage.clear();
    return new Promise((resolve, reject) => {
        const request = indexedDB.deleteDatabase("graphty-autosave");
        request.onsuccess = () => {
            resolve();
        };
        request.onerror = () => {
            reject(request.error ?? new Error("the autosave database was not deleted"));
        };
    });
}

/**
 * Mounts the shell with autosave on, as the application does.
 * @returns the render result and the element.
 */
function mountShell(): { readonly view: ReturnType<typeof render>; readonly element: ElementUnderTest } {
    const view = render(<AppShell initialShellWidth={1440} measureViewport={false} persist={false} autosave />);
    const element = view.container.querySelector<ElementUnderTest>("graphty-element");
    if (element === null) {
        throw new Error("the shell mounted no graphty-element");
    }
    return { view, element };
}

/**
 * The note input of the selected node's inspector.
 * @param container - the shell.
 * @returns the textarea.
 */
async function nodeNoteInput(container: HTMLElement): Promise<HTMLTextAreaElement> {
    return waitFor(() => {
        const input = container.querySelector<HTMLTextAreaElement>('[data-testid="node-note-input"]');
        assert.isNotNull(input, "the node inspector drew no note input");
        return input;
    });
}

describe("AppShell autosave with the real graphty-element", () => {
    beforeEach(forgetAutosave);
    afterEach(forgetAutosave);

    it("brings back an edited node, the note being typed and says so, after the shell is mounted again", async () => {
        const sample = findSample("cat-social-network");
        if (sample === undefined) {
            throw new Error("the manifest has no cat-social-network sample");
        }

        const first = mountShell();
        const loaded = new Promise<void>((resolve) => {
            first.element.addEventListener("data-loading-complete", () => {
                resolve();
            });
        });
        const row = await waitFor(() => {
            const found = first.view.container.querySelector<HTMLElement>(`[data-sample-row="${sample.id}"]`);
            assert.isNotNull(found, "Welcome drew no sample row");
            return found;
        });
        // Loading the sample is the setup, as in AppShell.real-element.test.tsx; the edits below are typed.
        fireEvent.click(row);
        await loaded;
        await first.element.waitForSettled();

        const nodeId = first.element.session.data.nodes()[0]?.id;
        assert.isDefined(nodeId, "the sample loaded no nodes");
        const nodes = first.element.session.data.statistics().nodeCount;

        // Edit the node: a note on it, typed and added with the keyboard.
        first.element.selectNode(nodeId);
        await userEvent.click(await nodeNoteInput(first.view.container));
        await userEvent.keyboard("leads the night shift{Control>}{Enter}{/Control}");
        await waitFor(() => {
            const notes = first.element.session.notes.list({ target: { node: nodeId } });
            assert.deepEqual(
                notes.map((note) => note.text),
                ["leads the night shift"],
            );
        });
        await waitFor(() => {
            assert.strictEqual(first.element.autosaver.status.state, "saved");
        });
        await waitFor(() => {
            const chip = first.view.container.querySelector('[data-testid="autosave-chip"]');
            assert.strictEqual(chip?.textContent, "Autosave: saved");
        });

        // A second note, still being typed when the shell goes away.
        await userEvent.keyboard("also feeds the kittens");
        first.view.unmount();

        const second = mountShell();
        const restored = await second.element.autosaver.ready;
        assert.isNotNull(restored, "nothing was restored");
        await waitFor(() => {
            assert.include(second.view.container.textContent, "Restored your work from");
        });
        assert.strictEqual(second.element.session.data.statistics().nodeCount, nodes);
        assert.deepEqual(
            second.element.session.notes.list({ target: { node: nodeId } }).map((note) => note.text),
            ["leads the night shift"],
        );

        second.element.selectNode(nodeId);
        const input = await nodeNoteInput(second.view.container);
        await waitFor(() => {
            assert.strictEqual(input.value, "also feeds the kittens");
        });
        second.view.unmount();
    });
});
