/**
 * @file A graph-io importer turned into a data source by `DataSource.fromImporter`.
 *
 * WHAT THIS PROTECTS. A third party who already has a graph-io importer -- an object with
 * `import(input, sink, options)` that pushes nodes and edges into a builder -- registers it with
 * the element by wrapping it, instead of writing a `DataSource` subclass by hand. The wrapped
 * reader must behave exactly like a built-in one: the same records, the same errors, the same
 * direction, the same refusal of a file it cannot read.
 *
 * HOW. graph-io's own GML importer is registered a second time, under a name the element does not
 * ship ("acme-gml"), and every GML document below is loaded through both the built-in "gml" source
 * and the wrapped one, through the published entry points only. Whatever the built-in source
 * produces, the wrapper must produce too. A hand-written `DataSource` subclass is loaded the same
 * way, because the base class stays a supported extension point beside the adapter.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { gmlImporter } from "@graphty/graph-io/gml";
import { assert, describe, it } from "vitest";

import {
    type BaseDataSourceConfig,
    DataSource,
    type DataSourceChunk,
    type FormatDescriptor,
    isGraphtyError,
} from "../../extend";
import { createGraphSession } from "../../session";

const ACME_GML: FormatDescriptor = {
    id: "acme-gml",
    plainName: "Acme GML",
    extensions: [".acmegml"],
    mimeTypes: ["text/vnd.acme.gml"],
    canImport: true,
    canExport: false,
    options: [],
};

// The options the built-in GML source hands the same importer.
const AcmeGml = DataSource.register(
    DataSource.fromImporter(gmlImporter, ACME_GML, {
        importOptions: { ids: "canonical", positions: false, weightFrom: null },
    }),
);

/** A hand-written reader: one `a b` edge per line. */
class LinesDataSource extends DataSource {
    static override readonly type = "acme-lines";
    static override descriptor: FormatDescriptor = {
        id: "acme-lines",
        plainName: "Acme Lines",
        extensions: [".acmelines"],
        mimeTypes: ["text/vnd.acme.lines"],
        canImport: true,
        canExport: false,
        options: [],
    };

    readonly #config: BaseDataSourceConfig;

    constructor(config: BaseDataSourceConfig) {
        super(config.errorLimit, config.chunkSize);
        this.#config = config;
    }

    protected getConfig(): BaseDataSourceConfig {
        return this.#config;
    }

    async *sourceFetchData(): AsyncGenerator<DataSourceChunk, void, unknown> {
        const text = await this.getContent();
        const edges = text
            .split("\n")
            .filter((line) => line.trim() !== "")
            .map((line) => {
                const [source, target] = line.trim().split(/\s+/);
                return DataSource.toRecord({ source, target });
            });
        yield* this.chunkData([], edges);
    }
}

DataSource.register(LinesDataSource);

const CORPUS = join(__dirname, "..", "helpers", "corpus", "gml");

const DOCUMENTS: Record<string, string> = {
    karate: readFileSync(join(CORPUS, "karate.gml"), "utf8"),
    football: readFileSync(join(CORPUS, "football.gml"), "utf8"),
    directed: `graph [ directed 1 node [ id 1 label "a" ] node [ id 2 ] edge [ source 1 target 2 weight 3 ] ]`,
    "repeated node": `graph [ node [ id 1 label "first" ] node [ id 1 label "second" ] node [ id 2 ] edge [ source 1 target 2 ] ]`,
    "bad edge": `graph [ node [ id 1 ] edge [ source 1 ] edge [ source 1 target 1 ] ]`,
};

/**
 * Everything one data source hands the element for a document.
 * @param type - the registered source
 * @param data - the document
 * @returns the records, the aggregated errors and the declared direction
 */
