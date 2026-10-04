import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
    INTERNAL_ERROR,
    INVALID_PARAMS,
    INVALID_REQUEST,
    METHOD_NOT_FOUND,
    PARSE_ERROR,
    PROTOCOL_VERSIONS,
    TOOLS,
    TOOL_PROTOCOL,
    createMcpServer,
    forwardingTools,
    identifySession,
} from "../lib/mcp.mjs";
import { identify } from "../lib/proc.mjs";
import { assertSupported, validate } from "../lib/schema.mjs";

const SERVER_INFO = { name: "githerd", version: "0.1.0" };

/** @type {import("../lib/mcp.mjs").Tool} */
const ECHO = {
    name: "echo",
    description: "Echoes its arguments.",
    inputSchema: {
        type: "object",
        required: ["say"],
        properties: {
            say: { type: "string", maxLength: 10 },
            format: { type: "string", enum: ["text", "json"], default: "text" },
        },
        additionalProperties: false,
    },
    handler: (args, context) => JSON.stringify({ args, context }),
};

/** @type {import("../lib/mcp.mjs").Tool} */
const RUN_ONLY = {
    name: "run_only",
    description: "Visible only to runs.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    handler: async () => ({ text: "refused by policy", isError: true }),
};

/** @type {import("../lib/mcp.mjs").Tool} */
const THROWS = {
    name: "throws",
    description: "Always fails.",
    inputSchema: { type: "object" },
    handler: async () => {
        throw new Error("daemon not reachable");
    },
};

/** @type {import("../lib/mcp.mjs").Tool} */
const OK_RESULT = {
    name: "ok_result",
    description: "Returns a result object.",
    inputSchema: { type: "object" },
    handler: () => ({ text: "fine" }),
};

function server(extra = {}) {
    return createMcpServer({
        serverInfo: SERVER_INFO,
        tools: (context) => (context?.run ? [ECHO, RUN_ONLY, THROWS, OK_RESULT] : [ECHO, THROWS, OK_RESULT]),
        ...extra,
    });
}

/**
 * Builds a JSON-RPC request.
 * @param {string} method the method
 * @param {unknown} [params] its params, omitted when undefined
 * @param {number} [id] the request id
 * @returns {object} the request
 */
function request(method, params, id = 1) {
    return { jsonrpc: "2.0", id, method, ...(params === undefined ? {} : { params }) };
}

describe("initialize", () => {
    it("answers with the tools capability and server info, echoing a supported protocol version", async () => {
        const res = await server().handle(request("initialize", { protocolVersion: "2025-03-26", capabilities: {} }));
        expect(res).toEqual({
            jsonrpc: "2.0",
            id: 1,
            result: { protocolVersion: "2025-03-26", capabilities: { tools: {} }, serverInfo: SERVER_INFO },
        });
    });

    it("offers its newest version for an unknown one, and passes instructions through", async () => {
        const res = await server({ instructions: "Call githerd_status first." }).handle(
            request("initialize", { protocolVersion: "1999-01-01" }),
        );
        expect(res.result).toMatchObject({
            protocolVersion: PROTOCOL_VERSIONS[0],
            instructions: "Call githerd_status first.",
        });
    });
});

describe("ping and unknown methods", () => {
    it("answers ping with an empty result, keeping a string id", async () => {
        expect(await server().handle(request("ping", undefined, /** @type {any} */ ("a")))).toEqual({
            jsonrpc: "2.0",
            id: "a",
            result: {},
        });
    });

    it("answers an unknown method with -32601", async () => {
        const res = await server().handle(request("resources/list"));
        expect(res.error.code).toBe(METHOD_NOT_FOUND);
        expect(res.id).toBe(1);
    });
});

