/**
 * Where keyboard focus goes when the control holding it goes away, on the REAL graphty-element.
 * The drawing does not take focus on its own, so each of these used to drop focus to the page
 * itself, and a keyboard or screen-reader user had to start again from the top:
 *
 * - a graph opened (a sample, a recent project): the open place's rail button, a control (never
 *   the drawing's outline), where every single-key shortcut still works;
 * - the usage data card answered: Open project or file..., the first way in;
 * - a file refused: Open project or file..., beside the reason that stays;
 * - Escape from a dialog opened from the drawing: the drawing again;
 * - a Recent projects row removed: the row now in its place, or Open project or file...;
 * - New from data... (the start screen goes): the Data page's first ask, "choose a file...";
 *   Load (the Data page goes): the open place's rail button;
 * - the table closed, or a notice closed from inside it: the drawing.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import { browserProjects, type GraphSession } from "@graphty/graphty-element/session";
import userEvent from "@testing-library/user-event";
import { afterEach, assert, beforeEach, describe, it, vi } from "vitest";

import { render, screen, waitFor, within } from "../../../test/test-utils";
import { forgetUsageAnswer } from "../../privacy/usageData";
import { clearRecent, refreshStored, rememberRecent } from "../../project/recent";
import { createWorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";

/** A hang guard for the element coming up and a sample loading, not a pass/fail timing. */
const TIMEOUT_MS = 60_000;

/**
 * Waits for the open project's element to come up with the graph loaded.
 * @param nodes - the node count the loaded graph has.
 * @returns the element and its session.
 */
async function loaded(nodes: number): Promise<{ host: HTMLElement; session: GraphSession }> {
    let found: { host: HTMLElement; session: GraphSession } | undefined;
    await waitFor(
        () => {
            const host = document.querySelector("graphty-element");
            const session = host?.session;
            assert.isDefined(session);
            assert.equal(session.data.statistics().nodeCount, nodes);
            found = { host: host as HTMLElement, session };
        },
        { timeout: TIMEOUT_MS },
    );
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
 * Asserts that keyboard focus is on the rail button of the open place, not on the drawing.
 */
function assertFocusOnCurrentPlace(): void {
    const places = screen.getByRole("toolbar", { name: "Places" });
    const active = document.activeElement;
    assert.isTrue(places.contains(active), "focus is not on the rail");
    assert.equal(active?.getAttribute("aria-current"), "page", "focus is not on the open place");
}

/**
 * The start screen's first way in.
 * @returns Open project or file...
 */
function openButton(): HTMLElement {
    return screen.getByRole("button", { name: /^Open project or file\.\.\./ });
}

beforeEach(async () => {
    await clearRecent();
});

afterEach(() => {
    forgetUsageAnswer();
    vi.restoreAllMocks();
});

describe("focus after the control holding it goes away, on the real element", () => {
    it(
        "a sample opened with Enter hands focus to the open place's rail button",
        async () => {
            const { unmount } = render(<Workspace store={createWorkspaceStore()} />);
            screen.getByRole("button", { name: "Open the Florentine families sample" }).focus();
            await userEvent.keyboard("{Enter}");
            await loaded(15);
            await waitFor(() => {
                assertFocusOnCurrentPlace();
            });
            unmount();
        },
        TIMEOUT_MS,
    );

    it("No thanks on the usage data card hands focus to Open project or file...", async () => {
        forgetUsageAnswer();
        const { unmount } = render(<Workspace store={createWorkspaceStore()} />);
        screen.getByRole("button", { name: "No thanks" }).focus();
        await userEvent.keyboard("{Enter}");
        assert.isNull(screen.queryByRole("button", { name: "No thanks" }));
        assert.strictEqual(document.activeElement, openButton());
        unmount();
    });

    it(
        "a refused file hands focus to Open project or file..., beside the reason",
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

    it(
        "Escape from the shortcuts dialog opened from the drawing hands focus back to the drawing",
        async () => {
            const { unmount } = render(<Workspace store={createWorkspaceStore()} />);
            await userEvent.click(screen.getByRole("button", { name: "Open the Florentine families sample" }));
            const { host } = await loaded(15);
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

    it(
        "Enter on a recent project hands focus to the open place's rail button",
        async () => {
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
            await loaded(15);
            await waitFor(
                () => {
                    assert.equal(store.get().project?.name, "Kept Florentine");
                    assertFocusOnCurrentPlace();
                },
                { timeout: TIMEOUT_MS },
            );
            unmount();
        },
        // Twice the waits inside it, so a failure reports its assertion rather than the test timeout.
        TIMEOUT_MS * 2,
    );
    it("removing Recent projects rows hands focus to the row now in its place, then to Open project or file...", async () => {
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

    it(
        "removing a project kept in this browser, after its question, hands focus on too",
        async () => {
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
        },
        TIMEOUT_MS,
    );

    it(
        "New from data... hands focus to the Data page's first ask, and Load to the open place's rail button",
        async () => {
            const { unmount } = render(<Workspace store={createWorkspaceStore()} />);
            screen.getByRole("button", { name: /^New from data\.\.\./ }).focus();
            await userEvent.keyboard("{Enter}");
            const ask = await screen.findByRole("button", { name: "choose a file..." }, { timeout: TIMEOUT_MS });
            await waitFor(() => {
                assert.strictEqual(document.activeElement, ask);
            });

            // Load takes the Data page away: focus goes to the open place's rail button.
            vi.spyOn(HTMLInputElement.prototype, "click").mockImplementationOnce(function (this: HTMLInputElement) {
                const transfer = new DataTransfer();
                transfer.items.add(new File(["source,target\na,b\nb,c\n"], "abc.csv", { type: "text/csv" }));
                this.files = transfer.files;
                this.dispatchEvent(new Event("change", { bubbles: true }));
            });
            await userEvent.keyboard("{Enter}");
            const load = await screen.findByRole("button", { name: "Load" });
            await waitFor(
                () => {
                    assert.isFalse(load.hasAttribute("disabled") || load.getAttribute("data-disabled") === "true");
                },
                { timeout: TIMEOUT_MS },
            );
            load.focus();
            await userEvent.keyboard("{Enter}");
            await loaded(3);
            await waitFor(() => {
                assert.isNull(screen.queryByRole("region", { name: "Data page" }));
                assertFocusOnCurrentPlace();
            });
            unmount();
        },
        TIMEOUT_MS,
    );

    it(
        "closing the table, or a notice from inside it, hands focus to the drawing",
        async () => {
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
        },
        TIMEOUT_MS,
    );
});
