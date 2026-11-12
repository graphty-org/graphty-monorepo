/**
 * @file The GLSL body of the `edge-change` preset (design/rendering/shader-styles.md section 7.4),
 * ported from the edge half of the shader lab's change flash.
 *
 * When an edge arrives or its data changes, a front in `flashColor` draws along it from the
 * source, white-hot and wider behind its tip, cooling through a heat ramp to the line's own color
 * within 0.5 s. When the edge is removed, the line shrinks to its middle, dimming and reddening,
 * and is gone after 0.5 s; the element keeps it drawn for exactly that exit. The lab invented its
 * changes from a hash of time; here the element says when the edge arrived, changed or left
 * (`sinceEntered`, `sinceChanged`, `sinceExited`), so nothing is drawn at rest.
 *
 * The line beneath is drawn as always while the front runs (an effect draws over it, never hides
 * it), so the front reads as the edge lighting up from its source.
 */

export const BODY = `// Edge change: a hot front draws in when the edge arrives or changes; it shrinks out when removed.
vec4 shade(EdgeInput e) {
    float s = abs(e.side);
    vec3 base = e.color.rgb;
    if (e.sinceExited >= 0.0) {
        float k = leaveTime / 0.5;
        if (k >= 1.0 || abs(e.t - 0.5) > 0.5 * (1.0 - k)) {
            return vec4(0.0);
        }
        float line = 1.0 - smoothstep(0.8, 1.0, s);
        float a = e.color.a * line * (1.0 - 0.5 * k);
        return vec4(mix(base, vec3(0.6, 0.1, 0.1), k), a);
    }

    float since = min(arriveTime, e.sinceChanged < 0.0 ? 0.5 : changeTime);
    if (since < 0.0 || since >= 0.5) {
        return vec4(0.0);
    }
    float k = since / 0.5;
    float grow = clamp(since / 0.3, 0.0, 1.0);
    if (e.t > grow) {
        return vec4(0.0);
    }
    float heat = (1.0 - k) * (1.0 - k);
    float tip = exp(-(grow - e.t) * max(e.lengthPx, 1.0) / 6.0) * step(grow, 0.999);
    float width = 1.0 + heat;
    float line = 1.0 - smoothstep(width - 0.25, width, s);
    vec3 hot = mix(blackbody(heat) * (1.0 + heat), flashColor, heat * heat);
    vec3 col = mix(mix(base, hot, clamp(heat * 1.3, 0.0, 1.0)), flashColor, tip);
    float a = clamp(line * max(heat, tip), 0.0, 1.0);
    return vec4(col, a);
}
`;
