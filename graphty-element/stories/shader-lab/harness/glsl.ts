/**
 * GLSL helpers every shader-lab shader gets for free (prepended to vertex, fragment and post
 * shaders). GLSL ES 1.00 style (attribute / varying / gl_FragColor); Babylon.js converts it to
 * GLSL ES 3.00 on WebGL2. Unused functions cost nothing.
 */

/** Hashes, value noise, fbm, Worley / Voronoi. */
export const GLSL_NOISE = `
float hash11(float p) { p = fract(p * 0.1031); p *= p + 33.33; p *= p + p; return fract(p); }
float hash12(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
vec2 hash22(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973)); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.xx + p3.yz) * p3.zy); }
float hash13(vec3 p3) { p3 = fract(p3 * 0.1031); p3 += dot(p3, p3.zyx + 31.32); return fract((p3.x + p3.y) * p3.z); }
vec3 hash33(vec3 p3) { p3 = fract(p3 * vec3(0.1031, 0.1030, 0.0973)); p3 += dot(p3, p3.yxz + 33.33); return fract((p3.xxy + p3.yxx) * p3.zyx); }
float noise(vec2 p) {
    vec2 i = floor(p); vec2 f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash12(i), hash12(i + vec2(1.0, 0.0)), u.x), mix(hash12(i + vec2(0.0, 1.0)), hash12(i + vec2(1.0, 1.0)), u.x), u.y);
}
float noise(vec3 p) {
    vec3 i = floor(p); vec3 f = fract(p); vec3 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(hash13(i), hash13(i + vec3(1, 0, 0)), u.x), mix(hash13(i + vec3(0, 1, 0)), hash13(i + vec3(1, 1, 0)), u.x), u.y),
               mix(mix(hash13(i + vec3(0, 0, 1)), hash13(i + vec3(1, 0, 1)), u.x), mix(hash13(i + vec3(0, 1, 1)), hash13(i + vec3(1, 1, 1)), u.x), u.y), u.z);
}
float fbm(vec2 p) { float v = 0.0; float a = 0.5; for (int i = 0; i < 5; i++) { v += a * noise(p); p = p * 2.03 + 17.1; a *= 0.5; } return v; }
float fbm(vec3 p) { float v = 0.0; float a = 0.5; for (int i = 0; i < 5; i++) { v += a * noise(p); p = p * 2.03 + 17.1; a *= 0.5; } return v; }
// Worley: x = distance to nearest feature point (F1), y = second nearest (F2). Cell size 1.
vec2 voronoi(vec2 p) {
    vec2 i = floor(p); vec2 f = fract(p); float d1 = 8.0; float d2 = 8.0;
    for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
        vec2 g = vec2(float(x), float(y)); vec2 o = hash22(i + g); float d = length(g + o - f);
        if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) { d2 = d; }
    }
    return vec2(d1, d2);
}
`;

/** Color helpers. */
export const GLSL_COLOR = `
// Inigo Quilez cosine palette: a + b * cos(2 pi (c t + d))
vec3 palette(float t, vec3 a, vec3 b, vec3 c, vec3 d) { return a + b * cos(6.28318 * (c * t + d)); }
vec3 rainbow(float t) { return palette(t, vec3(0.5), vec3(0.5), vec3(1.0), vec3(0.0, 0.33, 0.67)); }
vec3 hsv2rgb(vec3 c) { vec3 p = abs(fract(c.xxx + vec3(0.0, 2.0 / 3.0, 1.0 / 3.0)) * 6.0 - 3.0); return c.z * mix(vec3(1.0), clamp(p - 1.0, 0.0, 1.0), c.y); }
// 0 = dull red, 0.5 = orange-yellow, 1 = blue-white (a stylized blackbody ramp)
vec3 blackbody(float t) {
    t = clamp(t, 0.0, 1.0);
    vec3 c = mix(vec3(0.25, 0.0, 0.0), vec3(1.0, 0.35, 0.0), smoothstep(0.0, 0.35, t));
    c = mix(c, vec3(1.0, 0.85, 0.4), smoothstep(0.3, 0.65, t));
    return mix(c, vec3(0.8, 0.9, 1.0), smoothstep(0.6, 1.0, t));
}
vec3 viridis(float t) {
    t = clamp(t, 0.0, 1.0);
    vec3 c0 = vec3(0.2777, 0.0054, 0.334); vec3 c1 = vec3(0.105, 1.4046, 1.3846); vec3 c2 = vec3(-0.3309, 0.2148, 0.095);
    vec3 c3 = vec3(-4.6342, -5.7991, -19.3324); vec3 c4 = vec3(6.2283, 14.1799, 56.6905); vec3 c5 = vec3(4.7764, -13.7451, -65.353); vec3 c6 = vec3(-5.4355, 4.6459, 26.3124);
    return c0 + t * (c1 + t * (c2 + t * (c3 + t * (c4 + t * (c5 + t * c6)))));
}
float luminance(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }
`;

/** 2D signed distance functions (negative inside) and anti-aliasing helpers. */
export const GLSL_SDF = `
const float PI = 3.14159265;
const float TAU = 6.28318531;
mat2 rot2(float a) { float c = cos(a); float s = sin(a); return mat2(c, -s, s, c); }
float sdCircle(vec2 p, float r) { return length(p) - r; }
float sdBox(vec2 p, vec2 b) { vec2 d = abs(p) - b; return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0); }
float sdRoundBox(vec2 p, vec2 b, float r) { return sdBox(p, b - r) - r; }
float sdSegment(vec2 p, vec2 a, vec2 b) { vec2 pa = p - a; vec2 ba = b - a; float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0); return length(pa - ba * h); }
float sdTriangle(vec2 p, float r) {
    const float k = 1.7320508; p.x = abs(p.x) - r; p.y = p.y + r / k;
    if (p.x + k * p.y > 0.0) p = vec2(p.x - k * p.y, -k * p.x - p.y) / 2.0;
    p.x -= clamp(p.x, -2.0 * r, 0.0); return -length(p) * sign(p.y);
}
float sdHexagon(vec2 p, float r) {
    const vec3 k = vec3(-0.866025404, 0.5, 0.577350269); p = abs(p);
    p -= 2.0 * min(dot(k.xy, p), 0.0) * k.xy; p -= vec2(clamp(p.x, -k.z * r, k.z * r), r); return length(p) * sign(p.y);
}
float sdStar5(vec2 p, float r, float rf) {
    const vec2 k1 = vec2(0.809016994375, -0.587785252292); const vec2 k2 = vec2(-k1.x, k1.y);
    p.x = abs(p.x); p -= 2.0 * max(dot(k1, p), 0.0) * k1; p -= 2.0 * max(dot(k2, p), 0.0) * k2; p.x = abs(p.x); p.y -= r;
    vec2 ba = rf * vec2(-k1.y, k1.x) - vec2(0, 1); float h = clamp(dot(p, ba) / dot(ba, ba), 0.0, r);
    return length(p - ba * h) * sign(p.y * ba.x - p.x * ba.y);
}
`;

/** Fragment-only anti-aliasing helpers (derivatives do not exist in a vertex shader). */
export const GLSL_AA = `
// coverage of a shape from its signed distance, one pixel of anti-aliasing
float fill(float d) { float w = fwidth(d); return 1.0 - smoothstep(-w, w, d); }
// coverage of a stroke of half-width hw centered on the shape's outline
float stroke(float d, float hw) { return fill(abs(d) - hw); }
`;

export const GLSL_LIBRARY = GLSL_NOISE + GLSL_COLOR + GLSL_SDF;