async function read(
    type: string,
    data: string,
): Promise<{ chunks: DataSourceChunk[]; errors: unknown; direction: unknown }> {
    const source = DataSource.get(type, { data });
    assert.isNotNull(source, `"${type}" is registered`);
    const chunks: DataSourceChunk[] = [];
    for await (const chunk of source.getData()) {
        chunks.push(chunk);
    }

    const declared = source.declaredDirection;
    return {
        chunks,
        errors: source.getErrorAggregator().getErrors(),
        direction: declared === null ? null : { directed: declared.directed, conflicting: declared.conflictingEdges },
    };
}

/**
 * What a session holds after loading a document through a source.
 * @param type - the registered source
 * @param data - the document
 * @returns the node and edge records, the counts and the direction
 */
async function load(type: string, data: string): Promise<unknown> {
    const session = createGraphSession();
    await session.data.import({ type, config: { data } });
    const report = session.data.lastImport();
    const out = {
        nodes: session.data.nodes(),
        edges: session.data.edges(),
        counts: report?.counts,
        directedness: session.data.statistics().directedness,
        by: session.data.statistics().directednessSource.by,
    };
    session.dispose();
    return out;
}

describe("DataSource.fromImporter", () => {
    it("files the wrapped importer under the descriptor's id", () => {
        assert.strictEqual(AcmeGml.type, "acme-gml");
        assert.strictEqual(AcmeGml.descriptor, ACME_GML);
        assert.include(DataSource.getRegisteredTypes(), "acme-gml");
    });

    for (const [name, data] of Object.entries(DOCUMENTS)) {
        it(`gives the records, errors and direction the built-in source gives: ${name}`, async () => {
            const builtIn = await read("gml", data);
            const wrapped = await read("acme-gml", data);
            assert.isAbove(builtIn.chunks.length, 0);
            assert.deepEqual(wrapped, builtIn);
        });

        it(`loads into a session exactly as the built-in source does: ${name}`, async () => {
            assert.deepEqual(await load("acme-gml", data), await load("gml", data));
        });
    }

    it("reports the importer's errors as the built-in source does", async () => {
        const { errors } = await read("acme-gml", DOCUMENTS["bad edge"]);
        assert.isAbove((errors as unknown[]).length, 0);
    });

    it("refuses a file the importer cannot read with the error the built-in source raises", async () => {
        const broken = "graph [ node [ id 1 ]";
        const failure = async (type: string): Promise<unknown> => {
            const session = createGraphSession();
            try {
                await session.data.import({ type, config: { data: broken } });
                return "loaded";
            } catch (error) {
                assert.isTrue(isGraphtyError(error));
                return isGraphtyError(error) ? { code: error.code, details: error.details } : error;
            } finally {
                session.dispose();
            }
        };

        const builtIn = await failure("gml");
        assert.strictEqual((builtIn as { code: string }).code, "E_PARSE_FAILED");
        assert.deepEqual(await failure("acme-gml"), builtIn);
    });

    it("declares no direction when told the file states none", async () => {
        const Quiet = DataSource.fromImporter(gmlImporter, { ...ACME_GML, id: "acme-quiet" }, { statedBy: () => null });
        const source = new Quiet({ data: DOCUMENTS.directed });
        for await (const chunk of source.getData()) {
            assert.isAbove(chunk.nodes.length, 0);
        }

        assert.isNull(source.declaredDirection);
    });

    it("refuses something that is not an importer", () => {
        try {
            DataSource.fromImporter({ format: "x" } as unknown as typeof gmlImporter, ACME_GML);
            assert.fail("expected a refusal");
        } catch (error) {
            assert.isTrue(isGraphtyError(error));
            if (isGraphtyError(error)) {
                assert.strictEqual(error.code, "E_BAD_COMMAND");
                assert.strictEqual(error.details.field, "importer");
            }
        }
    });

    it("still loads a hand-written DataSource subclass", async () => {
        const session = createGraphSession();
        await session.data.import({ type: "acme-lines", config: { data: "a b\nb c\n" } });
        assert.strictEqual(session.data.edges().length, 2);
        assert.strictEqual(session.data.nodes().length, 3);
        session.dispose();
    });
});