describe("notifications and malformed messages", () => {
    it("does not reply to notifications, known or not", async () => {
        const s = server();
        expect(await s.handle({ jsonrpc: "2.0", method: "notifications/initialized" })).toBeNull();
        expect(
            await s.handle({ jsonrpc: "2.0", method: "notifications/cancelled", params: { requestId: 1 } }),
        ).toBeNull();
        expect(await s.handle({ jsonrpc: "2.0", method: "tools/call", params: { name: "throws" } })).toBeNull();
    });

    it("does not reply to a response sent by the client", async () => {
        expect(await server().handle({ jsonrpc: "2.0", id: 5, result: {} })).toBeNull();
    });

    it("parses JSON text and answers unparseable text with -32700", async () => {
        const s = server();
        expect((await s.handle(JSON.stringify(request("ping")))).result).toEqual({});
        expect(await s.handle("{not json")).toEqual({
            jsonrpc: "2.0",
            id: null,
            error: { code: PARSE_ERROR, message: "parse error" },
        });
    });

    it("answers a non-object or a request without jsonrpc 2.0 with -32600", async () => {
        const s = server();
        expect((await s.handle([request("ping")])).error.code).toBe(INVALID_REQUEST);
        expect((await s.handle(42)).error.code).toBe(INVALID_REQUEST);
        expect(await s.handle({ jsonrpc: "1.0", id: 3, method: "ping" })).toMatchObject({
            id: 3,
            error: { code: INVALID_REQUEST },
        });
        expect(await s.handle({ jsonrpc: "2.0", id: 4, method: 7 })).toMatchObject({
            id: 4,
            error: { code: INVALID_REQUEST },
        });
    });
});

describe("tools/list", () => {
    it("lists the tools visible to the caller's context, with name, description and schema only", async () => {
        const session = await server().handle(request("tools/list"), { session: "s1" });
        expect(session.result.tools.map((t) => t.name)).toEqual(["echo", "throws", "ok_result"]);
        expect(session.result.tools[0]).toEqual({
            name: "echo",
            description: ECHO.description,
            inputSchema: ECHO.inputSchema,
        });
        const run = await server().handle(request("tools/list"), { run: true });
        expect(run.result.tools.map((t) => t.name)).toContain("run_only");
    });

    it("refuses a tool whose schema uses a keyword the validator does not implement", async () => {
        const bad = { ...ECHO, name: "bad", inputSchema: { type: "object", oneOf: [] } };
        const res = await createMcpServer({ serverInfo: SERVER_INFO, tools: () => [bad] }).handle(
            request("tools/call", { name: "bad" }),
        );
        expect(res.error.code).toBe(INTERNAL_ERROR);
        expect(res.error.message).toMatch(/unsupported keyword "oneOf"/);
    });
});

describe("tools/call", () => {
    it("passes validated arguments with defaults filled, and the context, to the handler", async () => {
        const res = await server().handle(request("tools/call", { name: "echo", arguments: { say: "hi" } }), {
            session: "s1",
        });
        expect(res.result).toEqual({
            content: [
                {
                    type: "text",
                    text: JSON.stringify({ args: { say: "hi", format: "text" }, context: { session: "s1" } }),
                },
            ],
        });
    });

    it("returns isError with every validation message, without calling the handler", async () => {
        const res = await server().handle(
            request("tools/call", { name: "echo", arguments: { say: "far too long", x: 1 } }),
        );
        expect(res.result.isError).toBe(true);
        expect(res.result.content[0].text).toBe(
            "invalid arguments: arguments.say: longer than 10 characters; arguments.x: unknown property",
        );
    });

    it("treats missing arguments as an empty object", async () => {
        const res = await server().handle(request("tools/call", { name: "echo" }));
        expect(res.result).toEqual({
            content: [{ type: "text", text: "invalid arguments: arguments.say: required" }],
            isError: true,
        });
    });

    it("turns a thrown error into an isError result", async () => {
        const res = await server().handle(request("tools/call", { name: "throws", arguments: {} }));
        expect(res.result).toEqual({ content: [{ type: "text", text: "daemon not reachable" }], isError: true });
    });

    it("passes through a handler's own isError result and a plain result object", async () => {
        const failed = await server().handle(request("tools/call", { name: "run_only", arguments: {} }), { run: true });
        expect(failed.result).toEqual({ content: [{ type: "text", text: "refused by policy" }], isError: true });
        const ok = await server().handle(request("tools/call", { name: "ok_result" }));
        expect(ok.result).toEqual({ content: [{ type: "text", text: "fine" }] });
    });

    it("answers a tool the caller cannot see with -32602", async () => {
        const res = await server().handle(request("tools/call", { name: "run_only", arguments: {} }), {
            session: "s1",
        });
        expect(res.error).toEqual({ code: INVALID_PARAMS, message: "unknown tool: run_only" });
        expect((await server().handle(request("tools/call"))).error.code).toBe(INVALID_PARAMS);
    });

    it("turns a non-Error throw into its string", async () => {
        const tool = { ...THROWS, name: "raw", handler: () => Promise.reject("plain string") };
        const res = await createMcpServer({ serverInfo: SERVER_INFO, tools: () => [tool] }).handle(
            request("tools/call", { name: "raw" }),
        );
        expect(res.result.content[0].text).toBe("plain string");
    });
});

