/**
 * The `bolt` transport with neo4j-driver mocked at the module boundary: a small keyset-paging
 * server built from the driver's own Node, Relationship, Path, Record and Integer classes, acting as
 * Neo4j 3.5 (Hetionet's version, so ids are `id(n)`). Covers the conformance suite, READ
 * auto-commit sessions, lossless integers, the scheme and TLS rules for credentials, coded errors
 * and the signal closing the session.
 */

import { describe, expect, it, vi } from "vitest";

import { credentials, loadFromSource } from "../../../src/index.js";
import { neo4jSource } from "../../../src/sources/cypher/index.js";
import { runSourceConformance } from "../harness.js";
import { rejection } from "../helpers.js";

const fake = vi.hoisted(() => {
    type Neo = typeof import("neo4j-driver").default;
    const state = {
        neo: null as Neo | null,
        drivers: [] as { url: string; auth: unknown; config: unknown; closed: boolean }[],
        sessions: [] as {
            config: unknown;
            closed: boolean;
            runs: { statement: string; params: unknown; tx: unknown }[];
        }[],
        onRun: null as null | (() => void),
    };
    return state;
});

vi.mock("neo4j-driver", async (importActual) => {
    const real = (await importActual<{ default: typeof import("neo4j-driver").default }>()).default;
    fake.neo = real;
    const { int, Record } = real;
    const { Node, Relationship, Path, PathSegment } = real.types;
    const nodes = [1, 2, 3].map(
        (i) => new Node(int(i), ["Gene"], { name: `G${String(i)}`, big: int("9007199254740993") }, String(i)),
    );
    const rels = [
        new Relationship(int(10), int(1), int(2), "BINDS", {}, "10", "1", "2"),
        new Relationship(int(11), int(2), int(3), "BINDS", {}, "11", "2", "3"),
    ];
    const degree = (id: number): number =>
        rels.filter((r) => r.start.toNumber() === id || r.end.toNumber() === id).length;
    const page = <T>(items: readonly T[], key: (t: T) => number, statement: string, after: unknown): T[] => {
        const limit = Number(/LIMIT (\d+)/.exec(statement)?.[1] ?? 1000);
        return items.filter((t) => after === undefined || key(t) > Number(after)).slice(0, limit);
    };
    const run = (statement: string, params: { after?: unknown; ids?: string[] }): Promise<unknown[]> => {
        if (statement === "HANG") {
            return new Promise(() => undefined);
        }
        if (statement.startsWith("FAIL")) {
            return Promise.reject(
                Object.assign(new Error("Invalid input 'X' (line 1, column 3 (offset: 2))"), {
                    code: "Neo.ClientError.Statement.SyntaxError",
                }),
            );
        }
        if (statement.startsWith("DOWN")) {
            return Promise.reject(
                Object.assign(new Error("Could not perform discovery"), { code: "ServiceUnavailable" }),
            );
        }
        if (statement.startsWith("MATCH (n)")) {
            const rows = page(nodes, (n) => n.identity.toNumber(), statement, params.after);
            return Promise.resolve(
                rows.map(
                    (n) => new Record(["n", "key", "degree"], [n, n.identity, int(degree(n.identity.toNumber()))]),
                ),
            );
        }
        if (statement.startsWith("MATCH (a)-[r]")) {
            const rows = page(rels, (r) => r.identity.toNumber(), statement, params.after);
            return Promise.resolve(
                rows.map(
                    (r) =>
                        new Record(
                            ["a", "r", "b", "key"],
                            [nodes[r.start.toNumber() - 1], r, nodes[r.end.toNumber() - 1], r.identity],
                        ),
                ),
            );
        }
        if (statement.includes("IN $ids")) {
            const seed = nodes.find((n) => params.ids?.includes(n.properties.name)) ?? nodes[0];
            return Promise.resolve(
                rels
                    .filter((r) => r.start.equals(seed.identity) || r.end.equals(seed.identity))
                    .map((r) => {
                        const other = nodes[(r.start.equals(seed.identity) ? r.end : r.start).toNumber() - 1];
                        const path = new Path(seed, other, [new PathSegment(seed, r, other)]);
                        return new Record(
                            ["s", "p", "degrees"],
                            [seed, path, [[seed.properties.name, int(degree(seed.identity.toNumber()))]]],
                        );
                    }),
            );
        }
        return Promise.resolve(nodes.map((n) => new Record(["n"], [n])));
    };
    const driver = (url: string, auth: unknown, config: unknown): unknown => {
        const d = { url, auth, config, closed: false };
        fake.drivers.push(d);
        return {
            session: (cfg: unknown) => {
                const s = {
                    config: cfg,
                    closed: false,
                    runs: [] as { statement: string; params: unknown; tx: unknown }[],
                };
                fake.sessions.push(s);
                let release: ((err: Error) => void) | null = null;
                return {
                    run: async (statement: string, p: { after?: unknown }, tx: unknown) => {
                        s.runs.push({ statement, params: p, tx });
                        fake.onRun?.();
                        const pending = run(statement, p);
                        const records =
                            statement === "HANG"
                                ? await new Promise<unknown[]>((_, reject) => {
                                      release = reject;
                                  })
                                : await pending;
                        return { records };
                    },
                    close: () => {
                        s.closed = true;
                        release?.(Object.assign(new Error("closed"), { code: "ServiceUnavailable" }));
                        return Promise.resolve();
                    },
                };
            },
            getServerInfo: () => Promise.resolve({ agent: "Neo4j/3.5.12", protocolVersion: 3 }),
            close: () => {
                d.closed = true;
                return Promise.resolve();
            },
        };
    };
    return { default: { ...real, driver } };
});

