/**
 * @file The model request guard refuses only the model's own requests (issue #7235). The guard
 * wraps Babylon's process-wide `Tools.PreprocessUrl` for as long as a load runs, and a load is
 * asynchronous, so a node's picture asked for meanwhile must pass: it is not the model's.
 */

import { SceneLoader } from "@babylonjs/core/Loading/sceneLoader.js";
import type { BaseTexture } from "@babylonjs/core/Materials/Textures/baseTexture.js";
import { Texture } from "@babylonjs/core/Materials/Textures/texture.js";
import type { GLTFFileLoader } from "@babylonjs/loaders/glTF/glTFFileLoader.js";
import { assert, describe, it } from "vitest";

import { operationQueueOf } from "../../../src/Graph";
import { PNG_1X1, texturedGltfSet } from "../../fixtures/models/fixtures";
import { cleanups, drawnAsModel, mount, nextModelEvent } from "./helpers";

describe("the model request guard", () => {
    it("lets a node's picture load while a model load is in progress, and still draws the model", async () => {
        const element = await mount();
        await element.graph.addNodes([{ id: "model" }, { id: "picture" }]);
        const scene = element.graph.getScene();

        // Hold the glTF load at its first reference (the .bin), inside the guard.
        let release = (): void => undefined;
        const released = new Promise<void>((resolve) => {
            release = resolve;
        });
        let noteHeld = (): void => undefined;
        const held = new Promise<void>((resolve) => {
            noteHeld = resolve;
        });
        const activated = SceneLoader.OnPluginActivatedObservable.addOnce((plugin) => {
            const loader = plugin as GLTFFileLoader;
            const preprocess = loader.preprocessUrlAsync;
            loader.preprocessUrlAsync = async (url: string): Promise<string> => {
                noteHeld();
                await released;
                return await preprocess(url);
            };
        });
        cleanups.push(() => SceneLoader.OnPluginActivatedObservable.remove(activated));
        cleanups.push(release);

        const model = await element.session.assets.add({ files: texturedGltfSet() });
        assert.equal(model.state, "accepted");
        const drawn = nextModelEvent(element, (change) => change.ref === model.id && change.state === "drawn");
        await element.session.styles.add({
            name: "model",
            target: "node",
            selector: { match: "ids", nodes: ["model"] },
            set: { "node.model": model.id },
        });
        await held;

        // A picture by a blob: URL the model knows nothing of, asked for while the load waits.
        const src = URL.createObjectURL(new Blob([PNG_1X1], { type: "image/png" }));
        cleanups.push(() => {
            URL.revokeObjectURL(src);
        });
        // Babylon announces a texture from inside its constructor, before its URL and its load
        // observable exist, so each is watched once the constructor has returned.
        const settled = new Promise<"loaded" | "failed">((resolve) => {
            const isPicture = (texture: BaseTexture): boolean => texture instanceof Texture && texture.url === src;
            const added = scene.onNewTextureAddedObservable.add((texture: BaseTexture) => {
                queueMicrotask(() => {
                    if (isPicture(texture)) {
                        (texture as Texture).onLoadObservable.addOnce(() => {
                            resolve("loaded");
                        });
                    }
                });
            });
            const failed = Texture.OnTextureLoadErrorObservable.add((texture) => {
                if (isPicture(texture)) {
                    resolve("failed");
                }
            });
            cleanups.push(() => {
                scene.onNewTextureAddedObservable.remove(added);
                Texture.OnTextureLoadErrorObservable.remove(failed);
            });
        });
        await element.session.styles.add({
            name: "picture",
            target: "node",
            selector: { match: "ids", nodes: ["picture"] },
            set: { "node.image": src },
        });

        assert.strictEqual(await settled, "loaded", "the picture loads beside the pending model");

        release();
        await drawn;
        await operationQueueOf(element.graph).waitForCompletion();
        assert.isTrue(drawnAsModel(element.graph, "model"), "the model is drawn once its load resumes");
    });
});
