/**
 * @file The write pipeline, on the scripted engine and a real session: structure is checked for
 * the whole batch before any call runs; a batch runs all or nothing; a message whose last write
 * failed is taken back; large, slow, replacing and irreversible changes are held for the host's
 * approval; undo runs alone and only on the assistant's own steps; results are compact and paged;
 * tool search loads on-demand tools; the small profile reaches everything through `call`.
 */

import { assert, describe, it } from "vitest";
import { z } from "zod";

import { textOf } from "../../../src/ai/engine/types";
import { isGraphtyError } from "../../../src/errors";
import type { AiApprovalRequestedEvent, AiExportReadyEvent } from "../../../src/events";
import { assistantSession, digest, ScriptedAssistant, textTurn } from "../../helpers/assistant";

/** The approval requests a message made. */
function approvals(events: readonly { type: string }[]): AiApprovalRequestedEvent[] {
    return events.filter((event): event is AiApprovalRequestedEvent => event.type === "ai-approval-requested");
}

describe("structure is checked before any call runs", () => {
    it("runs none of a batch when one call's arguments are wrong, and says which", async () => {
        const session = await assistantSession();
        const assistant = new ScriptedAssistant(session);
        const before = await digest(session);
        await assistant.say("add and break", [
            { tool: "edit_data", args: { action: "add_nodes", records: [{ id: "f" }] } },
            { tool: "edit_data", args: { action: "remove_nodes", where: 7 } },
        ]);
        const [first, second] = assistant.lastResults();
        assert.strictEqual(first.code, "AI_TOOL_NOT_RUN");
        assert.strictEqual(second.code, "AI_ARG_INVALID");
        assert.strictEqual(second.params.path, "where");
        assert.isObject(second.params.schema, "the action's schema comes back to fix the call with");
        assert.strictEqual(await digest(session), before);
    });

    it("names an unknown action, an unknown tool and a stray field, with what is allowed", async () => {
        const session = await assistantSession();
        const assistant = new ScriptedAssistant(session);
        await assistant.say(
            "three mistakes",
            [{ tool: "query", args: { action: "everything" } }],
            [{ tool: "querry", args: { action: "overview" } }],
            [{ tool: "query", args: { action: "overview", hops: 2 } }],
        );
        const [action, tool, stray] = assistant.lastResults();
        assert.strictEqual(action.code, "AI_UNKNOWN_ACTION");
        assert.include(action.params.allowed as string[], "overview");
        assert.strictEqual(tool.code, "AI_TOOL_UNKNOWN");
        assert.include(tool.params.didYouMean as string[], "query");
        assert.strictEqual(stray.code, "AI_ARG_INVALID");
        assert.strictEqual(stray.params.path, "hops");
    });

    it("reads the placeholders a model fills unused fields with as absent", async () => {
        const session = await assistantSession();
        const assistant = new ScriptedAssistant(session);
        await assistant.say("all nodes", [
            { tool: "query", args: { action: "nodes", where: "", ids: [], result: null } },
        ]);
        const [read] = assistant.lastResults();
        assert.strictEqual(read.code, "AI_OK");
        assert.strictEqual((read.page as { total: number }).total, 5);
    });

    it("refuses a write with an empty target rather than reading it as everything", async () => {
        const session = await assistantSession();
        const assistant = new ScriptedAssistant(session);
        await assistant.say("remove", [{ tool: "edit_data", args: { action: "remove_nodes", where: "" } }]);
        assert.strictEqual(assistant.lastResults()[0].code, "AI_ARG_INVALID");
        assert.strictEqual(session.status.counts.nodes, 5);
    });

    it("repairs a bare attribute and a bare number in a selector, and says so", async () => {
        const session = await assistantSession();
        const assistant = new ScriptedAssistant(session);
        await assistant.say("heavy servers", [
            { tool: "query", args: { action: "nodes", where: "type == 'server' && load > 0.8" } },
        ]);
        const [read] = assistant.lastResults();
        assert.strictEqual(read.params.rewritten, "data.type == 'server' && data.load > `0.8`");
        assert.deepStrictEqual(
            (read.data as { id: string }[]).map((row) => row.id),
            ["a"],
        );
    });

    it("refuses a selector that does not parse, and a node it cannot name, with suggestions", async () => {
        const session = await assistantSession();
        const assistant = new ScriptedAssistant(session);
        await assistant.say(
            "bad",
            [{ tool: "query", args: { action: "nodes", where: "data.type ==" } }],
            [{ tool: "query", args: { action: "neighbors", ids: ["Alph"] } }],
        );
        const [selector, node] = assistant.lastResults();
        assert.strictEqual(selector.code, "AI_BAD_SELECTOR");
        assert.strictEqual(node.code, "AI_UNKNOWN_NODE");
    });
});

