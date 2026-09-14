import { describe, expect, it } from "vitest";

import type { RichTextStyle } from "../../types/style-layer";
import { editorToElementRichTextStyle, elementToEditorRichTextStyle } from "../richTextStyleBridge";
import { DEFAULT_RICH_TEXT_STYLE } from "../style-defaults";

/**
 * The element-shaped style a label carries with every branch turned on, copied field for
 * field from `convertRichTextStyle` (Graphty.tsx:260).
 *
 * It is spelled out rather than produced by either half, which is what makes it the
 * contract BETWEEN them: the reader is checked against it below, the writer is checked
 * against it too, and the round trip closes the loop. Change a key here and one of the two
 * halves has to change with it.
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
});

describe("editorToElementRichTextStyle", () => {
    /** The editor-shaped style whose element form is `ELEMENT_SHAPED`, branch for branch. */
    const editorShaped: RichTextStyle = {
        enabled: true,
        text: "Mr_Whiskers",
        location: "static",
        font: { family: "Helvetica", size: 24, weight: 700, color: "#d5d7da" },
        background: { enabled: true, color: "#2a3035", padding: 4, borderRadius: 2 },
        position: { attachPosition: "below", offset: 3, billboard: true },
        effects: {
            outline: { enabled: true, color: "#000000", width: 2 },
            shadow: { enabled: true, color: "#111111", blur: 5, offsetX: 0, offsetY: 0 },
        },
        advanced: { resolution: 256, depthFade: true },
    };

    it("writes the element's flat keys, and only those", () => {
        /* Key for key, because the element's schema is a Zod strictObject: ONE key it
           does not declare -- a nested `font`, say -- and the whole label fails to
           parse and rebuilds as a blank texture. */
        expect(editorToElementRichTextStyle(editorShaped)).toEqual(ELEMENT_SHAPED);
    });

    it("writes the font as a string and the weight as a string", () => {
        const flat = editorToElementRichTextStyle(editorShaped);

        expect(typeof flat?.font).toBe("string");
        expect(flat?.fontWeight).toBe("700");
    });

    it("has no element form for a disabled style", () => {
        expect(editorToElementRichTextStyle({ ...editorShaped, enabled: false })).toBeUndefined();
    });

    it("has an element form for an enabled style with no text yet", () => {
        /* Requiring text made the editor's Enabled checkbox unusable: ticking it wrote
           undefined, the branch was dropped, and the checkbox sprang back off, so all four
           rich-text branches were unreachable from the UI. The element draws a label from
           `textPath` as readily as from `text`, so text was never the thing that made a
           label real -- `enabled` is (2026-09-13). */
        const flat = editorToElementRichTextStyle({ ...editorShaped, text: "" });

        expect(flat).toBeDefined();
        expect(flat?.enabled).toBe(true);
        expect(flat).not.toHaveProperty("text");
    });

    it("leaves a group the editor turned OFF absent rather than writing it off", () => {
        const flat = editorToElementRichTextStyle({
            ...editorShaped,
            background: { enabled: false, color: "#2a3035", padding: 4, borderRadius: 2 },
            effects: {
                outline: { enabled: false, color: "#000000", width: 2 },
                shadow: { enabled: false, color: "#111111", blur: 5, offsetX: 0, offsetY: 0 },
            },
        });

        expect(flat).not.toHaveProperty("backgroundColor");
        expect(flat).not.toHaveProperty("textOutline");
        expect(flat).not.toHaveProperty("textShadow");
    });
});

/* The round trip, now between the two EXPORTED halves rather than against a copy of
   the writer's mapping restated in the test. Either half drifting from the other fails
   this, in whichever direction the drift happened. */
describe("the round trip between the two halves", () => {
    it("element -> editor -> element returns the element's own style", () => {
        expect(editorToElementRichTextStyle(elementToEditorRichTextStyle(ELEMENT_SHAPED))).toEqual(ELEMENT_SHAPED);
    });

    it("editor -> element -> editor returns the editor's own style", () => {
        const original: RichTextStyle = {
            enabled: true,
            text: "Mrs_Henderson",
            location: "static",
            font: { family: "Georgia", size: 18, weight: 600, color: "#a3a8b1" },
            background: { enabled: true, color: "#101418", padding: 6, borderRadius: 3 },
            position: { attachPosition: "right", offset: 7, billboard: false },
            effects: {
                outline: { enabled: true, color: "#000000", width: 1 },
                shadow: { enabled: true, color: "#222222", blur: 2, offsetX: 0, offsetY: 0 },
            },
            advanced: { resolution: 128, depthFade: false },
        };

        expect(elementToEditorRichTextStyle(editorToElementRichTextStyle(original))).toEqual(original);
    });

    it("survives every attach position the editor can express, both ways", () => {
        for (const attachPosition of ["above", "below", "left", "right", "center"] as const) {
            const original: RichTextStyle = {
                ...DEFAULT_RICH_TEXT_STYLE,
                enabled: true,
                text: "x",
                position: { attachPosition, offset: 0, billboard: true },
            };

            expect(elementToEditorRichTextStyle(editorToElementRichTextStyle(original))).toEqual(original);
        }
    });

    it("loses the editor's own `location`, which the writer does not write down", () => {
        // Asymmetry 1 in the module's own doc: `textPath` is what the reader reads it
        // off, and the writer has no key to put it in.
        const original: RichTextStyle = {
            ...DEFAULT_RICH_TEXT_STYLE,
            enabled: true,
            text: "x",
            location: "textPath",
        };

        expect(elementToEditorRichTextStyle(editorToElementRichTextStyle(original)).location).toBe("static");
    });
});
