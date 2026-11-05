/**
 * @file The GLSL body of the `uncertainty-aura` preset (design/rendering/shader-styles.md section
 * 7.3), ported from the shader lab's uncertainty aura.
 *
 * `intensity` is how uncertain a node is, and is meant to be bound per node (`encode`): near 0 the
 * haze hugs the surface and keeps still; near 2 it spreads out, churns into turbulent smoke and
 * flickers. The smoke is sampled by direction rather than by angle, so no seam runs through it
 * (the lab's version had one where the angle wraps). The result is blended over, so it tints a
 * light canvas and glows on a dark one. The flicker is slow (at most two noise cells a second), so
 * it never flashes, and every moving part scales with `churn`, so `churn` 0 holds it still.
 */

export const BODY = `
vec4 shade(NodeInput n) {
    float u = clamp(intensity * 0.5, 0.0, 1.0);
    float r = length(n.uv);
    float edge = smoothstep(0.85, 1.0, r) * smoothstep(3.0, 2.2, r) * smoothstep(0.0, 0.15, intensity);
    if (edge <= 0.0) {
        return vec4(0.0);
    }

    vec2 dir = n.uv / max(r, 0.0001);
    float seed = n.seed * 31.0;
    float t = n.time * churn * (0.3 + 1.7 * u);
    // domain warp: noise displaces the lookup into more noise
    vec2 q = n.uv * 1.4 + seed + vec2(0.0, t * 0.4);
    vec2 warp = vec2(fbm(q), fbm(q + vec2(5.2, 1.3))) - 0.5;
    // flowing outward, so the smoke rises away from the node in every direction
    float smoke = fbm(vec3(dir * 1.9 + warp * turbulence * (0.6 + 2.4 * u), r * 1.6 - t + seed));
    // the reach: certain nodes hug the surface, uncertain ones spread out
    float k = mix(3.5, 0.7, u) / max(spread, 0.05);
    float halo = exp(-k * max(r - 1.0, 0.0));
    float wisps = smoothstep(0.35, 0.8, smoke + (1.0 - u) * 0.1);
    float a = halo * mix(0.5, 0.9, u) * mix(1.0, wisps * 1.5, 0.3 + 0.5 * u);
    // a slow flicker for the least certain
    a *= 1.0 - u * 0.35 * (noise(vec2(n.time * min(churn, 1.0) * 2.0, seed)) - 0.3);
    a = clamp(a * edge * (0.6 + 0.6 * u), 0.0, 1.0);
    vec3 col = mix(auraColor, n.color.rgb, tint);
    col = mix(col, col * vec3(0.8, 0.85, 1.2), u * 0.3) + vec3(0.15) * wisps * u;
    return vec4(col / 0.8, a * 0.8);
}
`;
