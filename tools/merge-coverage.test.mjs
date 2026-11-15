// Tests of tools/merge-coverage.sh: a failed shard merge stops the script with the merger's own error,
// instead of falling back to concatenated shards whose line counts are wrong.
//
//   node --test tools/merge-coverage.test.mjs
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const SCRIPT = fileURLToPath(new URL("./merge-coverage.sh", import.meta.url));

describe("merge-coverage.sh", () => {
    it("exits 1 with the merger's error when merging a package's shards fails", () => {
        const dir = mkdtempSync(join(tmpdir(), "merge-coverage-"));
        try {
            for (const shard of ["coverage-layout-1", "coverage-layout-2"]) {
                mkdirSync(join(dir, "artifacts", shard), { recursive: true });
                writeFileSync(join(dir, "artifacts", shard, "lcov.info"), "SF:src/a.ts\nDA:1,1\nend_of_record\n");
            }
            // A copy, so the script's fixed output folders (.coverage-packages/, coverage/) land in dir.
            mkdirSync(join(dir, "tools"));
            copyFileSync(SCRIPT, join(dir, "tools/merge-coverage.sh"));
            mkdirSync(join(dir, "bin"));
            writeFileSync(join(dir, "bin/pnpm"), "#!/bin/sh\necho 'merger exploded' >&2\nexit 1\n", { mode: 0o755 });
            const r = spawnSync("bash", [join(dir, "tools/merge-coverage.sh"), "--artifacts", join(dir, "artifacts")], {
                env: { ...process.env, PATH: `${join(dir, "bin")}:${process.env.PATH}` },
                encoding: "utf8",
            });
            assert.equal(r.status, 1, r.stdout + r.stderr);
            assert.match(r.stderr, /merger exploded/);
            assert.match(r.stdout, /Failed to merge shards for layout/);
            assert.doesNotMatch(r.stdout, /concatenation/);
        } finally {
            rmSync(dir, { recursive: true, force: true });
        }
    });

    it("lists every package in its help", () => {
        const r = spawnSync("bash", [SCRIPT, "--help"], { encoding: "utf8" });
        assert.equal(r.status, 0);
        assert.match(r.stdout, /cd cytoscape-extensions && pnpm run coverage/);
    });
});
