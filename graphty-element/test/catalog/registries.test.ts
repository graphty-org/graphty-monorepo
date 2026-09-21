import "../../src/data/index";
import "../../src/layout/index";

import { assert, describe, it } from "vitest";

import { FORMAT_DESCRIPTORS, formatDescriptor, formatsForExtension, UNSERVED_FORMAT_IDS } from "../../src/catalog/formats";
import {
    LAYOUT_CATALOG,
    LAYOUT_DESCRIPTORS,
    layoutDescriptor,
    layoutEntry,
    layoutIdForEngine,
    UNSERVED_LAYOUT_IDS,
} from "../../src/catalog/layouts";
import { PALETTE_DESCRIPTORS, paletteDescriptor, palettesOfKind } from "../../src/catalog/palettes";
import { SCALE_DESCRIPTORS, scaleDescriptor, scalesForDomain } from "../../src/catalog/scales";
import { KNOWN_FORMAT_IDS, KNOWN_LAYOUT_IDS, KNOWN_PALETTE_IDS } from "../../src/catalog/types";
import { BLUE_HIGHLIGHT, GREEN_SUCCESS, ORANGE_WARNING } from "../../src/config/palettes/binary";
import {
    CARBON_COLORS,
    OKABE_ITO_COLORS,
    PASTEL_COLORS,
    TOL_MUTED_COLORS,
    TOL_VIBRANT_COLORS,
} from "../../src/config/palettes/categorical";
import { BLUE_ORANGE_COLORS, PURPLE_GREEN_COLORS, RED_BLUE_COLORS } from "../../src/config/palettes/diverging";
import {
    BLUES_COLORS,
    GREENS_COLORS,
    INFERNO_COLORS,
    ORANGES_COLORS,
    PLASMA_COLORS,
    VIRIDIS_COLORS,
} from "../../src/config/palettes/sequential";
import { DataSource } from "../../src/data/DataSource";
import { LayoutEngine } from "../../src/layout/LayoutEngine";

const registeredEngines = LayoutEngine.getRegisteredTypes();
const registeredFormats = DataSource.getRegisteredTypes();

/**
 * Collect every place a value stops being plain JSON: a function, a class instance, a Map, a
 * Date, an undefined. Reported as paths rather than as one boolean, because "a descriptor is not
 * serialisable" is useless without the field that made it so.
 */
function nonJsonPaths(value: unknown, path: string, found: string[]): string[] {
    if (value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
        return found;
    }

    if (Array.isArray(value)) {
        value.forEach((item, index) => nonJsonPaths(item, `${path}[${index}]`, found));

        return found;
    }

    if (typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype) {
        for (const [key, item] of Object.entries(value)) {
            nonJsonPaths(item, `${path}.${key}`, found);
        }

        return found;
    }

    found.push(`${path} is ${typeof value}`);

    return found;
}

const catalogues: readonly [string, readonly unknown[]][] = [
    ["layouts", LAYOUT_DESCRIPTORS],
    ["layout implementations", LAYOUT_CATALOG],
    ["formats", FORMAT_DESCRIPTORS],
    ["palettes", PALETTE_DESCRIPTORS],
    ["scales", SCALE_DESCRIPTORS],
];

describe("catalogue descriptors are data", () => {
    it.each(catalogues)("has nothing but plain JSON in the %s catalogue", (_name, entries) => {
        assert.deepEqual(nonJsonPaths(entries, "root", []), []);
    });

    it.each(catalogues)("round-trips the %s catalogue through JSON unchanged", (_name, entries) => {
        assert.deepEqual(JSON.parse(JSON.stringify(entries)) as unknown, entries);
    });
});

