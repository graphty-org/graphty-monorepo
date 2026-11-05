/**
 * @file The GLSL the element writes around a shader body: the input structs and the built-in
 * helpers every body may call (design/rendering/shader-styles.md section 4.2).
 *
 * Written here with the names a body uses (`noise`, `NodeInput`); the wrapper renames every one
 * of them `graphty_<name>` before it reaches a program, and renames the body's references to
 * match, so no name of the library collides with a name Babylon.js declares in the same program.
 *
 * The helpers come from the shader lab's library (stories/shader-lab/harness/glsl.ts on
 * feat/shader-lab), so a preset ported from the lab draws the same. `fbm` takes its octave count
 * from the quality level at run time, through `Q`, so a quality change never recompiles.
 *
 * Fragment-only: `fillAA` and `strokeAA` use derivatives.
 *
 * Plain strings; nothing here reaches Babylon.js, Lit or the DOM.
 */

/**
 * The input structs, by the published field names. View space is Babylon's: x right, y up, and
 * the camera looks along +z, so a point facing the camera has a normal with negative z.
 */
export const GLSL_STRUCTS = `
struct NodeInput {
    vec2 uv;
    vec3 local;
    vec3 normal;
    vec3 viewDir;
    vec4 color;
    float size;
    float pixelSize;
    float seed;
    float selected;
    float hovered;
    float pinned;
    float sinceSelected;
    float sinceHovered;
    float sincePinned;
    float sinceEntered;
    float sinceExited;
    float sinceChanged;
    float time;
};
struct EdgeInput {
    float t;
    float side;
    float lengthPx;
    float widthPx;
    vec4 color;
    vec4 sourceColor;
    vec4 targetColor;
    float seed;
    float selected;
    float hovered;
    float sourceSelected;
    float targetSelected;
    float sinceEntered;
    float sinceExited;
    float sinceChanged;
    float time;
};
struct BackgroundInput {
    vec2 uv;
    vec3 viewDir;
    vec2 resolution;
    float time;
    vec4 groupTint;
};
struct GroupInput {
    vec2 uv;
    float field;
    vec2 fieldGradient;
    vec3 normal;
    vec3 viewDir;
    vec4 color;
    float group;
    float depth;
    float time;
};
`;

/**
 * The helpers. `graphty_quality` is the quality level (0 low, 1 medium, 2 high), a global the
 * program's main sets from the scene uniforms before it calls the body.
 */