describe("a batch runs all or nothing", () => {
    it("rolls back every call of a batch when one fails, and marks the failure pending", async () => {
        const session = await assistantSession();
        const assistant = new ScriptedAssistant(session);
        const before = await digest(session);
        await assistant.say("add then remove nothing", [
            { tool: "edit_data", args: { action: "add_nodes", records: [{ id: "f" }] } },
            { tool: "edit_data", args: { action: "remove_nodes", where: "data.type == 'router'" } },
        ]);
        const [added, failed] = assistant.lastResults();
        assert.strictEqual(added.code, "AI_TOOL_NOT_RUN");
        assert.strictEqual(added.params.rolledBack, true);
        assert.strictEqual(failed.code, "AI_EMPTY_MATCH");
        assert.strictEqual(failed.params.rollback, "pending");
        assert.notExists(session.data.node("f"));
        assert.strictEqual(await digest(session), before);
    });

    it("takes the message back when its last write failed and nothing fixed it", async () => {
        const session = await assistantSession();
        const assistant = new ScriptedAssistant(session);
        const before = await digest(session);
        const { result } = await assistant.say(
            "add f, then fail",
            [{ tool: "edit_data", args: { action: "add_nodes", records: [{ id: "f" }] } }],
            [{ tool: "edit_data", args: { action: "remove_nodes", ids: ["nope"] } }],
        );
        assert.strictEqual(result.code, "AI_TOOL_FAILED");
        assert.strictEqual(result.params?.cause, "AI_UNKNOWN_NODE");
        assert.strictEqual(result.params?.rolledBack, 1);
        assert.notExists(session.data.node("f"));
        assert.strictEqual(await digest(session), before);
    });

    it("keeps the message when a later write fixes the failed one, as one undo step", async () => {
        const session = await assistantSession();
        const assistant = new ScriptedAssistant(session);
        const steps = session.history.position;
        const { result } = await assistant.say(
            "add f, fail, fix",
            [{ tool: "edit_data", args: { action: "add_nodes", records: [{ id: "f" }] } }],
            [{ tool: "edit_data", args: { action: "add_edges", records: [{ source: "f", target: "nope" }] } }],
            [{ tool: "edit_data", args: { action: "add_edges", records: [{ source: "f", target: "a" }] } }],
        );
        assert.strictEqual(result.code, "AI_COMPLETED");
        assert.exists(session.data.node("f"));
        assert.strictEqual(session.history.position - steps, 1);
    });

    it("keeps the message's writes when it ends on a failed read", async () => {
        const session = await assistantSession();
        const assistant = new ScriptedAssistant(session);
        await assistant.say(
            "add f, then look badly",
            [{ tool: "edit_data", args: { action: "add_nodes", records: [{ id: "f" }] } }],
            [{ tool: "query", args: { action: "histogram", column: "nothing" } }],
        );
        assert.exists(session.data.node("f"));
    });

    it("leaves nothing behind when the message is cancelled while the model thinks", async () => {
        const session = await assistantSession();
        const assistant = new ScriptedAssistant(session);
        const before = await digest(session);
        let release: () => void = () => undefined;
        const waiting = new Promise<void>((resolve) => {
            release = resolve;
        });
        assistant.engine.push(
            [
                {
                    type: "tool-call",
                    id: "t1",
                    name: "edit_data",
                    arguments: { action: "add_nodes", records: [{ id: "f" }] },
                },
                { type: "finish", reason: "tool-calls" },
            ],
            async function* (_request, signal) {
                release();
                await new Promise<void>((resolve) => {
                    signal.addEventListener("abort", () => {
                        resolve();
                    });
                });
                yield* textTurn("never");
            },
        );
        const running = assistant.controller.execute("add f");
        await waiting;
        assert.exists(session.data.node("f"), "the first batch is in");
        assistant.controller.cancel();
        const result = await running;
        assert.strictEqual(result.code, "AI_CANCELLED");
        assert.strictEqual(await digest(session), before);
    });
});

