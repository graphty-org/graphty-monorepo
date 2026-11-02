/**
 * @file The shader that draws a bent edge's pieces joined at their corners, and the template
 * geometry each piece is drawn from. Design: `design/edges/sharp-corners.md`.
 *
 * Plain strings and arrays, nothing from Babylon.js, so the prototype harness in
 * `design/edges/prototype/` draws with exactly this text.
 *
 * ONE INSTANCE PER PIECE. A piece reads six points -- the corners two back and one back, its own
 * start and end, and the corners one and two ahead -- and draws its own rectangle with square
 * ends, plus the outer half of the join at each corner it shares: a miter, clipped flat past the
 * miter limit (SVG 2's `miter-clip`) and where it would reach past the shorter of the two pieces,
 * so a corner's point shrinks smoothly as the bend sharpens on screen rather than jumping to a
 * bevel. A straight edge has no neighbours (its previous point is its start, its next point is its
 * end), so it draws exactly the rectangle it always drew.
 *
 * NO PIXEL IS DRAWN TWICE. Pieces overlap on the inside of a bend, and past a piece shorter than
 * the line is wide the pieces either side of it overlap each other. Of the pieces whose shape (the
 * piece and the joins at its corners) covers a pixel's centre, the one whose centre line is nearest
 * draws it, the earlier on a tie. Between neighbours that is the corner's bisector; where three
 * pieces overlap, distance orders them, so exactly one draws (issue #3096). Every piece tests the
 * same point -- the centre of the pixel being drawn, not a position interpolated a few hundredths
 * of a pixel off, differently in each piece -- with the same numbers, and under the 3D camera's
 * perspective a piece is tested as the trapezoid its triangles draw, so no pixel at the inside of
 * a corner is left to neither piece or taken by both (issue #3114). A translucent line stays one
 * even tint.
 *
 * WIDENED BATCHES (`EDGE_WIDENED`). A batch that draws a shader or a taper reads five more
 * instanced attributes per piece, from a second buffer of static values written on a repaint (the
 * end colors, the varying shader parameters, seed, parameter row, state bits and taper, and the
 * state stamps), and one more dynamic value beside the corners: the whole edge's length, so a
 * piece knows how far along the edge it is. A batch without either define is the plain line,
 * reading exactly the attributes it always read.
 *
 * THE EDGE-SURFACE HOOK (`EDGE_SHADED`). With it the fragment's color is not the uniform color but
 * `graphty_edgeShade(t, side, lengthPx, widthPx, coverage)`, declared here and defined by the
 * shader runtime after this text (`src/shaders/runtime/edgePrograms.ts`), which fills `EdgeInput`
 * and calls the shader's body. Width, taper, corners and the arrowheads (drawn by their own
 * batches) are unchanged: a surface replaces only the color of the pixels the line already covers.
 *
 * DASHES FOLLOW THE WHOLE EDGE. A fragment's distance is measured along its own piece from the
 * edge's start; in the overlap on the inside of a bend it is drawn when either piece's dash covers
 * it, which is what dashing the centre line and then stroking each dash would draw.
 */

/** The longest miter drawn, as a multiple of half the line's width (SVG's and Canvas's limit). */
export const EDGE_MITER_LIMIT = 4;

/**
 * Floats per piece: previous corner (3), start (3), end (3), next corner (3), the distance along
 * the edge to the start (1), the pattern's element spacing (1), and the corners two back (3) and
 * two ahead (3).
 */
export const JOIN_FLOATS_PER_PIECE = 20;

/**
 * Floats per piece in a widened batch's dynamic buffer: the plain piece's twenty and the whole
 * edge's length along its pieces.
 */
export const WIDENED_FLOATS_PER_PIECE = 21;

/**
 * The static attributes of a widened batch, each a vec4, in their buffer's order: the line color
 * at the source and at the target (alpha the opacity), the shader's varying parameters, then
 * (seed, parameter-set row, state bits, taper) and the (entered, exited, changed) stamps.
 */
export const EDGE_STATIC_ATTRIBUTES = ["edgeColorA", "edgeColorB", "edgeParams", "edgeMeta", "edgeTimes"] as const;

