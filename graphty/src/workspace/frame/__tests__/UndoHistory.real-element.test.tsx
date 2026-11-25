/**
 * Undo on the REAL graphty-element, from the reader's keys: a sample opened from the start screen
 * is one step Undo takes back (issue #796), the notice names the act it
 * undid, Control+Z in a text box takes back the typing, and the canvas menu's Clear selection
 * is disabled with nothing selected.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import { afterEach, assert, beforeAll, describe, it, vi } from "vitest";
import { page, userEvent } from "vitest/browser";

import { emptyPoint } from "../../../test/empty-point";
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

    it("a sample's opening is one step: Undo takes it back and leaves the project empty", async () => {
        answerUsageData("declined");
        const { session, store } = await openSampleFromStart("Les Miserables");
        await waitFor(() => {
            assert.isTrue(session.canUndo, "the opening is a step to undo");
            const undo = document.querySelector<HTMLElement>('.ws-header button[aria-label^="Undo"]');
            assert.isNotNull(undo);
            assert.notEqual(undo.getAttribute("aria-disabled"), "true");
        });
        assert.isFalse(session.project.dirty, "an opened sample has no unsaved changes");

        (document.activeElement as HTMLElement | null)?.blur();
        await userEvent.keyboard("{Control>}z{/Control}");
        await waitFor(() => {
            assert.match(store.get().notice?.message ?? "", /^Undid /);
        });
        assert.equal(session.data.statistics().nodeCount, 0);
        assert.lengthOf(session.data.sources(), 0, "the sample's source went with it");
        assert.equal(store.get().project?.name, "Les Miserables", "the project keeps its name");
        assert.isFalse(session.canUndo, "the name is not a step to undo");
    });

    it("Control+Z while a sample is still loading neither cancels the open nor loses its step", async () => {
        answerUsageData("declined");
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
            assert.isNull(store.get().notice, "the open was not canceled");
            assert.equal(session.data.statistics().nodeCount, NODES);
            assert.isTrue(session.canUndo, "the opening is still the step Undo takes back");
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
            assert.equal(store.get().notice?.message, "Undid adding the layer Cosette");
        });
        // The reader sees it: the toast is drawn, not only kept in the store.
        await screen.findByText("Undid adding the layer Cosette", { selector: ".cm-toast-message" });
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
            assert.equal(store.get().notice?.message, "Undid adding Layer 1");
        });
        await screen.findByText("Undid adding Layer 1", { selector: ".cm-toast-message" });
    });

    it("disables the canvas menu's Clear selection with nothing selected", async () => {
        answerUsageData("declined");
        const { session } = await openSampleFromStart("Les Miserables");
        const element = document.querySelector<HTMLElementTagNameMap["graphty-element"]>(
            "graphty-element:not([data-start-page])",
        );
        assert.isNotNull(element);
        await element.waitForSettled();
        await element.waitForStableFrame();
        const rightClickEmpty = async (): Promise<HTMLElement> => {
            await userEvent.click(element, { button: "right", position: await emptyPoint(element) });
            await screen.findByRole("menu");
            return screen.getByRole("menuitem", { name: /^Clear selection/ });
        };
        assert.equal(session.selection.size, 0);
        const empty = await rightClickEmpty();
        assert.isTrue(empty.hasAttribute("disabled") || empty.getAttribute("aria-disabled") === "true");
        await userEvent.keyboard("{Escape}");

        await session.selection.apply({ nodes: [session.data.nodes()[0].id] });
        const held = await rightClickEmpty();
        assert.isFalse(held.hasAttribute("disabled") || held.getAttribute("aria-disabled") === "true");
    });
});
