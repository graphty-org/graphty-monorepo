/**
 * The records path: one batch or pages, idPrefix, missing nodes, edge ids, graph facts, caps
 * between pages with an exact resume, stale cursors, a later page's 401, params checks, and the
 * runtime and secure-context refusals.
 */

import { describe, expect, it, vi } from "vitest";

import {
    credentials,
    defineSource,
    type GraphSource,
    loadFromSource,
    type RecordBatch,
    replayFetch,
    type SourceCursor,
} from "../../src/index.js";
import { rejection } from "./helpers.js";

/** A paged source: page n holds nodes n*2 and n*2+1 and an edge between them; three pages. */
const paged: GraphSource<{ pages?: number }> = defineSource<{ pages?: number }>({
    id: "paged",
    descriptor: {
        plainName: "Paged",
        version: 2,
        params: [{ name: "pages", plainName: "Pages", type: "integer", default: 3, min: 1 }],
    },
    async *records(params, ctx) {
        let page = Number(ctx.cursor?.page ?? 0);
        const last = (params.pages ?? 3) - 1;
        while (page <= last) {
            const batch: RecordBatch = {
                nodes: [{ id: page * 2 }, { id: page * 2 + 1 }],
                edges: [{ source: page * 2, target: page * 2 + 1, id: `e${String(page)}` }],
                next: page < last ? { page: page + 1 } : null,
            };
            yield await Promise.resolve(batch);
            page++;
        }
    },
});

