/**
 * Hidden edges skipping the join shader's math: the program a joined line is built with follows
 * the scene's switch at build time, and with the switch off it is the program it always was.
 * test/browser/edge-skip-hidden.test.ts draws it.
 */
import { ArcRotateCamera, NullEngine, Scene, ShaderMaterial, Vector3 } from "@babylonjs/core";
import { afterEach, assert, beforeEach, describe, it } from "vitest";

import { CustomLineRenderer, type JoinedLineOptions } from "../../src/meshes/CustomLineRenderer";
import { EDGE_JOIN_VERTEX_SHADER } from "../../src/meshes/edgeJoinShader";
import { batchUploadFrames } from "../../src/meshes/FrameRoster";

const SKIP = "#define EDGE_SKIP_HIDDEN";

describe("hidden edges skip the join shader", () => {
    let scene: Scene;

    beforeEach(() => {
        scene = new Scene(new NullEngine());
        scene.activeCamera = new ArcRotateCamera("camera", 0, 0, 10, Vector3.Zero(), scene);
    });

    afterEach(() => {
        scene.dispose();
    });

    function materialOf(options: Partial<JoinedLineOptions> = {}): ShaderMaterial {
        const mesh = CustomLineRenderer.createJoinedLineMesh({ width: 0.2, color: "#336699", ...options }, scene);
        assert.instanceOf(mesh.material, ShaderMaterial);
        return mesh.material;
    }

    it("the switch starts off in a new scene", () => {
        assert.isFalse(batchUploadFrames.skipHiddenEdges(scene).on);
    });

    const looks: { name: string; options: Partial<JoinedLineOptions> }[] = [
        { name: "plain", options: {} },
        { name: "widened", options: { widened: true } },
        { name: "pulled", options: { pulled: true } },
        { name: "world width", options: { worldWidth: true } },
    ];

    for (const { name, options } of looks) {
        it(`${name}: off builds today's program, on adds only the define`, () => {
            const off = materialOf(options);
            batchUploadFrames.skipHiddenEdges(scene).on = true;
            const on = materialOf(options);

            assert.notInclude(off.options.defines, SKIP);
            assert.include(on.options.defines, SKIP);
            assert.deepEqual(
                on.options.defines.filter((define) => define !== SKIP),
                off.options.defines,
            );
            assert.deepEqual(on.options.attributes, off.options.attributes, "same attributes");
            assert.deepEqual(on.options.uniforms, off.options.uniforms, "same uniforms");
        });
    }

    it("a batch built before the switch keeps its program", () => {
        const before = materialOf();
        batchUploadFrames.skipHiddenEdges(scene).on = true;
        materialOf();
        assert.notInclude(before.options.defines, SKIP);
    });

    it("the branch is compiled out unless the define is set", () => {
        const body = EDGE_JOIN_VERTEX_SHADER.slice(EDGE_JOIN_VERTEX_SHADER.indexOf("void main()"));
        const branch = /#ifdef EDGE_SKIP_HIDDEN\s+if \(pA == pB\) \{[^}]*return;\s*\}\s*#endif/;
        assert.match(body, branch, "an early return, wholly under the define");
        assert.strictEqual(body.replace(branch, "").indexOf("pA == pB"), -1, "nowhere else");
        assert.isAbove(body.search(branch), body.indexOf("pullEdge();"), "after a pulled piece is read");
    });
});
