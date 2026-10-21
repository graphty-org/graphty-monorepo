/**
 * @file The GLSL body of the `anodized-steel` preset (design/rendering/shader-styles.md section
 * 7.1), a new look (the owner's suggestion "rainbow anodized steel").
 *
 * Brushed steel under a thin transparent oxide film. The film's color is thin-film interference,
 * the same math as the shader lab's soap bubble: light reflected from the film's top and bottom
 * meets out of step by twice the film's optical thickness, so each wavelength is strengthened or
 * cancelled and the color shifts with the viewing angle. `film` is the film's thickness in
 * nanometers (thin: straw and bronze; thicker: blue, purple, then greens and pinks); `brush` is
 * how strongly the surface is brushed (fine streaks and a highlight stretched across them);
 * `tint` is how much the node's color tints the steel.
 */

/** The body: `shade` and its helpers. */
export const BODY = `// Anodized steel: brushed metal under a thin oxide film that colors it by interference.
// The film's reflected color for a thickness in nanometers, seen at an angle (cosine) to it.
vec3 filmColor(float nm, float cosView) {
    float cosInside = sqrt(1.0 - (1.0 - cosView * cosView) / (2.2 * 2.2));
    float path = 2.0 * 2.2 * nm * cosInside;
    vec3 waves = vec3(650.0, 532.0, 450.0);
    return 0.5 + 0.5 * cos(6.28318 * path / waves);
}
vec4 shade(NodeInput n) {
    float facing = clamp(-n.normal.z, 0.0, 1.0);
    // Brush streaks run across the node, fixed to it, with a little variation along them.
    vec2 b = n.uv * vec2(3.0, 140.0) + vec2(n.seed * 11.0, n.seed * 53.0);
    float streak = noise(b) * 0.65 + noise(b * vec2(1.0, 2.7)) * 0.35 - 0.5;
    vec3 steel = mix(vec3(0.62, 0.63, 0.66), n.color.rgb, tint);
    float diffuse = clamp(dot(n.normal, lightDir) * 0.5 + 0.5, 0.0, 1.0);
    vec3 c = steel * (0.35 + 0.45 * diffuse) * (1.0 + streak * 0.35 * brush);
    // An anisotropic highlight: stretched along y, the direction across the streaks.
    vec3 h = normalize(lightDir + vec3(0.0, 0.0, -1.0));
    vec3 tangentLight = h - n.normal * dot(h, n.normal);
    float across = 1.0 - abs(tangentLight.x) * mix(1.0, 3.5, brush);
    float spec = pow(max(dot(n.normal, h), 0.0), mix(60.0, 18.0, brush)) * clamp(across, 0.0, 1.0);
    vec3 oxide = filmColor(film, facing);
    c = c * mix(vec3(1.0), oxide * 1.35, 0.85) + oxide * spec * 1.1;
    // Fresnel: the film's color is strongest edge-on.
    c += oxide * 0.25 * pow(1.0 - facing, 3.0);
    return vec4(min(c, vec3(1.0)), 1.0);
}
`;
