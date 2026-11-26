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
 * Opens a row's "..." settings and its Kind drop-down, as a reader does: the Kind line is the pop-over's first (a
 * basic Shape row draws one in the panel). A kind drawn as tabs or grouped buttons has no list: see `pickKind`.
 * @param row - the row (or a section holding one row with that settings button).
 * @param title - the row's name with its kind ("Node shape"), or its settings button's name.
 * @param name - the line's name: "Kind", "End" or "Preset".
 * @returns the open list.
 */
export async function openKind(row: HTMLElement, title: string | RegExp, name = "Kind"): Promise<HTMLElement> {
    const scope = await kindScope(row, title);
    await userEvent.click(await within(scope).findByRole("combobox", { name }));
    return screen.findByRole("listbox");
}

/**
 * Where a row's Kind is drawn: its settings pop-over, opened as a reader does, or the row itself when it has none.
 * @param row - the row.
 * @param title - the row's name with its kind.
 * @returns the pop-over or the row.
 */
async function kindScope(row: HTMLElement, title: string | RegExp): Promise<HTMLElement> {
    const settings = within(row).queryByRole("button", { name: settingsName(title) });
    // A pick leaves the pop-over open: a second click on "..." would close it.
    if (settings !== null && settings.getAttribute("aria-expanded") !== "true") {
        await userEvent.click(settings);
    }
    return settings === null ? row : popoutOf(settings);
}

/**
 * The tab or grouped button of a kind, where the kind is drawn so (design "Input rules", "Tabs").
 * @param scope - the pop-over or row.
 * @param kind - the kind's name.
 * @returns its radio, or null when the kind is a drop-down's option.
 */
function kindRadio(scope: HTMLElement, kind: string): HTMLInputElement | null {
    const radios = [...scope.querySelectorAll<HTMLInputElement>('.ws-member input[type="radio"]')];
    return (
        radios.find((radio) => {
            const label = scope.querySelector(`label[for="${radio.id}"]`);
            return (label?.textContent ?? radio.value).trim() === kind || radio.value === kind;
        }) ?? null
    );
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
    const scope = await kindScope(row, title);
    const radio = await waitFor(() => {
        const found = kindRadio(scope, kind);
        assert.isTrue(found !== null || scope.querySelector('.ws-member [role="combobox"]') !== null, "the Kind line");
        return found;
    });
    if (radio !== null) {
        const label = scope.querySelector<HTMLElement>(`label[for="${radio.id}"]`);
        await userEvent.click(label ?? radio);
        return;
    }
    const list = await openKind(row, title, kindName(scope));
    await userEvent.click(within(list).getByRole("option", { name: kind }));
}

/**
 * The name of the drop-down a kind is picked from: the Kind ("End" for an arrow's), else a text's Look.
 * @param scope - the pop-over or row.
 * @returns the name.
 */
function kindName(scope: HTMLElement): string {
    return ["Kind", "End"].find((name) => within(scope).queryByRole("combobox", { name }) !== null) ?? "Preset";
}

/**
 * Closes the open settings pop-over with Escape, as a reader does: its group pop-over closes first, and a view
 * drilled into it goes back first, each on an Escape of its own when focus is in it.
 */
export async function closeSettings(): Promise<void> {
    const group = document.querySelector("[data-group-pop]");
    if (group !== null) {
        await userEvent.keyboard("{Escape}");
        await waitFor(() => {
            assert.isFalse(group.isConnected, "the group pop-over closed");
        });
    }
    const drilled = document.querySelector("[data-drill-view]:not([hidden])");
    if (drilled?.contains(document.activeElement) === true) {
        await userEvent.keyboard("{Escape}");
        await waitFor(() => {
            assert.isFalse(drilled.isConnected && !drilled.hasAttribute("hidden"), "the drilled view went back");
        });
    }
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
    const scope = await kindScope(row, title);
    const read = await waitFor(() => {
        const checked = scope.querySelector<HTMLInputElement>(
            '[data-kind-menu] input[type="radio"]:checked, [data-member-menu] input[type="radio"]:checked',
        );
        const box = scope.querySelector<HTMLInputElement>(
            '[data-kind-menu] input[role="combobox"], [data-member-menu] input[role="combobox"]',
        );
        const look = scope.querySelector<HTMLInputElement>('[data-look-menu] input[role="combobox"]');
        assert.isTrue(checked !== null || box !== null || look !== null, "the Kind line");
        const tab =
            checked === null
                ? undefined
                : (scope.querySelector(`label[for="${checked.id}"]`)?.textContent?.trim() ?? checked.value);
        // A text's tab is its look's: the Look line names it.
        if (look !== null && (tab === undefined || tab === "Text")) {
            return look.value;
        }
        return tab ?? box?.value ?? "";
    });
    if (settings !== null) {
        await closeSettings();
    }
    return read;
}

