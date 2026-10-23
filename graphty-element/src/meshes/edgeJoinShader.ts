/**
 * @file The shader that draws a bent edge's pieces joined at their corners, and the template
 * geometry each piece is drawn from. Design: `design/edges/sharp-corners.md`.
 *
 * Plain strings and arrays, nothing from Babylon.js, so the prototype harness in
 * `design/edges/prototype/` draws with exactly this text.
 *
 * ONE INSTANCE PER PIECE. A piece reads four points -- the previous corner, its own start and end,
 * and the next corner -- and draws its own rectangle with square ends, plus the outer half of the
 * join at each corner it shares: a miter, clipped flat past the miter limit (SVG 2's `miter-clip`)
 * and where it would reach past the shorter of the two pieces, so a corner's point shrinks
 * smoothly as the bend sharpens on screen rather than jumping to a bevel. A straight edge has no neighbours (its
 * previous point is its start, its next point is its end), so it draws exactly the rectangle it
 * always drew.
 *
 * NO PIXEL IS DRAWN TWICE AT A CORNER. On the inside of a bend the two rectangles overlap. The
 * line through the corner along the bisector splits the overlap: each piece keeps the fragments on
 * its own side of it, and gives up a fragment on its neighbour's side only when the neighbour's
 * rectangle covers it. Both pieces compute that line from the same three points with the same
 * arithmetic, so the two tests are exact complements. A translucent line stays one even tint.
 *
 * DASHES FOLLOW THE WHOLE EDGE. A fragment's distance is measured along its own piece from the
 * edge's start; in the overlap on the inside of a bend it is drawn when either piece's dash covers
 * it, which is what dashing the centre line and then stroking each dash would draw.
 */

/** The longest miter drawn, as a multiple of half the line's width (SVG's and Canvas's limit). */
export const EDGE_MITER_LIMIT = 4;

/**
 * Floats per piece: previous corner (3), start (3), end (3), next corner (3), the distance along
 * the edge to the start (1) and the pattern's element spacing (1).
 */
export const JOIN_FLOATS_PER_PIECE = 14;

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
attribute vec3 pPrev;
attribute vec3 pA;
attribute vec3 pB;
attribute vec3 pNext;
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
varying vec4 vEndA;
varying vec4 vNbA;
varying vec4 vEndB;
varying vec4 vNbB;
varying vec3 vWidth;

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
    float hwA = drawnHalfWidth(rawA);
    float hwB = drawnHalfWidth(rawB);

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
    vEndA = vec4(sA, tA);
    vNbA = vec4(-inA, joinedA ? lenInA : 0.0, lenInA > EPS ? length(pA - pPrev) / lenInA : 0.0);
    vEndB = vec4(sB, tB);
    vNbB = vec4(outB, joinedB ? lenOutB : 0.0, lenOutB > EPS ? length(pNext - pB) / lenOutB : 0.0);
    vWidth = vec3(hwA, hwB, raw > 0.0 && raw < 0.5 ? raw * 2.0 : 1.0);
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

varying vec4 vScreen;
varying vec4 vOwn;
varying vec4 vOwn2;
varying vec4 vEndA;
varying vec4 vNbA;
varying vec4 vEndB;
varying vec4 vNbB;
varying vec3 vWidth;

bool inRect(vec2 u, vec2 dir, float len, float hw) {
    float a = dot(u, dir);
    float c = dot(u, vec2(-dir.y, dir.x));
    return len > 0.0 && a >= 0.0 && a <= len && abs(c) <= hw;
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

    // The previous piece owns the side of the corner's bisector behind it, and this one gives a
    // fragment there up only when that piece covers it. The same at the next corner, mirrored.
    vec2 uA = x - vEndA.xy;
    bool inPrev = inRect(uA, vNbA.xy, vNbA.z, vWidth.x);
    if (inPrev && dot(uA, vEndA.zw) <= 0.0) {
        discard;
    }
    vec2 uB = x - vEndB.xy;
    bool inNext = inRect(uB, vNbB.xy, vNbB.z, vWidth.y);
    if (inNext && dot(uB, vEndB.zw) > 0.0) {
        discard;
    }

    if (pattern.y > 0.5) {
        float spacing = vOwn2.w;
        float acrossScale = vScreen.w > 0.0 ? pattern.z / vScreen.w : 0.0;
        vec2 u = x - vOwn.xy;
        vec2 dir = vOwn.zw;
        float along = clamp(dot(u, dir), 0.0, vOwn2.x);
        bool on = patternOn(vOwn2.z + along * vOwn2.y, dot(u, vec2(-dir.y, dir.x)) * acrossScale, spacing);
        if (!on && inPrev) {
            float a = dot(uA, vNbA.xy);
            on = patternOn(vOwn2.z - a * vNbA.w, dot(uA, vec2(-vNbA.y, vNbA.x)) * acrossScale, spacing);
        }
        if (!on && inNext) {
            float a = dot(uB, vNbB.xy);
            on = patternOn(vOwn2.z + vOwn2.x * vOwn2.y + a * vNbB.w, dot(uB, vec2(-vNbB.y, vNbB.x)) * acrossScale, spacing);
        }
        if (!on) {
            discard;
        }
    }

    gl_FragColor = vec4(color, opacity * vWidth.z);
}
`;
