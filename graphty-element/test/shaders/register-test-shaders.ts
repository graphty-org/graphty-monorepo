/**
 * @file A handful of small registered shaders the shader tests name, one or more of each kind.
 */

import { clearRegisteredShadersForTesting } from "../../src/catalog/shaderRegistry";
import { defineShader } from "../../src/simple/defineShader";

/** A body for a node kind that reads the color beneath. */
const NODE_COLOR = "vec4 shade(NodeInput n) { return n.color; }";

/** A body for a node kind that reads only the size. */
const NODE_SIZE = "vec4 shade(NodeInput n) { return vec4(vec3(n.size), 1.0); }";

/** Register them. */
export function registerTestShaders(): void {
    defineShader({
        id: "acme/marble",
        params: {
            twist: { type: "number", default: 2.2, min: 0, max: 8, primary: true },
            spin: { type: "number", default: 0.25, min: 0, max: 2, varies: true },
            glassTint: "#cfe6ff",
        },
        motion: { loop: { speedParam: "spin" } },
        glsl: NODE_COLOR,
    });
    defineShader({
        id: "acme/lantern",
        params: { speed: { type: "number", default: 1, min: 0, max: 4 } },
        glsl: NODE_COLOR,
    });
    defineShader({
        id: "acme/sticker",
        place: "replace",
        params: { icon: { type: "integer", default: 0, min: 0, max: 11, varies: true } },
        glsl: NODE_COLOR,
    });
    defineShader({ id: "acme/mandala", place: "replace", glsl: NODE_SIZE });
    for (const name of ["aura", "ring", "orbit", "spark", "flash"]) {
        defineShader({
            id: `acme/${name}`,
            place: "around",
            params: { intensity: { type: "number", default: 1, min: 0, max: 2, varies: true } },
            glsl: NODE_COLOR,
        });
    }

    defineShader({
        id: "acme/hull",
        params: { outline: 2.5 },
        glsl: "vec4 shade(GroupInput g) { return g.color * g.field; }",
    });
    defineShader({ id: "acme/fiber", glsl: "vec4 shade(EdgeInput e) { return e.color; }" });
}

/** Forget them. */
export function clearTestShaders(): void {
    clearRegisteredShadersForTesting();
}