describe("large, slow, replacing and irreversible changes wait for the host", () => {
    it("holds a removal past the limit, changes nothing, and asks the host with a preview", async () => {
        const session = await assistantSession();
        const assistant = new ScriptedAssistant(session, { gate: { removeNodes: 2 } });
        const before = await digest(session);
        const { result, events } = await assistant.say("remove the clients", [
            { tool: "edit_data", args: { action: "remove_nodes", where: "data.type == 'client'" } },
        ]);
        assert.strictEqual(result.code, "AI_CONFIRMATION_NEEDED");
        assert.strictEqual(assistant.lastResults()[0].code, "AI_CONFIRM_REQUIRED");
        assert.strictEqual(await digest(session), before);
        const [request] = approvals(events);
        assert.strictEqual(request.request.gate, "large");
        assert.strictEqual(request.request.preview.removeNodes, 3);
        assert.strictEqual(request.request.id, result.params?.request);
    });

    it("runs a held change once the host approves, as one undo step of its message", async () => {
        const session = await assistantSession();
        const assistant = new ScriptedAssistant(session, { gate: { removeNodes: 2 } });
        const steps = session.history.position;
        const { result } = await assistant.say("remove the clients", [
            { tool: "edit_data", args: { action: "remove_nodes", where: "data.type == 'client'" } },
        ]);
        const approved = await assistant.controller.resolveAiApproval(String(result.params?.request), {
            approve: true,
        });
        assert.strictEqual(approved.code, "AI_COMPLETED");
        assert.strictEqual(session.status.counts.nodes, 2);
        assert.strictEqual(session.history.position - steps, 1);
        assert.strictEqual(session.history.steps.at(-1)?.provenance.via, "assistant");
        await session.undo();
        assert.strictEqual(session.status.counts.nodes, 5);
    });

    it("drops a held change the host denies, and refuses an answer after the graph changed", async () => {
        const session = await assistantSession();
        const assistant = new ScriptedAssistant(session, { gate: { removeNodes: 2 } });
        const first = await assistant.say("remove clients", [
            { tool: "edit_data", args: { action: "remove_nodes", where: "data.type == 'client'" } },
        ]);
        const denied = await assistant.controller.resolveAiApproval(String(first.result.params?.request), {
            approve: false,
        });
        assert.strictEqual(denied.code, "AI_APPROVAL_DENIED");
        assert.strictEqual(session.status.counts.nodes, 5);

        const second = await assistant.say("remove clients", [
            { tool: "edit_data", args: { action: "remove_nodes", where: "data.type == 'client'" } },
        ]);
        await session.data.updateNodes([{ id: "a", values: { team: "moved" } }]);
        const stale = await assistant.controller.resolveAiApproval(String(second.result.params?.request), {
            approve: true,
        });
        assert.strictEqual(stale.code, "AI_APPROVAL_STALE");
        assert.strictEqual(session.status.counts.nodes, 5);
    });

    it("expires a held change at the reader's next message", async () => {
        const session = await assistantSession();
        const assistant = new ScriptedAssistant(session, { gate: { removeNodes: 2 } });
        const held = await assistant.say("remove clients", [
            { tool: "edit_data", args: { action: "remove_nodes", where: "data.type == 'client'" } },
        ]);
        await assistant.say("never mind");
        const late = await assistant.controller.resolveAiApproval(String(held.result.params?.request), {
            approve: true,
        });
        assert.strictEqual(late.code, "AI_APPROVAL_STALE");
    });

    it("holds emptying the graph, a slow run and cancelling the reader's own run; runs them with the gate off", async () => {
        const session = await assistantSession();
        const readerRun = session.runs.start("degree");
        await readerRun;
        const gated = new ScriptedAssistant(session, { gate: { slowSeconds: -1 } });
        await gated.say(
            "three",
            [{ tool: "edit_data", args: { action: "delete_all" } }],
            [{ tool: "run_algorithm", args: { name: "betweenness" } }],
            [{ tool: "results", args: { action: "cancel", run: readerRun.id } }],
        );
        assert.deepStrictEqual(
            gated.lastResults().map((read) => [read.code, read.params.gate]),
            [
                ["AI_CONFIRM_REQUIRED", "replaces"],
                ["AI_CONFIRM_REQUIRED", "slow"],
                ["AI_CONFIRM_REQUIRED", "irreversible"],
            ],
        );
        assert.strictEqual(session.status.counts.nodes, 5);

        const open = new ScriptedAssistant(session, { gate: false });
        await open.say("empty it", [{ tool: "edit_data", args: { action: "delete_all" } }]);
        assert.strictEqual(session.status.counts.nodes, 0);
    });

    it("refuses an import from a URL the reader did not give, and holds one the host admits", async () => {
        const session = await assistantSession();
        const assistant = new ScriptedAssistant(session);
        await assistant.say("load the data", [
            { tool: "import_data", args: { action: "import", url: "https://example.com/g.json" } },
        ]);
        assert.strictEqual(assistant.lastResults()[0].code, "AI_IMPORT_URL_REFUSED");
        assert.strictEqual(session.status.counts.nodes, 5);

        const admitting = new ScriptedAssistant(session, { allowImportUrl: (url) => url.hostname === "example.com" });
        const { result } = await admitting.say("load the data", [
            { tool: "import_data", args: { action: "import", url: "https://example.com/g.json" } },
        ]);
        assert.strictEqual(result.code, "AI_CONFIRMATION_NEEDED");
        assert.strictEqual(result.params?.gate, "network");
        assert.strictEqual(session.status.counts.nodes, 5);
    });

    it("hands an export's document to the host and only its size to the model", async () => {
        const session = await assistantSession();
        const assistant = new ScriptedAssistant(session);
        const { events } = await assistant.say("export", [{ tool: "export_graph", args: { format: "graphml" } }]);
        const [read] = assistant.lastResults();
        const exported = events.find((event): event is AiExportReadyEvent => event.type === "ai-export-ready");
        assert.exists(exported);
        assert.strictEqual(read.params.bytes, (exported.data as string).length);
        assert.notInclude(JSON.stringify(read), "<graphml", "the document never reaches the model");
    });
});

