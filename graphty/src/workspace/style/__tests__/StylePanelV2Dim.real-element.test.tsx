/**
 * Style panel v2 on the REAL graphty-element and real input, from the element's own view facts: a setting drawn only
 * in one view is hidden in the other -- its row, its line, its "+" item, its kind and its Shaders gallery tile -- and
 * what the layer holds for it stays, shown again once the toolbar's Mode menu switches back. Whatever draws nothing
 * for another reason (a layer above, a 3D layout under a Lift) is dimmed with a tooltip saying why.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import { assert, describe, it } from "vitest";
import { userEvent } from "vitest/browser";

import { withFeatures } from "../../../test/features";
import { screen, waitFor, within } from "../../../test/test-utils";
import { showKind } from "./kindTab";
import { openGraph, openGroup, openShaderList, openStyle, sectionOf, switchView } from "./v2Harness";

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

/**
 * The names a section's "+" menu offers, by real clicks; the menu is closed again.
 * @param section - the section.
 * @param plus - its "+" button's name.
 * @returns the items' names.
 */
async function plusItems(section: HTMLElement, plus: RegExp): Promise<string[]> {
    await userEvent.click(within(section).getByRole("button", { name: plus }));
    const names = (await screen.findAllByRole("menuitem")).map((item) => item.textContent.trim());
    await userEvent.keyboard("{Escape}");
    return names;
}

