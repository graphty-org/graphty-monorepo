/**
 * `checkModel` tells whether a model can be drawn without drawing it: true for a model that
 * builds, false with the code `modelThumbnail` would reject with for one that loads but cannot be
 * drawn or that the session refused, and a second ask builds nothing (issue #8311).
 */

import { assert, describe, it } from "vitest";

import { filesOf, mount } from "./helpers";

describe("checkModel", () => {
    it("says a model that builds can be drawn, and a second ask builds nothing", async () => {
        const element = await mount();
        const record = await element.session.assets.add({ files: await filesOf("gltf-skinned-animated") });
        assert.deepEqual(await element.checkModel(record.id), { drawable: true });

        let built = 0;
        const counting = element.graph.scene.onNewMeshAddedObservable.add(() => {
            built++;
        });
        assert.deepEqual(await element.checkModel(record.id), { drawable: true });
        element.graph.scene.onNewMeshAddedObservable.remove(counting);
        assert.strictEqual(built, 0, "the answer was kept");
    });

    it("says a model that loads but cannot be drawn cannot, with its code", async () => {
        const element = await mount();
        const record = await element.session.assets.add({ files: await filesOf("ply-damaged") });
        assert.strictEqual(record.state, "accepted");
        const check = await element.checkModel(record.id);
        assert.strictEqual(check.drawable, false);
        assert.strictEqual(check.failure?.code, "E_MODEL_STRUCTURE");
    });

    it("says nothing held under a ref cannot be drawn, and stops on an aborted signal", async () => {
        const element = await mount();
        const check = await element.checkModel("asset:nothing-here");
        assert.strictEqual(check.drawable, false);
        assert.strictEqual(check.failure?.code, "E_MODEL_UNKNOWN_ASSET");

        const stop = new AbortController();
        stop.abort(new Error("stopped"));
        const error = await element.checkModel("asset:nothing-here", { signal: stop.signal }).catch((e: unknown) => e);
        assert.strictEqual((error as Error).message, "stopped");
    });
});
