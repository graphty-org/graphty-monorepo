/* graphty-shader 1
{
    "id": "lab/edge-change",
    "name": "edge-change",
    "place": "along",
    "params": [
        {
            "name": "flashColor",
            "type": "color",
            "default": "#e8f4ff",
            "primary": true
        }
    ]
}
*/
// seconds since node i last changed (large = not recently)
float sinceChange(float i) {
    if (hash11(i * 0.6180339 + 21.0) >= activity) return 1e3;
    float P = mix(3.0, 11.0, hash11(i * 1.37 + 5.1));
    return mod(inp.time + hash11(i * 2.71 + 2.9) * P, P);
}
float flash(float i) { return exp(-sinceChange(i) * decay); }
// edge life: x = age since it appeared, y = 0..1 removal progress (0 = alive)
vec2 edgeLife(float e) {
    if (hash11(e * 0.4142 + 7.0) >= edgeChurn) return vec2(1e3, 0.0);
    float P = mix(7.0, 15.0, hash11(e * 1.13 + 3.3));
    float c = mod(inp.time + hash11(e * 3.17 + 1.1) * P, P);
    return vec2(c, clamp((c - (P - 1.2)) / 1.0, 0.0, 1.0));
}

vec4 shade(EdgeInput inp) {
    vec4 fragColor = vec4(0.0);
    float cov = labEdgeCoverage();
    vec3 c = mix(inp.sourceColor.rgb, inp.targetColor.rgb, inp.t);
    float lit = max(abs(vTouch.x), abs(vTouch.y));
    vec2 L = edgeLife(vInfo.z);
    // drawing in from the source
    float grow = clamp(L.x / drawTime, 0.0, 1.0);
    if (inp.t > grow) return vec4(0.0);
    // removal: shrink toward the middle
    if (abs(inp.t - 0.5) > 0.5 * (1.0 - L.y)) return vec4(0.0);
    float heat = exp(-L.x / coolTime);
    vec3 col = mix(c, vec3(1.0), 0.4 * lit);
    col = mix(col, blackbody(heat) * (1.0 + heat), clamp(heat * 1.3, 0.0, 1.0));
    // the drawing tip is brightest
    col += vec3(1.0) * exp(-(grow - inp.t) * inp.lengthPx / (6.0 * pixelRatio)) * step(grow, 0.999);
    // removed edges dim and redden as they go
    col = mix(col, vec3(0.6, 0.1, 0.1), L.y);
    float a = cov * mix(mix(0.5, 1.0, lit), 1.0, heat) * (1.0 - 0.5 * L.y);
    fragColor = vec4(col, a);
    return fragColor;
}
