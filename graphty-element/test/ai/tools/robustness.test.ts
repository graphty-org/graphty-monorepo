/**
 * @file The assistant's tools held to the promises a review found them breaking: a malformed call
 * is refused, never thrown; an approval lets through only what the reader saw; a batch hands the
 * host nothing unless it is kept; a reader's own edit and a cancel are honoured while a run
 * computes; what a call names is read the way its schema says; and the catalog's own vocabulary
 * -- an engine's options, a node option's labels, a project setting's keys -- is what is checked.
 */

import { assert, describe, it } from "vitest";
import { z } from "zod";

import { defineAlgorithm } from "../../../extend";
import { createGraphSession, type GraphSession } from "../../../session";
import { graphData, textOf } from "../../../src/ai/engine/types";
import { checkOptions } from "../../../src/ai/tools/optionSchema";
import { clearRegisteredAlgorithmsForTesting } from "../../../src/catalog/registry";
import type { AiApprovalRequestedEvent, AiEvent } from "../../../src/events";
import { createRunResult } from "../../../src/session/results";
import type { RunExecutionContext, RunOutcome } from "../../../src/session/runs";
import { assistantSession, callsTurn, ScriptedAssistant, SMALL_GRAPH, textTurn } from "../../helpers/assistant";

/** A promise and the function that settles it. */
function deferred(): { promise: Promise<void>; settle: () => void } {
    let settle: () => void = () => undefined;
    const promise = new Promise<void>((resolve) => {
        settle = resolve;
    });
    return { promise, settle };
}

/**
 * A session whose runs wait to be released or cancelled, and say when each starts.
 * @returns The session, a promise that settles when a run starts, a release, and whether a run's
 *     signal fired.
 */
async function gatedRunSession(): Promise<{
    session: GraphSession;
    started: Promise<void>;
    release: () => void;
    aborted: () => boolean;
}> {
    const start = deferred();
    const release = deferred();
    let aborted = false;
    const holder: { session?: GraphSession } = {};
    const session = createGraphSession({
        runs: {
            execute: async (context: RunExecutionContext): Promise<RunOutcome> => {
                start.settle();
                const cancelled = new Promise<never>((_, reject) => {
                    context.signal.addEventListener("abort", () => {
                        aborted = true;
                        reject(context.signal.reason as Error);
                    });
                });
                await Promise.race([release.promise, cancelled]);
                const snapshot = holder.session!.data.snapshot();
                return {
                    result: createRunResult({
                        runId: context.runId,
                        shape: "node-metric",
                        fields: [],
                        measured: { nodes: snapshot.nodeCount, edges: snapshot.edgeCount },
                        graph: {},
                        nodes: [],
                        caveats: {
                            exact: true,
                            direction: "as-loaded",
                            precision: "f64",
                            method: context.algorithm,
                            facts: [],
                            notes: [],
                        },
                        durationMs: 1,
                    }),
                };
            },
        },
    });
    holder.session = session;
    await session.data.addNodes(SMALL_GRAPH.nodes);
    await session.data.addEdges(SMALL_GRAPH.edges);
    return { session, started: start.promise, release: release.settle, aborted: () => aborted };
}

