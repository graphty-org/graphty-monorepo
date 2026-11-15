/**
 * @file The GLSL body of the `mandala` preset (design/rendering/shader-styles.md section 7.2),
 * ported from the shader lab's kaleidoscope mandala.
 *
 * Mirror folds (5 plus `folds`), a ring of glowing petals and a smaller inner ring, fbm filigree
 * and banding in a cosine palette shifted by `hueShift`, ink lines between the wedges, a bright
 * center jewel and a gold rim (`rim`). Each node turns its own way at `spin`, and the filigree
 * flows at `flow`. The lab read the fold count from degree and the hue from community; here both
 * are parameters a layer binds per node. The lab's hover glow and selection ring are the
 * element's own glow and ring, drawn from the radius.
 */

/** The body: `shade` and its helpers. */
export const BODY = `// Mandala: a turning kaleidoscope with petals, filigree and a gold rim.
vec4 shade(NodeInput n) {
    vec2 p = n.uv;
    float r = length(p);
    float a = fillAA(r - 0.96);
    if (a <= 0.003) {
        return vec4(0.0);
    }

    float wedges = float(5 + folds);
    float turn = n.seed > 0.5 ? 1.0 : -1.0;
    float ang = atan(p.y, p.x) + n.time * spin * turn;
    float wedge = 6.2831853 / wedges;
    ang = abs(mod(ang, wedge) - wedge * 0.5);
    vec2 q = r * vec2(cos(ang), sin(ang));

    float seed = n.seed * 31.0;
    // Petals: a ring of circles in the wedge and a smaller inner ring, over fbm filigree.
    float petal = length(q - vec2(0.62, 0.0)) - (0.16 + 0.05 * sin(n.time * 1.3 + seed));
    float inner = length(q - vec2(0.33, 0.0)) - 0.1;
    float fil = fbm(q * detail + vec2(seed, n.time * flow));
    float bands = sin(r * 22.0 - n.time * 2.0 * flow + fil * 6.0);

    vec3 pa = vec3(0.55, 0.5, 0.5);
    vec3 pb = vec3(0.45, 0.45, 0.5);
    vec3 pc = vec3(1.0);
    vec3 pd = vec3(0.0, 0.15, 0.3) + n.seed * 0.08 + hueShift;
    vec3 c = palette(fil * 1.4 + r * 0.7 - n.time * 0.05, pa, pb, pc, pd);
    c *= 0.55 + 0.45 * smoothstep(-0.3, 1.0, bands);
    // Petals as glowing outlines over soft fills.
    vec3 petalColor = palette(0.3 + r, pa, pb, pc, pd + 0.25);
    c = mix(c, petalColor, fillAA(petal) * 0.55);
    c += petalColor * strokeAA(petal, 0.012) * 1.3;
    c = mix(c, vec3(1.0, 0.95, 0.8), strokeAA(inner, 0.01));
    // Ink lines between the wedges.
    c *= 0.6 + 0.4 * smoothstep(0.0, 0.04, ang * r);
    // A bright center jewel and a gold rim.
    c += vec3(1.0, 0.9, 0.7) * exp(-r * 9.0) * 1.2;
    c = mix(c, vec3(1.0, 0.82, 0.45), rim * strokeAA(r - 0.9, 0.035));
    c *= mix(1.0, 0.75, smoothstep(0.7, 0.96, r));
    return vec4(c, a);
}
`;
