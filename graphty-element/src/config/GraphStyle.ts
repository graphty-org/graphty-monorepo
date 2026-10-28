import { z } from "zod";

import { ColorStyle, ImageData } from "./common";
import { DEFAULT_VIEW_MODE } from "./ViewMode";

/** A shader parameter name: a GLSL identifier with no `__`, so no key reaches a prototype. */
const SHADER_PARAM_NAME = /^(?!.*__)[A-Za-z]\w{0,63}$/;

/**
 * The colour the element clears its canvas to when no background is set: whitesmoke. What a
 * background field shows when the project names none, and what clearing it returns to.
 * @since 3.26.0
 */
export const DEFAULT_BACKGROUND_COLOR = "#F5F5F5";

/** A background shader drawn over the colour and the image: its id and its parameters. */
const GraphBackgroundShaderLook = z.strictObject({
    /** A background shader id: a preset (`"nebula"`), a registered or a pasted shader. */
    id: z.string().min(1).max(81),
    /** Its parameters, by the names its catalog entry declares. */
    params: z
        .record(z.string().regex(SHADER_PARAM_NAME), z.union([z.number(), z.string().max(64), z.boolean()]))
        .optional(),
});

const GraphBackgroundColor = z.strictObject({
    backgroundType: z.literal("color"),
    /** Absent, the element draws {@link DEFAULT_BACKGROUND_COLOR}. */
    color: ColorStyle.optional(),
    /** A shader drawn over the colour; where its alpha is low, the colour shows. @since 3.36.0 */
    shader: GraphBackgroundShaderLook.optional(),
});

const GraphBackgroundSkybox = z.strictObject({
    backgroundType: z.literal("skybox"),
    data: ImageData,
    /** Drawn while the image loads, and wherever it is transparent. @since 3.36.0 */
    color: ColorStyle.optional(),
    /** A shader drawn over the image; where its alpha is low, the image shows. @since 3.36.0 */
    shader: GraphBackgroundShaderLook.optional(),
});

/**
 * What the graph is drawn against, bottom to top: a flat colour, a photo-dome skybox built from an
 * image, and a background shader.
 *
 * The colour accepts any CSS colour the element understands and is normalised to hex on parse;
 * absent, the element draws {@link DEFAULT_BACKGROUND_COLOR} (`session.config.backgroundColor`
 * reports the colour drawn). The skybox's `data` is an image URL or a base64 PNG. Either member
 * may carry a `shader`, drawn over the colour or the image behind every node and label at 30
 * frames a second or fewer: `{ backgroundType: "color", color: "#000", shader: { id: "nebula" } }`.
 * Where the shader's alpha is low, what is beneath it shows. It is the shape
 * `element.background` and `graph.setBackground()` take.
 */
export const GraphBackground = z.discriminatedUnion("backgroundType", [GraphBackgroundColor, GraphBackgroundSkybox]);

/** The graph background as it parses. See {@link GraphBackground}. */
export type GraphBackgroundConfig = z.infer<typeof GraphBackground>;

/**
 * What a selected node looks like.
 *
 * DELIBERATELY NOT A STYLE LAYER, and this is the one place that decision is written down. A
 * selection is not a property of the data: it is what a person is pointing at, it changes many
 * times a minute, and a layer drawing it would be reorderable, persistable and lost at a dataset
 * boundary along with every other layer. So the halo is drawn by the renderer from the mask, and
 * what it LOOKS like is configuration, beside the background.
 *
 * In 1.x this was `SelectionManager.setSelectionStyleLayer`. 2.0 drew a gold halo from three
 * constants and published no way to change it -- and because the element's own layers answer
 * `E_PROTECTED`, a consumer could not reach it by adding a layer either. This is the door.
 */
const GraphSelectionStyle = z.strictObject({
    /** The halo's colour. Any colour the element understands; normalised to hex on parse. */
    color: ColorStyle.default("#FFD700"),
    /**
     * How much of the node's own size the halo is drawn at.
     *
     * Greater than 1 puts a ring around the node, which is what a highlight reads as. Below 1 the
     * halo disappears inside the node it is meant to mark, so the schema takes any positive
     * number and the default stands a little clear of the node.
     */
    scale: z.number().positive().default(1.45),
    /** How solid the halo is, in `[0, 1]`. Low enough to read as a highlight rather than a node. */
    opacity: z.number().min(0).max(1).default(0.4),
    /**
     * The colour of the band a selected EDGE is drawn with. Any colour the element understands;
     * normalised to hex on parse.
     *
     * An edge has its own three settings because the node halo's do not carry over: a pale,
     * see-through ring reads around a ball, but the same band beside a one-pixel line vanished
     * on a dense drawing, and gold sat inside the default measurement palette's oranges. The
     * default, Paul Tol's vibrant blue, stands 4.4:1 off the default background and is apart from
     * the default edge grey, every colour of the default measurement palette and the element's
     * own highlight for every kind of colour vision (`test/catalog/default-palette-quality.test.ts`).
     */
    edgeColor: ColorStyle.default("#0077BB"),
    /**
     * How wide a selected edge's band is, as a multiple of twice the line's own width: the
     * default 2.5 draws a band five lines wide, so two line widths of it show on each side.
     */
    edgeScale: z.number().positive().default(2.5),
    /**
     * How solid a selected edge's band is, in `[0, 1]`. The band is drawn BEHIND the line, so the
     * line keeps its own paint down the middle whatever this is; solid by default.
     */
    edgeOpacity: z.number().min(0).max(1).default(1),
});