export const GLSL_HELPERS = `
vec3 lightDir;
vec3 lightColor;
vec3 ambient;
vec3 canvasColor;

float Q(float lo, float med, float hi) { return graphty_quality < 0.5 ? lo : (graphty_quality < 1.5 ? med : hi); }
int Q(int lo, int med, int hi) { return graphty_quality < 0.5 ? lo : (graphty_quality < 1.5 ? med : hi); }

float hash11(float p) { p = fract(p * 0.1031); p *= p + 33.33; p *= p + p; return fract(p); }
float hash12(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float hash13(vec3 p3) { p3 = fract(p3 * 0.1031); p3 += dot(p3, p3.zyx + 31.32); return fract((p3.x + p3.y) * p3.z); }
vec2 hash21(float p) { vec3 p3 = fract(vec3(p) * vec3(0.1031, 0.1030, 0.0973)); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.xx + p3.yz) * p3.zy); }
vec2 hash22(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973)); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.xx + p3.yz) * p3.zy); }
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
float fbm(vec2 p) {
    float v = 0.0; float a = 0.5; int octaves = Q(3, 4, 5);
    for (int i = 0; i < 5; i++) { if (i >= octaves) break; v += a * noise(p); p = p * 2.03 + 17.1; a *= 0.5; }
    return v;
}
float fbm(vec3 p) {
    float v = 0.0; float a = 0.5; int octaves = Q(3, 4, 5);
    for (int i = 0; i < 5; i++) { if (i >= octaves) break; v += a * noise(p); p = p * 2.03 + 17.1; a *= 0.5; }
    return v;
}
vec2 voronoi(vec2 p) {
    vec2 i = floor(p); vec2 f = fract(p); float d1 = 8.0; float d2 = 8.0;
    for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
        vec2 g = vec2(float(x), float(y)); vec2 o = hash22(i + g); float d = length(g + o - f);
        if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) { d2 = d; }
    }
    return vec2(d1, d2);
}

vec3 palette(float t, vec3 a, vec3 b, vec3 c, vec3 d) { return a + b * cos(6.28318 * (c * t + d)); }
vec3 rainbow(float t) { return palette(t, vec3(0.5), vec3(0.5), vec3(1.0), vec3(0.0, 0.33, 0.67)); }
vec3 hsv2rgb(vec3 c) { vec3 p = abs(fract(c.xxx + vec3(0.0, 2.0 / 3.0, 1.0 / 3.0)) * 6.0 - 3.0); return c.z * mix(vec3(1.0), clamp(p - 1.0, 0.0, 1.0), c.y); }
vec3 linearToOklab(vec3 c) {
    vec3 lms = mat3(0.4122214708, 0.2119034982, 0.0883024619, 0.5363325363, 0.6806995451, 0.2817188376, 0.0514459929, 0.1073969566, 0.6299787005) * c;
    lms = pow(max(lms, vec3(0.0)), vec3(1.0 / 3.0));
    return mat3(0.2104542553, 1.9779984951, 0.0259040371, 0.7936177850, -2.4285922050, 0.7827717662, -0.0040720468, 0.4505937099, -0.8086757660) * lms;
}
vec3 oklabToLinear(vec3 c) {
    vec3 lms = mat3(1.0, 1.0, 1.0, 0.3963377774, -0.1055613458, -0.0894841775, 0.2158037573, -0.0638541728, -1.2914855480) * c;
    lms = lms * lms * lms;
    return mat3(4.0767416621, -1.2684380046, -0.0041960863, -3.3077115913, 2.6097574011, -0.7034186147, 0.2309699292, -0.3413193965, 1.7076147010) * lms;
}
vec3 oklabMix(vec3 a, vec3 b, float t) { return oklabToLinear(mix(linearToOklab(a), linearToOklab(b), t)); }
vec3 blackbody(float t) {
    t = clamp(t, 0.0, 1.0);
    vec3 c = mix(vec3(0.25, 0.0, 0.0), vec3(1.0, 0.35, 0.0), smoothstep(0.0, 0.35, t));
    c = mix(c, vec3(1.0, 0.85, 0.4), smoothstep(0.3, 0.65, t));
    return mix(c, vec3(0.8, 0.9, 1.0), smoothstep(0.6, 1.0, t));
}
float luminance(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }

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
float sdHeart(vec2 p) {
    p.x = abs(p.x);
    if (p.y + p.x > 1.0) return length(p - vec2(0.25, 0.75)) - 0.353553;
    vec2 a = p - vec2(0.0, 1.0); vec2 b = p - 0.5 * max(p.x + p.y, 0.0);
    return sqrt(min(dot(a, a), dot(b, b))) * sign(p.x - p.y);
}
float iconSdf(int icon, vec2 p) {
    int k = icon - (icon / 6) * 6;
    if (k < 0) k += 6;
    float d;
    if (k == 0) {
        d = min(sdCircle(p - vec2(0.0, 0.2), 0.17), sdRoundBox(p - vec2(0.0, -0.3), vec2(0.32, 0.2), 0.16));
    } else if (k == 1) {
        float r = length(p);
        float teeth = clamp(cos(atan(p.y, p.x) * 8.0) * 3.0, -1.0, 1.0) * 0.06;
        d = max(r - 0.33 - teeth, 0.12 - r);
    } else if (k == 2) {
        d = sdHeart(p * 1.55 + vec2(0.0, 0.55)) / 1.55;
    } else if (k == 3) {
        float s = min(sdSegment(p, vec2(0.14, 0.44), vec2(-0.14, 0.02)), sdSegment(p, vec2(-0.14, 0.02), vec2(0.14, 0.02)));
        d = min(s, sdSegment(p, vec2(0.14, 0.02), vec2(-0.14, -0.44))) - 0.065;
    } else if (k == 4) {
        float page = sdRoundBox(p, vec2(0.27, 0.36), 0.05);
        float lines = min(sdBox(p - vec2(0.0, 0.14), vec2(0.16, 0.025)), sdBox(p - vec2(0.0, 0.02), vec2(0.16, 0.025)));
        lines = min(lines, sdBox(p - vec2(-0.04, -0.1), vec2(0.12, 0.025)));
        d = max(page, -lines);
    } else {
        float planet = sdCircle(p, 0.22);
        vec2 q = rot2(0.45) * p;
        float ring = abs(length(q * vec2(1.0, 3.2)) - 0.42) - 0.05;
        float cut = q.y < 0.0 ? ring - 0.05 : 1.0;
        d = min(max(planet, -cut), ring);
    }
    // Icons 6 to 11 are the first six drawn as outlines, so twelve groups never share one.
    int wrapped = icon - (icon / 12) * 12;
    if (wrapped < 0) wrapped += 12;
    return wrapped > 5 ? abs(d + 0.02) - 0.04 : d;
}

float fillAA(float d) { float w = fwidth(d); return 1.0 - smoothstep(-w, w, d); }
float strokeAA(float d, float hw) { return fillAA(abs(d) - hw); }
`;
