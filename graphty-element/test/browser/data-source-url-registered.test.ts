/**
 * @file `data-source="url"` with a source registered under that name: the source reads the pair,
 * with the timeline on or off. A registered source cannot be taken back, so this file is its own.
 */
import "../../src/graphty-element";

import { afterEach, assert, describe, it } from "vitest";

import type { Graphty } from "../../index.js";
import type { FormatDescriptor } from "../../src/catalog/types";
import type { AdHocData } from "../../src/config";
import { type BaseDataSourceConfig, DataSource, type DataSourceChunk } from "../../src/data/DataSource";

/** Reads nothing from the URL: it yields two nodes and an edge, and keeps what it was given. */
class UrlSource extends DataSource {
    static readonly type = "url";
    static descriptor: FormatDescriptor = {
        id: "url",
        plainName: "Test reader",
        extensions: [".url-test"],
        mimeTypes: ["application/x-url-test"],
        canImport: true,
        canExport: false,
        options: [],
    };
    static configs: object[] = [];

    constructor(private readonly config: BaseDataSourceConfig) {
        super(config.errorLimit ?? 100, config.chunkSize);
        UrlSource.configs.push(config);
    }

    protected getConfig(): BaseDataSourceConfig {
        return this.config;
    }

    async *sourceFetchData(): AsyncGenerator<DataSourceChunk> {
        await Promise.resolve();
        yield {
            nodes: [{ id: "a" }, { id: "b" }] as AdHocData[],
            edges: [{ src: "a", dst: "b" }] as AdHocData[],
        };
    }
}

DataSource.register(UrlSource);

let mounted: Graphty | null = null;

afterEach(() => {
    mounted?.remove();
    mounted = null;
});

describe('a source registered as "url"', () => {
    for (const features of [["timeline"], []]) {
        it(`reads the pair with features [${features.join()}]`, async () => {
            UrlSource.configs = [];
            const made = document.createElement("graphty-element");
            made.features = features;
            made.dataSource = "url";
            made.dataSourceConfig = { url: "not-fetched" };
            mounted = made;
            const loaded = new Promise((resolve) => {
                made.addEventListener("data-loaded", resolve, { once: true });
            });
            document.body.appendChild(made);
            await loaded;
            assert.strictEqual(made.session.visibility.summary.totalEdges, 1);
            assert.deepEqual(UrlSource.configs, [{ url: "not-fetched" }]);
        });

        it(`reads the pair on an element never connected, with features [${features.join()}]`, async () => {
            UrlSource.configs = [];
            const made = document.createElement("graphty-element");
            made.features = features;
            made.dataSource = "url";
            made.dataSourceConfig = { url: "not-fetched" };
            await made.session.data.addNodes([{ id: "after" }]);
            assert.deepEqual(UrlSource.configs, [{ url: "not-fetched" }]);
            assert.strictEqual(made.session.visibility.summary.totalNodes, 3);
            // Connected only so the afterEach's removal disposes its engine.
            document.body.appendChild(made);
            mounted = made;
        });
    }
});
