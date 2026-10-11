/**
 * @file Every action of every generated tool, run through the scripted engine on a real session:
 * a reference call that succeeds, and what it leaves behind. A write adds exactly one undo step,
 * and one undo restores what the project saves; a read or an exempt action (the camera, the
 * selection) adds none and changes nothing saved. A table row per action, and a test that fails
 * when an action has no row, so a new action is contract-tested the day it is generated.
 */

import { assert, describe, it } from "vitest";

import type { GraphSession } from "../../../session";
import { buildToolset } from "../../../src/ai/tools/toolset";
import { assistantSession, digest, ScriptedAssistant } from "../../helpers/assistant";

/** A stand-in renderer: the camera, captures and XR answer as a renderer would. */
const RENDERER = {
    applyCameraView: () => Promise.resolve(),
    getCameraState: () => ({ position: { x: 0, y: 0, z: 10 }, target: { x: 0, y: 0, z: 0 } }),
    captureScreenshot: () =>
        Promise.resolve({ blob: new Blob(["png"]), metadata: { width: 10, height: 10, format: "png", byteSize: 3 } }),
    captureAnimation: () =>
        Promise.resolve({
            blob: new Blob(["webm"]),
            metadata: { width: 10, height: 10, format: "webm", duration: 1000 },
        }),
    cancelAnimationCapture: () => false,
    isVRSupported: () => Promise.resolve(false),
    isARSupported: () => Promise.resolve(false),
};

/** One reference call. */
interface Row {
    readonly args: Record<string, unknown>;
    /** The code the model reads; `AI_OK` (or the session's own success code) when absent. */
    readonly code?: string;
    /** The gate: off for a row whose small graph trips its share of nodes. */
    readonly gate?: false;
    /** State the call acts on, made before the message. */
    readonly setup?: (session: GraphSession) => unknown;
}

/** A run of degree, for the actions that read one. */
const withRun = async (session: GraphSession): Promise<unknown> => session.runs.start("degree");
/** A set, for the sets actions. */
const withSet = (session: GraphSession): Promise<unknown> =>
    Promise.resolve(session.sets.create({ kind: "fixed", nodes: ["a", "b"], reading: "induced" }, { name: "pair" }));
/** A note, for the notes actions. */
const withNote = (session: GraphSession): Promise<unknown> =>
    Promise.resolve(session.notes.add({ text: "first", targets: [{ node: "a" }] }));

