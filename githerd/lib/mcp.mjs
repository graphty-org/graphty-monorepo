/**
 * The MCP JSON-RPC core shared by the launcher and the daemon: `initialize`, `tools/list`,
 * `tools/call` (arguments validated against the tool's schema), `ping`, and -32601 for any other
 * method. Notifications and responses get no reply. Transport is the caller's: the launcher reads
 * stdin lines, the daemon reads HTTP bodies; both hand each message to `handle`.
 *
 * Also the eleven githerd tools of design section 6 (`TOOLS`), the client side that forwards them
 * to the daemon (`forwardingTools`), and how a session's MCP server learns which session it serves
 * (`identifySession`). Every forwarded call carries `params._meta.githerd`: the tool protocol
 * version, the session, and for a worker its job and nonce. A call the daemon refuses, for bad
 * arguments or a protocol it does not serve, reaches no handler, so it has no effect.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { identify } from "./proc.mjs";
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
 * @property {(args: any, context: any, client: ClientMeta) => string | ToolResult | Promise<string | ToolResult>} handler
 *   receives the validated arguments, with defaults filled, the transport's context and the
 *   caller's `params._meta.githerd`; a thrown error becomes an `isError` result carrying its message
 */

/**
 * What a forwarding client says about itself on every call, as `params._meta.githerd`.
 * @typedef {object} ClientMeta
 * @property {number} [protocol] the tool protocol version the client speaks
 * @property {number} [pid] the pid of the `claude` process the client serves
 * @property {string | null} [session] that session's id, when known
 * @property {"hook" | "registry" | null} [sessionSource] where the session id came from
 * @property {string | null} [job] a worker's job (`GITHERD_JOB`)
 * @property {string | null} [nonce] a worker's start nonce (`GITHERD_NONCE`)
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
 * @param {number[]} [options.protocols] the tool protocol versions served; when given, a call
 *   whose `params._meta.githerd.protocol` is not one of them is refused before its arguments are
 *   read, and the refusal says it is a version mismatch, never an attempt (design 9.8)
 * @param {(context: any) => string} [options.banner] the active banners and faults; a non-empty
 *   one starts every `tools/call` result, refusals included
 * @returns {{handle: (message: unknown, context?: any) => Promise<Response | null>}} `handle`
 *   takes a parsed message or its JSON text and resolves to the reply, or null when none is due
 */
