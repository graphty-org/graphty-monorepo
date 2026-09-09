import { afterEach, assert, describe, test, vi } from "vitest";

import { CSVDataSource } from "../../src/data/CSVDataSource.js";
import { DOTDataSource } from "../../src/data/DOTDataSource.js";
import { GEXFDataSource } from "../../src/data/GEXFDataSource.js";
import { GMLDataSource } from "../../src/data/GMLDataSource.js";
import { GraphMLDataSource } from "../../src/data/GraphMLDataSource.js";
import { JsonDataSource } from "../../src/data/JsonDataSource.js";
import { PajekDataSource } from "../../src/data/PajekDataSource.js";

describe("Standardized error messages", () => {
    test("missing input error format - all DataSources", async () => {
        const sources = [
            new GraphMLDataSource({}),
            new GMLDataSource({}),
            new DOTDataSource({}),
            new GEXFDataSource({}),
            new PajekDataSource({}),
            new CSVDataSource({}),
        ];

        for (const source of sources) {
            let errorThrown = false;
            try {
                 
                for await (const _chunk of source.getData()) {
                    // Should not get here
                }
            } catch (error) {
                errorThrown = true;
                assert.match(
                    (error as Error).message,
                    /DataSource requires data, file, or url/,
                    `Expected standardized error message for ${source.constructor.name}`,
                );
            }
            assert.strictEqual(errorThrown, true, `Expected error to be thrown for ${source.constructor.name}`);
        }
    });

    test("missing input error format - JsonDataSource", async () => {
        const source = new JsonDataSource({});
        let errorThrown = false;

        try {
             
            for await (const _chunk of source.getData()) {
                // Should not get here
            }
        } catch (error) {
            errorThrown = true;
            assert.match((error as Error).message, /DataSource requires data, file, or url/);
        }
        assert.strictEqual(errorThrown, true, "Expected error to be thrown");
    });

    // fetch is stubbed rather than pointed at an unreachable host: the retry
    // path sleeps 1s then 2s between three attempts, which left under two
    // seconds for three real DNS lookups and made the test fail on a slow
    // resolver. Stubbing also lets us assert the attempt count directly.
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    test("network error includes retry count", async () => {
        const fetchMock = vi.fn().mockRejectedValue(new TypeError("fetch failed"));
        vi.stubGlobal("fetch", fetchMock);

        const source = new GraphMLDataSource({url: "http://graphty.invalid/graph.graphml"});
        let errorThrown = false;

        try {
             
            for await (const _chunk of source.getData()) {
                // Should not get here
            }
        } catch (error) {
            errorThrown = true;
            assert.match((error as Error).message, /Failed to fetch .* after 3 attempts/);
        }
        assert.strictEqual(errorThrown, true, "Expected error to be thrown");
        assert.strictEqual(fetchMock.mock.calls.length, 3, "Expected three fetch attempts");
    }, 10000);
});
