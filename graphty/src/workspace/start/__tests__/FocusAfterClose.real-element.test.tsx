/**
 * Where keyboard focus goes when the control holding it goes away, on the REAL graphty-element.
 * The drawing does not take focus on its own, so each of these used to drop focus to the page
 * itself, and a keyboard or screen-reader user had to start again from the top:
 *
 * - a graph opened (a sample, a recent project): the graph's heading in the inspector, which says
 *   its name and size, once it is read (never the drawing's outline, never a pinned layer row); the
 *   style tree's Tab stop is then Everything;
 * - a file refused: Open a file, beside the reason that stays;
 * - Escape from a dialog opened from the drawing: the drawing again;
 * - Open a file with a data file (the start screen goes, the graph is drawn at once): the graph's
 *   heading, never the rail;
 * - the table closed, or a notice closed from inside it: the drawing.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import { browserProjects } from "@graphty/graphty-element/session";
import userEvent from "@testing-library/user-event";
import { afterEach, assert, beforeEach, describe, it, vi } from "vitest";

import { openBy } from "../../../test/open";
import { pickSample } from "../../../test/samples-dialog";
import { render, screen, waitFor, within } from "../../../test/test-utils";
import { INSPECTOR_TITLE_ID } from "../../frame/focus";
import { forgetUsageAnswer } from "../../privacy/usageData";
import { clearRecent, refreshStored } from "../../project/recent";
import { createWorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";

/** A hang guard for the element coming up and a sample loading, not a pass/fail timing. */
const TIMEOUT_MS = 60_000;

/**
 * The opened project's element, not the start page's own graph.
 * @returns the element.
 */
function openedHost(): HTMLElement {
    const host = document.querySelector<HTMLElement>("graphty-element:not([data-start-page])");
    if (host === null) {
        throw new Error("no opened element");
    }
    return host;
}

/**
 * Asserts that keyboard focus is on the drawing: the canvas inside the element's shadow root.
 * @param host - the element.
 */
function assertFocusOnDrawing(host: HTMLElement): void {
    const canvas = host.shadowRoot?.querySelector("canvas");
    assert.exists(canvas);
    assert.strictEqual(document.activeElement, host, "focus is not in the element");
    assert.strictEqual(host.shadowRoot?.activeElement, canvas, "focus is not on the drawing");
}

/**
 * Asserts that keyboard focus is on the graph's heading in the inspector, and that its spoken
 * name says the graph's size; and that a Tab into the style tree would land on Everything.
 * @param nodes - the node count it says.
 * @param edges - the edge count it says.
 */
function assertFocusOnGraphHeading(nodes: number, edges: number): void {
    const active = document.activeElement;
    assert.equal(active?.id, INSPECTOR_TITLE_ID, `focus is on ${active?.outerHTML.slice(0, 120) ?? "nothing"}`);
    const spoken = active?.getAttribute("aria-label") ?? "";
    assert.include(spoken, `${String(nodes)} nodes`);
    assert.include(spoken, `${String(edges)} edges`);
    const tree = screen.getByRole("tree", { name: "Style layers" });
    const stop = tree.querySelector('[role="treeitem"][tabindex="0"]');
    assert.match(stop?.getAttribute("aria-label") ?? stop?.textContent ?? "", /^Everything/);
}

/**
 * The start screen's first way in.
 * @returns Open a file
 */
function openButton(): HTMLElement {
    return screen.getByRole("button", { name: /^Open a file/ });
}

/** The browser's file picker, once, choosing a three-node CSV. */
function chooseCsv(): void {
    vi.spyOn(HTMLInputElement.prototype, "click").mockImplementationOnce(function (this: HTMLInputElement) {
        const transfer = new DataTransfer();
        transfer.items.add(new File(["source,target\na,b\nb,c\n"], "abc.csv", { type: "text/csv" }));
        this.files = transfer.files;
        this.dispatchEvent(new Event("change", { bubbles: true }));
    });
}

beforeEach(async () => {
    await clearRecent();
});

afterEach(() => {
    forgetUsageAnswer();
    vi.restoreAllMocks();
});

