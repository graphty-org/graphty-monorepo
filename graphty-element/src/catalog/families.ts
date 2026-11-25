/**
 * @file Style families: things the element draws one way at a time in one slot.
 *
 * A node's shape is a basic shape, a 3D model or a shader drawn in its place; its fill is a flat
 * color, a gradient or a picture; an edge's line is a flat color, a gradient or strands. The element draws
 * one member of each family at a time, so a style editor that offers "switch to" needs to know,
 * for each family, which settings belong to one member (and go when another is chosen) and which
 * belong to the thing as a whole (and stay through every switch). This is that data, so an editor
 * never copies channel lists of its own.
 *
 * Nothing here reaches Babylon.js, Lit or the DOM.
 */

import { LABEL_LOOKS } from "./label-looks";
import { LABEL_STYLE_FIELDS } from "./label-style";
import type { ShaderPlace } from "./shaders";
import type { Channel } from "./types";

/**
 * A style family's id.
 *
 * OPEN UNION: members may be added in a minor release; handle unknown members.
 * @since 3.58.0
 */
export type StyleFamilyId = "node.shape" | "node.fill" | "edge.line" | "label.look" | "graph.background";

/**
 * One member of a style family. A member is told apart by exactly one of `owns` (the member is
 * drawn while a layer sets one of these), `place` (a shader use at that place on the target's
 * shader list), `shader` (a use of that shader) or `value` (the family's `field` holds this value).
 *
 * `Name` is what its family's settings are called: a `Channel` on a node or edge family
 * ({@link ChannelStyleFamily}), a label style or background field name on the others.
 * @since 3.58.0
 */
export interface StyleFamilyMember<Name extends string = string> {
    /** Its id, unique in its family. */
    readonly id: string;
    /** The default name to show for it. An application may replace it by id. */
    readonly plainName: string;
    /**
     * What belongs to this member only: channels on a node or edge family, label style fields on
     * `label.look`, background fields on `graph.background`. Switching to another member takes
     * them off.
     */
    readonly owns: readonly Name[];
    /** Another member's settings this one keeps through a switch to it (a model's fallback shape). */
    readonly keeps?: readonly Name[];
    /** The member is a shader use at this place, on the target's shader list (`node.shaders`). */
    readonly place?: ShaderPlace;
    /** The member is a use of this shader (a catalog id), on the target's shader list. */
    readonly shader?: string;
    /** The member is this value of the family's `field`. */
    readonly value?: string;
}

/**
 * What every style family has: its members and what belongs to the thing whichever member draws it.
 * @since 3.70.0
 */
export interface StyleFamilyBase<Target extends string, Name extends string> {
    readonly id: StyleFamilyId;
    /** What it styles: nodes, edges, a label style (any of them), or the graph's background. */
    readonly target: Target;
    /** The default name to show for it. An application may replace it by id. */
    readonly plainName: string;
    /** The field whose value names the member, on a family told apart by `value`. */
    readonly field?: string;
    /** Its members, the one drawn when nothing else is set first. */
    readonly members: readonly StyleFamilyMember<Name>[];
    /** What stays through every switch, in the same kind of names as the members' `owns`. */
    readonly shared: readonly Name[];
}

/**
 * A node or edge style family, whose members own channels: tell it apart by its `target`.
 * @since 3.70.0
 */
export type ChannelStyleFamily = StyleFamilyBase<"node" | "edge", Channel>;

/**
 * A label style or graph background family, whose members own field names.
 * @since 3.70.0
 */
export type FieldStyleFamily = StyleFamilyBase<"label" | "graph", string>;

/**
 * A style family: a node or edge family owns channels, a label or graph family field names. Its
 * `target` tells which.
 * @since 3.58.0
 */
export type StyleFamilyDescriptor = ChannelStyleFamily | FieldStyleFamily;

/** A node's basic shape and the settings only a basic shape draws. */
const BASIC_SHAPE: readonly Channel[] = [
    "node.shape",
    "node.cornerRadius",
    "node.exactCornerRadius",
    "node.cornerFraction",
    "node.shapePoints",
    "node.shapeStretchPoints",
    "node.meshDetail",
    "node.shapeParts",
];