const ENDPOINT = "bolt+s://graph.example.com:7687";

describe("cypher over Bolt (neo4j-driver mocked)", () => {
    it("loads everything in READ auto-commit sessions, keyed by id(n) on Neo4j 3.5", async () => {
        const before = fake.sessions.length;
        const { snapshot, report } = await loadFromSource(
            "neo4j",
            { mode: "all", pageSize: 2 },
            { endpoint: ENDPOINT },
        );
        expect([...snapshot.ids].sort()).toEqual(["1", "2", "3"]);
        expect(snapshot.edgeCount).toBe(2);
        expect(report.source?.server).toEqual({
            product: "Neo4j",
            profile: "neo4j",
            readOnly: "enforced",
            version: "3.5.12",
        });
        const session = fake.sessions[before];
        expect(session.config).toEqual({ defaultAccessMode: "READ" });
        expect(session.runs.map((r) => r.statement.slice(0, 40))).toEqual([
            "MATCH (n) RETURN count(n) AS c",
            "MATCH (n) WITH n, id(n) AS key RETURN n,",
            "MATCH (n) WITH n, id(n) AS key WHERE key",
            "MATCH (a)-[r]->(b) WITH a, r, b, id(r) A",
            "MATCH (a)-[r]->(b) WITH a, r, b, id(r) A",
        ]);
        expect(session.closed).toBe(true);
        expect(fake.drivers.at(-1)).toMatchObject({ url: ENDPOINT, auth: undefined, closed: true });
    });

    it("keeps a 2^53 + 1 property exact under long: string", async () => {
        const { snapshot } = await loadFromSource(
            "neo4j",
            { query: "MATCH (n) RETURN n", long: "string" },
            { endpoint: ENDPOINT },
        );
        expect(snapshot.nodes.value("big", 0)).toBe("9007199254740993");
    });

    it("loads a neighborhood by an id property, with the degree hint", async () => {
        const { snapshot } = await loadFromSource(
            "neo4j",
            { mode: "neighborhood", idProperty: "name", ids: ["G2"], depth: 1 },
            { endpoint: ENDPOINT },
        );
        expect([...snapshot.ids].sort()).toEqual(["G1", "G2", "G3"]);
        expect(snapshot.nodes.value("_source.degree", snapshot.ids.requireIndex("G2"))).toBe(2);
        expect(fake.sessions.at(-1)?.runs[0].statement).toContain("s.`name` IN $ids");
    });

    it("hands a basic or bearer credential to the driver, bound to the endpoint", async () => {
        await loadFromSource(
            "neo4j",
            { query: "MATCH (n) RETURN n" },
            { endpoint: ENDPOINT, credential: credentials.basic("neo4j", "pw") },
        );
        expect(fake.drivers.at(-1)?.auth).toEqual({
            scheme: "basic",
            principal: "neo4j",
            credentials: "pw",
            realm: undefined,
        });
        await loadFromSource(
            "neo4j",
            { query: "MATCH (n) RETURN n" },
            { endpoint: ENDPOINT, credential: credentials.bearer(() => Promise.resolve("tok")) },
        );
        expect(fake.drivers.at(-1)?.auth).toMatchObject({ scheme: "bearer", credentials: "tok" });
        await loadFromSource(
            "neo4j",
            { query: "MATCH (n) RETURN n" },
            {
                endpoint: ENDPOINT,
                credential: credentials.basic("u", "p", { origins: ["bolt+s://other.example.com:7687"] }),
            },
        );
        expect(fake.drivers.at(-1)?.auth).toBeUndefined();
    });

    it("refuses routing schemes, +ssc with a credential and plain bolt with one", async () => {
        const params = { query: "MATCH (n) RETURN n" };
        const cred = credentials.basic("u", "p");
        const reason = async (endpoint: string, withCredential: boolean): Promise<unknown> =>
            (
                await rejection(
                    loadFromSource("neo4j", params, { endpoint, credential: withCredential ? cred : undefined }),
                )
            ).issue?.params;
        expect(await reason("neo4j+s://graph.example.com:7687", false)).toEqual({
            name: "endpoint",
            reason: "routing",
        });
        expect(await reason("bolt+ssc://graph.example.com:7687", true)).toEqual({
            name: "endpoint",
            reason: "unverified-tls",
        });
        expect(await reason("bolt://graph.example.com:7687", true)).toEqual({
            name: "endpoint",
            reason: "insecure-endpoint",
        });
        await expect(
            loadFromSource("neo4j", params, { endpoint: "bolt://localhost:7687", credential: cred }),
        ).resolves.toBeDefined();
        await expect(
            loadFromSource("neo4j", params, { endpoint: "bolt+ssc://graph.example.com:7687" }),
        ).resolves.toBeDefined();
    });

    it("codes a query error with its position, and an unreachable server", async () => {
        const err = await rejection(loadFromSource("neo4j", { query: "FAIL" }, { endpoint: ENDPOINT }));
        expect(err.issue?.params).toMatchObject({
            serverCode: "Neo.ClientError.Statement.SyntaxError",
            line: 1,
            column: 3,
        });
        const down = await rejection(loadFromSource("neo4j", { query: "DOWN" }, { endpoint: ENDPOINT }));
        expect(down.issue?.code).toBe("E_FETCH");
        expect(down.issue?.params).toEqual({ url: "bolt+s://graph.example.com:7687", status: null });
    });

    it("sends timeoutMs as the transaction timeout, and the signal closes the session", async () => {
        await loadFromSource(
            "neo4j",
            { query: "MATCH (n) RETURN n" },
            { endpoint: ENDPOINT, limits: { timeoutMs: 5000 } },
        );
        expect(fake.sessions.at(-1)?.runs[0].tx).toEqual({ timeout: 5000 });

        const controller = new AbortController();
        const reason = new Error("reader cancelled");
        const started = new Promise<void>((resolve) => {
            fake.onRun = resolve;
        });
        const load = loadFromSource("neo4j", { query: "HANG" }, { endpoint: ENDPOINT, signal: controller.signal });
        await started;
        fake.onRun = null;
        controller.abort(reason);
        await expect(load).rejects.toBe(reason);
        expect(fake.sessions.at(-1)?.closed).toBe(true);
        expect(fake.drivers.at(-1)?.closed).toBe(true);
    });
});

runSourceConformance(neo4jSource, [
    {
        name: "bolt, everything",
        params: { mode: "all", pageSize: 2 },
        endpoint: ENDPOINT,
        recordings: [],
        cap: { maxNodes: 1 },
    },
    { name: "bolt, a query error", params: { query: "FAIL" }, endpoint: ENDPOINT, recordings: [] },
]);
