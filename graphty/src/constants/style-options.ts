/**
 * Node shape options organized by category.
 * These shapes correspond to the available mesh types in graphty-element.
 */

export interface ShapeOption {
    value: string;
    label: string;
}

export interface ShapeGroup {
    group: string;
    items: ShapeOption[];
}

export const NODE_SHAPE_OPTIONS: ShapeGroup[] = [
    {
        group: "Basic",
        items: [
            {value: "sphere", label: "Sphere"},
            {value: "box", label: "Box"},
            {value: "cylinder", label: "Cylinder"},
            {value: "cone", label: "Cone"},
            {value: "torus", label: "Torus"},
            {value: "capsule", label: "Capsule"},
        ],
    },
    {
        group: "Platonic",
        items: [
            {value: "tetrahedron", label: "Tetrahedron"},
            {value: "octahedron", label: "Octahedron"},
            {value: "icosahedron", label: "Icosahedron"},
            {value: "dodecahedron", label: "Dodecahedron"},
        ],
    },
    {
        group: "Spherical",
        items: [
            {value: "geodesic", label: "Geodesic"},
            {value: "disc", label: "Disc"},
        ],
    },
    {
        group: "Other",
        items: [
            {value: "torusKnot", label: "Torus Knot"},
            {value: "plane", label: "Plane"},
        ],
    },
];

/**
 * Color mode options for node and edge colors.
 */
export const COLOR_MODE_OPTIONS = [
    {value: "solid", label: "Solid"},
    {value: "gradient", label: "Gradient"},
    {value: "radial", label: "Radial"},
] as const;

// Re-export ColorMode from canonical location for backwards compatibility
export type {ColorMode} from "../types/style-layer";

/**
 * Flatten shape options for simple select without groups.
 */
export function getFlatShapeOptions(): ShapeOption[] {
    return NODE_SHAPE_OPTIONS.flatMap((group) => group.items);
}

/**
 * Get shape label by value.
 */
export function getShapeLabel(value: string): string {
    const option = getFlatShapeOptions().find((opt) => opt.value === value);
    return option?.label ?? value;
}

/**
 * Edge line type options.
 * Matches graphty-element LineType enum.
 */
export const LINE_TYPE_OPTIONS = [
    {value: "solid", label: "Solid"},
    {value: "dash", label: "Dash"},
    {value: "dot", label: "Dot"},
    {value: "dash-dot", label: "Dash-Dot"},
    {value: "box", label: "Box"},
    {value: "diamond", label: "Diamond"},
    {value: "star", label: "Star"},
    {value: "sinewave", label: "Sinewave"},
    {value: "zigzag", label: "Zigzag"},
] as const;

/**
 * Arrow type options for edge heads and tails.
 * Matches graphty-element ArrowType enum.
 */
export const ARROW_TYPE_OPTIONS = [
    {value: "none", label: "None"},
    {value: "normal", label: "Normal"},
    {value: "inverted", label: "Inverted"},
    {value: "vee", label: "Vee"},
    {value: "tee", label: "Tee"},
    {value: "diamond", label: "Diamond"},
    {value: "open-diamond", label: "Open Diamond"},
    {value: "box", label: "Box"},
    {value: "dot", label: "Dot"},
    {value: "sphere-dot", label: "Sphere Dot"},
    {value: "open-dot", label: "Open Dot"},
    {value: "crow", label: "Crow"},
    {value: "half-open", label: "Half Open"},
    {value: "open-normal", label: "Open Normal"},
] as const;

/**
 * Font family options for text labels.
 */
export const FONT_OPTIONS = [
    {value: "Arial", label: "Arial"},
    {value: "Helvetica", label: "Helvetica"},
    {value: "Times New Roman", label: "Times New Roman"},
    {value: "Georgia", label: "Georgia"},
    {value: "Verdana", label: "Verdana"},
    {value: "Courier New", label: "Courier New"},
    {value: "monospace", label: "Monospace"},
] as const;

/**
 * Font weight options for text labels.
 */
export const FONT_WEIGHT_OPTIONS = [
    {value: 100, label: "Thin"},
    {value: 300, label: "Light"},
    {value: 400, label: "Normal"},
    {value: 500, label: "Medium"},
    {value: 700, label: "Bold"},
    {value: 900, label: "Black"},
] as const;

/**
 * Text location options for labels.
 * Matches graphty-element TextLocation enum.
 */
export const TEXT_LOCATION_OPTIONS = [
    {value: "static", label: "Static"},
    {value: "textPath", label: "Text Path"},
] as const;

/**
 * Text attach position options.
 * Matches graphty-element TextAttachPosition enum.
 */
export const TEXT_ATTACH_POSITION_OPTIONS = [
    {value: "above", label: "Above"},
    {value: "below", label: "Below"},
    {value: "left", label: "Left"},
    {value: "right", label: "Right"},
    {value: "center", label: "Center"},
] as const;

/**
 * Text animation options.
 * Matches graphty-element TextAnimation enum.
 */
export const TEXT_ANIMATION_OPTIONS = [
    {value: "none", label: "None"},
    {value: "typewriter", label: "Typewriter"},
    {value: "fade-in", label: "Fade In"},
    {value: "slide-in", label: "Slide In"},
] as const;