/**
 * A pop-over's "..." button in its header, or null when it has no groups of settings.
 * @param pop - the pop-over, or an element in it.
 * @returns the button.
 */
export function moreButton(pop: HTMLElement): HTMLElement | null {
    const panel = pop.closest<HTMLElement>("[data-popout-id]") ?? pop;
    return panel.querySelector<HTMLElement>('[data-testid="popout-header"] button[aria-label="More settings"]');
}

/**
 * The names of a pop-over's groups of settings, from its "..." menu (closed again), or its one group's.
 * @param pop - the pop-over.
 * @returns the names; none without a "...".
 */
export async function groupNames(pop: HTMLElement): Promise<string[]> {
    const button = moreButton(pop);
    if (button === null) {
        return [];
    }
    if (button.getAttribute("aria-haspopup") === "dialog") {
        const content = await openGroup(pop);
        const name = content.dataset.groupPop ?? "";
        await userEvent.click(button);
        await waitFor(() => {
            assert.isFalse(content.isConnected, "the group pop-over closed");
        });
        return [name];
    }
    await userEvent.click(button);
    const items = await screen.findAllByRole("menuitem");
    const names = items.map((item) => entryName(item));
    await userEvent.keyboard("{Escape}");
    await waitFor(() => {
        assert.lengthOf(screen.queryAllByRole("menuitem"), 0, "the menu closed");
    });
    return names;
}

/**
 * A "..." menu entry's group name, without the ", set" a set group's entry is read with.
 * @param item - the entry.
 * @returns the name.
 */
export function entryName(item: HTMLElement): string {
    return item.textContent.replace(/, set$/, "").trim();
}

/**
 * Opens a group of a pop-over's settings beside it, as a reader does: its "..." opens the group directly when it is
 * the only one, else a menu where the group is picked. A group already open is returned as it is.
 * @param pop - the pop-over.
 * @param name - the group's name; any for a pop-over with one group.
 * @returns the group pop-over's content.
 */
export async function openGroup(pop: HTMLElement, name?: string): Promise<HTMLElement> {
    const open = document.querySelector<HTMLElement>("[data-group-pop]");
    if (open !== null && (name === undefined || open.dataset.groupPop === name)) {
        return open;
    }
    const button = await waitFor(() => {
        const found = moreButton(pop);
        assert.isNotNull(found, 'the "..." button');
        return found;
    });
    await userEvent.click(button);
    if (button.getAttribute("aria-haspopup") !== "dialog") {
        assert.isDefined(name, "a group's name to pick from the menu");
        const item = (await screen.findAllByRole("menuitem")).find((each) => entryName(each) === name);
        assert.isDefined(item, `the "${name}" entry`);
        await userEvent.click(item);
    }
    return waitFor(() => {
        const found = document.querySelector<HTMLElement>(
            name === undefined ? "[data-group-pop]" : `[data-group-pop="${name}"]`,
        );
        assert.isNotNull(found, `the ${name ?? ""} group pop-over is open`);
        return found;
    });
}

/**
 * A line of a pop-over, or of the group pop-over holding it, opened from its "..." as a reader does.
 * @param pop - the pop-over.
 * @param selector - the line.
 * @returns the line.
 */
export async function popoverLine(pop: HTMLElement, selector: string): Promise<HTMLElement> {
    // The pop-over has drawn once the line (or its "...") is there.
    const here = await waitFor(() => {
        const line = pop.querySelector<HTMLElement>(selector);
        assert.isTrue(line !== null || moreButton(pop) !== null, "the pop-over is drawn");
        return line;
    });
    if (here !== null) {
        return here;
    }
    for (const name of await groupNames(pop)) {
        const group = await openGroup(pop, name);
        const line = group.querySelector<HTMLElement>(selector);
        if (line !== null) {
            return line;
        }
    }
    throw new Error(`${selector} is in neither the pop-over nor one of its groups`);
}
