/**
 * The style tree's starting rows, row marks, row menu and Graph settings door on the REAL
 * graphty-element, driven by real input: a sample opens with Everything, Selected and Hovered and
 * runs land on top; a painted-over row carries a whole mark naming the layer above; Space selects
 * and never hides; Duplicate, Move to folder and Select what it paints work from the row menu;
 * Graph settings opens on its Style tab with focus inside it. Every assertion reads the element's
 * own tree, selection and counts, or the page.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession } from "@graphty/graphty-element/session";
import { assert, beforeAll, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import { render, screen, waitFor, within } from "../../../test/test-utils";
import { createWorkspaceStore, type WorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";
import { findTreeRow } from "../rows";

/** A hang guard for the element coming up and a run finishing, not a pass/fail timing. */
const TIMEOUT_MS = 90_000;

/**
 * Waits for the open project's element and its session.
 * @returns the session.
 */
async function elementSession(): Promise<GraphSession> {
    return waitFor<GraphSession>(
        () => {
            const found = document.querySelector("graphty-element")?.session;
            if (found === undefined) {
                throw new Error("the element is not up yet");
            }
            return found;
        },
        { timeout: TIMEOUT_MS },
    );
}

/**
 * The tree.
 * @returns the tree element.
 */
function tree(): HTMLElement {
    return screen.getByRole("tree", { name: "Style layers" });
}

/**
 * A tree row by its name, waiting for it to draw.
 * @param name - the row's visible name.
 * @returns the row.
 */
async function row(name: string): Promise<HTMLElement> {
    return within(await screen.findByRole("tree", { name: "Style layers" }, { timeout: TIMEOUT_MS })).findByRole(
        "treeitem",
        { name: new RegExp(`^${name}, `) },
        { timeout: TIMEOUT_MS },
    );
}

/**
 * A new project holding a small graph, with two layers of the reader's own: Key people (nodes 1
 * and 2 in red) under Cover (every node blue), so Cover paints over Key people.
 * @returns the store, the session and the layers' ids.
 */
async function openScene(): Promise<{ store: WorkspaceStore; session: GraphSession; key: string; cover: string }> {
    const store = createWorkspaceStore({ project: { name: "Untitled", id: 1 } });
    render(<Workspace store={store} />);
    const session = await elementSession();
    await session.data.addNodes([1, 2, 3, 4].map((id) => ({ id, name: `N${String(id)}` })));
    await session.data.addEdges([
        { source: 1, target: 2 },
        { source: 2, target: 3 },
        { source: 3, target: 4 },
    ]);
    const key = await session.styles.add({
        name: "Key people",
        target: "node",
        selector: { match: "ids", nodes: [1, 2] },
        set: { "node.color": "#ff0000" },
    });
    const cover = await session.styles.add({
        name: "Cover",
        target: "node",
        selector: { match: "everything" },
        set: { "node.color": "#0000ff" },
    });
    await session.styles.settled();
    await row("Cover");
    return { store, session, key: key.id, cover: cover.id };
}

/**
 * Opens a row's menu from the keyboard, as Shift+F10 does on the focused row.
 * @param name - the row's name.
 * @returns the menu.
 */
async function rowMenu(name: string): Promise<HTMLElement> {
    await userEvent.click(await row(name));
    await userEvent.keyboard("{Shift>}{F10}{/Shift}");
    return screen.findByRole("menu");
}

