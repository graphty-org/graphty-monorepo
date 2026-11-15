/* graphty-shader 1
{
    "id": "lab/uncertainty-aura",
    "name": "Aura",
    "place": "around",
    "params": [
        {
            "name": "intensity",
            "type": "number",
            "default": 1.3,
            "min": 0,
            "max": 2,
            "varies": true,
            "primary": true
        },
        {
            "name": "spread",
            "type": "number",
            "default": 1.4,
            "min": 0.2,
            "max": 2.5
        },
        {
            "name": "turbulence",
            "type": "number",
            "default": 1.2,
            "min": 0,
            "max": 3
        },
        {
            "name": "churn",
            "type": "number",
            "default": 0.8,
            "min": 0,
            "max": 3
        },
        {
            "name": "auraColor",
            "type": "color",
            "default": "#9fb8ff"
        },
        {
            "name": "tint",
            "type": "number",
            "default": 0.55,
            "min": 0,
            "max": 1
        }
    ]
}
*/
vec4 shade(NodeInput inp) {
    vec4 fragColor = vec4(0.0);
    float u = vCustom.x;
    float r = length(inp.uv);
    float ang = atan(inp.uv.y, inp.uv.x);
    float seed = inp.seed * 31.0;
    float sp = churn * (0.3 + 1.7 * u);
    // polar coordinates flowing outward, so smoke rises away from the node in every direction
    vec2 pol = vec2(ang * 1.2 + seed, r * 1.6 - inp.time * sp);
    vec2 q2 = inp.uv * 1.4 + seed + vec2(0.0, inp.time * sp * 0.4);
    // domain warp: noise displaces the lookup into more noise
    vec2 warp = vec2(fbm(q2), fbm(q2 + vec2(5.2, 1.3))) - 0.5;
    float smoke = fbm(vec3(pol * vec2(1.0, 1.0) + warp * turbulence * (0.6 + 2.4 * u), inp.time * sp * 0.25 + seed));
    // the halo's reach: certain nodes hug the surface, uncertain ones spread out
    float k = mix(3.5, 0.7, u) / max(spread, 0.05);
    float halo = exp(-k * max(r - 1.0, 0.0));
    float wisps = smoothstep(0.35, 0.8, smoke + (1.0 - u) * 0.1);
    float a = halo * mix(0.55, 1.0, u) * mix(1.0, wisps * 1.8, 0.4 + 0.5 * u);
    // flicker for the least certain
    a *= 1.0 - u * 0.35 * (noise(vec2(inp.time * 6.0, seed)) - 0.3);
    a *= smoothstep(0.85, 1.0, r) * smoothstep(QUAD, QUAD * 0.7, r);
    vec3 col = mix(auraColor, inp.color.rgb, tint);
    col = mix(col, col * vec3(0.8, 0.85, 1.2), u * 0.3) + vec3(0.25) * wisps * u;
    a *= intensity;
    if (a < 0.002) return vec4(0.0);
    fragColor = vec4(col * a, a);
    return fragColor;
}
