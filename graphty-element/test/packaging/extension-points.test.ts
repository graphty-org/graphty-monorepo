/**
 * @file The six extension points are reachable from a published entry point, and cost no renderer.
 *
 * WHAT THIS PINS, and why it is a packaging test rather than a per-point one. Each extension
 * point has its own parity suite under `test/browser/extensions/`, which drives a dummy extension
 * through everything its built-in peer can do. Those suites need a canvas. This one asks the
 * question that comes before any of them: can a third party writing a plugin -- in Node, in a
 * build script, in a worker -- import what they need, from a name the package publishes, without
 * a browser anywhere in the loop?
 *
 * Every import below is a published subpath, spelled exactly as a consumer would spell it. A deep
 * `src/` path here would prove nothing: reaching into the source is what the entry points exist
 * to make unnecessary, and a plugin that has to do it has already lost the contract.
 */

import { readdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { assert, describe, it } from "vitest";

import * as catalog from "../../catalog";
import * as extend from "../../extend";

/** One registration surface per extension point, as a consumer names it. */
const REGISTRATION_SURFACES: readonly { point: string; name: keyof typeof extend; shape: "class" | "function" }[] = [
    { point: "Palette", name: "registerPalette", shape: "function" },
    { point: "File format", name: "DataSource", shape: "class" },
    { point: "Camera", name: "registerCameraView", shape: "function" },
    { point: "Layout", name: "LayoutEngine", shape: "class" },
    { point: "Algorithm", name: "Algorithm", shape: "class" },
    { point: "Logging", name: "registerLogSink", shape: "function" },
];

/** The escape hatch each registry ships so a suite can leave it as it found it. */
const CLEAR_FOR_TESTING: readonly (keyof typeof extend)[] = [
    "clearRegisteredAlgorithmsForTesting",
    "clearRegisteredCamerasForTesting",
    "clearRegisteredFormatsForTesting",
    "clearRegisteredLayoutsForTesting",
    "clearRegisteredLogSinksForTesting",
    "clearRegisteredPalettesForTesting",
];

/** What each point publishes about what is registered, for a picker that reads one half. */
const REGISTERED_DESCRIPTOR_READERS: readonly (keyof typeof extend)[] = [
    "registeredAlgorithmDescriptors",
    "registeredCameraDescriptors",
    "registeredFormatDescriptors",
    "registeredLayoutDescriptors",
    "registeredLogSinkDescriptors",
    "registeredPaletteDescriptors",
];

describe("the six extension points, from a published entry point", () => {
    it.each(REGISTRATION_SURFACES)("$point registers through $name, which ./extend publishes", ({ name, shape }) => {
        const surface = extend[name];

        assert.typeOf(surface, "function", `./extend publishes no ${name}`);
        if (shape === "class") {
            // A base class registers its own subclasses, so the static is the registration call.
            assert.typeOf((surface as { register?: unknown }).register, "function");
        }
    });

    it.each(CLEAR_FOR_TESTING)("%s is published, so a suite can leave the registry as it found it", (name) => {
        assert.typeOf(extend[name], "function");
    });

    it.each(REGISTERED_DESCRIPTOR_READERS)("%s answers a list, empty until something registers", (name) => {
        const read = extend[name] as () => readonly unknown[];

        assert.isArray(read());
    });

    it("publishes the one options mechanism all six share", () => {
        // An extension declares OptionDescriptor[] and the element validates against it. Without
        // the resolver published, a plugin has no way to be configured the way a built-in is.
        assert.typeOf(extend.resolveOptionValues, "function");
        assert.typeOf(extend.optionsFromZod, "function");
        assert.isArray(extend.OPTION_TYPES);
    });

    it("publishes the error vocabulary a plugin reports through", () => {
        assert.typeOf(extend.GraphtyError, "function");
        assert.typeOf(extend.isGraphtyError, "function");
    });

    it("publishes format detection, which a consumer used to have to reimplement", () => {
        assert.typeOf(extend.detectFormat, "function");
        assert.typeOf(extend.detectFormats, "function");
        assert.strictEqual(catalog.detectFormat, extend.detectFormat);
    });
});

describe("the catalogue tables behind the extension points", () => {
    it("publishes a table for every point whose entries a picker offers", () => {
        // Cameras and log destinations are the two that did not exist. Without them, a settings
        // panel could list the element's algorithms, layouts, formats and palettes and then had
        // to hard-code its own list of views and log destinations -- which is exactly the drift
        // the catalogue exists to prevent.
        assert.isAbove(catalog.CAMERA_DESCRIPTORS.length, 0);
        assert.isAbove(catalog.LOG_SINK_DESCRIPTORS.length, 0);
    });

    it.each([
        ["cameras", () => catalog.CAMERA_DESCRIPTORS],
        ["log destinations", () => catalog.LOG_SINK_DESCRIPTORS],
    ])("the %s table is plain JSON, so it survives a postMessage", (_name, read) => {
        const table = read();

        assert.deepEqual(JSON.parse(JSON.stringify(table)), table);
    });

    it("freezes both new tables, because registration adds to the composed list and never to these", () => {
        assert.isTrue(Object.isFrozen(catalog.CAMERA_DESCRIPTORS));
        assert.isTrue(Object.isFrozen(catalog.LOG_SINK_DESCRIPTORS));
    });

    it("says which drawing modes each camera view works in, rather than throwing once chosen", () => {
        // A picker cannot read a throw. Before `modes`, a view unusable in 2D was offered in 2D
        // and failed when it was picked.
        for (const descriptor of catalog.CAMERA_DESCRIPTORS) {
            assert.isAbove(descriptor.modes.length, 0, `${descriptor.id} declares no modes`);
            for (const mode of descriptor.modes) {
                assert.include(["2d", "3d"], mode);
            }
        }
    });

    it("offers only the views that work in the mode being asked about", () => {
        const flat = catalog.camerasForMode("2d").map((descriptor) => descriptor.id);

        assert.includeMembers(flat, ["fitToGraph", "topView"]);
        assert.notInclude(flat, "isometric");
    });

    it("finds a built-in view and a built-in destination by name, and answers nothing for a stranger", () => {
        assert.strictEqual(catalog.cameraDescriptor("isometric")?.plainName, "Isometric");
        assert.strictEqual(catalog.logSinkDescriptor("remote")?.id, "remote");
        assert.isUndefined(catalog.cameraDescriptor("no-such-view"));
        assert.isUndefined(catalog.logSinkDescriptor("no-such-sink"));
    });

    it("names every built-in palette in the id list, not a quarter of them", () => {
        // KNOWN_PALETTE_IDS is what autocomplete offers. It listed four of seventeen, so a
        // consumer typing a palette name was shown a quarter of the element's own palettes.
        assert.deepEqual(
            [...catalog.KNOWN_PALETTE_IDS].sort(),
            catalog.PALETTE_DESCRIPTORS.map((descriptor) => descriptor.id).sort(),
        );
    });

    it("names every built-in camera view and log destination in their id lists", () => {
        assert.deepEqual(
            [...catalog.KNOWN_CAMERA_IDS],
            catalog.CAMERA_DESCRIPTORS.map((descriptor) => descriptor.id),
        );
        assert.deepEqual(
            [...catalog.KNOWN_LOG_SINK_IDS],
            catalog.LOG_SINK_DESCRIPTORS.map((descriptor) => descriptor.id),
        );
    });
});

describe("the parity suites CLAUDE.md promises", () => {
    /** Where the per-point suites live, resolved from this file rather than from the cwd. */
    const suiteDirectory = resolve(dirname(fileURLToPath(import.meta.url)), "../browser/extensions");

    /** One suite per point, plus the one that proves the six work together. */
    const EXPECTED_SUITES: readonly string[] = [
        "algorithm-extension.test.ts",
        "all-extension-points.test.ts",
        "camera-extension.test.ts",
        "format-extension.test.ts",
        "layout-extension.test.ts",
        "logging-extension.test.ts",
        "palette-extension.test.ts",
    ];

    it("is exactly one file per extension point, plus the one that runs all six at once", () => {
        // CLAUDE.md tells a reader that parity is pinned by these files and that a capability not
        // exercised there is not promised. A file renamed or deleted without that sentence being
        // corrected would make the promise false with nothing to say so.
        assert.deepEqual(
            readdirSync(suiteDirectory)
                .filter((name) => name.endsWith(".test.ts"))
                .sort(),
            [...EXPECTED_SUITES],
        );
    });
});

describe("the three codes the extension points added", () => {
    it.each(["E_UNKNOWN_PALETTE", "E_UNKNOWN_CAMERA", "E_UNKNOWN_SINK"] as const)(
        "%s is a code a plugin can report with and a consumer can switch on",
        (code) => {
            // Reported through the published constructor rather than read out of the internal
            // table, because what a plugin actually needs is to be able to THROW one of these.
            const error = new extend.GraphtyError({ code, message: "for the test", source: "registry" });

            assert.isTrue(extend.isGraphtyError(error));
            assert.strictEqual(error.code, code);
        },
    );
});
