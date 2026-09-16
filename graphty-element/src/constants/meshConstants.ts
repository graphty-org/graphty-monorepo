export const SHAPE_CONSTANTS = {
    GOLDEN_RATIO: 1.618,
    DEFAULT_NODE_SIZE: 1,
    TORUSKNOT_RADIUS_MULTIPLIER: 0.3,
    TORUSKNOT_TUBE_MULTIPLIER: 0.2,
    TORUSKNOT_RADIAL_SEGMENTS: 128,
    ICOSPHERE_RADIUS_MULTIPLIER: 0.75,
} as const;

export enum PolyhedronType {
    TETRAHEDRON = 0,
    OCTAHEDRON = 1,
    DODECAHEDRON = 2,
    ICOSAHEDRON = 3,
    RHOMBICUBOCTAHEDRON = 4,
    TRIANGULAR_PRISM = 5,
    PENTAGONAL_PRISM = 6,
    HEXAGONAL_PRISM = 7,
    SQUARE_PYRAMID = 8,
    PENTAGONAL_PYRAMID = 9,
    TRIANGULAR_DIPYRAMID = 10,
    PENTAGONAL_DIPYRAMID = 11,
    ELONGATED_SQUARE_DIPYRAMID = 12,
    ELONGATED_PENTAGONAL_DIPYRAMID = 13,
    ELONGATED_PENTAGONAL_CUPOLA = 14,
}

export const EDGE_CONSTANTS = {
    DEFAULT_LINE_WIDTH: 8.0,
    DEFAULT_LINE_COLOR: "#FFFFFF",
    DEFAULT_ARROW_WIDTH: 1.25,
    DEFAULT_ARROW_LENGTH: 0.5,
    ARROW_CAP_WIDTH_MULTIPLIER: 20,
    ARROW_CAP_WIDTH_MINIMUM: 4,
    ARROW_CAP_LENGTH_MINIMUM: 0.5,
    MOVING_LINE_BASE_COLOR: "#D3D3D3",
    MOVING_LINE_DEFAULT_COLOR: "#FF0000",
    MOVING_TEXTURE_U_SCALE: 5,
    MOVING_TEXTURE_ANIMATION_SPEED: 0.04,
    // Opacity defaults
    DEFAULT_ARROW_OPACITY: 1.0,
    DEFAULT_LINE_OPACITY: 1.0,
    // Arrow shape dimensions
    ARROW_DOT_RADIUS_MULTIPLIER: 0.15,
    ARROW_SPHERE_DOT_DIAMETER_RATIO: 0.25, // sphere-dot diameter is 1/4 of standard arrow length
    ARROW_DIAMOND_ASPECT_RATIO: 1.5,
    ARROW_BOX_ASPECT_RATIO: 1.0,
    // Hollow and line-based arrow dimensions
    ARROW_CROW_FORK_ANGLE: 30, // degrees
    ARROW_VEE_ANGLE: 60, // degrees
    ARROW_HALF_OPEN_RATIO: 0.5,
    // Line pattern parameters (multipliers relative to line width)
    DASH_LENGTH_MULTIPLIER: 3.0, // Dash length = 3x line width
    DASH_GAP_MULTIPLIER: 2.0, // Gap length = 2x line width
    SINEWAVE_AMPLITUDE_MULTIPLIER: 2,
    SINEWAVE_FREQUENCY_DEFAULT: 0.5,
    ZIGZAG_AMPLITUDE_MULTIPLIER: 2,
    ZIGZAG_FREQUENCY_DEFAULT: 1.0,
    // Bezier curve parameters
    BEZIER_CONTROL_POINT_OFFSET: 0.3,
    BEZIER_POINT_DENSITY: 8, // Lowered from 20 to reduce segment count and improve rendering
} as const;

/**
 * Tuning constants for the mesh-based patterned line renderer (dot, star, box, dash,
 * diamond, dash-dot, sinewave, zigzag).
 *
 * WHY THIS EXISTS -- the defect it prevents:
 * A patterned line is built from one real Babylon `Mesh` per pattern element, each with
 * its own `ShaderMaterial`, its own draw call and its own per-frame uniform writes. The
 * shipped count formula derived the element spacing from the element WIDTH alone
 * (`minSpacing = meshWidth * 0.5`), so the count was O(lineLength / lineWidth) with no
 * upper bound at all. Because `EdgeMesh.createLine` converts the style's line width to
 * pattern width as `options.width / 40`, making a line THINNER made it far more
 * expensive. The product owner reported this directly: "I changed line style to dot and
 * width to 1 and everything crawled to a halt."
 *
 * Measured by evaluating the shipped formula exactly, per edge at edge length 5, and
 * totalled across Karate Club's 78 edges:
 *   line width 8 -> 16 meshes/edge -> 1,248 meshes
 *   line width 4 -> 33 meshes/edge -> 2,574 meshes
 *   line width 2 -> 66 meshes/edge -> 5,148 meshes
 *   line width 1 -> 133 meshes/edge -> 10,374 meshes
 * At edge length 20 and width 1 it reached 41,574 meshes. The 8x blow-up between width 8
 * and width 1, and the total absence of a ceiling, are exact properties of that formula.
 *
 * The repair has two halves, and this constant is the second one. The first half is a
 * spacing FLOOR in world units, taken from the per-pattern `PATTERN_DEFINITIONS[*].spacing.min`
 * that already existed but was dead code -- with it, the count stops growing as the width
 * shrinks. The second half is this hard CEILING, which bounds the count on long edges no
 * matter what the pattern definition says.
 * @public
 */
export const PATTERN_CONSTANTS = {
    /**
     * Hard upper bound on the number of pattern meshes a single edge may build.
     *
     * 48 is chosen because beyond roughly this density the individual dots on a typical
     * edge are smaller than a pixel at default zoom, so the extra meshes buy no visible
     * detail while costing a draw call and two uniform writes each, every frame. Capping
     * here is a DELIBERATE visual trade: dots become sparser on long edges than they were
     * before this cap existed. That regression was accepted in exchange for the app
     * staying interactive at low line widths.
     *
     * With this cap the worst case on Karate Club is 78 x 48 = 3,744 meshes rather than
     * the measured 10,374 at width 1, and the count no longer depends on the line width.
     */
    MAX_MESHES_PER_EDGE: 48,
} as const;
