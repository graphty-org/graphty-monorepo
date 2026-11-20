/**
 * Proportions graphty-element builds node shapes with. Each is a multiple of a node's `size`
 * unless it says otherwise.
 */
export const SHAPE_CONSTANTS = {
    /** A cylinder's and a cone's height, as a multiple of their diameter. */
    GOLDEN_RATIO: 1.618,
    /** A node's size when its style sets none. Not read by the shape builders. */
    DEFAULT_NODE_SIZE: 1,
    /** A torus knot's radius, as a multiple of the node's size. */
    TORUSKNOT_RADIUS_MULTIPLIER: 0.3,
    /** A torus knot's tube radius, as a multiple of the node's size. */
    TORUSKNOT_TUBE_MULTIPLIER: 0.2,
    /** How many segments a torus knot is drawn with around its tube's path. */
    TORUSKNOT_RADIAL_SEGMENTS: 128,
    /** An icosphere's radius, as a multiple of the node's size. */
    ICOSPHERE_RADIUS_MULTIPLIER: 0.75,
    /**
     * A capsule's radius, as a multiple of the node's size. A capsule is `size` tall (caps
     * included) and `size / 2` wide. At size 1 this is Babylon's own default.
     */
    CAPSULE_RADIUS_MULTIPLIER: 0.25,
    /**
     * A torus ring's thickness, as a multiple of the node's size. A torus is `size` across its
     * center line and `size / 2` thick. At size 1 this is Babylon's own default.
     */
    TORUS_THICKNESS_MULTIPLIER: 0.5,
} as const;

/**
 * The polyhedra a node shape can be, numbered as Babylon.js's `MeshBuilder.CreatePolyhedron`
 * numbers its `type` option.
 */
export enum PolyhedronType {
    /** Four triangular faces. */
    TETRAHEDRON = 0,
    /** Eight triangular faces. */
    OCTAHEDRON = 1,
    /** Twelve pentagonal faces. */
    DODECAHEDRON = 2,
    /** Twenty triangular faces. */
    ICOSAHEDRON = 3,
    /** Eight triangles and eighteen squares. */
    RHOMBICUBOCTAHEDRON = 4,
    /** Two triangles joined by three rectangles. */
    TRIANGULAR_PRISM = 5,
    /** Two pentagons joined by five rectangles. */
    PENTAGONAL_PRISM = 6,
    /** Two hexagons joined by six rectangles. */
    HEXAGONAL_PRISM = 7,
    /** A square base under four triangles. */
    SQUARE_PYRAMID = 8,
    /** A pentagonal base under five triangles. */
    PENTAGONAL_PYRAMID = 9,
    /** Two triangular pyramids joined at their bases. */
    TRIANGULAR_DIPYRAMID = 10,
    /** Two pentagonal pyramids joined at their bases. */
    PENTAGONAL_DIPYRAMID = 11,
    /** Two square pyramids with a square prism between them. */
    ELONGATED_SQUARE_DIPYRAMID = 12,
    /** Two pentagonal pyramids with a pentagonal prism between them. */
    ELONGATED_PENTAGONAL_DIPYRAMID = 13,
    /** A pentagonal cupola on a decagonal prism. */
    ELONGATED_PENTAGONAL_CUPOLA = 14,
}

