/**
 * Both halves of the non-text style bridge: editor -> element for writing a layer, and
 * element -> editor for reading one back. The companion of `richTextStyleBridge`, which
 * does the same job for the `label` and `tooltip` branches.
 *
 * WHY THIS EXISTS, and why the write direction is copied rather than written fresh.
 *
 * graphty-element interns styles by DEEP VALUE EQUALITY. `Styles.styleToId`
 * (`graphty-element/src/Styles.ts`) walks every style it has ever seen and reuses an id
 * only for one that is `isEqual` to the new style; otherwise it mints a new
 * `NodeStyleId`. `NodeMesh` then keys its mesh cache on that id
 * (`node-style-<id>-<2d|3d>`), so a style id that nothing else matches costs a whole
 * extra mesh. Two consequences follow, and both are measured:
 *
 * 1. A style written in a NON-CANONICAL shape can never be value-equal to the canonical
 *    one for the same look. It mints its own id and its own mesh, forever, for a graph
 *    that needs neither. The editor's `color` key (the element's is `texture.color`) is
 *    exactly this: one look, two ids, two meshes, measured as ids 15 and 18 on a live
 *    graph.
 * 2. `styleToId`'s scan is LINEAR in the number of styles interned so far and runs once
 *    per node per repaint, so every needless variant makes every later repaint slower --
 *    about 0.95 ms per interned style per 115-node repaint in the baseline run.
 *
 * So the canonical shape is not a matter of taste here: a different shape is a different
 * style id, which is a different mesh. The write functions below are copied KEY FOR KEY
 * from the `_convert*` family in `components/Graphty.tsx`, which is the app's other
 * writer and the one whose output the element has always interned. Changing a mapping
 * here -- even to something more correct -- would split every look into two ids, one per
 * writer. Where a mapping looks wrong it is left alone and reported instead.
 *
 * Four shapes differ between the two models, and each is a real leak the panel used to
 * write raw:
 *
 * - COLOUR. The editor's `ColorConfig` is `{mode, color|stops, opacity}`. `NodeStyle` has
 *   no `color` key at all; the element's colour lives at `texture.color`, as either a
 *   plain hex string or one of the `AdvancedColorStyle` forms
 *   (`{colorType: "solid"|"gradient"|"radial-gradient", ...}`).
 * - EFFECTS. The editor's key is `effects`, PLURAL, and its glow and outline carry an
 *   `enabled` flag. The element's key is `effect`, SINGULAR, and it has no `enabled`
 *   anywhere: PRESENCE is the enabling. An absent branch is the only way to say "off".
 * - SHAPE. Two of the editor's shape names are not in the element's enum at all, and two
 *   more are spelled differently. `SHAPE_TYPE_MAP` is the whole of that translation.
 * - EDGE LINE AND ARROWS. The editor carries opacity as 0-100; the element's schema
 *   bounds it to 0-1. An arrow of type "none" has no element form at all.
 *
 * Two behaviours are easy to lose and are load-bearing:
 *
 * - `editorToElementEffects` and `editorToElementArrow` return UNDEFINED when there is
 *   nothing to write. A caller holding undefined must OMIT the branch, never write it as
 *   a present key with an `undefined` value: `isEqual` treats `{effect: undefined}` and
 *   `{}` as different styles, so writing it mints a distinct id for an identical look --
 *   the very thing this module exists to prevent. The element also merges matching layers
 *   with `defaultsDeep`, where an absent key lets another layer's value through and a
 *   present one does not, so the two are different facts as well as different ids.
 * - The element enables glow and outline by PRESENCE. A disabled effect is an absent key,
 *   not `enabled: false`.
 *
 * The read direction has no twin in `Graphty.tsx` -- that component only ever writes
 * down. It is written here as the inverse of each writer so the panel can show what the
 * layer actually holds, and so the pair can be checked against each other; there is a
 * round-trip test beside it that does exactly that. Where the element's model is wider
 * than the editor's, the reader falls back to the editor's default rather than inventing
 * a value, and it numbers gradient stop ids positionally so that re-reading the same
 * layer yields the same editor model rather than fresh random ids.
 */

import { DEFAULT_GRAPH_NODE_COLOR } from "../constants/colors";
import type {
    ArrowConfig,
    ArrowType,
    ColorConfig,
    ColorStop,
    EdgeLineConfig,
    EdgeLineType,
    NodeEffectsConfig,
    ShapeConfig,
} from "../types/style-layer";
import {
    DEFAULT_COLOR,
    DEFAULT_EDGE_LINE,
    DEFAULT_GLOW,
    DEFAULT_NODE_EFFECTS,
    DEFAULT_OUTLINE,
    DEFAULT_SHAPE,
} from "./style-defaults";

