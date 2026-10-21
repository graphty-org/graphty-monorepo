/**
 * @file The GLSL body of the `icon-sticker` preset (design/rendering/shader-styles.md section
 * 7.2), ported from the shader lab's icon sticker.
 *
 * A round die-cut sticker: a white vinyl border, a body in the node's color with a soft top light,
 * one of the twelve `iconSdf` icons in cream, and a soft drop shadow so it sits on the canvas. The
 * owner's changes from the lab: no peel and no corner flip, and the static gloss line across the
 * body is replaced by `finish` -- none, shiny (a soft glare and a gloss highlight sliding across)
 * or holographic (rainbow foil that shifts with the angle and time, with sparkles). `foil` is the
 * finish's strength.
 *
 * Sparkles change at most 3 times a second, so the preset never flashes faster than that.
 */

/** The body: `shade` and its helpers. */
export const BODY = `// Sticker: a die-cut vinyl sticker with an icon and an optional shiny or holographic finish.
vec4 shade(NodeInput n) {
    vec2 p = n.uv;
    float d = length(p) - 0.92;
    float cut = fillAA(d);
    // A soft drop shadow down and to the right, outside the die cut.
    float shadow = (1.0 - smoothstep(-0.02, 0.1, length(p - vec2(0.03, -0.05)) - 0.92)) * 0.28;
    float a = max(cut, shadow);
    if (a <= 0.003) {
        return vec4(0.0);
    }

    float body = fillAA(d + 0.13);
    vec3 c = mix(borderColor, n.color.rgb * (0.85 + 0.2 * p.y), body);
    float mark = fillAA(iconSdf(icon, p * 1.1));
    c = mix(c, vec3(1.0, 0.99, 0.96), mark);

    if (finish == 1) {
        // Shiny: a soft glare at the top left and a gloss highlight sliding across.
        vec2 g = p - vec2(-0.38, 0.42);
        float glare = exp(-dot(g, g) * 7.0) * 0.3;
        float along = p.x * 0.6 + p.y;
        float at = fract(n.time * finishSpeed * 0.5 + n.seed) * 3.6 - 1.8;
        float s = (along - at) * 7.0;
        float gloss = exp(-s * s) * 0.5;
        c += vec3(1.0) * (glare + gloss) * foil;
    } else if (finish == 2) {
        // Holographic: rainbow foil over the body that shifts with the angle and time.
        float t = dot(p, vec2(0.7, 0.7)) * 1.6 + n.time * finishSpeed * 0.5 + n.seed;
        vec3 holo = palette(t, vec3(0.6), vec3(0.4), vec3(1.0), vec3(0.0, 0.33, 0.67));
        float onFoil = foil * 0.6 * (1.0 - 0.5 * mark);
        c = mix(c, c * 0.55 + holo * 0.55, onFoil);
        float sparkle = step(0.985, hash12(floor(p * 40.0) + floor(n.time * 3.0) + n.seed * 61.0));
        c += vec3(sparkle * foil);
    }

    // Outside the die cut only the shadow is drawn.
    return vec4(c * cut, a);
}
`;
