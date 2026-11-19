/**
 * A model by address read while its pictures download (#8956): settings given while it waits stay
 * with it once accepted, `add` resolves with the finished model however its record changes while
 * it waits, and the finished model's summary is never overwritten by its stand-in's.
 */

import { afterEach, assert, describe, it, vi } from "vitest";

import { type AssetRecord, createGraphSession } from "../../session";
import { PNG_1X1, pngClaiming, texturedGltfSet, TRIANGLE_BIN, triangleGltf, utf8 } from "../fixtures/models/fixtures";

/** Holds the stand-in's read (a check that skips a picture) until the test opens it. */
const standIn = vi.hoisted(() => ({
    armed: false,
    reached: (): void => undefined,
    open: Promise.resolve(),
    result: undefined as Promise<unknown> | undefined,
}));

vi.mock("babylonjs-models/files", async (importOriginal) => {
    const original = await importOriginal<typeof import("babylonjs-models/files")>();
    const checkModelFiles: typeof original.checkModelFiles = (files, options, ...rest) => {
        if (!standIn.armed || (options.skipped ?? []).length === 0) {
            return original.checkModelFiles(files, options, ...rest);
        }

        standIn.armed = false;
        standIn.reached();
        standIn.result = standIn.open.then(() => original.checkModelFiles(files, options, ...rest));
        return standIn.result as ReturnType<typeof original.checkModelFiles>;
    };
    return { ...original, checkModelFiles };
});

const BASE = "https://models.example.com/waiting/";

/**
 * A textured glTF of its own (a material name no other fixture uses), so its digest is its own.
 * @returns The .gltf bytes.
 */
function paintedGltf(): Uint8Array {
    return utf8(
        JSON.stringify(
            triangleGltf({
                materials: [{ name: "waiting", pbrMetallicRoughness: { baseColorTexture: { index: 0 } } }],
                textures: [{ source: 0 }],
                images: [{ uri: "tex.png" }],
            }),
        ),
    );
}

/**
 * Stub fetch: the .gltf and .bin answer at once, the picture with what `picture` gives.
 * @param picture - The picture's answer: its bytes, or null for a 404.
 */
function stubSite(picture: () => Promise<Uint8Array | null>): void {
    vi.stubGlobal("fetch", async (input: string | URL | Request) => {
        const url = input instanceof Request ? input.url : String(input);
        const site: Record<string, Uint8Array> = {
            [`${BASE}tri.gltf`]: paintedGltf(),
            [`${BASE}tri.bin`]: TRIANGLE_BIN,
        };
        const bytes = site[url] ?? (url.endsWith(".png") ? await picture() : null);
        return new Response(bytes === null ? null : bytes.slice(), { status: bytes === null ? 404 : 200 });
    });
}

/**
 * A promise and what settles it.
 * @returns Both.
 */
function opening<T>(): { promise: Promise<T>; resolve: (value: T) => void } {
    let resolve = (_: T): void => undefined;
    const promise = new Promise<T>((settle) => {
        resolve = settle;
    });
    return { promise, resolve };
}

afterEach(() => {
    vi.unstubAllGlobals();
    standIn.armed = false;
});

