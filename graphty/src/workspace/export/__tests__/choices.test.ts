import { SCREENSHOT_PRESET_DESCRIPTORS } from "@graphty/graphty-element/catalog";
import { assert, describe, it } from "vitest";

import {
    animationOptions,
    backgroundRefusal,
    dataExportOptions,
    DEFAULT_IMAGE,
    exportScope,
    fileName,
    presetChoices,
    presetOf,
    screenshotOptions,
    slug,
} from "../choices";

describe("the Export dialog's choices", () => {
    it("names the preset the choices match, and none after an edit", () => {
        assert.equal(presetOf(DEFAULT_IMAGE)?.id, "web-share");
        assert.equal(presetOf({ ...DEFAULT_IMAGE, size: "4x" })?.id, "print");
        assert.isUndefined(presetOf({ ...DEFAULT_IMAGE, format: "webp" }));
        for (const preset of SCREENSHOT_PRESET_DESCRIPTORS) {
            assert.equal(presetOf({ ...presetChoices(preset), view: "current" }), preset);
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

    it("asks every data export for the graph's styles", () => {
        assert.deepEqual(dataExportOptions({ format: "csv", table: "edges", scope: "all" }), {
            styles: true,
            sanitizeIds: "mangle",
            table: "edges",
        });
        assert.deepEqual(dataExportOptions({ format: "graphml", table: "nodes", scope: "all" }), {
            styles: true,
            sanitizeIds: "mangle",
        });
    });

    it("hands the element the scope and columns the reader chose", () => {
        assert.isUndefined(exportScope("all"));
        assert.equal(exportScope("shown"), "shown");
        assert.equal(exportScope("selection"), "selection");
        assert.deepEqual(exportScope("set:hubs"), { set: "hubs" });
        const options = dataExportOptions({ format: "csv", table: "nodes", scope: "shown" }, ["name"]);
        assert.equal(options.scope, "shown");
        assert.deepEqual(options.columns, ["name"]);
    });

    it("records a tour by naming its views, and a still view without a camera path", () => {
        const tour = animationOptions(
            { camera: "tour", stops: ["topView", "isometric"], seconds: 3, fps: 30 },
            "a.webm",
        );
        assert.equal(tour.cameraMode, "animated");
        assert.deepEqual(tour.tour, ["topView", "isometric"]);
        assert.equal(tour.duration, 3000);
        assert.isTrue(tour.download);
        const still = animationOptions({ camera: "still", stops: [], seconds: 5, fps: 60 });
        assert.equal(still.cameraMode, "stationary");
        assert.isUndefined(still.tour);
        assert.isUndefined(still.download);
    });
});
