/**
 * `session.assets` beyond intake itself (design/rendering/node-models.md sections 2.4 and 12): the
 * progress an add reports and how it ends, a model drawn without its missing pictures, the watchers
 * told when a model a layer named arrives, the facts a project file keeps by URL, and the refusals of
 * the calls that name an asset the session does not hold.
 */

import { assert, describe, it } from "vitest";

import { isGraphtyError } from "../../src/errors";
import { createAssetsApi } from "../../src/session/assets/AssetsApi";
import type { ProgressChange } from "../../src/session/shared";
import { gltfPair, texturedGltfSet, utf8 } from "../fixtures/models/fixtures";

/**
 * The code a call fails with, thrown or rejected.
 * @param fn - The call.
 * @returns The code.
 */
async function codeOf(fn: () => unknown): Promise<string> {
    let error: unknown = null;
    try {
        await fn();
    } catch (caught) {
        error = caught;
    }

    assert.isTrue(isGraphtyError(error), String(error));
    return (error as { code: string }).code;
}

/**
 * A model's files with one taken out.
 * @param files - The files.
 * @param name - The one to leave out.
 * @returns The rest.
 */
function without(files: ReadonlyMap<string, Uint8Array>, name: string): Map<string, Uint8Array> {
    return new Map([...files].filter(([path]) => path !== name));
}

describe("assets.add: the progress it reports", () => {
    it("reports each file read in bytes, then ends succeeded with the model's size", async () => {
        const changes: ProgressChange[] = [];
        const added = await createAssetsApi().add(
            { files: gltfPair() },
            {
                onProgress: (change) => {
                    changes.push(change);
                },
            },
        );

        assert.strictEqual(added.state, "accepted", JSON.stringify(added.problems));
        const progress = changes.filter((change) => change.phase === "progress");
        assert.isAbove(progress.length, 0);
        for (const change of progress) {
            assert.strictEqual(change.task, "asset");
            assert.strictEqual(change.unit, "bytes");
            assert.strictEqual(change.asset?.stage, "reading");
            assert.include(["tri.gltf", "tri.bin"], change.asset?.part);
            assert.isTrue(change.fraction !== null && change.fraction >= 0 && change.fraction <= 1);
        }

        assert.strictEqual(progress.at(-1)?.fraction, 1, "the last file read is all of it");
        assert.deepEqual(changes.at(-1), {
            task: "asset",
            phase: "end",
            completed: added.byteLength,
            total: null,
            fraction: null,
            unit: "bytes",
            outcome: "succeeded",
        });
    });

    it("ends failed with the first problem's code when the model is refused", async () => {
        const changes: ProgressChange[] = [];
        const refused = await createAssetsApi().add(
            { files: new Map([["broken.gltf", utf8("{ not json")]]) },
            {
                onProgress: (change) => {
                    changes.push(change);
                },
            },
        );

        assert.strictEqual(refused.state, "rejected");
        const end = changes.at(-1);
        assert.strictEqual(end?.phase, "end");
        assert.strictEqual(end?.outcome, "failed");
        assert.strictEqual(end?.error?.code, refused.problems[0]?.code);
    });

    it("ends cancelled, and rejects, when its signal stops the wait", async () => {
        const changes: ProgressChange[] = [];
        const controller = new AbortController();
        const adding = createAssetsApi().add(
            { files: gltfPair() },
            {
                signal: controller.signal,
                onProgress: (change) => {
                    changes.push(change);
                },
            },
        );
        controller.abort(new Error("stopped"));

        const error = await adding.then(
            () => null,
            (failure: unknown) => failure,
        );
        assert.instanceOf(error, Error);
        assert.deepEqual(changes.at(-1), {
            task: "asset",
            phase: "end",
            completed: 0,
            total: null,
            fraction: null,
            unit: "bytes",
            outcome: "cancelled",
        });
    });
});

