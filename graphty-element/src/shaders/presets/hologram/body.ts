/**
 * @file The GLSL body of the `hologram` preset (design/rendering/shader-styles.md section 7.1),
 * ported from the shader lab's hologram ghost.
 *
 * A translucent wireframe globe that turns on its axis, crawling scanlines, a sweep band, a
 * bright Fresnel rim, flicker and an occasional glitch that tears the grid sideways. The lab
 * printed a hovered ghost solid; here the hologram itself prints in, bottom to top behind a bright
 * print head, over the first 0.9 s a node carries it (`sinceEntered`), and fades over 0.6 s when
 * it stops (`sinceExited`). The globe's grid is fixed to the node's own sphere (`local`), so it
 * reads the same on every shape.
 *
 * The flicker's dips and the glitch bursts fall on a 2.5 Hz tick, at most one each per tick, so
 * the preset never flashes more than 3 times a second at any setting.
 */

/** The body: `shade` and its helpers. */
export const BODY = `// Hologram: a translucent wireframe globe with scanlines, a rim, flicker and glitch.
vec4 shade(NodeInput n) {
    // Printed in from the bottom while the entrance plays, faded while the exit plays.
    float printed = printTime / 0.9;
    float fade = 1.0 - fadeTime / 0.6;
    float y01 = n.uv.y * 0.5 + 0.5;
    float shown = printed >= 1.0 ? 1.0 : step(y01, printed);
    if (shown * fade <= 0.0) {
        return vec4(0.0);
    }

    float id = n.seed * 97.0;
    float tick = floor(n.time * 2.5);
    float early = step(fract(n.time * 2.5), 0.25);
    float burst = step(1.0 - glitch, hash12(vec2(tick, id))) * early;
    float facing = clamp(-n.normal.z, 0.0, 1.0);
    float fres = pow(1.0 - facing, 2.2);

    // The wireframe globe, fixed to the node and turning on its axis; a glitch tears rows sideways.
    vec3 dir = normalize(n.local + vec3(0.0, 1e-4, 0.0));
    float row = floor(n.uv.y * 5.0 + hash11(tick) * 4.0);
    float tear = burst * (hash12(vec2(row, tick + id)) - 0.5) * 1.4;
    float lon = atan(dir.x, dir.z) + n.time * 0.8 + id + tear;
    float lat = asin(clamp(dir.y, -1.0, 1.0));
    float lines = float(gridLines);
    float gx = abs(fract(lon / 6.2831853 * lines) - 0.5);
    float gy = abs(fract(lat / 3.1415927 * lines * 0.5) - 0.5);
    float lw = 0.06 + 0.02 * lines / 8.0;
    float grid = min(smoothstep(0.5 - lw, 0.5, gx) + smoothstep(0.5 - lw, 0.5, gy), 1.0);
    grid *= 0.35 + 0.65 * facing;

    // Scanlines crawl upward; a brighter sweep band passes now and then.
    float scan = 0.5 + 0.5 * sin(n.uv.y * scanDensity * 4.0 - n.time * 8.0);
    float sw = (fract(n.uv.y * 0.15 - n.time * 0.35 + n.seed) - 0.5) * 12.0;
    float sweep = exp(-sw * sw);

    // Flicker: at most one dip per tick, and a slight shimmer too small to read as a flash.
    float dip = step(0.8, hash12(vec2(tick, id + 3.0))) * step(fract(n.time * 2.5), 0.3);
    float fl = 1.0 - flicker * (0.3 * dip + 0.04 * (0.5 + 0.5 * sin(n.time * 13.0 + id)));

    vec3 tint = mix(holoColor, n.color.rgb, 0.2);
    vec3 col = tint * (0.45 + 1.2 * fres + 0.3 * scan + 0.7 * grid + 0.6 * sweep);
    col += vec3(1.0) * burst * 0.3;
    // The print head, while it materializes.
    col += vec3(0.8, 1.0, 1.0) * 3.0 * exp(-abs(y01 - printed) * 60.0) * step(printed, 0.999);
    col *= fl;
    // Light, not paint: the dark between the lines is see-through, the lines and the rim glow.
    float glow = clamp(max(col.r, max(col.g, col.b)), 0.0, 1.0);
    return vec4(col, (0.25 + 0.7 * glow) * shown * fade * n.color.a);
}
`;
