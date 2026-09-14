/**
 * Tests for the non-text style bridge.
 *
 * The claims under test are about SHAPE, not about looks, because shape is what
 * graphty-element's interning reads: `Styles.styleToId` reuses a style id only for a
 * style that is deep-equal to one it has already seen, and `NodeMesh` keys its mesh cache
 * on that id. So a key the element's schema does not declare, an opacity in the wrong
 * scale or a present-but-undefined branch each cost a style id and a mesh for a look the
 * element already had -- and the scan that hands out those ids is linear in how many
 * exist.
 */

import { describe, expect, it } from "vitest";

import type { ArrowConfig, EdgeLineConfig, NodeEffectsConfig } from "../../types/style-layer";
import { DEFAULT_ARROW_HEAD, DEFAULT_ARROW_TAIL, DEFAULT_COLOR, DEFAULT_EDGE_LINE } from "../style-defaults";
import {
    editorToElementArrow,
    editorToElementColor,
    editorToElementEdgeLine,
    editorToElementEffects,
    editorToElementShape,
    elementToEditorArrow,
    elementToEditorColorConfig,
    elementToEditorEdgeLine,
    elementToEditorEffects,
    elementToEditorShape,
} from "../styleBridge";

/** Effects with nothing turned on, as the editor's controls open. */
const NO_EFFECTS: NodeEffectsConfig = {
    glow: undefined,
    outline: undefined,
    wireframe: false,
    flatShaded: false,
};

describe("editorToElementShape", () => {
    it("renames the shapes the element spells differently", () => {
        expect(editorToElementShape({ type: "torusKnot", size: 2 })).toEqual({ type: "torus-knot", size: 2 });
    });

    it("falls back to a shape the element can actually build", () => {
        // None of these three are in graphty-element's NodeShapes enum.
        expect(editorToElementShape({ type: "torus", size: 1 }).type).toBe("torus-knot");
        expect(editorToElementShape({ type: "disc", size: 1 }).type).toBe("geodesic");
        expect(editorToElementShape({ type: "plane", size: 1 }).type).toBe("box");
    });

    it("passes through a name both models share", () => {
        expect(editorToElementShape({ type: "icosphere", size: 1.5 })).toEqual({ type: "icosphere", size: 1.5 });
    });

    it("maps two different editor shapes onto ONE element shape, deep-equal", () => {
        /* The performance claim in miniature: "torus" and "torusKnot" are two rows in the
           editor's menu and one mesh in the element. Deep-equal here means ONE style id
           and ONE mesh; unequal would mean two of each for the same look. */
        expect(editorToElementShape({ type: "torus", size: 1 })).toEqual(
            editorToElementShape({ type: "torusKnot", size: 1 }),
        );
    });
});

describe("elementToEditorShape", () => {
    it("reads the element's spelling back into the editor's", () => {
        expect(elementToEditorShape({ type: "torus-knot", size: 2 })).toEqual({ type: "torusKnot", size: 2 });
    });

    it("fills in the editor's defaults for what the element did not set", () => {
        expect(elementToEditorShape({})).toEqual({ type: "icosphere", size: 1 });
        expect(elementToEditorShape(undefined)).toEqual({ type: "icosphere", size: 1 });
    });

    it("round-trips every shape the element can name", () => {
        for (const type of ["icosphere", "box", "geodesic", "torusKnot"]) {
            expect(editorToElementShape(elementToEditorShape(editorToElementShape({ type, size: 1 })))).toEqual(
                editorToElementShape({ type, size: 1 }),
            );
        }
    });
});

describe("editorToElementColor", () => {
    it("writes a fully opaque solid colour as a PLAIN STRING", () => {
        /* The shape graphty-element's own defaults and saved templates use. The advanced
           object would look identical and intern as a second id. */
        expect(editorToElementColor({ mode: "solid", color: "#E11D48", opacity: 1 })).toBe("#E11D48");
    });

    it("writes a translucent solid colour in the advanced form", () => {
        expect(editorToElementColor({ mode: "solid", color: "#E11D48", opacity: 0.5 })).toEqual({
            colorType: "solid",
            value: "#E11D48",
            opacity: 0.5,
        });
    });

    it("writes a gradient as colorType gradient with a colors array", () => {
        expect(
            editorToElementColor({
                mode: "gradient",
                stops: [
                    { id: "a", offset: 0, color: "#111111" },
                    { id: "b", offset: 1, color: "#222222" },
                ],
                direction: 90,
                opacity: 1,
            }),
        ).toEqual({
            colorType: "gradient",
            colors: ["#111111", "#222222"],
            direction: 90,
            opacity: 1,
        });
    });

    it("writes a radial gradient under the element's own name for it", () => {
        expect(
            editorToElementColor({
                mode: "radial",
                stops: [{ id: "a", offset: 0, color: "#111111" }],
                opacity: 0.25,
            }),
        ).toEqual({
            colorType: "radial-gradient",
            colors: ["#111111"],
            opacity: 0.25,
        });
    });

    it("ignores the stop ids, which are the editor's own bookkeeping", () => {
        /* Two gradients a user cannot tell apart -- same colours, different React keys --
           must be ONE element style, or every re-created stop row costs a mesh. */
        expect(
            editorToElementColor({
                mode: "gradient",
                stops: [
                    { id: "3f2a9c11", offset: 0, color: "#111111" },
                    { id: "8b0e7d42", offset: 1, color: "#222222" },
                ],
                direction: 0,
                opacity: 1,
            }),
        ).toEqual(
            editorToElementColor({
                mode: "gradient",
                stops: [
                    { id: "stop-0", offset: 0, color: "#111111" },
                    { id: "stop-1", offset: 1, color: "#222222" },
                ],
                direction: 0,
                opacity: 1,
            }),
        );
    });
});