describe("protocol versions and banners", () => {
    /** @type {any[]} */
    let calls;
    const tool = {
        ...ECHO,
        handler: (/** @type {any} */ args, /** @type {any} */ _context, /** @type {any} */ client) => {
            calls.push({ args, client });
            return "ran";
        },
    };
    const daemon = (/** @type {object} */ extra = {}) =>
        createMcpServer({ serverInfo: SERVER_INFO, tools: () => [tool], protocols: [2, 3], ...extra });
    const call = (/** @type {any} */ meta) =>
        request("tools/call", { name: "echo", arguments: { say: "hi" }, ...(meta ? { _meta: meta } : {}) });

    it("refuses a call in a protocol it does not serve, or in none, without running the tool", async () => {
        calls = [];
        const old = await daemon().handle(call({ githerd: { protocol: 1 } }));
        expect(old.result.isError).toBe(true);
        expect(old.result.content[0].text).toBe(
            "protocol mismatch: this client speaks 1, the daemon serves 2, 3; nothing was done and this call is not an attempt",
        );
        const none = await daemon().handle(call());
        expect(none.result.content[0].text).toMatch(/^protocol mismatch: this client speaks no version/);
        expect(calls).toEqual([]);
    });

    it("hands a served call's client metadata to the tool", async () => {
        calls = [];
        const meta = { protocol: 3, session: "s-1", job: "pr-412" };
        expect((await daemon().handle(call({ githerd: meta }))).result.content[0].text).toBe("ran");
        expect(calls).toEqual([{ args: { say: "hi", format: "text" }, client: meta }]);
    });

    it("starts every tool result with the active banners, refusals too, and nothing when there are none", async () => {
        calls = [];
        const banner = (/** @type {any} */ context) => (context?.broken ? "PHONE ALERTS BROKEN" : "");
        const s = daemon({ banner });
        const ok = await s.handle(call({ githerd: { protocol: 2 } }), { broken: true });
        expect(ok.result.content[0].text).toBe("PHONE ALERTS BROKEN\nran");
        const refused = await s.handle(call({ githerd: { protocol: 1 } }), { broken: true });
        expect(refused.result).toMatchObject({ isError: true });
        expect(refused.result.content[0].text).toMatch(/^PHONE ALERTS BROKEN\nprotocol mismatch/);
        expect((await s.handle(call({ githerd: { protocol: 2 } }))).result.content[0].text).toBe("ran");
    });
});

const JOB = "issue-737";
const HEAD = "a".repeat(40);

/** One valid call of each of the eleven tools. */
const VALID = {
    githerd_status: { section: "prs", pr: 412 },
    githerd_next: {},
    githerd_claim: {
        job: JOB,
        snapshotVersion: 7,
        overlap: { decision: "wait", with: "pr-412", reason: "both edit lib/queue.mjs" },
        related: ["issue-736"],
        plan: "Fix the queue order for owner overrides.",
    },
    githerd_wait: { job: JOB, for: "checks", target: HEAD, reason: "CI on the pushed head" },
    githerd_expect: { job: JOB, minutes: 180, reason: "the full browser suite" },
    githerd_push: { job: JOB, branch: "fix/queue-order", expectHead: HEAD },
    githerd_rerun: { job: JOB, run: 1234, jobId: 5678, reason: "runner lost communication" },
    githerd_read: { issue: 737, include: ["body", "comments"] },
    githerd_done: {
        job: JOB,
        outcome: "done",
        pr: 801,
        pushedHead: HEAD,
        findings: "The override label was read before the order.",
        defects: [{ summary: "queue ignores hold", issue: 802 }],
        result: { verdict: "pass", patchId: "p1", notes: "" },
    },
    githerd_ask_owner: {
        job: JOB,
        kind: "one-way-door",
        question: "Rename the package?",
        options: [{ choice: "rename", undoCost: "a major release" }],
        target: 737,
    },
    githerd_record: {
        kind: "policy",
        text: "Hold graphty-element majors.",
        switch: "hold-package",
        value: "graphty-element",
    },
};

/**
 * Validates one tool's arguments.
 * @param {string} name the tool
 * @param {unknown} args the arguments
 * @returns {string[]} the violations, empty when valid
 */
function violations(name, args) {
    const tool = TOOLS.find((t) => t.name === name);
    const out = validate(/** @type {any} */ (tool).inputSchema, args);
    return "errors" in out ? out.errors : [];
}

