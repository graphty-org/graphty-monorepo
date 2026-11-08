import { formatDescriptor, SCREENSHOT_PRESET_DESCRIPTORS } from "@graphty/graphty-element/catalog";
import { assert, describe, it } from "vitest";

import {
    animationOptions,
    backgroundRefusal,
    dataExportOptions,
    DEFAULT_IMAGE,
    exportScope,
    fileName,
    formatRows,
    presetChoices,
    presetOf,
    screenshotOptions,
    slug,
    writerOptions,
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
            showSelection: false,
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
        assert.deepEqual(screenshotOptions({ ...DEFAULT_IMAGE, view: "fitToGraph" }, { blob: true }).camera, {
            preset: "fitToGraph",
            params: { keepAngle: true },
        });
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

    it("writes a partition's group as its rank by size unless the reader turns it off", () => {
        const csv = formatDescriptor("csv");
        assert.isDefined(csv);
        const [row] = formatRows(csv === undefined ? [] : [csv]);
        assert.isTrue(writerOptions(row, {}).groupRanks);
        assert.isFalse(writerOptions(row, { groupRanks: false }).groupRanks);
    });

    it("asks every data export that can hold styles for them, with ids the format cannot hold rewritten", () => {
        const graphml = formatDescriptor("graphml");
        assert.isDefined(graphml);
        const [row] = formatRows(graphml === undefined ? [] : [graphml]);
        const options = writerOptions(row, {});
        assert.isTrue(options.styles);
        assert.strictEqual(options.sanitizeIds, "mangle");
    });

    it("asks for no styles where the element's catalog offers no styles option (file styles off)", () => {
        const graphml = formatDescriptor("graphml");
        assert.isDefined(graphml);
        if (graphml === undefined) {
            return;
        }
        // What session.catalog.formats() hands over with the file styles experiment off.
        const { styles: _styles, ...plain } = graphml;
        const off = { ...plain, writerOptions: (graphml.writerOptions ?? []).filter((o) => o.name !== "styles") };
        const [row] = formatRows([off]);
        assert.isFalse(row.options.some((option) => option.name === "styles"));
        assert.notProperty(writerOptions(row, {}), "styles");
    });

    it("offers no Include styles for CSV, which writes the same file with it on (R14)", () => {
        const csv = formatDescriptor("csv");
        assert.isDefined(csv);
        for (const row of formatRows(csv === undefined ? [] : [csv])) {
            assert.isFalse(
                row.options.some((option) => option.name === "styles"),
                row.id,
            );
            assert.notProperty(writerOptions(row, {}), "styles", row.id);
        }
    });

    it("hands the element the scope and columns the reader chose", () => {
        // All names the whole graph: with no scope the element writes the working graph the app reads.
        assert.equal(exportScope("all"), "all");
        assert.equal(exportScope("shown"), "shown");
        assert.equal(exportScope("selection"), "selection");
        assert.deepEqual(exportScope("set:hubs"), { set: "hubs" });
        assert.deepEqual(exportScope("source:s2"), { kind: "source", sources: ["s2"] });
        const csv = formatDescriptor("csv");
        assert.isDefined(csv);
        const [row] = formatRows(csv === undefined ? [] : [csv]);
        const choices = { format: "csv", variant: row.variant, values: {}, scope: "shown" } as const;
        const options = dataExportOptions(row, choices, ["name"]);
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
