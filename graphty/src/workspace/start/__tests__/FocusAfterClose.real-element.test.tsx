/**
 * Where keyboard focus goes when the control holding it goes away, on the REAL graphty-element.
 * The drawing does not take focus on its own, so each of these used to drop focus to the page
 * itself, and a keyboard or screen-reader user had to start again from the top:
 *
 * - a graph opened (a sample, a recent project): the graph's heading in the inspector, which says
 *   its name and size, once it is read (never the drawing's outline, never a pinned layer row); the
 *   style tree's Tab stop is then Everything;
 * - Tab past the start screen's last control, or Shift+Tab before its first: the other end;
 * - the usage data card answered: Open a file, the first way in;
 * - a file refused: Open a file, beside the reason that stays;
 * - Escape from a dialog opened from the drawing: the drawing again;
 * - a Recent projects row removed: the row now in its place, or Open a file;
 * - Open a file with a data file (the start screen goes): the Data page's Load, never the rail,
 *   with what it will make as its description; Load (the Data page goes): the graph's heading;
 *   Cancel: Open a file again;
 * - the table closed, or a notice closed from inside it: the drawing.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import { browserProjects, type GraphSession } from "@graphty/graphty-element/session";
import userEvent from "@testing-library/user-event";
import { afterEach, assert, beforeEach, describe, it, vi } from "vitest";
import { userEvent as realKeys } from "vitest/browser";

import { render, screen, waitFor, within } from "../../../test/test-utils";
import { INSPECTOR_TITLE_ID } from "../../frame/focus";
import { forgetUsageAnswer } from "../../privacy/usageData";
import { clearRecent, refreshStored, rememberRecent } from "../../project/recent";
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
 * The text an element's description names (`aria-describedby`).
 * @param element - the element.
 * @returns the words.
 */
function describedBy(element: Element): string {
    return (element.getAttribute("aria-describedby") ?? "")
        .split(" ")
        .map((id) => document.getElementById(id)?.textContent ?? "")
        .join(" ")
        .trim();
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
        // The tile's size line is the button's description.
        assert.include(describedBy(sample), "15 nodes");
        sample.focus();
        await userEvent.keyboard("{Enter}");
        const { session } = await loaded(15);
        await waitFor(() => {
            assertFocusOnGraphHeading(15, session.data.statistics().edgeCount);
        });
        unmount();
    });

    it("Tab and Shift+Tab round the start screen, never to the page", async () => {
        forgetUsageAnswer();
        const { unmount } = render(<Workspace store={createWorkspaceStore()} />);
        const menu = screen.getByRole("button", { name: "Main menu" });
        menu.focus();
        await realKeys.keyboard("{Shift>}{Tab}{/Shift}");
        assert.notStrictEqual(document.activeElement, document.body, "Shift+Tab dropped focus to the page");
        assert.notStrictEqual(document.activeElement, menu);
        await realKeys.keyboard("{Tab}");
        assert.strictEqual(document.activeElement, menu, "Tab from the last control comes back round");
        unmount();
    });

    it("No thanks on the usage data card hands focus to Open a file", async () => {
        forgetUsageAnswer();
        const { unmount } = render(<Workspace store={createWorkspaceStore()} />);
        screen.getByRole("button", { name: "No thanks" }).focus();
        await userEvent.keyboard("{Enter}");
        assert.isNull(screen.queryByRole("button", { name: "No thanks" }));
        assert.strictEqual(document.activeElement, openButton());
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
    it("removing Recent projects rows hands focus to the row now in its place, then to Open a file", async () => {
        for (const [i, name] of ["Older file", "Newer file"].entries()) {
            await rememberRecent({ id: name, name, nodes: 10, at: 1000 + i });
        }
        const { unmount } = render(<Workspace store={createWorkspaceStore()} />);
        for (const name of ["Newer file", "Older file"]) {
            const more = await screen.findByRole("button", { name: `More for ${name}` });
            more.focus();
            await userEvent.keyboard("{Enter}");
            (await screen.findByRole("menuitem", { name: "Remove from list" })).focus();
            await userEvent.keyboard("{Enter}");
            await waitFor(() => {
                assert.isNull(screen.queryByRole("gridcell", { name: new RegExp(`^${name}`) }));
            });
            await waitFor(() => {
                const expected =
                    name === "Newer file" ? screen.getByRole("gridcell", { name: /^Older file/ }) : openButton();
                assert.strictEqual(document.activeElement, expected, `after removing ${name}`);
            });
        }
        unmount();
    });

    it("removing a project kept in this browser, after its question, hands focus on too", async () => {
        const first = render(<Workspace store={createWorkspaceStore()} />);
        await userEvent.click(screen.getByRole("button", { name: "Open the Florentine families sample" }));
        const { session } = await loaded(15);
        await browserProjects.save(session);
        await refreshStored();
        first.unmount();

        const { unmount } = render(<Workspace store={createWorkspaceStore()} />);
        (await screen.findByRole("button", { name: /^More for / })).focus();
        await userEvent.keyboard("{Enter}");
        (await screen.findByRole("menuitem", { name: "Remove from this browser" })).focus();
        await userEvent.keyboard("{Enter}");
        const dialog = await screen.findByRole("dialog");
        within(dialog).getByRole("button", { name: "Remove" }).focus();
        await userEvent.keyboard("{Enter}");
        await waitFor(() => {
            assert.isNull(screen.queryByRole("dialog"));
            assert.strictEqual(document.activeElement, openButton());
        });
        unmount();
    });

    it("Open a file with a data file hands focus to Load on the Data page, and Load to the graph's heading", async () => {
        const { unmount } = render(<Workspace store={createWorkspaceStore()} />);
        // Every control focus reaches from here on: never the rail, while the file is read.
        const reached: Element[] = [];
        const onFocusIn = (event: FocusEvent): void => {
            if (event.target instanceof Element) {
                reached.push(event.target);
            }
        };
        document.addEventListener("focusin", onFocusIn);

        // The file is read with focus on Load, which says what it will make; Load takes the
        // Data page away: focus goes to the graph's heading.
        chooseCsv();
        openButton().focus();
        await userEvent.keyboard("{Enter}");
        const load = await screen.findByRole("button", { name: "Load" });
        await waitFor(() => {
            assert.isFalse(load.hasAttribute("disabled") || load.getAttribute("data-disabled") === "true");
            assert.strictEqual(document.activeElement, load);
        });
        assert.include(describedBy(load), "abc: 3 nodes, 2 edges");
        await userEvent.keyboard("{Enter}");
        await loaded(3);
        await waitFor(() => {
            assert.isNull(screen.queryByRole("region", { name: "Data page" }));
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

    it("Cancel on the Data page opened by Open a file hands focus back to Open a file", async () => {
        const { unmount } = render(<Workspace store={createWorkspaceStore()} />);
        chooseCsv();
        openButton().focus();
        await userEvent.keyboard("{Enter}");
        // A chosen file keeps the page open on Esc (DataPage.tsx), so Cancel is the way out.
        (await screen.findByRole("button", { name: "Cancel" })).focus();
        await userEvent.keyboard("{Enter}");
        await waitFor(() => {
            assert.strictEqual(document.activeElement, openButton());
        });
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
