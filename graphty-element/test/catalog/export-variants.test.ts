/**
 * @file The kinds of file the writers produce: the JSON and CSV export variants, their presets
 * and option lists, and the project file (Graphty JSON) as an export format that is never imported.
 */

import "../../src/data/index";

import { assert, describe, it } from "vitest";

import { createGraphSession } from "../../session";
import { detectFormats } from "../../src/catalog/detect";
import { FORMAT_DESCRIPTORS, formatDescriptor } from "../../src/catalog/formats";
import type { FormatExportVariant, OptionDescriptor } from "../../src/catalog/types";
import { exportSession } from "../../src/data/export";
import { isGraphtyError } from "../../src/errors";

/**
 * The variants of a format.
 * @param id - The format.
 * @returns Its variants.
 */
function variantsOf(id: string): readonly FormatExportVariant[] {
    return formatDescriptor(id)?.exportVariants ?? [];
}

/**
 * One variant by id.
 * @param format - The format.
 * @param id - The variant.
 * @returns The variant.
 */
function variant(format: string, id: string): FormatExportVariant {
    const found = variantsOf(format).find((each) => each.id === id);
    assert.isDefined(found, `${format} has a ${id} variant`);
    return found;
}

/**
 * The option names of a list.
 * @param options - The options.
 * @returns Their names.
 */
function names(options: readonly OptionDescriptor[]): string[] {
    return options.map((option) => option.name);
}

/**
 * A session holding a triangle.
 * @returns The session.
 */
async function triangle(): Promise<ReturnType<typeof createGraphSession>> {
    const session = createGraphSession();
    await session.data.import({ type: "csv", config: { data: "source,target\na,b\nb,c\nc,a\n" } });
    return session;
}

describe("export variants", () => {
    it("lists the seven JSON shapes and the three CSV files by name", () => {
        assert.deepEqual(
            variantsOf("json").map((each) => each.plainName),
            [
                "Node-link JSON (NetworkX)",
                "Cytoscape.js JSON",
                "JSON Graph Format",
                "graphology JSON",
                "vis.js JSON",
                "d3 JSON",
                "OBO Graphs JSON",
            ],
        );
        assert.deepEqual(
            variantsOf("csv").map((each) => each.plainName),
            ["CSV", "Gephi CSV", "Neo4j CSV"],
        );
    });

    it("gives each variant only its own options", () => {
        for (const each of variantsOf("json")) {
            assert.notInclude(names(each.options), "dialect", each.id);
            assert.strictEqual(names(each.options).includes("ontologyIri"), each.id === "obographs", each.id);
        }

        for (const each of variantsOf("csv")) {
            assert.notInclude(names(each.options), "variant", each.id);
            assert.notInclude(names(each.options), "dialect", each.id);
        }
    });

    it("folds away every writer option but the CSV table and the Neo4j tables", () => {
        const keyOptions = FORMAT_DESCRIPTORS.flatMap((descriptor) => [
            ...(descriptor.writerOptions ?? []),
            ...(descriptor.exportVariants ?? []).flatMap((each) => each.options),
        ]).filter((option) => option.advanced !== true);
        assert.deepEqual([...new Set(names(keyOptions))].sort(), ["part", "table"]);
    });

    it("labels every writer choice with a name, not its raw value", () => {
        for (const descriptor of FORMAT_DESCRIPTORS) {
            for (const option of descriptor.writerOptions ?? []) {
                for (const choice of option.values ?? []) {
                    assert.notStrictEqual(choice.label, choice.value, `${descriptor.id}.${option.name}`);
                }
            }
        }

        const neutralize = formatDescriptor("csv")?.writerOptions?.find(
            (option) => option.name === "neutraliseFormulas",
        );
        assert.strictEqual(neutralize?.plainName, "Neutralize Formulas");
    });

    it("writes what a variant's preset names", async () => {
        const session = await triangle();
        const cytoscape = JSON.parse(
            await exportSession(session, "json", { ...variant("json", "cytoscape").preset }).text(),
        ) as {
            elements: unknown;
        };
        assert.property(cytoscape, "elements");

        const gephi = await exportSession(session, "csv", variant("csv", "gephi").preset).text();
        assert.match(gephi, /^Source,Target,Type/);
        session.dispose();
    });
});

describe("Graphty JSON, the project file", () => {
    it("is listed as written and not imported", () => {
        const graphty = formatDescriptor("graphty");
        assert.strictEqual(graphty?.plainName, "Graphty JSON");
        assert.isTrue(graphty?.canExport);
        assert.isFalse(graphty?.canImport);
        assert.deepEqual(graphty?.extensions, [".graphty.json"]);
    });

    it("exports a document project.open opens as a project, without marking the project saved", async () => {
        const session = await triangle();
        await session.project.rename("Triangle");
        assert.isTrue(session.project.dirty);
        const result = exportSession(session, "graphty");
        assert.deepEqual(result.lossNotes, []);
        const text = await result.text();
        assert.isTrue(session.project.dirty, "an export is not a save");

        let streamed = "";
        for await (const chunk of result.bytes) {
            streamed += new TextDecoder().decode(chunk);
        }
        assert.strictEqual(streamed, text);

        const opened = createGraphSession();
        const report = await opened.project.open(text);
        assert.strictEqual(report.opened, "project");
        assert.strictEqual(opened.data.nodes().length, 3);
        session.dispose();
        opened.dispose();
    });

    it("refuses writer options", async () => {
        const session = await triangle();
        try {
            exportSession(session, "graphty", { indent: 2 });
            assert.fail("expected a refusal");
        } catch (error) {
            assert.isTrue(isGraphtyError(error) && error.code === "E_UNKNOWN_OPTION", String(error));
        }
        session.dispose();
    });

    it("is never imported as data", async () => {
        const session = createGraphSession();
        try {
            await session.data.import({ type: "graphty", config: { data: '{"nodes":[{"id":"a"}]}' } });
            assert.fail("expected a refusal");
        } catch (error) {
            assert.isTrue(isGraphtyError(error) && error.code === "E_UNKNOWN_FORMAT", String(error));
        }
        assert.strictEqual(session.data.nodes().length, 0);
        session.dispose();
    });

    it("is never detected", () => {
        for (const filename of ["x.graphty.json", "x.json", "x.csv"]) {
            assert.notInclude(detectFormats({ filename, sample: '{"nodes":[]}' }), "graphty", filename);
        }
        assert.deepEqual(detectFormats({ filename: "x.graphty.json" }), ["json"]);
    });
});
