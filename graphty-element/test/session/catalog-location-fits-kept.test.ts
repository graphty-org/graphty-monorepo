/**
 * @file `catalog.optionsFor("location-map")` reads the node columns once while they stand (issue
 * #10296): the graphty app asks again on every project event, and each answer read every node
 * column and guessed which hold locations.
 */

import { assert, describe, it } from "vitest";

import { createSessionCatalog } from "../../src/session/catalog";

describe("catalog.optionsFor keeps its location column reading", () => {
    it("reads the columns once per columns revision", async () => {
        let reads = 0;
        let revision = 0;
        const catalog = createSessionCatalog({
            algorithms: () => [],
            estimate: () => ({}) as never,
            runs: () => [],
            resolve: () => ({ resolution: {}, graph: {} }) as never,
            attributes: () => [
                { name: "lat", kind: "node", plainName: "Lat" },
                { name: "lon", kind: "node", plainName: "Lon" },
            ] as never,
            nodeValues: (path) => {
                reads++;
                return path === "lat" ? [40.7, 51.5] : [-74, -0.1];
            },
            columnsRevision: () => revision,
        });

        const first = await catalog.optionsFor("location-map");
        const once = reads;
        assert.isAbove(once, 0);
        assert.deepEqual(await catalog.optionsFor("location-map"), first, "the same answer");
        assert.strictEqual(reads, once, "a second answer reads no column");

        revision++;
        await catalog.optionsFor("location-map");
        assert.strictEqual(reads, once * 2, "a moved revision reads them again");
    });
});
