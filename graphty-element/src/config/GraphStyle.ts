import { z } from "zod/v4";

import { ColorStyle, ImageData } from "./common";
import { DEFAULT_VIEW_MODE } from "./ViewMode";

const GraphBackgroundColor = z.strictObject({
    backgroundType: z.literal("color"),
    color: ColorStyle,
});

const GraphBackgroundSkybox = z.strictObject({
    backgroundType: z.literal("skybox"),
    data: ImageData,
});

/**
 * What the graph is drawn against: a flat colour, or a photo-dome skybox built from an image.
 *
 * The colour accepts any CSS colour the element understands and is normalised to hex on parse;
 * the skybox's `data` is an image URL or a base64 PNG. It is the shape `element.background` and
 * `graph.setBackground()` take.
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
     * How far the camera starts from the graph, in scene units. Set, it places the camera and
     * turns off the element's automatic zoom-to-fit; unset, the graph is framed to fit.
     */
    startingCameraDistance: z.number().optional(),
    layout: z.string().optional(), // No default - let Graph constructor set the default
    layoutOptions: z.looseObject({}).optional(),
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
