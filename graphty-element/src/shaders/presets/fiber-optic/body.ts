/**
 * @file The GLSL body of the `fiber-optic` preset (design/rendering/shader-styles.md section 7.4),
 * ported from the glass of the shader lab's fiber optic strands.
 *
 * Each edge is a dark glass rod in its own color: a nearly black body, a bright rim where the eye
 * looks through the most glass, a thin core line and a soft sheen down one side. The rim's hue
 * drifts a little along the rod and from rod to rod (`hueSpread`), so a bundle of fibers of one
 * color still reads as many strands. A fiber touching a selected or hovered node, or itself
 * selected or hovered, glows brighter. The packets of light are the `fiber-packets` effect.
 *
 * Still: it asks for no frame.
 */

export const BODY = `// Fiber optic: dark glass with a bright rim, tinted by the line's color.
// The color turned about the gray axis by an angle, in radians.
vec3 fiberHue(vec3 c, float angle) {
    const vec3 k = vec3(0.57735027);
    float ca = cos(angle);
    float sa = sin(angle);
    return c * ca + cross(k, c) * sa + k * dot(k, c) * (1.0 - ca);
}
vec4 shade(EdgeInput e) {
    float s = abs(e.side);
    float rim = smoothstep(0.45, 0.85, s) * (1.0 - smoothstep(0.85, 1.0, s));
    float core = exp(-s * s * 14.0);
    float drift = (e.seed - 0.5) * 2.0 + (e.t - 0.5);
    vec3 rimTint = max(fiberHue(e.color.rgb, drift * hueSpread * 1.6), vec3(0.0));
    vec3 c = e.color.rgb * 0.06 + rimTint * rim * 0.55 * glass + e.color.rgb * core * 0.18 * glass;
    // A sheen down one side, as light catches a glass rod; thin lines skip it.
    c += vec3(exp(-pow((e.side + 0.45) * 5.0, 2.0)) * 0.12 * glass * smoothstep(2.0, 6.0, e.widthPx));
    float lit = max(max(e.selected, e.hovered), max(e.sourceSelected, e.targetSelected));
    c *= 1.0 + 0.8 * lit;
    return vec4(c, e.color.a);
}
`;
