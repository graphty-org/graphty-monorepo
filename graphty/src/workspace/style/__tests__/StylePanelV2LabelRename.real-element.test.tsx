/**
 * Renaming a further label in Style panel v2, on the REAL graphty-element and real input: a double-click on its
 * name, F2 on its row, or its row menu (Shift+F10, a touch hold) opens a name field in its place; Enter commits,
 * Escape cancels, an empty name or another label's is refused with the old name kept; the name is the entry's
 * `name` in graphty-element, one undo step, and saved and opened with the project. The Text "+" lists the labels
 * already drawn first, each with a pencil and named "Edit ...", a divider, then what adds a new label; picking one
 * opens its pop-over.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { LabelEntry } from "@graphty/graphty-element/catalog";
import type { GraphSession } from "@graphty/graphty-element/session";
import { assert, describe, it } from "vitest";
import { userEvent } from "vitest/browser";

import { withFeatures } from "../../../test/features";
import { touchHold } from "../../../test/real-pointer";
import { screen, waitFor, within } from "../../../test/test-utils";
import { openProject, openStyle, sectionOf, written } from "./v2Harness";

/**
 * Two further labels on Key people: a Card ("Card 2") and a plain one ("Label 3").
 * @param session - the session.
 * @param id - Key people's id.
 */
async function twoLabels(session: GraphSession, id: string): Promise<void> {
    await session.styles.update(id, {
        set: {
            "node.color": "#E8590C",
            "node.labels": [
                { id: "l2", text: "two", style: { look: "card" } },
                { id: "l3", text: "three", style: { look: "default" } },
            ],
        },
    });
    await session.styles.settled();
}

/**
 * One further label as Key people writes it.
 * @param session - the session.
 * @param layer - the layer.
 * @param id - the label.
 * @returns the entry.
 */
function entry(session: GraphSession, layer: string, id: string): LabelEntry | undefined {
    const value = written(session, layer, "node.labels");
    return Array.isArray(value) ? (value as readonly LabelEntry[]).find((each) => each.id === id) : undefined;
}

/**
 * A further label's row, once drawn.
 * @param tab - the Style tab.
 * @param id - its id.
 * @returns the row.
 */
async function rowOf(tab: HTMLElement, id: string): Promise<HTMLElement> {
    return waitFor(() => {
        const found = sectionOf(tab, "node-text").querySelector<HTMLElement>(`[data-label-entry="${id}"]`);
        assert.isNotNull(found);
        return found;
    });
}

/**
 * The name a row shows above its source.
 * @param row - the row.
 * @returns the name.
 */
function shownName(row: HTMLElement): string | null | undefined {
    return row.querySelector('[data-testid="control-group-label"]')?.textContent;
}

/**
 * Waits for a row to show a name.
 * @param tab - the Style tab.
 * @param id - its id.
 * @param name - the name.
 */
async function showsName(tab: HTMLElement, id: string, name: string): Promise<void> {
    await waitFor(async () => {
        assert.equal(shownName(await rowOf(tab, id)), name);
    });
}

/**
 * Opens the Text "+" menu.
 * @param tab - the Style tab.
 * @returns its items and dividers, and their names ("-" for a divider).
 */
async function openTextPlus(tab: HTMLElement): Promise<{ rows: HTMLElement[]; names: (string | null)[] }> {
    await userEvent.click(within(sectionOf(tab, "node-text")).getByRole("button", { name: /^Add to node text/ }));
    const menu = await screen.findByRole("menu");
    const rows = [...menu.querySelectorAll<HTMLElement>('[role="menuitem"], .mantine-Menu-divider')];
    const names = rows.map((each) =>
        each.getAttribute("role") === "menuitem" ? (each.getAttribute("aria-label") ?? each.textContent) : "-",
    );
    return { rows, names };
}

