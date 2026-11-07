/**
 * @file What the assistant exports is what the message is about: a target the call names, else
 * all of the bound selection, else the whole graph. Each case reads the document the host received.
 */

import { assert, describe, it } from "vitest";

import { createGraphSession } from "../../session";
import { exportSession } from "../../src/data/export";
import type { AiExportReadyEvent } from "../../src/events";
import { assistantSession, callsTurn, ScriptedAssistant, textTurn } from "../helpers/assistant";

/** Twenty-four volunteers in a ring. */
const VOLUNTEERS = Array.from({ length: 24 }, (_value, at) => ({ id: `v${String(at + 1)}`, hours: at + 1 }));

const RING = VOLUNTEERS.map((node, at) => ({ source: node.id, target: VOLUNTEERS[(at + 1) % 24].id }));

/** Five of the volunteers: v1 to v4 hold three edges between them; v10 touches none of them. */
const FIVE = ["v1", "v2", "v3", "v4", "v10"];

const NODES = { format: "csv", options: { table: "nodes" } };

const EDGES = { format: "csv", options: { table: "edges" } };

/**
 * The rows of a CSV table, past its header.
 * @param document - The CSV.
 * @returns The rows.
 */
function rows(document: string): string[] {
    return document.trim().split("\n").slice(1);
}

/**
 * Send one export call with the five selected, and read what the host received.
 * @param bound - Whether the message is bound to the selection.
 * @param args - The call.
 * @returns The call's code and the document, if one was written.
 */
async function exported(bound: boolean, args: Record<string, unknown>): Promise<{ code: string; data?: string }> {
    const session = await assistantSession({ nodes: VOLUNTEERS, edges: RING }, ["assistant"]);
    await session.selection.apply({ ids: FIVE });
    const assistant = new ScriptedAssistant(session, { gate: false });
    assistant.engine.push(callsTurn([{ tool: "export_graph", args }]), textTurn("done"));
    await assistant.controller.execute("save this", bound ? { scope: "selection" } : undefined);
    const file = assistant.events.find((event): event is AiExportReadyEvent => event.type === "ai-export-ready");
    return { code: assistant.lastResults()[0].code, ...(file === undefined ? {} : { data: file.data as string }) };
}

/**
 * The rows of the table one export call wrote.
 * @param bound - Whether the message is bound to the selection.
 * @param args - The call.
 * @returns The rows.
 */
async function written(bound: boolean, args: Record<string, unknown>): Promise<string[]> {
    const { code, data } = await exported(bound, args);
    assert.strictEqual(code, "AI_OK");
    return rows(data ?? "");
}

describe("export_graph writes what the message is about", () => {
    it("writes the bound selection's nodes and only the edges between them", async () => {
        const nodes = await written(true, NODES);

        assert.deepEqual(
            nodes.map((row) => row.split(",")[0]),
            FIVE,
        );
        assert.lengthOf(await written(true, EDGES), 3);
    });

    it("writes a named target, by ids and by a selector", async () => {
        const where = "data.hours <= `4` || data.hours == `10`";

        assert.lengthOf(await written(false, { ...NODES, ids: FIVE }), 5);
        assert.lengthOf(await written(false, { ...EDGES, ids: FIVE }), 3);
        assert.lengthOf(await written(false, { ...NODES, where }), 5);
        assert.lengthOf(await written(false, { ...EDGES, where }), 3);
    });

    it("writes a narrowed CSV's node table when the call names no table, and the edge table otherwise", async () => {
        const nodes = await written(true, { format: "csv" });

        assert.deepEqual(
            nodes.map((row) => row.split(",")[0]),
            FIVE,
        );
        assert.lengthOf(await written(false, { format: "csv", ids: FIVE }), 5);
        assert.lengthOf(await written(false, { format: "csv" }), 24);
        assert.include((await exported(false, { format: "csv" })).data ?? "", "source,target");
    });

    it("limits a named target to the bound selection", async () => {
        assert.lengthOf(await written(true, { ...NODES, where: "data.hours <= `2`" }), 2);
    });

    it("writes the whole graph on an unbound call with no target, whatever is selected", async () => {
        assert.lengthOf(await written(false, NODES), 24);
        assert.lengthOf(await written(false, EDGES), 24);
    });

    it("writes the whole graph on a bound message when the call asks for the whole graph", async () => {
        assert.lengthOf(await written(true, { ...NODES, whole: true }), 24);
        assert.lengthOf(await written(true, { ...EDGES, whole: true }), 24);
    });

    it("reads where selection as the current selection on an unbound message", async () => {
        assert.lengthOf(await written(false, { ...NODES, where: "selection" }), 5);
        assert.lengthOf(await written(false, { ...EDGES, where: "selection" }), 3);
    });

    it("refuses where selection when nothing is selected, and writes no file", async () => {
        const session = await assistantSession({ nodes: VOLUNTEERS, edges: RING }, ["assistant"]);
        const assistant = new ScriptedAssistant(session, { gate: false });
        assistant.engine.push(
            callsTurn([{ tool: "export_graph", args: { ...NODES, where: "selection" } }]),
            textTurn("done"),
        );
        await assistant.controller.execute("save the selection");
        assert.strictEqual(assistant.lastResults()[0].code, "AI_EMPTY_MATCH");
        assert.isUndefined(assistant.events.find((event) => event.type === "ai-export-ready"));
    });

    it("refuses a target that holds nothing, and writes no file", async () => {
        const { code, data } = await exported(false, { ...NODES, where: "data.hours > `100`" });

        assert.strictEqual(code, "AI_EMPTY_MATCH");
        assert.isUndefined(data);
    });

    it("refuses the project format when the call is narrowed, and writes it when it is not", async () => {
        const named = await exported(false, { format: "graphty", ids: FIVE });
        const bound = await exported(true, { format: "graphty" });
        const whole = await exported(false, { format: "graphty" });

        assert.strictEqual(named.code, "E_UNKNOWN_OPTION");
        assert.strictEqual(bound.code, "E_UNKNOWN_OPTION");
        assert.isUndefined(named.data);
        assert.isUndefined(bound.data);
        assert.strictEqual(whole.code, "AI_OK");
        assert.exists(whole.data);
    });
});

describe("exportSession with a nodes scope", () => {
    it("matches ids however they are spelled and tells a rule from a list of nodes", async () => {
        const session = createGraphSession();
        await session.data.addNodes([
            { id: 1, hours: 1 },
            { id: 2, hours: 2 },
            { id: 3, hours: 3 },
        ]);
        await session.data.addEdges([{ source: 1, target: 2 }]);

        const listed = await exportSession(session, "csv", { table: "nodes", scope: { nodes: ["1", 2] } }).text();
        const ruled = await exportSession(session, "csv", {
            table: "nodes",
            scope: { kind: "range", attribute: "data.hours", min: 3, nodes: "all" },
        }).text();

        assert.lengthOf(rows(listed), 2);
        assert.lengthOf(rows(ruled), 1);
    });
});