describe("the eleven tools", () => {
    it("are exactly design section 6's, each with a supported schema that refuses unknown properties", () => {
        expect(TOOLS.map((t) => t.name)).toEqual(Object.keys(VALID));
        for (const t of TOOLS) {
            expect(() => assertSupported(t.inputSchema)).not.toThrow();
            expect(t.inputSchema).toMatchObject({ type: "object", additionalProperties: false });
            expect(t.inputSchema).not.toHaveProperty("anyOf");
            expect(violations(t.name, { unexpected: 1 })).toContain("arguments.unexpected: unknown property");
        }
    });

    it("accept a valid call of each", () => {
        for (const [name, args] of Object.entries(VALID)) expect(violations(name, args), name).toEqual([]);
    });

    it("refuse what the design bounds", () => {
        const claim = VALID.githerd_claim;
        expect(violations("githerd_claim", { ...claim, plan: "x".repeat(1001) })).toEqual([
            "arguments.plan: longer than 1000 characters",
        ]);
        expect(
            violations("githerd_claim", { ...claim, overlap: { decision: "maybe", reason: "r".repeat(501) } }),
        ).toEqual([
            'arguments.overlap.decision: must be one of "independent", "join", "wait"',
            "arguments.overlap.reason: longer than 500 characters",
        ]);
        expect(violations("githerd_claim", { job: JOB })).toHaveLength(3);
        expect(violations("githerd_expect", { ...VALID.githerd_expect, minutes: 181 })).toEqual([
            "arguments.minutes: greater than 180",
        ]);
        expect(violations("githerd_expect", { ...VALID.githerd_expect, minutes: 0 })).toEqual([
            "arguments.minutes: less than 1",
        ]);
        expect(violations("githerd_wait", { ...VALID.githerd_wait, reason: "r".repeat(301) })).toEqual([
            "arguments.reason: longer than 300 characters",
        ]);
        expect(violations("githerd_push", { ...VALID.githerd_push, expectHead: "HEAD" })[0]).toMatch(
            /^arguments\.expectHead: does not match/,
        );
        expect(violations("githerd_push", { ...VALID.githerd_push, job: "Bad Job" })[0]).toMatch(/^arguments\.job:/);
        expect(violations("githerd_done", { ...VALID.githerd_done, findings: "f".repeat(4001) })).toEqual([
            "arguments.findings: longer than 4000 characters",
        ]);
        expect(violations("githerd_ask_owner", { ...VALID.githerd_ask_owner, kind: "convenience" })).toHaveLength(1);
        expect(violations("githerd_ask_owner", { ...VALID.githerd_ask_owner, options: [] })).toEqual([
            "arguments.options: fewer than 1 items",
        ]);
        expect(violations("githerd_record", { ...VALID.githerd_record, switch: "merge-now" })).toHaveLength(1);
        expect(violations("githerd_status", { section: "queue" })).toHaveLength(1);
        expect(violations("githerd_read", { pr: 0 })).toEqual(["arguments.pr: less than 1"]);
    });

    it("take either a triage list or a review verdict as a done result, and nothing else", () => {
        const done = VALID.githerd_done;
        const triage = [
            {
                issue: 737,
                labels: { type: "bug", priority: "high", effort: "low" },
                verdict: "duplicate",
                of: 700,
                group: "queue",
            },
        ];
        expect(violations("githerd_done", { ...done, result: triage })).toEqual([]);
        expect(
            violations("githerd_done", { ...done, result: { verdict: "lgtm", patchId: "p", notes: "" } })[0],
        ).toMatch(/^arguments\.result: matches none of the allowed forms/);
        expect(
            violations("githerd_done", { ...done, result: [{ issue: 1, labels: { type: "bug" }, verdict: "keep" }] }),
        ).toHaveLength(1);
    });
});

