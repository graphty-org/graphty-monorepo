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
import { openGraph, openShaderList, openStyle, sectionOf, switchView } from "./v2Harness";

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

    it("Lift draws only in 3D: it is dimmed in 2D, never removed", async () => {
        await openGraph();
        await switchView("3D");
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
        const border = sectionOf(tab, "node-effects");
        await userEvent.click(within(border).getByRole("button", { name: /^Add to node effects/ }));
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

    // A node's Plate (its underlay and overlay, E669) and an edge's Overlay draw only in 2D.
    for (const [side, names] of [
        ["node", ["Plate"]],
        ["edge", ["Overlay"]],
    ] as const) {
        it(`${side} ${names.join(" and ")}: in 3D the '+' items are dimmed '2D only', in 2D not (E669)`, async () => {
            await openGraph();
            const tab = await openStyle(side === "node" ? "Key people" : "Links");
            await showKind(side);
            const effects = sectionOf(tab, `${side}-effects`);
            const items = async (): Promise<(string | null)[]> => {
                await userEvent.click(
                    within(effects).getByRole("button", { name: new RegExp(`^Add to ${side} effects`) }),
                );
                const found: (string | null)[] = [];
                for (const name of names) {
                    found.push(dimmed(await screen.findByRole("menuitem", { name })));
                }
                await userEvent.keyboard("{Escape}");
                return found;
            };
            await switchView("3D");
            assert.deepEqual(
                await items(),
                names.map(() => "2D only"),
                "dimmed in 3D",
            );
            await switchView("2D");
            assert.deepEqual(
                await items(),
                names.map(() => null),
                "not dimmed in 2D",
            );
        });
    }

    it("node Plate: with a Behind plate on the layer, the '+' item adding Over is still dimmed '2D only' in 3D (E669)", async () => {
        const { session, nodes } = await openGraph();
        await session.styles.update(nodes, { set: { "node.underlayColor": "#ff0000" } });
        await session.styles.settled();
        const tab = await openStyle("Key people");
        await showKind("node");
        await switchView("3D");
        const effects = sectionOf(tab, "node-effects");
        await userEvent.click(within(effects).getByRole("button", { name: /^Add to node effects/ }));
        assert.equal(dimmed(await screen.findByRole("menuitem", { name: "Plate" })), "2D only");
        await userEvent.keyboard("{Escape}");
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
        const open = async (): Promise<HTMLElement> => {
            // Effects "+" > Shader opens the one list of the node's shaders (E381, E668).
            await openShaderList(tab, "node");
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
