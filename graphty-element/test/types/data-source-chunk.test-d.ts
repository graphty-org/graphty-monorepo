/**
 * @file Compile-only check (run by `tsc` in `npm run lint`): the simplest reader yields plain
 * records from `sourceFetchData()`, with no cast and no helper (issue #914).
 */

import { expectTypeOf } from "vitest";

import { type BaseDataSourceConfig, DataSource, type DataSourceChunk } from "../../extend";

/** A reader as a third party writes it from the published docs. */
export class PlainRecordsReader extends DataSource {
    static override type = "plain-records-reader";

    protected getConfig(): BaseDataSourceConfig {
        return {};
    }

    override async *sourceFetchData(): AsyncGenerator<DataSourceChunk, void, unknown> {
        await Promise.resolve();
        yield { nodes: [{ id: "a" }, { id: "b", team: "red" }], edges: [{ source: "a", target: "b", weight: 2 }] };
    }
}

declare const chunk: DataSourceChunk;
// A record read back keeps its values readable without a cast.
expectTypeOf(chunk.nodes[0].id).toBeAny();
