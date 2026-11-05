/**
 * @file The GLSL body of the `pearl` preset (design/rendering/shader-styles.md section 7.1),
 * ported from the shader lab's matcap sampler, pearl material.
 *
 * A soft iridescent nacre: the color shifts from cream through pink and green as the surface
 * turns from the camera, lit by the scene's key light, with a broad satin highlight. `tint` is
 * how much the node's color tints the nacre.
 */

/** The body: `shade` and its helpers. */
export const BODY = `// Pearl: iridescent nacre over the node's color, with a satin highlight.
vec4 shade(NodeInput n) {
    vec3 base = mix(vec3(0.8), n.color.rgb, tint);
    float facing = clamp(-n.normal.z, 0.0, 1.0);
    // The nacre multiplies the node's color, so the fill still reads (and agrees with a legend);
    // its play of color is faint and lives at the rim.
    vec3 nacre = palette(facing * 0.9 + n.normal.y * 0.15, vec3(1.0), vec3(0.06), vec3(1.0), vec3(0.0, 0.33, 0.67));
    nacre = mix(vec3(1.0), nacre, 0.3 + 0.7 * pow(1.0 - facing, 1.5));
    float wrap = clamp((dot(n.normal, lightDir) + 0.3) / 1.3, 0.0, 1.0);
    vec3 c = base * nacre * (0.6 + 0.5 * wrap);
    // A soft sheen at the rim, then the satin highlight.
    c += vec3(0.12) * pow(1.0 - facing, 3.0);
    vec3 h = normalize(lightDir + vec3(0.0, 0.0, -1.0));
    c += vec3(0.6) * pow(max(dot(n.normal, h), 0.0), 40.0);
    return vec4(c, 1.0);
}
`;
