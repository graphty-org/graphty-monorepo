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
 * Switches the view from the toolbar's Mode menu, as a reader does.
 * @param to - the view.
 */
export async function switchView(to: "2D" | "3D"): Promise<void> {
    const toolbar = screen.getByRole("toolbar", { name: "Canvas tools" });
    await userEvent.click(within(toolbar).getByRole("button", { name: /^Mode, / }));
    const menu = await screen.findByRole("menu", { name: /^Mode/ });
    await userEvent.click(within(menu).getByRole("menuitemradio", { name: new RegExp(`^${to}`) }));
    await waitFor(() => {
        assert.isNotNull(within(toolbar).queryByRole("button", { name: `Mode, ${to}` }));
    });
}

/**
 * Opens a tab's one shader list from its Effects section's "+" > Shader (E668), by real clicks.
 * @param tab - the Style tab, showing the kind.
 * @param kind - the kind.
 * @returns the Effects section.
 */
export async function openShaderList(tab: HTMLElement, kind: "node" | "edge"): Promise<HTMLElement> {
    const effects = sectionOf(tab, `${kind}-effects`);
    await userEvent.click(within(effects).getByRole("button", { name: new RegExp(`^Add to ${kind} effects`) }));
    await userEvent.click(await screen.findByRole("menuitem", { name: "Shader" }));
    return effects;
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
    const shot = await element.captureScreenshot({ format: "png" });
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

/**
 * A row's "..." settings button's name.
 * @param title - the row's name with its kind ("Node shape"), or the button's name.
 * @returns the name to find it by; it ends in "has configured values" while the pop-over holds a set line.
 */
export function settingsName(title: string | RegExp): RegExp {
    return typeof title === "string" ? new RegExp(`^${title} settings`, "i") : title;
}

/**
 * Opens a row's "..." settings and its Kind select, as a reader does: the Kind line is the pop-over's first.
 * @param row - the row (or a section holding one row with that settings button).
 * @param title - the row's name with its kind ("Node shape"), or its settings button's name.
 * @returns the open Kind list.
 */
export async function openKind(row: HTMLElement, title: string | RegExp): Promise<HTMLElement> {
    const settings = within(row).queryByRole("button", { name: settingsName(title) });
    // A pick leaves the pop-over open: a second click on "..." would close it. A row with no settings (a basic
    // shape) draws its Kind under it.
    if (settings !== null && settings.getAttribute("aria-expanded") !== "true") {
        await userEvent.click(settings);
    }
    // The pop-over's own Kind: a basic Shape row draws one in the panel too.
    const scope = settings === null ? within(row) : within(await popoutOf(settings));
    await userEvent.click(await scope.findByRole("combobox", { name: "Kind" }));
    return screen.findByRole("listbox");
}

/**
 * The pop-out a button opens, once open.
 * @param button - the button.
 * @returns the pop-out.
 */
async function popoutOf(button: HTMLElement): Promise<HTMLElement> {
    return waitFor(() => {
        const id = button.getAttribute("aria-controls");
        const found = id === null ? null : document.getElementById(id);
        assert.isNotNull(found, "the pop-out is open");
        return found;
    });
}

/**
 * Picks a kind in a row's Kind select, from its "..." settings.
 * @param row - the row.
 * @param title - the row's name with its kind ("Node shape").
 * @param kind - the kind's name.
 */
export async function pickKind(row: HTMLElement, title: string | RegExp, kind: string): Promise<void> {
    const list = await openKind(row, title);
    await userEvent.click(within(list).getByRole("option", { name: kind }));
}

/**
 * Closes the open settings pop-over with Escape, as a reader does.
 */
export async function closeSettings(): Promise<void> {
    await userEvent.keyboard("{Escape}");
    await waitFor(() => {
        // A basic Shape row's own Kind line stays in the panel: the pop-over is what closes.
        assert.isNull(document.querySelector("[data-thing-popover]"));
    });
}

/**
 * The kind a row's Kind select reads.
 * @param row - the row.
 * @param title - the row's name with its kind ("Node shape").
 * @returns the kind's name.
 */
export async function kindOf(row: HTMLElement, title: string | RegExp): Promise<string> {
    const settings = within(row).queryByRole("button", { name: settingsName(title) });
    if (settings === null) {
        return (await within(row).findByRole<HTMLInputElement>("combobox", { name: "Kind" })).value;
    }
    if (settings.getAttribute("aria-expanded") !== "true") {
        await userEvent.click(settings);
    }
    const kind = await within(await popoutOf(settings)).findByRole<HTMLInputElement>("combobox", { name: "Kind" });
    const { value } = kind;
    await closeSettings();
    return value;
}

/**
 * Opens a pop-over's Advanced dialog (its rare settings, the second and last pop-out level), as a reader does.
 * @param pop - the pop-over.
 * @returns the dialog.
 */
export async function openAdvanced(pop: HTMLElement): Promise<HTMLElement> {
    const button = await within(pop).findByRole("button", { name: / advanced settings$/ });
    if (button.getAttribute("aria-expanded") !== "true") {
        await userEvent.click(button);
    }
    return waitFor(() => {
        const id = button.getAttribute("aria-controls");
        const dialog = id === null ? null : document.getElementById(id);
        assert.isNotNull(dialog, "the Advanced dialog is open");
        return dialog;
    });
}

/**
 * A line of a pop-over, or of its Advanced dialog when the line is one of its rare settings.
 * @param pop - the pop-over.
 * @param selector - the line.
 * @returns the line.
 */
export async function popoverLine(pop: HTMLElement, selector: string): Promise<HTMLElement> {
    // The pop-over has drawn once its Main legend (or its Advanced line) is there.
    const here = await waitFor(() => {
        const line = pop.querySelector<HTMLElement>(selector);
        assert.isTrue(line !== null || pop.querySelector('[data-line="advanced"]') !== null, "the pop-over is drawn");
        return line;
    });
    if (here !== null) {
        return here;
    }
    const dialog = await openAdvanced(pop);
    return waitFor(() => {
        const line = dialog.querySelector<HTMLElement>(selector);
        assert.isNotNull(line, `${selector} in the pop-over or its Advanced dialog`);
        return line;
    });
}
