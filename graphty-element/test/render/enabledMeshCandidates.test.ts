import { Mesh, NullEngine, Scene } from "@babylonjs/core";
import { afterAll, afterEach, assert, describe, test } from "vitest";

import { drawOnlyEnabledMeshes } from "../../src/render/enabledMeshCandidates";

/**
 * The candidate list Babylon walks to choose what is drawn holds only the meshes switched on, in
 * the scene's order, and follows a mesh switched on or off without being told (#6040).
 */
describe("drawOnlyEnabledMeshes", () => {
    const engine = new NullEngine();
    let scene: Scene | null = null;

    afterEach(() => {
        scene?.dispose();
        scene = null;
    });

    afterAll(() => {
        engine.dispose();
    });

    const names = (on: Scene): string[] => {
        const list = on.getActiveMeshCandidates();
        return Array.from({ length: list.length }, (_, i) => list.data[i].name);
    };

    test("skips disabled meshes and keeps the scene's order", () => {
        scene = new Scene(engine);
        const [a, b, c, d] = ["a", "b", "c", "d"].map((name) => new Mesh(name, scene));
        drawOnlyEnabledMeshes(scene);
        b.setEnabled(false);
        d.setEnabled(false);
        assert.deepEqual(names(scene), ["a", "c"]);

        b.setEnabled(true);
        a.setEnabled(false);
        assert.deepEqual(names(scene), ["b", "c"]);

        d.setEnabled(true);
        c.dispose();
        assert.deepEqual(names(scene), ["b", "d"]);
    });

    test("leaves an enabled mesh under a disabled parent for Babylon to skip", () => {
        scene = new Scene(engine);
        const parent = new Mesh("parent", scene);
        const child = new Mesh("child", scene);
        child.parent = parent;
        drawOnlyEnabledMeshes(scene);
        parent.setEnabled(false);
        assert.deepEqual(names(scene), ["child"]);
    });
});
