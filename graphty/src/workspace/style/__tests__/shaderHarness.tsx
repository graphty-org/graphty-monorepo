/**
 * What the Shaders tests share: a real graphty-element on the page, the Style tab of a row of
 * layers or the whole workspace, and readers of what the element's layers hold.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import { PopoutManager } from "@graphty/compact-mantine";
import type { ShaderUse } from "@graphty/graphty-element/catalog";
import type { LayerId } from "@graphty/graphty-element/schema";
import type { GraphSession } from "@graphty/graphty-element/session";
import { assert } from "vitest";
import { userEvent } from "vitest/browser";

import { render, screen, waitFor, within } from "../../../test/test-utils";
import { createRegistry } from "../../commands/registry";
import { createWorkspaceStore, type WorkspaceStore } from "../../state/store";
import { makeWorkspaceValue, WorkspaceContext } from "../../state/WorkspaceContext";
import { Workspace } from "../../Workspace";
import { StylePanel } from "../StylePanel";

const NODES = [
    { id: "1", group: "a" },
    { id: "2", group: "a" },
    { id: "3", group: "b" },
];
const EDGES = [
    { source: "1", target: "2" },
    { source: "2", target: "3" },
];

let host: HTMLElement | null = null;

/** Takes the element a test put on the page away again. */
export function removeElement(): void {
    host?.remove();
    host = null;
}

/** The element and its session. */
export interface Mounted {
    readonly element: HTMLElementTagNameMap["graphty-element"];
    readonly session: GraphSession;
}

/**
 * Puts a real element on the page, waits for its session and loads a small graph.
 * @returns the element and its session.
 */
export async function mountElement(): Promise<Mounted> {
    host = document.createElement("div");
    host.style.width = "360px";
    host.style.height = "240px";
    const element = document.createElement("graphty-element");
    element.style.display = "block";
    element.style.width = "100%";
    element.style.height = "100%";
    host.appendChild(element);
    document.body.appendChild(host);
    await waitFor(() => {
        assert.isDefined(element.session);
    });
    await element.session.data.addNodes(NODES);
    await element.session.data.addEdges(EDGES);
    return { element, session: element.session };
}

/**
 * Renders the Style tab of a row of layers.
 * @param mounted - the element and its session.
 * @param row - the row's layers.
 * @param width - the panel's width.
 */
export function renderPanel(mounted: Mounted, row: LayerId[], width = 300): WorkspaceStore {
    const store = createWorkspaceStore();
    const value = makeWorkspaceValue(store, createRegistry([]), mounted.session, mounted.element);
    render(
        <WorkspaceContext.Provider value={value}>
            <PopoutManager>
                <div style={{ width }}>
                    <StylePanel layers={row} />
                </div>
            </PopoutManager>
        </WorkspaceContext.Provider>,
    );
    return store;
}

/**
 * Adds a reader's node layer on top, with what it sets.
 * @param session - the element's session.
 * @param set - what it sets.
 * @param name - its name.
 * @returns its id.
 */
export async function addNodeLayer(
    session: GraphSession,
    set?: Record<string, unknown>,
    name = "Top",
): Promise<LayerId> {
    const layer = await session.styles.add({
        name,
        target: "node",
        selector: { match: "everything" },
        set: set ?? { "node.opacity": 1 },
    });
    return layer.id;
}

/**
 * The whole workspace on the real element, with the small graph loaded.
 * @returns the session.
 */
export async function mountWorkspace(): Promise<GraphSession> {
    render(<Workspace store={createWorkspaceStore({ project: { name: "Shaders", id: 1 } })} />);
    const session = await waitFor(() => {
        const found = document.querySelector("graphty-element")?.session;
        assert.isDefined(found);
        return found;
    });
    if (session === undefined) {
        throw new Error("the element never came up");
    }
    await session.data.addNodes(NODES);
    await session.data.addEdges(EDGES);
    return session;
}

/**
 * A layer row of the style tree.
 * @param name - the layer's name.
 * @returns the row.
 */
export async function treeRow(name: string): Promise<HTMLElement> {
    const tree = await screen.findByRole("tree", { name: "Style layers" });
    return within(tree).findByRole("treeitem", { name: new RegExp(`^${name}, `) });
}

/**
 * A section of a tab.
 * @param side - nodes or edges.
 * @param id - the section's id.
 * @returns the section.
 */
export function section(side: "node" | "edge", id: string): HTMLElement {
    const found = document.querySelector<HTMLElement>(`[data-section="${side}-${id}"]`);
    assert.isNotNull(found, `the ${side} ${id} section is drawn`);
    return found;
}

/**
 * Opens a tab's Shaders gallery from its "+".
 * @param side - nodes or edges.
 * @returns the gallery.
 */
export async function openGallery(side: "node" | "edge" = "node"): Promise<HTMLElement> {
    const plus = await waitFor(() =>
        within(section(side, "shaders")).getByRole("button", { name: `Add to ${side} shaders` }),
    );
    await userEvent.click(plus);
    return screen.findByTestId("shader-gallery", {});
}

/**
 * Adds a shader from the gallery by typing its name and Enter.
 * @param name - the shader's name.
 * @param side - nodes or edges.
 */
export async function addByName(name: string, side: "node" | "edge" = "node"): Promise<void> {
    const gallery = await openGallery(side);
    const search = within(gallery).getByRole("textbox");
    await waitFor(() => {
        assert.strictEqual(document.activeElement, search, "the search has focus when the gallery opens");
    });
    await userEvent.keyboard(name);
    await userEvent.keyboard("{Enter}");
}

/**
 * The shader list a layer holds.
 * @param session - the element's session.
 * @param id - the layer.
 * @param side - nodes or edges.
 * @returns the list.
 */
export function usesOn(session: GraphSession, id: LayerId, side: "node" | "edge" = "node"): readonly ShaderUse[] {
    const value = session.styles.get(id)?.set?.[side === "node" ? "node.shaders" : "edge.shaders"];
    return Array.isArray(value) ? (value as readonly ShaderUse[]) : [];
}

/**
 * The rows of a tab's Shaders section, in order.
 * @param side - nodes or edges.
 * @returns the rows.
 */
export function shaderRows(side: "node" | "edge" = "node"): HTMLElement[] {
    return [...section(side, "shaders").querySelectorAll<HTMLElement>("[data-shader-row]")];
}

/**
 * A catalog shader's id by its name.
 * @param session - the element's session.
 * @param name - its name.
 * @returns its id.
 */
export function idOf(session: GraphSession, name: string): string {
    const found = session.catalog.shaders().find((each) => each.plainName === name);
    assert.isDefined(found, `the catalog lists ${name}`);
    return found?.id ?? "";
}
