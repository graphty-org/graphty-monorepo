// Tests of tools/dataset-overlay.mjs over two real build-hosted.mjs outputs (tools/fixtures/dataset-overlay/):
// production/ is graph-samples' build of karate and florentine-families; promoted/ is a later build that
// adds dolphins, re-renders florentine-families' thumbnail and re-gzips karate at another level (the
// same snapshot). Run: node tools/dataset-overlay.test.mjs
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { cpSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

import { mergeIndex, overlay } from "./dataset-overlay.mjs";

const script = fileURLToPath(new URL("dataset-overlay.mjs", import.meta.url));
const fixtures = fileURLToPath(new URL("fixtures/dataset-overlay/", import.meta.url));
const scratch = mkdtempSync(join(tmpdir(), "dataset-overlay-"));
after(() => rmSync(scratch, { recursive: true, force: true }));

const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");
let n = 0;
function copies() {
    const dir = join(scratch, String(n++));
    cpSync(fixtures, dir, { recursive: true });
    return { production: join(dir, "production"), promoted: join(dir, "promoted") };
}
const read = (dir, file) => readFileSync(join(dir, file));
const index = (dir) => JSON.parse(read(dir, "index.json").toString("utf8"));

describe("dataset-overlay.mjs", () => {
    it("adds the new dataset, keeps the re-gzipped one's bytes and takes the new thumbnail", () => {
        const { production, promoted } = copies();
        const thumbnail = read(promoted, "florentine-families.webp");
        const r = spawnSync(process.execPath, [script, production, promoted], { encoding: "utf8" });
        assert.equal(r.status, 0, r.stderr);
        assert.match(r.stdout, /karate\.gsnp\.gz: same snapshot, gzip differs; production's file kept/);
        assert.match(r.stdout, /florentine-families\.webp: thumbnail replaced/);

        assert.deepEqual(read(promoted, "karate.gsnp.gz"), read(production, "karate.gsnp.gz"));
        assert.deepEqual(read(promoted, "florentine-families.webp"), thumbnail);
        assert.deepEqual(
            index(promoted).map((e) => e.name),
            ["karate", "florentine-families", "dolphins"],
        );
        // every entry describes the file that is served
        for (const e of index(promoted)) {
            const gz = read(promoted, `${e.name}.gsnp.gz`);
            assert.equal(e.sha256, sha(gz), e.name);
            assert.equal(e.bytes, gz.length, e.name);
        }
    });

    it("keeps every dataset only production serves (append-only)", () => {
        const { production, promoted } = copies();
        rmSync(join(promoted, "florentine-families.gsnp.gz"));
        rmSync(join(promoted, "florentine-families.webp"));
        writeFileSync(
            join(promoted, "index.json"),
            JSON.stringify(index(promoted).filter((e) => e.name !== "florentine-families")),
        );
        overlay(production, promoted);
        assert.deepEqual(
            read(promoted, "florentine-families.gsnp.gz"),
            read(production, "florentine-families.gsnp.gz"),
        );
        assert.ok(readdirSync(promoted).includes("florentine-families.webp"));
        assert.ok(index(promoted).some((e) => e.name === "florentine-families"));
    });

    it("refuses a changed snapshot at an existing path, naming the dataset, and writes nothing", () => {
        const { production, promoted } = copies();
        writeFileSync(join(promoted, "karate.gsnp.gz"), gzipSync(Buffer.from("another snapshot")));
        const before = read(promoted, "index.json");
        const r = spawnSync(process.execPath, [script, production, promoted], { encoding: "utf8" });
        assert.equal(r.status, 1);
        assert.match(r.stderr, /dataset karate: karate\.gsnp\.gz has different content than production serves/);
        assert.deepEqual(read(promoted, "index.json"), before);
    });

    it("takes the promoted entry for a known name only when it points at a new path", () => {
        const old = { name: "a", url: "https://graphty.app/data/graph-samples/v1/a.gsnp.gz", sha256: "1" };
        const same = { ...old, sha256: "2" };
        const moved = { ...old, url: "https://graphty.app/data/graph-samples/v2/a.gsnp.gz", sha256: "3" };
        assert.equal(mergeIndex([old], [same])[0].sha256, "1");
        assert.equal(mergeIndex([old], [moved])[0].sha256, "3");
    });

    it("prints its usage and exits 2 without arguments", () => {
        assert.equal(spawnSync(process.execPath, [script], { encoding: "utf8" }).status, 2);
    });
});
