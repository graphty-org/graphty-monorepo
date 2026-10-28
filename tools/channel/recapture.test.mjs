// Tests of the full run's same-commit re-capture (recapture.mjs) on small PNGs written to a temporary directory.
// Run: node tools/channel/recapture.test.mjs
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";

import { isolateGit } from "../isolated-git-env.mjs";
import { acceptedBy, finalOf, legShare, merge, nestSingle, newestCapture, reshootIds } from "./recapture.mjs";

isolateGit();

const { PNG } = createRequire(new URL("../../visual-review/package.json", import.meta.url))("pngjs");

/**
 * A 4 x 4 PNG of one color.
 * @param gray the value of every color channel
 * @returns the PNG bytes
 */
function png(gray) {
    const img = new PNG({ width: 4, height: 4 });
    img.data.fill(gray);
    for (let i = 3; i < img.data.length; i += 4) img.data[i] = 255;
    return PNG.sync.write(img);
}
const item = (id, status) => ({
    id,
    mode: null,
    file: `${id}.png`,
    status,
    flaky: false,
    threshold: 0,
    includeAA: false,
});

function capture(dir, items, images = {}) {
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "results.json"), JSON.stringify({ version: 1, project: "app", items }));
    for (const [file, bytes] of Object.entries(images)) writeFileSync(join(dir, file), bytes);
}

describe("plan", () => {
    it("takes the newest attempt of exactly this project and the ids it found changed or new", () => {
        const dir = mkdtempSync(join(tmpdir(), "recapture-"));
        for (const n of ["visual-app-1", "visual-app-2", "visual-app-extra-3", "visual-final-app-4"])
            mkdirSync(join(dir, n));
        assert.equal(newestCapture(dir, "app"), join(dir, "visual-app-2"));
        assert.equal(newestCapture(dir, "none"), null);
        const items = [item("a", "changed"), item("b", "unchanged"), item("c", "new"), item("a", "changed")];
        assert.deepEqual(reshootIds({ items }), ["a", "c"]);
    });
    it("splits the stories into legs that together shoot each one exactly once", () => {
        const ids = ["a", "b", "c", "d", "e"];
        const legs = [1, 2, 3, 4].map((n) => legShare(ids, `${n}/4`));
        assert.deepEqual(legs, [["a", "e"], ["b"], ["c"], ["d"]]);
        assert.deepEqual(legShare(ids, undefined), ids);
        assert.throws(() => legShare(ids, "5/4"), /bad --leg/);
    });
});

describe("nestSingle", () => {
    it("moves one capture download-artifact extracted straight into the directory into its own, as for several", () => {
        const dir = join(mkdtempSync(join(tmpdir(), "recapture-")), "final");
        capture(dir, [item("a", "changed")], { "a.png": png(9) });
        assert.equal(nestSingle(dir, "visual-final-"), join(dir, "visual-final-app-0"));
        assert.ok(existsSync(join(dir, "visual-final-app-0", "results.json")));
        assert.ok(existsSync(join(dir, "visual-final-app-0", "a.png")));
        nestSingle(dir, "visual-final-");
        assert.ok(existsSync(join(dir, "visual-final-app-0", "results.json")), "nesting twice changes nothing");
    });
    it("lets plan find a single first capture", () => {
        const dir = join(mkdtempSync(join(tmpdir(), "recapture-")), "first");
        capture(dir, [item("a", "unchanged")]);
        assert.equal(newestCapture(dir, "app"), null, "flat, as download-artifact leaves one match");
        nestSingle(dir, "visual-");
        assert.equal(newestCapture(dir, "app"), join(dir, "visual-app-0"));
    });
    it("leaves several downloaded artifacts and a missing directory alone", () => {
        const dir = mkdtempSync(join(tmpdir(), "recapture-"));
        capture(join(dir, "visual-final-app-1"), []);
        capture(join(dir, "visual-final-other-1"), []);
        assert.equal(nestSingle(dir, "visual-final-"), null);
        assert.equal(nestSingle(join(dir, "absent"), "visual-final-"), null);
    });
    it("runs after every pattern download of a capture in release.yml", () => {
        const yml = readFileSync(new URL("../../.github/workflows/release.yml", import.meta.url), "utf8");
        const paths = [...yml.matchAll(/pattern: visual-[^\n]*\n\s*path: \$\{\{ runner\.temp \}\}\/(\w+)/g)].map(
            (m) => m[1],
        );
        assert.ok(paths.length >= 4, `found ${paths.length} capture downloads`);
        for (const p of new Set(paths))
            assert.match(yml, new RegExp(`recapture\\.mjs nest --captures "\\$RUNNER_TEMP/${p}"`), `${p} is nested`);
    });
});

