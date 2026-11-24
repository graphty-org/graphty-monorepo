/**
 * The Style tab's property rows down their less traveled paths, on the REAL graphty-element and Les
 * Miserables, driven by real clicks and keys: a number typed into a size that multiplies what lies
 * beneath keeps multiplying; a property just added with "+" goes away again on Escape or its minus,
 * writing nothing; "Fixed size" in the vary list keeps the value and says so; removing Outline takes
 * its width with it; a lift the 3D view cannot draw says so on its minus; and a shape set for a few
 * groups shows the one value the rest paint, which can be changed there, and which groups differ.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession, Layer } from "@graphty/graphty-element/session";
import { assert, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import lesMiserables from "../../../../public/samples/les-miserables.gml?raw";
import { render, screen, waitFor, within } from "../../../test/test-utils";
import { createWorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";
import { showKind } from "./kindTab";
import { tooltipOf } from "./tooltip";

/**
 * Les Miserables in the workspace, with the starting rows.
 * @returns the session.
 */
async function openMiserables(): Promise<GraphSession> {
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
    return session;
}

/**
 * Adds a layer over everything and waits for it to paint.
 * @param session - the session.
 * @param spec - its name, side and what it sets.
 * @returns the layer.
 */
async function addLayer(
    session: GraphSession,
    spec: Omit<Parameters<GraphSession["styles"]["add"]>[0], "selector">,
): Promise<Layer> {
    const layer = await session.styles.add({ ...spec, selector: { match: "everything" } });
    await session.styles.settled();
    return layer;
}

/**
 * Opens a tree row's Style tab by a click on the row.
 * @param name - the row's visible name.
 * @param kind - the tab of the side the row styles.
 * @returns the Style tab.
 */
async function openStyle(name: string, kind: "node" | "edge" = "node"): Promise<HTMLElement> {
    const tree = await screen.findByRole("tree", { name: "Style layers" });
    await userEvent.click(await within(tree).findByRole("treeitem", { name: new RegExp(`^${name}, `) }));
    const inspector = screen.getByRole("complementary", { name: "Inspector" });
    const style = await within(inspector).findByRole("tab", { name: "Style" });
    if (style.getAttribute("aria-selected") !== "true") {
        await userEvent.click(style);
    }
    await showKind(kind);
    return screen.findByTestId("style-tab");
}

/**
 * A property row by its channel, once it is drawn.
 * @param tab - the Style tab.
 * @param channel - the channel.
 * @returns the row.
 */
function row(tab: HTMLElement, channel: string): Promise<HTMLElement> {
    return waitFor(() => {
        const found = tab.querySelector<HTMLElement>(`.ws-row[data-line="${channel}"]`);
        assert.isNotNull(found, `the ${channel} row is drawn`);
        return found ?? tab;
    });
}

/**
 * Waits until a property row is gone.
 * @param tab - the Style tab.
 * @param channel - the channel.
 */
async function gone(tab: HTMLElement, channel: string): Promise<void> {
    await waitFor(() => {
        assert.isNull(tab.querySelector(`.ws-row[data-line="${channel}"]`), `the ${channel} row is gone`);
    });
}

/**
 * A row's typed box.
 * @param line - the row.
 * @returns its input.
 */
function inputOf(line: HTMLElement): HTMLInputElement {
    const input = line.querySelector<HTMLInputElement>(".ws-field-control input");
    if (input === null) {
        throw new Error("the row has no typed box");
    }
    return input;
}

/**
 * Collects what the page's polite status line says from now on.
 * @returns the words said so far, and a stop.
 */
function listen(): { readonly said: string[]; readonly stop: () => void } {
    const said: string[] = [];
    const watch = new MutationObserver(() => {
        for (const each of document.querySelectorAll('[role="status"][aria-live="polite"]')) {
            said.push(each.textContent ?? "");
        }
    });
    watch.observe(document.body, { childList: true, characterData: true, subtree: true });
    return { said, stop: () => watch.disconnect() };
}

/**
 * Adds a property to the open Style tab from its section's "+".
 * @param tab - the Style tab.
 * @param section - the "+"'s name.
 * @param item - the property's name in the menu.
 */
async function add(tab: HTMLElement, section: string, item: string): Promise<void> {
    await userEvent.click(within(tab).getByRole("button", { name: section }));
    await userEvent.click(await screen.findByRole("menuitem", { name: item }));
}

