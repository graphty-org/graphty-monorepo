/**
 * Notes on the REAL graphty-element: N on a selected node opens the editor in the Notes place
 * about that node; Ctrl+Enter saves it, lists it (focused, with no tooltip over it) with the node's chip, says so on the status line
 * and counts it on the node's inspector header. A saved project brings the note back on reopen.
 * Deleting a focused note hands focus to the next note, and to "+" when none is left.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession } from "@graphty/graphty-element/session";
import userEvent from "@testing-library/user-event";
import { assert, beforeEach, describe, it } from "vitest";
import { page, userEvent as realInput } from "vitest/browser";

import { render, screen, waitFor, within } from "../../../test/test-utils";
import { clearRecent } from "../../project/recent";
import { createWorkspaceStore, type WorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";

/** A hang guard for the element coming up and a sample loading, not a pass/fail timing. */
const TIMEOUT_MS = 60_000;

/**
 * Waits for an element whose session is not `previous`.
 * @param previous - a session that no longer counts.
 * @returns the session.
 */
async function elementSession(previous?: GraphSession): Promise<GraphSession> {
    let session: GraphSession | undefined;
    await waitFor(
        () => {
            session = document.querySelector("graphty-element")?.session;
            assert.isDefined(session);
            assert.notStrictEqual(session, previous);
        },
        { timeout: TIMEOUT_MS },
    );
    if (session === undefined) {
        throw new Error("the element never came up");
    }
    return session;
}

/**
 * Opens the Florentine families sample from the empty app.
 * @param store - the workspace store.
 * @returns the session.
 */
async function openSample(store: WorkspaceStore): Promise<GraphSession> {
    render(<Workspace store={store} />);
    await userEvent.click(screen.getByRole("button", { name: "Open the Florentine families sample" }));
    const session = await elementSession();
    await waitFor(
        () => {
            assert.equal(session.data.statistics().nodeCount, 15);
        },
        { timeout: TIMEOUT_MS },
    );
    return session;
}

beforeEach(async () => {
    await clearRecent();
});