/**
 * The element-shaped colour, as `texture.color` accepts it.
 *
 * Either a plain hex string or one of `AdvancedColorStyle`'s three discriminated forms;
 * this is the union `_convertColorConfig` returns, spelled out so callers can hold it.
 * @public
 */
export type ElementColor =
    | string
    | {
          colorType: string;
          value?: string;
          colors?: string[];
          direction?: number;
          opacity?: number;
      };

/**
 * The element-shaped node shape branch.
 * @public
 */
export interface ElementShape {
    type?: string;
    size?: number;
}

/**
 * The element-shaped edge line branch.
 * @public
 */
export interface ElementEdgeLine {
    type?: string;
    width?: number;
    color?: string;
    opacity?: number;
}

/**
 * The element-shaped edge arrow branch.
 * @public
 */
export interface ElementArrow {
    type?: string;
    size?: number;
    color?: string;
    opacity?: number;
}

/**
 * Map UI shape types to graphty-element shape types.
 *
 * Copied verbatim from `SHAPE_TYPE_MAP` in `components/Graphty.tsx`. "torus", "disc" and
 * "plane" are offered by the editor and are NOT in the element's `NodeShapes` enum, so
 * each falls back to the nearest shape the element can actually build; "torusKnot" is the
 * same shape under a different spelling. Anything not listed passes through unchanged.
 */
const SHAPE_TYPE_MAP: Readonly<Record<string, string>> = {
    torusKnot: "torus-knot",
    torus: "torus-knot", // torus not supported, fallback to torus-knot
    disc: "geodesic", // disc not supported, fallback to geodesic
    plane: "box", // plane not supported, fallback to box
};

/**
 * The element's shape names that the editor spells differently, mapped back.
 *
 * Only the RENAMES invert. The fallbacks in `SHAPE_TYPE_MAP` are lossy on purpose --
 * "torus", "disc" and "plane" have no element form, so a layer holding "torus-knot",
 * "geodesic" or "box" is read as the element name, which the editor's own option list
 * also offers. Reading it back as the editor's discarded name would claim the element is
 * drawing something it cannot draw.
 */
const ELEMENT_SHAPE_TO_EDITOR: Readonly<Record<string, string>> = {
    "torus-knot": "torusKnot",
};

/**
 * Reads one string field off an element-shaped style branch.
 *
 * Nothing here trusts a declared type: a layer may come from a file, from an algorithm's
 * suggested styles or from the app itself, and only some of those went through the
 * element's parser.
 * @param source - the element-shaped branch.
 * @param key - the field to read.
 * @returns the string, or undefined when it is absent or of another type.
 */
function readString(source: Record<string, unknown>, key: string): string | undefined {
    const value = source[key];

    return typeof value === "string" ? value : undefined;
}

/**
 * Reads one numeric field off an element-shaped style branch.
 * @param source - the element-shaped branch.
 * @param key - the field to read.
 * @returns the number, or undefined when it is absent or of another type.
 */
function readNumber(source: Record<string, unknown>, key: string): number | undefined {
    const value = source[key];

    return typeof value === "number" ? value : undefined;
}

/**
 * Reads one boolean field off an element-shaped style branch.
 * @param source - the element-shaped branch.
 * @param key - the field to read.
 * @returns the boolean, or undefined when it is absent or of another type.
 */
function readBoolean(source: Record<string, unknown>, key: string): boolean | undefined {
    const value = source[key];

    return typeof value === "boolean" ? value : undefined;
}

/**
 * Narrows an unknown branch to a plain record, or undefined when it is not one.
 * @param source - the value to narrow.
 * @returns the record, or undefined.
 */
function asRecord(source: unknown): Record<string, unknown> | undefined {
    if (source === null || typeof source !== "object" || Array.isArray(source)) {
        return undefined;
    }

    return source as Record<string, unknown>;
}

/**
 * Turns the editor's shape config into the element's.
 *
 * The exported twin of `_convertShapeConfig` in `components/Graphty.tsx`, copied key for
 * key.
 * @param shape - the shape configuration the editor handed back.
 * @returns the element-shaped shape branch.
 * @public
 */
export function editorToElementShape(shape: ShapeConfig): ElementShape {
    const type = SHAPE_TYPE_MAP[shape.type] ?? shape.type;

    return {
        type,
        size: shape.size,
    };
}

