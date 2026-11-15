/**
 * Styles from files on the REAL graphty-element, with the element's `file-styles` experiment off
 * and on, driven by real input: the Settings switch, the Data page's checkbox, Export's Include
 * styles, the Shape picker's flat shapes and the Width property appear only with it on; a property
 * a layer already sets keeps its row with it off.
 */
// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession } from "@graphty/graphty-element/session";
import { act } from "react";
import { assert, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import { withFeatures } from "../../test/features";
import { render, screen, waitFor, within } from "../../test/test-utils";
import { openDataPage } from "../data-page/request";
import { createWorkspaceStore } from "../state/store";
import { Workspace } from "../Workspace";

const GEXF = `<?xml version="1.0" encoding="UTF-8"?>
<gexf xmlns="http://gexf.net/1.3" xmlns:viz="http://gexf.net/1.3/viz" version="1.3">
<graph defaultedgetype="undirected"><nodes>
<node id="a"><viz:color r="255" g="0" b="0"/></node><node id="b"><viz:color r="0" g="0" b="255"/></node>
</nodes><edges><edge source="a" target="b"/></edges></graph></gexf>`;

/**
 * Opens a project holding two nodes and a "Key" layer that sets their shape and anything else asked.
 * @param set - what the layer sets beside the shape.
 * @returns the session.
 */
async function openProject(set: Record<string, unknown> = {}): Promise<GraphSession> {
    await page.viewport(1440, 900);
    const store = createWorkspaceStore({ project: { name: "Untitled", id: 1 } });
    render(<Workspace store={store} />);
    const session = await waitFor(() => {
        const found = document.querySelector("graphty-element")?.session;
        assert.isDefined(found);
        return found;
    });
    if (session === undefined) {
        throw new Error("the element never came up");
    }
    await session.data.addNodes([{ id: "a" }, { id: "b" }]);
    await session.data.addEdges([{ source: "a", target: "b" }]);
    await session.styles.add({
        name: "Key",
        target: "node",
        selector: { match: "everything" },
        set: { "node.shape": "box", ...set },
    });
    await session.styles.settled();
    return session;
}

/**
 * Opens the Key layer's Style tab.
 * @returns the Style tab.
 */
async function openStyle(): Promise<HTMLElement> {
    const tree = await screen.findByRole("tree", { name: "Style layers" });
    await userEvent.click(await within(tree).findByRole("treeitem", { name: /^Key, / }));
    const inspector = screen.getByRole("complementary", { name: "Inspector" });
    const style = await within(inspector).findByRole("tab", { name: "Style" });
    if (style.getAttribute("aria-selected") !== "true") {
        await userEvent.click(style);
    }
    return screen.findByTestId("style-tab");
}

/**
 * The names the Shape field's list offers.
 * @param tab - the Style tab.
 * @returns the option names.
 */
async function shapeChoices(tab: HTMLElement): Promise<string[]> {
    // With the experiment on, the panel by part picks a shape from a searchable list.
    const combobox = within(tab).queryByRole("combobox", { name: /^Node shape/ });
    await userEvent.click(combobox ?? (await within(tab).findByRole("button", { name: /^Node shape, / })));
    const list = await screen.findByRole("listbox");
    const names = within(list)
        .getAllByRole("option")
        .map((option) =>
            combobox === null
                ? (option.textContent ?? "").replace(/\d+ nodes?$/, "")
                : (option.getAttribute("aria-label") ?? option.textContent),
        );
    await userEvent.keyboard("{Escape}");
    return names;
}

/**
 * What the shape section's "+" offers.
 * @param tab - the Style tab.
 * @returns the menu's item names.
 */
async function shapeAdds(tab: HTMLElement): Promise<string[]> {
    await userEvent.click(within(tab).getByRole("button", { name: "Add to node shape" }));
    const items = (await screen.findAllByRole("menuitem")).map((item) => item.textContent);
    await userEvent.keyboard("{Escape}");
    return items;
}

/**
 * Whether Settings offers the import-styles switch.
 * @returns true when it does.
 */
async function settingsSwitch(): Promise<boolean> {
    await userEvent.keyboard("{Control>},{/Control}");
    await screen.findByRole("dialog", { name: "Settings" });
    // The dialog's General page opens first; its Number format is always there.
    await screen.findByText("Number format");
    const found = screen.queryByRole("switch", { name: /^Import styles from files/ }) !== null;
    await userEvent.keyboard("{Escape}");
    return found;
}

/**
 * Whether the Data page, opened from the empty app as New from data... does, offers the
 * import-styles checkbox for a styled GEXF.
 * @returns true when it does.
 */
async function dataPageCheckbox(): Promise<boolean> {
    const store = createWorkspaceStore();
    render(<Workspace store={store} />);
    act(() => {
        openDataPage(store, { intent: "new" });
    });
    await screen.findByRole("heading", { name: "Open as a new graph" });
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(new File([GEXF], "two.gexf", { type: "application/xml" }));
    const region = screen.getByRole("region", { name: "Data page" });
    for (const type of ["dragover", "drop"]) {
        region.dispatchEvent(new DragEvent(type, { dataTransfer, bubbles: true, cancelable: true }));
    }
    await screen.findByTestId("model-strip", {});
    return screen.queryByRole("checkbox", { name: "Import styles from the file" }) !== null;
}

/**
 * Whether Export offers Include styles for GraphML.
 * @returns true when it does.
 */
async function includeStyles(): Promise<boolean> {
    await userEvent.keyboard("{Control>}e{/Control}");
    const dialog = await screen.findByRole("dialog", { name: "Export" });
    // With no table showing Export opens on Image.
    await userEvent.click(within(dialog).getByText("Data"));
    await userEvent.click(await within(dialog).findByRole("combobox", { name: "Format" }));
    await userEvent.click(await screen.findByRole("option", { name: "GraphML" }));
    await waitFor(() => {
        assert.notInclude(within(dialog).getByLabelText("Preview of the exported data").textContent, "Writing");
    });
    return within(dialog).queryByRole("checkbox", { name: "Include styles" }) !== null;
}

for (const on of [false, true]) {
    describe(`the doors to styles from files with the element's experiment ${on ? "on" : "off"}`, () => {
        withFeatures(on ? ["file-styles"] : []);

        it(`${on ? "offers" : "hides"} the Settings switch`, async () => {
            await openProject();
            assert.strictEqual(await settingsSwitch(), on);
        });

        it(`${on ? "offers" : "hides"} the Settings switch on the start screen, before any project`, async () => {
            render(<Workspace store={createWorkspaceStore()} />);
            await userEvent.click(screen.getByRole("button", { name: /settings/i }));
            await screen.findByText("Number format");
            assert.strictEqual(screen.queryByRole("switch", { name: /^Import styles from files/ }) !== null, on);
        });

        it(`${on ? "offers" : "hides"} Export's Include styles`, async () => {
            await openProject();
            assert.strictEqual(await includeStyles(), on);
        });

        it(`${on ? "offers" : "hides"} the Data page's checkbox`, async () => {
            assert.strictEqual(await dataPageCheckbox(), on);
        });
    });
}

describe("the Style tab with the element's experiment off", () => {
    withFeatures([]);

    it("offers no flat shape and no Width, and keeps the row of a Width the layer already sets", async () => {
        await openProject();
        const tab = await openStyle();
        const shapes = await shapeChoices(tab);
        assert.include(shapes, "Box");
        assert.notInclude(shapes, "Rectangle");
        assert.notInclude(await shapeAdds(tab), "Width");
    });

    it("shows a Width and a flat shape a layer already sets", async () => {
        await openProject({ "node.shape": "rectangle", "node.width": 3 });
        const tab = await openStyle();
        await waitFor(() => {
            assert.isNotNull(tab.querySelector('.ws-row[data-line="node.width"]'));
        });
        assert.include(await shapeChoices(tab), "Rectangle");
    });
});

describe("the Style tab with the element's experiment on", () => {
    withFeatures(["file-styles"]);

    it("offers the flat shapes and Width", async () => {
        await openProject();
        const tab = await openStyle();
        assert.include(await shapeChoices(tab), "Rectangle");
        assert.include(await shapeAdds(tab), "Width");
    });
});
