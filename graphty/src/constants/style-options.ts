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

export type ColorMode = (typeof COLOR_MODE_OPTIONS)[number]["value"];

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