/**
 * Turns the element's shape branch into the editor's config.
 *
 * A field the element did not set takes the editor's default, so the result is always
 * whole and the controls can read into it without guarding.
 * @param source - the layer's `style.shape`, as the element holds it.
 * @returns the editor-shaped shape config.
 * @public
 */
export function elementToEditorShape(source: unknown): ShapeConfig {
    const branch = asRecord(source);

    if (branch === undefined) {
        return DEFAULT_SHAPE;
    }

    const type = readString(branch, "type");

    return {
        type: type === undefined ? DEFAULT_SHAPE.type : (ELEMENT_SHAPE_TO_EDITOR[type] ?? type),
        size: readNumber(branch, "size") ?? DEFAULT_SHAPE.size,
    };
}

/**
 * Turns the editor's colour config into the element's `texture.color` value.
 *
 * The exported twin of `_convertColorConfig` in `components/Graphty.tsx`, copied branch
 * for branch -- including the one detail that matters most for interning: a fully opaque
 * solid colour is written as a PLAIN STRING, not as the advanced `{colorType: "solid"}`
 * form. That is the shape the element's own defaults and its saved templates use, so
 * writing anything else for an opaque colour would mint a second id for every look the
 * element already knows.
 * @param colorConfig - the colour configuration the editor handed back.
 * @returns the element-shaped colour.
 * @public
 */
export function editorToElementColor(colorConfig: ColorConfig): ElementColor {
    switch (colorConfig.mode) {
        case "solid": {
            // For solid colors, we can use either a simple string or the advanced format
            const { opacity, color } = colorConfig;
            if (opacity === 1.0) {
                // Use simple string format
                return color;
            }

            // Use advanced format with opacity
            return {
                colorType: "solid",
                value: color,
                opacity,
            };
        }

        case "gradient":
            return {
                colorType: "gradient",
                colors: colorConfig.stops.map((stop) => stop.color),
                direction: colorConfig.direction,
                opacity: colorConfig.opacity,
            };

        case "radial":
            return {
                colorType: "radial-gradient",
                colors: colorConfig.stops.map((stop) => stop.color),
                opacity: colorConfig.opacity,
            };

        default:
            // This should never happen, but TypeScript requires exhaustive handling
            return DEFAULT_GRAPH_NODE_COLOR;
    }
}

/**
 * Turns a list of element colours into editor colour stops.
 *
 * Ids are positional rather than random so that reading the same layer twice yields the
 * same editor model: a fresh `crypto.randomUUID()` per read would remount every stop row
 * on every keystroke elsewhere in the panel.
 * @param colors - the element's `colors` array.
 * @returns the editor's stops, evenly spaced across 0-1.
 */
function toColorStops(colors: string[]): ColorStop[] {
    if (colors.length === 0) {
        return [];
    }

    const lastIndex = colors.length - 1;

    return colors.map((color, index) => ({
        id: `stop-${String(index)}`,
        offset: lastIndex === 0 ? 0 : index / lastIndex,
        color,
    }));
}

/**
 * Reads an element `AdvancedColorStyle` object into the editor's colour config.
 * @param advanced - the element's advanced colour object.
 * @returns the editor-shaped colour config, or undefined when the discriminator is
 * unknown.
 */
function advancedColorToEditor(advanced: Record<string, unknown>): ColorConfig | undefined {
    const colorType = readString(advanced, "colorType");
    const opacity = readNumber(advanced, "opacity") ?? 1.0;
    const rawColors = advanced.colors;
    const colors = Array.isArray(rawColors)
        ? rawColors.filter((entry): entry is string => typeof entry === "string")
        : [];

    switch (colorType) {
        case "solid":
            return {
                mode: "solid",
                color: readString(advanced, "value") ?? DEFAULT_COLOR.color,
                opacity,
            };

        case "gradient":
            return {
                mode: "gradient",
                stops: toColorStops(colors),
                direction: readNumber(advanced, "direction") ?? 0,
                opacity,
            };

        case "radial-gradient":
            return {
                mode: "radial",
                stops: toColorStops(colors),
                opacity,
            };

        default:
            return undefined;
    }
}

