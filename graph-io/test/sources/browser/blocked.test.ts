/**
 * In Chromium: a source reaches a service that allows the page, and a refused request is
 * E_SOURCE_BLOCKED with the cause ctx.fetch could tell (CORS, unreachable), never a bare TypeError.
 */

import { credentials, defineSource, ImportError, loadFromSource, type RecordBatch } from "@graphty/graph-io";
import { describe, expect, inject, it } from "vitest";

const remote = defineSource({
    id: "remote",
    records: (params: { path: string }, ctx) => ctx.fetchJson<RecordBatch>(params.path),
});

/**
 * The issue a load fails with.
 * @param promise - the load
 * @returns the issue's code and params
 */
async function failure(promise: Promise<unknown>): Promise<{ code: unknown; params: unknown }> {
    const err: unknown = await promise.then(
        () => null,
        (e: unknown) => e,
    );
    expect(err).toBeInstanceOf(ImportError);
    return { code: (err as ImportError).issue?.code, params: (err as ImportError).issue?.params };
}

describe("network sources in a browser", () => {
    const server = inject("corsServer");

    it("runs in the browser runtime and loads from a service that sends CORS headers", async () => {
        let runtime = "";
        const probe = defineSource({
            id: "probe",
            records: (_p: Record<string, never>, ctx) => {
                ({ runtime } = ctx);
                return ctx.fetchJson<RecordBatch>("/cors/graph");
            },
        });
        const { snapshot } = await loadFromSource(probe, {}, { endpoint: server });
        expect([runtime, snapshot.nodeCount, snapshot.edgeCount]).toEqual(["browser", 2, 1]);
    });

    it("sends a credential to a loopback service over plain http, through the preflight", async () => {
        const echo = defineSource({
            id: "echo",
            async records(_p: Record<string, never>, ctx) {
                const body = await ctx.fetchJson<RecordBatch & { auth: string | null }>("/cors/graph");
                return { nodes: [{ id: body.auth ?? "none" }] };
            },
        });
        const { snapshot } = await loadFromSource(
            echo,
            {},
            { endpoint: server, credential: credentials.bearer("t0k") },
        );
        expect([...snapshot.ids]).toEqual(["Bearer t0k"]);
    });

    it("reports a refusal for missing CORS headers as E_SOURCE_BLOCKED, cause cors", async () => {
        const { code, params } = await failure(
            loadFromSource(remote, { path: "/plain/graph" }, { endpoint: server, retry: { baseDelayMs: 1 } }),
        );
        expect(code).toBe("E_SOURCE_BLOCKED");
        expect(params).toEqual({ url: `${server}/plain/graph`, cause: "cors" });
    });

    it("refuses a redirect of a credentialed request as E_SOURCE_REDIRECT, without following it", async () => {
        const { code, params } = await failure(
            loadFromSource(
                remote,
                { path: "/cors/redirect" },
                { endpoint: server, credential: credentials.bearer("t0k"), retry: { baseDelayMs: 1 } },
            ),
        );
        expect(code).toBe("E_SOURCE_REDIRECT");
        expect(params).toEqual({ from: `${server}/cors/redirect`, to: null });
    });

    it("reports a port nothing listens on as E_SOURCE_BLOCKED, cause unreachable", async () => {
        const dead = inject("deadServer");
        const { code, params } = await failure(loadFromSource(remote, { path: "/cors/graph" }, { endpoint: dead }));
        expect(code).toBe("E_SOURCE_BLOCKED");
        expect(params).toEqual({ url: `${dead}/cors/graph`, cause: "unreachable" });
    });

    it("rejects with the signal's reason, not the browser's own AbortError", async () => {
        const controller = new AbortController();
        const slow = defineSource({
            id: "slow",
            records: (_p: Record<string, never>, ctx) => {
                const pending = ctx.fetchJson<RecordBatch>("/cors/graph");
                controller.abort("reader cancelled");
                return pending;
            },
        });
        await expect(loadFromSource(slow, {}, { endpoint: server, signal: controller.signal })).rejects.toBe(
            "reader cancelled",
        );
    });
});