/** A reference call for every action, by `tool.action`. */
const ROWS: Record<string, Row> = {
    "catalog.search": { args: { action: "search", text: "communities" } },
    "catalog.describe": { args: { action: "describe", kind: "algorithm", name: "pagerank" } },
    "query.overview": { args: { action: "overview" } },
    "query.nodes": { args: { action: "nodes", where: "data.type == 'server'", fields: ["id", "label"] } },
    "query.edges": { args: { action: "edges", node: "a" } },
    "query.node": { args: { action: "node", ids: ["Alpha"] } },
    "query.neighbors": { args: { action: "neighbors", ids: ["c"], hops: 2 } },
    "query.find": { args: { action: "find", text: "Del" } },
    "query.attributes": { args: { action: "attributes" } },
    "query.histogram": { args: { action: "histogram", column: "team" } },
    "query.statistics": { args: { action: "statistics" } },
    "query.count": { args: { action: "count", where: "data.load > `0.5`" } },
    "select.set": { args: { action: "set", where: "data.type == 'server'" } },
    "select.add": { args: { action: "add", ids: ["b"] } },
    "select.remove": { args: { action: "remove", ids: ["a"] }, setup: (s) => s.selection.apply({ ids: ["a", "b"] }) },
    "select.clear": { args: { action: "clear" } },
    "select.neighborhood": { args: { action: "neighborhood", ids: ["a"], hops: 1 } },
    "select.save_as_set": {
        args: { action: "save_as_set", name: "picked" },
        setup: (s) => s.selection.apply({ ids: ["a"] }),
    },
    "run_algorithm.run": { args: { name: "degree" } },
    "results.list": { args: { action: "list" }, setup: withRun },
    "results.summary": { args: { action: "summary", run: "degree" }, setup: withRun },
    "results.top": { args: { action: "top", run: "degree", k: 2 }, setup: withRun },
    "results.histogram": { args: { action: "histogram", run: "degree" }, setup: withRun },
    "results.page": { args: { action: "page", run: "degree", limit: 2 }, setup: withRun },
    "results.rerun": { args: { action: "rerun", run: "degree" }, setup: withRun },
    "results.cancel": { args: { action: "cancel", run: "degree" }, setup: withRun, code: "AI_CONFIRM_REQUIRED" },
    "results.remove": { args: { action: "remove", run: "degree" }, setup: withRun },
    "style.add": {
        args: { action: "add", where: "data.team == 'red'", values: { "node.color": "red" } },
        code: "style.add-layer",
    },
    "style.update": {
        args: { action: "update", layer: "mine", values: { "node.color": "blue" } },
        setup: (s) =>
            s.styles.add({
                name: "mine",
                target: "node",
                selector: { match: "everything" },
                set: { "node.color": "red" },
            }),
    },
    "style.remove": {
        args: { action: "remove", layer: "mine" },
        setup: (s) =>
            s.styles.add({
                name: "mine",
                target: "node",
                selector: { match: "everything" },
                set: { "node.color": "red" },
            }),
    },
    "style.move": {
        args: { action: "move", layer: "mine", position: "bottom" },
        setup: async (s) => {
            await s.styles.add({
                name: "other",
                target: "node",
                selector: { match: "everything" },
                set: { "node.size": 2 },
            });
            await s.styles.add({
                name: "mine",
                target: "node",
                selector: { match: "everything" },
                set: { "node.color": "red" },
            });
        },
    },
    "style.encode": {
        args: { action: "encode", encode: { channel: "node.color", attribute: "team" } },
        code: "style.encode",
    },
    "style.apply_suggestion": {
        args: { action: "apply_suggestion", run: "degree" },
        setup: async (s) => s.runs.start("degree", {}, { style: false }),
    },
    "style.highlight": {
        args: { action: "highlight", run: "shortest-path" },
        setup: (s) => s.runs.start("shortest-path", { source: "a", target: "e" }),
    },
    "style.hide_value": {
        args: { action: "hide_value", layer: "teams", channel: "node.color", value: "red", hidden: true },
        setup: (s) => s.styles.encode({ column: { kind: "node", name: "team" }, channel: "node.color", name: "teams" }),
    },
    "style.clear_mine": {
        args: { action: "clear_mine" },
        setup: (s) =>
            s.styles.add({
                name: "ai",
                target: "node",
                selector: { match: "everything" },
                set: { "node.color": "red" },
                source: { by: "plugin", name: "graphty-ai" },
            }),
    },
    "style.list": { args: { action: "list" } },
    "style.legend": { args: { action: "legend" } },
    "style.explain": { args: { action: "explain", node: "a" } },
    "filter.show_only": { args: { action: "show_only", where: "data.weight > `0.5`", on: "edge" } },
    "filter.hide": { args: { action: "hide", where: "data.type == 'client'" } },
    "filter.clear": {
        args: { action: "clear" },
        setup: (s) => s.visibility.set({ kind: "expression", where: "data.type == 'server'" }),
    },
    "filter.range": { args: { action: "range", attribute: "load", from: 0.3, to: 1 } },
    "filter.keep_neighbors": { args: { action: "keep_neighbors", ids: ["a"], hops: 1 } },
    "filter.context": { args: { action: "context", enabled: true } },
    "layout.set": { args: { action: "set", name: "circular" } },
    "layout.scope": { args: { action: "scope", where: "data.team == 'red'" } },
    "layout.pin": { args: { action: "pin", ids: ["a"] } },
    "layout.unpin": { args: { action: "unpin", ids: ["a"] }, setup: (s) => s.positions.pin(["a"]) },
    "layout.set_positions": { args: { action: "set_positions", positions: [{ id: "a", x: 1, y: 2 }] } },
    "view.dimension": { args: { action: "dimension", dimension: "2d" } },
    "view.camera": { args: { action: "camera", preset: "topView" }, code: "E_UNSUPPORTED" },
    "view.zoom_to": { args: { action: "zoom_to", where: "data.type == 'server'" } },
    "view.fit": { args: { action: "fit" } },
    "view.save": { args: { action: "save", name: "overview" } },
    "view.restore": {
        args: { action: "restore", name: "kept" },
        setup: (s) => s.views.save([{ name: "kept", camera: { zoom: 2 } }]),
        code: "E_UNSUPPORTED",
    },
    "view.remove_saved": {
        args: { action: "remove_saved", name: "kept" },
        setup: (s) => s.views.save([{ name: "kept", camera: { zoom: 2 } }]),
    },
    "view.list_saved": { args: { action: "list_saved" } },
    "edit_data.add_nodes": { args: { action: "add_nodes", records: [{ id: "f", type: "client" }] } },
    "edit_data.add_edges": { args: { action: "add_edges", records: [{ source: "Alpha", target: "e" }] } },
    "edit_data.update_nodes": {
        args: { action: "update_nodes", where: "data.team == 'red'", values: { team: "green" } },
    },
    "edit_data.update_edges": {
        args: { action: "update_edges", where: "data.weight > `0.5`", values: { heavy: true } },
    },
    "edit_data.remove_nodes": { args: { action: "remove_nodes", ids: ["e"] }, gate: false },
    "edit_data.remove_edges": { args: { action: "remove_edges", where: "data.weight < `0.25`" } },
    "edit_data.delete_all": { args: { action: "delete_all" }, code: "AI_CONFIRM_REQUIRED" },
    "undo.undo": {
        args: { action: "undo" },
        code: "AI_UNDO_NOT_MINE",
        setup: (s) => s.data.updateNodes([{ id: "a", values: { team: "x" } }]),
    },
    "undo.redo": { args: { action: "redo" }, code: "AI_UNDO_NOTHING" },
    "undo.recent": { args: { action: "recent" } },
    "sets.create": { args: { action: "create", where: "data.type == 'server'", name: "Servers" } },
    "sets.create_from": { args: { action: "create_from", ids: ["a", "c"], name: "AC" } },
    "sets.path": {
        args: { action: "path", name: "route" },
        setup: async (s) => {
            await s.selection.apply({ ids: ["a", "c"] });
            await s.selection.apply({ where: "data.weight == `0.5`" }, "add");
        },
    },
    "sets.combine": { args: { action: "combine", op: "union", sets: ["pair", "pair"], name: "both" }, setup: withSet },
    "sets.rename": { args: { action: "rename", set: "pair", name: "couple" }, setup: withSet },
    "sets.redefine": { args: { action: "redefine", set: "pair", where: "data.team == 'blue'" }, setup: withSet },
    "sets.add_members": { args: { action: "add_members", set: "pair", nodes: ["c"] }, setup: withSet },
    "sets.remove_members": { args: { action: "remove_members", set: "pair", nodes: ["b"] }, setup: withSet },
    "sets.remove": { args: { action: "remove", set: "pair" }, setup: withSet },
    "sets.restore": {
        args: { action: "restore", set: "removed" },
        setup: async (s) => {
            const id = s.sets.create({ kind: "fixed", nodes: ["a"], reading: "induced" }, { name: "gone" });
            // Something names it, so its record is kept when it is removed.
            await s.styles.add({
                name: "members",
                target: "node",
                selector: { match: "member", of: { set: id } },
                set: { "node.color": "red" },
            });
            s.sets.remove(id);
            restored.id = id;
        },
    },
    "sets.list": { args: { action: "list" }, setup: withSet },
    "sets.get": { args: { action: "get", set: "pair" }, setup: withSet },
    "sets.containing": { args: { action: "containing", node: "a" }, setup: withSet },
    "sets.offers": { args: { action: "offers", run: "louvain" }, setup: (s) => s.runs.start("louvain") },
    "notes.add": { args: { action: "add", ids: ["a"], text: "checked" } },
    "notes.update": { args: { action: "update", note: "NOTE", text: "second" }, setup: withNote },
    "notes.remove": { args: { action: "remove", note: "NOTE" }, setup: withNote },
    "notes.list": { args: { action: "list" }, setup: withNote },
    "notes.get": { args: { action: "get", note: "NOTE" }, setup: withNote },
    "import_data.import": { args: { action: "import", format: "csv", text: "source,target\nx,y" } },
    "import_data.rename_source": {
        args: { action: "rename_source", name: "Servers" },
        setup: (s) => s.data.import({ type: "csv", config: { data: "source,target\np,q" } }),
    },
    "import_data.last_import": { args: { action: "last_import" } },
    "export_graph.export": { args: { format: "graphml" } },
    "project.settings": { args: { action: "settings", runAlgorithmsOnLoad: true } },
    "project.rename": { args: { action: "rename", name: "Network" } },
    "project.declare": { args: { action: "declare", column: "load", measurement: "quantitative" } },
    "project.status": { args: { action: "status" } },
    "capture.screenshot": { args: { action: "screenshot", width: 100, height: 100 } },
    "capture.animation": { args: { action: "animation", seconds: 1 } },
    "capture.cancel": { args: { action: "cancel" } },
    "immersive.enter": { args: { action: "enter", mode: "vr" }, code: "E_UNSUPPORTED" },
    "immersive.exit": { args: { action: "exit" }, code: "E_UNSUPPORTED" },
    "immersive.support": { args: { action: "support" } },
};

