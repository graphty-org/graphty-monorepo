/**
 * Style panel v2 dims what graphty-element draws nothing for in the view shown now, from the element's own
 * view facts, on the REAL graphty-element and real input: a line, a "+" item and a Shaders gallery tile that
 * only draw in one view are dimmed in the other with a tooltip saying which, never hidden or removed, and
 * switching the view from the toolbar's Mode menu turns that around.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import { assert, describe, it } from "vitest";
import { userEvent } from "vitest/browser";

import { withFeatures } from "../../../test/features";
import { screen, waitFor, within } from "../../../test/test-utils";
import { showKind } from "./kindTab";
import { openGraph, openStyle, sectionOf } from "./v2Harness";

/**
 * Switches the view from the toolbar's Mode menu, as a reader does.
 * @param to - the view.
 */
async function switchView(to: "2D" | "3D"): Promise<void> {
    const toolbar = screen.getByRole("toolbar", { name: "Canvas tools" });
    await userEvent.click(within(toolbar).getByRole("button", { name: /^Mode, / }));
    const menu = await screen.findByRole("menu", { name: /^Mode/ });
    await userEvent.click(within(menu).getByRole("menuitemradio", { name: new RegExp(`^${to}`) }));
    await waitFor(() => {
        assert.isNotNull(within(toolbar).queryByRole("button", { name: `Mode, ${to}` }));
    });
}

/**
 * The tooltip of a dimmed line or item (or of the dimmed row around it), or null when it is not dimmed.
 * @param element - the line or item.
 * @returns its tooltip words.
 */
function dimmed(element: Element): string | null {
    return element.closest("[data-dimmed]")?.getAttribute("title") ?? null;
}

/**
 * Waits for a line in a part of the page.
 * @param root - where it is.
 * @param channel - its channel.
 * @returns the line.
 */
async function lineOf(root: ParentNode, channel: string): Promise<HTMLElement> {
    return waitFor(() => {
        const found = root.querySelector<HTMLElement>(`.ws-row[data-line="${channel}"]`);
        assert.isNotNull(found);
        return found;
    });
}

describe("Style panel v2 dims what draws nothing in this view", () => {
    withFeatures(["file-styles", "style-panel-v2"]);

    it("Stacking draws only in 2D and Lift only in 3D: each is dimmed in the other view, never removed", async () => {
        await openGraph();
        await switchView("2D");
        const tab = await openStyle("Key people");
        const order = sectionOf(tab, "node-order");
        await userEvent.click(within(order).getByRole("button", { name: /^Add to node order/ }));
        await userEvent.click(await screen.findByRole("menuitem", { name: "Order" }));
        const stacking = await lineOf(order, "node.zIndex");
        assert.isNull(dimmed(stacking), "in 2D Stacking is not dimmed");

        await switchView("3D");
        await waitFor(() => {
            assert.equal(dimmed(order.querySelector('.ws-row[data-line="node.zIndex"]') ?? order), "2D only");
        });

        await openStyle("Links");
        await showKind("edge");
        const line = sectionOf(await screen.findByTestId("style-tab"), "edge-line");
        await userEvent.click(within(line).getByRole("button", { name: "Edge line settings" }));
        const pop = await waitFor(() => {
            const found = document.querySelector<HTMLElement>("[data-thing-popover]");
            assert.isNotNull(found);
            return found;
        });
        const lift = await lineOf(pop, "edge.lift");
        assert.isNull(dimmed(lift), "in 3D Lift is not dimmed");
        await userEvent.keyboard("{Escape}");
        await switchView("2D");
        await userEvent.click(within(line).getByRole("button", { name: "Edge line settings" }));
        await waitFor(() => {
            const again = document.querySelector('[data-thing-popover] .ws-row[data-line="edge.lift"]');
            assert.isNotNull(again, "in 2D Lift is still there");
            assert.equal(dimmed(again), "3D only", "dimmed, its tooltip saying why");
        });
    });

    it("Raised edge draws only in 2D: in 3D its '+' item and its row are dimmed '2D only', in 2D they are not (E441)", async () => {
        const { session, nodes } = await openGraph();
        // A raised edge is a flat shape's: on a sphere it is dimmed in both views.
        await session.styles.update(nodes, { set: { "node.color": "#E8590C", "node.shape": "rectangle" } });
        await session.styles.settled();
        await switchView("3D");
        const tab = await openStyle("Key people");
        const border = sectionOf(tab, "node-border");
        await userEvent.click(within(border).getByRole("button", { name: /^Add to node border/ }));
        const item = await screen.findByRole("menuitem", { name: "Raised edge" });
        assert.equal(dimmed(item), "2D only", "the '+' item is dimmed in 3D");
        await userEvent.click(item);
        await waitFor(() => {
            assert.isDefined(session.styles.get(nodes)?.set?.["node.raisedBorderWidth"], "a dimmed item still adds");
        });
        const row = await waitFor(() => {
            const found = border.querySelector<HTMLElement>('[data-thing="raised"]');
            assert.isNotNull(found);
            return found;
        });
        await waitFor(() => {
            const line = row.querySelector('.ws-row[data-line="node.raisedBorderWidth"]') ?? row;
            assert.equal(dimmed(line), "2D only", "the row is dimmed in 3D");
        });
        await switchView("2D");
        await waitFor(() => {
            const line = border.querySelector('[data-thing="raised"] .ws-row[data-line="node.raisedBorderWidth"]');
            assert.isNotNull(line);
            assert.isNull(dimmed(line), "not dimmed in 2D");
        });
    });

    it("a '+' item for a style that draws in one view only is dimmed in the other, and still adds", async () => {
        const { session, nodes } = await openGraph();
        await switchView("3D");
        const tab = await openStyle("Key people");
        const order = sectionOf(tab, "node-order");
        await userEvent.click(within(order).getByRole("button", { name: /^Add to node order/ }));
        const item = await screen.findByRole("menuitem", { name: "Order" });
        assert.equal(dimmed(item), "2D only");
        await userEvent.click(item);
        await waitFor(() => {
            assert.isDefined(session.styles.get(nodes)?.set?.["node.zIndex"], "a dimmed item still adds");
        });
    });

    it("a custom shader declaring 3D only is dimmed in 2D in the Shaders gallery, as a built-in one is", async () => {
        const { session } = await openGraph();
        const added = await session.shaders.add(`/* graphty-shader 1
{"id":"user/lamp","name":"Lamp","place":"over","views":["3d"],"params":[]}
*/
vec4 shade(NodeInput n) { return n.color; }
`);
        assert.isTrue(added.ok, JSON.stringify(added));
        await switchView("2D");
        const tab = await openStyle("Key people");
        const shaders = sectionOf(tab, "node-shaders");
        const open = async (): Promise<HTMLElement> => {
            await userEvent.click(within(shaders).getByRole("button", { name: /^Add to node shaders/ }));
            await userEvent.click(await screen.findByRole("menuitem", { name: "Around" }));
            return waitFor(() => {
                const found = document.querySelector<HTMLElement>('.ws-gallery-tile[data-shader="user/lamp"]');
                assert.isNotNull(found, "the custom shader is in the gallery");
                return found;
            });
        };
        const tile = await open();
        assert.isTrue(tile.hasAttribute("data-dimmed"), "dimmed in 2D");
        assert.notEqual(tile.getAttribute("aria-disabled"), "true", "still pickable");
        await userEvent.keyboard("{Escape}");
        await switchView("3D");
        const again = await open();
        assert.isFalse(again.hasAttribute("data-dimmed"), "not dimmed in 3D");
    });
});