/** A node's 3D model and its settings. */
const MODEL: readonly Channel[] = [
    "node.model",
    "node.modelSourceUp",
    "node.modelTurn",
    "node.modelTint",
    "node.modelDoubleSided",
    "node.modelAnimation",
    "node.modelAnimationSpeed",
    "node.modelAnimationOffset",
    "node.modelFit",
    "node.modelCenter",
];

/** Every label style field but the look. */
const LABEL_FIELDS_BUT_LOOK: readonly string[] = LABEL_STYLE_FIELDS.filter((field) => field !== "look");

/**
 * Every style family the element draws.
 *
 * ```ts
 * import { STYLE_FAMILIES } from "@graphty/graphty-element/catalog";
 * const shape = STYLE_FAMILIES.find((family) => family.id === "node.shape");
 * shape?.members.map((member) => member.id); // ["basic", "model", "replace"]
 * shape?.shared.includes("node.size"); // true: a size stays through every switch
 * ```
 * @since 3.58.0
 */
export const STYLE_FAMILIES: readonly StyleFamilyDescriptor[] = Object.freeze([
    {
        id: "node.shape",
        target: "node",
        plainName: "Shape",
        members: [
            { id: "basic", plainName: "Basic shape", owns: BASIC_SHAPE },
            { id: "model", plainName: "Model", owns: MODEL, keeps: ["node.shape"] },
            { id: "replace", plainName: "Shader", owns: [], place: "replace" },
        ],
        shared: [
            "node.size",
            "node.width",
            "node.height",
            "node.depth",
            "node.sizeMode",
            "node.sizeSpace",
            "node.relativeExtents",
            "node.planar",
            "node.shapeRotation",
            "node.wireframe",
            "node.flat",
            "node.unlit",
            "node.labelFit",
            "node.labelPaddingX",
            "node.labelPaddingY",
            "node.labelFitSquare",
            "node.labelFitQuantum",
            "node.labelFitImage",
            "node.labelFitImagePadding",
        ],
    },
    {
        id: "node.fill",
        target: "node",
        plainName: "Fill",
        members: [
            { id: "solid", plainName: "Solid", owns: ["node.color"] },
            {
                id: "gradient",
                plainName: "Gradient",
                owns: [
                    "node.gradientColors",
                    "node.gradientStops",
                    "node.gradientKind",
                    "node.gradientDirection",
                    "node.gradientCenterX",
                    "node.gradientCenterY",
                    "node.gradientRadius",
                    "node.gradientColor",
                ],
            },
            { id: "picture", plainName: "Picture", owns: ["node.texture"] },
        ],
        shared: ["node.opacity"],
    },
    {
        id: "edge.line",
        target: "edge",
        plainName: "Line",
        members: [
            // A solid line's color, or the end node's it is drawn in (`edge.colorFrom`).
            { id: "solid", plainName: "Solid", owns: ["edge.color", "edge.colorFrom"] },
            {
                id: "gradient",
                plainName: "Gradient",
                owns: ["edge.gradientColors", "edge.gradientStops", "edge.gradientKind"],
            },
            { id: "strands", plainName: "Strands", owns: ["edge.strandColors", "edge.strandSpacing"] },
        ],
        shared: ["edge.width", "edge.opacity", "edge.style", "edge.fadeStart", "edge.fadeEnd", "edge.fadeOpacity"],
    },
    {
        id: "label.look",
        target: "label",
        plainName: "Look",
        field: "look",
        members: LABEL_LOOKS.map((look) => ({ id: look.id, plainName: look.plainName, owns: [], value: look.id })),
        shared: LABEL_FIELDS_BUT_LOOK,
    },
    {
        id: "graph.background",
        target: "graph",
        plainName: "Background",
        field: "backgroundType",
        members: [
            { id: "color", plainName: "Color", owns: [], value: "color" },
            { id: "sky", plainName: "Sky", owns: ["data"], value: "skybox" },
        ],
        shared: ["color", "shader"],
    },
] satisfies StyleFamilyDescriptor[]);

/**
 * A style family by id.
 * @param id - The family's id.
 * @returns The family, or undefined for an id the element does not know.
 * @since 3.58.0
 */
export function styleFamily(id: StyleFamilyId): StyleFamilyDescriptor | undefined {
    return STYLE_FAMILIES.find((family) => family.id === id);
}
