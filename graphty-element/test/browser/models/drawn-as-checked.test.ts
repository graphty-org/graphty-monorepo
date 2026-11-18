/**
 * @file A model's check counts what Babylon.js and OpenUSD then draw: an FBX file's curves, drawn
 * as one tube per polyline, and a USD stage's uses of a mesh, through references into a package
 * (`@pkg.usdz[geo.usda]@`), a point instancer and transforms, with the size of the whole as drawn.
 */

import { Engine } from "@babylonjs/core/Engines/engine.js";
import type { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh.js";
import type { Mesh } from "@babylonjs/core/Meshes/mesh.js";
import { Scene } from "@babylonjs/core/scene.js";
import { checkModelFiles, DEFAULT_MODEL_LIMITS } from "babylonjs-models/files";
import { afterEach, assert, describe, it } from "vitest";

import { loadModel } from "../../../src/models/loadModel";

const FIXTURES = import.meta.glob<string>(
    [
        "../../../../babylonjs-models/test/fixtures/variants/fbx-curves/*",
        "../../../../babylonjs-models/test/fixtures/variants/usd-composed/*",
    ],
    { query: "?url", import: "default", eager: true },
);

const cleanups: (() => void)[] = [];

afterEach(() => {
    for (const cleanup of cleanups.splice(0).reverse()) {
        cleanup();
    }
});

/**
 * A WebGL engine and scene on a canvas in the page.
 * @returns The scene.
 */
function makeScene(): Scene {
    const canvas = document.createElement("canvas");
    document.body.appendChild(canvas);
    const engine = new Engine(canvas, false);
    const scene = new Scene(engine);
    cleanups.push(() => {
        engine.dispose();
        canvas.remove();
    });
    return scene;
}

/**
 * Some fixture files, as a set.
 * @param folder - The variant folder.
 * @param names - The files.
 * @returns The set.
 */
async function files(folder: string, ...names: string[]): Promise<Map<string, Uint8Array>> {
    const set = new Map<string, Uint8Array>();
    for (const name of names) {
        const url = FIXTURES[`../../../../babylonjs-models/test/fixtures/variants/${folder}/${name}`];
        set.set(name, new Uint8Array(await (await fetch(url)).arrayBuffer()));
    }
    return set;
}

/**
 * What a loaded model draws: its meshes with triangles (each thin instance one more), their
 * triangles, and the size of the box around them in the world.
 * @param meshes - The container's meshes.
 * @returns The counts and size.
 */
function drawnOf(meshes: AbstractMesh[]): { meshes: number; triangles: number; size: number[] } {
    const drawn = meshes.filter((mesh) => (mesh.getIndices()?.length ?? 0) > 0) as Mesh[];
    const min = [Infinity, Infinity, Infinity];
    const max = [-Infinity, -Infinity, -Infinity];
    let count = 0;
    let triangles = 0;
    for (const mesh of drawn) {
        const uses = Math.max(1, mesh.thinInstanceCount);
        count += uses;
        triangles += ((mesh.getIndices()?.length ?? 0) / 3) * uses;
        if (mesh.thinInstanceCount > 0) {
            mesh.thinInstanceRefreshBoundingInfo(false);
        }
        mesh.computeWorldMatrix(true);
        const box = mesh.getBoundingInfo().boundingBox;
        for (let a = 0; a < 3; a++) {
            min[a] = Math.min(min[a], box.minimumWorld.asArray()[a]);
            max[a] = Math.max(max[a], box.maximumWorld.asArray()[a]);
        }
    }
    return { meshes: count, triangles, size: [0, 1, 2].map((a) => max[a] - min[a]) };
}

/**
 * Check a set, then load it, and say what each found.
 * @param set - The set.
 * @param main - The main file.
 * @returns The check's counts and size, and what was drawn.
 */
async function checkedAndDrawn(set: Map<string, Uint8Array>, main: string) {
    const { summary, format } = await checkModelFiles(set, { main }, DEFAULT_MODEL_LIMITS);
    const scene = makeScene();
    const container = await loadModel(scene, set, main, format);
    cleanups.push(() => {
        container.dispose();
    });
    const { bounds } = summary;
    return {
        checked: {
            meshes: summary.meshes,
            triangles: summary.triangles,
            size: bounds === undefined ? [] : [0, 1, 2].map((a) => bounds.max[a] - bounds.min[a]),
        },
        drawn: drawnOf(container.meshes),
        scale: summary.metersPerUnit ?? 1,
    };
}

describe("a model's check counts what is drawn", () => {
    it.each(["lines-many.fbx", "lines-long.fbx", "nurbs.fbx"])(
        "an FBX file's curves, one tube per polyline: %s",
        async (name) => {
            const { checked, drawn } = await checkedAndDrawn(await files("fbx-curves", name), name);
            assert.isAbove(drawn.triangles, 0);
            assert.deepStrictEqual([checked.meshes, checked.triangles], [drawn.meshes, drawn.triangles]);
        },
    );

    it("an FBX curve's tube stays round when its node is scaled unevenly", async () => {
        // The curve, laid flat in z = 0; a node scale of 1, 1, 10 must not stretch the tube's depth.
        const set = await files("fbx-curves", "nurbs.fbx");
        const text = new TextDecoder()
            .decode(set.get("nurbs.fbx"))
            .replace("2,0,1,1", "2,0,0,1")
            .replace(
                "Version: 232",
                'Version: 232\n\t\tProperties70:  {\n\t\t\tP: "Lcl Scaling", "Lcl Scaling", "", "A",1,1,10\n\t\t}',
            );
        set.set("nurbs.fbx", new TextEncoder().encode(text));
        const { drawn } = await checkedAndDrawn(set, "nurbs.fbx");
        // The tube is 1/100 of the curve's extent across, so that is its thinnest side.
        const thinnest = Math.min(...drawn.size) / Math.hypot(...drawn.size);
        assert.approximately(thinnest, 1 / 100, 1 / 1000);
    });

    it.each([
        ["packaged.usda", "pkg.usdz"],
        ["instancer.usdc"],
        ["instancer.usda"],
        ["internal.usdc"],
        ["external.usda", "geo.usdc"],
    ])("a USD stage's uses and its size as drawn: %s", async (main, ...rest) => {
        const { checked, drawn, scale } = await checkedAndDrawn(await files("usd-composed", main, ...rest), main);
        assert.deepStrictEqual([checked.meshes, checked.triangles], [drawn.meshes, drawn.triangles]);
        // The loader draws the stage in meters (the size is in the stage's own units); a Z-up stage turned Y up.
        const sorted = (size: number[], by: number) =>
            size.map((v) => Math.round(v * by * 1000) / 1000).sort((a, b) => a - b);
        assert.deepStrictEqual(sorted(checked.size, scale), sorted(drawn.size, 1));
    });

    it("a USD prim that writes its own type over the Mesh it references draws no faces", async () => {
        const set = await files("usd-composed", "packaged.usda", "pkg.usdz");
        const text = new TextDecoder().decode(set.get("packaged.usda")).replaceAll('def "C', 'def Xform "C');
        set.set("packaged.usda", new TextEncoder().encode(text));
        const { checked, drawn } = await checkedAndDrawn(set, "packaged.usda");
        assert.deepStrictEqual([checked.meshes, checked.triangles], [0, 0]);
        assert.deepStrictEqual([drawn.meshes, drawn.triangles], [0, 0]);
    });
});
