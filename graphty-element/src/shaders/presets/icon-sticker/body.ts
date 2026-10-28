/**
 * @file The GLSL body of the `icon-sticker` preset (design/rendering/shader-styles.md section
 * 7.2, design/rendering/shader-studio/decisions.md 5.1), ported from the shader lab's icon sticker.
 *
 * A round die-cut sticker: a white vinyl border, a body in the node's color with a soft top light,
 * one of six `iconSdf` icons in cream (filled, or as an outline), and a soft drop shadow so it sits
 * on the canvas. `finish` is the foil: holographic (a diffraction grating: the hue comes from the
 * reflected view direction against the light, along a grating direction set by the seed, with a
 * broad sheen where the reflection meets the light), shiny (a soft glare and a gloss line where the
 * card catches the light) or none. `foil` is the foil's strength; with no foil it has nothing to
 * act on.
 *
 * Nothing reads the time: every card's normal is tilted by its place in the view and its own seed,
 * so the finish differs from card to card and changes only as the camera or the layout moves.
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
    float mark = fillAA(iconSdf(icon + (outline ? 6 : 0), p * 1.1));
    c = mix(c, vec3(1.0, 0.99, 0.96), mark);

    // The view reflected off the tilted card, and how squarely it meets the light.
    vec3 rv = reflect(n.viewDir, n.normal);
    float meet = max(dot(rv, lightDir), 0.0);
    if (finish == 1) {
        // Shiny: a soft glare at the top left and a gloss line where the card catches the light.
        vec2 g = p - vec2(-0.38, 0.42);
        float glare = exp(-dot(g, g) * 7.0) * (0.15 + 0.3 * meet);
        float s = (p.x * 0.6 + p.y - (rv.x * 0.6 + rv.y) * 2.4) * 7.0;
        float gloss = exp(-s * s) * 0.5;
        c += vec3(1.0) * (glare + gloss) * foil;
    } else if (finish == 2) {
        // Holographic: a grating whose hue follows the reflection against the light, and a sheen.
        float ga = n.seed * 6.2831853;
        vec2 grating = vec2(cos(ga), sin(ga));
        float t = dot(rv.xy - lightDir.xy, grating) * 2.2 + dot(p, grating) * 0.6;
        vec3 holo = palette(t, vec3(0.6), vec3(0.4), vec3(1.0), vec3(0.0, 0.33, 0.67));
        float onFoil = foil * 0.6 * (1.0 - 0.5 * mark);
        c = mix(c, c * 0.55 + holo * 0.55, onFoil);
        c += vec3(1.0) * pow(meet, 6.0) * 0.35 * foil;
    }

    // Outside the die cut only the shadow is drawn.
    return vec4(c * cut, a);
}
`;
