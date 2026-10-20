/**
 * Helpers shared by the edge-ribbon pattern stories: pixel coordinates on the ribbon, a dark
 * glass node that lets bright edges carry the picture, and a cheap bloom post-process.
 */

/**
 * Edge fragment GLSL: the fragment's position on the ribbon in device pixels. x runs from the
 * source (0) to the target (vLengthPx), y runs across (0 on the center line, +-halfWidth at the rim).
 * A per-edge offset keeps neighboring edges' patterns out of step.
 */
export const RIBBON_GLSL = `
float ribbonX() { return vT * vLengthPx; }
float ribbonY() { return vSide * vWidthPx * 0.5; }
float ribbonHalf() { return vWidthPx * 0.5; }
// 1 when the edge touches the hovered or selected node
float edgeLit() { return max(abs(vTouch.x), abs(vTouch.y)); }
`;

/** Node fragment: a dark glass bead with a rim and core in the community color. */
export const DARK_NODE_FRAGMENT = `
void main() {
    float r = length(vUV);
    float d = r - 1.0;
    float a = fill(d);
    if (a <= 0.0) discard;
    vec3 c = vColor.rgb * 0.12;
    c += vColor.rgb * stroke(d + 0.12, 0.07) * 1.1;
    c += vColor.rgb * exp(-r * r * 6.0) * 0.6;
    c += vec3(0.6) * exp(-pow(length(vUV - vec2(-0.35, 0.4)) * 4.0, 2.0)) * 0.5;
    c = mix(c, vec3(1.0), 0.45 * vState.x);
    c = mix(c, vec3(1.0), stroke(d + 0.04, 0.05) * vState.y);
    gl_FragColor = vec4(c, a);
}
`;

/** Post-process: adds a soft glow around bright pixels. Needs uniforms bloom and bloomRadius. */
export const BLOOM_POST = `
void main() {
    vec4 base = texture2D(textureSampler, vUV);
    if (bloom <= 0.0) { gl_FragColor = vec4(base.rgb, 1.0); return; }
    vec3 acc = vec3(0.0);
    vec2 px = pixelRatio / resolution;
    const int TAPS = LAB_Q(6, 10, 16);
    for (int i = 0; i < TAPS; i++) {
        float fi = float(i) * 16.0 / float(TAPS);
        float ang = fi * 2.39996;
        vec2 o = vec2(cos(ang), sin(ang)) * sqrt(fi + 0.5) * bloomRadius * px;
        vec3 s = texture2D(textureSampler, vUV + o).rgb;
        acc += max(s - vec3(0.3), 0.0) * (1.0 - fi / 18.0);
    }
    gl_FragColor = vec4(base.rgb + acc * (16.0 / float(TAPS)) / 9.0 * bloom, 1.0);
}
`;
