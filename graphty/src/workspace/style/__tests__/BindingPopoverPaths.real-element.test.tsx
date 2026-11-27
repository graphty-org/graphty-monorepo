/**
 * The binding popover's less traveled paths on the REAL graphty-element, driven by real clicks and
 * keys: a column of colors' "More values than colors", the palette's reset, No value's one color
 * and the values read as colors; a color ramp's diverging palette with its midpoint,
 * Reverse palette and the No value chit; an edge step's Select these; and Change source closed by
 * Tab.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession, Layer } from "@graphty/graphty-element/session";
import { assert, describe, it } from "vitest";
import { type Locator, page, userEvent } from "vitest/browser";

import { render, screen, waitFor, within } from "../../../test/test-utils";
import { createWorkspaceStore, type WorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";
import type { DataBinding } from "../row";

/** Forty nodes, each a color of its own; the first eighteen scored 1 to 18, the rest with no score. */
const NODES = Array.from({ length: 40 }, (_, i) => ({
    id: `n${String(i)}`,
    tint: `#${(i * 6).toString(16).padStart(2, "0")}40A0`.toUpperCase(),
    ...(i < 18 ? { score: i + 1 } : {}),
}));
/** A ring, each edge weighted 1 to 40. */
const EDGES = NODES.map((node, i) => ({ source: node.id, target: NODES[(i + 1) % NODES.length].id, weight: i + 1 }));

type Channel = "node.color" | "edge.color";

/**
 * The workspace with the ring, and a layer binding one color to a value.
 * @param channel - the bound property.
 * @param binding - what it reads, and how.
 * @returns the session, the store and the layer.
 */
async function open(
    channel: Channel,
    binding: { by: string; scale?: "ordinal" },
): Promise<{ session: GraphSession; store: WorkspaceStore; layer: Layer }> {
    await page.viewport(1440, 900);
    const store = createWorkspaceStore({ project: { name: "Paths", id: 1 }, inspected: null });
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
        name: "Bound",
        target: channel === "node.color" ? "node" : "edge",
        selector: { match: "everything" },
        encode: { [channel]: binding },
    });
    await session.styles.settled();
    return { session, store, layer };
}

/**
 * Opens the layer's Style tab and its color's binding popover, by clicking the value pill.
 * @param store - the workspace store.
 * @param layer - the layer.
 * @param channel - the bound property.
 * @returns the popover.
 */
async function openBinding(store: WorkspaceStore, layer: Layer, channel: Channel): Promise<HTMLElement> {
    store.set({ inspected: { kind: "layer-row", id: layer.id } });
    const tab = await screen.findByTestId("style-tab", {});
    const pill = channel === "node.color" ? /^Node color: / : /^Edge color: /;
    await userEvent.click(page.elementLocator(tab).getByRole("button", { name: pill, exact: true }));
    return screen.findByRole("group", { name: "Color binding" });
}

/**
 * The binding the layer holds for its color.
 * @param session - the session.
 * @param layer - the layer.
 * @param channel - the property.
 * @returns the binding.
 */
