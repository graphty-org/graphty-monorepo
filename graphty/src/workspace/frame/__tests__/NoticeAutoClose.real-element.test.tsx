/**
 * A confirmation with nothing to act on ("Selection cleared") goes on its own after a few
 * seconds on the REAL graphty-element, even after an earlier notice was closed from its x under
 * the pointer, which the new notice comes up under; moving the pointer onto a notice still holds it.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession } from "@graphty/graphty-element/session";
import { afterEach, assert, describe, it, vi } from "vitest";
import { page, userEvent } from "vitest/browser";

import { act, render, screen, waitFor } from "../../../test/test-utils";
import { createWorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";
import { NOTICE_MS } from "../NoticeSlot";

const NODES = Array.from({ length: 4 }, (_, i) => ({ id: `n${String(i)}` }));

async function openWorkspace(): Promise<{ session: GraphSession; store: ReturnType<typeof createWorkspaceStore> }> {
    // The panels sit clear of the notice slot at a desktop size.
    await page.viewport(1440, 900);
    const store = createWorkspaceStore({ project: { name: "Untitled", id: 1 } });
    render(<Workspace store={store} />);
    let session: GraphSession | undefined;
    await waitFor(() => {
        session = document.querySelector("graphty-element")?.session;
        assert.isDefined(session);
    });
    if (session === undefined) {
        throw new Error("the element never came up");
    }
    await session.data.addNodes(NODES);
    return { session, store };
}

describe("a notice's own timer", () => {
    afterEach(() => {
        vi.useRealTimers();
    });

    it("takes Selection cleared down after a few seconds", async () => {
        const { session, store } = await openWorkspace();

        // The reader closes an earlier notice from its x: the pointer stays where the notice was.
        act(() => {
            store.set({ notice: { message: "Saved Untitled" } });
        });
        await userEvent.click(screen.getByRole("button", { name: "Dismiss" }));
        assert.isNull(store.get().notice, "the x took the first notice down");

        let entered = false;
        const onEnter = (event: Event): void => {
            entered ||= event.target instanceof Element && event.target.classList.contains("ws-notice-slot");
        };
        document.addEventListener("pointerenter", onEnter, true);
        await session.selection.apply({ nodes: ["n0"] });
        vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
        await userEvent.keyboard("{Escape}");
        // vi.waitFor polls on vitest's own clock; testing-library's waitFor would poll on the fake one.
        await vi.waitFor(() => {
            assert.match(store.get().notice?.message ?? "", /^Selection cleared/);
        });
        assert.isNotEmpty(screen.getAllByText(/^Selection cleared/));
        // The notice came up under the pointer the x left behind. Chromium sends it pointerenter at
        // a later frame with no pointermove: wait for that enter, so the timer is checked after it,
        // as on a busy machine, and not before it.
        await vi.waitFor(() => {
            assert.isTrue(entered, "the browser sent pointerenter to the notice under the pointer");
        });
        // React renders what that enter changed before the clock moves.
        await act(async () => {
            await Promise.resolve();
        });

        act(() => {
            vi.advanceTimersByTime(NOTICE_MS);
        });
        assert.isNull(store.get().notice, "the confirmation went on its own");
        assert.isEmpty(screen.queryAllByTestId("toast"));
        document.removeEventListener("pointerenter", onEnter, true);
        // Whatever the element queued on the fake clock runs before the real clock comes back.
        act(() => {
            vi.runOnlyPendingTimers();
        });
    });

    it("holds a notice while the reader moves the pointer onto it", async () => {
        const { store } = await openWorkspace();
        vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
        act(() => {
            store.set({ notice: { message: "Saved Untitled" } });
        });
        await userEvent.hover(screen.getByTestId("toast"));
        act(() => {
            vi.advanceTimersByTime(NOTICE_MS * 2);
        });
        assert.isNotNull(store.get().notice, "the pointer on it holds the notice");

        await userEvent.hover(document.body, { position: { x: 5, y: 5 } });
        act(() => {
            vi.advanceTimersByTime(NOTICE_MS);
        });
        assert.isNull(store.get().notice, "the notice went once the pointer left it");
        act(() => {
            vi.runOnlyPendingTimers();
        });
    });
});
