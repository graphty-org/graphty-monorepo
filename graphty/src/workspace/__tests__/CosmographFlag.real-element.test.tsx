/**
 * The Cosmograph-inspired rendering behind its experiment (issue #3247), on the real element: with
 * it off the workspace draws with the objects render path and the Style tab's Line section offers no
 * fade or blending; with it on the element draws batched and a reader adds Blending from Line's "+"
 * and turns it off, which the layer then holds.
 */

import "@graphty/graphty-element";

import type { GraphSession } from "@graphty/graphty-element/session";
import { assert, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import lesMiserables from "../../../public/samples/les-miserables.gml?raw";
import { withoutFeatures } from "../../test/features";
import { siteFeatures } from "../../test/siteFeatures";
import { render, screen, waitFor, within } from "../../test/test-utils";
import { createWorkspaceStore } from "../state/store";
import { showKind } from "../style/__tests__/kindTab";
import { Workspace } from "../Workspace";

/**
 * Renders the workspace over Les Miserables with a layer on both kinds, and opens its Style tab on
 * the edges.
 * @returns the session.
 */
async function openEdgeStyle(): Promise<GraphSession> {
    await page.viewport(1440, 900);
    render(<Workspace store={createWorkspaceStore({ project: { name: "Untitled", id: 1 } })} />);
    const session = await waitFor(() => {
        const found = document.querySelector("graphty-element")?.session;
        assert.isDefined(found);
        return found;
    });
    if (session === undefined) {
        throw new Error("the element never came up");
    }
    await session.data.import({ type: "gml", name: "les-miserables.gml", config: { data: lesMiserables } });
    await session.config.set({ startingRows: true, editableBase: true });
    await session.styles.addRow({ name: "Both", target: "both", selector: { match: "everything" } });
    await session.styles.settled();
    const tree = await screen.findByRole("tree", { name: "Style layers" });
    await userEvent.click(await within(tree).findByRole("treeitem", { name: /^Both, / }));
    const inspector = screen.getByRole("complementary", { name: "Inspector" });
    const style = await within(inspector).findByRole("tab", { name: "Style" });
    if (style.getAttribute("aria-selected") !== "true") {
        await userEvent.click(style);
    }
    await screen.findByTestId("style-tab");
    await showKind("edge");
    return session;
}

/**
 * The edges' Line section.
 * @returns it.
 */
function line(): HTMLElement {
    const found = screen.getByTestId("style-tab").querySelector<HTMLElement>('[data-section="edge-line"]');
    if (found === null) {
        throw new Error("no edge line section");
    }
    return found;
}

/**
 * Opens Line's "+" menu and reads what it offers.
 * @returns the menu items' names.
 */
async function lineMenu(): Promise<string[]> {
    await userEvent.click(within(line()).getByRole("button", { name: "Add to edge line" }));
    const items = await screen.findAllByRole("menuitem");
    return items.map((item) => item.textContent);
}

/**
 * The workspace's element.
 * @returns it.
 */
function element(): HTMLElementTagNameMap["graphty-element"] {
    const found = document.querySelector("graphty-element");
    if (found === null) {
        throw new Error("no element");
    }
    return found;
}

// The file-styles experiment draws the edge tab by part, where blending is on Line's settings page.
withoutFeatures(["file-styles"]);

describe("the cosmograph experiment's switch in the app", () => {
    it("draws with objects and offers no fade or blending with the experiment off", async () => {
        await siteFeatures([]);
        await openEdgeStyle();
        assert.strictEqual(element().renderPath, "objects");
        const offered = await lineMenu();
        assert.include(offered, "Width", "Line's own properties are offered");
        for (const word of ["Fade end", "Blending"]) {
            assert.notInclude(offered, word);
        }
    });

    it("draws batched, and a reader turns blending off from Line's '+', with the experiment on", async () => {
        await siteFeatures(["cosmograph"]);
        const session = await openEdgeStyle();
        await waitFor(() => {
            assert.strictEqual(element().renderPath, "batched");
        });
        const offered = await lineMenu();
        assert.include(offered, "Fade end");
        assert.include(offered, "Blending");
        await userEvent.click(screen.getByRole("menuitem", { name: "Blending" }));
        const row = await waitFor(() => {
            const found = line().querySelector<HTMLElement>('.ws-row[data-line="edge.blending"]');
            assert.isNotNull(found);
            return found;
        });
        if (row === null) {
            throw new Error("no blending row");
        }
        await userEvent.click(within(row).getByLabelText(/^Edge blending/));
        await userEvent.click(await screen.findByRole("option", { name: "Off" }));
        await waitFor(() => {
            const layer = session.styles
                .list()
                .find((each) => each.name === "Both" && each.set?.["edge.blending"] !== undefined);
            assert.strictEqual(layer?.set?.["edge.blending"], false);
        });
    });
});