describe("undo is the assistant's own, alone, once", () => {
    it("undoes the assistant's last message and nothing of the reader's", async () => {
        const session = await assistantSession();
        const assistant = new ScriptedAssistant(session);
        await assistant.say("add f", [{ tool: "edit_data", args: { action: "add_nodes", records: [{ id: "f" }] } }]);
        await assistant.say("undo that", [{ tool: "undo", args: { action: "undo" } }]);
        assert.strictEqual(assistant.lastResults()[0].code, "AI_OK");
        assert.notExists(session.data.node("f"));

        await assistant.say("add g", [{ tool: "edit_data", args: { action: "add_nodes", records: [{ id: "g" }] } }]);
        await session.data.updateNodes([{ id: "a", values: { team: "reader" } }]);
        await assistant.say("undo that", [{ tool: "undo", args: { action: "undo" } }]);
        const [refused] = assistant.lastResults();
        assert.strictEqual(refused.code, "AI_UNDO_NOT_MINE");
        assert.strictEqual(session.data.node("a")?.team, "reader");
        assert.exists(session.data.node("g"));
    });

    it("runs no undo that shares its batch, none of a step of its own message, and one per message", async () => {
        const session = await assistantSession();
        const assistant = new ScriptedAssistant(session);
        await assistant.say("add f", [{ tool: "edit_data", args: { action: "add_nodes", records: [{ id: "f" }] } }]);
        await assistant.say(
            "mixed",
            [
                { tool: "undo", args: { action: "undo" } },
                { tool: "query", args: { action: "overview" } },
            ],
            [{ tool: "edit_data", args: { action: "add_nodes", records: [{ id: "g" }] } }],
            [{ tool: "undo", args: { action: "undo" } }],
        );
        const [alone, notRun, , own] = assistant.lastResults();
        assert.strictEqual(alone.code, "AI_UNDO_NOT_ALONE");
        assert.strictEqual(notRun.code, "AI_TOOL_NOT_RUN");
        assert.strictEqual(own.code, "AI_UNDO_IN_MESSAGE");
        assert.exists(session.data.node("f"));
        assert.exists(session.data.node("g"));

        await assistant.say(
            "undo twice",
            [{ tool: "undo", args: { action: "undo" } }],
            [{ tool: "undo", args: { action: "undo" } }],
        );
        const [first, second] = assistant.lastResults();
        assert.strictEqual(first.code, "AI_OK");
        assert.strictEqual(second.code, "AI_UNDO_NOT_ALONE");
        assert.notExists(session.data.node("g"));
        assert.exists(session.data.node("f"));
    });
});

