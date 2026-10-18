/**
 * Every way a load reaches the file-styles choice without the element: the source's own options
 * (the route `dataSourceConfig`, `loadFromUrl` and `loadFromFile` take), a draft, and a format a
 * third party registered from a graph-io importer -- and what the catalog says about each format.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { gmlImporter } from "@graphty/graph-io/gml";
import { assert, describe, it } from "vitest";

import { DataSource, type FormatDescriptor } from "../../extend";
import { createGraphSession, fileStyleOf, type GraphSession } from "../../session";

const CORPUS = join(__dirname, "..", "..", "..", "graph-io", "test", "corpus", "styles");
const MISERABLES = readFileSync(join(CORPUS, "gexf", "gexfjs-miserables.gexf"), "utf8");
const GML = readFileSync(join(CORPUS, "gml", "generated", "graphics-mix.gml"), "utf8");

/**
 * The layers a file's styles made.
 * @param session - The session.
 * @returns Their names.
 */
function fileLayers(session: GraphSession): string[] {
    return session.styles
        .list()
        .filter((layer) => fileStyleOf(layer) !== null)
        .map((layer) => layer.name);
}

/**
 * A third party's format: graph-io's GML importer, under a name the element does not ship.
 * @param id - The format's id.
 * @param styles - What the descriptor says about styles; left out when undefined.
 * @returns The descriptor.
 */
function acme(id: string, styles?: FormatDescriptor["styles"]): FormatDescriptor {
    return {
        id,
        plainName: `Acme ${id}`,
        extensions: [`.${id}`],
        mimeTypes: [`text/vnd.${id}`],
        canImport: true,
        canExport: false,
        options: [],
        ...(styles === undefined ? {} : { styles }),
    };
}

DataSource.register(DataSource.fromImporter(gmlImporter, acme("acme-styled")));
DataSource.register(DataSource.fromImporter({ ...gmlImporter, styles: undefined }, acme("acme-plain")));
DataSource.register(DataSource.fromImporter(gmlImporter, acme("acme-stated", { read: false, write: "none" })));

describe("the catalog", () => {
    it("says which built-in formats carry styles", () => {
        const session = createGraphSession();
        const formats = new Map(session.catalog.formats().map((format) => [format.id, format.styles]));
        assert.deepEqual(formats.get("gexf"), { read: true, write: "rules" });
        assert.deepEqual(formats.get("cx"), { read: true, write: "rules" });
        assert.deepEqual(formats.get("cys"), { read: true, write: "rules" });
        assert.deepEqual(formats.get("csv"), { read: false, write: "none" });
        session.dispose();
    });

    it("derives it for a third party's importer with a styles member, and a stated value wins", () => {
        const session = createGraphSession();
        const formats = new Map(session.catalog.formats().map((format) => [format.id, format.styles]));
        assert.strictEqual(formats.get("acme-styled")?.read, true);
        assert.strictEqual(formats.get("acme-plain")?.read, false);
        assert.strictEqual(formats.get("acme-stated")?.read, false);
        session.dispose();
    });

    it("draws a third party's file's styles through the importer it wrapped", async () => {
        const session = createGraphSession();
        await session.data.import({ type: "acme-styled", config: { data: GML } }, { styles: "file" });
        assert.isAbove(fileLayers(session).length, 0);
        session.dispose();
    });
});

describe("the choice in the source's own options", () => {
    it("draws the file's layers when the options say styles: file, as dataSourceConfig and loadFromUrl pass it", async () => {
        const session = createGraphSession();
        await session.data.import({
            type: "gexf",
            config: { data: MISERABLES, styles: "file", styleOptions: { lengths: "file" } },
        });
        assert.include(fileLayers(session), "node.by.Modularity Class");
        for (const node of session.data.nodes()) {
            const size = (session.styles.explain({ node: node.id }).merged as Record<string, unknown>)["node.size"];
            // Lengths as the file has them: no node of this file is smaller than 8.
            assert.isAtLeast(size as number, 8);
        }
        session.dispose();
    });

    it("lets the load's own choice win over the options", async () => {
        const session = createGraphSession();
        await session.data.import({ type: "gexf", config: { data: MISERABLES, styles: "file" } }, { styles: "none" });
        assert.lengthOf(fileLayers(session), 0);
        session.dispose();
    });
});

describe("a draft", () => {
    it("says before the load that the file carries styles, and its load draws them", async () => {
        const session = createGraphSession();
        const draft = await session.data.prepare({ type: "gexf", config: { data: MISERABLES } });
        assert.strictEqual(draft.styles?.declared, true);
        assert.isAbove(draft.styles?.summary.nodeRules ?? 0, 0);
        assert.strictEqual(draft.styles?.summary.tool, "gephi");
        await draft.load({ styles: "file" });
        assert.include(fileLayers(session), "node.by.Modularity Class");
        session.dispose();
    });

    it("says null for a file with no styles", async () => {
        const session = createGraphSession();
        const draft = await session.data.prepare({ type: "csv", config: { data: "source,target\na,b\n" } });
        assert.isNull(draft.styles);
        draft.dispose();
        session.dispose();
    });
});