describe("a malformed call is refused, never thrown", () => {
    it("refuses an encode with no encoding, and keeps the message's earlier write pending, not thrown away", async () => {
        const session = await assistantSession();
        const assistant = new ScriptedAssistant(session);
        const { result } = await assistant.say(
            "add then encode",
            [{ tool: "edit_data", args: { action: "add_nodes", records: [{ id: "zz" }] } }],
            [{ tool: "style", args: { action: "encode" } }],
        );
        const [, encode] = assistant.lastResults();
        assert.strictEqual(encode.code, "AI_ARG_INVALID");
        assert.strictEqual(encode.params.path, "encode");
        assert.notStrictEqual(result.code, "AI_TOOL_THREW");
    });

    it("refuses call's arguments that are JSON but not an object, keeping the message's earlier write", async () => {
        const session = await assistantSession();
        const assistant = new ScriptedAssistant(session, { toolProfile: "small" });
        await assistant.say(
            "add then call",
            [{ tool: "call", args: { tool: "edit_data", action: "add_nodes", args: { records: [{ id: "zz" }] } } }],
            [{ tool: "call", args: { tool: "query", args: "null" } }],
        );
        const [, nulled] = assistant.lastResults();
        assert.strictEqual(nulled.code, "AI_ARG_INVALID");
        assert.strictEqual(nulled.params.path, "args");
        assert.isDefined(session.data.node("zz"), "a refused read takes no write back");
    });

    it("checks a consumer command called through call against its own parameters", async () => {
        const session = await assistantSession();
        const assistant = new ScriptedAssistant(session, { toolProfile: "small" });
        const seen: unknown[] = [];
        assistant.registry.register({
            name: "greet",
            description: "Greets someone.",
            parameters: z.object({ who: z.string() }),
            examples: [],
            effect: "read",
            execute: (_graph, params) => {
                seen.push(params);
                return Promise.resolve({ success: true, message: "hi" });
            },
        });
        await assistant.say(
            "greet",
            [{ tool: "call", args: { tool: "greet", args: { who: "bob" } } }],
            [{ tool: "call", args: { tool: "greet", args: { who: 7 } } }],
        );
        const [greeted, refused] = assistant.lastResults();
        assert.strictEqual(greeted.code, "AI_OK");
        assert.deepStrictEqual(seen, [{ who: "bob" }]);
        assert.strictEqual(refused.code, "AI_ARG_INVALID");
        assert.strictEqual(refused.params.path, "who");
    });

    it("keeps an argument error's schema whole and compact, small enough for the small profile", async () => {
        const session = await assistantSession();
        const assistant = new ScriptedAssistant(session, { toolProfile: "small" });
        await assistant.say("bad", [
            { tool: "call", args: { tool: "style", action: "encode", args: { encode: { channel: 5 } } } },
        ]);
        const request = assistant.engine.requests.at(-1)!;
        const [content] = request.messages
            .flatMap((message) => message.parts)
            .flatMap((part) => (part.type === "tool-result" ? [part.content] : []));
        assert.isAtMost(content.length, 1500);
        const { params } = JSON.parse(content) as {
            params: { path: string; schema: { properties: { channel: { type: string } } } };
        };
        assert.strictEqual(params.path, "encode.channel");
        assert.strictEqual(params.schema.properties.channel.type, "string");
        assert.notInclude(content, "9007199254740991");
    });

    it("refuses a size, a domain and a position past what can be drawn", async () => {
        const session = await assistantSession();
        const assistant = new ScriptedAssistant(session);
        await assistant.say(
            "huge",
            [{ tool: "style", args: { action: "add", where: "all", values: { "node.size": 1e300 } } }],
            [
                {
                    tool: "style",
                    args: { action: "encode", encode: { channel: "node.color", attribute: "load", domain: [1, 1] } },
                },
            ],
            [{ tool: "layout", args: { action: "set_positions", positions: [{ id: "a", x: 1e308, y: 0 }] } }],
        );
        assert.deepStrictEqual(
            assistant.lastResults().map((read) => read.code),
            ["AI_ARG_OUT_OF_RANGE", "AI_ARG_INVALID", "AI_ARG_OUT_OF_RANGE"],
        );
    });
});

