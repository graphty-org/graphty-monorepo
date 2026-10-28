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

import { browserProjects, type GraphSession } from "@graphty/graphty-element/session";
import userEvent from "@testing-library/user-event";
import { afterEach, assert, beforeEach, describe, it, vi } from "vitest";

import { render, screen, waitFor, within } from "../../../test/test-utils";
import { INSPECTOR_TITLE_ID } from "../../frame/focus";
import { forgetUsageAnswer } from "../../privacy/usageData";
import { clearRecent, refreshStored } from "../../project/recent";
import { createWorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";

/**
 * Waits for the open project's element to come up with the graph loaded.
 * @param nodes - the node count the loaded graph has.
 * @returns the element and its session.
 */
async function loaded(nodes: number): Promise<{ host: HTMLElement; session: GraphSession }> {
    let found: { host: HTMLElement; session: GraphSession } | undefined;
    await waitFor(() => {
        const host = document.querySelector<HTMLElementTagNameMap["graphty-element"]>(
            "graphty-element:not([data-start-page])",
        );
        const session = host?.session;
        assert.isDefined(session);
        assert.equal(session.data.statistics().nodeCount, nodes);
        found = { host: host as HTMLElement, session };
    });
    if (found === undefined) {
        throw new Error("the element never came up");
    }
    return found;
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
    it("a sample opened with Enter hands focus to the graph's heading, which says its size", async () => {
        const { unmount } = render(<Workspace store={createWorkspaceStore()} />);
        const sample = screen.getByRole("button", { name: "Open the Florentine families sample" });
        sample.focus();
        await userEvent.keyboard("{Enter}");
        const { session } = await loaded(15);
        await waitFor(() => {
            assertFocusOnGraphHeading(15, session.data.statistics().edgeCount);
        });
        unmount();
    });

    it("a refused file hands focus to Open a file, beside the reason", async () => {
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
        await waitFor(() => {
            assert.isTrue(store.get().notice?.error);
            assert.isNull(store.get().project);
        });
        await waitFor(() => {
            assert.strictEqual(document.activeElement, openButton());
        });
        assert.isNotNull(screen.getByText(store.get().notice?.message ?? ""));
        unmount();
    });

    it("Escape from the shortcuts dialog opened from the drawing hands focus back to the drawing", async () => {
        const { unmount } = render(<Workspace store={createWorkspaceStore()} />);
        await userEvent.click(screen.getByRole("button", { name: "Open the Florentine families sample" }));
        const { host, session } = await loaded(15);
        // The node count is up before the open finishes; the open then hands focus to the
        // graph's heading. Wait for that hand-off, or it takes focus from the drawing later.
        await waitFor(() => {
            assertFocusOnGraphHeading(15, session.data.statistics().edgeCount);
        });
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
    });

    it("Enter on a recent project hands focus to the graph's heading", async () => {
        // A project kept in this browser, so Recent projects lists it.
        const first = render(<Workspace store={createWorkspaceStore()} />);
        await userEvent.click(screen.getByRole("button", { name: "Open the Florentine families sample" }));
        const { session } = await loaded(15);
        await session.project.rename("Kept Florentine");
        await browserProjects.save(session);
        await refreshStored();
        first.unmount();

        const store = createWorkspaceStore();
        const { unmount } = render(<Workspace store={store} />);
        const row = await screen.findByRole("gridcell", { name: /^Kept Florentine/ });
        row.focus();
        await userEvent.keyboard("{Enter}");
        const opened = await loaded(15);
        await waitFor(() => {
            assert.equal(store.get().project?.name, "Kept Florentine");
            assertFocusOnGraphHeading(15, opened.session.data.statistics().edgeCount);
        });
        unmount();
    });
    it("Open a file with a data file draws it and hands focus to the graph's heading", async () => {
        const { unmount } = render(<Workspace store={createWorkspaceStore()} />);
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
        await userEvent.keyboard("{Enter}");
        await loaded(3);
        await waitFor(() => {
            assertFocusOnGraphHeading(3, 2);
        });
        document.removeEventListener("focusin", onFocusIn);
        assert.isEmpty(
            reached.filter(
                (element) => element.closest(".ws-rail") !== null || element.closest('[role="tree"]') !== null,
            ),
            "focus passed the rail or a layer row",
        );
        unmount();
    });

    it("closing the table, or a notice from inside it, hands focus to the drawing", async () => {
        const store = createWorkspaceStore();
        const { unmount } = render(<Workspace store={store} />);
        await userEvent.click(screen.getByRole("button", { name: "Open the Florentine families sample" }));
        const { host } = await loaded(15);

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
    });
});
