/* graphty-shader 1
{
    "id": "lab/lock-on-reticle",
    "name": "Reticle",
    "place": "around",
    "params": [
        {
            "name": "hudColor",
            "type": "color",
            "default": "#5cffb0",
            "primary": true
        },
        {
            "name": "spin",
            "type": "number",
            "default": 0.6,
            "min": -3,
            "max": 3
        },
        {
            "name": "ticks",
            "type": "integer",
            "default": 48,
            "min": 8,
            "max": 120
        },
        {
            "name": "lineWidth",
            "type": "number",
            "default": 1.8,
            "min": 0.5,
            "max": 5
        }
    ]
}
*/
float easeOutBack(float t) { float c1 = 1.70158; float c3 = c1 + 1.0; float u = t - 1.0; return 1.0 + c3 * u * u * u + c1 * u * u; }
vec4 shade(NodeInput inp) {
    vec4 fragColor = vec4(0.0);
    float px = 1.0 / max(inp.pixelSize, 1.0);
    float lw = lineWidth * px;
    vec2 uv = inp.uv;
    float r = length(uv);
    float ang = atan(uv.y, uv.x);
    vec3 col = vec3(0.0);
    float a = 0.0;
    if (vInfo.y == selectedNode) {
        float t = clamp((inp.time - selectTime) / snapTime, 0.0, 1.0);
        float R = mix(3.6, 1.45, easeOutBack(t));
        // four L brackets, turning
        vec2 q = abs(rot2(inp.time * spin + (1.0 - t) * 1.5) * uv);
        float len = R * 0.42;
        float d = min(sdSegment(q, vec2(R, R - len), vec2(R, R)), sdSegment(q, vec2(R - len, R), vec2(R, R)));
        float br = fill(d - lw);
        // ticked ring counter-rotating outside
        float RR = R * 1.32;
        float tickMask = step(0.55, fract((ang - inp.time * spin * 0.6) / TAU * ticks));
        float ring = stroke(r - RR, lw * 0.6) * tickMask;
        float major = stroke(r - RR, lw * 2.2) * step(0.92, fract((ang - inp.time * spin * 0.6) / TAU * 4.0));
        // inner thin circle and four cardinal pips
        float inner = stroke(r - R * 0.86, lw * 0.4) * 0.6;
        vec2 c4 = abs(rot2(-inp.time * spin * 0.3) * uv);
        float pip = fill(min(sdSegment(c4, vec2(R * 1.05, 0.0), vec2(R * 1.2, 0.0)), sdSegment(c4, vec2(0.0, R * 1.05), vec2(0.0, R * 1.2))) - lw);
        float lockFlash = exp(-max(inp.time - selectTime - snapTime * 0.7, 0.0) * 5.0) * step(snapTime * 0.7, inp.time - selectTime);
        float m = max(max(br, pip), max(ring, max(major, inner)));
        col = hudColor * (1.2 + 2.0 * lockFlash) + vec3(lockFlash);
        // a pulse ring on lock
        float pr = stroke(r - (R + (inp.time - selectTime - snapTime * 0.7) * 6.0), lw * 1.5) * lockFlash * (1.0 - smoothstep(3.2, 4.8, r));
        a = max(m * mix(0.4, 1.0, t), pr);
        // a faint scan inside the brackets
        a = max(a, 0.12 * t * (1.0 - smoothstep(R * 0.95, R, max(q.x, q.y))) * step(0.5, fract(uv.y * 0.5 / px / 3.0)));
    } else {
        // hover: dashed tracking ring
        float dash = step(0.5, fract((ang + inp.time * 1.5) / TAU * 16.0));
        a = stroke(r - 1.35, lw * 0.6) * dash * 0.85;
        col = hudColor;
    }
    if (a <= 0.003) return vec4(0.0);
    fragColor = vec4(col, a);
    return fragColor;
}
