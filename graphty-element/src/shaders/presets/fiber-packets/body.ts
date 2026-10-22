/**
 * @file The GLSL body of the `fiber-packets` preset (design/rendering/shader-styles.md section
 * 7.4), ported from the light of the shader lab's fiber optic strands.
 *
 * Up to six packets of light run along each edge from source to target, each at its own pace and
 * phase, with a bright head and an exponential tail measured in screen pixels; where a packet
 * reaches the target the end of the line flares. The packets take the line's color, brightened so
 * a dark line still carries visible light, and whiten toward the core. `bloom` adds the hot core
 * the shared bloom pass spreads.
 *
 * The flare is a few pixels at the end of one line, far below the area a flash is counted over, so
 * no setting makes the picture flash.
 */

export const BODY = `// Fiber packets: light running from source to target, flaring on arrival.
vec4 shade(EdgeInput e) {
    float s = abs(e.side);
    float len = max(e.lengthPx, 1.0);
    float core = exp(-s * s * 10.0);
    // Inside the fiber; the reach lets the flare spill a little past its wall.
    float inside = 1.0 - smoothstep(0.85, 1.4, s);
    vec3 light = e.color.rgb / max(max(e.color.r, max(e.color.g, e.color.b)), 0.3);
    vec3 c = vec3(0.0);
    float a = 0.0;
    float arrive = 0.0;
    for (int k = 0; k < 6; k++) {
        if (k >= packets) break;
        float seed = e.seed * 17.0 + float(k) * 7.31;
        float pace = speed * (0.6 + 0.8 * hash11(seed));
        float head = fract(e.time * pace * 120.0 / len + hash11(seed + 3.1));
        float behind = fract(head - e.t) * len;
        float b = exp(-behind / tail) * step(behind, len * 0.95);
        vec3 hue = light * (0.8 + 0.4 * hash11(seed + 9.7));
        c += mix(hue, vec3(1.0), 0.35 * core) * b * (0.15 + 1.1 * core);
        a = max(a, b * (0.3 + 0.7 * core));
        arrive += exp(-pow((1.0 - head) * len / 20.0, 2.0));
    }
    float end = exp(-(1.0 - e.t) * len / 6.0) * smoothstep(10.0, 40.0, len);
    float flare = end * (0.1 + arrive) * glint * (0.3 + core);
    c += vec3(0.8, 0.95, 1.0) * flare;
    a = max(a, clamp(flare, 0.0, 1.0));
    float lit = max(max(e.selected, e.hovered), max(e.sourceSelected, e.targetSelected));
    c *= (1.0 + 1.2 * lit) * (1.0 + 0.5 * bloom * core);
    a = clamp(a, 0.0, 1.0) * inside;
    // c is the packets' summed light; returned straight over their coverage.
    return vec4(c * inside / max(a, 1e-4), a);
}
`;
