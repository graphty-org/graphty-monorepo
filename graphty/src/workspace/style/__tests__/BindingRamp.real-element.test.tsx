/**
 * A number binding's popover on the REAL graphty-element, driven by real clicks and keys: a stepped
 * ramp's step count and its reset, a step's Select these and New layer for, the clamp's percentiles,
 * One color per value and Use a ramp back; and on a size, its range, No value and how it meets the
 * layers beneath.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession, Layer } from "@graphty/graphty-element/session";
import { assert, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import { render, screen, waitFor, within } from "../../../test/test-utils";
import { createWorkspaceStore, type WorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";
import type { DataBinding } from "../row";

/** Twenty nodes scored 1 to 20, in a ring. */
const NODES = Array.from({ length: 20 }, (_, i) => ({ id: `n${String(i)}`, score: i + 1 }));
const EDGES = NODES.map((node, i) => ({ source: node.id, target: NODES[(i + 1) % NODES.length].id }));

/**
 * The workspace with the scored ring, and a layer binding one property to the score.
 * @param channel - the bound property.
 * @returns the session, the store and the layer.
 */
async function open(channel: "node.color" | "node.size"): Promise<{
    session: GraphSession;
    store: WorkspaceStore;
    layer: Layer;
}> {
    await page.viewport(1440, 900);
    const store = createWorkspaceStore({ project: { name: "Ramps", id: 1 }, inspected: null });
    render(<Workspace store={store} />);
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
    const layer = await session.styles.add({
        name: "Score",
        target: "node",
        selector: { match: "everything" },
        encode: { [channel]: { by: "data.score" } },
    });
    await session.styles.settled();
    return { session, store, layer };
}

/**
 * Opens the layer's Style tab and the binding popover of one property, by clicking its value pill.
 * @param store - the workspace store.
 * @param layer - the layer.
 * @param name - the property's name, such as "Color".
 * @returns the popover.
 */
async function openBinding(store: WorkspaceStore, layer: Layer, name: "Color" | "Size"): Promise<HTMLElement> {
    store.set({ inspected: { kind: "layer-row", id: layer.id } });
    const tab = await screen.findByTestId("style-tab", {});
    await userEvent.click(
        page.elementLocator(tab).getByRole("button", { name: new RegExp(`^Node ${name.toLowerCase()}: `) }),
    );
    return screen.findByRole("group", { name: `${name} binding` });
}

/**
 * The binding the layer holds for a property.
 * @param session - the session.
 * @param layer - the layer.
 * @param channel - the property.
 * @returns the binding.
 */
function bindingOf(session: GraphSession, layer: Layer, channel: string): DataBinding {
    return session.styles.get(layer.id)?.encode?.[channel as "node.color"] as DataBinding;
}

/**
 * Picks an option of one of the popover's selects.
 * @param popover - the popover.
 * @param label - the select's name.
 * @param option - the option's name.
 */
async function pick(popover: HTMLElement, label: RegExp, option: RegExp): Promise<void> {
    await userEvent.click(page.elementLocator(popover).getByRole("combobox", { name: label, exact: true }));
    await userEvent.click(page.getByRole("option", { name: option, exact: true }));
}

/**
 * Replaces what a number box holds and commits it.
 * @param box - the box.
 * @param text - what to type.
 */
async function typeInto(box: HTMLElement, text: string): Promise<void> {
    await userEvent.click(box);
    await userEvent.keyboard(`{Control>}a{/Control}${text}{Enter}`);
}