describe("assets.standIn: a model drawn without its missing pictures", () => {
    it("hands over the files it has, its main file and the pictures it goes without", async () => {
        const assets = createAssetsApi();
        const held = await assets.add({ files: without(texturedGltfSet(), "tex.png") });
        assert.strictEqual(held.state, "rejected");
        assert.deepEqual(
            held.problems.map((fact) => fact.code),
            ["E_MODEL_MISSING_FILE"],
        );

        const standIn = assets.standIn(held.id);

        assert.isDefined(standIn);
        assert.strictEqual(standIn?.main, "tri.gltf");
        assert.strictEqual(standIn?.format, "gltf");
        assert.deepEqual([...(standIn?.files.keys() ?? [])].sort(), ["tri.bin", "tri.gltf"]);
        assert.deepEqual(standIn?.skipped, ["tex.png"]);
    });

    it("has none for a model missing its geometry, an accepted model or an unknown id", async () => {
        const assets = createAssetsApi();
        const noGeometry = await assets.add({ files: without(gltfPair(), "tri.bin") });
        const accepted = await assets.add({ files: gltfPair() });

        assert.strictEqual(noGeometry.state, "rejected");
        assert.isUndefined(assets.standIn(noGeometry.id));
        assert.strictEqual(accepted.state, "accepted");
        assert.isUndefined(assets.standIn(accepted.id));
        assert.isUndefined(assets.standIn("asset:nothing-here"));
    });
});

describe("assets.watchSupplied", () => {
    it("names each accepted model, under its id and the name it was added by, until unwatched", async () => {
        const assets = createAssetsApi();
        const heard: string[][] = [];
        const unwatch = assets.watchSupplied((names) => {
            heard.push([...names]);
        });

        const first = await assets.add({ files: gltfPair() }, { name: "asset:tri" });
        await assets.add({ files: new Map([["broken.gltf", utf8("{")]]) });
        unwatch();
        await assets.add({ files: texturedGltfSet() });

        assert.deepEqual(heard, [[first.id, "asset:tri"]]);
    });
});

describe("what a project file keeps by URL", () => {
    it("remembers an expected digest and a storage per URL, and forgets them together", () => {
        const assets = createAssetsApi();

        assets.expectDigest("https://models.example.com/car.glb?v=1", "abc");
        assets.expectDigest("not a url", "ignored");
        assets.rememberStorage("https://models.example.com/car.glb?v=1", "embed");
        assets.rememberStorage("not a url", "url");

        assert.strictEqual(assets.expectedDigest("https://models.example.com/car.glb?v=1"), "abc");
        assert.isUndefined(assets.expectedDigest("https://models.example.com/car.glb?v=2"));
        assert.isUndefined(assets.expectedDigest("not a url"));
        assert.strictEqual(assets.rememberedStorage("https://models.example.com/car.glb?v=1"), "embed");
        assert.isUndefined(assets.rememberedStorage("not a url"));

        assets.forgetProjectStorage();
        assert.isUndefined(assets.expectedDigest("https://models.example.com/car.glb?v=1"));
        assert.isUndefined(assets.rememberedStorage("https://models.example.com/car.glb?v=1"));
    });

    it("binds a URL to an accepted model only, and finds it by that URL", async () => {
        const assets = createAssetsApi();
        const accepted = await assets.add({ files: gltfPair() });
        const refused = await assets.add({ files: without(gltfPair(), "tri.bin") });

        assets.bindUrl("https://models.example.com/tri.gltf", accepted.id);
        assets.bindUrl("https://models.example.com/missing.gltf", refused.id);
        assets.bindUrl("not a url", accepted.id);

        assert.strictEqual(assets.urlRecord("https://models.example.com/tri.gltf")?.id, accepted.id);
        assert.isUndefined(assets.urlRecord("https://models.example.com/missing.gltf"));
        assert.isUndefined(assets.urlRecord("not a url"));
    });

    it("keeps the last state noted for each reference", () => {
        const assets = createAssetsApi();

        assets.noteState({ ref: "asset:a", layerIds: [], state: "pending", problems: [] });
        assets.noteState({ ref: "asset:b", layerIds: [], state: "pending", problems: [] });
        assets.noteState({ ref: "asset:a", layerIds: [], state: "drawn", problems: [] });

        assert.deepEqual(
            assets.states().map((change) => [change.ref, change.state]),
            [
                ["asset:a", "drawn"],
                ["asset:b", "pending"],
            ],
        );
    });
});

