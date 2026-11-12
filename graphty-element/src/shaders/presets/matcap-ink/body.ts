/**
 * @file The GLSL body of the `matcap-ink` preset (design/rendering/shader-styles.md section 7.1),
 * ported from the shader lab's matcap sampler, toon material.
 *
 * Flat tones in three bands of the scene's key light, one crisp highlight and a dark ink rim,
 * like a printed comic. `tint` is how much the node's color tints the material: 0 draws it in
 * a neutral gray, 1 in the color the layers beneath chose.
 */

/** The body: `shade` and its helpers. */
export const BODY = `// Ink: flat tones in three bands, a crisp highlight and a dark ink rim.
vec4 shade(NodeInput n) {
    vec3 base = mix(vec3(0.75), n.color.rgb, tint);
    float ndl = max(dot(n.normal, lightDir), 0.0);
    float band = ndl > 0.65 ? 1.0 : (ndl > 0.25 ? 0.7 : 0.42);
    vec3 c = base * band;
    // The highlight: one hard-edged spot where the light reflects toward the camera.
    vec3 h = normalize(lightDir + vec3(0.0, 0.0, -1.0));
    float spec = max(dot(n.normal, h), 0.0);
    float aa = max(fwidth(spec), 0.002);
    c = mix(c, vec3(1.0), smoothstep(0.975 - aa, 0.975 + aa, spec));
    // The ink rim: where a curved surface turns away from the camera, and along hard edges.
    float facing = clamp(-n.normal.z, 0.0, 1.0);
    float edge = max(fwidth(facing), 0.01);
    float bend = length(fwidth(n.normal)) / max(length(fwidth(n.uv)), 1e-5);
    float rim = (1.0 - smoothstep(0.45 - edge, 0.45 + edge, facing)) * smoothstep(0.3, 0.6, bend);
    float crease = clamp((length(fwidth(n.normal)) - 0.35) * 4.0, 0.0, 1.0);
    c = mix(c, base * 0.15, max(rim, crease));
    return vec4(c, 1.0);
}
`;
