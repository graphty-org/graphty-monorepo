/**
 * @file The GLSL bodies of the `disco-ball` preset (design/rendering/shader-styles.md section
 * 7.1), ported from the disco ball of the shader lab's gemstone.
 *
 * Rows of small mirror tiles, each tilted a little differently, reflect the studio and flash as
 * the ball turns; dark grout runs between them. The mirrors take a little of the node's color.
 * `facets` sets how fine the tiles are (22 gives the lab's 14 rows).
 *
 * `LOW_DETAIL` is the small-size program the element draws while the median node on screen is
 * under 12 px: one mirror sphere with a coarse tile grain.
 */

import { STUDIO } from "../studio";

/** The mirror's tint from the node's color, and the bright horizon both programs reflect. */
const MIRROR = `${STUDIO}
vec3 mirrorTint(vec3 color) { return mix(vec3(0.85, 0.88, 0.95), color * 1.2 + 0.2, 0.7); }
// A light room: a broad bright horizon and a lifted floor and sky, so the tiles do not mostly
// mirror near black, which reads as a black ball on a light canvas.
vec3 mirrorEnv(vec3 r) { return studio(r) * 0.8 + vec3(0.75, 0.77, 0.85) * exp(-abs(r.y) * 2.5) + vec3(0.4); }
`;

/** The body: `shade` and its helpers. */
export const BODY = `// Disco ball: rows of tilted mirror tiles with grout, turning.
${MIRROR}
const float PI = 3.14159265;
const float TAU = 6.28318531;

vec4 shade(NodeInput n) {
    vec3 nv = n.normal;
    vec3 iw = n.viewDir;
    float spinA = n.time * turn * 2.7 + n.seed * 6.0;
    vec3 d = nv;
    d.xz = rot2(spinA) * d.xz;
    float rows = max(4.0, floor(float(facets) * 0.65));
    float lat = asin(clamp(d.y, -1.0, 1.0));
    float row = floor((lat / PI + 0.5) * rows);
    float latQ = ((row + 0.5) / rows - 0.5) * PI;
    float perRow = max(3.0, floor(rows * 2.0 * cos(latQ)));
    float lon = atan(d.z, d.x);
    float col = floor((lon / TAU + 0.5) * perRow);
    float lonQ = ((col + 0.5) / perRow - 0.5) * TAU;
    vec3 tn = vec3(cos(latQ) * cos(lonQ), sin(latQ), cos(latQ) * sin(lonQ));
    tn.xz = rot2(-spinA) * tn.xz;
    vec2 cell = vec2(fract((lat / PI + 0.5) * rows), fract((lon / TAU + 0.5) * perRow));
    float grout = smoothstep(0.0, 0.08, min(min(cell.x, 1.0 - cell.x), min(cell.y, 1.0 - cell.y)));
    vec3 r = reflect(iw, normalize(mix(tn, nv, 0.1)));
    vec3 c = mirrorEnv(r) * mirrorTint(n.color.rgb);
    c *= 0.6 + 0.4 * hash12(vec2(row, col) + n.seed);
    c += vec3(8.0) * pow(max(dot(r, lightDir), 0.0), 120.0) * sparkle;
    return vec4(studioTone(mix(vec3(0.03), c, grout)), 1.0);
}
`;

/** The small-size program: one mirror sphere with a coarse tile grain. */
export const LOW_DETAIL = `// Disco ball, small: one mirror sphere, a coarse grain of tiles.
${MIRROR}
vec4 shade(NodeInput n) {
    vec3 r = reflect(n.viewDir, n.normal);
    vec3 c = mirrorEnv(r) * mirrorTint(n.color.rgb);
    c *= 0.7 + 0.3 * hash12(floor(n.uv * 4.0) + n.seed);
    c += vec3(4.0) * pow(max(dot(r, lightDir), 0.0), 40.0) * sparkle;
    return vec4(studioTone(c), 1.0);
}
`;