describe("Style panel v2 hides what draws only in the other view", () => {
    withFeatures(["file-styles", "style-panel-v2"]);

    it("Raised edge (2D) and Finish (3D) come and go with the view; a raised edge set in 2D survives 3D", async () => {
        const { session, nodes } = await openGraph();
        // A raised edge is a flat shape's bevel.
        await session.styles.update(nodes, { set: { "node.color": "#E8590C", "node.shape": "rectangle" } });
        await session.styles.settled();
        await switchView("2D");
        const tab = await openStyle("Key people");
        const effects = sectionOf(tab, "node-effects");
        const fill = sectionOf(tab, "node-fill");
        const effectsPlus = /^Add to node effects/;
        const fillPlus = /^Add to node fill/;
        assert.include(await plusItems(effects, effectsPlus), "Raised edge", "offered in 2D");
        assert.notInclude(await plusItems(fill, fillPlus), "Finish", "not offered in 2D");

        // In 2D, "+ Raised edge" adds it, by real clicks.
        await userEvent.click(within(effects).getByRole("button", { name: effectsPlus }));
        await userEvent.click(await screen.findByRole("menuitem", { name: "Raised edge" }));
        await waitFor(() => {
            assert.isNotNull(effects.querySelector('[data-thing="raised"]'), "its row is drawn");
        });
        await waitFor(() => {
            assert.isDefined(session.styles.get(nodes)?.set?.["node.raisedBorderWidth"]);
        });
        const width = session.styles.get(nodes)?.set?.["node.raisedBorderWidth"];

        await switchView("3D");
        await waitFor(() => {
            assert.isNull(effects.querySelector('[data-thing="raised"]'), "the row is hidden in 3D");
        });
        assert.notInclude(await plusItems(effects, effectsPlus), "Raised edge", "not offered in 3D");
        assert.include(await plusItems(fill, fillPlus), "Finish", "offered in 3D");
        assert.strictEqual(
            session.styles.get(nodes)?.set?.["node.raisedBorderWidth"],
            width,
            "the layer keeps its raised edge",
        );

        await switchView("2D");
        await waitFor(() => {
            const line = effects.querySelector('[data-thing="raised"] .ws-row[data-line="node.raisedBorderWidth"]');
            assert.isNotNull(line, "shown again in 2D");
            assert.isNull(line.closest("[data-dimmed]"), "and not dimmed");
        });
        assert.strictEqual(session.styles.get(nodes)?.set?.["node.raisedBorderWidth"], width, "unchanged");
        assert.notInclude(await plusItems(fill, fillPlus), "Finish", "hidden again in 2D");
    });

    it("Lift draws only out of a flat layout in 3D: dimmed over a 3D layout, hidden in 2D", async () => {
        const { session } = await openGraph();
        await switchView("3D");
        await openStyle("Links");
        await showKind("edge");
        const line = sectionOf(await screen.findByTestId("style-tab"), "edge-line");
        // Lift is in the Edge line pop-over's Shape group (design "Input rules").
        const openLine = async (): Promise<HTMLElement> => {
            await userEvent.click(within(line).getByRole("button", { name: "Edge line settings" }));
            return openGroup(
                await waitFor(() => {
                    const found = document.querySelector<HTMLElement>("[data-thing-popover]");
                    assert.isNotNull(found);
                    return found;
                }),
                "Shape",
            );
        };
        assert.strictEqual(session.layout.arrangedDimension, "3d");
        const over3d = await lineOf(await openLine(), "edge.lift");
        assert.equal(dimmed(over3d), "Only for a flat layout", "a 3D layout has no plane to lift out of");
        await userEvent.keyboard("{Escape}");
        await userEvent.keyboard("{Escape}");
        // A flat layout drawn in the 3D view.
        await session.layout.set("fixed", { options: { dim: 2 } });
        assert.strictEqual(session.layout.arrangedDimension, "2d");
        const lift = await lineOf(await openLine(), "edge.lift");
        assert.isNull(dimmed(lift), "over a flat layout in 3D Lift is not dimmed");
        await userEvent.keyboard("{Escape}");
        await userEvent.keyboard("{Escape}");
        await switchView("2D");
        const group = await openLine();
        assert.isNull(group.querySelector('.ws-row[data-line="edge.lift"]'), "in 2D Lift is hidden");
    });

    it("node Plate: hidden from '+' in 3D, offered in 2D, and a Behind plate's row hidden in 3D (E669)", async () => {
        const { session, nodes } = await openGraph();
        const tab = await openStyle("Key people");
        await showKind("node");
        const effects = sectionOf(tab, "node-effects");
        const plus = /^Add to node effects/;
        await switchView("3D");
        assert.notInclude(await plusItems(effects, plus), "Plate", "not offered in 3D");
        await switchView("2D");
        assert.include(await plusItems(effects, plus), "Plate", "offered in 2D");
        await session.styles.update(nodes, { set: { "node.underlayColor": "#ff0000" } });
        await session.styles.settled();
        await waitFor(() => {
            assert.isNotNull(effects.querySelector('[data-thing="plate"]'), "the plate's row in 2D");
        });
        await switchView("3D");
        await waitFor(() => {
            assert.isNull(effects.querySelector('[data-thing="plate"]'), "hidden in 3D");
        });
        assert.notInclude(await plusItems(effects, plus), "Plate", "and no Over plate to add");
        assert.strictEqual(session.styles.get(nodes)?.set?.["node.underlayColor"], "#ff0000", "the layer keeps it");
    });

    it("a custom shader declaring 3D only is not in the Shaders gallery in 2D, and is in 3D", async () => {
        const { session } = await openGraph();
        const added = await session.shaders.add(`/* graphty-shader 1
{"id":"user/lamp","name":"Lamp","place":"over","views":["3d"],"params":[]}
*/
vec4 shade(NodeInput n) { return n.color; }
`);
        assert.isTrue(added.ok, JSON.stringify(added));
        await switchView("2D");
        const tab = await openStyle("Key people");
        // Effects "+" > Shader opens the one list of the node's shaders (E381, E668).
        await openShaderList(tab, "node");
        await waitFor(() => {
            assert.isNotNull(document.querySelector(".ws-gallery-tile"), "the gallery is open");
        });
        assert.isNull(document.querySelector('.ws-gallery-tile[data-shader="user/lamp"]'), "hidden in 2D");
        await userEvent.keyboard("{Escape}");
        await switchView("3D");
        await openShaderList(tab, "node");
        await waitFor(() => {
            assert.isNotNull(document.querySelector('.ws-gallery-tile[data-shader="user/lamp"]'), "listed in 3D");
        });
    });

    it("edge Outline: '+' Outline is Under line in both views; with it drawn, Over line is offered in 2D only (E669, E677)", async () => {
        const { session, edges } = await openGraph();
        const tab = await openStyle("Links");
        await showKind("edge");
        const line = sectionOf(tab, "edge-line");
        const plus = /^Add to edge line/;
        const offersOutline = async (): Promise<boolean> =>
            (await plusItems(line, plus)).some((name) => name.startsWith("Outline"));
        await switchView("3D");
        assert.isTrue(await offersOutline(), "Under line draws in 3D (E677)");
        await session.styles.update(edges, { set: { "edge.outlineColor": "#ff0000", "edge.outlineWidth": 2 } });
        await session.styles.settled();
        await waitFor(() => {
            assert.isNotNull(line.querySelector('[data-thing="outline"]'));
        });
        assert.isFalse(await offersOutline(), "Over line, the free kind, is hidden in 3D");
        await switchView("2D");
        assert.isTrue(await offersOutline(), "offered in 2D");
    });

    it("a Shape a layer above draws over on every node is dimmed, naming that layer, and still takes a pick", async () => {
        const { session, nodes } = await openGraph();
        await session.styles.update(nodes, { set: { "node.color": "#E8590C", "node.shape": "box" } });
        const { id: above } = await session.styles.add({
            name: "Squares",
            target: "node",
            selector: { match: "everything" },
            set: { "node.shape": "rectangle" },
        });
        await session.styles.settled();
        const tab = await openStyle("Key people");
        const shape = sectionOf(tab, "node-shape");
        const button = await within(shape).findByRole("button", { name: "Node shape, Box" });
        await waitFor(() => {
            assert.equal(dimmed(button), "Squares draws over it");
        });
        await userEvent.click(button);
        await userEvent.click(await screen.findByRole("option", { name: "Cone" }));
        await waitFor(() => {
            assert.equal(session.styles.get(nodes)?.set?.["node.shape"], "cone", "a dimmed Shape still writes");
        });
        await session.styles.remove(above);
        await session.styles.settled();
        await waitFor(() => {
            assert.isNull(dimmed(within(shape).getByRole("button", { name: "Node shape, Cone" })));
        });
    });

    it("a shader drawn in the shapes' place has no basic Shape line in its pop-over: it would draw nothing", async () => {
        const { session, nodes } = await openGraph();
        await session.styles.update(nodes, { set: { "node.shaders": [{ shader: "icon-sticker" }] } });
        await session.styles.settled();
        const tab = await openStyle("Key people");
        const shape = sectionOf(tab, "node-shape");
        await userEvent.click(await within(shape).findByRole("button", { name: "Node shape settings" }));
        const popover = await waitFor(() => {
            const found = document.querySelector<HTMLElement>("[data-thing-popover]");
            assert.isNotNull(found);
            return found;
        });
        await lineOf(popover, "node.shapeRotation");
        assert.isNull(popover.querySelector('.ws-row[data-line="node.shape"]'));
    });
});