describe("elementToEditorColorConfig", () => {
    it("reads a plain texture colour as an opaque solid", () => {
        expect(elementToEditorColorConfig({ texture: { color: "#6366F1" } })).toEqual({
            mode: "solid",
            color: "#6366F1",
            opacity: 1,
        });
    });

    it("reads the advanced solid form, opacity and all", () => {
        expect(
            elementToEditorColorConfig({ texture: { color: { colorType: "solid", value: "#ABCDEF", opacity: 0.4 } } }),
        ).toEqual({ mode: "solid", color: "#ABCDEF", opacity: 0.4 });
    });

    it("reads a gradient back into positional stops", () => {
        expect(
            elementToEditorColorConfig({
                texture: { color: { colorType: "gradient", colors: ["#111111", "#222222"], direction: 45 } },
            }),
        ).toEqual({
            mode: "gradient",
            stops: [
                { id: "stop-0", offset: 0, color: "#111111" },
                { id: "stop-1", offset: 1, color: "#222222" },
            ],
            direction: 45,
            opacity: 1,
        });
    });

    it("reads a radial gradient back as the editor's radial mode", () => {
        const config = elementToEditorColorConfig({
            texture: { color: { colorType: "radial-gradient", colors: ["#111111", "#222222"], opacity: 0.5 } },
        });

        expect(config.mode).toBe("radial");
        expect(config.opacity).toBe(0.5);
    });

    it("still opens a layer an older panel left in the editor's own shape", () => {
        expect(elementToEditorColorConfig({ color: { mode: "solid", color: "#FF0000", opacity: 0.5 } })).toEqual({
            mode: "solid",
            color: "#FF0000",
            opacity: 0.5,
        });
        expect(elementToEditorColorConfig({ color: "#00FF00" })).toEqual({
            mode: "solid",
            color: "#00FF00",
            opacity: 1,
        });
    });

    it("falls back to the editor default when the style says nothing about colour", () => {
        expect(elementToEditorColorConfig({})).toEqual(DEFAULT_COLOR);
    });

    it("round-trips an element colour unchanged", () => {
        for (const color of ["#6366F1", "#0EA5E9"]) {
            expect(editorToElementColor(elementToEditorColorConfig({ texture: { color } }))).toBe(color);
        }
    });
});

describe("editorToElementEffects", () => {
    it("returns UNDEFINED when nothing is set", () => {
        /* Undefined means the caller must OMIT the branch. `isEqual({effect: undefined})`
           against `isEqual({})` is false, so writing it present mints a style id for a
           node that looks exactly like one with no effects. */
        expect(editorToElementEffects(NO_EFFECTS)).toBeUndefined();
    });

    it("writes glow WITHOUT an enabled flag, because presence is the enabling", () => {
        const effect = editorToElementEffects({
            ...NO_EFFECTS,
            glow: { enabled: true, color: "#FFFFFF", strength: 0.5 },
        });

        expect(effect).toEqual({ glow: { color: "#FFFFFF", strength: 0.5 } });
        expect(effect?.glow).not.toHaveProperty("enabled");
    });

    it("omits a glow the editor turned off rather than writing enabled false", () => {
        expect(
            editorToElementEffects({
                ...NO_EFFECTS,
                glow: { enabled: false, color: "#FFFFFF", strength: 0.5 },
                wireframe: true,
            }),
        ).toEqual({ wireframe: true });
    });

    it("writes outline the same way", () => {
        expect(
            editorToElementEffects({ ...NO_EFFECTS, outline: { enabled: true, color: "#000000", width: 2 } }),
        ).toEqual({ outline: { color: "#000000", width: 2 } });
    });

    it("writes only the flags that are true", () => {
        expect(editorToElementEffects({ ...NO_EFFECTS, wireframe: true, flatShaded: true })).toEqual({
            wireframe: true,
            flatShaded: true,
        });
        expect(editorToElementEffects({ ...NO_EFFECTS, flatShaded: true })).toEqual({ flatShaded: true });
    });

    it("maps a disabled glow and an absent glow to the SAME element style", () => {
        // Two states of the editor, one look, therefore one style id.
        expect(
            editorToElementEffects({
                ...NO_EFFECTS,
                glow: { enabled: false, color: "#FFFFFF", strength: 0.5 },
                wireframe: true,
            }),
        ).toEqual(editorToElementEffects({ ...NO_EFFECTS, wireframe: true }));
    });
});

