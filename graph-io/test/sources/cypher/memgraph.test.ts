/**
 * The `memgraph` preset and Bolt against Memgraph, with neo4j-driver mocked at the module boundary
 * (no network): a server that names itself as Memgraph does, the loopback-only endpoint, encryption
 * off for a plain `bolt:` endpoint, and the cause of a browser's refused connection, decided by the
 * page's and the target's addresses and the Permissions API.
 */

import { afterEach, describe, expect, it, vi } from "vitest";

import { loadFromSource } from "../../../src/index.js";
import { memgraphSource } from "../../../src/sources/cypher/index.js";
import { boltTransport } from "../../../src/sources/cypher/transports/bolt.js";
import { bareContext, rejection } from "../helpers.js";

const fake = vi.hoisted(() => ({
    down: false,
    drivers: [] as { url: string; config: unknown }[],
    statements: [] as string[],
    params: [] as unknown[],
}));

vi.mock("neo4j-driver", async (importActual) => {
    const real = (await importActual<{ default: typeof import("neo4j-driver").default }>()).default;
    const { int, Record } = real;
    const { Node, Relationship } = real.types;
    const nodes = [new Node(int(0), ["City"], { name: "A" }), new Node(int(1), ["City"], { name: "B" })];
    const rel = new Relationship(int(0), int(0), int(1), "ROAD", {});
    const run = (statement: string): unknown[] => {
        if (statement.startsWith("BAD")) {
            throw Object.assign(new Error("line 1:0 mismatched input 'BAD'"), {
                code: "Memgraph.ClientError.MemgraphError.MemgraphError",
            });
        }
        if (statement.startsWith("MATCH (n)")) {
            return statement.includes("$after") ? [] : nodes.map((n) => new Record(["n", "key"], [n, n.identity]));
        }
        if (statement.startsWith("MATCH (a)-[r]")) {
            return statement.includes("$after")
                ? []
                : [new Record(["a", "r", "b", "key"], [nodes[0], rel, nodes[1], rel.identity])];
        }
        return [new Record(["a", "r", "b"], [nodes[0], rel, nodes[1]])];
    };
    const driver = (url: string, _auth: unknown, config: unknown): unknown => {
        fake.drivers.push({ url, config });
        const unavailable = (): Error =>
            Object.assign(new Error("WebSocket connection failure."), { code: "ServiceUnavailable" });
        return {
            session: () => ({
                run: (statement: string, params: unknown) => {
                    fake.statements.push(statement);
                    fake.params.push(params);
                    if (fake.down) {
                        return Promise.reject(unavailable());
                    }
                    try {
                        return Promise.resolve({ records: run(statement) });
                    } catch (err) {
                        return Promise.reject(err);
                    }
                },
                close: () => Promise.resolve(),
            }),
            getServerInfo: () =>
                fake.down
                    ? Promise.reject(unavailable())
                    : Promise.resolve({ agent: "Neo4j/v5.11.0 compatible graph database server - Memgraph" }),
            close: () => Promise.resolve(),
        };
    };
    return { default: { ...real, driver } };
});

afterEach(() => {
    fake.down = false;
    vi.unstubAllGlobals();
});