function bindingOf(session: GraphSession, layer: Layer, channel: Channel): DataBinding {
    return session.styles.get(layer.id)?.encode?.[channel] as DataBinding;
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

describe("the binding popover's other paths on the real element", () => {
    it("a column of colors: More values than colors, the palette's reset, one color for No value, the values as colors", async () => {
        const { session, store, layer } = await open("node.color", { by: "data.tint", scale: "ordinal" });
        const popover = await openBinding(store, layer, "node.color");

        // Forty colors are more than the palette holds: extending it keeps the palette shown.
        const shown = (): string => {
            const box = within(popover).getByRole<HTMLInputElement>("combobox", { name: /^Palette/ });
            return box.value === "" ? box.placeholder : box.value;
        };
        const before = shown();
        await pick(popover, /^More values than colors/, /^Extend the palette/);
        await waitFor(() => {
            assert.equal(bindingOf(session, layer, "node.color").overflow, "extend");
            assert.equal(shown(), before, "the same palette, extended");
        });

        // A palette picked by name, then reset to the default.
        await userEvent.click(page.elementLocator(popover).getByRole("combobox", { name: /^Palette/ }));
        const other = (await screen.findAllByRole("option")).find((option) => option.textContent !== before);
        if (other === undefined) {
            throw new Error("only one palette is offered");
        }
        await userEvent.click(other);
        await waitFor(() => {
            assert.isString(bindingOf(session, layer, "node.color").palette, "the palette is named");
        });
        await userEvent.click(
            page.elementLocator(popover).getByRole("button", { name: /^Reset the .*palette to default/ }),
        );
        await waitFor(() => {
            assert.isUndefined(bindingOf(session, layer, "node.color").palette, "the reset clears the palette");
        });

        await pick(popover, /^No value/, /^Use one value/);
        await waitFor(() => {
            const { missing } = bindingOf(session, layer, "node.color");
            assert.match(missing === "skip" || missing === undefined ? "" : String(missing.value), /^#/, "a color");
        });
        const box = (): Locator => page.elementLocator(popover).getByRole("textbox", { name: /^Value color/ });
        await userEvent.click(box());
        await userEvent.keyboard("{Control>}a{/Control}#123456{Enter}");
        await waitFor(() => {
            assert.deepEqual(bindingOf(session, layer, "node.color").missing, { value: "#123456" });
        });

        // Read as written, the values paint themselves: no palette. "Use a palette" is offered back
        // but not clicked: it leaves an empty number ramp (#9622).
        await userEvent.click(
            page.elementLocator(popover).getByRole("button", { name: "Use the values as colors", exact: true }),
        );
        await waitFor(() => {
            assert.equal(bindingOf(session, layer, "node.color").scale, "passthrough");
            assert.isNull(
                within(popover).queryByRole("combobox", { name: /^Palette/ }),
                "no palette for colors as written",
            );
        });
        await within(popover).findByRole("button", { name: "Use a palette" });
    });

    it("a color ramp: a diverging palette's midpoint, Reverse palette, the No value chit", async () => {
        const { session, store, layer } = await open("node.color", { by: "data.score" });
        const popover = await openBinding(store, layer, "node.color");

        await pick(popover, /^Palette/, /^Purple to green/);
        await waitFor(() => {
            assert.equal(bindingOf(session, layer, "node.color").palette, "purple-green");
        });
        const midpoint = (): Locator =>
            page.elementLocator(popover).getByRole("textbox", { name: "Midpoint", exact: true });
        await userEvent.click(midpoint());
        await userEvent.keyboard("{Control>}a{/Control}5{Enter}");
        await waitFor(() => {
            assert.equal(bindingOf(session, layer, "node.color").midpoint, 5);
        });

        await userEvent.click(
            page.elementLocator(popover).getByRole("button", { name: "Reverse palette", exact: true }),
        );
        await waitFor(() => {
            assert.isTrue(bindingOf(session, layer, "node.color").reverse);
        });

        // Twenty-two nodes have no score: the chit gives them one color.
        await userEvent.click(page.elementLocator(popover).getByRole("button", { name: /^No value: 22/ }));
        await waitFor(() => {
            const { missing } = bindingOf(session, layer, "node.color");
            assert.isObject(missing, "the chit paints the nodes with no score");
        });
    });

    it("an edge step's Select these selects its edges; Change source closes on Tab", async () => {
        const { session, store, layer } = await open("edge.color", { by: "data.weight" });
        const popover = await openBinding(store, layer, "edge.color");
        await pick(popover, /^Scale/, /^Equal bins/);
        const steps = await within(popover).findByRole("list", { name: "Steps" });
        const first = within(steps).getAllByRole("listitem")[0];
        const count = Number.parseInt((first.getAttribute("aria-label") ?? "").split(", ").pop() ?? "", 10);
        await userEvent.click(page.elementLocator(first).getByRole("button", { name: / actions$/ }));
        await userEvent.click(page.elementLocator(popover).getByRole("menuitem", { name: /^Select these / }));
        await waitFor(() => {
            assert.equal(session.selection.edges.length, count, "the step's edges are selected");
            assert.isAbove(session.selection.nodes.length, 0, "with their end nodes");
        });

        const again = await openBinding(store, layer, "edge.color");
        const change = within(again).getByRole("button", { name: "Change source" });
        await userEvent.click(page.elementLocator(again).getByRole("button", { name: "Change source", exact: true }));
        await within(again).findByRole("group", { name: "Change source" });
        await userEvent.keyboard("{Tab}");
        await waitFor(() => {
            assert.isNull(within(again).queryByRole("group", { name: "Change source" }), "the list closes");
            assert.equal(change.getAttribute("aria-expanded"), "false");
        });
    });
});