describe("a model by address given settings while its pictures download", () => {
    it("keeps them once accepted, as one step an undo takes back", async () => {
        const picture = opening<Uint8Array | null>();
        stubSite(() => picture.promise);
        const session = createGraphSession({ workingGraph: false });
        const waiting = opening<AssetRecord>();
        const added = session.assets.add(`${BASE}tri.gltf`, { onWaiting: waiting.resolve });
        const early = await waiting.promise;

        await session.assets.setDefaults(early.id, { style: { "node.modelTurn": 90 } });
        picture.resolve(PNG_1X1);
        const done = await added;
        assert.strictEqual(done.state, "accepted", JSON.stringify(done.problems));
        assert.notStrictEqual(done.id, early.id, "accepted under its digest id");
        assert.deepEqual(done.defaults?.style, { "node.modelTurn": 90 });
        assert.deepEqual(session.assets.find(done.id)?.defaults?.style, { "node.modelTurn": 90 });

        await session.undo();
        assert.isUndefined(session.assets.find(done.id)?.defaults, "the one step taken back");
        await session.redo();
        assert.deepEqual(session.assets.find(done.id)?.defaults?.style, { "node.modelTurn": 90 });
        session.dispose();
    });

    it("saves them with a later change under its accepted id, which an undo takes back alone", async () => {
        const picture = opening<Uint8Array | null>();
        stubSite(() => picture.promise);
        const session = createGraphSession({ workingGraph: false });
        const waiting = opening<AssetRecord>();
        const added = session.assets.add(`${BASE}tri.gltf`, { onWaiting: waiting.resolve });
        const early = await waiting.promise;

        await session.assets.setDefaults(early.id, { style: { "node.modelTurn": 90 } });
        picture.resolve(PNG_1X1);
        const done = await added;
        assert.strictEqual(done.state, "accepted", JSON.stringify(done.problems));
        await session.assets.setDefaults(done.id, { hiddenTextures: ["tex.png"] });
        const both = { style: { "node.modelTurn": 90 }, hiddenTextures: ["tex.png"] };
        assert.deepEqual(session.assets.find(done.id)?.defaults, both);

        const { text } = await session.project.save();
        const file = JSON.parse(text) as { members: { kind: string; assets?: { id: string; defaults?: unknown }[] }[] };
        const saved = file.members.find((m) => m.kind === "graphty-assets")?.assets?.find((a) => a.id === done.id);
        assert.deepEqual(saved?.defaults, both, "saved under the id the project reopens by");

        await session.undo();
        assert.deepEqual(session.assets.find(done.id)?.defaults?.style, { "node.modelTurn": 90 });
        assert.deepEqual(session.assets.find(done.id)?.defaults?.hiddenTextures ?? [], []);
        session.dispose();
    });

    it("still has add and ready resolve with the finished model", async () => {
        const picture = opening<Uint8Array | null>();
        stubSite(() => picture.promise);
        const session = createGraphSession({ workingGraph: false });
        const waiting = opening<AssetRecord>();
        const first = session.assets.add(`${BASE}tri.gltf`, { onWaiting: waiting.resolve });
        const early = await waiting.promise;

        await session.assets.setDefaults(early.id, { style: { "node.modelTurn": 45 } });
        const again = session.assets.add(`${BASE}tri.gltf`);
        const ready = session.assets.ready(`${BASE}tri.gltf`);
        picture.resolve(PNG_1X1);
        for (const settled of await Promise.all([first, again, ready])) {
            assert.strictEqual(settled.state, "accepted", JSON.stringify(settled.problems));
            assert.isEmpty(settled.parts?.filter((part) => part.state === "missing") ?? []);
        }
        session.dispose();
    });
});

describe("a model by address finished while its stand-in is read", () => {
    it("keeps the finished model's summary", async () => {
        const reached = opening<undefined>();
        const open = opening<undefined>();
        standIn.reached = () => reached.resolve(undefined);
        standIn.open = open.promise;
        standIn.armed = true;
        // The picture is not found once the stand-in's read has begun, so the model is finished
        // from the session's own picture of that name.
        stubSite(async () => {
            await reached.promise;
            return null;
        });
        const session = createGraphSession({ workingGraph: false });
        // A picture larger than the stand-in's plain one, so the two summaries differ.
        const files = texturedGltfSet().set("tex.png", pngClaiming(64, 64));
        const painted = await session.assets.add({ files });
        assert.strictEqual(painted.state, "accepted");

        const done = await session.assets.add(`${BASE}tri.gltf`);
        assert.strictEqual(done.state, "accepted", JSON.stringify(done.problems));
        const finished = session.assets.inspect(done.id).textureBytes;
        assert.isAbove(finished, 64 * 64 * 4, "read with its picture");

        open.resolve(undefined);
        await standIn.result;
        assert.strictEqual(
            session.assets.inspect(done.id).textureBytes,
            finished,
            "the stand-in's read did not overwrite it",
        );
        session.dispose();
    });
});
