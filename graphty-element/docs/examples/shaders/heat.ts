/**
 * @file The shader guide's first example (docs/guide/shaders.md): a node look with two color
 * parameters, and a layer that draws it and sets one of them. The guide shows the "example" region
 * verbatim; test/simple/shaders-guide.test.ts holds the guide to it and
 * test/browser/shaders/shaders-guide.test.ts runs it. It imports only the published package, and
 * tsconfig.strict-consumer.json compiles it against the published declarations.
 */

// #region example
import { defineShader, type Graphty } from "@graphty/graphty-element";

export async function heat(element: Graphty): Promise<void> {
    defineShader({
        id: "acme/heat",
        params: { hot: "#ff5500", cold: "#2255ff" },
        glsl: `vec4 shade(NodeInput n) {
            float lit = 0.4 + 0.6 * max(dot(n.normal, lightDir), 0.0);
            return vec4(mix(cold, hot, n.uv.y * 0.5 + 0.5) * lit, 1.0);
        }`,
    });

    await element.session.styles.add({
        name: "Heat",
        target: "node",
        selector: { match: "everything" },
        set: { "node.shaders": [{ shader: "acme/heat", params: { hot: "#ff0000" } }] },
    });
}
// #endregion example