describe("elementToEditorEffects", () => {
    it("reads presence as enabled", () => {
        expect(elementToEditorEffects({ glow: { color: "#FFFFFF", strength: 0.5 } })).toEqual({
            glow: { enabled: true, color: "#FFFFFF", strength: 0.5 },
            wireframe: false,
            flatShaded: false,
        });
    });

    it("leaves an absent effect ABSENT rather than disabled-with-values", () => {
        const effects = elementToEditorEffects({ wireframe: true });

        expect(effects).not.toHaveProperty("glow");
        expect(effects).not.toHaveProperty("outline");
        expect(effects.wireframe).toBe(true);
    });

    it("round-trips an element effect branch unchanged", () => {
        const element = { glow: { color: "#FFFFFF", strength: 0.5 }, outline: { color: "#000000", width: 2 } };

        expect(editorToElementEffects(elementToEditorEffects(element))).toEqual(element);
    });
});

describe("editorToElementEdgeLine", () => {
    it("converts opacity from the editor's 0-100 to the element's 0-1", () => {
        /* graphty-element bounds line opacity at 1, so an unconverted 100 does not merely
           look wrong -- the strict schema rejects the whole edge style. */
        const line: EdgeLineConfig = { type: "dash", width: 4, color: "#A9A9A9", opacity: 40 };

        expect(editorToElementEdgeLine(line)).toEqual({ type: "dash", width: 4, color: "#A9A9A9", opacity: 0.4 });
    });

    it("writes a fully opaque line as opacity 1", () => {
        expect(editorToElementEdgeLine(DEFAULT_EDGE_LINE).opacity).toBe(1);
    });
});

describe("elementToEditorEdgeLine", () => {
    it("reads the element's 0-1 opacity back as a percentage", () => {
        expect(elementToEditorEdgeLine({ type: "solid", width: 8, color: "#A9A9A9", opacity: 0.4 })).toEqual({
            type: "solid",
            width: 8,
            color: "#A9A9A9",
            opacity: 40,
        });
    });

    it("falls back to the editor defaults for an absent line", () => {
        expect(elementToEditorEdgeLine(undefined)).toEqual(DEFAULT_EDGE_LINE);
    });

    it("opens a layer an older panel left in the 0-100 scale on the typed value", () => {
        // An opacity above 1 was never an element opacity: the element's schema rejects it.
        expect(elementToEditorEdgeLine({ type: "solid", width: 8, color: "#A9A9A9", opacity: 100 }).opacity).toBe(100);
    });

    it("round-trips an element line unchanged", () => {
        const element = { type: "dot", width: 2, color: "#123456", opacity: 0.25 };

        expect(editorToElementEdgeLine(elementToEditorEdgeLine(element))).toEqual(element);
    });
});

describe("editorToElementArrow", () => {
    it("WRITES type none rather than omitting the branch", () => {
        /* An edge with no arrow and an edge with `{type: "none"}` look identical on a lone
           layer, and omitting the branch does save one interned style. It is still wrong:
           graphty-element merges matching layers with `defaultsDeep`, so an ABSENT arrow
           lets a lower layer's arrow through and a reader who sets "no arrow" over a layer
           that draws them still sees arrows. The control has to be able to say what it says
           (2026-09-13). */
        expect(editorToElementArrow(DEFAULT_ARROW_TAIL)).toMatchObject({ type: "none" });
    });

    it("converts opacity from 0-100 to 0-1", () => {
        const arrow: ArrowConfig = { type: "vee", size: 2, color: "#A9A9A9", opacity: 50 };

        expect(editorToElementArrow(arrow)).toEqual({ type: "vee", size: 2, color: "#A9A9A9", opacity: 0.5 });
    });

    it("writes the default arrow head at opacity 1", () => {
        expect(editorToElementArrow(DEFAULT_ARROW_HEAD)).toEqual({
            type: "normal",
            size: 1,
            color: "#A9A9A9",
            opacity: 1,
        });
    });
});

describe("elementToEditorArrow", () => {
    it("reads the element's 0-1 opacity back as a percentage", () => {
        expect(
            elementToEditorArrow({ type: "vee", size: 2, color: "#A9A9A9", opacity: 0.5 }, DEFAULT_ARROW_HEAD),
        ).toEqual({ type: "vee", size: 2, color: "#A9A9A9", opacity: 50 });
    });

    it("shows the caller's fallback for an absent branch", () => {
        expect(elementToEditorArrow(undefined, DEFAULT_ARROW_TAIL)).toEqual(DEFAULT_ARROW_TAIL);
        expect(elementToEditorArrow(undefined, DEFAULT_ARROW_HEAD)).toEqual(DEFAULT_ARROW_HEAD);
    });

    it("round-trips an element arrow unchanged", () => {
        const element = { type: "diamond", size: 1.5, color: "#123456", opacity: 0.75 };

        expect(editorToElementArrow(elementToEditorArrow(element, DEFAULT_ARROW_HEAD))).toEqual(element);
    });
});
