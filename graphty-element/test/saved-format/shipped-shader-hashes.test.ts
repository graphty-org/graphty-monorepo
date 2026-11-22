/**
 * @file The shipped shader hashes: every canonical preset text ever shipped is trusted wherever
 * a file carries it, by its content hash (design/architecture/self-contained-save-files.md,
 * section 1.6). Each listed hash has its text archived, so a reviewer can read what it runs.
 *
 * Adding a preset or changing one adds its hash here. Run this file with
 * `UPDATE_SHIPPED_SHADERS=1` to append the missing hashes and archive their texts; a hash leaves
 * the list only by moving to `revoked-shader-hashes.json`.
 */

import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { assert, describe, it } from "vitest";

import { shaderDescriptors } from "../../src/catalog/shaderRegistry";
import { createGraphSession } from "../../src/session";
import { shaderContentHash } from "../../src/session/shaders";

const LIST = fileURLToPath(new URL("../../src/catalog/shipped-shader-hashes.json", import.meta.url));
const REVOKED = fileURLToPath(new URL("../../src/catalog/revoked-shader-hashes.json", import.meta.url));
const ARCHIVE = fileURLToPath(new URL("../shaders/shipped-texts/", import.meta.url));

/**
 * The canonical text of every current preset, as a save carries it.
 * @returns The texts by preset id.
 */
async function presetTexts(): Promise<Map<string, string>> {
    const session = createGraphSession();
    const texts = new Map<string, string>();
    for (const descriptor of shaderDescriptors().filter((each) => each.origin === "element")) {
        texts.set(descriptor.id, await session.shaders.source(descriptor.id));
    }

    return texts;
}

describe("shipped shader hashes", () => {
    it("lists the content hash of every current preset, with its text archived", async () => {
        const listed = JSON.parse(readFileSync(LIST, "utf8")) as string[];
        const missing: { id: string; hash: string; text: string }[] = [];
        for (const [id, text] of await presetTexts()) {
            const hash = shaderContentHash(text);
            if (!listed.includes(hash)) {
                missing.push({ id, hash, text });
            }
        }

        if (missing.length > 0 && process.env.UPDATE_SHIPPED_SHADERS === "1") {
            for (const { hash, text } of missing) {
                writeFileSync(`${ARCHIVE}${hash}.txt`, text);
            }

            writeFileSync(LIST, `${JSON.stringify([...listed, ...missing.map((each) => each.hash)], null, 4)}\n`);
            return;
        }

        assert.deepEqual(
            missing.map(({ id, hash }) => `${id}: add "${hash}"`),
            [],
            "A preset's text is not in src/catalog/shipped-shader-hashes.json; run with UPDATE_SHIPPED_SHADERS=1",
        );
    });

    it("archives a text for every listed hash, and each text hashes to its name", () => {
        const listed = JSON.parse(readFileSync(LIST, "utf8")) as string[];
        const archived = new Set(readdirSync(ARCHIVE).filter((name) => name.endsWith(".txt")));
        for (const hash of listed) {
            assert.isTrue(archived.has(`${hash}.txt`), `no archived text for ${hash}`);
            assert.strictEqual(shaderContentHash(readFileSync(`${ARCHIVE}${hash}.txt`, "utf8")), hash);
        }
    });

    it("never lists a hash as both shipped and revoked", () => {
        const listed = new Set(JSON.parse(readFileSync(LIST, "utf8")) as string[]);
        const revoked = JSON.parse(readFileSync(REVOKED, "utf8")) as string[];
        assert.deepEqual(
            revoked.filter((hash) => listed.has(hash)),
            [],
        );
    });
});
