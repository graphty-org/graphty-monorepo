/**
 * Without the optional peer neo4j-driver, the bolt transport fails with E_SOURCE_RUNTIME
 * (`reason: "needs-peer-dependency"`) naming the package, and the Query API still works.
 */

import { describe, expect, it, vi } from "vitest";

import { loadFromSource, replayFetch } from "../../../src/index.js";
import { rejection } from "../helpers.js";

vi.mock("neo4j-driver", () => {
    throw new Error("Cannot find package 'neo4j-driver'");
});

describe("bolt without neo4j-driver", () => {
    it("names the missing peer dependency", async () => {
        const err = await rejection(
            loadFromSource("neo4j", { query: "MATCH (n) RETURN n" }, { endpoint: "bolt+s://db.example.com:7687" }),
        );
        expect(err.issue?.code).toBe("E_SOURCE_RUNTIME");
        expect(err.issue?.params).toEqual({
            runtime: "node",
            reason: "needs-peer-dependency",
            package: "neo4j-driver",
        });
    });

    it("leaves the Query API working", async () => {
        const endpoint = "https://db.example.com";
        const fetch = replayFetch([
            { method: "POST", url: `${endpoint}/db/neo4j/query/v2`, body: { data: { fields: ["n"], values: [] } } },
        ]);
        const { snapshot } = await loadFromSource("neo4j", { query: "MATCH (n) RETURN n" }, { endpoint, fetch });
        expect(snapshot.nodeCount).toBe(0);
    });
});