describe("selectors say what was written", () => {
    it("reads a double-quoted value with an apostrophe, and a result value ending in a backslash", async () => {
        const session = await assistantSession({
            nodes: [
                { id: "a", label: "O'Brien" },
                { id: "b", label: "back\\" },
            ],
            edges: [],
        });
        const assistant = new ScriptedAssistant(session);
        await assistant.say("find", [{ tool: "query", args: { action: "count", where: 'data.label == "O\'Brien"' } }]);
        const [quoted] = assistant.lastResults();
        assert.strictEqual(quoted.code, "AI_OK", JSON.stringify(quoted));
        assert.strictEqual((quoted.data as { nodes: number }).nodes, 1);

        await session.data.updateNodes([{ id: "b", values: { tag: "back\\" } }]);
        await assistant.say("find", [{ tool: "query", args: { action: "count", where: "data.tag == 'back\\\\'" } }]);
        assert.strictEqual((assistant.lastResults()[0].data as { nodes: number }).nodes, 1);
    });
});

describe("an approval lets through only what the reader saw", () => {
    it("holds a batch again for a limit the approved hold did not cover", async () => {
        const session = await assistantSession();
        const assistant = new ScriptedAssistant(session, { gate: { slowSeconds: -1 } });
        const { events } = await assistant.say("pagerank exactly, then delete everything", [
            { tool: "run_algorithm", args: { name: "pagerank", exact: true } },
            { tool: "edit_data", args: { action: "remove_nodes", where: "all" } },
        ]);
        const request = events.find(
            (event): event is AiApprovalRequestedEvent => event.type === "ai-approval-requested",
        );
        assert.strictEqual(request?.request.gate, "slow");
        const approved = await assistant.controller.resolveAiApproval(request!.request.id, { approve: true });
        assert.strictEqual(approved.code, "AI_CONFIRMATION_NEEDED");
        assert.strictEqual(approved.params?.gate, "large");
        assert.strictEqual(session.status.counts.nodes, 5, "nothing was removed");
    });

    it("answers an approval whose batch throws with a code, never a rejection", async () => {
        const session = await assistantSession();
        const assistant = new ScriptedAssistant(session, { gate: { slowSeconds: -1 } });
        assistant.registry.register({
            name: "explode",
            description: "Throws.",
            parameters: z.object({}),
            examples: [],
            execute: () => Promise.reject(new Error("boom")),
        });
        const { events } = await assistant.say("pagerank exactly, then explode", [
            { tool: "run_algorithm", args: { name: "pagerank", exact: true } },
            { tool: "explode", args: {} },
        ]);
        const request = events.find(
            (event): event is AiApprovalRequestedEvent => event.type === "ai-approval-requested",
        );
        const steps = session.history.position;
        const approved = await assistant.controller.resolveAiApproval(request!.request.id, { approve: true });
        assert.strictEqual(approved.code, "AI_TOOL_THREW");
        assert.strictEqual(approved.params?.request, request!.request.id);
        assert.strictEqual(session.history.position, steps, "the replayed batch rolled back");
    });

    for (const inside of [false, true]) {
        it(`ends the message at a hold, so an approval ${inside ? "from inside the listener" : "after it"} applies`, async () => {
            const session = await assistantSession();
            const assistant = new ScriptedAssistant(session, { gate: { removeNodes: 2 } });
            let approval: Promise<unknown> | undefined;
            if (inside) {
                const emit = assistant.events.push.bind(assistant.events);
                assistant.events.push = (...events: AiEvent[]): number => {
                    for (const event of events) {
                        if (event.type === "ai-approval-requested") {
                            approval = assistant.controller.resolveAiApproval(event.request.id, { approve: true });
                        }
                    }

                    return emit(...events);
                };
            }

            assistant.engine.push(
                callsTurn([{ tool: "edit_data", args: { action: "remove_nodes", where: "data.type == 'client'" } }], 0),
                callsTurn([{ tool: "edit_data", args: { action: "add_nodes", records: [{ id: "zz" }] } }], 1),
                textTurn("done"),
            );
            const result = await assistant.controller.execute("remove the clients then add zz");
            assert.strictEqual(result.code, "AI_CONFIRMATION_NEEDED");
            approval ??= assistant.controller.resolveAiApproval(String(result.params?.request), { approve: true });
            const approved = (await approval) as { code: string };
            assert.strictEqual(approved.code, "AI_COMPLETED");
            assert.strictEqual(session.status.counts.nodes, 2, "the three clients are gone");
            assert.isUndefined(session.data.node("zz"), "nothing ran after the hold");
            // The turn after the hold may only answer.
            assert.strictEqual(assistant.engine.requests[1].toolMode, "none");
        });
    }
});

