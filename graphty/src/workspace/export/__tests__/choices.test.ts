import { assert, describe, it } from "vitest";

import {
    backgroundRefusal,
    DEFAULT_IMAGE,
    fileName,
    IMAGE_PRESETS,
    presetOf,
    screenshotOptions,
    slug,
} from "../choices";

describe("the Export dialog's choices", () => {
    it("names the preset the choices match, and none after an edit", () => {
        assert.equal(presetOf(DEFAULT_IMAGE)?.id, "web-share");
        assert.equal(presetOf({ ...DEFAULT_IMAGE, size: "4x" })?.id, "print");
        assert.isUndefined(presetOf({ ...DEFAULT_IMAGE, format: "webp" }));
        for (const preset of IMAGE_PRESETS) {
            assert.equal(presetOf({ ...preset.choices, view: "current" }), preset);
        }
    });

    it("turns choices into screenshot options", () => {
        assert.deepEqual(screenshotOptions(DEFAULT_IMAGE, { download: true }, "a_b.png"), {
            format: "png",
            multiplier: 2,
            transparentBackground: false,
            destination: { download: true },
            downloadFilename: "a_b.png",
        });
        const thumbnail = screenshotOptions(
            { format: "jpeg", size: "400x300", background: "canvas", view: "topView" },
            { blob: true },
        );
        assert.equal(thumbnail.width, 400);
        assert.equal(thumbnail.height, 300);
        assert.equal(thumbnail.quality, 0.85);
        assert.isUndefined(thumbnail.multiplier);
        assert.deepEqual(thumbnail.camera, { preset: "topView" });
        assert.isTrue(screenshotOptions({ ...DEFAULT_IMAGE, size: "4x" }, { blob: true }).enhanceQuality);
    });

    it("refuses a transparent background in a format that cannot keep it", () => {
        assert.isNull(backgroundRefusal("png", "transparent"));
        assert.isString(backgroundRefusal("jpeg", "transparent"));
        assert.isNull(backgroundRefusal("jpeg", "canvas"));
    });

    it("names files <project>_<what>.<ext>", () => {
        assert.equal(fileName("Les Miserables", "Front", "png"), "les-miserables_front.png");
        assert.equal(fileName("  ", "nodes", "csv"), "untitled_nodes.csv");
        assert.equal(slug("Current view!"), "current-view");
    });
});
