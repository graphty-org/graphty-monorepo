/**
 * Style panel v2's Record on the REAL graphty-element, by real clicks and typing: fields added from the panel
 * carry no position (graphty-element places each a line below the one before), and the graph draws them as
 * separate lines, one under another, on the node.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import { readChannelItems } from "@graphty/graphty-element/catalog";
import { assert, describe, it } from "vitest";
import { userEvent } from "vitest/browser";

import { withFeatures } from "../../../test/features";
import { screen, waitFor, within } from "../../../test/test-utils";
import { openGraph, openStyle, picture, sectionOf, written } from "./v2Harness";

/**
 * How many separate bands of dark ink (rows holding letters) cross the canvas within a node's width, top to
 * bottom.
 * @param image - the picture.
 * @param element - the element, for where the node is.
 * @param node - the node.
 * @returns the count.
 */
function inkBands(image: ImageData, element: HTMLElementTagNameMap["graphty-element"], node: string): number {
    const at = element.nodeScreenPosition(node);
    assert.isTrue(at?.visible, `${node} is on screen`);
    const scale = image.width / element.clientWidth;
    const cx = (at?.x ?? 0) * scale;
    const r = (at?.radius ?? 0) * scale;
    let bands = 0;
    let inside = false;
    for (let y = 0; y < image.height; y++) {
        let inked = false;
        for (let x = Math.max(0, Math.floor(cx - r)); x < Math.min(image.width, cx + r) && !inked; x++) {
            const i = (y * image.width + x) * 4;
            inked = 0.299 * image.data[i] + 0.587 * image.data[i + 1] + 0.114 * image.data[i + 2] < 120;
        }
        if (inked && !inside) {
            bands++;
        }
        inside = inked;
    }
    return bands;
}

describe("Style panel v2's Record", () => {
    withFeatures(["file-styles", "style-panel-v2"]);

    it("three fields added from the panel carry no position and draw as three lines, one under another", async () => {
        const { session, element, nodes } = await openGraph();
        // One large white box filling the view, so its lines of words can be read off the picture.
        await session.data.removeNodes(["b", "c"]);
        await session.styles.update(nodes, { set: { "node.color": "#FFFFFF", "node.size": 4, "node.shape": "box" } });
        // Room around it: the fields stack down from its middle, past its bottom edge.
        await session.config.set({ framing: { extent: "centers", padding: 300 } });
        element.zoomToFit();
        const tab = await openStyle("Key people");
        const text = sectionOf(tab, "node-text");
        await userEvent.click(within(text).getByRole("button", { name: /^Add to node text/ }));
        await userEvent.click(await screen.findByRole("menuitem", { name: "Record" }));
        for (const [at, words] of ["AAAA", "BBBB", "CCCC"].entries()) {
            if (at > 0) {
                await userEvent.click(await screen.findByRole("button", { name: "Add field" }));
            }
            await userEvent.click(await screen.findByRole("textbox", { name: `Field ${String(at + 1)} text` }));
            // A new field starts with words (design "Input rules"), typed over.
            await userEvent.keyboard(`{Control>}a{/Control}${words}{Enter}`);
            await waitFor(() => {
                assert.lengthOf(
                    readChannelItems("node.shapeTexts", written(session, nodes, "node.shapeTexts")),
                    at + 1,
                );
            });
        }
        await userEvent.keyboard("{Escape}");
        const fields = readChannelItems("node.shapeTexts", written(session, nodes, "node.shapeTexts"));
        assert.deepEqual(
            fields.map((field) => field.text),
            ["AAAA", "BBBB", "CCCC"],
        );
        for (const field of fields) {
            assert.isUndefined(field.x, `${field.text} has no x`);
            assert.isUndefined(field.y, `${field.text} has no y`);
        }
        assert.isAtLeast(inkBands(await picture(element), element, "a"), 3, "three lines of words on the node");
    });
});