/** Defaults and proportions graphty-element draws edges, arrowheads and line patterns with. */
export const EDGE_CONSTANTS = {
    DEFAULT_LINE_WIDTH: 8,
    DEFAULT_LINE_COLOR: "#FFFFFF",
    /** An arrowhead's width when its style sets none, in world units. */
    DEFAULT_ARROW_WIDTH: 1.25,
    /** An arrowhead's length when its style sets none, in world units. */
    DEFAULT_ARROW_LENGTH: 0.5,
    /** The "normal" (filled triangle), vee and diamond arrows' width across their line, as a fraction of their length. */
    NORMAL_ARROW_ASPECT: 0.8,
    /** An arrowhead's width as a multiple of its line's width. Not read by the renderer. */
    ARROW_CAP_WIDTH_MULTIPLIER: 20,
    /** The narrowest an arrowhead may be. Not read by the renderer. */
    ARROW_CAP_WIDTH_MINIMUM: 4,
    /** The shortest an arrowhead may be. Not read by the renderer. */
    ARROW_CAP_LENGTH_MINIMUM: 0.5,
    /** The background color of an animated (moving) line, under its moving stripes. */
    MOVING_LINE_BASE_COLOR: "#D3D3D3",
    /** The stripe color of an animated line whose style sets none. Not read by the renderer. */
    MOVING_LINE_DEFAULT_COLOR: "#FF0000",
    /** How many times an animated line's stripe texture repeats along the line. */
    MOVING_TEXTURE_U_SCALE: 5,
    /**
     * How far an animated line's stripes move each frame at a 60 Hz pace, as a share of the
     * texture. A style's `animationSpeed` multiplies it.
     */
    MOVING_TEXTURE_ANIMATION_SPEED: 0.04,
    /** An arrowhead's opacity when its style sets none, 0 to 1. Not read by the renderer. */
    DEFAULT_ARROW_OPACITY: 1,
    /** A line's opacity when its style sets none, 0 to 1. Not read by the renderer. */
    DEFAULT_LINE_OPACITY: 1,
    /** A dot arrowhead's radius as a multiple of the arrow length. Not read by the renderer. */
    ARROW_DOT_RADIUS_MULTIPLIER: 0.15,
    /** A sphere-dot arrowhead's diameter as a fraction of the standard arrow length (a quarter). Not read by the renderer. */
    ARROW_SPHERE_DOT_DIAMETER_RATIO: 0.25,
    /** A diamond arrowhead's length over its width. Not read by the renderer. */
    ARROW_DIAMOND_ASPECT_RATIO: 1.5,
    /** A box arrowhead's length over its width. Not read by the renderer. */
    ARROW_BOX_ASPECT_RATIO: 1,
    /** The angle between a crow's-foot arrowhead's prongs, in degrees. Not read by the renderer. */
    ARROW_CROW_FORK_ANGLE: 30,
    /** The angle between a vee arrowhead's arms, in degrees. Not read by the renderer. */
    ARROW_VEE_ANGLE: 60,
    /** How much of a half-open arrowhead is drawn, as a fraction. Not read by the renderer. */
    ARROW_HALF_OPEN_RATIO: 0.5,
    /** A dashed line's dash length, as a multiple of its line width. Not read by the renderer. */
    DASH_LENGTH_MULTIPLIER: 3,
    /** A dashed line's gap length, as a multiple of its line width. Not read by the renderer. */
    DASH_GAP_MULTIPLIER: 2,
    /** A sine-wave line's amplitude, as a multiple of its line width. Not read by the renderer. */
    SINEWAVE_AMPLITUDE_MULTIPLIER: 2,
    /** A sine-wave line's waves per unit length when its style sets none. Not read by the renderer. */
    SINEWAVE_FREQUENCY_DEFAULT: 0.5,
    /** A zigzag line's amplitude, as a multiple of its line width. Not read by the renderer. */
    ZIGZAG_AMPLITUDE_MULTIPLIER: 2,
    /** A zigzag line's zigzags per unit length when its style sets none. Not read by the renderer. */
    ZIGZAG_FREQUENCY_DEFAULT: 1,
    /** How far a curved edge's two control points stand off the straight line, as a share of its length. */
    BEZIER_CONTROL_POINT_OFFSET: 0.3,
    /** How many segments a curved edge is drawn with per world unit of its length, up to `BEZIER_MAX_SEGMENTS`. */
    BEZIER_POINT_DENSITY: 8,
    /**
     * The most segments one curve is drawn with, however long it is (issue #2249). The density
     * above is per world unit, and a layout of a few hundred nodes spreads them over hundreds of
     * units, so without a ceiling one curve took about 1,200 segments and 359 curves took 430,000
     * -- over ten seconds to settle. A curve this program draws bows by a fixed fraction of its
     * length, so its shape needs the same number of segments at any length: at 64 the chords stray
     * from the true curve by about 1/30,000 of its length, under a pixel on any screen.
     */
    BEZIER_MAX_SEGMENTS: 64,
} as const;
