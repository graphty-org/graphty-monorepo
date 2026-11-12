/* graphty-shader 1
{
    "id": "lab/fiber-optic",
    "name": "Fiber",
    "params": [
        {
            "name": "glass",
            "type": "number",
            "default": 1,
            "min": 0,
            "max": 3,
            "primary": true
        },
        {
            "name": "hueSpread",
            "type": "number",
            "default": 0.6,
            "min": 0,
            "max": 1
        }
    ]
}
*/
float ribbonX() { return inp.t * inp.lengthPx; }
float ribbonY() { return inp.side * inp.widthPx * 0.5; }
float ribbonHalf() { return inp.widthPx * 0.5; }
// 1 when the edge touches the hovered or selected node
float edgeLit() { return max(abs(vTouch.x), abs(vTouch.y)); }

vec4 shade(EdgeInput inp) {
    vec4 fragColor = vec4(0.0);
    float cov = labEdgeCoverage();
    float s = abs(inp.side);
    float L = max(inp.lengthPx, 1.0);
    // glass: a dark body, a bright rim and a thin core line
    float rim = smoothstep(0.55, 0.9, s) * (1.0 - smoothstep(0.9, 1.05, s));
    vec3 tint = mix(inp.sourceColor.rgb, inp.targetColor.rgb, inp.t);
    vec3 c = tint * (0.04 + 0.22 * rim) * glass;
    float core = exp(-s * s * 10.0);
    // packets: a bright head and an exponential tail behind it, in pixels
    float arrive = 0.0;
    for (int k = 0; k < 6; k++) {
        if (float(k) >= packets) break;
        float seed = vData.w * 17.0 + float(k) * 7.31;
        float sp = speed * (0.6 + 0.8 * hash11(seed));
        float head = fract(inp.time * sp * 120.0 / L + hash11(seed + 3.1));
        float behind = fract(head - inp.t) * L;
        float b = exp(-behind / max(tail, 1.0)) * step(behind, L * 0.95);
        vec3 hue = hsv2rgb(vec3(fract(hash11(seed + 9.7) * hueSpread + vData.y * 0.13), 0.65, 1.0));
        c += hue * b * (0.15 + 1.1 * core);
        // the flare as a packet reaches the target
        arrive += exp(-pow((1.0 - head) * L / 20.0, 2.0));
    }
    float end = exp(-(1.0 - inp.t) * L / 6.0) * smoothstep(10.0, 40.0, L);
    c += vec3(0.8, 0.95, 1.0) * end * (0.1 + arrive) * glint * (0.3 + core);
    float lit = edgeLit();
    c *= 1.0 + 1.2 * lit;
    fragColor = vec4(c, cov);
    return fragColor;
}
