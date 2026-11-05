/**
 * @file The GLSL body of the `metaball-hull` preset (design/rendering/shader-styles.md section
 * 7.5), ported from the shader lab's metaball community hulls.
 *
 * The element splats each member's kernel into the group's field (`GroupInput.field`), so
 * nearby members melt into one hull and outliers bud off as droplets. The body turns the field
 * and its screen gradient into a signed distance to the hull, in canvas pixels, and draws one of
 * three looks in the group's mean color: translucent goo with a bright rim and a glint, an
 * iridescent soap-film membrane, or a clean contour like a hand-drawn Euler diagram.
 *
 * With the owner's change: `breathe` defaults to 0, so a hull is still unless asked to move. A
 * breathing hull swells and shrinks as a whole (the lab varied each member's radius on its own).
 * ponytail: no seam where two groups press together, since a group reads only its own field;
 * give GroupInput the strongest other group's field if seams are wanted.
 */

/** The body: `shade` and its helpers. */
export const BODY = `// Hull: a metaball field around each group, as goo, membrane or outline.
vec4 shade(GroupInput g) {
    float v = g.field;
    vec3 col = g.color.rgb;
    // Breathing swells and shrinks the hull: a lower level is a fatter hull.
    float level = threshold * (1.0 - 0.25 * breathe * sin(g.time * 1.3 + g.group * 2.1));
    // Signed distance to the hull in canvas pixels, from the field and its screen gradient.
    float slope = max(length(g.fieldGradient), 1e-5);
    float sd = (level - v) / slope;
    float inside = clamp(0.5 - sd, 0.0, 1.0);
    // The field surface's normal, for the shading (z toward the reader).
    vec3 n = normalize(vec3(-g.fieldGradient * 15.0, 1.0));
    float rim = 1.0 - smoothstep(0.0, 18.0, -sd);
    vec3 rgb = vec3(0.0);
    float a = 0.0;
    if (look == 0) {
        // Goo: translucent jelly, brighter toward the rim, with a specular glint.
        vec3 body = col * (0.35 + 0.45 * rim) + pow(max(dot(n, normalize(vec3(-0.5, 0.6, 0.8))), 0.0), 24.0) * 0.6;
        a = inside * mix(fillOpacity, 1.0, rim * 0.6);
        rgb = body * a;
        float line = inside * (1.0 - smoothstep(outline - 1.0, outline, -sd)) * step(0.5, outline);
        rgb = mix(rgb, min(col * 1.25 + 0.1, vec3(1.0)), line);
        a = mix(a, 1.0, line);
    } else if (look == 1) {
        // Membrane: soap film whose interference colors swirl with the surface's slope.
        float fres = pow(max(1.0 - n.z, 0.0), 0.6);
        // log keeps the bands few where many members overlap and the field runs high.
        float film = log(1.0 + v) * 2.0 + n.x * 2.0 + n.y * 1.5 + g.time * 0.08 * breathe
            + noise(g.uv * 2.4 + g.time * 0.1 * breathe) * 0.6;
        vec3 irid = rainbow(film);
        vec3 body = mix(col * 0.5, irid, 0.35 + 0.65 * fres) * (0.35 + 0.9 * rim);
        body += pow(max(dot(n, normalize(vec3(-0.4, 0.5, 0.9))), 0.0), 40.0) * 0.9;
        a = inside * clamp(fillOpacity + 0.5 * rim, 0.0, 1.0);
        rgb = min(body, vec3(1.0)) * a;
        float line = inside * (1.0 - smoothstep(outline - 1.0, outline, -sd)) * step(0.5, outline);
        rgb = mix(rgb, min(irid * 1.3, vec3(1.0)), line);
        a = mix(a, 1.0, line);
    } else {
        // Outline: a faint wash of the group's color inside and a clean contour on the hull.
        float width = max(outline, 1.0);
        float line = 1.0 - smoothstep(width - 1.0, width, abs(sd));
        rgb = col;
        a = max(line, 0.22 * inside * fillOpacity * (1.0 - line));
        return vec4(rgb, a);
    }

    // rgb is premultiplied by the hull's coverage; returned straight.
    return vec4(rgb / max(a, 1e-4), a);
}
`;
