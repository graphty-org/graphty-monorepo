/**
 * @file The GLSL body of the `orbiting-satellites` preset (design/rendering/shader-styles.md
 * section 7.3), ported from the shader lab's orbiting satellites.
 *
 * Moons on a tilted orbit round the node: how many from `moons` (bind it per node, to degree for
 * instance), how fast from `speed`. Each node's orbit plane turns by its seed, so neighbors do not
 * move in lockstep; a moon passing behind the node is hidden by it, a nearer moon is drawn larger,
 * and each trails a faint arc along the orbit. The ring takes the node's color. A moon covers what
 * is beneath it; its halo and trail add light.
 */

export const BODY = `
vec4 shade(NodeInput n) {
    float count = float(moons);
    float ct = cos(tilt);
    vec2 p = rot2(n.seed * 6.2831853) * n.uv;
    // the orbit ring, the circle tilted toward the viewer; its back half behind the node is hidden
    vec2 q = vec2(p.x, p.y / max(ct, 0.05));
    float w = max(0.03, 1.2 / max(n.pixelSize, 1.0));
    float ringD = abs(length(q) - orbit) * ct / w;
    float behindRing = step(0.0, p.y) * step(length(n.uv), 1.0);
    float ringLine = exp(-ringD * ringD) * (1.0 - behindRing);
    float ringA = ringLine * ringOpacity;
    vec3 rgb = n.color.rgb * mix(vec3(1.0), moonColor, 0.5) * ringA;
    float alpha = ringA;
    float dirSign = speed < 0.0 ? -1.0 : 1.0;
    float ang = atan(q.y, q.x);
    for (int k = 0; k < 12; k++) {
        if (k >= moons) {
            break;
        }

        float a = n.time * speed + float(k) * 6.2831853 / count + n.seed * 17.0;
        vec2 m = vec2(cos(a), sin(a) * ct) * orbit;
        // a moon behind the node, inside its disc, is hidden by it
        float hidden = (sin(a) > 0.0 && length(m) < 1.0) ? 1.0 : 0.0;
        // a nearer moon looks bigger
        float sz = moonSize * (1.0 - 0.25 * sin(a) * sin(tilt));
        float d = length(p - m);
        float core = fillAA(d - sz) * (1.0 - hidden);
        float halo = exp(-d * d / (sz * sz * 6.0)) * 0.25 * (1.0 - 0.85 * hidden);
        // lit on the side facing the key light
        vec2 lp = (p - m) / sz;
        float lit = 0.55 + 0.45 * clamp(dot(lp, vec2(-0.6, 0.6)), -1.0, 1.0);
        // a faint trail behind the moon along the orbit
        float lag = mod((a - ang) * dirSign, 6.2831853);
        float trail = ringLine * exp(-lag * 3.0) * 0.4;
        rgb = rgb * (1.0 - core) + moonColor * (lit * 1.2 * core + halo + trail);
        alpha = alpha * (1.0 - core) + core + 0.5 * (halo + trail);
    }

    // rgb is summed premultiplied; returned straight.
    float a = clamp(alpha, 0.0, 1.0);
    return vec4(rgb / max(a, 1e-4), a);
}
`;
