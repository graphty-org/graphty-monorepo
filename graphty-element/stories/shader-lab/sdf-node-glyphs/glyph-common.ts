/**
 * Pieces shared by the SDF node glyph stories: a quiet edge shader that keeps the glyphs readable,
 * and the community palette as a GLSL function.
 */
import { PALETTE } from "../harness";

/** Thin, dim source-to-target gradient edges; edges touching the hovered or selected node light up. */
export const QUIET_EDGE = `
void main() {
    vec3 c = mix(vColorA.rgb, vColorB.rgb, vT);
    float lit = max(abs(vTouch.x), abs(vTouch.y));
    gl_FragColor = vec4(mix(c * 0.8, vec3(1.0), 0.4 * lit), labEdgeCoverage() * mix(0.28, 0.9, lit));
}
`;

/** `vec3 communityRGB(float c)`: the harness's community palette in GLSL. */
export const COMMUNITY_RGB = `
vec3 communityRGB(float c) {
    float k = mod(floor(c + 0.5), ${PALETTE.length.toFixed(1)});
${PALETTE.map(
    ([r, g, b], i) =>
        `    if (k < ${(i + 0.5).toFixed(1)}) return vec3(${r.toFixed(3)}, ${g.toFixed(3)}, ${b.toFixed(3)});`,
).join("\n")}
    return vec3(1.0);
}
`;