describe("records sources", () => {
    it("loads one batch, adding the nodes edges name", async () => {
        const one = defineSource({
            id: "one",
            records: () =>
                Promise.resolve({
                    nodes: [{ id: "a", name: "Ana" }],
                    edges: [{ source: "a", target: "b", since: 2020 }],
                    meta: { name: "friends", directed: false, origin: "test" },
                }),
        });
        const { snapshot, report, format } = await loadFromSource(one, {});
        expect([snapshot.nodeCount, snapshot.edgeCount, snapshot.directed, format]).toEqual([
            2,
            1,
            false,
            "source:one",
        ]);
        expect(snapshot.meta.name).toBe("friends");
        expect(report.source).toMatchObject({ id: "one", version: 1, endpoint: null, next: null, requests: 0 });
    });

    it("prefixes every node id with idPrefix and keeps edge ids", async () => {
        const { snapshot } = await loadFromSource(paged, { pages: 1 }, { idPrefix: "p:" });
        expect([...snapshot.ids].map(String).sort()).toEqual(["p:0", "p:1"]);
        expect(snapshot.edges.byRole("id")?.value(0)).toBe("e0");
    });

    it("writes every page of an async iterable and reports item progress", async () => {
        const progress: number[] = [];
        const { snapshot, report } = await loadFromSource(paged, {}, { onProgress: (d) => progress.push(d) });
        expect([snapshot.nodeCount, snapshot.edgeCount]).toEqual([6, 3]);
        expect(progress).toEqual([3, 6, 9]);
        expect(report.source?.next).toBeNull();
    });

    it("stops between pages at a cap, warns, and resumes exactly from the cursor", async () => {
        const first = await loadFromSource(paged, {}, { limits: { maxNodes: 2 } });
        expect(first.snapshot.nodeCount).toBe(2);
        expect(first.report.issues.map((i) => [i.code, i.params])).toEqual([
            ["W_SOURCE_LIMIT", { limit: "maxNodes", value: 2 }],
        ]);
        const next = first.report.source?.next as SourceCursor;
        expect(next).toEqual({ page: 1, "~v": 2 });
        const rest = await loadFromSource(paged, {}, { cursor: next });
        expect([...rest.snapshot.ids].sort()).toEqual([2, 3, 4, 5]);
    });

    it("fails with E_SOURCE_LIMIT under onLimit error", async () => {
        const err = await rejection(loadFromSource(paged, {}, { limits: { maxEdges: 1, onLimit: "error" } }));
        expect(err.issue?.code).toBe("E_SOURCE_LIMIT");
        expect(err.issue?.params).toEqual({ limit: "maxEdges", value: 1 });
        expect(err.report.source?.id).toBe("paged");
    });

    it("refuses a cursor from another version of the source", async () => {
        const err = await rejection(loadFromSource(paged, {}, { cursor: { page: 1, "~v": 1 } }));
        expect(err.issue?.params).toEqual({ name: "cursor", reason: "stale-cursor" });
    });

    it("checks params against the descriptor before any request", async () => {
        const fetch = replayFetch([]);
        const err = await rejection(loadFromSource(paged, { pages: 0 }, { fetch }));
        expect(err.issue?.params).toEqual({ name: "pages", reason: "range" });
        expect((await rejection(loadFromSource(paged, { pages: 1.5 }))).issue?.params).toEqual({
            name: "pages",
            reason: "type",
        });
        expect(fetch.calls).toHaveLength(0);
    });

    it("keeps the pages before a later page's 401 and warns W_SOURCE_AUTH", async () => {
        const api = "https://api.example.com";
        const fetch = replayFetch([
            { url: `${api}/items?page=0`, body: { items: ["a", "b"], next: 1 } },
            { url: `${api}/items?page=1`, status: 401 },
        ]);
        const keyed = defineSource({
            id: "keyed",
            async *records(_params: Record<string, never>, ctx) {
                let page: number | null = Number(ctx.cursor?.page ?? 0);
                while (page !== null) {
                    const body: { items: string[]; next: number | null } = await ctx.fetchJson(
                        `/items?page=${String(page)}`,
                    );
                    yield {
                        nodes: body.items.map((id) => ({ id })),
                        next: body.next === null ? null : { page: body.next },
                    };
                    page = body.next;
                }
            },
        });
        const { snapshot, report } = await loadFromSource(keyed, {}, { endpoint: api, fetch });
        expect(snapshot.nodeCount).toBe(2);
        expect(report.errorCount).toBe(0);
        expect(report.issues.map((i) => [i.code, i.params])).toEqual([["W_SOURCE_AUTH", { origin: api, status: 401 }]]);
        expect(report.source?.next).toEqual({ page: 1, "~v": 1 });
        expect(report.source?.requests).toBe(2);
    });

    it("fails a first page's 401 with E_SOURCE_AUTH and the origin that asked", async () => {
        const api = "https://api.example.com";
        const fetch = replayFetch([{ url: `${api}/items?page=0`, status: 401 }]);
        const keyed = defineSource({
            id: "first",
            records: (_p: Record<string, never>, ctx) => ctx.fetchJson<RecordBatch>("/items?page=0"),
        });
        const err = await rejection(loadFromSource(keyed, {}, { endpoint: api, fetch }));
        expect(err.issue?.params).toMatchObject({ origin: api, status: 401 });
    });

    it("refuses a credential with no endpoint and no origins", async () => {
        const err = await rejection(loadFromSource(paged, {}, { credential: credentials.bearer("t") }));
        expect(err.issue?.params).toEqual({ name: "credential", reason: "credential-unbound" });
    });

    it("refuses a runtime the descriptor marks unsupported, before any request", async () => {
        const nodeOnly = defineSource({
            id: "browser-only",
            descriptor: {
                plainName: "B",
                params: [],
                runtimes: { node: { supported: false, reason: "needs-websocket" } },
            },
            records: () => Promise.resolve({}),
        });
        const err = await rejection(loadFromSource(nodeOnly, {}));
        expect(err.issue?.code).toBe("E_SOURCE_RUNTIME");
        expect(err.issue?.params).toEqual({ runtime: "node", reason: "needs-websocket" });
    });

    it("rejects with the caller's reason when the signal aborts between pages", async () => {
        const controller = new AbortController();
        const stopping = defineSource({
            id: "stopping",
            async *records() {
                yield await Promise.resolve({ nodes: [{ id: 1 }] });
                controller.abort("enough");
                yield { nodes: [{ id: 2 }] };
            },
        });
        await expect(loadFromSource(stopping, {}, { signal: controller.signal })).rejects.toBe("enough");
    });

    it("skips a record without an id and keeps going", async () => {
        const bad = defineSource({
            id: "bad",
            records: () => Promise.resolve({ nodes: [{ name: "x" } as never, { id: 1 }] }),
        });
        const { snapshot, report } = await loadFromSource(bad, {});
        expect(snapshot.nodeCount).toBe(1);
        expect(report.counts.skippedNodes).toBe(1);
    });

    it("never calls the global fetch", async () => {
        const spy = vi.spyOn(globalThis, "fetch");
        const fetch = replayFetch([{ url: "https://api.example.com/items?page=0", body: { nodes: [{ id: 1 }] } }]);
        const viaCtx = defineSource({
            id: "via-ctx",
            records: (_p: Record<string, never>, ctx) => ctx.fetchJson<RecordBatch>("/items?page=0"),
        });
        await loadFromSource(viaCtx, {}, { endpoint: "https://api.example.com", fetch });
        expect(spy).not.toHaveBeenCalled();
        spy.mockRestore();
    });
});
