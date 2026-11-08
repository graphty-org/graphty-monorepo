/**
 * Fade by age in a joined line batch: with the scene's switch off a line keeps today's program and
 * buffers; on, each slot carries its edge's age in a buffer of its own, a window change writes only
 * the uniform, and new ages rewrite every slot. test/browser/edge-age-fade.test.ts draws it.
 */
import { ArcRotateCamera, NullEngine, Scene, type ShaderMaterial, Vector3 } from "@babylonjs/core";
import { afterEach, assert, beforeEach, describe, it, vi } from "vitest";

import { CustomLineRenderer, type JoinedLineOptions } from "../../src/meshes/CustomLineRenderer";
import { EDGE_JOIN_VERTEX_SHADER } from "../../src/meshes/edgeJoinShader";
import { EdgeLineBatch } from "../../src/meshes/EdgeLineBatch";
import { batchUploadFrames } from "../../src/meshes/FrameRoster";

const AGED = "#define EDGE_AGED";
const SRC = new Vector3(0, 0, 0);
const DST = new Vector3(1, 0, 0);

describe("fade by age in a line batch", () => {
    let scene: Scene;
    /** Every upload the engine was handed, in floats. */
    let uploads: number[];

    beforeEach(() => {
        scene = new Scene(new NullEngine());
        scene.activeCamera = new ArcRotateCamera("camera", 0, 0, 10, Vector3.Zero(), scene);
        uploads = [];
        vi.spyOn(scene.getEngine(), "updateDynamicVertexBuffer").mockImplementation((_buffer, data, _at, length) => {
            uploads.push((length ?? (data as Float32Array).byteLength) / Float32Array.BYTES_PER_ELEMENT);
        });
    });

    afterEach(() => {
        vi.restoreAllMocks();
        scene.dispose();
    });

    /**
     * A batch of three edges, rows 0 to 2.
     * @param options - The line's look.
     * @returns The batch and its material.
     */
    function lines(options: Partial<JoinedLineOptions> = {}): { batch: EdgeLineBatch; material: ShaderMaterial } {
        const mesh = CustomLineRenderer.createJoinedLineMesh({ width: 0.2, color: "#336699", ...options }, scene);
        const batch = new EdgeLineBatch(mesh, scene);
        for (let row = 0; row < 3; row++) {
            batch.place(batch.acquire({ index: row }), SRC, DST);
        }

        return { batch, material: mesh.material as ShaderMaterial };
    }

    /**
     * What one frame uploaded.
     * @returns Each upload's floats.
     */
    function frame(): number[] {
        scene.render();
        return uploads.splice(0);
    }

    /**
     * Turn the scene's fade by age on, with ages for rows 0 to 2.
     * @returns Settles once a batch has switched its program.
     */
    function turnOn(): Promise<void> {
        const state = batchUploadFrames.edgeAges(scene);
        const switched = new Promise<void>((resolve) => {
            state.switched = resolve;
        });
        state.track = true;
        state.on = true;
        state.ages = new Float32Array([0, 0.5, 1]);
        state.window.splice(0, 3, 0, 1, 0.2);
        return switched;
    }

    it("is off in a new scene, and a line keeps its program and buffers", () => {
        assert.isFalse(batchUploadFrames.edgeAges(scene).on);
        const { batch, material } = lines();
        frame();
        assert.notInclude(material.options.defines, AGED);
        assert.notInclude(material.options.attributes, "edgeAge");
        assert.notInclude(material.options.uniforms, "edgeAgeWindow");
        assert.isFalse(material.needAlphaBlending());
        assert.isFalse(batch.mesh.isVerticesDataPresent("edgeAge"));
    });

    it("records no edge per slot while the timeline is off", () => {
        assert.isFalse(batchUploadFrames.edgeAges(scene).track);
        const { batch } = lines();
        assert.deepEqual((batch as unknown as { owners: unknown[] }).owners, []);
    });

    it("the age math is compiled out unless the define is set", () => {
        const body = EDGE_JOIN_VERTEX_SHADER.slice(EDGE_JOIN_VERTEX_SHADER.indexOf("void main()"));
        assert.strictEqual(body.replace(/#ifdef EDGE_AGED[\s\S]*?#endif/, "").indexOf("edgeAge"), -1);
    });

    it("a batch built while on starts aged", () => {
        void turnOn();
        const { batch, material } = lines();
        assert.include(material.options.defines, AGED);
        assert.include(material.options.attributes, "edgeAge");
        assert.include(material.options.uniforms, "edgeAgeWindow");
        assert.isTrue(material.needAlphaBlending(), "a faded line is drawn in the transparent pass");
        assert.isTrue(batch.mesh.isVerticesDataPresent("edgeAge"));
        frame();
    });

    it("an opaque line never ages", () => {
        void turnOn();
        const { batch, material } = lines({ opaque: true });
        frame();
        assert.notInclude(material.options.defines, AGED);
        assert.isFalse(batch.mesh.isVerticesDataPresent("edgeAge"));
    });

    it("switches on after its program compiled, and back to exactly today's program", async () => {
        batchUploadFrames.edgeAges(scene).track = true;
        const { material } = lines({ widened: true });
        frame();
        const before = {
            defines: [...material.options.defines],
            attributes: [...material.options.attributes],
            uniforms: [...material.options.uniforms],
        };

        const switched = turnOn();
        assert.deepEqual(frame(), [3], "the ages go up at once, the program has not switched yet");
        assert.notInclude(material.options.defines, AGED);
        await switched;
        assert.include(material.options.defines, AGED);

        const state = batchUploadFrames.edgeAges(scene);
        const off = new Promise<void>((resolve) => {
            state.switched = resolve;
        });
        state.on = false;
        frame();
        await off;
        assert.deepEqual(
            {
                defines: material.options.defines,
                attributes: material.options.attributes,
                uniforms: material.options.uniforms,
            },
            before,
        );
        assert.isFalse(material.needAlphaBlending());
    });

    it("a step writes the uniform and no slot; new ages rewrite every slot's age", () => {
        void turnOn();
        const { batch } = lines();
        frame();

        const state = batchUploadFrames.edgeAges(scene);
        state.window[0] = 0.25;
        state.window[1] = 0.75;
        assert.deepEqual(frame(), [], "a moved window uploads nothing");

        state.ages = new Float32Array([1, 1, 1]);
        assert.deepEqual(frame(), [batch.drawnCount], "every slot's age, once");
    });
});