describe("renaming a further label", () => {
    withFeatures(["file-styles", "style-panel-v2"]);

    it("by a double-click on its name: Enter writes it, one undo step, saved and opened again", async () => {
        const { session, id } = await openProject();
        await twoLabels(session, id);
        const tab = await openStyle("Key people");
        await showsName(tab, "l2", "Card 2");
        const name = (await rowOf(tab, "l2")).querySelector<HTMLElement>('[data-testid="control-group-label"]');
        assert.isNotNull(name);
        await userEvent.dblClick(name);
        const field = await screen.findByRole("textbox", { name: "Node card 2 name" });
        assert.equal((field as HTMLInputElement).value, "Card 2", "the field opens holding the name");
        await userEvent.keyboard("{Control>}a{/Control}Price{Enter}");
        await waitFor(() => {
            assert.equal(entry(session, id, "l2")?.name, "Price");
        });
        await showsName(tab, "l2", "Price");
        assert.isNull(screen.queryByRole("textbox", { name: "Node card 2 name" }), "the field closes");
        // Its controls take its name.
        assert.isNotNull(within(await rowOf(tab, "l2")).queryByRole("button", { name: /^Node Price source/ }));
        assert.equal(entry(session, id, "l2")?.text, "two", "its words are kept");

        await userEvent.click(screen.getByRole("button", { name: /^Undo( |$)/ }));
        await screen.findByText("Undid renaming node label");
        await waitFor(() => {
            assert.isUndefined(entry(session, id, "l2")?.name);
        });
        await showsName(tab, "l2", "Card 2");
        await userEvent.click(screen.getByRole("button", { name: /^Redo( |$)/ }));
        await showsName(tab, "l2", "Price");

        const { text } = await session.project.save({ markSaved: false });
        await session.project.open(text, { discard: true });
        await session.styles.settled();
        const reopened = session.styles.list().find((layer) => layer.name === "Key people");
        assert.isDefined(reopened);
        assert.equal(entry(session, reopened.id, "l2")?.name, "Price", "the name is saved and opened");
    });

    it("by F2 on its row: Escape cancels, and an empty name or another label's is refused", async () => {
        const { session, id } = await openProject();
        await twoLabels(session, id);
        const tab = await openStyle("Key people");
        const row = await rowOf(tab, "l3");
        const source = within(row).getByRole("button", { name: /^Node label 3 source/ });
        source.focus();

        const rename = async (keys: string): Promise<void> => {
            await userEvent.keyboard("{F2}");
            const field = await screen.findByRole("textbox", { name: "Node label 3 name" });
            assert.equal(document.activeElement, field, "the field takes focus");
            await userEvent.keyboard(keys);
            await waitFor(() => {
                assert.isNull(screen.queryByRole("textbox", { name: "Node label 3 name" }));
            });
            assert.equal(document.activeElement, source, "focus goes back to the row's source, for the next F2");
        };
        await rename("{Control>}a{/Control}Other{Escape}");
        await rename("{Control>}a{/Control}{Backspace}{Enter}");
        await rename("{Control>}a{/Control}card 2{Enter}");
        await rename("{Control>}a{/Control}   {Enter}");
        await session.styles.settled();
        assert.isUndefined(entry(session, id, "l3")?.name, "nothing is written");
        await showsName(tab, "l3", "Label 3");
        assert.isNull(sectionOf(tab, "node-text").querySelector("[role=alert]"), "and no warning is drawn");

        await rename("{Control>}a{/Control}  Size  {Enter}");
        await waitFor(() => {
            assert.equal(entry(session, id, "l3")?.name, "Size", "the name is trimmed");
        });
        await showsName(tab, "l3", "Size");
    });

    it("by its row menu, from Shift+F10 and from a touch hold", async () => {
        const { session, id } = await openProject();
        await twoLabels(session, id);
        const tab = await openStyle("Key people");
        within(await rowOf(tab, "l2"))
            .getByRole("button", { name: /^Node card 2 source/ })
            .focus();
        await userEvent.keyboard("{Shift>}{F10}{/Shift}");
        await userEvent.click(await screen.findByRole("menuitem", { name: /^Rename/ }));
        await screen.findByRole("textbox", { name: "Node card 2 name" });
        await userEvent.keyboard("{Control>}a{/Control}Keys{Enter}");
        await waitFor(() => {
            assert.equal(entry(session, id, "l2")?.name, "Keys");
        });

        const name = (await rowOf(tab, "l3")).querySelector('[data-testid="control-group-label"]');
        assert.isNotNull(name);
        await touchHold(name, () => screen.findByRole("menuitem", { name: /^Rename/ }));
        await userEvent.click(screen.getByRole("menuitem", { name: /^Rename/ }));
        await screen.findByRole("textbox", { name: "Node label 3 name" });
        await userEvent.keyboard("{Control>}a{/Control}Touch{Enter}");
        await waitFor(() => {
            assert.equal(entry(session, id, "l3")?.name, "Touch");
        });
    });
});