describe("layout catalogue", () => {
    it("gives every registered engine exactly one semantic layout", () => {
        const homes = new Map<string, string[]>();
        for (const entry of LAYOUT_CATALOG) {
            for (const implementation of entry.implementations) {
                const ids = homes.get(implementation.engine) ?? [];
                ids.push(String(entry.descriptor.id));
                homes.set(implementation.engine, ids);
            }
        }

        const unmapped = registeredEngines.filter((engine) => !homes.has(engine));
        assert.deepEqual(unmapped, []);

        const shared = registeredEngines.filter((engine) => (homes.get(engine) ?? []).length !== 1);
        assert.deepEqual(shared, []);
    });

    it("lists no engine the element does not register", () => {
        const named = LAYOUT_CATALOG.flatMap((entry) =>
            entry.implementations.map((implementation) => implementation.engine),
        );

        assert.deepEqual(named.filter((engine) => !registeredEngines.includes(engine)), []);
    });

    it("covers all sixteen registered engines", () => {
        const named = new Set(
            LAYOUT_CATALOG.flatMap((entry) => entry.implementations.map((implementation) => implementation.engine)),
        );

        assert.strictEqual(named.size, registeredEngines.length);
    });

    it("gives every built-in layout name a descriptor or a stated reason, never both", () => {
        const served = new Set(LAYOUT_DESCRIPTORS.map((descriptor) => String(descriptor.id)));
        const unserved = new Set<string>(UNSERVED_LAYOUT_IDS.map((entry) => entry.id));

        for (const id of KNOWN_LAYOUT_IDS) {
            assert.deepEqual([id, served.has(id) || unserved.has(id)], [id, true]);
            assert.deepEqual([id, served.has(id) && unserved.has(id)], [id, false]);
        }
    });

    it("says why each unserved built-in layout name has no engine", () => {
        assert.deepEqual(UNSERVED_LAYOUT_IDS.map((entry) => entry.id), ["radial", "grid"]);
        for (const entry of UNSERVED_LAYOUT_IDS) {
            assert.isTrue((KNOWN_LAYOUT_IDS as readonly string[]).includes(entry.id));
            assert.isAbove(entry.reason.length, 20);
        }
    });

    it("publishes two arrangements the built-in name list has no name for", () => {
        const extra = LAYOUT_DESCRIPTORS.map((descriptor) => String(descriptor.id)).filter(
            (id) => !(KNOWN_LAYOUT_IDS as readonly string[]).includes(id),
        );

        assert.deepEqual(extra, ["spiral", "planar"]);
    });

    it("takes the published engine, options, kind and dimensions from the default implementation", () => {
        for (const entry of LAYOUT_CATALOG) {
            const [primary, ...alternates] = entry.implementations;

            assert.isTrue(primary.isDefault);
            assert.deepEqual(alternates.map((alternate) => alternate.isDefault), alternates.map(() => false));
            assert.strictEqual(entry.descriptor.engine, primary.engine);
            assert.deepEqual(entry.descriptor.options, primary.options);
            assert.strictEqual(entry.descriptor.kind, primary.kind);
            assert.strictEqual(entry.descriptor.maxDimensions, primary.maxDimensions);
        }
    });

    it("says why each engine is the default, or what choosing it instead buys", () => {
        for (const entry of LAYOUT_CATALOG) {
            for (const implementation of entry.implementations) {
                assert.deepEqual(
                    [implementation.engine, implementation.reason.length > 20],
                    [implementation.engine, true],
                );
            }
        }
    });

    it("names each layout plainly as well as technically, and describes it", () => {
        for (const descriptor of LAYOUT_DESCRIPTORS) {
            assert.deepEqual([descriptor.id, descriptor.plainName.length > 0], [descriptor.id, true]);
            assert.deepEqual([descriptor.id, descriptor.technicalName.length > 0], [descriptor.id, true]);
            assert.deepEqual([descriptor.id, descriptor.description.length > 20], [descriptor.id, true]);
        }
    });

    it("never publishes a layout under a library's or an algorithm's name", () => {
        const ids = new Set(LAYOUT_DESCRIPTORS.map((descriptor) => String(descriptor.id)));

        for (const name of ["ngraph", "d3", "forceatlas2", "arf", "kamada-kawai", "spring", "bfs", "multipartite"]) {
            assert.deepEqual([name, ids.has(name)], [name, false]);
        }
    });

    it("uses each layout name once", () => {
        const ids = LAYOUT_DESCRIPTORS.map((descriptor) => String(descriptor.id));

        assert.strictEqual(new Set(ids).size, ids.length);
    });

    it("hands a consumer holding an engine name the semantic name it moved to", () => {
        assert.strictEqual(layoutIdForEngine("ngraph"), "force");
        assert.strictEqual(layoutIdForEngine("d3"), "force");
        assert.strictEqual(layoutIdForEngine("forceatlas2"), "force");
        assert.strictEqual(layoutIdForEngine("kamada-kawai"), "force");
        assert.strictEqual(layoutIdForEngine("arf"), "force-2d");
        assert.strictEqual(layoutIdForEngine("bfs"), "hierarchical");
        assert.strictEqual(layoutIdForEngine("multipartite"), "layers");
        assert.isUndefined(layoutIdForEngine("nothing-like-this"));
    });

    it("runs force on ngraph, and offers four other engines for it", () => {
        const force = layoutEntry("force");

        assert.strictEqual(force?.descriptor.engine, "ngraph");
        assert.deepEqual(force?.implementations.map((implementation) => implementation.engine), [
            "ngraph",
            "d3",
            "forceatlas2",
            "spring",
            "kamada-kawai",
        ]);
    });

    it("carries each engine's own options, emitted from its schema", () => {
        const force = layoutDescriptor("force");
        const names = force?.options.map((option) => option.name) ?? [];

        assert.include(names, "springLength");
        assert.strictEqual(force?.options.find((option) => option.name === "seed")?.type, "seed");
        assert.strictEqual(force?.options.find((option) => option.name === "dim")?.type, "integer");
    });

    it("declares the structural input a layout cannot run without", () => {
        assert.deepEqual(layoutDescriptor("hierarchical")?.structuralInputs, ["node"]);
        assert.deepEqual(layoutDescriptor("bipartite")?.structuralInputs, ["partition"]);
        assert.deepEqual(layoutDescriptor("layers")?.structuralInputs, ["partition"]);
        assert.deepEqual(layoutDescriptor("shell")?.structuralInputs, ["partition"]);
        assert.deepEqual(layoutDescriptor("force")?.structuralInputs, []);
    });

    it("answers nothing for a layout name it does not have", () => {
        assert.isUndefined(layoutDescriptor("no-such-layout"));
        assert.isUndefined(layoutEntry("no-such-layout"));
    });
});