/** Floats per piece in a widened batch's static buffer. */
export const EDGE_STATIC_FLOATS = EDGE_STATIC_ATTRIBUTES.length * 4;

/** The state bits an edge shader reads from `edgeMeta.z`. */
export const EDGE_STATE_BITS = { selected: 1, hovered: 2, sourceSelected: 4, targetSelected: 8 } as const;

/**
 * The template every piece is drawn from: seven vertices at each end -- the centre, one on each
 * side, and two join vertices per side: where the side's edge meets the clip line, and the clip
 * line's point on the miter direction (both the miter tip when the miter is not clipped). `x` is
 * the end (0 start, 1 end), `y` the side (-1, 0, 1), `z` 1 for the first join vertex, 2 for the
 * second.
 */
export const JOIN_TEMPLATE_POSITIONS: readonly number[] = [
    0, 0, 0, 0, 1, 0, 0, -1, 0, 0, 1, 1, 0, -1, 1, 1, 0, 0, 1, 1, 0, 1, -1, 0, 1, 1, 1, 1, -1, 1, 0, 1, 2, 0, -1, 2, 1,
    1, 2, 1, -1, 2,
];

/**
 * The rectangle, then the join at each end and side: two triangles (centre, side, first join
 * vertex) and (centre, first join vertex, second join vertex).
 */
export const JOIN_TEMPLATE_INDICES: readonly number[] = [
    1, 2, 7, 1, 7, 6, 0, 1, 3, 0, 2, 4, 5, 6, 8, 5, 7, 9, 0, 3, 10, 0, 4, 11, 5, 8, 12, 5, 9, 13,
];

/**
 * The vertex shader. `WORLD_WIDTH` takes `width` in world units (2D lines, and patterned lines in
 * either mode); without it `width` is the 3D solid line's screen width, drawn as it always was.
 */
