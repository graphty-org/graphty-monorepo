/**
 * Every model variant in test/fixtures/models/variants (written by its generate.ts) through
 * `session.assets.add` in Node: accepted with the facts the manifest names (format, geometry,
 * encoding, compression, glTF version, warnings), or refused with its code. The browser test
 * test/browser/models/every-variant-draws.test.ts draws the same set.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { assert, describe, it } from "vitest";

import { createAssetsApi, type ModelCompression } from "../../src/session/assets/AssetsApi";

const VARIANTS = join(dirname(fileURLToPath(import.meta.url)), "../fixtures/models/variants");

/** One manifest entry (see generate.ts). */
interface Variant {
    readonly id: string;
    readonly files: string[];
    readonly format: string;
    readonly geometry?: string;
    readonly encoding?: string;
    readonly compression?: ModelCompression[];
    readonly gltfVersion?: string;
    readonly warnings: string[];
    readonly refused: { code: string; params?: Record<string, unknown> } | null;
    readonly needs?: string;
}

const manifest = JSON.parse(readFileSync(join(VARIANTS, "manifest.json"), "utf8")) as Variant[];

/**
 * A variant's files, as `add` takes them.
 * @param variant - The variant.
 * @returns path to bytes.
 */
function filesOf(variant: Variant): Map<string, Uint8Array> {
    return new Map(variant.files.map((name) => [name, new Uint8Array(readFileSync(join(VARIANTS, variant.id, name)))]));
}

describe("every model variant on intake", () => {
    it("covers every built-in format", () => {
        const formats = new Set(manifest.filter((v) => v.refused === null).map((v) => v.format));
        for (const format of ["glb", "gltf", "obj", "stl", "ply", "splat", "spz", "sog", "babylon"]) {
            assert.isTrue(formats.has(format), format);
        }
    });

    it.each(manifest.map((v) => [v.id, v] as const))("%s", async (_id, variant) => {
        let assets = createAssetsApi();
        let record = await assets.add({ files: filesOf(variant) });
        if (variant.needs !== undefined) {
            assert.strictEqual(record.state, "rejected");
            assert.strictEqual(record.problems[0]?.code, "E_MODEL_MISSING_FILE");
            assert.strictEqual(record.parts?.find((p) => p.name === variant.needs)?.state, "missing");
            assets = createAssetsApi();
            record = await assets.add({ files: filesOf(variant) }, { skipped: [variant.needs] });
        }

        if (variant.refused !== null) {
            assert.strictEqual(record.state, "rejected");
            assert.strictEqual(record.problems[0]?.code, variant.refused.code, JSON.stringify(record.problems));
            for (const [key, value] of Object.entries(variant.refused.params ?? {})) {
                assert.deepStrictEqual(record.problems[0].params[key], value, key);
            }
            return;
        }

        assert.strictEqual(record.state, "accepted", JSON.stringify(record.problems));
        const summary = assets.inspect(record.id);
        assert.strictEqual(record.format, variant.format);
        assert.strictEqual(summary.geometry, variant.geometry);
        assert.strictEqual(summary.encoding, variant.encoding);
        assert.deepStrictEqual(summary.compression, variant.compression);
        if (variant.gltfVersion !== undefined) {
            assert.strictEqual(summary.gltfVersion, variant.gltfVersion);
        }
        assert.isAbove(summary.triangles, 0);
        const codes = record.problems.map((p) => p.code);
        for (const code of variant.warnings) {
            assert.include(codes, code);
        }
        assert.strictEqual(record.parts?.[0]?.role, "model");
        assert.isFalse(
            record.parts?.some((p) => p.state === "missing" || p.state === "ambiguous"),
            JSON.stringify(record.parts),
        );
        if (variant.geometry !== "mesh") {
            const points = record.problems.find((p) => p.code === "W_MODEL_POINTS_APPROXIMATED");
            assert.strictEqual(points?.params.points, summary.points);
        }
    });
});
