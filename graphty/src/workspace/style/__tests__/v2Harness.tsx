/**
 * Style panel v2's real-element tests' shared steps: a project of three nodes and one layer over
 * every node, its Style tab on the node tab, and reading what the layer writes.
 */

import type { GraphSession } from "@graphty/graphty-element/session";
import { assert } from "vitest";
import { page, userEvent } from "vitest/browser";

import { render, screen, waitFor, within } from "../../../test/test-utils";
import { createWorkspaceStore, type WorkspaceState } from "../../state/store";
import { Workspace } from "../../Workspace";
import { showKind } from "./kindTab";

/**
 * Opens three nodes and a layer "Key people" over every node that sets only its color.
 * @param state - workspace state to start from (a reader preference).
 * @returns the session and the layer's id.
 */
export async function openProject(state: Partial<WorkspaceState> = {}): Promise<{ session: GraphSession; id: string }> {
    await page.viewport(1440, 900);
    render(<Workspace store={createWorkspaceStore({ project: { name: "Untitled", id: 1 }, ...state })} />);
    const session = await waitFor(() => {
        const found = document.querySelector("graphty-element")?.session;
        assert.isDefined(found);
        return found;
    });
    if (session === undefined) {
        throw new Error("the element never came up");
    }
    await session.data.addNodes([{ id: "a" }, { id: "b" }, { id: "c" }]);
    const { id } = await session.styles.add({
        name: "Key people",
        target: "node",
        selector: { match: "everything" },
        set: { "node.color": "#E8590C" },
    });
    await session.styles.settled();
    return { session, id };
}

/**
 * Opens a tree row's Style tab on its node tab.
 * @param name - the row's name.
 * @returns the Style tab.
 */
export async function openStyle(name: string): Promise<HTMLElement> {
    const tree = await screen.findByRole("tree", { name: "Style layers" });
    await userEvent.click(await within(tree).findByRole("treeitem", { name: new RegExp(`^${name}, `) }));
    const inspector = screen.getByRole("complementary", { name: "Inspector" });
    const style = await within(inspector).findByRole("tab", { name: "Style" });
    if (style.getAttribute("aria-selected") !== "true") {
        await userEvent.click(style);
    }
    const tab = await screen.findByTestId("style-tab");
    await showKind("node");
    return tab;
}

/**
 * What one layer sets for a channel.
 * @param session - the session.
 * @param id - the layer.
 * @param channel - the channel.
 * @returns the value, or undefined.
 */
export function written(session: GraphSession, id: string, channel: string): unknown {
    return (session.styles.get(id)?.set as Record<string, unknown> | undefined)?.[channel];
}

/**
 * A section of the open Style tab.
 * @param tab - the Style tab.
 * @param id - the section's id ("node-shape").
 * @returns the section.
 */
export function sectionOf(tab: HTMLElement, id: string): HTMLElement {
    const found = tab.querySelector<HTMLElement>(`[data-style-panel-v2] [data-section="${id}"]`);
    if (found === null) {
        throw new Error(`no section ${id}`);
    }
    return found;
}
