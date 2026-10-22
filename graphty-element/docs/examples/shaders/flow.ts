/**
 * @file The shader guide's edge example (docs/guide/shaders.md): an edge look that runs dashes
 * of a glow color along each edge. The guide shows the "example" region verbatim;
 * test/simple/shaders-guide.test.ts holds the guide to it and
 * test/browser/shaders/shaders-guide.test.ts runs it. tsconfig.strict-consumer.json compiles it
 * against the published declarations.
 */

// #region example
import { defineShader, type Graphty } from "@graphty/graphty-element";

export async function flow(element: Graphty): Promise<void> {
    defineShader({
        id: "acme/flow",
        params: { glow: "#66ccff", speed: 1 },
        glsl: `vec4 shade(EdgeInput e) {
            float dash = step(0.5, fract(e.t * e.lengthPx / 16.0 - e.time * speed));
            return vec4(mix(e.color.rgb, glow, dash), e.color.a);
        }`,
    });

    await element.session.styles.add({
        name: "Flow",
        target: "edge",
        selector: { match: "everything" },
        set: { "edge.shaders": [{ shader: "acme/flow", params: { speed: 2 } }] },
    });
}
// #endregion example
