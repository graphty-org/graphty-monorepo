/**
 * @file The GLSL body of the `comet-tracers` preset (design/rendering/shader-styles.md section
 * 7.4), ported from the shader lab's comet tracers.
 *
 * White-hot heads with long fading tails race along each edge, each edge in its own phase.
 * Spacing and tail length are in screen pixels, so comets look the same on a short and a long
 * edge. `speed` may be negative: the comets then run from target to source, tails behind them.
 * The tail takes the line's color (brightened, so a dark line still carries a visible comet) or
 * `tailColor`; the head is `headColor`. Edges touching a selected or hovered node burn brighter.
 *
 * The lab drew the comets added onto a dark sky. Here they are blended over, so they
 * read on a light canvas too; the shared bloom pass makes crossing heads flare.
 */

export const BODY = `// Comet tracers: heads and fading tails racing along each edge.
vec4 shade(EdgeInput e) {
    float x = e.t * e.lengthPx;
    float dir = speed < 0.0 ? -1.0 : 1.0;
    float headPos = e.time * speed * 120.0 + e.seed * spacing * 7.0;
    // Pixels behind the nearest head: 0 at the head, growing along the tail.
    float behind = mod((headPos - x) * dir, spacing);
    float trail = exp(-behind / tail);
    float head = exp(-behind / 2.5);
    // The tail narrows toward its end; the head is round.
    float across = exp(-e.side * e.side * mix(1.2, 6.0, clamp(behind / (tail * 3.0), 0.0, 1.0)));
    vec3 lineLight = e.color.rgb / max(max(e.color.r, max(e.color.g, e.color.b)), 0.3);
    vec3 tc = useEdgeColor ? lineLight : tailColor;
    float tailA = clamp(trail * across * 1.2, 0.0, 1.0);
    float headA = clamp(head * exp(-e.side * e.side * 1.5) * 2.0, 0.0, 1.0);
    float lit = max(max(e.selected, e.hovered), max(e.sourceSelected, e.targetSelected));
    float gain = intensity * (1.0 + 1.2 * lit);
    vec3 rgb = (tc * tailA * (1.0 - headA) + headColor * headA * (1.0 + 0.5 * bloom)) * gain;
    float a = clamp((1.0 - (1.0 - tailA) * (1.0 - headA)) * intensity, 0.0, 1.0);
    // rgb is premultiplied by the comets' coverage; returned straight.
    return vec4(rgb / max(a, 1e-4), a);
}
`;
