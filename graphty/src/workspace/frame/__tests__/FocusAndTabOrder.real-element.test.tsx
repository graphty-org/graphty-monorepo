/**
 * Where keyboard focus goes in the workspace, on the REAL graphty-element, by real keys: never to
 * the page. Tab rounds the page; F6 crosses from the layer list to the inspector in one press;
 * Shift+T puts focus in the table; View > Frame selection hands focus back to View; a "Why this
 * look" link hands it to the inspector's title; the arrow keys on the Node and Edge tabs keep it
 * on the tabs; an info button opens only when pressed; Tab out of a Vary by list closes it and
 * moves on; a section "+" with nothing to add is no Tab stop.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession } from "@graphty/graphty-element/session";
import { assert, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import { act, render, screen, waitFor, within } from "../../../test/test-utils";
import { createWorkspaceStore, type WorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";

/** A hang guard for the element coming up and a run finishing, not a pass/fail timing. */
const TIMEOUT_MS = 90_000;

/** Two rings of six joined by one bridge; each node labeled. */
const NODES = Array.from({ length: 12 }, (_, i) => ({ id: `n${String(i)}`, label: `Node ${String(i)}` }));
const ring = (from: number): { source: string; target: string }[] =>
    Array.from({ length: 6 }, (_, i) => ({
        source: `n${String(from + i)}`,
        target: `n${String(from + ((i + 1) % 6))}`,
    }));
const EDGES = [...ring(0), ...ring(6), { source: "n0", target: "n6" }];

/**
 * The workspace holding the two rings, with the starting rows.
 * @returns the session and the store.
 */
async function openRings(): Promise<{ session: GraphSession; store: WorkspaceStore }> {
    await page.viewport(1440, 900);
    const store = createWorkspaceStore({ project: { name: "Two rings", id: 1 } });
    render(<Workspace store={store} />);
    const session = await waitFor(
        () => {
            const found = document.querySelector("graphty-element")?.session;
            assert.isDefined(found);
            return found;
        },
        { timeout: TIMEOUT_MS },
    );
    if (session === undefined) {
        throw new Error("the element never came up");
    }
    await session.config.set({
        startingRows: true,
        editableBase: true,
        data: { knownFields: { nodeLabelPath: "label" } },
    });
    await session.data.addNodes(NODES);
    await session.data.addEdges(EDGES);
    await session.styles.settled();
    return { session, store };
}

/**
 * The inspector region.
 * @returns queries scoped to it.
 */
const inspector = (): ReturnType<typeof within> => within(screen.getByRole("complementary", { name: "Inspector" }));

/**
 * A tree row, by the start of its name.
 * @param name - the row's name.
 * @returns the row.
 */
async function treeRow(name: string): Promise<HTMLElement> {
    const tree = await screen.findByRole("tree", { name: "Style layers" }, { timeout: TIMEOUT_MS });
    return within(tree).findByRole("treeitem", { name: new RegExp(`^${name}, `) });
}

/**
 * Asserts that focus is on a control, not on the page.
 */
function assertFocusOnAControl(): void {
    assert.notStrictEqual(document.activeElement, document.body, "focus fell to the page");
    assert.isNotNull(document.activeElement);
}

