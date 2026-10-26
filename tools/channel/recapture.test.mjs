// Tests of the full run's same-commit re-capture (recapture.mjs) on small PNGs written to a temporary directory.
// Run: node tools/channel/recapture.test.mjs
import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";

import { finalOf, merge, newestCapture, reshootIds } from "./recapture.mjs";

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
    it("keeps the first verdict for a story not shot again, or whose second shot failed", () => {
        assert.equal(finalOf({ first: item("a", "unchanged"), second: undefined }).item.status, "unchanged");
        assert.equal(finalOf({ first: changed, second: item("a", "failed") }).item.status, "changed");
    });
});

describe("merge", () => {
    it("writes the final capture and the flaky stories", () => {
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
        const flaky = merge({ first, second, out });
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
    it("copies the first capture unchanged when nothing was shot again", () => {
        const root = mkdtempSync(join(tmpdir(), "recapture-"));
        capture(join(root, "first"), [item("a", "changed")], { "a.png": png(1) });
        assert.deepEqual(merge({ first: join(root, "first"), second: null, out: join(root, "out") }), []);
        assert.ok(existsSync(join(root, "out", "a.png")));
        assert.equal(JSON.parse(readFileSync(join(root, "out", "results.json"), "utf8")).items[0].status, "changed");
    });
});
