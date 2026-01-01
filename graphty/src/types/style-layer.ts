/**
 * Color mode options for node and edge colors.
 */
export type ColorMode = "solid" | "gradient" | "radial";

/**
 * Color stop for gradient configurations.
 * Each stop has a unique ID for stable React keys.
 */
export interface ColorStop {
    /** Unique identifier for stable React keys */
    id: string;
    offset: number;
    color: string;
}

/**
 * Solid color configuration.
 */
export interface SolidColorConfig {
    mode: "solid";
    color: string;
    opacity: number;
}

/**
 * Linear gradient color configuration.
 */
export interface GradientColorConfig {
    mode: "gradient";
    stops: ColorStop[];
    direction: number;
    opacity: number;
}

/**
 * Radial gradient color configuration.
 */
export interface RadialColorConfig {
    mode: "radial";
    stops: ColorStop[];
    opacity: number;
}

/**
 * Union type for all color configurations.
 */
export type ColorConfig = SolidColorConfig | GradientColorConfig | RadialColorConfig;

/**
 * Node shape configuration.
 */
export interface ShapeConfig {
    type: string;
    size: number;
}

/**
 * Glow effect configuration.
 */
export interface GlowConfig {
    enabled: boolean;
    color: string;
    strength: number;
}

/**
 * Outline effect configuration.
 */
export interface OutlineConfig {
    enabled: boolean;
    color: string;
    width: number;
}

/**
 * Combined node effects configuration.
 */
export interface NodeEffectsConfig {
    glow?: GlowConfig;
    outline?: OutlineConfig;
    wireframe: boolean;
    flatShaded: boolean;
}

/**
 * Node style configuration with shape and color options.
 */
export interface NodeStyle {
    shape?: ShapeConfig;
    color?: ColorConfig;
    // Legacy support for simple color string
    texture?: { color?: string };
    // Node effects
    effects?: NodeEffectsConfig;
    // Labels and tooltips
    label?: RichTextStyle;
    tooltip?: RichTextStyle;
}

/**
 * Edge line type options.
 * Matches graphty-element LineType enum.
 */
export type EdgeLineType = "solid" | "dot" | "star" | "box" | "dash" | "diamond" | "dash-dot" | "sinewave" | "zigzag";

/**
 * Edge arrow type options.
 * Matches graphty-element ArrowType enum.
 */
export type ArrowType =
    | "none"
    | "normal"
    | "inverted"
    | "dot"
    | "sphere-dot"
    | "open-dot"
    | "tee"
    | "open-normal"
    | "diamond"
    | "open-diamond"
    | "crow"
    | "box"
    | "half-open"
    | "vee";

/**
 * Edge line configuration.
 */
export interface EdgeLineConfig {
    type: EdgeLineType;
    width: number;
    color: string;
    opacity: number;
    animationSpeed?: number;
}

/**
 * Arrow configuration for head or tail.
 */
export interface ArrowConfig {
    type: ArrowType;
    size: number;
    color: string;
    opacity: number;
}

/**
 * Complete edge style configuration.
 */
export interface EdgeStyle {
    line?: EdgeLineConfig;
    arrowHead?: ArrowConfig;
    arrowTail?: ArrowConfig;
    label?: RichTextStyle;
    tooltip?: RichTextStyle;
}

/**
 * Text location options for labels and tooltips.
 * Matches graphty-element TextLocation enum.
 */
export type TextLocation = "static" | "textPath";

/**
 * Text attach position options.
 * Matches graphty-element TextAttachPosition enum.
 */
export type TextAttachPosition = "above" | "below" | "left" | "right" | "center";

/**
 * Text animation options.
 * Matches graphty-element TextAnimation enum.
 */
export type TextAnimation = "none" | "typewriter" | "fade-in" | "slide-in";

/**
 * Text outline style configuration.
 */
export interface TextOutlineStyle {
    enabled: boolean;
    color: string;
    width: number;
}

/**
 * Text shadow style configuration.
 */
export interface TextShadowStyle {
    enabled: boolean;
    color: string;
    blur: number;
    offsetX: number;
    offsetY: number;
}

/**
 * Text background style configuration.
 */
export interface TextBackgroundStyle {
    enabled: boolean;
    color: string;
    padding: number;
    borderRadius: number;
}

/**
 * Rich text style configuration for labels and tooltips.
 * Supports comprehensive text styling options.
 */
export interface RichTextStyle {
    enabled: boolean;
    text: string;
    location: TextLocation;
    font: {
        family: string;
        size: number;
        weight: number;
        color: string;
    };
    background?: TextBackgroundStyle;
    position: {
        attachPosition: TextAttachPosition;
        offset: number;
        billboard: boolean;
    };
    effects?: {
        outline?: TextOutlineStyle;
        shadow?: TextShadowStyle;
    };
    animation?: {
        type: TextAnimation;
        duration: number;
    };
    advanced?: {
        resolution: number;
        depthFade: boolean;
    };
}

/**
 * Represents the state of a style layer with node and edge styling configurations.
 */
export interface StyleLayerState {
    id: string;
    name: string;
    node: {
        selector: string;
        style: NodeStyle;
    };
    edge: {
        selector: string;
        style: EdgeStyle;
    };
}
