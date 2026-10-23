/**
 * A committed change to one layer is said once through the workspace's status line, with how many
 * elements it reaches, on the REAL graphty-element and driven by real keys: a color typed and
 * committed with Enter, and a size bound to a value picked from "by attribute".
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession } from "@graphty/graphty-element/session";
import { assert, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import lesMiserables from "../../../../public/samples/les-miserables.gml?raw";
import { render, screen, waitFor, within } from "../../../test/test-utils";
import { createWorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";
import { showKind } from "./kindTab";

/**
 * What the status lines hold now.
 * @returns their words.
 */
function statusWords(): string[] {
    return [...document.querySelectorAll("[role=status]")].map((region) => region.textContent);
}

/**
 * Les Miserables after Degree in the workspace, one reader's layer open on its node Style tab.
 * @returns the session.
 */
async function openPaint(): Promise<GraphSession> {
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
    await session.config.set({ startingRows: true, editableBase: true, runPlacement: "top" });
    await session.runs.start("degree");
    await session.styles.addRow({ name: "Paint", target: "both", selector: { match: "everything" } });
    await session.styles.settled();

    const tree = await screen.findByRole("tree", { name: "Style layers" });
    await userEvent.click(await within(tree).findByRole("treeitem", { name: /^Paint, / }));
    const inspector = screen.getByRole("complementary", { name: "Inspector" });
    const style = await within(inspector).findByRole("tab", { name: "Style" });
    if (style.getAttribute("aria-selected") !== "true") {
        await userEvent.click(style);
    }
    await screen.findByTestId("style-tab");
    await showKind("node");
    return session;
}

describe("a committed change is said", () => {
    it("says a color committed with Enter, with how many nodes it paints", async () => {
        await openPaint();
        await userEvent.click(await screen.findByRole("button", { name: "Add to node fill" }));
        const box = await waitFor(() => {
            const found = document.querySelector<HTMLInputElement>(
                '[data-testid="style-tab"] .ws-row[data-line="node.color"] [data-testid="compact-color-input-hex"]',
            );
            assert.isNotNull(found);
            return found;
        });
        if (box === null) {
            throw new Error("no color box");
        }
        await userEvent.click(box);
        await userEvent.keyboard("{Control>}a{/Control}FF0000{Enter}");

        await waitFor(() => {
            assert.include(statusWords(), "Node color now red, on 77 nodes");
        });
    });

    it("says a size bound to a value, with how many nodes it sizes", async () => {
        const session = await openPaint();
        const tab = await screen.findByTestId("style-tab", {});
        await userEvent.click(within(tab).getByRole("button", { name: "Add to node shape" }));
        await userEvent.click(await screen.findByRole("menuitem", { name: "Size" }));
        await userEvent.click(await screen.findByRole("button", { name: "Node size by attribute" }));
        await userEvent.keyboard("Degree");
        await userEvent.click(await screen.findByRole("option", { name: /^Degree(,|$)/ }));
        await waitFor(() => {
            assert.isTrue(
                session.styles.list().some((layer) => {
                    const bound = layer.encode?.["node.size"];
                    return bound !== undefined && "by" in bound;
                }),
            );
        });

        await waitFor(() => {
            assert.include(statusWords(), "Node size varies by Degree, on 77 nodes");
        });
    });
});
