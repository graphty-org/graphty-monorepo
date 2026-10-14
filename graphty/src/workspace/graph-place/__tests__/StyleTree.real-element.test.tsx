/**
 * The style tree on the REAL graphty-element, driven by real input: "+" adds a folder in rename
 * and a draft layer; rows drag into a folder and never into a pinned band; Alt+ArrowUp moves the
 * focused row; Shift-click selects two rows; the lock disables the Style tab; the eye stops a row
 * painting. Every assertion reads the element's own tree, `styles.explain` or the page.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession } from "@graphty/graphty-element/session";
import { assert, beforeAll, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import { render, screen, waitFor, within } from "../../../test/test-utils";
import { createWorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";
import { findTreeRow } from "../rows";

/** A hang guard for the element coming up, not a pass/fail timing. */
const TIMEOUT_MS = 90_000;

/**
 * A new project with a small graph, the starting rows on, and two layers of the reader's own:
 * Key people (nodes 1 and 2 in red) under Degree (every node's size).
 * @returns the session and the ids of the two layers.
 */
async function openTree(): Promise<{ session: GraphSession; key: string; degree: string }> {
    const store = createWorkspaceStore({ project: { name: "Untitled", id: 1 } });
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
    await session.data.addNodes([1, 2, 3, 4].map((id) => ({ id, name: `N${String(id)}` })));
    await session.data.addEdges([
        { source: 1, target: 2 },
        { source: 2, target: 3 },
        { source: 3, target: 4 },
    ]);
    await session.config.set({ startingRows: true, editableBase: true });
    const key = await session.styles.add({
        name: "Key people",
        target: "node",
        selector: { match: "ids", nodes: [1, 2] },
        set: { "node.color": "#ff0000" },
    });
    const degree = await session.styles.add({
        name: "Degree",
        target: "node",
        selector: { match: "everything" },
        set: { "node.size": 2 },
    });
    await session.styles.settled();
    // Degree was added last, so it paints above Key people.
    await row("Degree");
    return { session, key: key.id, degree: degree.id };
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
    return within(tree()).findByRole("treeitem", { name: new RegExp(`^${name}, `) }, { timeout: TIMEOUT_MS });
}

/**
 * The element's consumer layers, bottom first: the paint order.
 * @param session - the session.
 * @returns their names.
 */
function paintOrder(session: GraphSession): string[] {
    return session.styles
        .list()
        .filter((layer) => !layer.locked)
        .map((layer) => layer.name);
}

