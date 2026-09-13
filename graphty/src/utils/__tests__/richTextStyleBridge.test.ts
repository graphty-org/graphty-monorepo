import { describe, expect, it } from "vitest";

import type { RichTextStyle } from "../../types/style-layer";
import { elementToEditorRichTextStyle } from "../richTextStyleBridge";
import { DEFAULT_RICH_TEXT_STYLE } from "../style-defaults";

/**
 * The element-shaped style `convertRichTextStyle` (Graphty.tsx:260) writes for a label
 * with every branch turned on, copied field for field from that function.
 *
 * It is spelled out here rather than imported because the writer is a private function
 * inside a component module. That makes this the contract between the two halves: if the
 * writer changes a key, this fixture and the converter have to change with it, and the
 * assertions below are what say so.
 */
const ELEMENT_SHAPED = {
    enabled: true,
    text: "Mr_Whiskers",
    location: "bottom",
    font: "Helvetica",
    fontSize: 24,
    fontWeight: "700",
    textColor: "#d5d7da",
    attachOffset: 3,
    billboardMode: 7,
    backgroundColor: "#2a3035",
    backgroundPadding: 4,
    cornerRadius: 2,
    textOutline: true,
    textOutlineColor: "#000000",
    textOutlineWidth: 2,
    textShadow: true,
    textShadowColor: "#111111",
    textShadowBlur: 5,
    resolution: 256,
    depthFadeEnabled: true,
};