describe("calls naming an asset the session does not hold", () => {
    it("ready reports it unknown, supply and rename refuse it", async () => {
        const assets = createAssetsApi();

        const ready = await assets.ready("asset:nothing-here");
        assert.strictEqual(ready.state, "rejected");
        assert.deepEqual(ready.problems, [{ code: "E_MODEL_UNKNOWN_ASSET", params: { id: "asset:nothing-here" } }]);
        assert.strictEqual(
            await codeOf(() => assets.supply("asset:nothing-here", { name: "x.png", skip: true })),
            "E_MODEL_UNKNOWN_ASSET",
        );
        assert.strictEqual(await codeOf(() => assets.rename("asset:nothing-here", "Car")), "E_MODEL_UNKNOWN_ASSET");
    });

    it("ready and supply reject, never throw, for a signal already stopped", async () => {
        const assets = createAssetsApi();
        const accepted = await assets.add({ files: gltfPair() });
        const controller = new AbortController();
        controller.abort(new Error("stopped"));

        assert.strictEqual((await assets.ready(accepted.id)).id, accepted.id);
        // Chained, not awaited in a try: a synchronous throw would escape the chain and fail here.
        const ready = await assets.ready(accepted.id, { signal: controller.signal }).then(
            () => null,
            (failure: unknown) => failure,
        );
        const supplied = await assets
            .supply(accepted.id, { name: "x.png", skip: true }, { signal: controller.signal })
            .then(
                () => null,
                (failure: unknown) => failure,
            );
        assert.strictEqual((ready as Error | null)?.message, "stopped");
        assert.strictEqual((supplied as Error | null)?.message, "stopped");
    });
});

describe("limits and hosts set by the page", () => {
    it("refuses a limit it does not know, or one that is not a positive number, and keeps the old ones", async () => {
        const assets = createAssetsApi();
        const before = assets.limits();

        for (const changes of [
            { nonsense: 1 },
            { maxBytes: 0 },
            { maxBytes: Number.POSITIVE_INFINITY },
            { maxBytes: "1" },
        ]) {
            assert.strictEqual(
                await codeOf(() => {
                    assets.setLimits(changes as never);
                }),
                "E_OPTION_RANGE",
                JSON.stringify(changes),
            );
        }

        assert.strictEqual(assets.limits(), before);
        assets.setLimits({ maxBytes: 1024 });
        assert.strictEqual(assets.limits().maxBytes, 1024);
    });

    it("refuses a host that is not a host name, and matches allowed hosts in any case", async () => {
        const assets = createAssetsApi();

        assert.strictEqual(
            await codeOf(() => {
                assets.allowHosts(["https://models.example.com/"]);
            }),
            "E_OPTION_RANGE",
        );
        assets.allowHosts(["Models.Example.com:8080"]);

        assert.isTrue(assets.hostAllowed("models.example.COM:8080"));
        assert.isFalse(assets.hostAllowed("models.example.com"));
    });
});