describe("the style tree on the real element", () => {
    beforeAll(async () => {
        await page.viewport(1366, 768);
    });

    it("names each row's kind, adds a folder in rename, and a drag moves Key people into it", async () => {
        const { session, key } = await openTree();
        for (const item of within(tree()).getAllByRole("treeitem")) {
            assert.match(item.getAttribute("aria-label") ?? "", /, (layer|folder), /);
        }

        await userEvent.click(screen.getByRole("button", { name: "Add a layer or a folder" }));
        await userEvent.click(await screen.findByRole("menuitem", { name: "Add folder" }));
        const field = await screen.findByRole("textbox", { name: "Row name" });
        await waitFor(() => {
            assert.equal(document.activeElement, field, "the new folder's name is ready to type");
        });
        await userEvent.keyboard("{Control>}a{/Control}Annotations{Enter}");
        const folder = await row("Annotations");
        assert.match(folder.getAttribute("aria-label") ?? "", /^Annotations, folder, 0 layers/);

        await userEvent.dragAndDrop(await row("Key people"), folder);
        await waitFor(() => {
            assert.equal(findTreeRow(session.styles.tree(), key)?.folders.at(-1)?.name, "Annotations");
        });
        assert.match((await row("Annotations")).getAttribute("aria-label") ?? "", /, folder, 1 layer$/);
    });

    it("refuses a drop into a pinned band, and Alt+ArrowUp moves the focused row up one", async () => {
        const { session } = await openTree();
        const before = paintOrder(session);
        assert.sameMembers(before.slice(-2), ["Selected", "Hovered"], "the starting rows pinned to the top");

        await userEvent.dragAndDrop(await row("Key people"), await row("Hovered"));
        await session.styles.settled();
        assert.deepEqual(paintOrder(session), before, "nothing moved");

        // Key people sits below Degree; Alt+ArrowUp on it puts it above.
        await userEvent.click(await row("Key people"));
        await userEvent.keyboard("{Alt>}{ArrowUp}{/Alt}");
        await waitFor(() => {
            const order = paintOrder(session);
            assert.isAbove(order.indexOf("Key people"), order.indexOf("Degree"));
        });
        // Once more would take it into the band pinned to the top: refused.
        const now = paintOrder(session);
        await userEvent.keyboard("{Alt>}{ArrowUp}{/Alt}");
        await session.styles.settled();
        assert.deepEqual(paintOrder(session), now);
    });

    it("selects two rows with Shift-click, and the right panel heads them '2 layers'", async () => {
        await openTree();
        await userEvent.click(await row("Degree"));
        await userEvent.keyboard("{Shift>}");
        await userEvent.click(await row("Key people"));
        await userEvent.keyboard("{/Shift}");
        const heading = await screen.findByRole("heading", { level: 2, name: "2 layers" });
        assert.isNotNull(heading);
        const selected = within(tree())
            .getAllByRole("treeitem")
            .filter((item) => item.getAttribute("aria-selected") === "true");
        assert.equal(selected.length, 2);
    });

    it("marks the Style tab's controls disabled on the lock click, and the eye stops the row painting", async () => {
        const { session, key } = await openTree();
        const keyRow = await row("Key people");
        await userEvent.click(keyRow);
        const tab = await screen.findByTestId("style-tab");
        const controls = (): HTMLElement[] => [...tab.querySelectorAll<HTMLElement>("input, button")];
        assert.isTrue(
            controls().some((control) => control.getAttribute("aria-disabled") !== "true"),
            "the open row starts editable",
        );

        await userEvent.hover(keyRow);
        await userEvent.click(within(keyRow).getByRole("button", { name: "Lock Key people" }));
        await waitFor(() => {
            assert.isTrue(findTreeRow(session.styles.tree(), key)?.row.locked);
            const now = screen.getByTestId("style-tab");
            // Still focusable: each says it does nothing, rather than leaving the Tab order.
            assert.isTrue(
                [...now.querySelectorAll("input, button")].every(
                    (control) => control.getAttribute("aria-disabled") === "true",
                ),
            );
        });
        assert.isNotNull(screen.getByText("This layer is locked"));

        const colorOf = (): string | undefined =>
            session.styles.explain({ node: 1 }).channels.find((c) => c.channel === "node.color")?.layerId;
        assert.equal(colorOf(), key, "Key people paints node 1's color");
        await userEvent.hover(keyRow);
        await userEvent.click(within(keyRow).getByRole("button", { name: "Hide Key people" }));
        await waitFor(() => {
            assert.notEqual(colorOf(), key, "the hidden row paints nothing");
        });
    });

    it("leaves the toggles out of Tab, and reaches Hide and Lock by row keys and the row menu", async () => {
        const { session, key } = await openTree();
        const keyRow = await row("Key people");
        assert.equal(within(keyRow).getByRole("button", { name: "Hide Key people" }).tabIndex, -1);
        assert.equal(within(keyRow).getByRole("button", { name: "Lock Key people" }).tabIndex, -1);

        await userEvent.click(keyRow);
        await userEvent.keyboard("{Shift>}{Control>}h{/Control}{/Shift}");
        await waitFor(() => {
            assert.isTrue(findTreeRow(session.styles.tree(), key)?.row.hidden);
        });

        await userEvent.click(await row("Key people"), { button: "right" });
        const lock = await screen.findByRole("menuitem", { name: /^Lock\b/ });
        assert.equal(lock.getAttribute("aria-keyshortcuts"), "Shift+Control+L");
        assert.equal((await screen.findByRole("menuitem", { name: "Rename" })).getAttribute("aria-keyshortcuts"), "F2");
        await userEvent.click(lock);
        await waitFor(() => {
            assert.isTrue(findTreeRow(session.styles.tree(), key)?.row.locked);
        });
    });

    it("adds a draft from Add layer with focus on the kind choice, and abandoning it leaves nothing", async () => {
        const { session } = await openTree();
        const before = JSON.stringify(session.styles.tree());

        await userEvent.click(screen.getByRole("button", { name: "Add a layer or a folder" }));
        await userEvent.click(await screen.findByRole("menuitem", { name: "Add layer" }));
        const draft = await within(tree()).findByRole("treeitem", { name: /^New layer, layer/ });
        assert.equal(draft.getAttribute("aria-selected"), "true");
        await waitFor(() => {
            const focused = document.activeElement as HTMLInputElement | null;
            assert.equal(focused?.type, "radio", "focus is on the kind choice");
            assert.equal(focused?.closest("[aria-label='Which elements']") !== null, true);
        });

        await userEvent.keyboard("{Escape}");
        await waitFor(() => {
            assert.isNull(within(tree()).queryByRole("treeitem", { name: /^New layer, / }));
        });
        assert.equal(JSON.stringify(session.styles.tree()), before, "the element's tree is as it was");
    });
});