describe("elementToEditorRichTextStyle", () => {
    describe("the flat-to-nested mapping", () => {
        const editor = elementToEditorRichTextStyle(ELEMENT_SHAPED);

        it("unflattens the font, which is a bare string on the element", () => {
            expect(editor.font).toEqual({ family: "Helvetica", size: 24, weight: 700, color: "#d5d7da" });
        });

        it("reads the attach position back out of the element's `location`", () => {
            // `convertRichTextStyle` writes attachPosition INTO location, so this is its inverse.
            expect(editor.position.attachPosition).toBe("below");
            expect(editor.position.offset).toBe(3);
            expect(editor.position.billboard).toBe(true);
        });

        it("carries the text and the enabled flag straight across", () => {
            expect(editor.enabled).toBe(true);
            expect(editor.text).toBe("Mr_Whiskers");
        });

        it("rebuilds the background from its three flat keys", () => {
            expect(editor.background).toEqual({
                enabled: true,
                color: "#2a3035",
                padding: 4,
                borderRadius: 2,
            });
        });

        it("rebuilds both effects", () => {
            expect(editor.effects?.outline).toEqual({ enabled: true, color: "#000000", width: 2 });
            expect(editor.effects?.shadow).toMatchObject({ enabled: true, color: "#111111", blur: 5 });
        });

        it("rebuilds the advanced pair", () => {
            expect(editor.advanced).toEqual({ resolution: 256, depthFade: true });
        });
    });

    /* The crash this module was written for. The shell's own label layer carries exactly
       these two keys, and the panel used to read `value.font.family` straight off them. */
    describe("a partial style, which is what most layers really are", () => {
        const editor = elementToEditorRichTextStyle({ enabled: true, textColor: "#d5d7da" });

        it("keeps what the layer said", () => {
            expect(editor.enabled).toBe(true);
            expect(editor.font.color).toBe("#d5d7da");
        });

        it("fills every structural branch, so the editors can read into it unguarded", () => {
            expect(editor.font.family).toBe(DEFAULT_RICH_TEXT_STYLE.font.family);
            expect(editor.font.size).toBe(DEFAULT_RICH_TEXT_STYLE.font.size);
            expect(editor.position).toEqual(DEFAULT_RICH_TEXT_STYLE.position);
        });

        it("leaves the opt-in decorations ABSENT rather than empty", () => {
            expect(editor.background).toBeUndefined();
            expect(editor.effects).toBeUndefined();
            expect(editor.advanced).toBeUndefined();
        });
    });

    describe("styles that are not styles", () => {
        it("returns the default for an absent style", () => {
            expect(elementToEditorRichTextStyle(undefined)).toEqual(DEFAULT_RICH_TEXT_STYLE);
        });

        it("returns the default for null", () => {
            expect(elementToEditorRichTextStyle(null)).toEqual(DEFAULT_RICH_TEXT_STYLE);
        });

        it("returns the default for a primitive", () => {
            expect(elementToEditorRichTextStyle("Verdana")).toEqual(DEFAULT_RICH_TEXT_STYLE);
        });

        it("ignores a field of the wrong type rather than passing it through", () => {
            // A file could carry anything; the element's parser is the only thing that
            // would have rejected it, and a layer may never have been through one.
            const editor = elementToEditorRichTextStyle({ fontSize: "24", enabled: "yes" });

            expect(editor.font.size).toBe(DEFAULT_RICH_TEXT_STYLE.font.size);
            expect(editor.enabled).toBe(DEFAULT_RICH_TEXT_STYLE.enabled);
        });
    });

    describe("the two asymmetric mappings", () => {
        it("reads the editor's own `location` off the presence of a textPath", () => {
            expect(elementToEditorRichTextStyle({ textPath: "name" }).location).toBe("textPath");
            expect(elementToEditorRichTextStyle({ text: "x" }).location).toBe("static");
        });

        it("folds the element's corner positions onto the half the editor can draw", () => {
            expect(elementToEditorRichTextStyle({ location: "top-left" }).position.attachPosition).toBe("above");
            expect(elementToEditorRichTextStyle({ location: "bottom-right" }).position.attachPosition).toBe("below");
        });

        it("falls back rather than inventing a position for a value it does not know", () => {
            expect(elementToEditorRichTextStyle({ location: "sideways" }).position.attachPosition).toBe(
                DEFAULT_RICH_TEXT_STYLE.position.attachPosition,
            );
        });

        it("keeps the default weight for a word the editor's number field cannot hold", () => {
            // The element's fontWeight is a string: "normal" and "bold" are legal values.
            expect(elementToEditorRichTextStyle({ fontWeight: "bold" }).font.weight).toBe(
                DEFAULT_RICH_TEXT_STYLE.font.weight,
            );
            expect(elementToEditorRichTextStyle({ fontWeight: "700" }).font.weight).toBe(700);
        });
    });

    /* The round trip. `convertRichTextStyle` is private to Graphty.tsx, so its mapping is
       restated here; the value of the test is that the two halves agree on every key, and
       a drift in either one fails it. */
    describe("round trip through the writer's own mapping", () => {
        /**
         * The element-shaped object `convertRichTextStyle` produces for an editor style.
         * @param style - the editor-shaped style.
         * @returns the element-shaped style.
         */
        function writeLikeGraphty(style: RichTextStyle): Record<string, unknown> {
            const attachToLocation: Record<string, string> = {
                above: "top",
                below: "bottom",
                center: "center",
                left: "left",
                right: "right",
            };

            return {
                enabled: true,
                text: style.text,
                location: attachToLocation[style.position.attachPosition] ?? "top",
                font: style.font.family,
                fontSize: style.font.size,
                fontWeight: String(style.font.weight),
                textColor: style.font.color,
                attachOffset: style.position.offset,
                billboardMode: style.position.billboard ? 7 : 0,
            };
        }

        it("returns the editor's own values after a write and a read", () => {
            const original: RichTextStyle = {
                ...DEFAULT_RICH_TEXT_STYLE,
                enabled: true,
                text: "Mrs_Henderson",
                font: { family: "Georgia", size: 18, weight: 600, color: "#a3a8b1" },
                position: { attachPosition: "right", offset: 7, billboard: false },
            };

            const returned = elementToEditorRichTextStyle(writeLikeGraphty(original));

            expect(returned.text).toBe(original.text);
            expect(returned.font).toEqual(original.font);
            expect(returned.position).toEqual(original.position);
        });

        it("survives every attach position the editor can express", () => {
            for (const attachPosition of ["above", "below", "left", "right", "center"] as const) {
                const original: RichTextStyle = {
                    ...DEFAULT_RICH_TEXT_STYLE,
                    enabled: true,
                    text: "x",
                    position: { attachPosition, offset: 0, billboard: true },
                };

                expect(elementToEditorRichTextStyle(writeLikeGraphty(original)).position.attachPosition).toBe(
                    attachPosition,
                );
            }
        });
    });
});
