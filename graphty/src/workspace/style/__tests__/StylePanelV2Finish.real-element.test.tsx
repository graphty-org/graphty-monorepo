/**
 * Style panel v2's Finish (ia-design 2) on the REAL graphty-element, driven by real clicks: node Fill's "+"
 * lists Fill | Image | Stripes, Pie, Chart, Finish; "+ Finish" in 3D draws a row whose Shading value list picks
 * Smooth, Flat or Unlit over `node.flat` and `node.unlit`, and each pick changes the picture; in 2D the "+"
 * item and the row are dimmed "3D only". The Shape's Mesh keeps Detail and Wireframe.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import { assert, describe, it } from "vitest";
import { userEvent } from "vitest/browser";

import { withFeatures } from "../../../test/features";
import { screen, waitFor, within } from "../../../test/test-utils";
import { openGraph, openStyle, picture, pixelsApart, sectionOf, switchView, written } from "./v2Harness";

/**
 * The tooltip of a dimmed line or item (or of the dimmed row around it), or null when it is not dimmed.
 * @param element - the line or item.
 * @returns its tooltip words.
 */
function dimmed(element: Element): string | null {
    return element.closest("[data-dimmed]")?.getAttribute("title") ?? null;
}

/**
 * Picks a Shading choice on the Finish row by real clicks.
 * @param row - the Finish row.
 * @param name - the choice.
 */
async function pickShading(row: HTMLElement, name: string): Promise<void> {
    const input = row.querySelector<HTMLInputElement>('.ws-row[data-line="node.flat"] input');
    assert.isNotNull(input, "the Shading list");
    await userEvent.click(input);
    await userEvent.click(await screen.findByRole("option", { name }));
}

describe("Style panel v2's Finish", () => {
    withFeatures(["file-styles", "style-panel-v2"]);

    it("Fill's '+' lists Finish last; in 3D its Shading picks Flat and Unlit and the picture changes", async () => {
        const { session, element, nodes } = await openGraph();
        await session.styles.update(nodes, {
            set: { "node.color": "#E8590C", "node.shape": "sphere", "node.size": 3 },
        });
        await session.styles.settled();
        await switchView("3D");
        const tab = await openStyle("Key people");
        const fill = sectionOf(tab, "node-fill");
        await userEvent.click(within(fill).getByRole("button", { name: /^Add to node fill/ }));
        const items = (await screen.findAllByRole("menuitem")).map((item) => item.textContent.trim());
        assert.deepEqual(items, ["Image", "Stripes", "Pie", "Chart", "Finish"], "Fill is set, so the rest in order");
        const item = await screen.findByRole("menuitem", { name: "Finish" });
        assert.isNull(dimmed(item), "not dimmed in 3D");
        await userEvent.click(item);
        const row = await waitFor(() => {
            const found = fill.querySelector<HTMLElement>('[data-thing="finish"]');
            assert.isNotNull(found);
            return found;
        });
        await waitFor(() => {
            assert.strictEqual(written(session, nodes, "node.flat"), false, "+ starts Smooth");
        });
        const smooth = await picture(element);

        await pickShading(row, "Flat");
        await waitFor(() => {
            assert.strictEqual(written(session, nodes, "node.flat"), true);
            assert.strictEqual(written(session, nodes, "node.unlit"), false);
        });
        const flat = await picture(element);
        assert.isAbove(pixelsApart(smooth, flat), 0, "Flat changes the picture");

        await pickShading(row, "Unlit");
        await waitFor(() => {
            assert.strictEqual(written(session, nodes, "node.unlit"), true);
            assert.strictEqual(written(session, nodes, "node.flat"), false);
        });
        const unlit = await picture(element);
        assert.isAbove(pixelsApart(flat, unlit), 0, "Unlit changes the picture");

        // The Shape's Mesh keeps Detail and Wireframe; Shading is no Shape setting.
        const shape = await waitFor(() => {
            const found = sectionOf(tab, "node-shape").querySelector<HTMLElement>('[data-thing="shape"]');
            assert.isNotNull(found);
            return found;
        });
        await userEvent.click(within(shape).getByRole("button", { name: /^Node shape settings/ }));
        const pop = await waitFor(() => {
            const found = document.querySelector<HTMLElement>("[data-thing-popover]");
            assert.isNotNull(found);
            return found;
        });
        await userEvent.click(within(pop).getByRole("button", { name: "Add to node shape settings" }));
        await userEvent.click(await screen.findByRole("menuitem", { name: "Mesh" }));
        await waitFor(() => {
            assert.isNotNull(pop.querySelector('.ws-row[data-line="node.meshDetail"]'), "Detail");
            assert.isNotNull(pop.querySelector('.ws-row[data-line="node.wireframe"]'), "Wireframe");
        });
        assert.isNull(pop.querySelector('.ws-row[data-line="node.flat"], .ws-row[data-line="node.unlit"]'));
    });

    it("in 2D the '+' item and the row are dimmed '3D only'", async () => {
        const { session, nodes } = await openGraph();
        await session.styles.update(nodes, { set: { "node.color": "#E8590C" } });
        await session.styles.settled();
        await switchView("2D");
        const tab = await openStyle("Key people");
        const fill = sectionOf(tab, "node-fill");
        await userEvent.click(within(fill).getByRole("button", { name: /^Add to node fill/ }));
        const item = await screen.findByRole("menuitem", { name: "Finish" });
        assert.equal(dimmed(item), "3D only", "the '+' item is dimmed in 2D");
        await userEvent.click(item);
        await waitFor(() => {
            const line = fill.querySelector('[data-thing="finish"] .ws-row[data-line="node.flat"]');
            assert.isNotNull(line, "the row is drawn");
            assert.equal(dimmed(line), "3D only", "dimmed, its tooltip saying why");
        });
    });
});
