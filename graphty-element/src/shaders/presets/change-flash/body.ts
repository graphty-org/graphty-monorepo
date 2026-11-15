/**
 * @file The GLSL body of the `change-flash` preset (design/rendering/shader-styles.md section
 * 7.3), ported from the shader lab's change flash.
 *
 * When a node's data changes, or it arrives, it flashes once: a four-point star with a fainter
 * diagonal pair that turns a little, a glow round the rim and a ring that runs out, all fading over the
 * 1.5 s the change plays. The lab invented its changes from a hash of time; here the element
 * says when the node's data last changed (`sinceChanged`), so nothing is drawn at rest and the
 * last frame the change claims is empty.
 */

export const BODY = `
vec4 shade(NodeInput n) {
    float s = n.sinceChanged;
    if (s < 0.0 || s > 1.5) {
        return vec4(0.0);
    }

    float k = flashTime / 1.5;
    float f = (1.0 - k) * (1.0 - k) * exp(-s * 1.5);
    vec2 uv = n.uv;
    float r = length(uv);
    // a four-point star, slowly turning, and a fainter diagonal pair
    vec2 q = rot2(s * 0.6) * uv;
    float star = exp(-abs(q.y) * 14.0) * exp(-abs(q.x) * 0.9) + exp(-abs(q.x) * 14.0) * exp(-abs(q.y) * 0.9);
    vec2 q2 = rot2(0.785398) * q;
    star += 0.4 * (exp(-abs(q2.y) * 26.0) * exp(-abs(q2.x) * 2.4) + exp(-abs(q2.x) * 26.0) * exp(-abs(q2.y) * 2.4));
    // the core, as a glow round the node's rim: the node itself hides what lies behind it
    float core = exp(-r * r * 2.5) + 0.8 * exp(-(r - 1.0) * (r - 1.0) * 10.0);
    float ring = strokeAA(r - (1.0 + k * 1.3), 0.04 + k * 0.05) * (1.0 - k);
    float e = ((star * glint * 1.6 + core) * f + ring * 0.8) * (1.0 - smoothstep(2.0, 2.5, r));
    vec3 col = mix(flashColor, n.color.rgb, 0.25);
    // Straight alpha: the flash's light over its coverage.
    float a = clamp(e, 0.0, 1.0) * 0.75;
    return vec4(col * e / max(a, 1e-4), a);
}
`;
