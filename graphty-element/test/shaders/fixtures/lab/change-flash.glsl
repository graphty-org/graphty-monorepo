/* graphty-shader 1
{
    "id": "lab/change-flash",
    "name": "Change flash",
    "place": "around",
    "params": [
        {
            "name": "flashColor",
            "type": "color",
            "default": "#e8f4ff",
            "primary": true
        },
        {
            "name": "glint",
            "type": "number",
            "default": 1,
            "min": 0,
            "max": 3
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

vec4 shade(NodeInput inp) {
    vec4 fragColor = vec4(0.0);
    float s = sinceChange(vInfo.y);
    float f = exp(-s * decay);
    if (f < 0.01) return vec4(0.0);
    vec2 uv = inp.uv;
    float r = length(uv);
    // four-point star, slowly turning, plus a fainter diagonal pair
    vec2 q = rot2(s * 0.6) * uv;
    float star = exp(-abs(q.y) * 18.0) * exp(-abs(q.x) * 0.9) + exp(-abs(q.x) * 18.0) * exp(-abs(q.y) * 0.9);
    vec2 q2 = rot2(0.785398) * q;
    star += 0.4 * (exp(-abs(q2.y) * 26.0) * exp(-abs(q2.x) * 1.8) + exp(-abs(q2.x) * 26.0) * exp(-abs(q2.y) * 1.8));
    float core = exp(-r * r * 2.5);
    float ring = stroke(r - (1.0 + s * 5.0), 0.06 + s * 0.05) * exp(-s * 2.0);
    float e = (star * glint * 1.8 + core) * f + ring;
    vec3 col = mix(flashColor, inp.color.rgb, 0.25) * e;
    fragColor = vec4(col, min(e, 1.5) * (1.0 - smoothstep(4.0, 5.5, r)));
    return fragColor;
}