describe("format catalogue", () => {
    it("gives every registered data source a descriptor", () => {
        const described = new Set(FORMAT_DESCRIPTORS.map((descriptor) => String(descriptor.id)));

        assert.deepEqual(registeredFormats.filter((format) => !described.has(format)), []);
    });

    it("describes no format the element cannot read", () => {
        const ids = FORMAT_DESCRIPTORS.map((descriptor) => String(descriptor.id));

        assert.deepEqual(ids.filter((id) => !registeredFormats.includes(id)), []);
    });

    it("gives every built-in format name a descriptor or a stated reason", () => {
        const served = new Set(FORMAT_DESCRIPTORS.map((descriptor) => String(descriptor.id)));
        const unserved = new Set<string>(UNSERVED_FORMAT_IDS.map((entry) => entry.id));

        for (const id of KNOWN_FORMAT_IDS) {
            assert.deepEqual([id, served.has(id) || unserved.has(id)], [id, true]);
        }

        assert.deepEqual(UNSERVED_FORMAT_IDS.map((entry) => entry.id), ["sif", "cx2"]);
    });

    it("reports that nothing can be written yet, rather than leaving it unsaid", () => {
        assert.isTrue(FORMAT_DESCRIPTORS.every((descriptor) => descriptor.canImport));
        assert.isFalse(FORMAT_DESCRIPTORS.some((descriptor) => descriptor.canExport));
    });

    it("gives every format lower-case dotted extensions and at least one media type", () => {
        for (const descriptor of FORMAT_DESCRIPTORS) {
            assert.isAbove(descriptor.extensions.length, 0);
            assert.isAbove(descriptor.mimeTypes.length, 0);
            for (const extension of descriptor.extensions) {
                assert.strictEqual(extension, extension.toLowerCase());
                assert.isTrue(extension.startsWith("."));
            }
        }
    });

    it("finds a format from a file name's extension", () => {
        assert.deepEqual(formatsForExtension(".GRAPHML").map((descriptor) => descriptor.id), ["graphml"]);
        assert.deepEqual(formatsForExtension(".xml").map((descriptor) => descriptor.id), ["graphml"]);
        assert.deepEqual(formatsForExtension(".nope"), []);
    });

    it("publishes the options that decide how a CSV is read", () => {
        const csv = formatDescriptor("csv");
        const variant = csv?.options.find((option) => option.name === "variant");

        assert.deepEqual(csv?.options.map((option) => option.name), [
            "delimiter",
            "variant",
            "idColumn",
            "sourceColumn",
            "targetColumn",
        ]);
        assert.strictEqual(variant?.type, "enum");
        assert.include(variant?.values?.map((choice) => choice.value) ?? [], "edge-list");
    });

    it("answers nothing for a format it does not know", () => {
        assert.isUndefined(formatDescriptor("sif"));
    });
});

const paletteAnchors: readonly [string, readonly string[]][] = [
    ["viridis", VIRIDIS_COLORS],
    ["plasma", PLASMA_COLORS],
    ["inferno", INFERNO_COLORS],
    ["blues", BLUES_COLORS],
    ["greens", GREENS_COLORS],
    ["oranges", ORANGES_COLORS],
    ["okabe-ito", OKABE_ITO_COLORS],
    ["tol-vibrant", TOL_VIBRANT_COLORS],
    ["tol-muted", TOL_MUTED_COLORS],
    ["pastel", PASTEL_COLORS],
    ["carbon", CARBON_COLORS],
    ["purple-green", PURPLE_GREEN_COLORS],
    ["blue-orange", BLUE_ORANGE_COLORS],
    ["red-blue", RED_BLUE_COLORS],
    ["blue-highlight", [BLUE_HIGHLIGHT.highlighted, BLUE_HIGHLIGHT.muted]],
    ["green-highlight", [GREEN_SUCCESS.highlighted, GREEN_SUCCESS.muted]],
    ["orange-highlight", [ORANGE_WARNING.highlighted, ORANGE_WARNING.muted]],
];