describe("focus and Tab order in the workspace, on the real element", () => {
    it("Tab past the last control goes to Main menu, and Shift+Tab from Main menu to the last", async () => {
        await openRings();
        const menu = screen.getByRole("button", { name: "Main menu" });
        menu.focus();
        await userEvent.keyboard("{Shift>}{Tab}{/Shift}");
        assertFocusOnAControl();
        const last = document.activeElement;
        await userEvent.keyboard("{Tab}");
        assert.strictEqual(document.activeElement, menu);
        assert.notStrictEqual(last, menu);
    });

    it("F6 goes from a layer row to the inspector in one press, and Shift+F6 back", async () => {
        await openRings();
        const row = await treeRow("Everything");
        await userEvent.click(row);
        assert.strictEqual(document.activeElement, row);
        await userEvent.keyboard("{F6}");
        const right = screen.getByRole("complementary", { name: "Inspector" });
        assert.isTrue(
            right.contains(document.activeElement),
            `F6 did not reach the inspector: ${document.activeElement?.outerHTML.slice(0, 200) ?? "nothing"}`,
        );
        await userEvent.keyboard("{Shift>}{F6}{/Shift}");
        assert.strictEqual(document.activeElement, row);
        // The shortcuts dialog lists it.
        await userEvent.keyboard("?");
        const dialog = await screen.findByRole("dialog", { name: "Keyboard shortcuts" });
        assert.include(dialog.textContent, "Next panel");
        assert.include(dialog.textContent, "Previous panel");
    });

    it("Shift+T opens the table with focus in its grid", async () => {
        await openRings();
        screen.getByRole("button", { name: "Main menu" }).focus();
        await userEvent.keyboard("{Shift>}T{/Shift}");
        await waitFor(() => {
            assert.isNotNull(document.activeElement?.closest("[role='grid']"), "focus is not in the table");
        });
    });

    it("View > Frame selection hands focus back to View", async () => {
        const { session } = await openRings();
        await act(async () => {
            await session.selection.apply({ nodes: ["n3"] });
        });
        const view = screen.getByRole("button", { name: /^View/ });
        await userEvent.click(view);
        await userEvent.click(await screen.findByRole("menuitem", { name: "Frame selection" }));
        await waitFor(() => {
            assert.isNull(screen.queryByRole("menu"));
            assert.strictEqual(document.activeElement, view);
        });
    });

    it("Enter on a Why this look link puts focus on the line it explains", async () => {
        const { session } = await openRings();
        const run = session.runs.start("louvain");
        await act(async () => {
            await run;
            await session.styles.settled();
            await session.selection.apply({ nodes: ["n3"] });
        });
        await userEvent.click(await inspector().findByRole("tab", { name: "Style" }));
        const lines: HTMLElement[] = await inspector().findAllByTestId("why-line");
        const link = lines.map((line) => within(line).queryByRole("button")).find((button) => button !== null);
        if (link === undefined || link === null) {
            throw new Error("no Why this look link");
        }
        link.focus();
        await userEvent.keyboard("{Enter}");
        // The opened row's Style tab hands focus to the line of the property the link explained.
        await waitFor(() => {
            assert.isNotNull(document.activeElement?.closest("[data-line]") ?? null);
        });
    });

    it("ArrowRight on the Node tab moves to Edge and keeps focus on the tabs", async () => {
        await openRings();
        await userEvent.click(await treeRow("Everything"));
        await userEvent.click(await inspector().findByRole("tab", { name: "Style" }));
        const node = await inspector().findByRole("tab", { name: /^Node/ });
        await userEvent.click(node);
        await userEvent.keyboard("{ArrowRight}");
        const edge = inspector().getByRole("tab", { name: /^Edge/ });
        await waitFor(() => {
            assert.strictEqual(edge.getAttribute("aria-selected"), "true");
        });
        // The Edge tab's lines are drawn; focus stays on the tab the arrow reached.
        await waitFor(() => {
            assert.isNotNull(screen.getByTestId("style-tab").querySelector("[data-group='edge']"));
        });
        assert.strictEqual(document.activeElement, edge);
    });

    it("About Degree opens on Enter, not when Tab reaches it", async () => {
        await openRings();
        const direction = await inspector().findByRole("button", { name: "About Direction" });
        direction.focus();
        await userEvent.keyboard("{Tab}");
        const degree = inspector().getByRole("button", { name: "About Degree" });
        assert.strictEqual(document.activeElement, degree);
        assert.notEqual(degree.getAttribute("aria-expanded"), "true");
        assert.isNull(document.querySelector(".cm-info-bubble"));
        await userEvent.keyboard("{Enter}");
        await waitFor(() => {
            assert.strictEqual(degree.getAttribute("aria-expanded"), "true");
        });
        // The bubble stays across the inspector.
        const bubble = document.querySelector(".cm-info-bubble")?.closest<HTMLElement>("[role='dialog']");
        const panel = screen.getByRole("complementary", { name: "Inspector" }).getBoundingClientRect();
        const box = bubble?.getBoundingClientRect();
        assert.isDefined(box);
        assert.isAtLeast(box?.left ?? -1, panel.left);
        assert.isAtMost(box?.right ?? Infinity, panel.right);
    });

    it("Tab out of the Vary by list closes it, hands focus back to its button, and the next Tab moves on", async () => {
        await openRings();
        await userEvent.click(await treeRow("Everything"));
        await userEvent.click(await inspector().findByRole("tab", { name: "Style" }));
        await userEvent.click(await inspector().findByRole("tab", { name: /^Node/ }));
        const vary = await inspector().findByRole("button", { name: "Node size by attribute" });
        await userEvent.click(vary);
        const find = await screen.findByRole("combobox", { name: /^Find an? / });
        await waitFor(() => {
            assert.strictEqual(document.activeElement, find);
        });
        await userEvent.keyboard("{Tab}");
        await waitFor(() => {
            assert.isNull(screen.queryByRole("combobox", { name: /^Find an? / }));
        });
        // The list closes as a select's does, focus back on what opened it.
        assert.strictEqual(document.activeElement, vary);
        await userEvent.keyboard("{Tab}");
        assert.strictEqual(
            document.activeElement,
            inspector().getByRole("button", { name: "Remove node size" }),
            document.activeElement?.getAttribute("aria-label") ?? document.activeElement?.textContent ?? "",
        );
    });

    it("a section's + with nothing left to add is no Tab stop and says why", async () => {
        await openRings();
        await userEvent.click(await treeRow("Everything"));
        await userEvent.click(await inspector().findByRole("tab", { name: "Style" }));
        await userEvent.click(await inspector().findByRole("tab", { name: /^Node/ }));
        const add = await inspector().findByRole("button", { name: "Add to node shape" });
        assert.strictEqual(add.getAttribute("aria-disabled"), "true");
        assert.strictEqual(add.tabIndex, -1, "a + that adds nothing is a dead stop");
        assert.strictEqual(add.getAttribute("aria-description"), "Everything in node shape is set");
    });

    it("disabled Undo and Redo stay Tab stops; the canvas toolbar is entered at Analyze", async () => {
        const { session } = await openRings();
        const header = within(screen.getByRole("banner", { name: "Project" }));
        assert.strictEqual(header.getByRole("button", { name: /^Undo( |$)/ }).tabIndex, 0);
        act(() => {
            session.history.clear();
        });
        await waitFor(() => {
            assert.strictEqual(header.getByRole("button", { name: "Undo" }).getAttribute("aria-disabled"), "true");
        });
        assert.strictEqual(header.getByRole("button", { name: "Undo" }).tabIndex, 0);
        assert.strictEqual(header.getByRole("button", { name: "Redo" }).tabIndex, 0);
        const bar = screen.getByRole("toolbar", { name: "Canvas tools" });
        const entry = within(bar)
            .getAllByRole("button")
            .filter((button) => button.tabIndex === 0);
        assert.lengthOf(entry, 1);
        assert.strictEqual(entry[0].getAttribute("aria-label") ?? entry[0].textContent, "Analyze");
    });

    it("a right-click on empty canvas keeps the open layer in the inspector", async () => {
        await openRings();
        await userEvent.click(await treeRow("Everything"));
        await inspector().findByRole("heading", { name: /Everything/ });
        const host = document.querySelector("graphty-element");
        assert.exists(host);
        await userEvent.click(host, { button: "right", position: { x: 6, y: 6 } });
        await userEvent.keyboard("{Escape}");
        assert.exists(inspector().queryByRole("heading", { name: /Everything/ }), "the inspector left the layer");
    });

    it("Escape clears a selection and leaves the open layer in the inspector", async () => {
        const { session } = await openRings();
        await session.selection.apply({ nodes: ["n1", "n2"] });
        const row = await treeRow("Everything");
        await userEvent.click(row);
        await inspector().findByRole("heading", { name: /Everything/ });
        await userEvent.keyboard("{Escape}");
        await waitFor(() => {
            assert.strictEqual(session.selection.size, 0);
        });
        assert.exists(inspector().queryByRole("heading", { name: /Everything/ }), "Escape also closed the layer");
    });

    it("Escape leaves the layer-checking mode before it clears a selection", async () => {
        const { session } = await openRings();
        await session.selection.apply({ nodes: ["n1"] });
        await userEvent.click(screen.getByRole("button", { name: "Add a layer or a folder" }));
        await userEvent.click(await screen.findByRole("menuitem", { name: "Select layers..." }));
        await screen.findByText("Check the layers to select them");
        screen.getByRole("button", { name: "Main menu" }).focus();
        await userEvent.keyboard("{Escape}");
        await waitFor(() => {
            assert.isNull(screen.queryByText("Check the layers to select them"));
        });
        assert.strictEqual(session.selection.size, 1, "the same Escape cleared the selection");
    });

    it("after Escape clears a selection, the focus ring is on the selected tab", async () => {
        const { session } = await openRings();
        await session.selection.apply({ nodes: ["n1"] });
        await userEvent.click(await inspector().findByRole("tab", { name: "Style" }));
        await userEvent.keyboard("{Escape}");
        await waitFor(() => {
            assert.strictEqual(session.selection.size, 0);
            const active = document.activeElement;
            assert.strictEqual(active?.getAttribute("role"), "tab", "focus left the tabs");
            assert.strictEqual(active?.getAttribute("aria-selected"), "true", "the ring is on an unselected tab");
        });
    });
});
