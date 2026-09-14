/**
 * Tests for the one style conversion `components/Graphty.tsx` still owns.
 *
 * `editorToElementEdgeStyle` is a COMPOSITION, not a mapping: every mapping it needs comes
 * from `utils/styleBridge` and `utils/richTextStyleBridge`, and the tests below are written
 * so that a mapping copied back into the component would fail them. That matters because
 * graphty-element interns styles by deep value equality -- `Styles.styleToId` reuses a
 * style id only for a style that is `isEqual` to one it has already seen, and `NodeMesh`
 * keys its mesh cache on that id. Two writers that drift by one key produce two ids, two
 * meshes and one extra entry in a scan that is linear in how many ids exist.
 *
 * What the composition itself adds is OMISSION: a branch whose writer returns undefined is
 * left off the result rather than written as a present key holding `undefined`. Those
 * assertions use `toStrictEqual` and `Object.keys` on purpose -- `toEqual` treats
 * `{arrowHead: undefined}` and `{}` as the same object, which is exactly the distinction
 * the element's interning does NOT make.
 */

import { describe, expect, it } from "vitest";

import type { ArrowConfig, EdgeLineConfig, EdgeStyle, RichTextStyle } from "../../types/style-layer";
import { editorToElementRichTextStyle } from "../../utils/richTextStyleBridge";
import {
    DEFAULT_ARROW_HEAD,
    DEFAULT_ARROW_TAIL,
    DEFAULT_EDGE_LINE,
    DEFAULT_RICH_TEXT_STYLE,
} from "../../utils/style-defaults";
import { editorToElementArrow, editorToElementEdgeLine } from "../../utils/styleBridge";
import { editorToElementEdgeStyle } from "../Graphty";

/** An edge line as the editor's controls hand it back, opacity in 0-100. */
const EDITOR_LINE: EdgeLineConfig = {
    ...DEFAULT_EDGE_LINE,
    type: "dash",
    width: 4,
    color: "#123456",
    opacity: 50,
};

/** An arrow head the editor turned on, opacity in 0-100. */
const EDITOR_ARROW_HEAD: ArrowConfig = {
    ...DEFAULT_ARROW_HEAD,
    type: "normal",
    size: 2,
    color: "#abcdef",
    opacity: 80,
};

/** An arrow the editor left off. It has no element form at all. */
const ARROW_NONE: ArrowConfig = { ...DEFAULT_ARROW_TAIL, type: "none" };

/** A label the editor turned on, in the editor's NESTED shape. */
const EDITOR_LABEL: RichTextStyle = {
    ...DEFAULT_RICH_TEXT_STYLE,
    enabled: true,
    text: "hello",
};