export function createMcpServer({ serverInfo, instructions, tools, protocols, banner }) {
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
        /** @type {ClientMeta} */
        const client = params._meta?.githerd ?? {};
        if (protocols !== undefined && !protocols.includes(/** @type {number} */ (client.protocol))) {
            return toolError(
                `protocol mismatch: this client speaks ${client.protocol ?? "no version"}, the daemon serves ` +
                    `${protocols.join(", ")}; nothing was done and this call is not an attempt`,
            );
        }
        const checkedArgs = validate(vetted(tool).inputSchema, params.arguments ?? {});
        if ("errors" in checkedArgs) return toolError(`invalid arguments: ${checkedArgs.errors.join("; ")}`);
        let result;
        try {
            result = await tool.handler(checkedArgs.value, context, client);
        } catch (err) {
            return toolError(err instanceof Error ? err.message : String(err));
        }
        if (typeof result === "string") return { content: [{ type: "text", text: result }] };
        return result.isError ? toolError(result.text) : { content: [{ type: "text", text: result.text }] };
    }

    /**
     * Starts a tool result with the active banners, when there are any.
     * @param {{content: {type: "text", text: string}[], isError?: true}} result the tool result
     * @param {any} context the transport's context
     * @returns {{content: {type: "text", text: string}[], isError?: true}} the result
     */
    function withBanner(result, context) {
        const line = banner?.(context);
        if (!line) return result;
        return { ...result, content: [{ type: "text", text: `${line}\n${result.content[0].text}` }] };
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
                return reply(msg.id, "error" in outcome ? outcome : { result: withBanner(outcome, context) });
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

/** The version of the eleven tools' names and schemas; a changed schema is a new version. */
export const TOOL_PROTOCOL = 1;

/**
 * A job id, as the job record names it (design 5.2): `pr-412`, `incident-ci-build-security-audit`.
 * @type {import("./schema.mjs").Schema}
 */
const JOB = { type: "string", pattern: "^[a-z][a-z0-9-]{1,119}$", description: "Your job's id." };
/**
 * A short reason.
 * @type {import("./schema.mjs").Schema}
 */
const REASON = { type: "string", minLength: 1, maxLength: 300 };
/**
 * A full commit sha.
 * @type {import("./schema.mjs").Schema}
 */
const SHA = { type: "string", pattern: "^[0-9a-f]{40}$" };
/**
 * A pull request or issue number.
 * @type {import("./schema.mjs").Schema}
 */
const NUMBER = { type: "integer", minimum: 1 };

/**
 * Builds an object schema that refuses unknown properties.
 * @param {Record<string, import("./schema.mjs").Schema>} properties the properties
 * @param {string[]} [required] the required ones
 * @returns {import("./schema.mjs").Schema} the schema
 */
function object(properties, required = []) {
    return { type: "object", properties, required, additionalProperties: false };
}

/** One issue's triage verdict. */
const TRIAGE_ITEM = object(
    {
        issue: NUMBER,
        labels: object(
            {
                type: { type: "string", minLength: 1 },
                priority: { type: "string", enum: ["critical", "high", "medium", "low"] },
                effort: { type: "string", enum: ["high", "medium", "low"] },
            },
            ["type", "priority", "effort"],
        ),
        verdict: { type: "string", enum: ["keep", "duplicate", "obsolete", "fixed"] },
        of: NUMBER,
        evidence: { type: "string" },
        group: { type: "string" },
    },
    ["issue", "labels", "verdict"],
);

/** A review job's verdict on one patch id. */
const REVIEW_RESULT = object(
    {
        verdict: {
            type: "string",
            enum: ["pass", "loosened", "breaking-unmarked", "does-not-address", "security", "other"],
        },
        patchId: { type: "string", minLength: 1 },
        notes: { type: "string" },
    },
    ["verdict", "patchId", "notes"],
);

/**
 * The eleven tools of design section 6: names, descriptions and argument schemas. Handlers are the
 * caller's: the daemon runs them, a session's MCP server forwards them (`forwardingTools`).
 * @type {{name: string, description: string, inputSchema: import("./schema.mjs").Schema}[]}
 */
export const TOOLS = [
    {
        name: "githerd_status",
        description:
            "The board: master, release, open pull requests, jobs, sessions, health and what waits on the owner. " +
            "Optionally one section or one pull request.",
        inputSchema: object({
            section: {
                type: "string",
                enum: ["all", "owner", "master", "release", "prs", "jobs", "sessions", "health"],
                default: "all",
            },
            pr: NUMBER,
            format: { type: "string", enum: ["text", "json"], default: "text" },
        }),
    },
    {
        name: "githerd_next",
        description:
            "A worker's job, or for an owner session the jobs that could be taken, with a snapshot of all work in " +
            "flight to judge overlap against, your news and the machine's load.",
        inputSchema: object({}),
    },
    {
        name: "githerd_claim",
        description:
            "Claim your job before any edit, with your overlap judgment against the snapshot from githerd_next. " +
            "Refused when the snapshot is stale or the wait would make a cycle; the refusal carries a fresh snapshot.",
        inputSchema: object(
            {
                job: JOB,
                snapshotVersion: { type: "integer", minimum: 0 },
                overlap: object(
                    {
                        decision: { type: "string", enum: ["independent", "join", "wait"] },
                        with: { type: "string", minLength: 1 },
                        reason: { type: "string", minLength: 1, maxLength: 500 },
                    },
                    ["decision", "reason"],
                ),
                related: { type: "array", items: { type: "string", minLength: 1 } },
                plan: { type: "string", minLength: 1, maxLength: 1000 },
            },
            ["job", "snapshotVersion", "overlap", "plan"],
        ),
    },
    {
        name: "githerd_wait",
        description:
            "Declare what you are waiting for (checks, a lane, a release, another job, or a local background task you " +
            "started), then stop. githerd watches it and wakes this session when it changes. Refused if it is already settled.",
        inputSchema: object(
            {
                job: JOB,
                for: { type: "string", enum: ["checks", "lane", "release", "job", "local"] },
                target: { type: "string", minLength: 1 },
                reason: REASON,
            },
            ["job", "for", "target", "reason"],
        ),
    },
    {
        name: "githerd_expect",
        description: "Declare a long step, up to 180 minutes, so the watchdog does not recycle this session during it.",
        inputSchema: object({ job: JOB, minutes: { type: "integer", minimum: 1, maximum: 180 }, reason: REASON }, [
            "job",
            "minutes",
            "reason",
        ]),
    },
    {
        name: "githerd_push",
        description:
            "Push your job's branch through githerd's queue and the pre-push gate. expectHead is your local HEAD. " +
            "Answers with your place in the queue; the result arrives later as news.",
        inputSchema: object(
            { job: JOB, branch: { type: "string", pattern: "^[A-Za-z0-9._/-]{1,200}$" }, expectHead: SHA },
            ["job", "branch", "expectHead"],
        ),
    },
    {
        name: "githerd_rerun",
        description:
            "Ask for one re-run of a failed CI job. Granted once per head and failure; never twice for a paid lane.",
        inputSchema: object({ job: JOB, run: NUMBER, jobId: NUMBER, reason: REASON }, [
            "job",
            "run",
            "jobId",
            "reason",
        ]),
    },
    {
        name: "githerd_read",
        description:
            "Read an issue or pull request: its body and only the comments and reviews the owner's account wrote. " +
            "Text by other accounts is counted, not shown.",
        // Which of issue and pr is required is the daemon's check: the model API refuses a tool
        // schema with anyOf at its top level.
        inputSchema: object({
            issue: NUMBER,
            pr: NUMBER,
            include: {
                type: "array",
                items: { type: "string", enum: ["body", "comments", "reviews", "files"] },
            },
        }),
    },
    {
        name: "githerd_done",
        description:
            "Report the end of an attempt: done, split, not-needed or failed, with findings and every defect you saw. " +
            "githerd verifies the claim against GitHub before accepting it and says what is missing.",
        inputSchema: object(
            {
                job: JOB,
                outcome: { type: "string", enum: ["done", "split", "not-needed", "failed"] },
                pr: NUMBER,
                pushedHead: SHA,
                findings: { type: "string", minLength: 1, maxLength: 4000 },
                theory: { type: "string" },
                defects: {
                    type: "array",
                    items: object(
                        { summary: { type: "string", minLength: 1 }, issue: NUMBER, commit: { type: "string" } },
                        ["summary"],
                    ),
                },
                children: { type: "array", items: NUMBER },
                evidence: { type: "string" },
                result: { anyOf: [{ type: "array", items: TRIAGE_ITEM }, REVIEW_RESULT] },
            },
            ["job", "outcome", "findings", "defects"],
        ),
    },
    {
        name: "githerd_ask_owner",
        description:
            "Ask the owner something only the owner can do or decide, with each option's cost to undo. Parks the " +
            "job; asking again while that question is open returns the same item and pages nobody.",
        inputSchema: object(
            {
                job: JOB,
                kind: {
                    type: "string",
                    enum: ["one-way-door", "visual", "money", "credential", "login", "system", "permission-rule"],
                },
                question: { type: "string", minLength: 1 },
                options: {
                    type: "array",
                    minItems: 1,
                    items: object(
                        { choice: { type: "string", minLength: 1 }, undoCost: { type: "string", minLength: 1 } },
                        ["choice", "undoCost"],
                    ),
                },
                target: NUMBER,
            },
            ["job", "kind", "question", "options"],
        ),
    },
    {
        name: "githerd_record",
        description:
            "Record what the owner said in this session: an order, a standing policy, or an answer to an open item. " +
            "Refused from a worker unless the owner steered it in the last 30 minutes.",
        inputSchema: object(
            {
                kind: { type: "string", enum: ["order", "policy", "answer"] },
                text: { type: "string", minLength: 1 },
                issues: { type: "array", items: NUMBER },
                switch: { type: "string", enum: ["freeze-merges", "park-gate", "hold-package"] },
                value: { type: "string" },
                item: { type: "string", minLength: 1 },
            },
            ["kind", "text"],
        ),
    },
];

/** The id of the last request forwarded to the daemon, unique within this process. */
let forwardedId = 0;

/**
 * The eleven tools for a session's MCP server: each validates its arguments here, so a refused call
 * never reaches the daemon, then forwards the call with the client's metadata and passes the
 * daemon's answer through.
 * @param {(request: object) => Promise<any>} send posts one JSON-RPC request to the daemon and
 *   resolves to its JSON-RPC reply
 * @param {() => ClientMeta} client this session's metadata, read at each call
 * @returns {Tool[]} the tools
 */
export function forwardingTools(send, client) {
    return TOOLS.map((tool) => ({
        ...tool,
        handler: async (args) => {
            forwardedId += 1;
            const reply = await send({
                jsonrpc: "2.0",
                id: forwardedId,
                method: "tools/call",
                params: { name: tool.name, arguments: args, _meta: { githerd: client() } },
            });
            if (reply?.error) throw new Error(`githerd daemon: ${reply.error.message}`);
            const text = (reply?.result?.content ?? [])
                .map((/** @type {{text?: string}} */ c) => c.text ?? "")
                .join("\n");
            return { text, isError: reply?.result?.isError === true };
        },
    }));
}

/**
 * Which session a session's MCP server serves (design section 6). Its parent is the `claude`
 * process. First the file the SessionStart hook wrote for that process,
 * `<stateDir>/sessions/<pid>.json` (`{pid, startTime, sessionId}`), accepted when the pid and the
 * process's start time still match; then Claude Code's registry, `<home>/.claude/sessions/<pid>.json`,
 * accepted when its pid matches and the process started no later than the file's `startedAt`
 * (platform facts 2.2). A reused pid never matches either. Workers also carry `GITHERD_JOB` and
 * `GITHERD_NONCE`.
 * @param {object} options where to look
 * @param {number} options.ppid the `claude` process's pid
 * @param {Record<string, string | undefined>} options.env the environment
 * @param {string} options.home the home directory holding `.claude/sessions`
 * @param {string} options.stateDir githerd's state directory
 * @param {(pid: number) => {startTime: string} | null} [options.processOf] the process's identity
 * @param {(pid: number) => number | null} [options.startedMs] when the process started, in ms
 * @returns {ClientMeta} what the client says about itself on every call
 */
export function identifySession({ ppid, env, home, stateDir, processOf = identify, startedMs = processStartMs }) {
    const meta = {
        protocol: TOOL_PROTOCOL,
        pid: ppid,
        job: env.GITHERD_JOB ?? null,
        nonce: env.GITHERD_NONCE ?? null,
    };
    const hook = readJson(join(stateDir, "sessions", `${ppid}.json`));
    if (typeof hook?.sessionId === "string" && hook.pid === ppid && hook.startTime === processOf(ppid)?.startTime) {
        return { ...meta, session: hook.sessionId, sessionSource: "hook" };
    }
    const entry = readJson(join(home, ".claude", "sessions", `${ppid}.json`));
    const started = startedMs(ppid);
    if (
        typeof entry?.sessionId === "string" &&
        entry.pid === ppid &&
        started !== null &&
        typeof entry.startedAt === "number" &&
        started <= entry.startedAt
    ) {
        return { ...meta, session: entry.sessionId, sessionSource: "registry" };
    }
    return { ...meta, session: null, sessionSource: null };
}

/**
 * Reads a JSON file.
 * @param {string} path the file
 * @returns {any} its value, or null when it is missing or not JSON
 */
function readJson(path) {
    try {
        return JSON.parse(readFileSync(path, "utf8"));
    } catch {
        return null;
    }
}

/**
 * When a process started, in milliseconds since the epoch: the host's boot time plus the start
 * time in clock ticks from `/proc/<pid>/stat`.
 * ponytail: assumes 100 clock ticks a second (Linux's USER_HZ on every common build); Node cannot
 * ask sysconf. At worst the check is off by the tick ratio, and the hook file is tried first.
 * @param {number} pid the process
 * @returns {number | null} the time, or null when the process or /proc cannot be read
 */
function processStartMs(pid) {
    try {
        const ticks = Number(identify(pid)?.startTime);
        const btime = Number(/^btime (\d+)$/m.exec(readFileSync("/proc/stat", "utf8"))?.[1]);
        if (!Number.isFinite(ticks) || !Number.isFinite(btime)) return null;
        return btime * 1000 + ticks * 10;
    } catch {
        return null;
    }
}