describe("palette catalogue", () => {
    it.each(paletteAnchors)("carries the element's own %s anchors, not a copy of them", (id, colors) => {
        assert.deepEqual(paletteDescriptor(id)?.colors, colors);
    });

    it("describes every palette the element defines, and nothing else", () => {
        assert.deepEqual(
            PALETTE_DESCRIPTORS.map((descriptor) => String(descriptor.id)),
            paletteAnchors.map(([id]) => id),
        );
    });

    it("gives every built-in palette name a descriptor", () => {
        const described = new Set(PALETTE_DESCRIPTORS.map((descriptor) => String(descriptor.id)));

        for (const id of KNOWN_PALETTE_IDS) {
            assert.deepEqual([id, described.has(id)], [id, true]);
        }
    });

    it("writes every anchor as a six-digit hex colour", () => {
        for (const descriptor of PALETTE_DESCRIPTORS) {
            for (const color of descriptor.colors) {
                assert.match(color, /^#[0-9a-fA-F]{6}$/u);
            }
        }
    });

    it("counts a categorical palette's capacity and leaves a ramp's open", () => {
        for (const descriptor of PALETTE_DESCRIPTORS) {
            if (descriptor.kind === "categorical") {
                assert.deepEqual([descriptor.id, descriptor.capacity], [descriptor.id, descriptor.colors.length]);
            } else {
                assert.deepEqual([descriptor.id, descriptor.capacity], [descriptor.id, null]);
            }
        }
    });

    it("claims colourblind safety only in the three named forms", () => {
        for (const descriptor of PALETTE_DESCRIPTORS) {
            for (const claim of descriptor.colorblindSafe) {
                assert.include(["deuteranopia", "protanopia", "tritanopia"], claim);
            }
        }

        assert.deepEqual(paletteDescriptor("red-blue")?.colorblindSafe, []);
        assert.deepEqual(paletteDescriptor("viridis")?.colorblindSafe, [
            "deuteranopia",
            "protanopia",
            "tritanopia",
        ]);
    });

    it("offers the palettes of one kind to a picker that knows what it is encoding", () => {
        assert.deepEqual(palettesOfKind("diverging").map((descriptor) => descriptor.id), [
            "purple-green",
            "blue-orange",
            "red-blue",
        ]);
    });

    it("answers nothing for a palette it does not know", () => {
        assert.isUndefined(paletteDescriptor("chartreuse"));
    });
});

describe("scale catalogue", () => {
    it("describes every scale a binding can name", () => {
        assert.deepEqual(SCALE_DESCRIPTORS.map((descriptor) => descriptor.name), [
            "linear",
            "log",
            "neglog10",
            "sqrt",
            "pow",
            "bins",
            "quantile",
            "ordinal",
            "passthrough",
        ]);
    });

    it("names each scale plainly as well as technically", () => {
        for (const descriptor of SCALE_DESCRIPTORS) {
            assert.isAbove(descriptor.plainName.length, 0);
            assert.notStrictEqual(descriptor.plainName, descriptor.name);
        }
    });

    it("separates the scales that need numbers from the scales that do not", () => {
        assert.deepEqual(scalesForDomain("categorical").map((descriptor) => descriptor.name), [
            "ordinal",
            "passthrough",
        ]);
        assert.lengthOf(scalesForDomain("numeric"), 7);
        assert.deepEqual(scalesForDomain("boolean"), []);
    });

    it("publishes the options each scale reads, with no name used twice", () => {
        for (const descriptor of SCALE_DESCRIPTORS) {
            const names = descriptor.options.map((option) => option.name);
            assert.deepEqual([descriptor.name, new Set(names).size], [descriptor.name, names.length]);
        }

        assert.deepEqual(scaleDescriptor("pow")?.options.map((option) => option.name), [
            "exponent",
            "reverse",
            "midpoint",
        ]);
        assert.strictEqual(scaleDescriptor("quantile")?.options.find((option) => option.name === "bins")?.default, 4);
        assert.deepEqual(scaleDescriptor("passthrough")?.options, []);
    });

    it("answers nothing for a scale it does not know", () => {
        assert.isUndefined(scaleDescriptor("logit"));
    });
});