describe("assets.supply: which part an answer is for", () => {
    /**
     * A model held for its one missing picture, `tex.png`.
     * @returns The API and the held record's id.
     */
    async function heldForPicture(): Promise<{ assets: ReturnType<typeof createAssetsApi>; id: string }> {
        const assets = createAssetsApi();
        const held = await assets.add({ files: without(texturedGltfSet(), "tex.png") });
        assert.strictEqual(held.state, "rejected");
        return { assets, id: held.id };
    }

    it("skips a picture named in another case, and draws the model without it", async () => {
        const { assets, id } = await heldForPicture();

        const skipped = await assets.supply(id, { name: "TEX.PNG", skip: true });

        assert.strictEqual(skipped.state, "accepted", JSON.stringify(skipped.problems));
        assert.deepEqual(skipped.skipped, ["tex.png"]);
    });

    it("refuses to skip geometry, naming the part and its role", async () => {
        const assets = createAssetsApi();
        const held = await assets.add({ files: without(gltfPair(), "tri.bin") });

        let error: unknown = null;
        await assets.supply(held.id, { name: "tri.bin", skip: true }).catch((caught: unknown) => {
            error = caught;
        });

        assert.isTrue(isGraphtyError(error));
        assert.strictEqual((error as { code: string }).code, "E_MODEL_PART_REQUIRED");
        assert.deepEqual((error as { details: unknown }).details, { name: "tri.bin", role: "geometry" });
    });

    it("says a skip or a file for a part the model does not miss is unused, and keeps holding it", async () => {
        const { assets, id } = await heldForPicture();

        const skip = await assets.supply(id, { name: "other.png", skip: true });
        const bytes = await assets.supply(id, { file: new Uint8Array([1, 2, 3]) });

        for (const [answered, fileName] of [
            [skip, "other.png"],
            [bytes, ""],
        ] as const) {
            assert.strictEqual(answered.state, "rejected");
            assert.deepEqual(answered.problems.at(-1), { code: "W_MODEL_PART_UNUSED", params: { fileName } });
        }

        assert.strictEqual(assets.get(id as never)?.state, "rejected", "still held for its picture");
    });

    it("matches an unnamed file by its folder path, then by its base name", async () => {
        const PNG = texturedGltfSet().get("tex.png") ?? new Uint8Array();
        const blob = (
            name: string,
            path?: string,
        ): { name: string; webkitRelativePath?: string; size: number; arrayBuffer: () => Promise<ArrayBuffer> } => ({
            name,
            ...(path === undefined ? {} : { webkitRelativePath: path }),
            size: PNG.length,
            arrayBuffer: () => Promise.resolve(PNG.slice().buffer),
        });

        const byPath = await heldForPicture();
        const viaPath = await byPath.assets.supply(byPath.id, { file: blob("ignored.png", "kit/tex.png") });
        const byBase = await heldForPicture();
        const viaBase = await byBase.assets.supply(byBase.id, { file: blob("TEX.png") });

        assert.strictEqual(viaPath.state, "accepted", JSON.stringify(viaPath.problems));
        assert.strictEqual(viaBase.state, "accepted", JSON.stringify(viaBase.problems));
        assert.strictEqual(viaPath.id, viaBase.id, "the same files make the same model");
    });

    it("uses a file of the set for a missing part, and refuses a path the set does not hold", async () => {
        const assets = createAssetsApi();
        const PNG = texturedGltfSet().get("tex.png") ?? new Uint8Array();
        const files = without(texturedGltfSet(), "tex.png");
        files.set("pictures/other.png", PNG);
        const held = await assets.add({ files });
        assert.strictEqual(held.state, "rejected", JSON.stringify(held.problems));

        assert.strictEqual(
            await codeOf(() => assets.supply(held.id, { name: "tex.png", use: "nowhere.png" })),
            "E_BAD_COMMAND",
        );
        const used = await assets.supply(held.id, { name: "tex.png", use: "pictures/other.png" });

        assert.strictEqual(used.state, "accepted", JSON.stringify(used.problems));
        assert.include([...assets.files(used.id).keys()], "tex.png");
    });

    it("refuses an answer for a model that is not waiting for a part", async () => {
        const assets = createAssetsApi();
        const accepted = await assets.add({ files: gltfPair() });

        assert.strictEqual(
            await codeOf(() => assets.supply(accepted.id, { name: "x.png", skip: true })),
            "E_BAD_COMMAND",
        );
    });
});