describe("results are compact and paged", () => {
    it("pages with a cursor, refuses a stale one, and refuses one that does not parse", async () => {
        const session = await assistantSession();
        const assistant = new ScriptedAssistant(session);
        await assistant.say("page", [{ tool: "query", args: { action: "nodes", limit: 2 } }]);
        const [page] = assistant.lastResults();
        assert.strictEqual((page.page as { total: number }).total, 5);
        const { cursor } = page.page as { cursor: string };
        await assistant.say("next", [{ tool: "query", args: { action: "nodes", limit: 2, cursor } }]);
        assert.deepStrictEqual(
            (assistant.lastResults()[0].data as { id: string }[]).map((row) => row.id),
            ["c", "d"],
        );
        await session.data.addNodes([{ id: "z" }]);
        await assistant.say(
            "stale",
            [{ tool: "query", args: { action: "nodes", cursor } }],
            [{ tool: "query", args: { action: "nodes", cursor: "nonsense" } }],
        );
        const [stale, garbled] = assistant.lastResults();
        assert.strictEqual(stale.code, "AI_CURSOR_STALE");
        assert.strictEqual(garbled.code, "AI_ARG_INVALID");
    });

    it("keeps every result valid JSON under its cap, cutting records rather than text", async () => {
        const nodes = Array.from({ length: 60 }, (_, index) => ({
            id: `n${String(index)}`,
            note: "x".repeat(400),
            a: 1,
            b: 2,
            c: 3,
            d: 4,
            e: 5,
            f: 6,
            g: 7,
            h: 8,
            i: 9,
            j: 10,
            k: 11,
            l: 12,
        }));
        const session = await assistantSession({ nodes, edges: [] });
        const assistant = new ScriptedAssistant(session);
        await assistant.say("everything", [{ tool: "query", args: { action: "nodes", limit: 50 } }]);
        const request = assistant.engine.requests.at(-1)!;
        const part = request.messages.flatMap((message) => message.parts).find((each) => each.type === "tool-result");
        const content = part?.type === "tool-result" ? part.content : "";
        assert.isAtMost(content.length, 8000);
        const parsed = JSON.parse(content) as {
            data: Record<string, unknown>[];
            page: { total: number; returned: number };
        };
        assert.isBelow(parsed.data.length, 50);
        assert.strictEqual(parsed.data[0].omittedFields, 2, "at most twelve fields a record");
        assert.strictEqual(parsed.data[0].truncated, true);
    });

    it("summarizes a run per field rather than listing every node", async () => {
        const session = await assistantSession();
        const assistant = new ScriptedAssistant(session);
        await assistant.say("degree", [{ tool: "run_algorithm", args: { name: "DEGREE" } }]);
        const [read] = assistant.lastResults();
        assert.strictEqual(read.params.run, "degree");
        const { summary } = read.data as { summary: { count: number; top: { id: string; label: string }[] } };
        assert.strictEqual(summary.count, 5);
        assert.isAtMost(summary.top.length, 5);
    });
});

describe("tool search loads tools for the next turn", () => {
    it("offers the core tools first, and an on-demand tool once a catalog result names it", async () => {
        const session = await assistantSession();
        const assistant = new ScriptedAssistant(session);
        await assistant.say("save a set", [
            { tool: "catalog", args: { action: "search", text: "named sets of nodes", kind: "tool" } },
        ]);
        const [first, second] = assistant.engine.requests.slice(-2).map(ScriptedAssistant.offered);
        assert.notInclude(first, "sets");
        assert.lengthOf(first, 11);
        assert.include(second, "sets");
    });

    it("runs an on-demand tool the model calls without loading it", async () => {
        const session = await assistantSession();
        const assistant = new ScriptedAssistant(session);
        await assistant.say("list sets", [{ tool: "sets", args: { action: "list" } }]);
        assert.strictEqual(assistant.lastResults()[0].code, "AI_OK");
    });

    it("puts the facts in a graph-data part, which every engine wraps as data", async () => {
        const session = await assistantSession();
        const assistant = new ScriptedAssistant(session);
        await assistant.say("hello");
        const [request] = assistant.engine.requests.slice(-1);
        const [message] = request.messages;
        assert.strictEqual(message.parts[0].type === "text" && message.parts[0].origin, "graph-data");
        assert.include(textOf(message.parts), "<graph-data>\nGraph: 5 nodes, 5 edges");
        assert.notInclude(request.system, "Alpha", "nothing from the graph is in the instructions");
    });
});

