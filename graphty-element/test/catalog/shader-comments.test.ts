/**
 * What a shader body reads is judged with its comments taken out, in time linear in the body: a
 * body is a consumer's text, so many unclosed `/*` must not stall the page.
 */
import { assert, describe, it } from "vitest";

import { entryTargetOf, inferShaderReads, readsShaderTime } from "../../src/catalog/shaderGlsl";

describe("a shader body's comments", () => {
    it("are not read as code, line or block", () => {
        assert.isFalse(readsShaderTime("vec4 shade(NodeInput n) { // n.time\n return vec4(1.0); }"));
        assert.isFalse(readsShaderTime("vec4 shade(NodeInput n) { /* n.time */ return vec4(1.0); }"));
        assert.isTrue(readsShaderTime("vec4 shade(NodeInput n) { /* x */ return vec4(n.time); }"));
        assert.deepEqual(inferShaderReads("/* n.hovered */ vec4 shade(NodeInput n) { return n.color; }"), [
            "color",
            "opacity",
        ]);
        assert.strictEqual(
            entryTargetOf("// vec4 shade(EdgeInput e)\nvec4 shade(NodeInput n) { return n.color; }"),
            "node",
        );
    });

    it("leave an unclosed /* as code, and a line comment after it still out", () => {
        assert.isTrue(readsShaderTime("/* vec4 shade(NodeInput n) { return vec4(n.time); }"));
        assert.isFalse(readsShaderTime("/* a // n.time\n"));
    });

    it("take time linear in the body on many unclosed /*", () => {
        const body = `/*${"a/*".repeat(200_000)}`;
        // Counted work, not time: a quadratic scan of this body is 4e10 steps and never returns.
        assert.isFalse(readsShaderTime(body));
        assert.deepEqual(inferShaderReads(body), []);
        assert.isUndefined(entryTargetOf(body));
    });
});