describe("tools forwarded to a fake daemon", () => {
    /** @type {import("node:http").Server | null} */
    let daemonServer = null;

    afterEach(async () => {
        if (daemonServer) await new Promise((r) => daemonServer?.close(() => r(undefined)));
        daemonServer = null;
    });

    /**
     * Starts a fake daemon on localhost: the eleven tools, each answering with its name, its
     * arguments and the client metadata it received.
     * @param {object} [options] the fake's behavior
     * @param {number[]} [options.protocols] the protocols it serves
     * @param {boolean} [options.broken] answer every request with a JSON-RPC error
     * @returns {Promise<{send: (request: object) => Promise<any>, received: any[]}>} a sender
     *   posting to it, and every request body it received
     */
    async function fakeDaemon({ protocols = [TOOL_PROTOCOL], broken = false } = {}) {
        /** @type {any[]} */
        const received = [];
        const daemon = createMcpServer({
            serverInfo: SERVER_INFO,
            protocols,
            banner: () => "BANNER",
            tools: () =>
                TOOLS.map((t) => ({
                    ...t,
                    handler: (args, _context, client) =>
                        t.name === "githerd_claim"
                            ? { text: "stale snapshot", isError: true }
                            : JSON.stringify({ tool: t.name, args, client }),
                })),
        });
        daemonServer = createServer(async (req, res) => {
            let body = "";
            for await (const chunk of req) body += chunk;
            received.push(JSON.parse(body));
            const reply = broken
                ? { jsonrpc: "2.0", id: 1, error: { code: INTERNAL_ERROR, message: "state unreadable" } }
                : await daemon.handle(body);
            res.setHeader("content-type", "application/json");
            res.end(JSON.stringify(reply));
        });
        await new Promise((r) => daemonServer?.listen(0, "127.0.0.1", () => r(undefined)));
        const { port } = /** @type {import("node:net").AddressInfo} */ (daemonServer.address());
        const send = async (/** @type {object} */ body) =>
            (await fetch(`http://127.0.0.1:${port}/rpc`, { method: "POST", body: JSON.stringify(body) })).json();
        return { send, received };
    }

    const meta = { protocol: TOOL_PROTOCOL, pid: 4242, session: "s-1", sessionSource: "hook", job: JOB, nonce: "n" };

    /**
     * A session's MCP server forwarding to `send`.
     * @param {(request: object) => Promise<any>} send the sender
     * @param {object} [client] the client metadata
     * @returns {ReturnType<typeof createMcpServer>} the server
     */
    const session = (send, client = meta) =>
        createMcpServer({
            serverInfo: SERVER_INFO,
            tools: () => forwardingTools(send, () => /** @type {any} */ (client)),
        });

    it("answers every tool with the daemon's reply, carrying the protocol and the session", async () => {
        const { send, received } = await fakeDaemon();
        const s = session(send);
        expect((await s.handle(request("tools/list"))).result.tools.map((/** @type {any} */ t) => t.name)).toEqual(
            Object.keys(VALID),
        );
        for (const [name, args] of Object.entries(VALID)) {
            const res = await s.handle(request("tools/call", { name, arguments: args }));
            const [banner, body] = res.result.content[0].text.split("\n");
            expect(banner).toBe("BANNER");
            if (name === "githerd_claim") {
                expect(res.result).toMatchObject({ isError: true });
                expect(body).toBe("stale snapshot");
                continue;
            }
            expect(res.result.isError).toBeUndefined();
            expect(JSON.parse(body)).toMatchObject({ tool: name, client: meta });
        }
        expect(received).toHaveLength(11);
        expect(received.map((r) => r.params._meta.githerd.protocol)).toEqual(Array(11).fill(TOOL_PROTOCOL));
        expect(new Set(received.map((r) => r.id)).size).toBe(11);
    });

    it("never sends a call whose arguments are refused, so it has no effect", async () => {
        const { send, received } = await fakeDaemon();
        const s = session(send);
        const res = await s.handle(
            request("tools/call", { name: "githerd_push", arguments: { ...VALID.githerd_push, expectHead: "HEAD" } }),
        );
        expect(res.result.isError).toBe(true);
        expect(res.result.content[0].text).toMatch(/^invalid arguments: arguments\.expectHead/);
        expect(received).toEqual([]);
    });

    it("passes a protocol refusal through, and the daemon runs nothing", async () => {
        const { send, received } = await fakeDaemon({ protocols: [TOOL_PROTOCOL + 1] });
        const res = await session(send).handle(request("tools/call", { name: "githerd_next", arguments: {} }));
        expect(res.result.isError).toBe(true);
        expect(res.result.content[0].text).toMatch(/^BANNER\nprotocol mismatch: this client speaks 1/);
        expect(received).toHaveLength(1);
    });

    it("turns a daemon's JSON-RPC error, or a reply with no content, into a tool result", async () => {
        const { send } = await fakeDaemon({ broken: true });
        const res = await session(send).handle(request("tools/call", { name: "githerd_next", arguments: {} }));
        expect(res.result).toEqual({
            content: [{ type: "text", text: "githerd daemon: state unreadable" }],
            isError: true,
        });
        const empty = await session(async () => ({ jsonrpc: "2.0", id: 1, result: {} })).handle(
            request("tools/call", { name: "githerd_next", arguments: {} }),
        );
        expect(empty.result).toEqual({ content: [{ type: "text", text: "" }] });
    });
});