describe("the memgraph preset (neo4j-driver mocked)", () => {
    it("reads localhost:7687 over Bolt with encryption off, keyed by id(n), read-only not enforced", async () => {
        const before = fake.statements.length;
        const { snapshot, report } = await loadFromSource(memgraphSource, { mode: "all" });
        expect([...snapshot.ids].sort()).toEqual(["0", "1"]);
        expect(snapshot.edgeCount).toBe(1);
        expect(fake.drivers.at(-1)).toEqual({ url: "bolt://localhost:7687", config: { encrypted: "ENCRYPTION_OFF" } });
        const statements = fake.statements.slice(before);
        expect(statements.some((s) => s.includes("id(n) AS key"))).toBe(true);
        expect(statements.some((s) => s.includes("elementId"))).toBe(false);
        expect(report.source?.server).toEqual({ product: "Memgraph", profile: "memgraph", readOnly: "not-enforced" });
    });

    it("seeds a neighborhood by the integer id(n), however the snapshot spells it", async () => {
        const { snapshot } = await loadFromSource(memgraphSource, { mode: "neighborhood", ids: ["0", 1, "x"] });
        expect(snapshot.nodeCount).toBe(2);
        expect(fake.statements.at(-1)).toContain("id(s) IN $ids");
        expect(fake.params.at(-1)).toEqual({ ids: [0, 1, "x"] });
    });

    it("refuses an endpoint off this machine before connecting", async () => {
        const drivers = fake.drivers.length;
        for (const endpoint of ["bolt://graph.example.com:7687", "bolt://10.0.0.5:7687"]) {
            const err = await rejection(loadFromSource(memgraphSource, { query: "MATCH (n) RETURN n" }, { endpoint }));
            expect(err.issue?.code).toBe("E_SOURCE_PARAM");
            expect(err.issue?.params).toEqual({ name: "endpoint", reason: "not-loopback" });
        }
        expect(fake.drivers).toHaveLength(drivers);
        await loadFromSource(memgraphSource, { query: "MATCH (n) RETURN n" }, { endpoint: "bolt://127.0.0.1:7688" });
        expect(fake.drivers.at(-1)?.url).toBe("bolt://127.0.0.1:7688");
    });

    it("passes Memgraph's message on with a refused query", async () => {
        const err = await rejection(loadFromSource(memgraphSource, { query: "BAD" }));
        expect(err.issue?.code).toBe("E_SOURCE_QUERY");
        expect(err.issue?.params).toMatchObject({
            serverCode: "Memgraph.ClientError.MemgraphError.MemgraphError",
            serverMessage: "line 1:0 mismatched input 'BAD'",
        });
    });
});

describe("a refused Bolt connection in a browser", () => {
    /**
     * The cause of a refused load from a page, with the Permissions API answering `states`.
     * @param pageHost - the page's host
     * @param states - each permission name's state; a missing name rejects, as an unknown one does
     * @param endpoint - the endpoint
     * @returns E_SOURCE_BLOCKED's params
     */
    async function cause(
        pageHost: string,
        states: Readonly<Record<string, string>> | null,
        endpoint = "bolt://localhost:7687",
    ): Promise<unknown> {
        fake.down = true;
        vi.stubGlobal("location", { hostname: pageHost, protocol: "https:" });
        const permissions = {
            query: ({ name }: { name: string }) =>
                name in (states ?? {})
                    ? Promise.resolve({ state: states?.[name] })
                    : Promise.reject(new TypeError(`unknown permission ${name}`)),
        };
        vi.stubGlobal("navigator", states === null ? {} : { permissions });
        const { ctx } = bareContext({}, { runtime: "browser", endpoint });
        const transport = await boltTransport({ ctx, params: {}, m: { long: "f64", report: ctx.report } });
        const err = await rejection(transport.run("MATCH (n) RETURN n", {}));
        await transport.close();
        expect(err.issue?.code).toBe("E_SOURCE_BLOCKED");
        return err.issue?.params;
    }

    it("blames the local network permission when a public page's loopback permission is not granted", async () => {
        const blocked = { url: "bolt://localhost:7687", cause: "local-network" };
        expect(await cause("graphty.app", { "loopback-network": "denied" })).toEqual(blocked);
        expect(await cause("graphty.app", { "loopback-network": "prompt" })).toEqual(blocked);
        // Firefox and Safari answer no local network permission: the addresses decide
        expect(await cause("graphty.app", null)).toEqual(blocked);
        expect(await cause("graphty.app", {})).toEqual(blocked);
        expect(await cause("graphty.app", { "local-network": "denied" }, "bolt+s://192.168.1.4:7687")).toEqual({
            url: "bolt+s://192.168.1.4:7687",
            cause: "local-network",
        });
    });

    it("does not blame it when it is granted, or when the page is itself local", async () => {
        const unknown = { url: "bolt://localhost:7687", cause: "unknown" };
        expect(await cause("graphty.app", { "loopback-network": "granted", "local-network-access": "denied" })).toEqual(
            unknown,
        );
        // an older Chrome knows only local-network-access
        expect(await cause("graphty.app", { "local-network-access": "granted" })).toEqual(unknown);
        expect(await cause("localhost", { "loopback-network": "denied" })).toEqual(unknown);
        expect(await cause("dev.internal", null, "bolt+s://graph.example.com:7687")).toEqual({
            url: "bolt+s://graph.example.com:7687",
            cause: "unknown",
        });
    });
});