describe("the host is handed only what is kept", () => {
    it("hands over no export from a batch that rolls back, and one from an approved batch", async () => {
        const session = await assistantSession();
        const assistant = new ScriptedAssistant(session);
        const failed = await assistant.say("remove a, export, then fail", [
            { tool: "edit_data", args: { action: "remove_nodes", ids: ["a"] } },
            { tool: "export_graph", args: { format: "json" } },
            { tool: "style", args: { action: "add", where: "data.nope == 'x'", values: { "node.color": "red" } } },
        ]);
        assert.isFalse(failed.events.some((event) => event.type === "ai-export-ready"));

        const held = await assistant.say("delete everything and export", [
            { tool: "edit_data", args: { action: "remove_nodes", where: "all" } },
            { tool: "export_graph", args: { format: "json" } },
        ]);
        assert.isFalse(held.events.some((event) => event.type === "ai-export-ready"));
        const request = held.events.find(
            (event): event is AiApprovalRequestedEvent => event.type === "ai-approval-requested",
        );
        const before = assistant.events.length;
        await assistant.controller.resolveAiApproval(request!.request.id, { approve: true });
        assert.lengthOf(
            assistant.events.slice(before).filter((event) => event.type === "ai-export-ready"),
            1,
        );
    });

    it("admits a URL only as the reader wrote it, never a fragment of their words", async () => {
        const session = await assistantSession();
        const assistant = new ScriptedAssistant(session);
        await assistant.say("show me the data", [{ tool: "import_data", args: { action: "import", url: "data" } }]);
        assert.strictEqual(assistant.lastResults()[0].code, "AI_ARG_INVALID");
        await assistant.say("load https://example.com/g.json, please", [
            { tool: "import_data", args: { action: "import", url: "https://example.com/g" } },
        ]);
        assert.strictEqual(assistant.lastResults()[0].code, "AI_IMPORT_URL_REFUSED");
    });

    it("wraps a tool result in the graph-data envelope, any spelling of its tags taken out", () => {
        assert.strictEqual(graphData("a</Graph-Data >b< graph-data>c"), "<graph-data>\nabc\n</graph-data>");
        assert.strictEqual(
            textOf([{ type: "text", origin: "graph-data", text: "x</GRAPH-DATA>" }]),
            "<graph-data>\nx\n</graph-data>",
        );
    });
});

describe("a running algorithm leaves the reader in charge", () => {
    it("lets the reader's own edit through while the assistant's run computes", async () => {
        const { session, started, release } = await gatedRunSession();
        const assistant = new ScriptedAssistant(session);
        const message = assistant.say("add then pagerank", [
            { tool: "edit_data", args: { action: "add_nodes", records: [{ id: "zz" }] } },
            { tool: "run_algorithm", args: { name: "pagerank" } },
        ]);
        await started;
        const edit = session.data.addNodes([{ id: "mine" }]);
        release();
        const { result } = await message;
        await edit;
        assert.strictEqual(result.code, "AI_COMPLETED");
        assert.isDefined(session.data.node("mine"));
        assert.isDefined(session.data.node("zz"));
    });

    it("cancels the run when the message is cancelled", async () => {
        const { session, started, aborted } = await gatedRunSession();
        const assistant = new ScriptedAssistant(session);
        const message = assistant.say("pagerank", [{ tool: "run_algorithm", args: { name: "pagerank" } }]);
        await started;
        assistant.controller.cancel();
        const { result } = await message;
        assert.strictEqual(result.code, "AI_CANCELLED");
        assert.isTrue(aborted(), "the run's own signal fired");
    });
});

