/**
 * @file The GLSL body of the `frost` preset (design/rendering/shader-styles.md section 7.1),
 * ported from the shader lab's frost pinned.
 *
 * The lab grew frost from a pin stamp it kept itself; here the growth is the shader's entrance and
 * the thaw its exit, so a pinned-state layer drives it: over the 2 s after a node starts carrying
 * it the frost front creeps in from the rim, jagged along Worley crystal cells and fern-like
 * noise, and over the 1 s after it stops the ice melts back, leaving a wet, darker sheen that
 * dries as it goes. At rest it is a still surface: translucent blue ice over the node's own color,
 * faceted cells catching the key light, bright crystal edges, dendrites and a bluish rim.
 */

/** The body: `shade` and its helpers. */
export const BODY = `// Frost: ice that grows in from the rim when the node arrives, and thaws when it leaves.

// The direction the camera looks, in view space: the same for every pixel of an impostor, so a
// node off the axis is lit like one on it.
const vec3 VIEW_FORWARD = vec3(0.0, 0.0, 1.0);

float lambert(vec3 normal) { return max(dot(normal, lightDir), 0.0); }

float specular(vec3 normal, vec3 viewDir, float power) {
    return pow(max(dot(normal, normalize(lightDir - viewDir)), 0.0), power);
}

// How far the frost has grown: 0 none, 1.6 the whole node.
float frostAmount(NodeInput n) {
    float grown = 1.6 * growTime / 2.0;
    float left = 1.6 * (1.0 - thawTime);
    return min(grown, left);
}

vec4 shade(NodeInput n) {
    float facing = clamp(-n.normal.z, 0.0, 1.0);
    float r = length(n.uv);
    float f = frostAmount(n);
    float thawing = n.sinceExited < 0.0 ? 0.0 : 1.0;

    vec3 base = n.color.rgb * (0.22 + 0.9 * lambert(n.normal)) + vec3(1.0) * specular(n.normal, VIEW_FORWARD, 60.0) * 0.6;

    // The front: frost covers the points f has passed, made jagged by crystal cells.
    vec2 v = voronoi(n.uv * crystalScale + n.seed * 31.0);
    float facet = v.y - v.x;
    float fern = fbm(n.uv * crystalScale * 0.5 + n.seed * 7.0);
    float front = (1.0 - r) + facet * 0.25 + fern * 0.3;
    float mask = smoothstep(front - 0.025, front + 0.025, f);
    float band = exp(-abs(f - front) * 25.0) * step(0.001, f) * (1.0 - step(1.55, f)) * (1.0 - thawing);

    // Ice: translucent blue over the node's own color, each facet tilted to catch the light.
    float tilt = hash12(floor(n.uv * crystalScale * 0.5 + n.seed * 9.0) + floor(v.x * 3.0));
    float lines = 1.0 - smoothstep(0.0, 0.03, facet);
    float dend = pow(1.0 - abs(noise(n.uv * crystalScale * 0.9 + 3.0) * 2.0 - 1.0), 12.0);
    vec3 deep = mix(n.color.rgb * 0.35, vec3(0.12, 0.3, 0.55), 0.7);
    vec3 ice = mix(deep, frostColor, 0.35 + 0.45 * lambert(n.normal) + 0.2 * tilt);
    ice += vec3(0.85, 0.95, 1.0) * (lines * 0.7 + dend * 0.45);
    ice += vec3(1.0) * specular(n.normal, VIEW_FORWARD, 40.0) * 0.5;
    ice += vec3(0.45, 0.75, 1.0) * pow(1.0 - facing, 2.0) * 0.8;
    float glint = step(0.992, hash12(floor(n.uv * 40.0) + floor(n.seed * 10.0)));
    ice += vec3(1.6) * glint * sparkle * mask;

    // Thaw: a wet, darker sheen where the frost has just melted, drying as the exit ends.
    vec3 wet = mix(base, vec3(0.6, 0.75, 0.85), 0.25) + specular(n.normal, VIEW_FORWARD, 120.0) * 0.8;
    float wetness = thawing * smoothstep(0.0, 0.3, f + 0.2) * (1.0 - mask);
    vec3 col = mix(base, wet, wetness);
    col = mix(col, ice, mask * 0.94);
    col += vec3(0.75, 0.92, 1.0) * band * 0.6;
    return vec4(col, n.color.a);
}
`;