describe("the small-model profile", () => {
    it("offers four tools and reaches the rest through call", async () => {
        const session = await assistantSession();
        const assistant = new ScriptedAssistant(session, { toolProfile: "small" });
        await assistant.say(
            "color the servers",
            [
                {
                    tool: "call",
                    args: {
                        tool: "style",
                        action: "add",
                        args: { where: "data.type == 'server'", values: { "node.color": "red" } },
                    },
                },
            ],
            [
                {
                    tool: "call",
                    args: { tool: "query", args: JSON.stringify({ action: "count", where: "data.type == 'server'" }) },
                },
            ],
            [{ tool: "call", args: { tool: "query", action: "nodes", args: { action: "edges" } } }],
        );
        assert.deepStrictEqual(ScriptedAssistant.offered(assistant.engine.requests[0]).sort(), [
            "call",
            "catalog",
            "query",
            "undo",
        ]);
        // Each round's result as the model read it the turn after (older rounds are trimmed).
        const [styled, counted, mismatch] = [1, 2, 3].map((turn) => {
            const { parts } = assistant.engine.requests[turn].messages.at(-1)!;
            const part = parts.at(-1);
            return JSON.parse(part?.type === "tool-result" ? part.content : "{}") as { code: string; data?: unknown };
        });
        assert.strictEqual(styled.code, "style.add-layer");
        assert.deepStrictEqual(counted.data, { nodes: 2, edges: 0 });
        assert.strictEqual(mismatch.code, "AI_ARG_INVALID");
    });

    it("keeps results short and only the last two rounds of results in full", async () => {
        const nodes = Array.from({ length: 50 }, (_, index) => ({ id: `n${String(index)}`, note: "y".repeat(100) }));
        const session = await assistantSession({ nodes, edges: [] });
        const assistant = new ScriptedAssistant(session, { toolProfile: "small" });
        const look = { tool: "query", args: { action: "nodes", limit: 50 } };
        await assistant.say("look three times", [look], [look], [look]);
        const request = assistant.engine.requests.at(-1)!;
        const results = request.messages
            .flatMap((message) => message.parts)
            .flatMap((part) => (part.type === "tool-result" ? [part.content] : []));
        assert.lengthOf(results, 3);
        assert.include(results[0], "trimmed");
        for (const content of results.slice(1)) {
            assert.isAtMost(content.length, 1500);
            JSON.parse(content);
        }
    });
});

describe("the assistant's tool names and a consumer's commands", () => {
    it("refuses a consumer command that takes a built-in tool's name", async () => {
        const session = await assistantSession();
        const assistant = new ScriptedAssistant(session);
        try {
            assistant.registry.register({
                name: "query",
                description: "mine",
                parameters: z.object({}),
                examples: [],
                execute: () => Promise.resolve({ success: true, message: "" }),
            });
            assert.fail("registered");
        } catch (error) {
            assert.isTrue(isGraphtyError(error) && error.code === "E_DUPLICATE_PLUGIN");
        }
    });

    it("shows the model a consumer command's message when it sets no code", async () => {
        const session = await assistantSession();
        const assistant = new ScriptedAssistant(session);
        assistant.registry.register({
            name: "tag_nodes",
            description: "Tags nodes.",
            parameters: z.object({ ids: z.array(z.string()) }),
            examples: [],
            execute: async (_graph, params, context) => {
                await context?.tx.data.updateNodes(
                    (params.ids as string[]).map((id) => ({ id, values: { tag: "hub" } })),
                );
                return { success: true, message: "tagged" };
            },
        });
        await assistant.say("tag a", [{ tool: "tag_nodes", args: { ids: ["a"] } }]);
        assert.deepStrictEqual(assistant.lastResults()[0], { code: "AI_OK", params: { message: "tagged" } });
        assert.strictEqual(session.data.node("a")?.tag, "hub");
    });
});