/**
 * Turns a node style's colour -- however it is written -- into the editor's config.
 *
 * Reads the whole node style rather than one branch, because the colour has lived in
 * three places over the app's life and a layer on disk may hold any of them: the
 * element's `texture.color` (a hex string or an advanced object), an editor-shaped
 * `color` object left behind by the panel before this bridge existed, or a bare `color`
 * string from the oldest saved layers. The editor-shaped `color` object is read FIRST so
 * that a layer carrying both still opens on the values its author last typed.
 * @param style - the layer's node style, as the element holds it.
 * @returns the editor-shaped colour config.
 * @public
 */
export function elementToEditorColorConfig(style: Record<string, unknown>): ColorConfig {
    const legacyColor = asRecord(style.color);

    if (legacyColor !== undefined && typeof legacyColor.mode === "string") {
        return legacyColor as unknown as ColorConfig;
    }

    const texture = asRecord(style.texture);

    if (texture !== undefined) {
        const advanced = asRecord(texture.color);

        if (advanced !== undefined) {
            const converted = advancedColorToEditor(advanced);

            if (converted !== undefined) {
                return converted;
            }
        }

        const plain = readString(texture, "color");

        if (plain !== undefined) {
            return {
                mode: "solid",
                color: plain,
                opacity: 1.0,
            };
        }
    }

    const bareColor = readString(style, "color");

    if (bareColor !== undefined) {
        return {
            mode: "solid",
            color: bareColor,
            opacity: 1.0,
        };
    }

    return DEFAULT_COLOR;
}

/**
 * Turns the editor's effects config into the element's `effect` branch.
 *
 * The exported twin of `_convertEffectsConfig` in `components/Graphty.tsx`, copied
 * condition for condition. Glow and outline are written only when the editor turned them
 * ON, and the `enabled` flag itself is NOT carried across: the element has no such field
 * and its schema is strict, so presence is the whole of the signal.
 * @param effects - the effects configuration the editor handed back.
 * @returns the element-shaped `effect` branch, or UNDEFINED when no effect is set -- which
 * the caller must write as an ABSENT key, never as a present one.
 * @public
 */
export function editorToElementEffects(effects: NodeEffectsConfig): Record<string, unknown> | undefined {
    const result: Record<string, unknown> = {};

    // Add glow if enabled
    if (effects.glow?.enabled) {
        result.glow = {
            color: effects.glow.color,
            strength: effects.glow.strength,
        };
    }

    // Add outline if enabled
    if (effects.outline?.enabled) {
        result.outline = {
            color: effects.outline.color,
            width: effects.outline.width,
        };
    }

    // Add wireframe if true
    if (effects.wireframe) {
        result.wireframe = true;
    }

    // Add flatShaded if true
    if (effects.flatShaded) {
        result.flatShaded = true;
    }

    // Return undefined if no effects are set
    if (Object.keys(result).length === 0) {
        return undefined;
    }

    return result;
}

/**
 * Turns the element's `effect` branch into the editor's effects config.
 *
 * An absent glow or outline stays ABSENT in the result rather than becoming
 * `{enabled: false}`, because that is what the editor's own `value.glow &&` guards read
 * and what `DEFAULT_NODE_EFFECTS` holds. `wireframe` and `flatShaded` are always present
 * as booleans, since the editor draws them as checkboxes.
 * @param source - the layer's `style.effect`, as the element holds it.
 * @returns the editor-shaped effects config.
 * @public
 */
export function elementToEditorEffects(source: unknown): NodeEffectsConfig {
    const branch = asRecord(source);

    if (branch === undefined) {
        return DEFAULT_NODE_EFFECTS;
    }

    const glow = asRecord(branch.glow);
    const outline = asRecord(branch.outline);

    return {
        ...(glow === undefined
            ? {}
            : {
                  glow: {
                      enabled: true,
                      color: readString(glow, "color") ?? DEFAULT_GLOW.color,
                      strength: readNumber(glow, "strength") ?? DEFAULT_GLOW.strength,
                  },
              }),
        ...(outline === undefined
            ? {}
            : {
                  outline: {
                      enabled: true,
                      color: readString(outline, "color") ?? DEFAULT_OUTLINE.color,
                      width: readNumber(outline, "width") ?? DEFAULT_OUTLINE.width,
                  },
              }),
        wireframe: readBoolean(branch, "wireframe") ?? false,
        flatShaded: readBoolean(branch, "flatShaded") ?? false,
    };
}

/**
 * Turns the editor's edge line config into the element's.
 *
 * The exported twin of `convertEdgeLineConfig` in `components/Graphty.tsx`, copied key
 * for key, including the 0-100 to 0-1 opacity conversion -- the element's schema bounds
 * opacity at 1, so an unconverted 100 does not merely look wrong, it fails to parse.
 * @param line - the edge line configuration the editor handed back.
 * @returns the element-shaped line branch.
 * @public
 */
