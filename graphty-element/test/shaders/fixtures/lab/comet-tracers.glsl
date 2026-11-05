/* graphty-shader 1
{
    "id": "lab/comet-tracers",
    "name": "comet-tracers",
    "place": "along",
    "params": [
        {
            "name": "speed",
            "type": "number",
            "default": 1,
            "min": -3,
            "max": 3,
            "varies": true
        },
        {
            "name": "spacing",
            "type": "number",
            "default": 180,
            "min": 30,
            "max": 800
        },
        {
            "name": "tail",
            "type": "number",
            "default": 55,
            "min": 4,
            "max": 200
        },
        {
            "name": "headColor",
            "type": "color",
            "default": "#fff6e0",
            "primary": true
        },
        {
            "name": "tailColor",
            "type": "color",
            "default": "#ff7a2a"
        },
        {
            "name": "useEdgeColor",
            "type": "boolean",
            "default": true
        },
        {
            "name": "intensity",
            "type": "number",
            "default": 1.2,
            "min": 0,
            "max": 3
        },
        {
            "name": "bloom",
            "type": "number",
            "default": 1,
            "min": 0,
            "max": 3
        }
    ]
}
*/
float ribbonX() { return inp.t * inp.lengthPx; }
float ribbonY() { return inp.side * inp.widthPx * 0.5; }
float edgeLit() { return max(abs(vTouch.x), abs(vTouch.y)); }

vec4 shade(EdgeInput inp) {
    vec4 fragColor = vec4(0.0);
    float cov = labEdgeCoverage();
    float w = vData.x;
    float k = mix(1.0, 0.35 + 1.3 * w, weightEffect);
    float x = ribbonX();
    float sp = spacing * pixelRatio;
    // distance behind the nearest comet head, in pixels (0 at the head, growing along the tail)
    float headPos = inp.time * speed * 120.0 * pixelRatio * k + vData.w * sp * 7.0;
    float behind = mod(headPos - x, sp);
    float tl = tail * pixelRatio * k;
    float trail = exp(-behind / tl);
    float head = exp(-behind / (2.5 * pixelRatio));
    // the tail narrows toward its end, the head is round
    float across = exp(-inp.side * inp.side * mix(1.2, 6.0, clamp(behind / (tl * 3.0), 0.0, 1.0)));
    vec3 edgeCol = mix(inp.sourceColor.rgb, inp.targetColor.rgb, inp.t);
    vec3 tc = mix(tailColor, edgeCol, hueMode);
    vec3 c = tc * trail * across * 1.2 + headColor * head * exp(-inp.side * inp.side * 1.5) * 2.0;
    c *= intensity * (0.6 + 0.6 * k) * (1.0 + 1.2 * edgeLit());
    c += edgeCol * trackOpacity * 0.35;
    fragColor = vec4(c * cov, cov);
    return fragColor;
}