describe("focus after the control holding it goes away, on the real element", () => {
    // eslint-disable-next-line local/no-test-timing -- per-test timeout, to go once the slow step is found, tracked in #1636
    it(
        "a sample opened with Enter hands focus to the graph's heading, which says its size",
        async () => {
            const store = createWorkspaceStore();
            const { unmount } = render(<Workspace store={store} />);
            const sample = screen.getByRole("button", { name: "Open the Florentine families sample" });
            sample.focus();
            const session = await openBy(store, () => userEvent.keyboard("{Enter}"));
            assertFocusOnGraphHeading(15, session.data.statistics().edgeCount);
            unmount();
        },
        TIMEOUT_MS,
    );

    // eslint-disable-next-line local/no-test-timing -- per-test timeout, to go once the slow step is found, tracked in #1636
    it(
        "a refused file hands focus to Open a file, beside the reason",
        async () => {
            vi.spyOn(HTMLInputElement.prototype, "click").mockImplementationOnce(function (this: HTMLInputElement) {
                const transfer = new DataTransfer();
                transfer.items.add(new File(['<?xml version="1.0"?>\n<graphml><graph><node id='], "cut.graphml"));
                this.files = transfer.files;
                this.dispatchEvent(new Event("change"));
            });
            const store = createWorkspaceStore();
            const { unmount } = render(<Workspace store={store} />);
            openButton().focus();
            await userEvent.keyboard("{Enter}");
            await waitFor(
                () => {
                    assert.isTrue(store.get().notice?.error);
                    assert.isNull(store.get().project);
                },
                { timeout: TIMEOUT_MS },
            );
            await waitFor(() => {
                assert.strictEqual(document.activeElement, openButton());
            });
            assert.isNotNull(screen.getByText(store.get().notice?.message ?? ""));
            unmount();
        },
        TIMEOUT_MS,
    );

    // eslint-disable-next-line local/no-test-timing -- per-test timeout, to go once the slow step is found, tracked in #1636
    it(
        "Escape from the shortcuts dialog opened from the drawing hands focus back to the drawing",
        async () => {
            const store = createWorkspaceStore();
            const { unmount } = render(<Workspace store={store} />);
            const session = await openBy(store, () => pickSample("Florentine families"));
            // The open is done once it has handed focus to the graph's heading, so that hand-off
            // never takes focus from the drawing later.
            assertFocusOnGraphHeading(15, session.data.statistics().edgeCount);
            const host = openedHost();
            host.shadowRoot?.querySelector("canvas")?.focus();
            assertFocusOnDrawing(host);

            await userEvent.keyboard("?");
            await screen.findByRole("dialog", { name: "Keyboard shortcuts" });
            await userEvent.keyboard("{Escape}");
            await waitFor(() => {
                assert.isNull(screen.queryByRole("dialog"));
                assertFocusOnDrawing(host);
            });
            unmount();
        },
        TIMEOUT_MS,
    );

    // eslint-disable-next-line local/no-test-timing -- per-test timeout, to go once the slow step is found, tracked in #1636
    it(
        "Enter on a recent project hands focus to the graph's heading",
        async () => {
            // A project kept in this browser, so Recent projects lists it.
            const kept = createWorkspaceStore();
            const first = render(<Workspace store={kept} />);
            const session = await openBy(kept, () => pickSample("Florentine families"));
            await session.project.rename("Kept Florentine");
            await browserProjects.save(session);
            await refreshStored();
            first.unmount();

            const store = createWorkspaceStore();
            const { unmount } = render(<Workspace store={store} />);
            const row = await screen.findByRole("gridcell", { name: /^Kept Florentine/ });
            row.focus();
            const opened = await openBy(store, () => userEvent.keyboard("{Enter}"));
            assert.equal(store.get().project?.name, "Kept Florentine");
            assertFocusOnGraphHeading(15, opened.data.statistics().edgeCount);
            unmount();
        },
        // Twice the waits inside it, so a failure reports its assertion rather than the test timeout.
        TIMEOUT_MS * 2,
    );
    // eslint-disable-next-line local/no-test-timing -- per-test timeout, to go once the slow step is found, tracked in #1636
    it(
        "Open a file with a data file draws it and hands focus to the graph's heading",
        async () => {
            const store = createWorkspaceStore();
            const { unmount } = render(<Workspace store={store} />);
            // Every control focus reaches from here on: never the rail, while the file is read.
            const reached: Element[] = [];
            const onFocusIn = (event: FocusEvent): void => {
                if (event.target instanceof Element) {
                    reached.push(event.target);
                }
            };
            document.addEventListener("focusin", onFocusIn);

            // The file is drawn at once (the data prototype's first load), and the start screen goes:
            // focus goes to the graph's heading.
            chooseCsv();
            openButton().focus();
            await openBy(store, () => userEvent.keyboard("{Enter}"));
            assertFocusOnGraphHeading(3, 2);
            document.removeEventListener("focusin", onFocusIn);
            assert.isEmpty(
                reached.filter(
                    (element) => element.closest(".ws-rail") !== null || element.closest('[role="tree"]') !== null,
                ),
                "focus passed the rail or a layer row",
            );
            unmount();
        },
        TIMEOUT_MS,
    );

    // eslint-disable-next-line local/no-test-timing -- per-test timeout, to go once the slow step is found, tracked in #1636
    it(
        "closing the table, or a notice from inside it, hands focus to the drawing",
        async () => {
            const store = createWorkspaceStore();
            const { unmount } = render(<Workspace store={store} />);
            await openBy(store, () => pickSample("Florentine families"));
            const host = openedHost();

            store.set({ dockOpen: true });
            (await screen.findByRole("button", { name: "Close table" })).focus();
            await userEvent.keyboard("{Enter}");
            assert.isNull(screen.queryByRole("button", { name: "Close table" }));
            await waitFor(() => {
                assertFocusOnDrawing(host);
            });

            let undone = false;
            store.set({
                notice: {
                    message: "Removed Color",
                    action: {
                        label: "Undo",
                        run: () => {
                            undone = true;
                        },
                    },
                },
            });
            // The notice's own Undo, not the header's.
            const notice = await waitFor(() => {
                const slot = document.querySelector<HTMLElement>(".ws-notice-slot");
                assert.exists(slot);
                return slot;
            });
            within(notice).getByRole("button", { name: "Undo" }).focus();
            await userEvent.keyboard("{Enter}");
            assert.isTrue(undone);
            assert.isNull(store.get().notice);
            await waitFor(() => {
                assertFocusOnDrawing(host);
            });
            unmount();
        },
        TIMEOUT_MS,
    );
});