export const EDGE_JOIN_VERTEX_SHADER = `
precision highp float;

attribute vec3 position;
attribute vec3 pPrev2;
attribute vec3 pPrev;
attribute vec3 pA;
attribute vec3 pB;
attribute vec3 pNext;
attribute vec3 pNext2;
attribute vec2 run;

uniform mat4 world;
uniform mat4 viewProjection;
uniform mat4 projection;
uniform vec2 resolution;
uniform float width;
uniform float minWidth;
uniform float miterLimit;

varying vec4 vScreen;
varying vec4 vOwn;
varying vec4 vOwn2;
varying vec4 vNbA;
varying vec4 vEndB;
varying vec4 vNbB;
varying vec4 vPrev2;
varying vec4 vNext2;
varying vec4 vWidth;
varying vec2 vFar;

#ifdef EDGE_WIDENED
attribute float runTotal;
attribute vec4 edgeColorA;
attribute vec4 edgeColorB;
attribute vec4 edgeParams;
attribute vec4 edgeMeta;
attribute vec4 edgeTimes;
// How many times the line's own width this batch draws: an edge effect's reach, 1 otherwise.
uniform float edgeReach;
varying vec4 vEdgeColorA;
varying vec4 vEdgeColorB;
varying vec4 vEdgeParams;
varying vec4 vEdgeMeta;
varying vec4 vEdgeTimes;
varying float vEdgeTotal;
#endif

const float EPS = 1e-4;

vec4 clipOf(vec3 p) {
    return viewProjection * (world * vec4(p, 1.0));
}

vec2 toPx(vec4 c) {
    return c.xy / c.w * 0.5 * resolution;
}

vec2 perpOf(vec2 v) {
    return vec2(-v.y, v.x);
}

// Half the line's width in pixels at a point, before a sub-pixel line is widened: never under
// half of minWidth, the fewest pixels wide the line is drawn (line.minScreenWidth).
float halfWidthAt(vec4 c) {
#ifdef WORLD_WIDTH
    float hw = width * length(world[1].xyz) * projection[1][1] * resolution.y * 0.25 / c.w;
#else
    // The 3D line's own scale: an offset of width / 2 over the resolution in clip space, which the
    // perspective divide tapers with distance.
    float hw = width * 0.25 / c.w;
#endif
    return max(hw, minWidth * 0.5);
}

// A line thinner than one pixel is drawn one pixel wide and fainter, as a canvas draws a hairline.
float drawnHalfWidth(float hw) {
    return hw > 0.0 && hw < 0.5 ? 0.5 : hw;
}

// Half the line's drawn width at a point, along the whole edge (0 to 1) for a taper: the width the
// piece ending there draws it at.
float drawnHalfWidthAt(vec3 p, float along) {
    float raw = halfWidthAt(clipOf(p));
#ifdef EDGE_WIDENED
    raw *= mix(1.0, edgeMeta.w, clamp(along, 0.0, 1.0)) * edgeReach;
#endif
    return drawnHalfWidth(raw);
}

// The centre line of the piece from p0 to p1: its unit normal and offset (n, c, so a point x is
// dot(x, n) - c from it), and its length. Every piece that reads this piece computes it from the
// same two points with this same arithmetic, so all of them get the same line.
vec4 lineOf(vec2 p0, vec2 p1) {
    vec2 v = p1 - p0;
    float len = length(v);
    vec2 dir = len > EPS ? v / len : vec2(1.0, 0.0);
    vec2 n = vec2(-dir.y, dir.x);
    return vec4(n, dot(p0, n), len);
}

// The corner at p between the piece from q0 and the piece to q1: unit directions in and out, and
// the bisector's normal t. The same arithmetic on the same three points in both pieces.
void cornerAt(vec2 q0, vec2 p, vec2 q1, out vec2 dIn, out vec2 dOut, out vec2 t, out float lenIn, out float lenOut) {
    vec2 a = p - q0;
    vec2 b = q1 - p;
    lenIn = length(a);
    lenOut = length(b);
    dIn = lenIn > EPS ? a / lenIn : vec2(0.0);
    dOut = lenOut > EPS ? b / lenOut : vec2(0.0);
    vec2 s = dIn + dOut;
    float sl = length(s);
    t = sl > 1e-6 ? s / sl : dIn;
}

void main() {
    bool atB = position.x > 0.5;
    float side = position.y;
    bool joinVertex = position.z > 0.5;
    bool clipVertex = position.z > 1.5;

    vec4 cA = clipOf(pA);
    vec4 cB = clipOf(pB);
    vec2 sPrev = toPx(clipOf(pPrev));
    vec2 sA = toPx(cA);
    vec2 sB = toPx(cB);
    vec2 sNext = toPx(clipOf(pNext));

    vec2 own = sB - sA;
    float lenOwn = length(own);
    vec2 d = lenOwn > EPS ? own / lenOwn : vec2(1.0, 0.0);
    vec2 n = perpOf(d);

    vec2 inA; vec2 outA; vec2 tA; float lenInA; float lenOutA;
    cornerAt(sPrev, sA, sB, inA, outA, tA, lenInA, lenOutA);
    vec2 inB; vec2 outB; vec2 tB; float lenInB; float lenOutB;
    cornerAt(sA, sB, sNext, inB, outB, tB, lenInB, lenOutB);

    bool joinedA = lenInA > EPS && lenOwn > EPS;
    bool joinedB = lenOutB > EPS && lenOwn > EPS;

    float rawA = halfWidthAt(cA);
    float rawB = halfWidthAt(cB);
#ifdef EDGE_WIDENED
    // The taper: the width at each end of the piece, by how far along the whole edge it is.
    float total = runTotal;
    float alongA = total > 0.0 ? clamp(run.x / total, 0.0, 1.0) : 0.0;
    float alongB = total > 0.0 ? clamp((run.x + length(pB - pA)) / total, 0.0, 1.0) : 1.0;
    rawA *= mix(1.0, edgeMeta.w, alongA) * edgeReach;
    rawB *= mix(1.0, edgeMeta.w, alongB) * edgeReach;
    vEdgeColorA = edgeColorA;
    vEdgeColorB = edgeColorB;
    vEdgeParams = edgeParams;
    vEdgeMeta = edgeMeta;
    vEdgeTimes = edgeTimes;
    vEdgeTotal = total;
#endif
    float hwA = drawnHalfWidth(rawA);
    float hwB = drawnHalfWidth(rawB);

    // The neighbours' far ends, at the widths they are drawn, and the pieces two away.
#ifdef EDGE_WIDENED
    float perTotal = total > 0.0 ? 1.0 / total : 0.0;
#else
    float perTotal = 0.0;
#endif
    float hwPrevFar = drawnHalfWidthAt(pPrev, (run.x - length(pA - pPrev)) * perTotal);
    float hwNextFar = drawnHalfWidthAt(pNext, (run.x + length(pB - pA) + length(pNext - pB)) * perTotal);
    vec4 linePrev2 = lineOf(toPx(clipOf(pPrev2)), sPrev);
    vec4 lineNext2 = lineOf(sNext, toPx(clipOf(pNext2)));
    float backPrev2 = run.x - length(pA - pPrev) - length(pPrev - pPrev2);
    float aheadNext2 = run.x + length(pB - pA) + length(pNext - pB) + length(pNext2 - pNext);
    // The far ends of the pieces two away.
    vFar = vec2(drawnHalfWidthAt(pPrev2, backPrev2 * perTotal), drawnHalfWidthAt(pNext2, aheadNext2 * perTotal));

    vec4 cP = atB ? cB : cA;
    vec2 sP = atB ? sB : sA;
    float hw = atB ? hwB : hwA;
    float raw = atB ? rawB : rawA;
    bool joined = atB ? joinedB : joinedA;

    vec2 off = side * n * hw;
    if (lenOwn <= EPS) {
        off = vec2(0.0);
    } else if (joinVertex && joined) {
        vec2 dIn = atB ? inB : inA;
        vec2 dOut = atB ? outB : outA;
        float lenIn = atB ? lenInB : lenInA;
        float lenOut = atB ? lenOutB : lenOutA;
        float cr = dIn.x * dOut.y - dIn.y * dOut.x;
        float outer = cr > 0.0 ? -1.0 : 1.0;
        if (side * outer > 0.0) {
            vec2 sum = perpOf(dIn) + perpOf(dOut);
            float sl = length(sum);
            float cosH = max(sl * 0.5, 1e-6);
            float sinH = sqrt(max(0.0, 1.0 - cosH * cosH));
            // The miter direction, outwards; a U-turn's is straight on along the line.
            vec2 m = sl > 1e-6 ? outer * sum / sl : dIn;
            // How far past the corner the outer edge runs: to the miter tip, or to the clip line
            // at miterLimit half-widths from the corner (SVG 2's miter-clip), and never further
            // than the shorter piece is long. Measured along the edge, so a U-turn is stable.
            float tMiter = hw * sinH / cosH;
            float tLimit = 1.0 / cosH <= miterLimit ? tMiter : (miterLimit - cosH) * hw / sinH;
            float tMax = min(min(lenIn, lenOut), tLimit);
            if (tMiter <= tMax) {
                off = m * hw / cosH;
            } else if (clipVertex) {
                off = m * (hw * cosH + tMax * sinH);
            } else {
                off = side * n * hw + (atB ? d : -d) * tMax;
            }
        } else {
            off = vec2(0.0);
        }
    }

    gl_Position = cP;
    gl_Position.xy += off * 2.0 / resolution * cP.w;

    vec2 here = sP + off;
    vScreen = vec4(here * cP.w, cP.w, hw);

    float worldOwn = length(pB - pA);
    vOwn = vec4(sA, d);
    vOwn2 = vec4(lenOwn, lenOwn > EPS ? worldOwn / lenOwn : 0.0, run.x, run.y);
    vNbA = vec4(-inA, joinedA ? lenInA : 0.0, lenInA > EPS ? length(pA - pPrev) / lenInA : 0.0);
    vEndB = vec4(sB, hwPrevFar, hwNextFar);
    vNbB = vec4(outB, joinedB ? lenOutB : 0.0, lenOutB > EPS ? length(pNext - pB) / lenOutB : 0.0);
    // A piece two away is drawn only past a joined neighbour; its length 0 marks none.
    vPrev2 = vec4(linePrev2.xyz, joinedA && linePrev2.w > EPS ? linePrev2.w : 0.0);
    vNext2 = vec4(lineNext2.xyz, joinedB && lineNext2.w > EPS ? lineNext2.w : 0.0);
    // The coverage is under 1 for a hairline; the last is the own centre line's offset, which the
    // pieces two away compute the same way.
    vWidth = vec4(hwA, hwB, raw > 0.0 && raw < 0.5 ? raw * 2.0 : 1.0, lineOf(sA, sB).z);
}
`;

