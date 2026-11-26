/**
 * How Cytoscape desktop fits a label to its wrap width: Java measures text unkerned (`unkerned`), and a line that
 * fits once the spaces it ends with are left out is kept whole (cx2-us-returned-students, cx-lianhe-affiliation).
 */
import { assert, describe, it } from "vitest";

import { wrapLines } from "../../src/meshes/RichTextParser";

type TextSegment = Parameters<typeof wrapLines>[1][number][number];

/** A canvas whose every letter is one pixel wide, and each "AV" half a pixel narrower while it kerns. */
const ctx = {
    font: "",
    fontKerning: "auto",
    measureText(this: { fontKerning: string }, text: string) {
        const pairs = this.fontKerning === "none" ? 0 : text.split("AV").length - 1;
        return { width: text.length - pairs / 2 };
    },
} as unknown as CanvasRenderingContext2D;
const style = { size: 10, weight: "normal", style: "normal", font: "x" } as TextSegment["style"];

/**
 * Wraps one line and reads its lines back.
 * @param text - the label
 * @param width - the wrap width
 * @param options - how it is fitted
 * @returns each line's letters
 */
function lines(text: string, width: number, options: Parameters<typeof wrapLines>[3]): string[] {
    return wrapLines(ctx, [[{ text, style }]], width, options).map((line) => line.map((seg) => seg.text).join(""));
}

describe("wrapLines as Cytoscape desktop measures", () => {
    it("measures unkerned with unkerned, and kerned without it", () => {
        // "AV AV" is 4 kerned and 5 unkerned
        assert.deepEqual(lines("AV AV", 4.5, { trailingSpace: true }), ["AV AV"]);
        assert.deepEqual(lines("AV AV", 4.5, { trailingSpace: true, unkerned: true }), ["AV", "AV"]);
        assert.strictEqual(ctx.fontKerning, "auto", "the canvas kerns again afterwards");
    });

    it("keeps whole a line that fits without the spaces it ends with", () => {
        assert.deepEqual(lines("aa aa ", 5.5, { trailingSpace: true }), ["aa aa "]);
        assert.deepEqual(lines("aa aa  b", 5.5, { trailingSpace: true }), ["aa", "aa", "b"]);
    });
});
