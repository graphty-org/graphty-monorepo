import { describe, expect, it } from "vitest";

import { expire, heartbeat, move, newJob } from "../lib/board.mjs";
import { createMcpServer, servedProtocols, TOOL_PROTOCOL } from "../lib/mcp.mjs";
import { sessionToolSet } from "../lib/session-tools.mjs";

const STARTED = new Date("2026-10-04T12:00:00Z");
/** The daemon after a self-update that changed the tools' schemas. */
const NEW = TOOL_PROTOCOL + 1;
/** The protocol of a session that started before that update. */
const OLD = TOOL_PROTOCOL;

/**
 * A daemon state with one worker session, `w1`, holding job `pr-7` with nonce `n1`.
 * @returns {any} the state
 */
function workerState() {
    const job = newJob({ kind: "pr", target: "#7", id: "pr-7" }, STARTED);
    move(job, "starting", STARTED, { holder: { session: "w1", nonce: "n1" } });
    move(job, "working", STARTED);
    job.worktree = "/work/x";
    job.pr = 7;
    const state = { jobs: { "pr-7": job }, master: { lanes: {} } };
    heartbeat(state, { session: "w1", cwd: "/work/x" }, STARTED);
    return state;
}

/**
 * The new daemon's session MCP server, wired as the daemon wires it.
 * @param {any} state the daemon state
 * @returns {ReturnType<typeof createMcpServer>} the server
 */
function newDaemon(state) {
    const ctx = {
        state,
        config: { repo: "o/r" },
        now: STARTED,
        status: { config: {}, now: STARTED, startedAt: STARTED, version: "0.2.0", mode: "dry-run" },
        push: { request: async () => ({ queued: true }) },
        github: {
            get: async (/** @type {string} */ path) => {
                throw new Error(`unexpected GET ${path}`);
            },
        },
        snapshotFacts: () => ({ ownerSessions: [] }),
        commit: async () => {},
        uid: 1000,
    };
    return createMcpServer({
        serverInfo: { name: "githerd", version: "0.2.0" },
        protocols: () => servedProtocols(state.sessions, NEW),
        tools: () => sessionToolSet(ctx),
    });
}

/**
 * Calls a tool as worker `w1` in a given protocol.
 * @param {ReturnType<typeof createMcpServer>} server the daemon's server
 * @param {number} protocol the client's protocol
 * @param {string} name the tool
 * @param {object} args the arguments
 * @returns {Promise<{text: string, isError: boolean}>} the result
 */
async function call(server, protocol, name, args) {
    const res = await server.handle(
        {
            jsonrpc: "2.0",
            id: 1,
            method: "tools/call",
            params: {
                name,
                arguments: args,
                _meta: { githerd: { protocol, session: "w1", job: "pr-7", nonce: "n1" } },
            },
        },
        { session: "w1" },
    );
    const result = /** @type {any} */ (res?.result);
    return { text: result.content[0].text, isError: Boolean(result.isError) };
}

describe("servedProtocols", () => {
    it("serves only the current protocol when every live session speaks it, or there is none", () => {
        expect(servedProtocols(undefined, NEW)).toEqual([NEW]);
        expect(servedProtocols({ a: { protocol: NEW } }, NEW)).toEqual([NEW]);
    });

    it("serves the previous protocol too while a session speaks it or has not said", () => {
        expect(servedProtocols({ a: { protocol: NEW }, b: { protocol: OLD } }, NEW)).toEqual([NEW, OLD]);
        expect(servedProtocols({ a: {} }, NEW)).toEqual([NEW, OLD]);
    });

    it("never serves a protocol below 1", () => {
        expect(servedProtocols({ a: {} }, 1)).toEqual([1]);
    });
});

describe("an old client against a new daemon", () => {
    it("is served while its session lives, and its protocol is recorded", async () => {
        const state = workerState();
        const server = newDaemon(state);
        const status = await call(server, OLD, "githerd_status", { section: "jobs" });
        expect(status.isError).toBe(false);
        expect(state.sessions.w1.protocol).toBe(OLD);
        expect(servedProtocols(state.sessions, NEW)).toEqual([NEW, OLD]);
    });

    it("is refused as a mismatch, not an attempt, when the new schemas reject its arguments", async () => {
        const state = workerState();
        const before = structuredClone(state.jobs);
        const done = await call(newDaemon(state), OLD, "githerd_done", { job: "pr-7" });
        expect(done.isError).toBe(true);
        expect(done.text.startsWith("protocol mismatch: invalid arguments: ")).toBe(true);
        expect(
            done.text.endsWith(
                `this client speaks ${OLD}, older than the daemon's ${NEW}; nothing was done and this call is not an attempt`,
            ),
        ).toBe(true);
        expect(state.jobs).toEqual(before);
    });

    it("gets the plain validation error when it speaks the current protocol", async () => {
        const state = workerState();
        const done = await call(newDaemon(state), NEW, "githerd_done", { job: "pr-7" });
        expect(done).toMatchObject({ isError: true, text: expect.stringMatching(/^invalid arguments: /) });
    });

    it("is refused, and charged nothing, once every old session has ended", async () => {
        const state = workerState();
        const server = newDaemon(state);
        await call(server, NEW, "githerd_status", {});
        expect(servedProtocols(state.sessions, NEW)).toEqual([NEW]);
        const before = structuredClone(state.jobs);
        const late = await call(server, OLD, "githerd_done", { job: "pr-7", outcome: "done", summary: "x" });
        expect(late).toEqual({
            text: `protocol mismatch: this client speaks ${OLD}, the daemon serves ${NEW}; nothing was done and this call is not an attempt`,
            isError: true,
        });
        expect(state.jobs).toEqual(before);
    });

    it("stops being served when its session is gone", () => {
        const state = workerState();
        state.sessions.w1.protocol = OLD;
        expect(servedProtocols(state.sessions, NEW)).toEqual([NEW, OLD]);
        expire(state, new Date(STARTED.getTime() + 20 * 60_000), STARTED);
        expect(servedProtocols(state.sessions, NEW)).toEqual([NEW]);
    });
});