/** The id of the set `sets.restore` brings back, filled in by its setup. */
const restored: { id?: string } = {};

/** Every `tool.action` the generator makes. */
function generatedActions(): { key: string; effect: string }[] {
    return buildToolset().tools.flatMap((tool) =>
        tool.definition.actions.map((action) => ({ key: `${tool.name}.${action.name}`, effect: action.effect })),
    );
}

describe("every generated action", () => {
    const actions = generatedActions();

    it("has a reference call in this table", () => {
        const keys = actions.map((action) => action.key).sort();
        assert.deepStrictEqual(Object.keys(ROWS).sort(), keys);
    });

    for (const { key, effect } of actions) {
        const row = ROWS[key] as Row | undefined;
        if (row === undefined) {
            continue;
        }

        it(`${key}: ${effect === "write" ? "one undo step that one undo takes back" : "no step, nothing saved changes"}`, async () => {
            const session = await assistantSession();
            await row.setup?.(session);
            await session.styles.settled();
            const [tool] = key.split(".");
            const args = { ...row.args };
            if (args.note === "NOTE") {
                args.note = session.notes.list()[0].id;
            }

            if (key === "sets.restore") {
                args.set = restored.id;
            }

            const assistant = new ScriptedAssistant(session, {
                graph: RENDERER,
                ...(row.gate === false ? { gate: false } : {}),
            });
            const before = await digest(session);
            const steps = session.history.position;
            const { result } = await assistant.say(`do ${key}`, [{ tool, args }]);
            const [read] = assistant.lastResults();
            const expected = row.code ?? (read.code.startsWith("style.") ? read.code : "AI_OK");
            assert.strictEqual(read.code, expected, JSON.stringify(read));
            const added = session.history.position - steps;
            const succeeded = read.code === "AI_OK" || read.code.startsWith("style.");
            if (effect === "write" && succeeded) {
                assert.strictEqual(added, 1, `${key} adds one step (${JSON.stringify(result)})`);
                await session.undo();
                assert.strictEqual(await digest(session), before, `${key}: one undo restores what a project saves`);
            } else if (effect === "write") {
                assert.strictEqual(added, 0, `${key} refused adds no step`);
                assert.strictEqual(await digest(session), before);
            } else {
                assert.strictEqual(added, 0, `${key} adds no step`);
                assert.strictEqual(await digest(session), before, `${key} changes nothing a project saves`);
            }
        });

        it(`${key}: refuses a field it does not take, running nothing`, async () => {
            const session = await assistantSession();
            const [tool, action] = key.split(".");
            const assistant = new ScriptedAssistant(session, { graph: RENDERER, gate: false });
            const before = await digest(session);
            const steps = session.history.position;
            const args =
                tool === "run_algorithm" || tool === "export_graph" ? { ...row.args } : { ...row.args, action };
            await assistant.say(`stray ${key}`, [{ tool, args: { ...args, notAField: "x" } }]);
            const [read] = assistant.lastResults();
            assert.strictEqual(read.code, "AI_ARG_INVALID", JSON.stringify(read));
            assert.strictEqual(read.params.path, "notAField");
            assert.strictEqual(session.history.position, steps);
            assert.strictEqual(await digest(session), before);
        });
    }

    it("refuses an action a tool does not have, naming the ones it has", async () => {
        const session = await assistantSession();
        const assistant = new ScriptedAssistant(session);
        const tools = buildToolset().tools.filter((tool) => tool.definition.actions.length > 1);
        for (const tool of tools) {
            await assistant.say(`no such action of ${tool.name}`, [{ tool: tool.name, args: { action: "teleport" } }]);
            const [read] = assistant.lastResults();
            assert.strictEqual(read.code, "AI_UNKNOWN_ACTION", tool.name);
            assert.deepStrictEqual(
                read.params.allowed,
                tool.definition.actions.map((action) => action.name),
            );
        }
    });
});
