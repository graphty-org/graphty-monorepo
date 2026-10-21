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
    vec3 base = mix(vec3(0.75), n.color.rgb, tint);
    float facing = clamp(-n.normal.z, 0.0, 1.0);
    vec3 nacre = palette(facing * 0.9 + n.normal.y * 0.15, vec3(0.82), vec3(0.14), vec3(1.0), vec3(0.0, 0.33, 0.67));
    float wrap = clamp((dot(n.normal, lightDir) + 0.3) / 1.3, 0.0, 1.0);
    vec3 c = nacre * (0.55 + 0.45 * wrap);
    c = mix(c, c * (0.7 + base * 0.6), 0.35 + 0.45 * tint);
    // A soft sheen at the rim, then the satin highlight.
    c += vec3(0.12) * pow(1.0 - facing, 3.0);
    vec3 h = normalize(lightDir + vec3(0.0, 0.0, -1.0));
    c += vec3(0.8) * pow(max(dot(n.normal, h), 0.0), 40.0);
    return vec4(c, 1.0);
}
`;