describe("identifySession", () => {
    /** @type {string[]} */
    const dirs = [];
    afterEach(() => {
        for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true });
    });

    /**
     * A home and a state directory, with the hook's file and the registry entry for pid 4242.
     * @param {{hook?: object, registry?: object}} files what to write
     * @returns {{home: string, stateDir: string}} the directories
     */
    function setup({ hook, registry }) {
        const home = mkdtempSync(join(tmpdir(), "githerd-mcp-"));
        dirs.push(home);
        const stateDir = join(home, "state");
        mkdirSync(join(stateDir, "sessions"), { recursive: true });
        mkdirSync(join(home, ".claude", "sessions"), { recursive: true });
        if (hook) writeFileSync(join(stateDir, "sessions", "4242.json"), JSON.stringify(hook));
        if (registry) writeFileSync(join(home, ".claude", "sessions", "4242.json"), JSON.stringify(registry));
        return { home, stateDir };
    }

    const env = { GITHERD_JOB: JOB, GITHERD_NONCE: "n1" };
    const processOf = () => ({ startTime: "500" });
    const startedMs = () => 1_000;

    it("takes the session from the SessionStart hook's file first", () => {
        const dirsFor = setup({
            hook: { pid: 4242, startTime: "500", sessionId: "from-hook" },
            registry: { pid: 4242, sessionId: "from-registry", startedAt: 2_000 },
        });
        expect(identifySession({ ppid: 4242, env, ...dirsFor, processOf, startedMs })).toEqual({
            protocol: TOOL_PROTOCOL,
            pid: 4242,
            job: JOB,
            nonce: "n1",
            session: "from-hook",
            sessionSource: "hook",
        });
    });

    it("falls back to the registry when the hook's file names another process", () => {
        const dirsFor = setup({
            hook: { pid: 4242, startTime: "499", sessionId: "from-hook" },
            registry: { pid: 4242, sessionId: "from-registry", startedAt: 2_000 },
        });
        expect(identifySession({ ppid: 4242, env: {}, ...dirsFor, processOf, startedMs })).toMatchObject({
            session: "from-registry",
            sessionSource: "registry",
            job: null,
            nonce: null,
        });
    });

    it("refuses a registry entry written before its process started, or for another pid", () => {
        const reused = setup({ registry: { pid: 4242, sessionId: "old", startedAt: 999 } });
        expect(identifySession({ ppid: 4242, env, ...reused, processOf, startedMs })).toMatchObject({
            session: null,
            sessionSource: null,
        });
        const other = setup({ registry: { pid: 4243, sessionId: "other", startedAt: 2_000 } });
        expect(identifySession({ ppid: 4242, env, ...other, processOf, startedMs }).session).toBeNull();
        expect(identifySession({ ppid: 4242, env, ...setup({}), processOf, startedMs }).session).toBeNull();
    });

    it("reads a real process's start time from /proc", () => {
        const pid = process.pid;
        const { home, stateDir } = setup({});
        const write = (/** @type {object} */ entry) =>
            writeFileSync(join(home, ".claude", "sessions", `${pid}.json`), JSON.stringify(entry));
        write({ pid, sessionId: "live", startedAt: Date.now() + 1000 });
        expect(identifySession({ ppid: pid, env: {}, home, stateDir }).session).toBe("live");
        write({ pid, sessionId: "too-early", startedAt: 0 });
        expect(identifySession({ ppid: pid, env: {}, home, stateDir }).session).toBeNull();
        writeFileSync(
            join(stateDir, "sessions", `${pid}.json`),
            JSON.stringify({ pid, startTime: identify(pid)?.startTime, sessionId: "hooked" }),
        );
        expect(identifySession({ ppid: pid, env: {}, home, stateDir }).session).toBe("hooked");
    });

    it("finds nothing for a process that does not exist", () => {
        const { home, stateDir } = setup({});
        writeFileSync(
            join(home, ".claude", "sessions", "999999999.json"),
            JSON.stringify({ pid: 999999999, sessionId: "gone", startedAt: Date.now() }),
        );
        expect(identifySession({ ppid: 999999999, env: {}, home, stateDir }).session).toBeNull();
    });
});
