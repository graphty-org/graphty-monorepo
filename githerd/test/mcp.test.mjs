import { describe, expect, it } from "vitest";

import {
    INTERNAL_ERROR,
    INVALID_PARAMS,
    INVALID_REQUEST,
    METHOD_NOT_FOUND,
    PARSE_ERROR,
    PROTOCOL_VERSIONS,
    createMcpServer,
} from "../lib/mcp.mjs";

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
