/**
 * @file The GLSL body of the `neon-line` preset (design/rendering/shader-styles.md section 7.4),
 * ported from the shader lab's bezier glow and generalized to any route.
 *
 * The lab bent each edge into a Bezier itself. Here the element owns the route (straight, curved,
 * bent or lifted), and the glow is drawn on the line's own pieces, so it follows whatever the
 * route is: a crisp core over the line, an exponential neon halo `glowWidth` screen pixels wide
 * around it, and a glint that rides from source to target so direction reads without arrowheads.
 * The halo fades out before the effect's ribbon ends. Edges touching a selected or hovered node
 * burn brighter; `bloom` adds the hot glint the shared bloom pass spreads.
 */

export const BODY = `// Neon line: a core, a neon halo and a glint toward the target.
vec4 shade(EdgeInput e) {
    float px = abs(e.side) * e.widthPx * 0.5;
    float core = max(e.widthPx * 0.35, 0.5);
    float aa = 1.0 - smoothstep(core - 0.6, core + 0.6, px);
    float halo = exp(-max(px - core, 0.0) / glowWidth) * glow;
    halo *= 1.0 - smoothstep(4.5, 6.0, abs(e.side));
    float head = fract(e.time * glintSpeed * (0.6 + e.seed) + e.seed * 7.0);
    float dt = fract(e.t - head + 0.5) - 0.5;
    float glint = exp(-abs(dt) * 30.0) * step(0.001, glintSpeed);
    float lit = max(max(e.selected, e.hovered), max(e.sourceSelected, e.targetSelected));
    vec3 c = e.color.rgb;
    vec3 coreColor = mix(c, vec3(1.0), 0.2 + 0.7 * glint) * (0.85 + 1.5 * glint) * (1.0 + 0.5 * bloom * glint);
    float haloA = clamp(halo * (0.6 + glint), 0.0, 1.0);
    vec3 rgb = (coreColor * aa + c * haloA * (1.0 - aa)) * (1.0 + 0.8 * lit);
    // rgb is premultiplied by the core's and the halo's coverage; returned straight.
    float a = clamp(1.0 - (1.0 - aa) * (1.0 - haloA), 0.0, 1.0);
    return vec4(rgb / max(a, 1e-4), a);
}
`;