describe("finalOf", () => {
    const changed = item("a", "changed");
    it("keeps a story changed only when the second shot draws the same picture", () => {
        assert.equal(finalOf({ first: changed, second: item("a", "changed"), same: () => true }).flaky, null);
        const f = finalOf({ first: changed, second: item("a", "changed"), same: () => false });
        assert.deepEqual([f.item.status, f.take, !!f.flaky], ["unstable", "both", true]);
    });
    it("takes the second shot, and calls it flaky, when it matches the baseline", () => {
        const f = finalOf({ first: changed, second: item("a", "unchanged"), same: () => false });
        assert.deepEqual([f.item.status, f.take, !!f.flaky], ["unchanged", "second", true]);
    });
    it("keeps the first verdict for a story not shot again", () => {
        assert.equal(finalOf({ first: item("a", "unchanged"), second: undefined }).item.status, "unchanged");
    });
    it("never counts a story changed without a confirming second shot: missing or failed, it is failed", () => {
        for (const second of [undefined, item("a", "failed")]) {
            const f = finalOf({ first: changed, second });
            assert.deepEqual([f.item.status, f.flaky], ["failed", null]);
            assert.match(f.item.reason, /^not confirmed: its second shot (is missing|failed)$/);
        }
    });
});

describe("merge", () => {
    it("writes the final capture and the flaky stories", async () => {
        const root = mkdtempSync(join(tmpdir(), "recapture-"));
        const [first, second, out] = ["first", "second", "out"].map((d) => join(root, d));
        const [red, green] = [png(200), png(120)];
        const items = [
            item("same", "changed"),
            item("flake", "changed"),
            item("third", "new"),
            item("ok", "unchanged"),
        ];
        capture(first, items, { "same.png": red, "flake.png": red, "third.png": red });
        capture(second, [item("same", "changed"), item("flake", "unchanged"), item("third", "new")], {
            "same.png": red,
            "third.png": green,
        });
        const flaky = await merge({ first, second, out });
        assert.deepEqual(
            flaky.map((f) => f.file),
            ["flake.png", "third.png"],
        );
        const final = JSON.parse(readFileSync(join(out, "results.json"), "utf8"));
        assert.deepEqual(
            final.items.map((i) => [i.file, i.status]),
            [
                ["same.png", "changed"],
                ["flake.png", "unchanged"],
                ["third.png", "unstable"],
                ["ok.png", "unchanged"],
            ],
        );
        assert.deepEqual(readFileSync(join(out, "second", "third.png")), green, "the other shot of an unstable story");
        assert.deepEqual(readFileSync(join(out, "third.png")), red);
        assert.deepEqual(JSON.parse(readFileSync(join(out, "flaky.json"), "utf8")), flaky);
    });
    it("merges the re-captures of several legs, and fails a story whose leg shot nothing", async () => {
        const root = mkdtempSync(join(tmpdir(), "recapture-"));
        const [first, leg1, leg2, out] = ["first", "leg1", "leg2", "out"].map((d) => join(root, d));
        const red = png(200);
        capture(first, [item("a", "changed"), item("b", "new"), item("c", "changed")], {
            "a.png": red,
            "b.png": red,
            "c.png": red,
        });
        capture(leg1, [item("a", "changed")], { "a.png": red });
        capture(leg2, [item("b", "unchanged")]);
        const flaky = await merge({ first, second: [leg1, leg2, join(root, "leg3")], out });
        assert.deepEqual(
            flaky.map((f) => f.file),
            ["b.png"],
        );
        const final = JSON.parse(readFileSync(join(out, "results.json"), "utf8"));
        assert.deepEqual(
            final.items.map((i) => [i.file, i.status]),
            [
                ["a.png", "changed"],
                ["b.png", "unchanged"],
                ["c.png", "failed"],
            ],
        );
    });
    it("copies the first capture unchanged when nothing was shot again", async () => {
        const root = mkdtempSync(join(tmpdir(), "recapture-"));
        capture(join(root, "first"), [item("a", "changed")], { "a.png": png(1) });
        assert.deepEqual(await merge({ first: join(root, "first"), second: null, out: join(root, "out") }), []);
        assert.ok(existsSync(join(root, "out", "a.png")));
        assert.equal(JSON.parse(readFileSync(join(root, "out", "results.json"), "utf8")).items[0].status, "changed");
    });
});

