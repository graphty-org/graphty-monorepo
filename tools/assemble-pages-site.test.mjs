// tools/assemble-pages-site.sh exits non-zero when a copy or the build stamp fails, so the deploy never
// publishes a partial site (#7264), and still skips a missing input with a warning.
//
//   node --test tools/assemble-pages-site.test.mjs
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { it } from "node:test";

const script = fileURLToPath(new URL("./assemble-pages-site.sh", import.meta.url));

/**
 * A repository tree holding only the app build and a copy of the script, and an output directory.
 * @param indexHtml the app's index.html
 * @returns `{ repo, out }`
 */
function tree(indexHtml) {
    const repo = mkdtempSync(join(tmpdir(), "assemble-pages-site-"));
    mkdirSync(join(repo, "tools"));
    copyFileSync(script, join(repo, "tools/assemble-pages-site.sh"));
    mkdirSync(join(repo, "graphty/dist"), { recursive: true });
    writeFileSync(join(repo, "graphty/dist/index.html"), indexHtml);
    return { repo, out: join(repo, "out") };
}

const run = (repo, out, env = {}) =>
    spawnSync("bash", [join(repo, "tools/assemble-pages-site.sh"), out], {
        encoding: "utf8",
        env: { ...process.env, GRAPHTY_BUILD: "", ...env },
    });

const PAGE = "<html><head><title>x</title></head><body></body></html>";

it("skips missing inputs with a warning and exits 0", () => {
    const { repo, out } = tree(PAGE);
    const r = run(repo, out, { GRAPHTY_BUILD: "commit=abc" });
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /WARNING: docs\/\.vitepress\/dist not found/);
    assert.match(readFileSync(join(out, "index.html"), "utf8"), /<meta name="graphty-build" content="commit=abc" \/>/);
});

it("exits non-zero when a copy fails", () => {
    const { repo, out } = tree(PAGE);
    mkdirSync(join(repo, "docs/.vitepress/dist"), { recursive: true });
    writeFileSync(join(repo, "docs/.vitepress/dist/a.html"), "a");
    mkdirSync(out);
    writeFileSync(join(out, "docs"), "a file where the docs directory goes"); // mkdir -p fails, even as root
    const r = run(repo, out);
    assert.notEqual(r.status, 0);
    assert.match(r.stderr, /ERROR: copying docs\/\.vitepress\/dist -> \/docs failed/);
    assert.doesNotMatch(r.stdout, /Wrote \/storybook\/ index/);
});

it("exits non-zero when the build stamp cannot be written", () => {
    const { repo, out } = tree("<html><body>no head</body></html>");
    const r = run(repo, out, { GRAPHTY_BUILD: "commit=abc" });
    assert.notEqual(r.status, 0);
    assert.match(r.stderr, /ERROR: stamping \/index\.html failed/);
});