describe("a number binding's popover on the real element", () => {
    it("a stepped ramp: Steps and its reset, a step's Select these and New layer for", async () => {
        const { session, store, layer } = await open("node.color");
        const popover = await openBinding(store, layer, "Color");
        await pick(popover, /^Scale/, /^Equal bins/);
        await waitFor(() => {
            assert.equal(bindingOf(session, layer, "node.color").scale, "bins");
        });

        await typeInto(within(popover).getByRole("spinbutton", { name: "Steps" }), "4");
        await waitFor(() => {
            assert.equal(bindingOf(session, layer, "node.color").bins, 4, "Steps writes the bins");
            assert.lengthOf(within(within(popover).getByRole("list", { name: "Steps" })).getAllByRole("listitem"), 4);
        });
        await userEvent.click(page.elementLocator(popover).getByRole("button", { name: /^Reset Steps/ }));
        await waitFor(() => {
            assert.isUndefined(bindingOf(session, layer, "node.color").bins, "the reset clears the bins");
            // The list redraws after the frame that shows the reset: its rows are read only then.
            assert.notEqual(
                within(within(popover).getByRole("list", { name: "Steps" })).getAllByRole("listitem").length,
                4,
                "the list no longer shows the four steps",
            );
        });

        // Select these: the step's nodes become the selection.
        const steps = (): HTMLElement[] =>
            within(within(popover).getByRole("list", { name: "Steps" })).getAllByRole("listitem");
        const first = steps()[0];
        const count = Number.parseInt((first.getAttribute("aria-label") ?? "").split(", ").pop() ?? "", 10);
        await userEvent.click(page.elementLocator(first).getByRole("button", { name: / actions$/ }));
        await userEvent.click(page.elementLocator(popover).getByRole("menuitem", { name: /^Select these / }));
        await waitFor(() => {
            assert.equal(session.selection.nodes.length, count, "the step's nodes are selected");
        });

        // New layer for the step: on top, its rule the step's range, opened.
        const again = await openBinding(store, layer, "Color");
        const step = within(within(again).getByRole("list", { name: "Steps" })).getAllByRole("listitem")[1];
        const before = session.styles.list().length;
        await userEvent.click(page.elementLocator(step).getByRole("button", { name: / actions$/ }));
        await userEvent.click(page.elementLocator(again).getByRole("menuitem", { name: /^New layer for / }));
        const added = await waitFor(() => {
            const stack = session.styles.list();
            assert.equal(stack.length, before + 1, "one layer is added");
            const found = stack.find((each) => each.selector.match === "rule" && each.selector.where.kind === "range");
            assert.isDefined(found, "its rule is the step's range");
            return found;
        });
        await waitFor(() => {
            assert.deepEqual(store.get().inspected, { kind: "layer-row", id: added?.id ?? "" }, "and it opens");
        });
        assert.match(store.get().announcement ?? "", /^Layer score .* added on top$/);
        assert.isAbove(session.styles.counts(added?.id ?? "").matched, 0, "it matches the step's nodes");
    });

    it("the clamp's percentiles, One color per value, and Use a ramp back", async () => {
        const { session, store, layer } = await open("node.color");
        const popover = await openBinding(store, layer, "Color");
        await userEvent.click(
            page.elementLocator(popover).getByRole("switch", { name: "Clamp outliers", exact: true }),
        );
        await waitFor(() => {
            assert.deepEqual(bindingOf(session, layer, "node.color").clamp, [2, 98]);
        });
        await typeInto(within(popover).getByRole("spinbutton", { name: "Lowest percentile" }), "10");
        await waitFor(() => {
            assert.deepEqual(bindingOf(session, layer, "node.color").clamp, [10, 98]);
        });
        await typeInto(within(popover).getByRole("spinbutton", { name: "Highest percentile" }), "90");
        await waitFor(() => {
            assert.deepEqual(bindingOf(session, layer, "node.color").clamp, [10, 90]);
        });

        // Twenty distinct scores can take a color each.
        await userEvent.click(
            page.elementLocator(popover).getByRole("button", { name: "One color per value", exact: true }),
        );
        await waitFor(() => {
            const binding = bindingOf(session, layer, "node.color");
            assert.equal(binding.scale, "ordinal");
            assert.isUndefined(binding.clamp, "the ramp's settings go with it");
        });
        await userEvent.click(page.elementLocator(popover).getByRole("button", { name: "Use a ramp", exact: true }));
        await waitFor(() => {
            assert.isUndefined(bindingOf(session, layer, "node.color").scale, "back on the ramp");
        });
        await within(popover).findByRole("switch", { name: "Clamp outliers" });
    });

    it("a size: its range, No value, and how it meets the layers beneath", async () => {
        const { session, store, layer } = await open("node.size");
        const popover = await openBinding(store, layer, "Size");
        await typeInto(within(popover).getByLabelText("Size from"), "2");
        await typeInto(within(popover).getByLabelText("Size to"), "6");
        await waitFor(() => {
            assert.deepEqual(bindingOf(session, layer, "node.size").range, [2, 6], "both ends written together");
        });

        await pick(popover, /^No value/, /^Use one value/);
        await waitFor(() => {
            const { missing } = bindingOf(session, layer, "node.size");
            assert.isObject(missing, "No value gives one value");
        });
        await pick(popover, /^No value/, /^Leave as is/);
        await waitFor(() => {
            assert.equal(bindingOf(session, layer, "node.size").missing, "skip");
        });

        await pick(popover, /^How size meets the layers beneath/, /^Multiply/);
        await waitFor(() => {
            assert.equal(bindingOf(session, layer, "node.size").combine, "multiply");
        });
        await pick(popover, /^How size meets the layers beneath/, /^Replace/);
        await waitFor(() => {
            assert.isUndefined(bindingOf(session, layer, "node.size").combine);
        });
    });
});
