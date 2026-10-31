/**
 * Undo on the REAL graphty-element, from the reader's keys: a graph opened from the start screen
 * starts its history (Undo disabled, Control+Z changes nothing), the notice names the act it
 * undid, Control+Z in a text box takes back the typing, and the canvas menu's Clear selection
 * is disabled with nothing selected.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import { afterEach, assert, beforeAll, describe, it, vi } from "vitest";
import { page, userEvent } from "vitest/browser";

import { openBy, openSampleFromStart } from "../../../test/open";
import { pickSample } from "../../../test/samples-dialog";
import { render, screen, waitFor } from "../../../test/test-utils";
import { answerUsageData, forgetUsageAnswer } from "../../privacy/usageData";
import { createWorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";

/** Les Miserables' node count, from its source. */
const NODES = 77;

describe("Undo from the reader's keys", () => {
    beforeAll(async () => {
        await page.viewport(1366, 768);
    });

    afterEach(() => {
        forgetUsageAnswer();
    });

    it("starts a sample's history: Undo is disabled and Control+Z leaves the graph", async () => {
        answerUsageData("declined");
        const { session, store } = await openSampleFromStart("Les Miserables");
        // The sample is drawn before its load settles; settling clears the history, and Undo's
        // name drops the load's step.
        await waitFor(() => {
            assert.isFalse(session.canUndo, "opening is not a change to undo");
            const undo = screen.getByRole("button", { name: "Undo" });
            assert.isTrue(undo.hasAttribute("disabled") || undo.getAttribute("aria-disabled") === "true");
        });
        assert.isFalse(session.project.dirty, "an opened sample has no unsaved changes");

        (document.activeElement as HTMLElement | null)?.blur();
        await userEvent.keyboard("{Control>}z{/Control}");
        assert.equal(session.data.statistics().nodeCount, NODES);
        assert.isNull(store.get().notice);
    });

    it("Control+Z while a sample is still loading neither cancels the open nor leaves a step", async () => {
        answerUsageData("declined");
        // The sample's file is held until the reader has pressed Control+Z, so the key lands
        // while the load is pending work, whatever the machine's speed.
        const realFetch = globalThis.fetch.bind(globalThis);
        let release = (): void => undefined;
        const held = new Promise<void>((resolve) => {
            release = resolve;
        });
        let fetching = (): void => undefined;
        const fetched = new Promise<void>((resolve) => {
            fetching = resolve;
        });
        const spy = vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
            if (String(input instanceof Request ? input.url : input).includes("les-miserables")) {
                fetching();
                await held;
            }
            return realFetch(input, init);
        });
        try {
            const store = createWorkspaceStore();
            render(<Workspace store={store} />);
            const opening = openBy(store, () => pickSample("Les Miserables"));
            await fetched;
            (document.activeElement as HTMLElement | null)?.blur();
            await userEvent.keyboard("{Control>}z{/Control}");
            release();
            const session = await opening;
            assert.isNull(store.get().notice, "the open was not cancelled");
            assert.equal(session.data.statistics().nodeCount, NODES);
            assert.isFalse(session.canUndo, "opening is not a change to undo");
        } finally {
            spy.mockRestore();
        }
    });

    it("names the act it undid, and keeps the find box's typing its own to undo", async () => {
        answerUsageData("declined");
        const { session, store } = await openSampleFromStart("Les Miserables");
        await session.styles.add({
            name: "Cosette",
            target: "node",
            selector: { match: "everything" },
            set: { "node.color": "#ff0000" },
        });
        const layers = session.styles.list().length;

        const find = await screen.findByRole("combobox", { name: "Find" });
        await userEvent.click(find);
        await userEvent.keyboard("undo");
        await userEvent.keyboard("{Enter}");
        await userEvent.keyboard("{Control>}z{/Control}");
        await waitFor(() => {
            assert.notEqual((find as HTMLInputElement).value, "undo", "the typing is taken back");
        });
        assert.lengthOf(session.styles.list(), layers, "the app's last change stays");

        (document.activeElement as HTMLElement | null)?.blur();
        await userEvent.keyboard("{Control>}z{/Control}");
        await waitFor(() => {
            assert.equal(store.get().notice?.message, "Undid adding the layer Cosette.");
        });
        // The reader sees it: the toast is drawn, not only kept in the store.
        await screen.findByText("Undid adding the layer Cosette.", { selector: ".cm-toast-message" });
    });

    it("names the act when Control+Z is pressed on the drawing", async () => {
        answerUsageData("declined");
        const { session, store } = await openSampleFromStart("Les Miserables");
        await userEvent.click(await screen.findByRole("button", { name: "Add a layer or a folder" }));
        await userEvent.click(await screen.findByRole("menuitem", { name: /^Layer/ }));
        await waitFor(() => {
            assert.isTrue(session.canUndo);
        });
        const host = document.querySelector("graphty-element");
        const canvas = host?.shadowRoot?.querySelector("canvas") ?? null;
        assert.isNotNull(canvas);
        await userEvent.click(canvas, { position: { x: 4, y: 4 } });
        await waitFor(() => {
            assert.equal(host?.shadowRoot?.activeElement, canvas, "the drawing has the keys");
        });
        await userEvent.keyboard("{Control>}z{/Control}");
        await waitFor(() => {
            assert.isFalse(session.canUndo);
            assert.equal(store.get().notice?.message, "Undid adding Layer 1.");
        });
        await screen.findByText("Undid adding Layer 1.", { selector: ".cm-toast-message" });
    });

    it("disables the canvas menu's Clear selection with nothing selected", async () => {
        answerUsageData("declined");
        const { session } = await openSampleFromStart("Les Miserables");
        const surface = document.querySelector<HTMLElement>(".ws-canvas-surface");
        assert.isNotNull(surface);
        const rightClickCorner = async (): Promise<HTMLElement> => {
            await userEvent.click(surface, { button: "right", position: { x: 4, y: 4 } });
            await screen.findByRole("menu");
            return screen.getByRole("menuitem", { name: /^Clear selection/ });
        };
        assert.equal(session.selection.size, 0);
        const empty = await rightClickCorner();
        assert.isTrue(empty.hasAttribute("disabled") || empty.getAttribute("aria-disabled") === "true");
        await userEvent.keyboard("{Escape}");

        await session.selection.apply({ nodes: [session.data.nodes()[0].id] });
        const held = await rightClickCorner();
        assert.isFalse(held.hasAttribute("disabled") || held.getAttribute("aria-disabled") === "true");
    });
});
