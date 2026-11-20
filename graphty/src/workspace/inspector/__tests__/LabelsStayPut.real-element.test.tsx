/**
 * Labels stay where their style puts them by default (owner, 2026-11-19: "by default the labels should just
 * statically show in their specified location, even if they overlap nodes or other labels"), on the REAL
 * graphty-element: a fresh workspace hands the element neither label decluttering nor avoidance, Graph
 * settings shows both unchecked, and a label drawn over a neighbor node is drawn in the same place whether the
 * neighbor is there or not. Checking "Avoid nodes and edges" with a real click moves it.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import { assert, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import { withFeatures } from "../../../test/features";
import { render, screen, waitFor } from "../../../test/test-utils";
import { createWorkspaceStore } from "../../state/store";
import { picture } from "../../style/__tests__/v2Harness";
import { Workspace } from "../../Workspace";

/** A box in pixels. */
interface Box {
    readonly left: number;
    readonly top: number;
    readonly right: number;
    readonly bottom: number;
}

/**
 * The box around every pixel of a picture a test picks.
 * @param image - the picture.
 * @param pick - whether a pixel's red, green and blue belong.
 * @returns the box, or null when no pixel does.
 */
function boxOf(image: ImageData, pick: (r: number, g: number, b: number) => boolean): Box | null {
    let box: Box | null = null;
    for (let y = 0; y < image.height; y++) {
        for (let x = 0; x < image.width; x++) {
            const i = (y * image.width + x) * 4;
            if (pick(image.data[i] ?? 0, image.data[i + 1] ?? 0, image.data[i + 2] ?? 0)) {
                box =
                    box === null
                        ? { left: x, top: y, right: x, bottom: y }
                        : {
                              left: Math.min(box.left, x),
                              top: Math.min(box.top, y),
                              right: Math.max(box.right, x),
                              bottom: Math.max(box.bottom, y),
                          };
            }
        }
    }
    return box;
}

const red = (r: number, g: number, b: number): boolean => r > g + 120 && r > b + 120;
const blue = (r: number, g: number, b: number): boolean => b > r + 60 && b > g + 60;
const green = (r: number, g: number, b: number): boolean => g > r + 60 && g > b + 60;

/**
 * Where node a's label is drawn, measured from node a's own drawing and in node a's widths, so a camera
 * that frames the graph differently does not move it.
 * @param image - the picture.
 * @returns the label's center against node a's center.
 */
function labelPlace(image: ImageData): { readonly x: number; readonly y: number } {
    const label = boxOf(image, red);
    const node = boxOf(image, blue);
    assert.isNotNull(label, "the label is drawn");
    assert.isNotNull(node, "node a is drawn");
    if (label === null || node === null) {
        throw new Error("unreachable");
    }
    const width = node.right - node.left + 1;
    return {
        x: ((label.left + label.right) / 2 - (node.left + node.right) / 2) / width,
        y: ((label.top + label.bottom) / 2 - (node.top + node.bottom) / 2) / width,
    };
}

describe("labels stay where they are put, by default", () => {
    withFeatures(["file-styles", "style-panel-v2"]);

    it("a fresh workspace neither hides nor moves labels; a label over a neighbor stays put until Avoid is checked", async () => {
        await page.viewport(1440, 900);
        const store = createWorkspaceStore({ project: { name: "Pair", id: 1 }, inspected: { kind: "graph" } });
        render(<Workspace store={store} />);
        const element = await waitFor(() => {
            const found = document.querySelector("graphty-element");
            assert.isDefined(found?.session);
            return found;
        });
        if (element === null) {
            throw new Error("the element never came up");
        }
        const { session } = element;
        await waitFor(() => {
            assert.isFalse(element.layoutBehavior?.labels?.avoidNodesAndEdges, "labels are not moved off nodes");
            assert.isFalse(element.layoutBehavior?.labels?.declutter, "overlapping labels are not hidden");
        });

        await session.layout.set("fixed");
        // Node b sits right below node a, clear of it, where a's label is drawn.
        await session.data.addNodes([
            { id: "a", position: { x: 0, y: 0, z: 0 } },
            { id: "b", position: { x: 0, y: -1.25, z: 0 } },
            { id: "far", position: { x: 6, y: -1.25, z: 0 } },
        ]);
        await session.styles.add({
            name: "Nodes",
            target: "node",
            selector: { match: "everything" },
            set: { "node.color": "#888888" },
        });
        await session.styles.add({
            name: "A",
            target: "node",
            selector: { match: "ids", nodes: ["a"] },
            set: {
                "node.color": "#0000FF",
                "node.label": "Alpha Alpha",
                "node.labelColor": "#FF0000",
                "node.labelSize": 24,
                "node.labelLocation": "bottom",
                // Drawn over the neighbor's sphere, not hidden inside it, so the picture shows where it is.
                "node.labelOnTop": true,
            },
        });
        const { id: neighbor } = await session.styles.add({
            name: "B",
            target: "node",
            selector: { match: "ids", nodes: ["b"] },
            set: { "node.color": "#00C000" },
        });
        await session.styles.settled();

        const withNeighbor = await picture(element);
        const label = boxOf(withNeighbor, red);
        const node = boxOf(withNeighbor, green);
        assert.isNotNull(label);
        assert.isNotNull(node);
        if (label === null || node === null) {
            throw new Error("unreachable");
        }
        assert.isTrue(
            label.left <= node.right &&
                node.left <= label.right &&
                label.top <= node.bottom &&
                node.top <= label.bottom,
            "the label is drawn over the neighbor",
        );
        const there = labelPlace(withNeighbor);

        await session.styles.update(neighbor, { set: { "node.visible": false } });
        await session.styles.settled();
        const without = await picture(element);
        assert.isNull(boxOf(without, green), "the neighbor is gone");
        const gone = labelPlace(without);
        assert.closeTo(there.x, gone.x, 0.05, "the label's place is the same with and without the neighbor");
        assert.closeTo(there.y, gone.y, 0.05, "the label's place is the same with and without the neighbor");

        // Graph settings shows the choice unchecked; checking it moves the label off the neighbor.
        await session.styles.update(neighbor, { set: { "node.visible": true } });
        await userEvent.click(await screen.findByRole("tab", { name: "Style" }));
        const avoid = await screen.findByRole("checkbox", { name: "Avoid nodes and edges" });
        const hide = screen.getByRole("checkbox", { name: "Hide overlaps" });
        assert.isFalse((avoid as HTMLInputElement).checked, "Avoid nodes and edges is unchecked");
        assert.isFalse((hide as HTMLInputElement).checked, "Hide overlaps is unchecked");
        await userEvent.click(avoid);
        await waitFor(() => {
            assert.isTrue(element.layoutBehavior?.labels?.avoidNodesAndEdges);
        });
        await session.styles.settled();
        const moved = labelPlace(await picture(element));
        assert.isAbove(Math.hypot(moved.x - there.x, moved.y - there.y), 0.2, "with Avoid checked, the label moves");
    });
});
