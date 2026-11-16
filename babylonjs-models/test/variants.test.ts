/**
 * Every model variant in test/fixtures/variants (written by its generate.ts) through the checks,
 * as babylonjs-models/files reads them: accepted with the facts the manifest names (format,
 * geometry, encoding, compression, glTF version, warnings), or refused with its code; a variant
 * that needs a part is refused until the part is skipped.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { assert, describe, it } from "vitest";

import {
    checkModelFiles,
    DEFAULT_MODEL_LIMITS,
    listParts,
    mainFileOf,
    type ModelCompression,
    ModelError,
    readModelFiles,
    unpackZip,
} from "../src/files/index.js";

const VARIANTS = join(dirname(fileURLToPath(import.meta.url)), "fixtures/variants");

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
    readonly upAxis?: string;
}

const manifest = JSON.parse(readFileSync(join(VARIANTS, "manifest.json"), "utf8")) as Variant[];

/**
 * A variant's files, read the way a caller hands them over.
 * @param variant - The variant.
 * @returns The set, with a zip unpacked.
 */
async function filesOf(variant: Variant): Promise<ReadonlyMap<string, Uint8Array>> {
    const files = new Map(
        variant.files.map((name) => [name, new Uint8Array(readFileSync(join(VARIANTS, variant.id, name)))]),
    );
    const { given } = await readModelFiles({ files }, DEFAULT_MODEL_LIMITS);
    return await unpackZip(given, DEFAULT_MODEL_LIMITS);
}

/**
 * What a check threw.
 * @param checking - The check.
 * @returns The error.
 */
async function refusal(checking: Promise<unknown>): Promise<ModelError> {
    const error = await checking.then(
        () => assert.fail("the set was accepted"),
        (e: unknown) => e,
    );
    assert.instanceOf(error, ModelError);
    return error;
}

describe("every model variant on the checks", () => {
    it("covers every built-in format", () => {
        const formats = new Set(manifest.filter((v) => v.refused === null).map((v) => v.format));
        for (const format of ["glb", "gltf", "obj", "stl", "ply", "splat", "spz", "sog", "babylon"]) {
            assert.isTrue(formats.has(format), format);
        }
    });

    it.each(manifest.map((v) => [v.id, v] as const))("%s", async (_id, variant) => {
        const files = await filesOf(variant);
        const skipped: string[] = [];
        if (variant.needs !== undefined) {
            const missing = await refusal(checkModelFiles(files, {}, DEFAULT_MODEL_LIMITS));
            assert.strictEqual(missing.code, "E_MODEL_MISSING_FILE");
            const parts = listParts(files, {}, DEFAULT_MODEL_LIMITS);
            assert.strictEqual(parts?.find((p) => p.name === variant.needs)?.state, "missing");
            assert.isDefined(mainFileOf(files, {}));
            skipped.push(variant.needs);
        }

        if (variant.refused !== null) {
            const error = await refusal(checkModelFiles(files, { skipped }, DEFAULT_MODEL_LIMITS));
            assert.strictEqual(error.code, variant.refused.code, JSON.stringify(error.facts));
            for (const [key, value] of Object.entries(variant.refused.params ?? {})) {
                assert.deepStrictEqual(error.fact.params[key], value, key);
            }
            return;
        }

        const checked = await checkModelFiles(files, { skipped }, DEFAULT_MODEL_LIMITS);
        const { summary } = checked;
        assert.strictEqual(checked.kind, "model");
        assert.strictEqual(checked.format, variant.format);
        assert.strictEqual(summary.geometry, variant.geometry);
        assert.strictEqual(summary.encoding, variant.encoding);
        assert.deepStrictEqual(summary.compression, variant.compression);
        if (variant.gltfVersion !== undefined) {
            assert.strictEqual(summary.gltfVersion, variant.gltfVersion);
        }
        assert.isAbove(summary.triangles, 0);
        const codes = checked.warnings.map((w) => w.code);
        for (const code of variant.warnings) {
            assert.include(codes, code);
        }

        const parts = listParts(checked.files, { main: checked.main, skipped }, DEFAULT_MODEL_LIMITS);
        assert.strictEqual(parts?.[0]?.role, "model");
        assert.isFalse(
            parts?.some((p) => p.state === "missing" || p.state === "ambiguous"),
            JSON.stringify(parts),
        );
        if (variant.upAxis !== undefined) {
            assert.strictEqual(summary.upAxis, variant.upAxis);
        }
    });
});