describe("the style tree's rows, menu and Graph settings door on the real element", () => {
    beforeAll(async () => {
        await page.viewport(1366, 768);
    });

    it("opens Les Miserables with Everything, Selected and Hovered, and each run lands on top", async () => {
        render(<Workspace store={createWorkspaceStore()} />);
        await userEvent.click(screen.getByRole("button", { name: "Open the Les Miserables sample" }));
        const session = await elementSession();
        await waitFor(
            () => {
                assert.equal(session.data.statistics().nodeCount, 77);
            },
            { timeout: TIMEOUT_MS },
        );
        for (const name of ["Everything", "Selected", "Hovered"]) {
            assert.isNotNull(await row(name));
        }
        assert.isTrue(session.config.startingRows);
        assert.equal(session.config.runPlacement, "top");

        const idOf = (name: string): string => String(session.data.nodes().find((n) => n.name === name)?.id);
        await session.runs.start("degree");
        await session.runs.start("edge-betweenness");
        const route = await session.runs.start("shortest-path", { source: idOf("Valjean"), target: idOf("Javert") });
        await session.styles.settled();
        const top = session.styles
            .tree()
            .filter((each) => each.pin === "none")
            .at(-1);
        const routeLayers = new Set(session.runs.bindings(route.runId));
        assert.isTrue(top !== undefined && routeLayers.has(top.id), "the route's row is the top unpinned row");
    });

    it("marks a painted-over row with a whole glyph whose tooltip names the layer above", async () => {
        await openScene();
        const keyRow = await row("Key people");
        const mark = await within(keyRow).findByRole("img", { name: "Painted over by Cover" });
        await userEvent.hover(mark);
        const tip = await screen.findByRole("tooltip", {}, { timeout: TIMEOUT_MS });
        assert.equal(tip.textContent, "Painted over by Cover");
        assert.isNull(within(await row("Cover")).queryByRole("img", { name: /Painted over/ }));
    });

    it("selects a row on Space and never hides it", async () => {
        const { store, session, key } = await openScene();
        const keyRow = await row("Key people");
        await userEvent.click(await row("Cover"));
        keyRow.focus();
        await userEvent.keyboard(" ");
        await waitFor(() => {
            assert.deepEqual(store.get().inspected, { kind: "layer-row", id: key });
        });
        assert.isFalse(findTreeRow(session.styles.tree(), key)?.row.hidden);
    });

    it("duplicates a row just above itself, moves it into a folder, and selects what it paints", async () => {
        const { session, key } = await openScene();

        // Duplicate: a copy just above the original, painting the same nodes.
        const menu = await rowMenu("Key people");
        await userEvent.click(within(menu).getByRole("menuitem", { name: /^Duplicate/ }));
        await row("Key people copy");
        const tops = session.styles.tree().filter((each) => each.pin === "none");
        const at = tops.findIndex((each) => each.id === key);
        assert.equal(tops[at + 1]?.name, "Key people copy");
        const copy = tops[at + 1];
        assert.equal(session.styles.counts(copy.id).matched, 2);

        // Move to folder: into a folder made for it.
        const folder = await session.styles.addFolder("Annotations");
        await row("Annotations");
        await userEvent.click(
            within(await rowMenu("Key people copy")).getByRole("menuitem", { name: "Move to folder" }),
        );
        await userEvent.click(await screen.findByRole("menuitem", { name: "Annotations" }));
        await waitFor(() => {
            assert.equal(findTreeRow(session.styles.tree(), copy.id)?.folders.at(-1)?.id, folder.id);
        });

        // Select what it paints: exactly the row's two nodes.
        await userEvent.click(
            within(await rowMenu("Key people")).getByRole("menuitem", { name: "Select what it paints" }),
        );
        await waitFor(() => {
            assert.sameMembers([...session.selection.nodes].map(String), ["1", "2"]);
        });
        assert.equal(session.selection.edges.length, 0);
    });

    it("ends naming a new folder with focus on its row", async () => {
        await openScene();
        await userEvent.click(screen.getByRole("button", { name: "Add a layer or a folder" }));
        await userEvent.click(await screen.findByRole("menuitem", { name: "Add folder" }));
        const field = await screen.findByRole("textbox", { name: "Row name" });
        await waitFor(() => {
            assert.equal(document.activeElement, field);
        });
        await userEvent.keyboard("{Control>}a{/Control}Annotations{Enter}");
        const folder = await row("Annotations");
        await waitFor(() => {
            assert.equal(document.activeElement, folder, "focus is on the folder's row");
        });
    });

    it("selects what a row paints from the panel header", async () => {
        const { session } = await openScene();
        await userEvent.click(await row("Key people"));
        const inspector = await screen.findByRole("complementary", { name: "Inspector" });
        await userEvent.click(await within(inspector).findByRole("button", { name: "Select what it paints" }));
        await waitFor(() => {
            assert.sameMembers([...session.selection.nodes].map(String), ["1", "2"]);
        });
    });

    it("opens Graph settings on its Style tab with focus inside it, and says so", async () => {
        const { store } = await openScene();
        tree();
        await userEvent.click(screen.getByRole("button", { name: "Graph settings" }));
        const inspector = await screen.findByRole("complementary", { name: "Inspector" });
        const style = await within(inspector).findByRole("tab", { name: "Style" });
        assert.equal(style.getAttribute("aria-selected"), "true");
        const panel = within(inspector).getByRole("tabpanel");
        await waitFor(() => {
            assert.isTrue(panel.contains(document.activeElement), "focus is in the Style tab");
        });
        assert.equal(store.get().announcement, "Graph settings, Style");
    });
});
