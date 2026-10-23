/**
 * The Cypher source in Chromium: the Query API through a CORS preflight with a credential, and the
 * refusals a page gets before any request -- Neptune (no CORS headers) and long-term AWS keys.
 */

import { credentials, ImportError, loadFromSource } from "@graphty/graph-io";
import { describe, expect, inject, it } from "vitest";

/**
 * The params of the issue a load fails with.
 * @param promise - the load
 * @returns the issue's params
 */
async function refused(promise: Promise<unknown>): Promise<unknown> {
    const err: unknown = await promise.then(
        () => null,
        (e: unknown) => e,
    );
    expect(err).toBeInstanceOf(ImportError);
    return (err as ImportError).issue?.params;
}

describe("cypher in a browser", () => {
    const server = `${inject("corsServer")}/cors/`;

    it("reads a Query API answer through the preflight, sending the credential", async () => {
        const { snapshot } = await loadFromSource(
            "neo4j",
            { query: "MATCH (a)-[r]->(b) RETURN a, r, b" },
            { endpoint: server, credential: credentials.basic("neo4j", "pw") },
        );
        expect([snapshot.nodeCount, snapshot.edgeCount]).toEqual([2, 1]);
        expect(snapshot.edges.value("type", 0)).toBe("KNOWS");
    });

    it("refuses Neptune before any request", async () => {
        expect(await refused(loadFromSource("neptune", { query: "RETURN 1" }, { endpoint: server }))).toEqual({
            runtime: "browser",
            reason: "cors",
        });
        expect(
            await refused(
                loadFromSource("cypher", { query: "RETURN 1", transport: "neptune-https" }, { endpoint: server }),
            ),
        ).toEqual({ runtime: "browser", reason: "cors" });
    });

    it("refuses long-term AWS keys", async () => {
        const credential = credentials.awsSigV4({
            region: "us-east-1",
            credentials: { accessKeyId: "a", secretAccessKey: "s" },
        });
        expect(
            await refused(loadFromSource("cypher", { query: "RETURN 1" }, { endpoint: server, credential })),
        ).toEqual({
            name: "credential",
            reason: "long-term-key",
        });
    });
});
