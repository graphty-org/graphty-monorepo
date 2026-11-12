/**
 * @file The GLSL body of the `lock-on-reticle` preset (design/rendering/shader-styles.md section
 * 7.3), ported from the shader lab's lock-on reticle.
 *
 * Four corner brackets snap in when a node starts carrying the effect (on a Selected layer: when
 * the node is selected), a ticked ring and four pips turn against them, and a flash and a pulse
 * ring mark the lock. The lock is over before the 0.55 s entrance ends, so the frame the entrance
 * last claims is the reticle at rest. While it stays on, the brackets turn at `spin`; as it
 * leaves, it grows and fades over 0.3 s. A node that already carried it (a layer's own add) shows
 * it at rest: `sinceEntered` is large there.
 *
 * Lines keep their width in screen pixels and carry a dark edge, so the reticle reads on a light
 * canvas as well as a dark one. The lab's dashed hover ring is not here: the layer's selector
 * decides which nodes carry the reticle.
 */

export const BODY = `
float easeOutBack(float x) {
    float v = x - 1.0;
    return 1.0 + 2.70158 * v * v * v + 1.70158 * v * v;
}

vec4 shade(NodeInput n) {
    float px = 1.0 / max(n.pixelSize, 1.0);
    // On a small node the fine parts crowd into a blob: thicker lines, fewer ticks (at least
    // 8 px apart round the ring at rest), and the detail fades in order as the node shrinks: the
    // scan first, then the inner circle and the pips, then the ticked ring; the four brackets
    // stay, so the minimum size (40 px by default) always shows a reticle.
    float scanDetail = smoothstep(20.0, 32.0, n.pixelSize);
    float detail = smoothstep(11.0, 20.0, n.pixelSize);
    float ringDetail = smoothstep(5.0, 10.0, n.pixelSize);
    float lw = lineWidth * px * mix(1.4, 1.0, detail);
    float tickCount = max(4.0, min(float(ticks), floor(6.2831853 * 1.914 * n.pixelSize / 32.0) * 4.0));
    vec2 uv = n.uv;
    float r = length(uv);
    float ang = atan(uv.y, uv.x);
    float t = lockTime / 0.55;
    float leave = leaveTime / 0.3;
    float R = mix(2.0, 1.45, easeOutBack(t)) + 0.6 * leave;
    float turn = n.time * spin;
    // four L brackets, turning, swung in by the entrance
    vec2 q = abs(rot2(turn + (1.0 - t) * 1.5) * uv);
    float len = R * 0.42;
    float d = min(sdSegment(q, vec2(R, R - len), vec2(R, R)), sdSegment(q, vec2(R - len, R), vec2(R, R)));
    float brackets = fillAA(d - lw);
    // a ticked ring outside them, counter-turning, with four major marks
    float RR = R * 1.32;
    float phase = (ang - turn * 0.6) / 6.2831853;
    float tickMask = step(0.55, fract(phase * tickCount));
    float ring = strokeAA(r - RR, lw * 0.6) * tickMask * ringDetail;
    float major = strokeAA(r - RR, lw * 2.2) * step(0.92, fract(phase * 4.0)) * ringDetail;
    // an inner thin circle and four cardinal pips
    float inner = strokeAA(r - R * 0.86, lw * 0.4) * 0.6 * detail;
    vec2 c4 = abs(rot2(-turn * 0.3) * uv);
    float pips = fillAA(min(sdSegment(c4, vec2(R * 1.05, 0.0), vec2(R * 1.2, 0.0)), sdSegment(c4, vec2(0.0, R * 1.05), vec2(0.0, R * 1.2))) - lw) * detail;
    float fade = mix(0.4, 1.0, t) * (1.0 - leave);
    float lines = max(max(brackets, pips), max(ring, max(major, inner))) * fade;
    // the lock: a flash and a pulse ring that runs out, both over before the entrance ends
    float lockAge = lockTime - 0.385;
    float lockOn = lockAge < 0.0 ? 0.0 : 1.0 - smoothstep(0.0, 0.165, lockAge);
    float pulse = strokeAA(r - (R + max(lockAge, 0.0) * 6.0), lw * 1.5) * lockOn * (1.0 - smoothstep(2.4, 2.9, r));
    // a faint scan inside the brackets once locked
    float scan = 0.12 * t * scanDetail * (1.0 - leave) * (1.0 - smoothstep(R * 0.95, R, max(q.x, q.y))) * step(0.5, fract(uv.y * 0.5 / px / 3.0));
    float lineA = clamp(max(lines, pulse) + scan, 0.0, 1.0);
    // a dark edge under the brackets and the ring
    float dark = max(fillAA(d - lw - 1.5 * px), strokeAA(r - RR, lw * 0.6 + 1.5 * px) * tickMask * ringDetail) * fade;
    float shadow = 0.45 * dark * (1.0 - lineA);
    vec3 hud = hudColor * (1.0 + 1.5 * lockOn) + vec3(0.5 * lockOn);
    // Straight alpha: the lines' and the shadow's light over their coverage.
    float a = lineA + shadow;
    return vec4((hud * lineA + vec3(0.02, 0.06, 0.04) * shadow) / max(a, 1e-4), a);
}
`;
