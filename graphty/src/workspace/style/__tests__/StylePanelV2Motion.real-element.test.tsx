/**
 * Style panel v2's Animation, Force curves and Glow strength on the REAL graphty-element, by real clicks and
 * typing: an edge's Animation, added from Effects' "+", starts moving and a later picture of the line differs
 * from an earlier one, in 3D and 2D; Force curves, from Route's "+", writes the
 * curvature it needs and bows the edges differently from a plain curve, inside the canvas; and a glow's
 * strength typed from 0.5 to 3 changes the pixels around a node, and takes a value past its suggested top.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import { channelDescriptor } from "@graphty/graphty-element/catalog";
import { assert, describe, it } from "vitest";
import { userEvent } from "vitest/browser";

import { withFeatures } from "../../../test/features";
import { screen, waitFor, within } from "../../../test/test-utils";
import { showKind } from "./kindTab";
import { openGraph, openStyle, picture, pixelsApart, sectionOf, written } from "./v2Harness";

/**
 * The graph's picture now, from the element's own screenshot, without waiting for a still frame (a moving
 * line never settles).
 * @param element - the element.
 * @returns its pixels.
 */
async function now(element: HTMLElementTagNameMap["graphty-element"]): Promise<ImageData> {
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
 * Opens a section's "+" menu and picks an item.
 * @param section - the section.
 * @param name - the item.
 * @returns the item's tooltip.
 */
async function addFrom(section: HTMLElement, name: string): Promise<string> {
    const plus = section.querySelector<HTMLElement>("[data-plus]");
    assert.isNotNull(plus);
    await userEvent.click(plus);
    const item = await screen.findByRole("menuitem", { name });
    const title = item.getAttribute("title") ?? "";
    await userEvent.click(item);
    return title;
}

/**
 * Pixels that differ in the outermost two-pixel frame of two pictures: something drawn past the canvas edge.
 * @param a - a picture.
 * @param b - another.
 * @returns the count.
 */
function edgePixelsApart(a: ImageData, b: ImageData): number {
    let apart = 0;
    for (let y = 0; y < a.height; y++) {
        for (let x = 0; x < a.width; x++) {
            if (x > 1 && y > 1 && x < a.width - 2 && y < a.height - 2) {
                continue;
            }
            const i = (y * a.width + x) * 4;
            if ([0, 1, 2].some((c) => Math.abs((a.data[i + c] ?? 0) - (b.data[i + c] ?? 0)) > 1)) {
                apart++;
            }
        }
    }
    return apart;
}

describe("Style panel v2's Animation, Force curves and Glow strength", () => {
    withFeatures(["file-styles", "style-panel-v2"]);

    it("Animation from Effects' '+' moves the line: a later picture differs from an earlier one, in 3D and 2D", async () => {
        const { session, element, edges } = await openGraph();
        await openStyle("Links");
        await showKind("edge");
        await addFrom(sectionOf(await screen.findByTestId("style-tab"), "edge-effects"), "Animation");
        await waitFor(() => {
            const speed = written(session, edges, "edge.animationSpeed");
            assert.isAbove(typeof speed === "number" ? speed : 0, 0, "it starts moving");
        });
        await userEvent.keyboard("{Escape}");
        // A thicker line shows more of its motion.
        await session.styles.update(edges, {
            set: { ...session.styles.get(edges)?.set, "edge.width": 6 },
        });
        for (const dimension of ["3d", "2d"] as const) {
            await session.layout.setDimension(dimension);
            const first = await now(element);
            // Waits for the line to move: a later picture differs from the first.
            await waitFor(async () => {
                assert.isAbove(pixelsApart(first, await now(element)), 0, `the line moves in ${dimension}`);
            });
        }
    });

    it("Force curves from Route's '+' bows the edges unlike a plain curve, inside the canvas", async () => {
        const { session, element, edges } = await openGraph();
        await session.data.addEdges([{ source: "a", target: "c" }]);
        await openStyle("Links");
        await showKind("edge");
        const before = await picture(element);
        const tab = await screen.findByTestId("style-tab");
        const route = sectionOf(tab, "edge-route");
        assert.match(await addFrom(route, "Force curves"), /physics/i, "its tooltip says what it does");
        await waitFor(() => {
            assert.isDefined(written(session, edges, "edge.supportModel"));
            assert.strictEqual(written(session, edges, "edge.curvature"), true, "with the curvature it needs");
        });
        await userEvent.keyboard("{Escape}");
        const force = await picture(element);
        assert.equal(edgePixelsApart(before, force), 0, "every edge stays inside the canvas");
        await session.styles.update(edges, { set: { "edge.color": "#E8590C", "edge.curvature": true } });
        const curved = await picture(element);
        assert.isAbove(pixelsApart(force, curved), 0, "force curves differ from a plain curve");
    });

    it("Glow strength typed from 0.5 to 3 changes the pixels around a node, and takes 6", async () => {
        const { session, element, nodes } = await openGraph();
        const tab = await openStyle("Key people");
        await addFrom(sectionOf(tab, "node-effects"), "Glow");
        const row = await waitFor(() => {
            const found = sectionOf(tab, "node-effects").querySelector<HTMLElement>('[data-thing="glow"]');
            assert.isNotNull(found);
            return found;
        });
        await userEvent.keyboard("{Escape}");
        await userEvent.click(within(row).getByRole("button", { name: /^Node glow settings/ }));
        const strength = await waitFor(() => {
            const found = document.querySelector<HTMLInputElement>(
                '[data-thing-popover] .ws-row[data-line="node.glowStrength"] input',
            );
            assert.isNotNull(found);
            return found;
        });
        const type = async (text: string, value: number): Promise<ImageData> => {
            await userEvent.click(strength);
            await userEvent.keyboard(`{Control>}a{/Control}${text}{Enter}`);
            await waitFor(() => {
                assert.equal(written(session, nodes, "node.glowStrength"), value);
            });
            return picture(element);
        };
        const faint = await type("0.5", 0.5);
        const strong = await type("3", 3);
        assert.isAbove(pixelsApart(faint, strong), 0, "a stronger glow draws differently");
        assert.isAbove(6, channelDescriptor("node.glowStrength")?.suggestedMax ?? Infinity);
        await type("6", 6);
    });
});
