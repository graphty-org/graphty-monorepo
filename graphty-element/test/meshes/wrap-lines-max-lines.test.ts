/**
 * A label cut to `maxLines`: the last line kept runs on with the rest of its line, cut to the width with an ellipsis
 * (yEd's `WORD_ELLIPSIS`: "Wrap" / "this t..."), or, with `maxLinesEllipsis` false, the lines past the cap are dropped
 * as they are (yEd's `WORD`: "Wrap" / "this").
 */
import { assert, describe, it } from "vitest";

import { wrapLines } from "../../src/meshes/RichTextParser";

type TextSegment = Parameters<typeof wrapLines>[1][number][number];

/** A canvas whose every letter is one pixel wide. */
const ctx = {
    font: "",
    measureText: (text: string) => ({ width: text.length }),
} as unknown as CanvasRenderingContext2D;
const style = { size: 10, weight: "normal", style: "normal", font: "x" } as TextSegment["style"];

/**
 * Wraps text and reads its lines back.
 * @param text - the label's lines
 * @param width - the wrap width
 * @param options - the cap and its ellipsis
 * @returns each line's letters
 */
function lines(text: string, width: number, options: Parameters<typeof wrapLines>[3]): string[] {
    const content = text.split("\n").map((line) => [{ text: line, style }]);
    return wrapLines(ctx, content, width, options).map((line) => line.map((seg) => seg.text).join(""));
}

describe("wrapLines with maxLines", () => {
    it("runs the last line kept on with the rest of its line, cut with an ellipsis", () => {
        assert.deepEqual(lines("Wrap this text", 7, { maxLines: 2 }), ["Wrap", "this t…"]);
        assert.deepEqual(lines("A long label text", 10, { maxLines: 1 }), ["A long la…"]);
    });

    it("drops the lines past the cap as they are with maxLinesEllipsis false", () => {
        assert.deepEqual(lines("Wrap this text", 7, { maxLines: 2, maxLinesEllipsis: false }), ["Wrap", "this"]);
        assert.deepEqual(lines("A long label text", 10, { maxLines: 1, maxLinesEllipsis: false, anywhere: true }), [
            "A long lab",
        ]);
    });

    it("marks a cut of the label's own lines, and leaves a label within the cap whole", () => {
        assert.deepEqual(lines("aa\nbb\ncc", Infinity, { maxLines: 2 }), ["aa", "bb…"]);
        assert.deepEqual(lines("aa\nbb\ncc", Infinity, { maxLines: 2, maxLinesEllipsis: false }), ["aa", "bb"]);
        assert.deepEqual(lines("Wrap this", 7, { maxLines: 2 }), ["Wrap", "this"]);
    });
});
