/* graphty-shader 1
{
    "id": "lab/edge-glow",
    "name": "edge-glow",
    "place": "along",
    "params": [
        {
            "name": "glow",
            "type": "number",
            "default": 0.4,
            "min": 0,
            "max": 2,
            "primary": true
        },
        {
            "name": "glowWidth",
            "type": "number",
            "default": 3,
            "min": 0.5,
            "max": 10
        },
        {
            "name": "glintSpeed",
            "type": "number",
            "default": 0.35,
            "min": 0,
            "max": 2
        },
        {
            "name": "bloom",
            "type": "number",
            "default": 0.6,
            "min": 0,
            "max": 2
        }
    ]
}
*/
// half width of the bright core in device pixels at t
float coreHalf(float w, float t) {
    return edgeWidth * pixelRatio * (0.35 + weightWidth * w) * 0.5 * mix(1.0, 0.3, taper * t);
}

vec4 shade(EdgeInput inp) {
    vec4 fragColor = vec4(0.0);
    float px = abs(inp.side) * inp.widthPx * 0.5;          // pixels from the centerline
    float core = coreHalf(vData.x, inp.t);
    float aa = 1.0 - smoothstep(core - 0.6, core + 0.6, px);
    float halo = exp(-max(px - core, 0.0) / max(glowWidth * pixelRatio, 0.1)) * glow;
    halo *= 1.0 - smoothstep(0.85, 1.0, abs(inp.side)); // fade out before the strip ends
    vec3 c = mix(inp.sourceColor.rgb, inp.targetColor.rgb, inp.t);
    float head = fract(inp.time * glintSpeed * (0.6 + vData.w) + vData.w * 7.0);
    float dt = fract(inp.t - head + 0.5) - 0.5;
    float glint = exp(-abs(dt) * 30.0) * step(0.001, glintSpeed);
    float lit = max(abs(vTouch.x), abs(vTouch.y));
    float focus = selectedNode < 0.0 ? 1.0 : (vInfo.w == 0.0 ? 1.4 : 0.12);
    vec3 coreColor = mix(c, vec3(1.0), 0.2 + 0.7 * glint);
    vec3 col = (coreColor * aa * (0.85 + 1.5 * glint) + c * halo * (0.6 + glint)) * (focus + lit * 0.8);
    fragColor = vec4(col, 1.0);
    return fragColor;
}
