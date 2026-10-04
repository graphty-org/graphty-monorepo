/**
 * The MCP JSON-RPC core shared by the launcher and the daemon: `initialize`, `tools/list`,
 * `tools/call` (arguments validated against the tool's schema), `ping`, and -32601 for any other
 * method. Notifications and responses get no reply. Transport is the caller's: the launcher reads
 * stdin lines, the daemon reads HTTP bodies; both hand each message to `handle`.
 */

import { assertSupported, validate } from "./schema.mjs";

/** Protocol versions this server speaks, newest first. */
export const PROTOCOL_VERSIONS = ["2025-06-18", "2025-03-26", "2024-11-05"];

export const PARSE_ERROR = -32700;
export const INVALID_REQUEST = -32600;
export const METHOD_NOT_FOUND = -32601;
export const INVALID_PARAMS = -32602;
export const INTERNAL_ERROR = -32603;

/**
 * What a tool handler may return instead of a plain string.
 * @typedef {object} ToolResult
 * @property {string} text the one text content block
 * @property {boolean} [isError] marks the text as a failure the caller should see as one
 */

/**
 * A tool this server offers.
 * @typedef {object} Tool
 * @property {string} name the MCP tool name
 * @property {string} description shown to the model
 * @property {import("./schema.mjs").Schema} inputSchema the arguments' schema, validated on call
 * @property {(args: any, context: any) => string | ToolResult | Promise<string | ToolResult>} handler
 *   receives the validated arguments, with defaults filled; a thrown error becomes an `isError`
 *   result carrying its message
 */

/**
 * A JSON-RPC response.
 * @typedef {{jsonrpc: "2.0", id: string | number | null, result?: unknown, error?: {code: number, message: string}}} Response
 */

/**
 * Creates the JSON-RPC handler for one tool set.
 * @param {object} options what the server offers
 * @param {{name: string, version: string}} options.serverInfo reported at initialize
 * @param {string} [options.instructions] shown to the client at initialize
 * @param {(context: any) => Tool[]} options.tools the tools visible to this caller; the context
 *   is whatever the transport passes to `handle` (a session id, a run token)
 * @returns {{handle: (message: unknown, context?: any) => Promise<Response | null>}} `handle`
 *   takes a parsed message or its JSON text and resolves to the reply, or null when none is due
 */
export function createMcpServer({ serverInfo, instructions, tools }) {
    /** @type {WeakSet<Tool>} */
    const checked = new WeakSet();

    /**
     * Checks a tool's schema the first time the tool is used.
     * @param {Tool} tool the tool
     * @returns {Tool} the tool, its schema checked once
     */
    function vetted(tool) {
        if (!checked.has(tool)) {
            assertSupported(tool.inputSchema, `tool ${tool.name} inputSchema`);
            checked.add(tool);
        }
        return tool;
    }

    /**
     * Runs `tools/call`.
     * @param {any} params the request's params: `name` and `arguments`
     * @param {any} context the transport's context
     * @returns {Promise<{content: {type: "text", text: string}[], isError?: true} | {error: {code: number, message: string}}>} the tool result, or a JSON-RPC error
     */
    async function callTool(params, context) {
        const name = params?.name;
        const tool = tools(context).find((t) => t.name === name);
        if (tool === undefined) return { error: { code: INVALID_PARAMS, message: `unknown tool: ${String(name)}` } };
        const checkedArgs = validate(vetted(tool).inputSchema, params.arguments ?? {});
        if ("errors" in checkedArgs) return toolError(`invalid arguments: ${checkedArgs.errors.join("; ")}`);
        let result;
        try {
            result = await tool.handler(checkedArgs.value, context);
        } catch (err) {
            return toolError(err instanceof Error ? err.message : String(err));
        }
        if (typeof result === "string") return { content: [{ type: "text", text: result }] };
        return result.isError ? toolError(result.text) : { content: [{ type: "text", text: result.text }] };
    }

    /**
     * Answers one message.
     * @param {unknown} message a parsed message or its JSON text
     * @param {any} [context] passed to `tools` and to tool handlers
     * @returns {Promise<Response | null>} the reply, or null when none is due
     */
    async function handle(message, context) {
        if (typeof message === "string") {
            try {
                message = JSON.parse(message);
            } catch {
                return reply(null, { error: { code: PARSE_ERROR, message: "parse error" } });
            }
        }
        if (typeof message !== "object" || message === null || Array.isArray(message)) {
            return reply(null, { error: { code: INVALID_REQUEST, message: "invalid request" } });
        }
        const msg = /** @type {Record<string, any>} */ (message);
        // A notification, or a response to something this server never sends: no reply is due.
        if (!Object.hasOwn(msg, "id")) return null;
        if (msg.method === undefined) return null;
        if (msg.jsonrpc !== "2.0" || typeof msg.method !== "string") {
            return reply(msg.id, { error: { code: INVALID_REQUEST, message: "invalid request" } });
        }
        return answer(msg, context);
    }

    /**
     * Answers a well-formed request by its method.
     * @param {Record<string, any>} msg the request
     * @param {any} [context] passed to `tools` and to tool handlers
     * @returns {Promise<Response>} the reply
     */
    async function answer(msg, context) {
        switch (msg.method) {
            case "initialize": {
                const asked = msg.params?.protocolVersion;
                return reply(msg.id, {
                    result: {
                        protocolVersion: PROTOCOL_VERSIONS.includes(asked) ? asked : PROTOCOL_VERSIONS[0],
                        capabilities: { tools: {} },
                        serverInfo,
                        ...(instructions === undefined ? {} : { instructions }),
                    },
                });
            }
            case "ping":
                return reply(msg.id, { result: {} });
            case "tools/list":
                return reply(msg.id, {
                    result: {
                        tools: tools(context).map((t) => ({
                            name: t.name,
                            description: t.description,
                            inputSchema: vetted(t).inputSchema,
                        })),
                    },
                });
            case "tools/call": {
                let outcome;
                try {
                    outcome = await callTool(msg.params, context);
                } catch (err) {
                    return reply(msg.id, { error: { code: INTERNAL_ERROR, message: String(err?.message ?? err) } });
                }
                return reply(msg.id, "error" in outcome ? outcome : { result: outcome });
            }
            default:
                return reply(msg.id, { error: { code: METHOD_NOT_FOUND, message: `method not found: ${msg.method}` } });
        }
    }

    return { handle };
}

/**
 * Builds a tool result that reports a failure.
 * @param {string} text the message
 * @returns {{content: {type: "text", text: string}[], isError: true}} the result
 */
function toolError(text) {
    return { content: [{ type: "text", text }], isError: true };
}

/**
 * Builds a JSON-RPC response.
 * @param {string | number | null} id the request's id
 * @param {{result: unknown} | {error: {code: number, message: string}}} body the result or error
 * @returns {Response} the response
 */
function reply(id, body) {
    return { jsonrpc: "2.0", id, ...body };
}