describe("renaming the main label", () => {
    withFeatures(["file-styles", "style-panel-v2"]);

    it("by a double-click: its name is the entry with its id, its words and look kept, listed first in +", async () => {
        const { session, id } = await openProject();
        await session.styles.update(id, {
            set: {
                "node.color": "#E8590C",
                "node.label": "Hello",
                "node.labelStyle": { look: "card" },
                "node.labels": [{ id: "l2", text: "two", style: { look: "default" } }],
            },
        });
        await session.styles.settled();
        const tab = await openStyle("Key people");
        const main = await waitFor(() => {
            const found = sectionOf(tab, "node-text").querySelector<HTMLElement>(
                '[data-thing="label"]:not([data-label-entry]) [data-testid="control-group-label"]',
            );
            assert.equal(found?.textContent, "Card");
            return found;
        });
        assert.isNotNull(main);
        await userEvent.dblClick(main);
        await screen.findByRole("textbox", { name: "Node card name" });
        // Another label's name is refused, case aside; its own in another case is a rename.
        await userEvent.keyboard("{Control>}a{/Control}label 2{Enter}");
        await session.styles.settled();
        assert.isUndefined(entry(session, id, "label"), "nothing is written");
        await userEvent.dblClick(main);
        await screen.findByRole("textbox", { name: "Node card name" });
        await userEvent.keyboard("{Control>}a{/Control}Title{Enter}");
        await waitFor(() => {
            assert.equal(entry(session, id, "label")?.name, "Title");
        });
        assert.equal(written(session, id, "node.label"), "Hello", "its words are kept");
        assert.deepEqual(written(session, id, "node.labelStyle"), { look: "card" }, "its look is kept");
        assert.equal(entry(session, id, "l2")?.text, "two", "the further label is kept");
        const renamed = sectionOf(tab, "node-text").querySelector<HTMLElement>(
            '[data-thing="label"]:not([data-label-entry]) [data-testid="control-group-label"]',
        );
        assert.equal(renamed?.textContent, "Title");
        assert.isNotNull(renamed);
        await userEvent.dblClick(renamed);
        await screen.findByRole("textbox", { name: "Node Title name" });
        await userEvent.keyboard("{Control>}a{/Control}TITLE{Enter}");
        await waitFor(() => {
            assert.equal(entry(session, id, "label")?.name, "TITLE", "a change of case alone is a rename");
        });

        const { rows, names } = await openTextPlus(tab);
        assert.deepEqual(names.slice(0, 3), ["Edit TITLE", "Edit Label 2", "-"], "the main label is listed first");
        assert.isNotNull(rows[0]?.querySelector("svg.lucide-pencil"), "with a pencil");
        await userEvent.click(screen.getByRole("menuitem", { name: "Edit TITLE" }));
        await waitFor(() => {
            assert.isNotNull(document.querySelector("[data-thing-popover]"), "its pop-over opens");
        });
        assert.equal(entryList(session, id).length, 2, "picking it adds no label");
    });
});

/**
 * The label list Key people writes.
 * @param session - the session.
 * @param layer - the layer.
 * @returns its entries.
 */
function entryList(session: GraphSession, layer: string): readonly LabelEntry[] {
    const value = written(session, layer, "node.labels");
    return Array.isArray(value) ? (value as readonly LabelEntry[]) : [];
}

describe('the Text "+" menu', () => {
    withFeatures(["file-styles", "style-panel-v2"]);

    it("lists the labels already drawn first, each with a pencil, a divider, then new labels", async () => {
        const { session, id } = await openProject();
        await twoLabels(session, id);
        await session.styles.update(id, {
            set: {
                "node.color": "#E8590C",
                "node.labels": [
                    { id: "l2", name: "Price", text: "two", style: { look: "card" } },
                    { id: "l3", text: "three", style: { look: "default" } },
                ],
            },
        });
        const hubs = await session.styles.add({
            name: "Hubs",
            target: "node",
            selector: { match: "ids", nodes: ["a"] },
            set: { "node.color": "#00ff00" },
        });
        await session.styles.settled();
        const tab = await openStyle("Hubs");
        const { rows, names } = await openTextPlus(tab);
        assert.deepEqual(names.slice(0, 4), ["Edit Price", "Edit Label 3", "-", "Label"], "existing first, apart");
        for (const each of rows.slice(0, 2)) {
            assert.isNotNull(each.querySelector("svg.lucide-pencil"), `${each.textContent ?? ""} has a pencil`);
        }
        assert.isNull(rows[3]?.querySelector("svg"), "a new label has none");

        await userEvent.click(screen.getByRole("menuitem", { name: "Edit Price" }));
        await rowOf(tab, "l2");
        await waitFor(() => {
            assert.isNotNull(document.querySelector("[data-thing-popover]"), "its pop-over opens");
        });
        assert.isUndefined(written(session, hubs.id, "node.labels"), "picking it writes nothing yet");
    });
});