describe("Notes, on the real element", () => {
    // eslint-disable-next-line local/no-test-timing -- per-test timeout, to go once the slow step is found, tracked in #1636
    it(
        "writes a note about the selected node with N and brings it back after save and reopen",
        async () => {
            const store = createWorkspaceStore();
            const session = await openSample(store);
            const [first] = session.data.nodes();
            const name = String(first.id);
            await session.selection.apply({ nodes: [first.id] });
            (document.activeElement as HTMLElement | null)?.blur();

            await userEvent.keyboard("n");
            const field = await screen.findByRole("textbox", { name: "Note" });
            await waitFor(() => {
                assert.strictEqual(document.activeElement, field);
            });
            await userEvent.keyboard("Ask about the bank{Control>}{Enter}{/Control}");

            const list = await screen.findByRole("list", { name: "Notes" });
            const note = within(list).getByRole("listitem", { name: "Ask about the bank" });
            assert.isNotNull(within(note).getByRole("button", { name: `${name}, in note: Ask about the bank` }));
            assert.equal(store.get().announcement, `Note added about ${name}`);
            assert.isNull(screen.queryByRole("textbox", { name: "Note" }));
            // The saved note takes focus, and no tooltip ("Add note") opens over it.
            await waitFor(() => {
                assert.strictEqual(document.activeElement, note);
            });
            assert.isNull(screen.queryByRole("tooltip"));
            // Its delete control is the trash glyph, not the minus that reads as collapse.
            const remove = within(note).getByRole("button", { name: "Delete note: Ask about the bank" });
            assert.isNotNull(remove.querySelector("svg.lucide-trash-2"));
            assert.deepEqual(
                session.notes.list().map((saved) => ({ text: saved.text, targets: saved.targets })),
                [{ text: "Ask about the bank", targets: [{ node: first.id }] }],
            );
            const inspector = screen.getByRole("complementary", { name: "Inspector" });
            assert.isNotNull(within(inspector).getByRole("button", { name: "1 note" }));

            // Save as, back to start, reopen from Recent projects.
            await userEvent.keyboard("{Control>}s{/Control}");
            const dialog = await screen.findByRole("dialog", { name: /^Save .* as$/ });
            await userEvent.clear(within(dialog).getByRole("textbox", { name: "Name" }));
            await userEvent.keyboard("With a note{Enter}");
            await waitFor(
                () => {
                    assert.isNull(screen.queryByRole("dialog"));
                    assert.isFalse(session.project.dirty);
                },
                { timeout: TIMEOUT_MS },
            );
            await userEvent.click(screen.getByRole("button", { name: "Main menu" }));
            await userEvent.click(await screen.findByRole("menuitem", { name: "Back to start" }));
            await userEvent.click(await screen.findByRole("gridcell", { name: /^With a note/ }));
            const reopened = await elementSession(session);
            await waitFor(
                () => {
                    assert.deepEqual(
                        reopened.notes.list().map((saved) => ({ text: saved.text, targets: saved.targets })),
                        [{ text: "Ask about the bank", targets: [{ node: first.id }] }],
                    );
                },
                { timeout: TIMEOUT_MS },
            );
            await userEvent.click(screen.getByRole("button", { name: "Notes" }));
            const again = await screen.findByRole("list", { name: "Notes" });
            assert.isNotNull(within(again).getByRole("listitem", { name: "Ask about the bank" }));
        },
        TIMEOUT_MS * 2,
    );

    // eslint-disable-next-line local/no-test-timing -- per-test timeout, to go once the slow step is found, tracked in #1636
    it(
        "moves focus to the next note after a delete, and to Add note when none is left",
        async () => {
            const store = createWorkspaceStore();
            const session = await openSample(store);
            for (const text of ["one", "two", "three"]) {
                session.notes.add({ text, targets: [{ graph: true }] });
            }
            store.set({ place: "notes" });
            const list = await screen.findByRole("list", { name: "Notes" });
            const items = within(list).getAllByRole("listitem");
            // Newest first, and one Tab stop: only the first note is in the Tab order.
            assert.deepEqual(
                items.map((item) => item.getAttribute("aria-label")),
                ["three", "two", "one"],
            );
            assert.deepEqual(
                items.map((item) => item.tabIndex),
                [0, -1, -1],
            );
            // Each note's chip and delete button is named after its note: no two share a name.
            const names = within(list)
                .getAllByRole("button")
                .map((button) => button.getAttribute("aria-label"));
            assert.deepEqual(names, [
                "Graph, in note: three",
                "Delete note: three",
                "Graph, in note: two",
                "Delete note: two",
                "Graph, in note: one",
                "Delete note: one",
            ]);
            items[0].focus();
            await userEvent.keyboard("{ArrowDown}");
            assert.strictEqual(document.activeElement, items[1]);

            await userEvent.keyboard("{Delete}");
            await waitFor(() => {
                assert.equal(document.activeElement?.getAttribute("aria-label"), "one");
            });
            // The last note's next is the one above it.
            await userEvent.keyboard("{Delete}");
            await waitFor(() => {
                assert.equal(document.activeElement?.getAttribute("aria-label"), "three");
            });
            await userEvent.keyboard("{Delete}");
            await waitFor(() => {
                assert.strictEqual(document.activeElement, screen.getByRole("button", { name: "Add note" }));
            });
            assert.isNotNull(screen.getByText("No notes."));
            assert.lengthOf(session.notes.list(), 0);
        },
        TIMEOUT_MS,
    );
    // eslint-disable-next-line local/no-test-timing -- per-test timeout, to go once the slow step is found, tracked in #1636
    it(
        "a click on empty canvas lets go of a selected run, so the next note is about the graph",
        async () => {
            // Wide enough that the canvas is drawn beside both panels.
            await page.viewport(1366, 768);
            const store = createWorkspaceStore();
            const session = await openSample(store);
            await session.runs.start("pagerank", {});
            await userEvent.click(await screen.findByRole("treeitem", { name: "PageRank" }));
            await waitFor(() => {
                assert.isNotNull(store.get().inspected);
            });

            // A spot near the canvas's lower right corner with no node or edge under it.
            const element = document.querySelector("graphty-element");
            assert.isNotNull(element);
            const canvas = (element.shadowRoot ?? element).querySelector("canvas");
            assert.isNotNull(canvas);
            const box = canvas.getBoundingClientRect();
            const host = element.getBoundingClientRect();
            const spot = { x: Math.round(box.width) - 20, y: Math.round(box.height) - 20 };
            await waitFor(() => {
                assert.isNull(element.elementAt({ x: spot.x + box.left - host.left, y: spot.y + box.top - host.top }));
            });
            await realInput.click(canvas, { position: spot });
            await waitFor(() => {
                assert.isNull(store.get().inspected);
            });

            (document.activeElement as HTMLElement | null)?.blur();
            await userEvent.keyboard("n");
            const field = await screen.findByRole("textbox", { name: "Note" });
            const editor = field.closest<HTMLElement>(".nt-editor");
            assert.isNotNull(editor);
            assert.isNotNull(within(editor).queryByText("Graph"), "the note is about the graph");
            assert.isNull(within(editor).queryByText("PageRank"), "not about the run left behind");
        },
        TIMEOUT_MS,
    );
});
