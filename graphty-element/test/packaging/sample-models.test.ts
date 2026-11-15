/**
 * @file The sample models as a consumer of the built package gets them: `catalog.models()` lists
 * the four with thumbnails that are reachable wherever the package runs (inlined `data:` URLs, so
 * no request), each sample loads from the ESM build in plain Node, and `./bundle` carries the same
 * bytes. Needs `npm run build` first.
 */

import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";

import { assert, describe, it } from "vitest";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const DIST = `${ROOT}dist/`;
const SAMPLES = ["box", "server", "person", "tree"] as const;

/**
 * Import a built entry point.
 * @param file - The file under dist/.
 * @returns The module.
 */
async function built<T>(file: string): Promise<T> {
    assert.isTrue(existsSync(`${DIST}${file}`), `dist/${file} is missing: run \`npm run build\` first`);
    return (await import(/* @vite-ignore */ pathToFileURL(`${DIST}${file}`).href)) as T;
}

interface Descriptor {
    id: string;
    plainName: string;
    thumbnail: string;
}

describe("the sample models in the built package", () => {
    it("are listed by ./catalog and session.catalog.models() with inlined PNG thumbnails", async () => {
        const catalog = await built<{ MODEL_DESCRIPTORS: readonly Descriptor[] }>("catalog.js");
        const session = await built<{ createGraphSession: () => { catalog: { models(): readonly Descriptor[] } } }>(
            "session.js",
        );
        const listed = session.createGraphSession().catalog.models();
        assert.deepEqual(
            listed.map((m) => m.id),
            SAMPLES.map((name) => `asset:sample/${name}`),
        );
        assert.deepEqual(listed, catalog.MODEL_DESCRIPTORS);
        for (const [i, model] of listed.entries()) {
            assert.isNotEmpty(model.plainName);
            const prefix = "data:image/png;base64,";
            assert.isTrue(model.thumbnail.startsWith(prefix), `${model.id}: ${model.thumbnail.slice(0, 40)}`);
            const shipped = readFileSync(`${ROOT}assets/models/${SAMPLES[i]}.png`);
            assert.isTrue(Buffer.from(model.thumbnail.slice(prefix.length), "base64").equals(shipped), model.id);
        }
    });

    it("load from the ESM build with no network, and are not stored in the session", async () => {
        const { createGraphSession } = await built<{
            createGraphSession: () => {
                assets: {
                    ready(ref: string): Promise<{ id: string; state: string; format: string; problems: unknown[] }>;
                    list(): readonly unknown[];
                    inspect(id: string): { triangles: number; upAxis: string };
                };
            };
        }>("session.js");
        const session = createGraphSession();
        for (const name of SAMPLES) {
            const record = await session.assets.ready(`asset:sample/${name}`);
            assert.strictEqual(record.state, "accepted", JSON.stringify(record.problems));
            assert.strictEqual(record.format, "glb");
            assert.isAbove(session.assets.inspect(record.id).triangles, 0);
        }

        assert.isEmpty(session.assets.list());
        const unknown = await session.assets.ready("asset:sample/teapot");
        assert.strictEqual(unknown.state, "rejected");
        assert.deepEqual(unknown.problems, [{ code: "E_MODEL_UNKNOWN_ASSET", params: { id: "asset:sample/teapot" } }]);
    });

    it("are inside ./bundle, byte for byte", () => {
        const bundle = readFileSync(`${DIST}graphty.bundle.js`, "utf8");
        for (const name of SAMPLES) {
            const glb = readFileSync(`${ROOT}assets/models/${name}.glb`).toString("base64");
            assert.include(bundle, `data:model/gltf-binary;base64,${glb}`, name);
        }
    });
});
