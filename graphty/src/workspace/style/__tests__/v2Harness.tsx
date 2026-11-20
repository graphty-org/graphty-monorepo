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

/**
 * Opens three nodes on a circle, two edges between them, a layer "Key people" over every node and a layer
 * "Links" over every edge, each setting only its color.
 * @returns the session, the element and the two layers' ids.
 */
export async function openGraph(): Promise<{
    session: GraphSession;
    element: HTMLElementTagNameMap["graphty-element"];
    nodes: string;
    edges: string;
}> {
    const { session, id: nodes } = await openProject();
    await session.data.addEdges([
        { source: "a", target: "b" },
        { source: "b", target: "c" },
    ]);
    // A layout that stands still, so two pictures differ only by what a style draws.
    await session.layout.set("circular");
    const { id: edges } = await session.styles.add({
        name: "Links",
        target: "edge",
        selector: { match: "everything" },
        set: { "edge.color": "#E8590C" },
    });
    await session.styles.settled();
    const element = document.querySelector("graphty-element");
    if (element === null) {
        throw new Error("the element never came up");
    }
    return { session, element, nodes, edges };
}

/**
 * The graph's picture, as the element's own screenshot draws it once the frame is stable.
 * @param element - the element.
 * @returns its pixels.
 */
export async function picture(element: HTMLElementTagNameMap["graphty-element"]): Promise<ImageData> {
    await element.waitForStableFrame();
    const shot = await element.captureScreenshot({ destination: { blob: true }, format: "png" });
    const bitmap = await createImageBitmap(shot.blob);
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const context = canvas.getContext("2d");
    if (context === null) {
        throw new Error("no 2D canvas");
    }
    context.drawImage(bitmap, 0, 0);
    return context.getImageData(0, 0, bitmap.width, bitmap.height);
}

/**
 * How many pixels of two pictures of the same size differ by more than one level in a channel.
 * @param a - a picture.
 * @param b - another.
 * @returns the count.
 */
export function pixelsApart(a: ImageData, b: ImageData): number {
    assert.equal(a.data.length, b.data.length, "pictures of one size");
    let apart = 0;
    for (let i = 0; i < a.data.length; i += 4) {
        for (let c = 0; c < 4; c++) {
            if (Math.abs((a.data[i + c] ?? 0) - (b.data[i + c] ?? 0)) > 1) {
                apart++;
                break;
            }
        }
    }
    return apart;
}

/**
 * What the layers hold, to tell whether a click changed anything.
 * @param session - the session.
 * @returns the layers as text.
 */
export function layersNow(session: GraphSession): string {
    return JSON.stringify(session.styles.list());
}

/**
 * Clicks a "+" list's title and the empty middle of its bar, and checks neither adds nor opens anything; then
 * clicks its "+" and checks it opens its menu or adds.
 * @param session - the session.
 * @param list - the "+" list.
 * @param what - what it is, for messages.
 */
export async function onlyPlusAdds(session: GraphSession, list: HTMLElement, what: string): Promise<void> {
    const before = layersNow(session);
    const title =
        list.querySelector<HTMLElement>(
            '[data-testid="control-section-lead"], [data-testid="control-section-toggle"]',
        ) ?? list.querySelector<HTMLElement>('[data-testid="control-group-label"]');
    assert.isNotNull(title, `${what} has a title`);
    await userEvent.click(title);
    const bar = list.querySelector<HTMLElement>(
        '[data-testid="control-section-header"], [data-testid="control-group-header"]',
    );
    if (bar !== null) {
        const box = bar.getBoundingClientRect();
        await userEvent.click(bar, { position: { x: Math.round(box.width * 0.62), y: Math.round(box.height / 2) } });
    }
    assert.isNull(screen.queryByRole("menu"), `${what}: no menu from its title or bar`);
    assert.equal(layersNow(session), before, `${what}: its title and bar add nothing`);
    const plus = list.querySelector<HTMLElement>("[data-plus]");
    assert.isNotNull(plus, `${what} has a "+"`);
    await userEvent.click(plus);
    // Its menu, its one list (the Shaders list, E381), or what it adds at once.
    const gallery = (): Element | null => document.querySelector(".ws-gallery-grid");
    await waitFor(() => {
        assert.isTrue(
            screen.queryByRole("menu") !== null || gallery() !== null || layersNow(session) !== before,
            `${what}: its "+" adds`,
        );
    });
    if (screen.queryByRole("menu") !== null || gallery() !== null) {
        await userEvent.keyboard("{Escape}");
        await waitFor(() => {
            assert.isNull(screen.queryByRole("menu"));
            assert.isNull(gallery());
        });
    }
}
