/* graphty-shader 1
{
    "id": "lab/icon-sticker",
    "name": "Sticker",
    "place": "replace",
    "params": [
        {
            "name": "icon",
            "type": "integer",
            "default": 0,
            "min": 0,
            "max": 11,
            "varies": true
        },
        {
            "name": "finish",
            "type": "enum",
            "default": "none",
            "values": [
                {
                    "value": "none",
                    "label": "none"
                },
                {
                    "value": "shiny",
                    "label": "shiny"
                },
                {
                    "value": "holographic",
                    "label": "holographic"
                }
            ],
            "primary": true
        },
        {
            "name": "finishSpeed",
            "type": "number",
            "default": 0.5,
            "min": 0,
            "max": 2
        },
        {
            "name": "foil",
            "type": "number",
            "default": 0.85,
            "min": 0,
            "max": 1
        },
        {
            "name": "borderColor",
            "type": "color",
            "default": "#fbfaf6"
        }
    ]
}
*/
float dot2(vec2 v) { return dot(v, v); }
float sdHeart(vec2 p) {
    p.x = abs(p.x);
    if (p.y + p.x > 1.0) return sqrt(dot2(p - vec2(0.25, 0.75))) - 0.353553;
    return sqrt(min(dot2(p - vec2(0.0, 1.0)), dot2(p - 0.5 * max(p.x + p.y, 0.0)))) * sign(p.x - p.y);
}
float iconD(float k, vec2 p) {
    k = mod(k, 6.0);
    if (k < 0.5) {       // person
        float head = sdCircle(p - vec2(0.0, 0.2), 0.17);
        float body = sdRoundBox(p - vec2(0.0, -0.3), vec2(0.32, 0.2), 0.16);
        return min(head, body);
    }
    if (k < 1.5) {       // gear
        float r = length(p);
        float ang = atan(p.y, p.x);
        float teeth = clamp(cos(ang * 8.0) * 3.0, -1.0, 1.0) * 0.06;
        return max(r - 0.33 - teeth, 0.12 - r);
    }
    if (k < 2.5) return sdHeart(p * 1.55 + vec2(0.0, 0.55)) / 1.55;   // heart
    if (k < 3.5) {       // bolt
        float s = min(sdSegment(p, vec2(0.14, 0.44), vec2(-0.14, 0.02)), sdSegment(p, vec2(-0.14, 0.02), vec2(0.14, 0.02)));
        return min(s, sdSegment(p, vec2(0.14, 0.02), vec2(-0.14, -0.44))) - 0.065;
    }
    if (k < 4.5) {       // document
        float page = sdRoundBox(p, vec2(0.27, 0.36), 0.05);
        float lines = min(sdBox(p - vec2(0.0, 0.14), vec2(0.16, 0.025)), sdBox(p - vec2(0.0, 0.02), vec2(0.16, 0.025)));
        lines = min(lines, sdBox(p - vec2(-0.04, -0.1), vec2(0.12, 0.025)));
        return max(page, -lines);
    }
    // planet with a ring
    float planet = sdCircle(p, 0.22);
    vec2 q = rot2(0.45) * p;
    float ring = abs(length(q * vec2(1.0, 3.2)) - 0.42) - 0.05;
    // in front of the planet (q.y < 0) a thin gap is cut around the ring, so it reads as passing in front
    float cut = q.y < 0.0 ? ring - 0.05 : 1.0;
    return min(max(planet, -cut), ring);
}
float stickerD(vec2 p) { return sdCircle(p, 0.92); }

vec3 frontColor(vec2 p) {
    float d = stickerD(p);
    float bodyD = d + 0.13;
    vec3 c = borderColor;
    vec3 body = inp.color.rgb * (0.85 + 0.2 * p.y);
    c = mix(c, body, fill(bodyD));
    float icD = iconD(vData.w, p * 1.1);
    if (mod(vData.w, 12.0) > 5.5) icD = abs(icD + 0.02) - 0.04;   // communities 6-11: outlined icons, so no two share one
    float ic = fill(icD);
    c = mix(c, vec3(1.0, 0.99, 0.96), ic);
    // vinyl gloss band
    float gloss = smoothstep(0.08, 0.0, abs(p.x * 0.6 + p.y - 0.45)) * 0.18 * fill(bodyD);
    return c + gloss;
}

vec4 shade(NodeInput inp) {
    vec4 fragColor = vec4(0.0);
    vec2 p = inp.uv;
    float hp = inp.hovered * smoothstep(0.0, 1.0, clamp((inp.time - hoverTime) * peelSpeed, 0.0, 1.0));
    float peel = max(peelAll, hp * peelHover);
    vec2 D = vec2(cos(peelAngle), sin(peelAngle));
    float s = dot(p, D);
    float s0 = 0.93 - peel * 1.1;

    float frontIn = fill(stickerD(p)) * fill(s - s0);       // the part still stuck down
    vec2 m = p + 2.0 * (s0 - s) * D;                          // the flap point that folds onto p
    float flapIn = fill(stickerD(m)) * fill(s - s0) * step(0.001, peel);
    float flapD = stickerD(m);

    vec3 c = frontColor(p);
    // the flap's shadow on the sticker, offset away from the fold
    vec2 ms = (p - D * 0.07) + 2.0 * (s0 - dot(p - D * 0.07, D)) * D;
    float shadow = (1.0 - smoothstep(-0.05, 0.22, stickerD(ms))) * step(0.001, peel) * fill(s - s0 + 0.07);
    c *= 1.0 - 0.5 * shadow;
    float a = max(frontIn, shadow * 0.45 * fill(stickerD(p) - 0.15));

    // holographic foil on the back of the flap
    float t = dot(m, vec2(0.7, 0.7)) * 1.6 + inp.time * 0.25 + inp.seed;
    vec3 holo = palette(t, vec3(0.6), vec3(0.4), vec3(1.0), vec3(0.0, 0.33, 0.67));
    float sparkle = step(0.985, hash12(floor(m * 40.0) + floor(inp.time * 6.0)));
    vec3 back = mix(vec3(0.82, 0.84, 0.88), holo, foil);
    back += sparkle * foil;
    float curl = exp(-(s0 - s) * 9.0);                        // brighter where it bends
    back = back * (0.65 + 0.35 * (1.0 - curl)) + curl * 0.35;
    back = mix(back, back * 0.7, stroke(flapD + 0.01, 0.015));
    c = mix(c, back, flapIn);
    a = max(a, flapIn);

    c = mix(c, vec3(1.0), 0.12 * inp.hovered * frontIn);
    float sel = inp.selected * stroke(length(p) - 1.03, 0.035);
    c = mix(c, vec3(1.0), sel);
    a = max(a, sel);
    if (a <= 0.003) return vec4(0.0);
    fragColor = vec4(c, a);
    return fragColor;
}