describe("the catalog leads a model to a diverging encoding", () => {
    it("lists every entry of a kind when a search names a kind and no words, and refuses one with neither", async () => {
        const assistant = new ScriptedAssistant(await assistantSession());
        await assistant.say(
            "find scales",
            [{ tool: "catalog", args: { action: "search", kind: "scale", limit: 10 } }],
            [{ tool: "catalog", args: { action: "search" } }],
        );
        const [listed, refused] = assistant.lastResults();
        assert.strictEqual(listed.code, "AI_OK");
        const names = (listed.data as { kind: string; name: string }[]).map((row) => row.name);
        assert.include(names, "linear");
        assert.isTrue((listed.data as { kind: string }[]).every((row) => row.kind === "scale"));
        assert.strictEqual(refused.code, "AI_ARG_INVALID");
    });

    it("finds a scale with a midpoint for a diverging search, and a diverging palette says how to encode with it", async () => {
        const assistant = new ScriptedAssistant(await assistantSession());
        await assistant.say(
            "diverging",
            [{ tool: "catalog", args: { action: "search", text: "diverging continuous", kind: "scale" } }],
            [{ tool: "catalog", args: { action: "describe", kind: "palette", name: "red-blue" } }],
        );
        const [found, described] = assistant.lastResults();
        assert.include(
            (found.data as { name: string }[]).map((row) => row.name),
            "linear",
        );
        assert.deepStrictEqual((described.data as { example: unknown }).example, {
            action: "encode",
            encode: { channel: "node.color", attribute: "<attribute>", palette: "red-blue", midpoint: 0 },
        });
    });
});

