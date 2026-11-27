/**
 * @file A point on the drawing that holds nothing, found through graphty-element's own picking, for
 * a test that clicks the empty canvas. A fixed corner holds nothing only for the drawing the test
 * was written against: where an edge ends up depends on the layout and the camera's framing.
 */

import { waitFor } from "./test-utils";

/**
 * A point on the canvas that is no node and no edge, as the element would pick it.
 * @param element - the element.
 * @returns the point, in the element's own pixels.
 */
export async function emptyPoint(element: HTMLElementTagNameMap["graphty-element"]): Promise<{ x: number; y: number }> {
    return waitFor(() => {
        const { width, height } = element.getBoundingClientRect();
        for (const point of [
            { x: 12, y: height - 12 },
            { x: width - 12, y: height - 12 },
            { x: width / 2, y: height - 12 },
            { x: 12, y: height / 2 },
        ]) {
            if (element.elementAt(point) === null) {
                return point;
            }
        }
        throw new Error("no empty point on the canvas");
    });
}
