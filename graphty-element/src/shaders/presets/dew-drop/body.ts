/**
 * @file The GLSL body of the `dew-drop` preset (design/rendering/shader-styles.md section 7.1),
 * ported from the nodes and droplets of the shader lab's dew on silk; the beaded edges are
 * dropped, as the owner asked.
 *
 * A drop of water: a dark, see-through refracting body, a bright caustic crescent where the light
 * focuses at the bottom, a fresnel rim and a hard glint toward the key light. The water takes
 * `tint` of the node's color. The preset declares `bloom`, so the shared bloom pass makes the
 * glint sparkle; `bloom` sets how hot the glint runs.
 */

/** The body: `shade` and its helpers. */
export const BODY = `// Dew drop: see-through water with a caustic crescent, a fresnel rim and a glint.
vec4 shade(NodeInput n) {
    vec3 nv = n.normal;
    float nz = max(dot(nv, -n.viewDir), 0.0);
    float r = length(n.uv);
    vec3 water = mix(vec3(0.85, 0.92, 1.0), n.color.rgb, tint);
    float fres = pow(1.0 - nz, 3.0);
    // The light comes from above, so the drop focuses it into a crescent at the bottom.
    float caustic = smoothstep(0.2, 0.9, 0.2 - n.uv.y * 0.8) * smoothstep(1.0, 0.6, r) * 0.6;
    // A water drop shows the world upside down: a faint bright floor at the top.
    float flipped = smoothstep(0.1, 0.9, n.uv.y) * nz * 0.18;
    float spec = pow(max(dot(reflect(n.viewDir, nv), lightDir), 0.0), 60.0) * sparkle;
    float second = pow(max(dot(reflect(n.viewDir, nv), normalize(vec3(0.5, -0.3, -0.8))), 0.0), 25.0) * 0.25 * sparkle;
    // The body carries the water's color, so a tinted drop reads as its node's color.
    vec3 c = water * (0.3 + 0.25 * nz) + water * (caustic * 0.8 + flipped) + water * fres * 0.5;
    c += vec3(1.0) * (spec * (1.5 + bloom) + second);
    float a = clamp(0.6 + fres * 0.4 + spec + caustic, 0.0, 1.0);
    return vec4(c, a);
}
`;