describe("editorToElementEdgeStyle", () => {
    it("writes the line through the bridge, with opacity in the element's 0-1", () => {
        const result = editorToElementEdgeStyle({ line: EDITOR_LINE });

        expect(result.line).toStrictEqual(editorToElementEdgeLine(EDITOR_LINE));
        expect(result.line).toStrictEqual({ type: "dash", width: 4, color: "#123456", opacity: 0.5 });
    });

    it("writes both arrows through the bridge, with opacity in the element's 0-1", () => {
        const result = editorToElementEdgeStyle({
            arrowHead: EDITOR_ARROW_HEAD,
            arrowTail: EDITOR_ARROW_HEAD,
        });

        expect(result.arrowHead).toStrictEqual(editorToElementArrow(EDITOR_ARROW_HEAD));
        expect(result.arrowHead).toStrictEqual({ type: "normal", size: 2, color: "#abcdef", opacity: 0.8 });
        expect(result.arrowTail).toStrictEqual(result.arrowHead);
    });

    it("WRITES an arrow of type none, because the reader asked for no arrow", () => {
        /* This asserted omission until 2026-09-13, on the interning argument: an absent
           arrow and `{type: "none"}` look identical, so omitting saves a style id and a
           mesh. The argument is true and it loses anyway. graphty-element merges matching
           layers with `defaultsDeep`, so an ABSENT arrow lets a LOWER layer's arrow
           through -- a reader who picks "none" over a layer that draws arrows keeps seeing
           them, and the control lies. Saying nothing and saying "none" are different
           statements; only one of them is what the reader made. */
        const result = editorToElementEdgeStyle({ line: EDITOR_LINE, arrowTail: ARROW_NONE });

        expect(Object.keys(result)).toStrictEqual(["line", "arrowTail"]);
        expect(result.arrowTail).toMatchObject({ type: "none" });
    });

    it("still writes no key at all for an arrow the editor never set", () => {
        /* The other half of the same rule: an UNSET branch stays absent, so it neither
           interns a style of its own nor masks a lower layer. Only an explicit "none"
           is written. */
        expect(Object.keys(editorToElementEdgeStyle({ line: EDITOR_LINE }))).toStrictEqual(["line"]);
    });

    it("writes the label through the rich-text bridge, in the element's FLAT shape", () => {
        const result = editorToElementEdgeStyle({ label: EDITOR_LABEL });

        expect(result.label).toStrictEqual(editorToElementRichTextStyle(EDITOR_LABEL));
        // The element's `font` is a string; the editor's is an object. Flattening is the bridge's job.
        expect((result.label as Record<string, unknown>).font).toBe("Verdana");
        expect((result.label as Record<string, unknown>).text).toBe("hello");
    });

    it("writes the tooltip through the same rich-text bridge", () => {
        const result = editorToElementEdgeStyle({ tooltip: EDITOR_LABEL });

        expect(result.tooltip).toStrictEqual(editorToElementRichTextStyle(EDITOR_LABEL));
    });

    it("OMITS a disabled label, and KEEPS an enabled one that has no text yet", () => {
        const disabled = editorToElementEdgeStyle({ label: { ...EDITOR_LABEL, enabled: false } });
        const empty = editorToElementEdgeStyle({ label: { ...EDITOR_LABEL, text: "" } });

        // Disabled is absent: that is what "this layer says nothing about labels" means.
        expect(Object.keys(disabled)).toStrictEqual([]);
        expect(disabled).toStrictEqual(editorToElementEdgeStyle({}));

        /* Empty is NOT absent. Requiring text made the editor's Enabled checkbox
           unusable -- ticking it wrote undefined, the branch was dropped, and the box
           sprang back off -- and the element draws a label from `textPath` as readily as
           from `text`, so text was never what made a label real (2026-09-13). */
        expect(Object.keys(empty)).toStrictEqual(["label"]);
        expect(empty.label).toMatchObject({ enabled: true });
        expect(empty.label).not.toHaveProperty("text");
    });

    it("writes nothing for an edge style that sets nothing", () => {
        expect(editorToElementEdgeStyle({})).toStrictEqual({});
    });

    it("is exactly the bridge writers composed -- no mapping of its own", () => {
        /* The anti-drift test. Assembling the same style from the bridge exports by hand
           must reproduce the composer byte for byte; a mapping copied back into the
           component (a shape rename, an opacity divisor, an attach-position map) would
           show up here as soon as the two disagreed. */
        const edgeStyle: EdgeStyle = {
            line: EDITOR_LINE,
            arrowHead: EDITOR_ARROW_HEAD,
            arrowTail: EDITOR_ARROW_HEAD,
            label: EDITOR_LABEL,
            tooltip: { ...EDITOR_LABEL, text: "tip" },
        };

        expect(editorToElementEdgeStyle(edgeStyle)).toStrictEqual({
            line: editorToElementEdgeLine(EDITOR_LINE),
            arrowHead: editorToElementArrow(EDITOR_ARROW_HEAD),
            arrowTail: editorToElementArrow(EDITOR_ARROW_HEAD),
            label: editorToElementRichTextStyle(EDITOR_LABEL),
            tooltip: editorToElementRichTextStyle({ ...EDITOR_LABEL, text: "tip" }),
        });
    });

    it("lets no editor-scale opacity reach the element", () => {
        /* The element's schema bounds opacity at 1, so a 0-100 number does not merely look
           wrong -- the branch fails to parse and the edge rebuilds from defaults. */
        const result = editorToElementEdgeStyle({
            line: { ...EDITOR_LINE, opacity: 100 },
            arrowHead: { ...EDITOR_ARROW_HEAD, opacity: 100 },
        });

        for (const branch of [result.line, result.arrowHead]) {
            expect((branch as { opacity: number }).opacity).toBeLessThanOrEqual(1);
        }
    });
});