export function editorToElementEdgeLine(line: EdgeLineConfig): ElementEdgeLine {
    return {
        type: line.type,
        width: line.width,
        color: line.color,
        opacity: line.opacity / 100, // Convert 0-100 to 0-1
    };
}

/**
 * Reads an opacity written in either model's scale back into the editor's 0-100.
 *
 * The element's schema bounds opacity at 1, so a stored value ABOVE 1 was never an
 * element opacity -- it is a 0-100 number the panel wrote into the element's slot before
 * this bridge existed, and such a layer does not parse at all on the element's side.
 * Reading it as already-editor-scaled is what lets one of those layers open on the values
 * its author typed instead of on 10000, and it leaves every genuine element value (0-1)
 * converted exactly.
 * @param opacity - the stored opacity, or undefined.
 * @param fallback - the editor default for this branch, already in 0-100.
 * @returns the opacity in 0-100.
 */
function readOpacityAsPercent(opacity: number | undefined, fallback: number): number {
    if (opacity === undefined) {
        return fallback;
    }

    return opacity > 1 ? opacity : opacity * 100;
}

/**
 * Turns the element's edge line branch into the editor's config.
 * @param source - the layer's `style.line`, as the element holds it.
 * @returns the editor-shaped line config, with opacity back in 0-100.
 * @public
 */
export function elementToEditorEdgeLine(source: unknown): EdgeLineConfig {
    const branch = asRecord(source);

    if (branch === undefined) {
        return DEFAULT_EDGE_LINE;
    }

    const type = readString(branch, "type");

    return {
        type: (type ?? DEFAULT_EDGE_LINE.type) as EdgeLineType,
        width: readNumber(branch, "width") ?? DEFAULT_EDGE_LINE.width,
        color: readString(branch, "color") ?? DEFAULT_EDGE_LINE.color,
        opacity: readOpacityAsPercent(readNumber(branch, "opacity"), DEFAULT_EDGE_LINE.opacity),
    };
}

/**
 * Turns the editor's arrow config into the element's.
 *
 * The exported twin of `convertArrowConfig` in `components/Graphty.tsx`, copied key for
 * key. Type "none" has no element form: the arrow is expressed by the ABSENCE of the
 * branch, so this returns undefined and the caller must omit the key rather than write
 * `{type: "none"}` -- which the element would intern as a distinct style for an edge that
 * looks exactly like one with no arrow at all.
 * @param arrow - the arrow configuration the editor handed back.
 * @returns the element-shaped arrow branch, including an explicit "none".
 * @public
 */
export function editorToElementArrow(arrow: ArrowConfig): ElementArrow {
    /* "none" is WRITTEN, not omitted. An absent branch and `{type: "none"}` are the same
       picture on a lone layer, and omitting it saves one interned style -- which is what
       the original conversion did and what the comment above used to argue for. It is
       wrong: graphty-element merges matching layers with `defaultsDeep`, so an ABSENT
       arrow lets a lower layer's arrow through, and a reader who sets "no arrow" on a
       layer above one that draws arrows still sees arrows. The control has to be able to
       say what it says (2026-09-13). */

    return {
        type: arrow.type,
        size: arrow.size,
        color: arrow.color,
        opacity: arrow.opacity / 100, // Convert 0-100 to 0-1
    };
}

/**
 * Turns the element's arrow branch into the editor's config.
 *
 * An absent branch means "no arrow", which the editor draws as its fallback -- type
 * "none" for the tail, and graphty-element's own default arrow head for the head, which
 * is why the fallback is the caller's to supply.
 * @param source - the layer's `style.arrowHead` or `style.arrowTail`, element-shaped.
 * @param fallback - the editor default for this end of the edge.
 * @returns the editor-shaped arrow config, with opacity back in 0-100.
 * @public
 */
export function elementToEditorArrow(source: unknown, fallback: ArrowConfig): ArrowConfig {
    const branch = asRecord(source);

    if (branch === undefined) {
        return fallback;
    }

    const type = readString(branch, "type");

    return {
        type: (type ?? fallback.type) as ArrowType,
        size: readNumber(branch, "size") ?? fallback.size,
        color: readString(branch, "color") ?? fallback.color,
        opacity: readOpacityAsPercent(readNumber(branch, "opacity"), fallback.opacity),
    };
}
