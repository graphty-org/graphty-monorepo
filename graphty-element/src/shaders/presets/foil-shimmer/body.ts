/**
 * @file The GLSL body of the `foil-shimmer` preset (design/rendering/shader-styles.md section
 * 7.1), ported from the shader lab's foil shimmer search.
 *
 * Fine-banded, silvered thin-film foil over the node's color, its hue following the surface
 * angle, with a gold-white rim so a hit reads even between sweeps. A bright band crosses each node
 * on a diagonal, every node on its own phase, and a few sparkles catch while it passes. The lab's
 * screen-wide sweep and its dimming of non-matches are dropped: the layer's selector decides
 * which nodes shimmer, and dimming the others is a reader's layer.
 *
 * Sparkles change at most 3 times a second, so the preset never flashes faster than that.
 */

/** The body: `shade` and its helpers. */
export const BODY = `// Foil shimmer: silvered holographic foil, a sweeping band and sparkles.

// The direction the camera looks, in view space: the same for every pixel of an impostor, so a
// node off the axis is lit like one on it.
const vec3 VIEW_FORWARD = vec3(0.0, 0.0, 1.0);

// Pastel, silvered rainbow: real foil is mostly bright metal, with color in thin bands.
vec3 thinFilm(float t) {
    return mix(palette(t, vec3(0.6), vec3(0.4), vec3(1.0), vec3(0.0, 0.33, 0.67)), vec3(0.92, 0.94, 1.0), 0.3);
}

vec3 litColor(vec3 normal, vec3 viewDir, vec3 base) {
    float diffuse = max(dot(normal, lightDir), 0.0);
    float spec = pow(max(dot(normal, normalize(lightDir - viewDir)), 0.0), 48.0);
    float rim = pow(1.0 - clamp(dot(normal, -viewDir), 0.0, 1.0), 3.0);
    return base * (0.22 + 0.78 * diffuse) + vec3(0.55) * spec + base * rim * 0.35;
}

vec4 shade(NodeInput n) {
    float facing = clamp(-n.normal.z, 0.0, 1.0);
    float edge = 1.0 - facing;
    // The sweep: a band crossing the node on a diagonal, on the node half the time.
    float across = dot(n.uv, normalize(vec2(1.0, 0.45)));
    float at = fract(n.time * sweepSpeed + n.seed) * 5.0 - 2.5;
    float d = (across - at) / (bandWidth * 2.5);
    float band = exp(-d * d);
    // The foil's hue follows the surface angle, the band and a slow drift.
    float t = n.normal.x * 0.5 + n.normal.y * 0.7 + edge * 1.4 + band * 0.5 + n.seed + n.time * 0.06;
    vec3 film = thinFilm(t);
    vec3 plain = litColor(n.normal, VIEW_FORWARD, n.color.rgb);
    vec3 foiled = litColor(n.normal, VIEW_FORWARD, mix(n.color.rgb, film, 0.75));
    vec3 c = mix(plain, foiled, foil);
    c += film * band * 0.7 * foil;
    // Sparkles: a few cells catch while the band passes.
    vec2 cell = floor(n.uv * 6.0);
    float twinkle = hash13(vec3(cell, floor(n.time * 3.0) + n.seed * 97.0));
    vec2 f = fract(n.uv * 6.0) - 0.5;
    float star = exp(-abs(f.x) * 14.0) * exp(-abs(f.y) * 3.0) + exp(-abs(f.y) * 14.0) * exp(-abs(f.x) * 3.0);
    c += vec3(1.0) * step(0.86, twinkle) * band * star * sparkle * foil;
    // A thin gold-white rim, so a hit reads even between sweeps.
    c += vec3(1.0, 0.92, 0.7) * pow(edge, 4.0) * 0.8 * foil;
    return vec4(c, n.color.a);
}
`;
