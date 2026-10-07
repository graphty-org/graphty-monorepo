/**
 * Categorical color palettes for discrete groups
 * All defaults are colorblind-safe
 */

/**
 * Okabe-Ito palette, as published -- the R 4.0+ default, safe for every form of colour blindness
 * Research: Okabe & Ito (2008) "Color Universal Design"
 *
 * The eight published colours, with one change of ORDER and none of colour. Yellow is moved to
 * the last slot because it barely shows on the element's light background (1.21:1 against
 * whitesmoke), so it is only reached when all eight colours are needed. The published black is
 * kept: an earlier copy replaced it with grey #999999, which sits too close to sky blue for
 * normal vision and to bluish green under protanopia.
 */
export const OKABE_ITO_COLORS = [
    "#E69F00", // 0 - Orange
    "#56B4E9", // 1 - Sky Blue
    "#009E73", // 2 - Bluish Green
    "#0072B2", // 3 - Blue
    "#D55E00", // 4 - Vermillion
    "#CC79A7", // 5 - Reddish Purple
    "#000000", // 6 - Black
    "#F0E442", // 7 - Yellow (last: faint on a light background)
] as const;

/**
 * The one colour an overflowing group encoding paints every group past the palette's capacity.
 *
 * A mid grey, #686868 (OKLab lightness 0.52), measured as a lit 3D node draws it: the shadow
 * side, middle and lit side of a node are 0.55, 0.875 and 1.2 times its colour. It is chosen to
 * stay clear of Okabe-Ito black on a node, where the old #505050 sank towards it: Delta E 34.5
 * in OKLab on the shadow side and 47.1 in the middle (#505050: 29.3 and 39.4). It is the lightest
 * grey that keeps every tone of a node at least Delta E 6 from every Okabe-Ito colour under
 * protanopia and deuteranopia (nearest: bluish green #009E73); lighter greys fall to 4.4 and
 * below. Normal vision: 13.2 flat and 8.3 on the shadow side from blue #0072B2, the nearest.
 * Against the default whitesmoke background it is 5.1:1 flat and 3.8:1 on the lit side.
 * `test/catalog/default-palette-quality.test.ts` measures it.
 */
export const OTHER_GROUP_COLOR = "#686868";

/**
 * Paul Tol Vibrant palette - high saturation, 7 colors
 * ✅ Colorblind-safe ✅ High contrast
 * Research: Paul Tol SRON/EPS/TN/09-002
 */
export const TOL_VIBRANT_COLORS = [
    "#0077BB", // Blue
    "#33BBEE", // Cyan
    "#009988", // Teal
    "#EE7733", // Orange
    "#CC3311", // Red
    "#EE3377", // Magenta
    "#BBBBBB", // Gray
] as const;

/**
 * Paul Tol Muted palette - softer colors, 9 colors
 * ✅ Colorblind-safe ✅ More categories
 * Research: Paul Tol SRON/EPS/TN/09-002
 */
export const TOL_MUTED_COLORS = [
    "#332288", // Indigo
    "#88CCEE", // Cyan
    "#44AA99", // Teal
    "#117733", // Green
    "#999933", // Olive
    "#DDCC77", // Sand
    "#CC6677", // Rose
    "#882255", // Wine
    "#AA4499", // Purple
] as const;

/**
 * IBM Carbon palette - modern enterprise design
 * Modern enterprise aesthetic
 * Research: IBM Carbon Design System
 */
export const CARBON_COLORS = [
    "#6929C4", // Purple (primary)
    "#1192E8", // Blue
    "#005D5D", // Teal
    "#9F1853", // Magenta
    "#FA4D56", // Red
] as const;

/**
 * Pastel variant - softer version of Okabe-Ito
 * ✅ Colorblind-safe (derived from Okabe-Ito)
 * ⚠️ Lower contrast
 */
export const PASTEL_COLORS = [
    "#FFD699", // Light orange
    "#A8D8F0", // Light sky blue
    "#66C9B2", // Light teal
    "#FFF099", // Light yellow
    "#669DD6", // Light blue
    "#FF9980", // Light vermillion
    "#EBB8D2", // Light purple
    "#CCCCCC", // Light gray
] as const;
