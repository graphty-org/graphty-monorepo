/**
 * The REAL graphty-element drawn with canary's site configuration (sites/canary.json, read from the
 * file, so an experiment added to canary later is tested here too): the cosmograph experiment puts
 * the element on its batched render path with the app's limits, and a sample opens into an element
 * already drawn. Two bugs drew nothing there while every bookkeeping check passed: a click on a
 * node hid most of the graph (#9228, #9226) and College football lost every edge after a switch to
 * 2D (#9223). These read the picture, from the element's own screenshot.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession } from "@graphty/graphty-element/session";
import { assert, beforeAll, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import canary from "../../../../sites/canary.json";
import { withFeatures } from "../../../test/features";
import { openSampleFromStart } from "../../../test/open";
import { screen, waitFor, within } from "../../../test/test-utils";

withFeatures(canary.features);

type Element = HTMLElementTagNameMap["graphty-element"];

beforeAll(async () => {
    await page.viewport(1440, 900);
});

/**
 * The project's element, settled on its final picture.
 * @returns the element.
 */
async function settled(): Promise<Element> {
    const element = document.querySelector<Element>("graphty-element:not([data-start-page])");
    assert.isNotNull(element);
    if (element === null) {
        throw new Error("no element");
    }
    await element.waitForSettled();
    await element.waitForStableFrame();
    return element;
}

/**
 * The element's picture, and a test for ink (anything but the background) at a CSS point.
 * @param element - the element.
 * @returns whether a CSS point, or any pixel within `reach` of it, is not background.
 */
async function picture(element: Element): Promise<(x: number, y: number, reach: number) => number> {
    const shot = await element.captureScreenshot({ format: "png" });
    const bitmap = await createImageBitmap(shot.blob);
    const scale = bitmap.width / element.clientWidth;
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const context = canvas.getContext("2d");
    if (context === null) {
        throw new Error("no 2d context");
    }
    context.drawImage(bitmap, 0, 0);
    const { data, width, height } = context.getImageData(0, 0, bitmap.width, bitmap.height);
    const at = (px: number, py: number): number => (py * width + px) * 4;
    const bg = [data[at(1, 1)], data[at(1, 1) + 1], data[at(1, 1) + 2]];
    // The share of the pixels within `reach` CSS pixels of the point that are ink.
    return (x, y, reach) => {
        const r = Math.max(1, Math.round(reach * scale));
        let ink = 0;
        let all = 0;
        for (let dy = -r; dy <= r; dy++) {
            for (let dx = -r; dx <= r; dx++) {
                const px = Math.round(x * scale) + dx;
                const py = Math.round(y * scale) + dy;
                if (dx * dx + dy * dy > r * r || px < 0 || py < 0 || px >= width || py >= height) {
                    continue;
                }
                all++;
                const i = at(px, py);
                const diff = Math.abs(data[i] - bg[0]) + Math.abs(data[i + 1] - bg[1]) + Math.abs(data[i + 2] - bg[2]);
                ink += diff > 30 ? 1 : 0;
            }
        }
        return all === 0 ? 0 : ink / all;
    };
}

/**
 * How many nodes are drawn: most of the disc inside each node's drawn outline is ink, which the
 * thin edges ending on the center of a node that is not drawn do not fill.
 * @param element - the element.
 * @param session - its session.
 * @returns the count.
 */
async function drawnNodes(element: Element, session: GraphSession): Promise<number> {
    const ink = await picture(element);
    return session.data.nodes().filter((node) => {
        const at = element.nodeScreenPosition(node.id);
        return at !== undefined && ink(at.x, at.y, at.radius * 0.6) >= 0.6;
    }).length;
}

/**
 * The share of edges with ink at their midpoint.
 * @param element - the element.
 * @param session - its session.
 * @returns 0 to 1.
 */
async function inkedEdges(element: Element, session: GraphSession): Promise<number> {
    const ink = await picture(element);
    const edges = session.data.edges();
    const inked = edges.filter((edge) => {
        const a = element.nodeScreenPosition(edge.source);
        const b = element.nodeScreenPosition(edge.target);
        return a !== undefined && b !== undefined && ink((a.x + b.x) / 2, (a.y + b.y) / 2, 1) > 0;
    });
    return edges.length === 0 ? 0 : inked.length / edges.length;
}

/**
 * Switch to 2D with the Mode tool, as a reader does.
 * @param session - the session.
 */
async function modeTo2d(session: GraphSession): Promise<void> {
    const toolbar = screen.getByRole("toolbar", { name: "Canvas tools" });
    await userEvent.click(within(toolbar).getByRole("button", { name: /^Mode/ }));
    const menu = await screen.findByRole("menu", { name: /^Mode/ });
    await userEvent.click(within(menu).getByRole("menuitemradio", { name: /^2D/ }));
    await waitFor(() => {
        assert.equal(session.layout.dimension, "2d");
    });
}

describe("drawing with canary's experiments on", () => {
    it("Les Miserables, 2D: a click on a node leaves every node drawn", async () => {
        const { session } = await openSampleFromStart("Les Miserables");
        await settled();
        await modeTo2d(session);
        const element = await settled();
        const total = session.data.nodes().length;
        assert.equal(total, 77);
        assert.equal(await drawnNodes(element, session), total, "every node is drawn before the click");

        const valjean = session.data.nodes().find((node) => node.id === "Valjean" || node.name === "Valjean");
        assert.isDefined(valjean);
        const at = element.nodeScreenPosition(valjean?.id ?? "");
        assert.isTrue(at?.visible);
        await userEvent.click(element, { position: { x: at?.x ?? 0, y: at?.y ?? 0 } });
        await waitFor(() => {
            assert.deepEqual(session.selection.nodes, [valjean?.id]);
        });
        await settled();
        assert.equal(await drawnNodes(element, session), total, "every node is still drawn after the click");
    });

    it("College football, 3D then 2D: every edge still drawn", async () => {
        const { session } = await openSampleFromStart("College football");
        const element = await settled();
        const before = await inkedEdges(element, session);
        assert.isAbove(before, 0.5, "most edges show ink at their midpoint in 3D");
        await modeTo2d(session);
        await settled();
        const after = await inkedEdges(element, session);
        assert.isAtLeast(after, before * 0.9, "the edges are still drawn in 2D");
    });
});