describe("the Style tab's property rows, side paths", () => {
    it("a size typed over one that multiplies what lies beneath keeps multiplying", async () => {
        const session = await openMiserables();
        const layer = await addLayer(session, {
            name: "Scaled",
            target: "node",
            encode: { "node.size": { value: 2, combine: "multiply" } },
        });
        const tab = await openStyle("Scaled");
        const size = await row(tab, "node.size");
        // The multiply shows as its sign before the number.
        assert.include(within(size).getByText("x").textContent ?? "", "x");
        const input = inputOf(size);
        assert.strictEqual(input.value, "2");

        await userEvent.tripleClick(input);
        await userEvent.keyboard("3{Enter}");
        await waitFor(() => {
            assert.deepEqual(session.styles.get(layer.id)?.encode?.["node.size"], { value: 3, combine: "multiply" });
        });
    });

    it("a property just added takes Escape or its minus back without writing anything", async () => {
        const session = await openMiserables();
        const layer = await addLayer(session, { name: "Plain", target: "node", set: { "node.color": "#cc79a7" } });
        const tab = await openStyle("Plain");
        const steps = session.history.position;
        const { said, stop } = listen();

        await add(tab, "Add to node shape", "Size");
        await userEvent.click(inputOf(await row(tab, "node.size")));
        await userEvent.keyboard("{Escape}");
        await gone(tab, "node.size");
        await waitFor(() => {
            assert.include(said, "Node size not added");
        });

        await add(tab, "Add to node shape", "Size");
        await userEvent.click(within(await row(tab, "node.size")).getByRole("button", { name: "Remove node size" }));
        await gone(tab, "node.size");
        stop();
        assert.strictEqual(session.history.position, steps, "nothing was written");
        assert.isUndefined(session.styles.get(layer.id)?.set?.["node.size"]);
    });

    it("Fixed size in the vary list keeps the size and says so", async () => {
        const session = await openMiserables();
        const layer = await addLayer(session, { name: "Sized", target: "node", set: { "node.size": 2 } });
        const tab = await openStyle("Sized");
        const size = await row(tab, "node.size");
        const { said, stop } = listen();

        await userEvent.click(within(size).getByRole("button", { name: "Node size by attribute" }));
        await userEvent.click(await screen.findByRole("option", { name: /^Fixed size/ }));
        await waitFor(() => {
            assert.include(said, "Node size stays a fixed value");
        });
        stop();
        assert.strictEqual(session.styles.get(layer.id)?.set?.["node.size"], 2);
    });

    it("removing Outline takes its width with it", async () => {
        const session = await openMiserables();
        const layer = await addLayer(session, {
            name: "Outlined",
            target: "node",
            set: { "node.outline": "#D55E00", "node.outlineWidth": 3 },
        });
        const tab = await openStyle("Outlined");
        await row(tab, "node.outlineWidth");

        await userEvent.click(
            within(await row(tab, "node.outline")).getByRole("button", { name: "Remove node outline" }),
        );
        await waitFor(() => {
            const set = session.styles.get(layer.id)?.set ?? {};
            assert.isUndefined(set["node.outline"]);
            assert.isUndefined(set["node.outlineWidth"], "its width went with it");
        });
        await gone(tab, "node.outlineWidth");
    });

    it("a lift the 3D view cannot draw says so on its minus, and takes a typed value", async () => {
        const session = await openMiserables();
        const layer = await addLayer(session, { name: "Lifted", target: "edge", set: { "edge.lift": 2 } });
        const tab = await openStyle("Lifted", "edge");
        const lift = await row(tab, "edge.lift");

        const minus = within(lift).getByRole("button", { name: "Remove edge lift" });
        assert.include(await tooltipOf(minus), "Flat in this view");

        await userEvent.tripleClick(inputOf(lift));
        await userEvent.keyboard("4{Enter}");
        await waitFor(() => {
            assert.strictEqual(session.styles.get(layer.id)?.set?.["edge.lift"], 4);
        });
    });

    it("a shape set for a few groups shows the rest's shape, changed there, and which groups differ", async () => {
        const session = await openMiserables();
        const layer = await addLayer(session, {
            name: "Few",
            target: "node",
            encode: { "node.shape": { by: "data.name", map: { Valjean: "box" }, otherwise: "sphere" } },
        });
        const tab = await openStyle("Few");
        const shape = await row(tab, "node.shape");

        // Which groups have their own opens the binding's popover.
        await userEvent.click(within(shape).getByRole("button", { name: /^Node shape: Box for 1 group by / }));
        const dialog = await screen.findByRole("dialog", { name: /^Shape by / });
        await userEvent.keyboard("{Escape}");
        await waitFor(() => {
            assert.isFalse(dialog.isConnected, "the popover closed");
        });

        // The rest's shape is a field of its own.
        await userEvent.click(within(shape).getByLabelText(/^Node shape, /));
        await userEvent.click(await screen.findByRole("option", { name: /cylinder/i }));
        await waitFor(() => {
            const binding = session.styles.get(layer.id)?.encode?.["node.shape"];
            assert.deepInclude(binding, { by: "data.name", map: { Valjean: "box" }, otherwise: "cylinder" });
        });
    });
});