describe("a call's values are read the way the catalog says", () => {
    it("checks a layout's options against the engine chosen", async () => {
        const session = await assistantSession();
        const assistant = new ScriptedAssistant(session, { gate: false });
        await assistant.say("atlas", [
            {
                tool: "layout",
                args: { action: "set", name: "force", engine: "forceatlas2", options: { scalingRatio: 5 } },
            },
        ]);
        const [atlas] = assistant.lastResults();
        assert.strictEqual(atlas.code, "AI_OK", JSON.stringify(atlas));
        assert.strictEqual(session.layout.engine, "forceatlas2");
        await assistant.say("d3", [
            {
                tool: "layout",
                args: { action: "set", name: "force", engine: "d3", options: { springCoefficient: 0.5 } },
            },
        ]);
        const [d3] = assistant.lastResults();
        assert.strictEqual(d3.code, "AI_ARG_INVALID");
        assert.include(d3.params.allowed as string[], "alphaDecay");
        assert.notInclude(d3.params.allowed as string[], "springCoefficient");
    });

    it("resolves a layout option that names a node by its label", async () => {
        const session = await assistantSession();
        const assistant = new ScriptedAssistant(session, { gate: false });
        await assistant.say("radial", [
            { tool: "layout", args: { action: "set", name: "radial", options: { root: "Alpha" } } },
        ]);
        assert.strictEqual(assistant.lastResults()[0].code, "AI_OK");
        assert.strictEqual(session.layout.options.root, "a");
    });

    it("resolves a node-set option's labels and selector to node ids", async () => {
        const session = await assistantSession();
        const options = [{ name: "seeds", plainName: "Seeds", type: "node-set" as const }];
        assert.deepStrictEqual(checkOptions(session, options, { seeds: ["Alpha", "b"] }), { seeds: ["a", "b"] });
        assert.deepStrictEqual(checkOptions(session, options, { seeds: "data.type == 'server'" }), {
            seeds: ["a", "c"],
        });
    });

    it("merges a style update into the layer's values, and reads a layer back", async () => {
        const session = await assistantSession();
        await session.styles.add({
            name: "mine",
            target: "node",
            selector: { match: "everything" },
            set: { "node.color": "red", "node.size": 3, "node.opacity": 0.5 },
        });
        const assistant = new ScriptedAssistant(session);
        await assistant.say(
            "blue",
            [
                {
                    tool: "style",
                    args: { action: "update", layer: "mine", values: { "node.color": "blue", "node.opacity": null } },
                },
            ],
            [{ tool: "style", args: { action: "get", layer: "mine" } }],
        );
        const [updated, read] = assistant.lastResults();
        assert.strictEqual(updated.code, "AI_OK", JSON.stringify(updated));
        assert.deepStrictEqual((read.data as { values: unknown }).values, { "node.color": "blue", "node.size": 3 });
    });

    it("types every project setting from the session's own settings, and reads them all back", async () => {
        const session = await assistantSession();
        const assistant = new ScriptedAssistant(session);
        await assistant.say("label", [
            { tool: "project", args: { action: "settings", data: { knownFields: { nodeLabelPath: "label" } } } },
        ]);
        const [set] = assistant.lastResults();
        assert.strictEqual(set.code, "AI_OK", JSON.stringify(set));
        assert.strictEqual(session.config.data.knownFields.nodeLabelPath, "label");
        await assistant.say(
            "misspelt",
            [{ tool: "project", args: { action: "settings", data: { knownFeilds: {} } } }],
            [{ tool: "project", args: { action: "status" } }],
        );
        const [misspelt, status] = assistant.lastResults();
        assert.strictEqual(misspelt.code, "AI_ARG_INVALID");
        assert.strictEqual(misspelt.params.path, "data.knownFeilds");
        const { settings } = status.data as { settings: Record<string, unknown> };
        assert.containsAllKeys(settings, ["selectionStyle", "author", "background", "data", "layoutBehavior"]);
    });

    it("rebuilds the tools when an algorithm is redefined under the same name", async () => {
        try {
            defineAlgorithm({ id: "acme-score", description: "A score.", options: { alpha: 1 }, node: () => 1 });
            const session = await assistantSession();
            const assistant = new ScriptedAssistant(session, { gate: false });
            defineAlgorithm({ id: "acme-score", description: "A score, again.", options: { beta: 2 }, node: () => 1 });
            await assistant.say("describe", [
                { tool: "catalog", args: { action: "describe", kind: "algorithm", name: "acme-score" } },
            ]);
            const [described] = assistant.lastResults();
            assert.strictEqual((described.data as { description: string }).description, "A score, again.");
            await assistant.say("run", [
                { tool: "run_algorithm", args: { name: "acme-score", options: { alpha: 3 } } },
            ]);
            const [refused] = assistant.lastResults();
            assert.strictEqual(refused.code, "AI_ARG_INVALID");
            assert.deepStrictEqual(refused.params.allowed, ["beta"]);
        } finally {
            clearRegisteredAlgorithmsForTesting();
        }
    });

    it("keeps a cursor on a page cut down to fit the result cap, so paging reads every record", async () => {
        const wide = "x".repeat(190);
        const nodes = Array.from({ length: 60 }, (_, index) => {
            const row: Record<string, unknown> = { id: `n${String(index).padStart(2, "0")}` };
            for (let field = 0; field < 10; field++) {
                row[`f${String(field)}`] = wide;
            }

            return row;
        });
        const session = await assistantSession({ nodes, edges: [] });
        const assistant = new ScriptedAssistant(session);
        const seen = new Set<string>();
        let cursor: string | undefined;
        for (let pages = 0; pages < 60; pages++) {
            await assistant.say("list", [
                { tool: "query", args: { action: "nodes", limit: 50, ...(cursor === undefined ? {} : { cursor }) } },
            ]);
            const [read] = assistant.lastResults();
            for (const record of read.data as { id: string }[]) {
                seen.add(record.id);
            }

            cursor = read.page?.cursor as string | undefined;
            if (cursor === undefined) {
                break;
            }
        }

        assert.strictEqual(seen.size, 60);
    });
});