/** What a selected node looks like, as it parses. See {@link GraphSelectionStyleOpts}. */
export type GraphSelectionStyleConfig = z.infer<typeof GraphSelectionStyle>;

/** What a caller may say about the selection highlight: every field optional. */
export type GraphSelectionStyleInput = z.input<typeof GraphSelectionStyle>;

/** The selection highlight schema, so a caller can parse a partial against it. */
export const GraphSelectionStyleOpts = GraphSelectionStyle;

/**
 * What a selected node looks like when nobody has said otherwise.
 *
 * DERIVED from the schema rather than written out again, so the defaults have exactly one home.
 * The key is optional on `GraphStyle` -- a document written before the selection was
 * configurable does not carry it, and must keep loading -- so this is what the renderer reads
 * when it is absent.
 */
export const DEFAULT_SELECTION_STYLE: GraphSelectionStyleConfig = GraphSelectionStyle.parse({});

/**
 * Zod schema for ViewMode type
 */
const ViewModeSchema = z.enum(["2d", "3d", "ar", "vr"]);

/**
 * The colour a background draws: its own, else {@link DEFAULT_BACKGROUND_COLOR}.
 * @param background - The background.
 * @returns The colour, hex.
 * @internal
 */
export function backgroundColorOf(background: GraphBackgroundConfig): string {
    return background.color ?? DEFAULT_BACKGROUND_COLOR;
}

/**
 * How nodes travel to a new layout: a transition from `catalog.transitions()`, how long it takes,
 * and its parameters. Absent, a new layout's positions are drawn in one frame.
 * @since 3.36.0
 */
export const LayoutTransition = z.strictObject({
    /** A transition id: a preset (`"glide"`) or a registered one (`"my/drop"`). */
    transition: z.string().min(1).max(81),
    /** How long the move takes, in seconds. Default 0.8. */
    seconds: z.number().min(0).max(30).optional(),
    /** Its parameters, by the names its catalog entry declares. */
    params: z
        .record(z.string().regex(SHADER_PARAM_NAME), z.union([z.number(), z.string().max(64), z.boolean()]))
        .optional(),
});

/** How nodes travel to a new layout. See `LayoutTransition`. @since 3.36.0 */
export type LayoutTransitionConfig = z.infer<typeof LayoutTransition>;

export const GraphStyle = z.strictObject({
    /**
     * ACCEPTED AND IGNORED. It used to decide whether the element unshifted a default layer onto
     * the 1.x layer stack; that stack is gone, and the session's two locked base layers give
     * every graph its defaults unconditionally. The key stays because this object is strict, so
     * dropping it would turn every document that still carries it into a parse error.
     */
    addDefaultStyle: z.boolean().default(true),
    background: GraphBackground.prefault({ backgroundType: "color", color: "whitesmoke" }),
    selection: GraphSelectionStyle.optional(),
    /**
     * Whether the starting rows draw the selection look: the project setting `startingRows`,
     * copied here for the renderer. True, the selection settings above draw nothing themselves.
     */
    startingRows: z.boolean().optional(),
    /**
     * How far the camera starts from the graph, in scene units. Set, it places the camera and
     * turns off the element's automatic zoom-to-fit; unset, the graph is framed to fit.
     */
    startingCameraDistance: z.number().optional(),
    layout: z.string().optional(), // No default - let Graph constructor set the default
    layoutOptions: z.looseObject({}).optional(),
    /** How nodes travel to a new layout: the project setting `layoutTransition`. */
    layoutTransition: LayoutTransition.optional(),
    /**
     * View mode controls how the graph is rendered and displayed.
     * - "2d": Orthographic camera, fixed top-down view
     * - "3d": Perspective camera with orbit controls (default)
     * - "ar": Augmented reality mode using WebXR
     * - "vr": Virtual reality mode using WebXR
     */
    viewMode: ViewModeSchema.default(DEFAULT_VIEW_MODE),
    /**
     * @deprecated Use viewMode instead. twoD: true is equivalent to viewMode: "2d"
     */
    twoD: z.boolean().default(false),
});