/**
 * The fragment shader. `pattern` is (element length along the line, kind, half the line's width),
 * all in world units; kind 0 is solid, 1 dash, 2 dot.
 */
export const EDGE_JOIN_FRAGMENT_SHADER = `
precision highp float;

uniform vec3 color;
uniform float opacity;
uniform vec3 pattern;
uniform vec2 resolution;
uniform float miterLimit;
// The viewport's size in the pixels being drawn (the canvas's, or a capture's); 0 when unknown.
uniform vec2 fragmentSize;

varying vec4 vScreen;
varying vec4 vOwn;
varying vec4 vOwn2;
varying vec4 vNbA;
varying vec4 vEndB;
varying vec4 vNbB;
varying vec4 vPrev2;
varying vec4 vNext2;
varying vec4 vWidth;
varying vec2 vFar;

#ifdef EDGE_WIDENED
varying vec4 vEdgeColorA;
varying vec4 vEdgeColorB;
varying vec4 vEdgeParams;
varying vec4 vEdgeMeta;
varying vec4 vEdgeTimes;
varying float vEdgeTotal;
uniform float edgeReach;
#endif

#ifdef EDGE_SHADED
// Defined after this text by the shader runtime: the shader's color for one pixel of the line.
vec4 graphty_edgeShade(float t, float side, float lengthPx, float widthPx, float coverage);
#endif

// How far inside its edges a piece or a join must cover a pixel's centre to count, in pixels: more
// than where the rasterizer, which snaps corners to a sub-pixel grid, might put an edge, so a piece
// counted as covering a pixel always draws it.
const float INSIDE = 0.05;
// Pixels of difference between two distances that rounding alone could make.
const float TIE = 1e-3;

// Whether a point u from a piece's near end is inside the piece, by m: dir along it, len long,
// hwNear and hwFar half its width at its ends (a trapezoid under perspective, as its triangles
// draw it).
bool inPiece(vec2 u, vec2 dir, float len, float hwNear, float hwFar, float m) {
    float a = dot(u, dir);
    float c = dot(u, vec2(-dir.y, dir.x));
    return len > 0.0 && a >= m && a <= len - m && abs(c) <= mix(hwNear, hwFar, a / len) - m;
}

// Whether a point u from a corner is inside the join its two pieces draw on the outside of it, by
// m: dIn and dOut the pieces' unit directions, lenIn and lenOut their lengths (0 for none), hw half
// the line's width there. The same miter, clipped the same way, as the vertex shader draws.
bool inJoin(vec2 u, vec2 dIn, vec2 dOut, float lenIn, float lenOut, float hw, float m) {
    if (lenIn <= 0.0 || lenOut <= 0.0 || dot(u, dIn) < m || dot(u, dOut) > -m) {
        return false;
    }
    float outer = dIn.x * dOut.y - dIn.y * dOut.x > 0.0 ? -1.0 : 1.0;
    vec2 nIn = outer * vec2(-dIn.y, dIn.x);
    vec2 nOut = outer * vec2(-dOut.y, dOut.x);
    if (dot(u, nIn) > hw - m || dot(u, nOut) > hw - m) {
        return false;
    }
    vec2 sum = nIn + nOut;
    float sl = length(sum);
    float cosH = max(sl * 0.5, 1e-6);
    float sinH = sqrt(max(0.0, 1.0 - cosH * cosH));
    vec2 mid = sl > 1e-6 ? sum / sl : dIn;
    float tMiter = hw * sinH / cosH;
    float tLimit = 1.0 / cosH <= miterLimit ? tMiter : (miterLimit - cosH) * hw / sinH;
    float tMax = min(min(lenIn, lenOut), tLimit);
    return tMiter <= tMax || dot(u, mid) <= hw * cosH + tMax * sinH - m;
}

// Whether a pattern element covers a point: elements centred r, r + spacing, r + 2 spacing, ...
// along the edge, r half an element's length.
bool patternOn(float dist, float across, float spacing) {
    if (pattern.y < 0.5 || spacing <= 0.0) {
        return true;
    }
    float r = pattern.x * 0.5;
    float k = max(0.0, floor((dist - r) / spacing + 0.5));
    float off = dist - r - k * spacing;
    if (pattern.y < 1.5) {
        return abs(off) <= r;
    }
    return off * off + across * across <= r * r;
}

void main() {
    vec2 x = vScreen.xy / vScreen.z;
    float m = INSIDE;
    // The centre of the pixel being drawn. Interpolated, the position is off by up to a few
    // hundredths of a pixel, differently in each piece's triangles, so near the inside of a corner
    // -- where both pieces' edges and the bisector meet -- two pieces could each give a pixel to
    // the other, or each keep it (issue #3114). Snapped, every piece tests the same point.
    if (fragmentSize.x > 0.0 && fragmentSize.y > 0.0) {
        vec2 cell = resolution / fragmentSize;
        x = (floor((x + 0.5 * resolution) / cell) + 0.5) * cell - 0.5 * resolution;
        m *= max(cell.x, cell.y);
    }

    // Which piece draws the pixel: of the pieces whose shape -- the piece, and the joins at its
    // corners -- covers its centre, the one whose centre line is nearest, the earlier on a tie.
    // Between two neighbours that is the bisector of their corner, inside it and out; past a piece
    // shorter than the line is wide it settles the overlap of the pieces either side (issue
    // #3096). In the join at one of this piece's own corners the two pieces' triangles already
    // split it, along the same line. A pixel no shape covers is the line's anti-aliased edge,
    // drawn by whichever piece reaches it. Each pair of pieces is compared from the same point by the same arithmetic in
    // both, so exactly one of them takes the pixel.
    // ponytail: a piece three away (two short pieces in a row) is not read, and can still overlap.
    float lenOwn = vOwn2.x;
    vec2 uA = x - vOwn.xy;
    vec2 uB = x - vEndB.xy;
    vec2 u2 = uA - vNbA.xy * vNbA.z;
    vec2 uN2 = uB - vNbB.xy * vNbB.z;
    vec2 back2 = vec2(-vPrev2.y, vPrev2.x);
    vec2 ahead2 = vec2(vNext2.y, -vNext2.x);

    // Coverage is first tested INSIDE the shapes' edges, where every piece agrees with what the
    // rasterizer drew. A pixel that no shape covers by that much -- where two edges cross, or at
    // the line's anti-aliased edge -- is tested again at the edges themselves.
    bool inPrev2 = false;
    bool inPrev = false;
    bool inNext = false;
    bool inNext2 = false;
    for (int pass = 0; pass < 2; pass++) {
        float mm = pass == 0 ? m : 0.0;
        bool joinPrev = inJoin(u2, -back2, -vNbA.xy, vPrev2.w, vNbA.z, vEndB.z, mm);
        bool joinA = inJoin(uA, -vNbA.xy, vOwn.zw, vNbA.z, lenOwn, vWidth.x, mm);
        bool joinB = inJoin(uB, vOwn.zw, vNbB.xy, lenOwn, vNbB.z, vWidth.y, mm);
        bool joinNext = inJoin(uN2, vNbB.xy, ahead2, vNbB.z, vNext2.w, vEndB.w, mm);
        inPrev2 = inPiece(u2, back2, vPrev2.w, vEndB.z, vFar.x, mm);
        inPrev = inPiece(uA, vNbA.xy, vNbA.z, vWidth.x, vEndB.z, mm);
        inNext = inPiece(uB, vNbB.xy, vNbB.z, vWidth.y, vEndB.w, mm);
        inNext2 = inPiece(uN2, ahead2, vNext2.w, vEndB.w, vFar.y, mm);
        bool byPrev2 = inPrev2 || joinPrev;
        bool byPrev = inPrev || joinPrev || joinA;
        bool byOwn = inPiece(uA, vOwn.zw, lenOwn, vWidth.x, vWidth.y, mm) || joinA || joinB;
        bool byNext = inNext || joinB || joinNext;
        bool byNext2 = inNext2 || joinNext;

        if (byPrev2 || byPrev || byOwn || byNext || byNext2) {
            // Distances within TIE of each other are a tie, so two pieces along the same line (a
            // U-turn) split their overlap by order, not by rounding. The later piece's distance
            // plus TIE, in both pieces, so the two tests are exact complements.
            vec2 nOwn = vec2(-vOwn.w, vOwn.z);
            float dOwn = abs(dot(x, nOwn) - vWidth.w);
            bool lost = !byOwn
                || (byPrev2 && abs(dot(x, vPrev2.xy) - vPrev2.z) <= dOwn + TIE)
                || (byPrev && !joinA && abs(dot(uA, vec2(vNbA.y, -vNbA.x))) <= abs(dot(uA, nOwn)) + TIE)
                || (byNext && !joinB && abs(dot(uB, vec2(-vNbB.y, vNbB.x))) + TIE < abs(dot(uB, nOwn)))
                || (byNext2 && abs(dot(x, vNext2.xy) - vNext2.z) + TIE < dOwn);
            if (lost) {
                discard;
            }
            break;
        }
    }

    if (pattern.y > 0.5) {
        float spacing = vOwn2.w;
        float acrossScale = vScreen.w > 0.0 ? pattern.z / vScreen.w : 0.0;
        vec2 u = x - vOwn.xy;
        vec2 dir = vOwn.zw;
        float along = clamp(dot(u, dir), 0.0, lenOwn);
        bool on = patternOn(vOwn2.z + along * vOwn2.y, dot(u, vec2(-dir.y, dir.x)) * acrossScale, spacing);
        if (!on && inPrev) {
            float a = dot(uA, vNbA.xy);
            on = patternOn(vOwn2.z - a * vNbA.w, dot(uA, vec2(-vNbA.y, vNbA.x)) * acrossScale, spacing);
        }
        if (!on && inNext) {
            float a = dot(uB, vNbB.xy);
            on = patternOn(vOwn2.z + lenOwn * vOwn2.y + a * vNbB.w, dot(uB, vec2(-vNbB.y, vNbB.x)) * acrossScale, spacing);
        }
        // The pieces two away, measured at their neighbours' scale.
        if (!on && inPrev2) {
            float a = dot(u2, back2);
            on = patternOn(vOwn2.z - vNbA.z * vNbA.w - a * vNbA.w, dot(u2, vec2(-back2.y, back2.x)) * acrossScale, spacing);
        }
        if (!on && inNext2) {
            float a = dot(uN2, ahead2);
            float start = vOwn2.z + lenOwn * vOwn2.y + vNbB.z * vNbB.w;
            on = patternOn(start + a * vNbB.w, dot(uN2, vec2(-ahead2.y, ahead2.x)) * acrossScale, spacing);
        }
        if (!on) {
            discard;
        }
    }

#ifdef EDGE_SHADED
    // Where this pixel is on the whole edge: t along it from its source, side across the line's
    // own width (beyond +-1 on an effect's wider ribbon), and the edge's length on screen.
    vec2 uS = x - vOwn.xy;
    float alongS = clamp(dot(uS, vOwn.zw), 0.0, lenOwn);
    float tS = vEdgeTotal > 0.0 ? clamp((vOwn2.z + alongS * vOwn2.y) / vEdgeTotal, 0.0, 1.0) : 0.0;
    float hwLine = max(vScreen.w / max(edgeReach, 1.0), 1e-3);
    float sideS = clamp(dot(uS, vec2(-vOwn.w, vOwn.z)) / hwLine, -edgeReach, edgeReach);
    float pxPerWorld = vOwn2.y > 0.0 ? 1.0 / vOwn2.y : 0.0;
    gl_FragColor = graphty_edgeShade(tS, sideS, vEdgeTotal * pxPerWorld, 2.0 * hwLine, vWidth.z);
#else
    gl_FragColor = vec4(color, opacity * vWidth.z);
#endif
}
`;
