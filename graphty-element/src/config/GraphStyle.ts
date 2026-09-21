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

const GraphEffects = z.strictObject({
    // https://doc.babylonjs.com/features/featuresDeepDive/postProcesses/motionBlurPostProcess/
    motionBlur: z.number().optional(),
    // https://doc.babylonjs.com/features/featuresDeepDive/postProcesses/dofLenseEffects/
    depthOfField: z.number().optional(),
    // https://doc.babylonjs.com/features/featuresDeepDive/postProcesses/SSRRenderingPipeline/
    screenSpaceReflections: z.boolean().optional(),
});

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
    effects: GraphEffects.optional(),
    startingCameraDistance: z.number().default(30), // TODO: replace with "zoomToFit: z.boolean()"
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