describe("acceptedBy", () => {
    const sha = (b) => createHash("sha256").update(b).digest("hex");
    const shot = (id, status, bytes, baseline = null) => ({ ...item(id, status), capture: sha(bytes), baseline });

    it("calls a story unchanged only when its captured PNG is the approved baseline byte for byte", () => {
        const [a, b, c] = [png(10), png(20), png(30)];
        const results = {
            items: [
                shot("approved", "changed", a, sha(png(1))),
                shot("other", "changed", b, sha(png(2))),
                shot("added", "new", c),
                { ...shot("gone", "removed", a), capture: null },
                { ...shot("kept", "removed", a), capture: null },
                shot("odd", "unstable", a),
            ],
        };
        const approved = { "approved.png": sha(a), "other.png": sha(png(99)), "added.png": sha(c), "kept.png": "x" };
        assert.equal(
            acceptedBy(results, (f) => approved[f] ?? null),
            3,
        );
        assert.deepEqual(
            results.items.map((i) => [i.id, i.status]),
            [
                ["approved", "unchanged"],
                ["other", "changed"],
                ["added", "unchanged"],
                ["kept", "removed"],
                ["odd", "unstable"],
            ],
        );
        assert.equal(results.items[0].baseline, sha(a));
    });

    it("reads the approval's Git LFS pointers, and the gate then passes the approved stories", async () => {
        const root = mkdtempSync(join(tmpdir(), "recapture-"));
        const git = (...a) => execFileSync("git", a, { cwd: root, encoding: "utf8" }).trim();
        git("init", "-q");
        const [shotA, shotB] = [png(40), png(50)];
        const pointer = (b) => `version https://git-lfs.github.com/spec/v1\noid sha256:${sha(b)}\nsize ${b.length}\n`;
        mkdirSync(join(root, "visual-baselines", "app"), { recursive: true });
        writeFileSync(join(root, "visual-review.config.json"), JSON.stringify({ baselines: "visual-baselines" }));
        writeFileSync(join(root, "visual-baselines", "app", "a.png"), pointer(shotA));
        writeFileSync(join(root, "visual-baselines", "app", "b.png"), pointer(png(1)));
        git("add", ".");
        git("-c", "user.name=t", "-c", "user.email=t@t", "commit", "-qm", "approve");
        const head = git("rev-parse", "HEAD");
        const dir = join(root, "captures", "visual-app-1");
        const results = {
            version: 1,
            project: "app",
            complete: true,
            expected: 2,
            items: [shot("a", "changed", shotA, sha(png(2))), shot("b", "changed", shotB, sha(png(3)))],
        };
        capture(dir, []);
        writeFileSync(join(dir, "results.json"), JSON.stringify(results));
        execFileSync(
            process.execPath,
            [
                new URL("./recapture.mjs", import.meta.url).pathname,
                "accepted",
                "--captures",
                join(root, "captures"),
                "--head",
                head,
            ],
            { cwd: root, stdio: "ignore" },
        );
        const after = JSON.parse(readFileSync(join(dir, "results.json"), "utf8"));
        assert.deepEqual(
            after.items.map((i) => i.status),
            ["unchanged", "changed"],
            "b's capture is not the approved baseline: the gate still refuses it",
        );
    });
});
