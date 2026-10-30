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

import { openSampleFromStart } from "../../../test/open";
import { render, screen, waitFor, within } from "../../../test/test-utils";
import { createWorkspaceStore, type WorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";
import { findTreeRow } from "../rows";

/** Where the pictures for the owner's review go, relative to this file. */
const SHOTS = "../../../../../design/ui/studio/tier3/build/tree-key-settings";

/**
 * Waits for the open project's element and its session.
 * @returns the session.
 */
async function elementSession(): Promise<GraphSession> {
    return waitFor<GraphSession>(() => {
        const found = document.querySelector("graphty-element")?.session;
        if (found === undefined) {
            throw new Error("the element is not up yet");
        }
        return found;
    });
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
    return within(await screen.findByRole("tree", { name: "Style layers" })).findByRole("treeitem", {
        name: new RegExp(`^${name}, `),
    });
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
        const { session } = await openSampleFromStart("Les Miserables");
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
        const tip = await screen.findByRole("tooltip", {});
        assert.equal(tip.textContent, "Painted over by Cover");
        assert.isNull(within(await row("Cover")).queryByRole("img", { name: /Painted over/ }));
    });

    it("never marks a row that matches nothing as painted over", async () => {
        const { session } = await openScene();
        // Below Cover, which paints every node, but matching no node at all.
        const nobody = await session.styles.add({
            name: "Nobody",
            target: "node",
            selector: { match: "ids", nodes: [99] },
            set: { "node.color": "#00ff00" },
        });
        await session.styles.moveRow(nobody.row ?? nobody.id, { parent: null, index: 0 });
        await session.styles.settled();
        await within(await row("Key people")).findByRole("img", { name: "Painted over by Cover" });
        assert.isNull(within(await row("Nobody")).queryByRole("img", { name: /Painted over/ }));
    });

    it("groups the row menu, with an icon on every item, Hide and Lock by their keys, and no Unpin on an unpinned row", async () => {
        const { session, key } = await openScene();
        const menu = await rowMenu("Key people");
        const items = within(menu).getAllByRole("menuitem");
        const names = items.map((item) => item.textContent?.replace(/\s+/g, " ").trim() ?? "");
        for (const word of ["Hide", "Lock", "Move to folder"]) {
            assert.isTrue(
                names.some((name) => name.startsWith(word)),
                `the menu offers ${word}`,
            );
        }
        assert.isFalse(
            names.some((name) => name.startsWith("Unpin")),
            "nothing to unpin",
        );
        for (const item of items) {
            assert.isNotNull(item.querySelector("svg"), `${item.textContent ?? ""} has its icon`);
        }
        assert.isAtLeast(menu.querySelectorAll(".mantine-Menu-divider").length, 3, "dividers between the groups");
        const hide = within(menu).getByRole("menuitem", { name: /^Hide/ });
        assert.equal(hide.getAttribute("aria-keyshortcuts"), "Shift+Control+H");
        assert.equal(
            within(menu).getByRole("menuitem", { name: /^Lock/ }).getAttribute("aria-keyshortcuts"),
            "Shift+Control+L",
        );
        await userEvent.click(hide);
        await waitFor(() => {
            assert.isTrue(findTreeRow(session.styles.tree(), key)?.row.hidden);
        });
        // On a hidden row the same item says what it will do now.
        const again = await rowMenu("Key people");
        assert.isNotNull(within(again).queryByRole("menuitem", { name: /^Show/ }));
        await userEvent.keyboard("{Escape}");
    });

    it("moves a row into a folder from the inspector's Layer actions, and heads the panel with the tree's glyph", async () => {
        const { session, key } = await openScene();
        const folder = await session.styles.addFolder("Annotations");
        await row("Annotations");
        await userEvent.click(await row("Key people"));
        const inspector = await screen.findByRole("complementary", { name: "Inspector" });
        const treeGlyph = (await row("Key people")).querySelector(".ws-row-marks svg")?.getAttribute("class");
        const headGlyph = within(inspector).getByRole("heading", { level: 2 }).parentElement?.querySelector("svg");
        assert.equal(headGlyph?.getAttribute("class"), treeGlyph, "the header draws the row's own kind glyph");
        await userEvent.click(within(inspector).getByRole("button", { name: "Layer actions" }));
        await userEvent.click(await screen.findByRole("menuitem", { name: "Move to folder" }));
        await userEvent.click(await screen.findByRole("menuitem", { name: "Annotations" }));
        await waitFor(() => {
            assert.equal(findTreeRow(session.styles.tree(), key)?.folders.at(-1)?.id, folder.id);
        });
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

    it("lands a new layer directly above the selected row, on both kinds, in one undo step", async () => {
        const { store, session } = await openSampleFromStart("Les Miserables");
        const degree = await session.runs.start("degree");
        await session.runs.start("louvain");
        await session.styles.settled();
        const degreeRow = session.styles.parts(session.runs.bindings(degree.runId)[0] ?? "");
        assert.isDefined(degreeRow);
        const name = degreeRow?.name ?? "";
        assert.equal(name, "Connections");
        await userEvent.click(await row(name));

        await userEvent.click(screen.getByRole("button", { name: "Add a layer or a folder" }));
        await userEvent.click(await screen.findByRole("menuitem", { name: "Layer" }));
        await waitFor(() => {
            assert.equal(store.get().inspected?.kind, "layer-row");
            assert.notEqual(store.get().inspected?.id, degreeRow?.id);
        });
        const rows = session.styles.tree();
        const at = rows.findIndex((each) => each.id === degreeRow?.id);
        assert.equal(rows[at + 1]?.id, store.get().inspected?.id, "the new layer is directly above Connections");
        assert.equal(session.styles.parts(rows[at + 1]?.id ?? "")?.target, "both");
        await userEvent.keyboard("{Escape}");
        // One undo takes the whole new layer back.
        await session.undo();
        await waitFor(() => {
            assert.equal(session.styles.tree().length, rows.length - 1);
        });
    });

    it("draws the tree, its row menu, a folder's panel and Graph settings at two window sizes", async () => {
        const { session } = await openSampleFromStart("Les Miserables");
        const ids = session.data.nodes().map((node) => String(node.id));
        const folder = await session.styles.addFolder("Annotations");
        const key = await session.styles.add({
            name: "Key people",
            target: "node",
            selector: { match: "ids", nodes: ids.slice(0, 4) },
            set: { "node.color": "#E8590C" },
        });
        await session.styles.moveRow(key.row ?? key.id, { parent: folder.id, index: 0 });
        await session.runs.start("degree");
        await session.runs.start("edge-betweenness");
        await session.runs.start("shortest-path", { source: ids[0], target: ids[11] });
        await session.styles.settled();
        for (const [width, height] of [
            [1366, 768],
            [900, 700],
        ] as const) {
            await page.viewport(width, height);
            const size = `${String(width)}x${String(height)}`;
            const menu = await rowMenu("Connections");
            await within(menu).findByRole("menuitem", { name: /^Hide/ });
            await page.screenshot({ path: `${SHOTS}/tree-row-menu-${size}.png` });
            await userEvent.keyboard("{Escape}");

            await userEvent.click(await row("Annotations"));
            const inspector = await screen.findByRole("complementary", { name: "Inspector" });
            await within(inspector).findByText(/ in Annotations\b/);
            await page.screenshot({ path: `${SHOTS}/folder-panel-${size}.png` });

            await userEvent.click(screen.getByRole("button", { name: "Graph settings" }));
            const settings = await within(inspector).findByRole("tabpanel");
            // Flat titles, as the Style tab's: headings, not buttons that fold.
            // Background is a section of its own: Color, Image and Shader stack under its "+".
            for (const title of ["Canvas", "Background", "Labels"]) {
                within(settings).getByRole("heading", { name: title });
            }
            assert.isEmpty(settings.querySelectorAll('[data-collapsible="true"]'), "no section folds");
            const labels = [...settings.querySelectorAll(".cm-field-label, .cm-paint-label")].map((l) => l.textContent);
            for (const label of ["Lighting", "Outline width"]) {
                assert.include(labels, label, `${label} is drawn as a field label`);
            }
            await page.screenshot({ path: `${SHOTS}/graph-settings-${size}.png` });
        }
    });

    it("ends naming a new folder with focus on its row", async () => {
        await openScene();
        await userEvent.click(screen.getByRole("button", { name: "Add a layer or a folder" }));
        await userEvent.click(await screen.findByRole("menuitem", { name: "Folder" }));
        const field = await screen.findByRole("textbox", { name: "Folder name" });
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
