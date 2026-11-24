/**
 * @file The assistant's `style` tool, one call a message, read back through what the model reads and
 * through `session.styles`: how `values` are spelled and checked, an add that changes the
 * assistant's own layer instead of hiding it, positions, update's merge and removal, get, move,
 * list, legend, explain, encode by attribute and by run with its scale options, hiding a legend
 * value and clearing the assistant's layers.
 */

import { assert, describe, it } from "vitest";

import type { GraphSession } from "../../../src/session";
import { assistantSession, ScriptedAssistant } from "../../helpers/assistant";

/** What the model read for one call. */
interface Read {
    code: string;
    params: Record<string, unknown>;
    data?: unknown;
}

/**
 * An assistant whose model makes one `style` call per message.
 * @returns The session and a function that sends one call and returns what the model read.
 */
async function styleAssistant(): Promise<{
    session: GraphSession;
    call: (args: Record<string, unknown>) => Promise<Read>;
}> {
    const session = await assistantSession();
    const assistant = new ScriptedAssistant(session);
    return {
        session,
        call: async (args) => {
            await assistant.say("style", [{ tool: "style", args }]);
            return assistant.lastResults().at(-1)!;
        },
    };
}

/**
 * The names of the layers not written by the element, bottom first.
 * @param session - The session.
 * @returns The names.
 */
function ownLayers(session: GraphSession): string[] {
    return session.styles
        .list()
        .filter((layer) => layer.source.by !== "element")
        .map((layer) => layer.name);
}

describe("values", () => {
    it("takes the nested form, a bare element color and a loose spelling of a channel", async () => {
        const { session, call } = await styleAssistant();
        const added = await call({
            action: "add",
            where: "all",
            values: { node: { color: "red", size: 2 } },
            name: "Reds",
        });
        assert.strictEqual(added.code, "style.add-layer");
        assert.deepStrictEqual(added.params, {
            layer: added.params.layer,
            matched: 5,
            painted: { "node.color": 5, "node.size": 5 },
        });

        // Each add over the same elements changes the assistant's own layer rather than stacking another.
        const blue = await call({ action: "add", where: "all", values: { node: "blue" } });
        assert.strictEqual(blue.code, "AI_OK");
        assert.include(blue.params, { layer: added.params.layer, updated: true });
        const size = await call({ action: "add", where: "all", values: { nodeSize: 3 } });
        assert.include(size.params, { updated: true });
        const reds = session.styles.list().find((layer) => layer.name === "Reds");
        assert.deepStrictEqual(reds?.set, { "node.color": "blue", "node.size": 3 });
        assert.deepStrictEqual(ownLayers(session), ["Reds"]);
    });

    it("refuses a value out of a channel's range, outside its choices or of the wrong type", async () => {
        const { session, call } = await styleAssistant();
        const big = await call({ action: "add", where: "all", values: { "node.size": 99_999 } });
        assert.strictEqual(big.code, "AI_ARG_OUT_OF_RANGE");
        assert.include(big.params, { path: "values.node.size", expected: "number", min: 0, max: 10_000 });
        assert.strictEqual(
            (await call({ action: "add", where: "all", values: { "node.size": -5 } })).code,
            "AI_ARG_OUT_OF_RANGE",
        );

        const shape = await call({ action: "add", where: "all", values: { "node.shape": "nope" } });
        assert.strictEqual(shape.code, "AI_ARG_INVALID");
        assert.include(shape.params, { path: "values.node.shape", expected: "enum" });
        assert.include(shape.params.allowed as string[], "sphere");

        const visible = await call({ action: "add", where: "all", values: { "node.visible": "yes" } });
        assert.strictEqual(visible.code, "AI_ARG_INVALID");
        assert.include(visible.params, { path: "values.node.visible", expected: "boolean" });
        assert.notProperty(visible.params, "max");
        assert.deepStrictEqual(ownLayers(session), []);
    });

    it("refuses nodes and edges in one add, an unknown channel, and a target that matches nothing", async () => {
        const { session, call } = await styleAssistant();
        const both = await call({ action: "add", where: "all", values: { "node.color": "red", "edge.color": "blue" } });
        assert.include(both.params, { path: "values", expected: "node.* or edge.* channels, not both" });

        const unknown = await call({ action: "add", where: "all", values: { "node.bogus": 1 } });
        assert.strictEqual(unknown.code, "AI_UNKNOWN_ENTRY");
        assert.include(unknown.params, { kind: "channel", name: "node.bogus" });

        const none = await call({ action: "add", where: "data.type == 'nope'", values: { "node.color": "red" } });
        assert.strictEqual(none.code, "AI_EMPTY_MATCH");
        assert.include(none.params, { where: "data.type == 'nope'", nodes: 0, edges: 0 });

        // Node ids name no edge, so the edge layer they would make matches nothing and is rolled back.
        const edges = await call({ action: "add", ids: ["a", "b"], values: { "edge.color": "red" } });
        assert.strictEqual(edges.code, "AI_EMPTY_MATCH");
        assert.include(edges.params, { matched: 0 });
        assert.deepStrictEqual(ownLayers(session), []);
    });
});

describe("layers in the stack", () => {
    it("adds above or below a named layer", async () => {
        const { session, call } = await styleAssistant();
        await call({ action: "add", where: "all", values: { "node.color": "red" }, name: "Reds" });
        const above = await call({
            action: "add",
            where: "all",
            values: { "edge.width": 2 },
            name: "Wide",
            position: "above",
            relativeTo: "Reds",
        });
        assert.strictEqual(above.code, "style.add-layer");
        const below = await call({
            action: "add",
            where: "data.type == 'server'",
            values: { "node.size": 2 },
            name: "Big servers",
            position: "below",
            relativeTo: "Reds",
        });
        assert.strictEqual(below.code, "style.add-layer");
        const bottom = await call({
            action: "add",
            where: "data.type == 'client'",
            values: { "node.size": 0.5 },
            name: "Small clients",
            position: "bottom",
        });
        assert.strictEqual(bottom.code, "style.add-layer");
        assert.deepStrictEqual(ownLayers(session), ["Small clients", "Big servers", "Reds", "Wide"]);
    });

    it("updates by merging values, removing a channel set to null, renaming, rescoping and hiding", async () => {
        const { session, call } = await styleAssistant();
        await call({ action: "add", where: "all", values: { node: { color: "red", size: 2 } }, name: "Reds" });
        const hidden = await call({
            action: "update",
            layer: "Reds",
            values: { node: { size: null }, "node.color": "orange" },
            name: "Oranges",
            enabled: false,
        });
        assert.strictEqual(hidden.code, "AI_OK");
        assert.include(hidden.params, { matched: 5 });
        let layer = session.styles.list().find((each) => each.name === "Oranges");
        assert.deepStrictEqual(layer?.set, { "node.color": "orange" });
        assert.isFalse(layer?.enabled);

        const shown = await call({ action: "update", layer: "Oranges", where: "data.type == 'server'", enabled: true });
        assert.deepStrictEqual(shown.params, { layer: layer?.id, matched: 2, painted: { "node.color": 2 } });
        layer = session.styles.get(layer.id);
        assert.deepStrictEqual(layer?.selector, { match: "expression", where: "data.type == 'server'" });
        assert.isTrue(layer?.enabled);

        const other = await call({ action: "update", layer: "Oranges", values: { "edge.color": "red" } });
        assert.strictEqual(other.code, "AI_ARG_INVALID");
        assert.include(other.params, { path: "values", expected: "node.* channels" });

        const missing = await call({ action: "update", layer: "nope", values: { "node.color": "red" } });
        assert.strictEqual(missing.code, "AI_UNKNOWN_ENTRY");
        assert.include(missing.params, { kind: "layer", name: "nope" });
    });

    it("reads a layer back with get, and the stack with list and legend", async () => {
        const { call } = await styleAssistant();
        const added = await call({
            action: "add",
            where: "data.type == 'server'",
            values: { "node.color": "orange" },
            name: "Servers",
        });
        const got = await call({ action: "get", layer: "Servers" });
        assert.deepInclude(got.data as object, {
            layer: added.params.layer,
            name: "Servers",
            kind: "custom",
            target: "node",
            enabled: true,
            mine: true,
            selector: { match: "expression", where: "data.type == 'server'" },
            values: { "node.color": "orange" },
        });
        assert.notProperty(got.data as object, "encode");

        const listed = (await call({ action: "list" })).data as { name: string; mine: boolean }[];
        assert.deepStrictEqual(
            listed.filter((each) => each.mine).map((each) => each.name),
            ["Servers"],
        );
        const legend = (await call({ action: "legend", layer: "Servers" })).data as {
            channel: string;
            painted: number;
        }[];
        assert.deepStrictEqual(
            legend.map((each) => [each.channel, each.painted]),
            [["node.color", 2]],
        );
        const all = (await call({ action: "legend" })).data as { layerId: string }[];
        assert.include(
            all.map((each) => each.layerId),
            added.params.layer,
        );
    });

    it("moves a layer to the top, or above another", async () => {
        const { session, call } = await styleAssistant();
        await call({ action: "add", where: "all", values: { "node.color": "red" }, name: "First" });
        await call({ action: "add", where: "all", values: { "edge.width": 2 }, name: "Second" });
        await call({ action: "add", where: "data.type == 'server'", values: { "node.size": 2 }, name: "Third" });

        assert.strictEqual((await call({ action: "move", layer: "First" })).code, "AI_OK");
        assert.deepStrictEqual(ownLayers(session), ["Second", "Third", "First"]);
        assert.strictEqual(
            (await call({ action: "move", layer: "First", position: "above", relativeTo: "Second" })).code,
            "AI_OK",
        );
        assert.deepStrictEqual(ownLayers(session), ["Second", "First", "Third"]);
        assert.strictEqual(
            (await call({ action: "move", layer: "Third", position: "below", relativeTo: "Second" })).code,
            "AI_OK",
        );
        assert.deepStrictEqual(ownLayers(session), ["Third", "Second", "First"]);
        // Above the top layer is the top.
        assert.strictEqual(
            (await call({ action: "move", layer: "Third", position: "above", relativeTo: "First" })).code,
            "AI_OK",
        );
        assert.deepStrictEqual(ownLayers(session), ["Second", "First", "Third"]);
    });

    it("rescopes an edge layer with update", async () => {
        const { session, call } = await styleAssistant();
        const added = await call({ action: "add", where: "all", values: { "edge.width": 2 }, name: "Wide" });
        const heavy = await call({ action: "update", layer: "Wide", where: "data.weight > 0.6" });
        // The model reads the expression as the element rewrote it, with its literal quoted.
        assert.deepStrictEqual(heavy.params, {
            layer: added.params.layer,
            rewritten: "data.weight > `0.6`",
            matched: 2,
            painted: { "edge.width": 2 },
        });
        assert.strictEqual(session.styles.get(added.params.layer as string)?.selector.match, "expression");
    });

    it("explains why a node looks as it does, and refuses an edge it does not hold", async () => {
        const { call } = await styleAssistant();
        await call({ action: "add", where: "all", values: { "node.color": "orange" }, name: "Oranges" });
        const why = (await call({ action: "explain", node: "a" })).data as {
            merged: Record<string, { hex?: string }>;
            contributions: { name: string }[];
        };
        assert.strictEqual(why.merged["node.color"].hex, "#ffa500");
        assert.include(
            why.contributions.map((each) => each.name),
            "Oranges",
        );
        const edge = await call({ action: "explain", edge: "no-such-edge" });
        assert.strictEqual(edge.code, "E_BAD_COMMAND");
        assert.include(edge.params, { kind: "edge", id: "no-such-edge" });
    });

    it("clears only the assistant's own layers", async () => {
        const { session, call } = await styleAssistant();
        await session.styles.add({
            name: "Reader's",
            target: "node",
            selector: { match: "everything" },
            set: { "node.size": 2 },
        });
        await call({ action: "add", where: "all", values: { "node.color": "red" }, name: "Mine" });
        await call({ action: "add", where: "all", values: { "edge.width": 2 }, name: "Mine too" });
        const cleared = await call({ action: "clear_mine" });
        assert.deepStrictEqual(cleared.params, { removed: 2 });
        assert.deepStrictEqual(ownLayers(session), ["Reader's"]);
    });
});

describe("encode", () => {
    it("binds a channel to an attribute with a palette, and hides one of its legend values", async () => {
        const { session, call } = await styleAssistant();
        const made = await call({
            action: "encode",
            encode: { channel: "node.color", attribute: "data.load", palette: "viridis" },
            name: "By load",
        });
        assert.strictEqual(made.code, "style.encode");
        assert.deepStrictEqual(made.params, { layer: made.params.layer, matched: 5, painted: { "node.color": 5 } });
        const layer = session.styles.get(made.params.layer as string);
        assert.strictEqual(layer?.name, "By load");

        const hidden = await call({
            action: "hide_value",
            layer: "By load",
            channel: "node.color",
            value: 0.9,
            hidden: true,
        });
        assert.strictEqual(hidden.code, "AI_OK");
    });

    it("folds a midpoint into a linear scale's options and writes a layer of its own", async () => {
        const { session, call } = await styleAssistant();
        const made = await call({
            action: "encode",
            encode: { channel: "node.size", attribute: "load", midpoint: 0.5, reverse: true },
        });
        assert.strictEqual(made.code, "style.encode");
        const layer = session.styles.get(made.params.layer as string);
        assert.strictEqual(layer?.name, "assistant node.size");
        assert.deepStrictEqual(layer?.selector, { match: "has", path: "data.load" });
        assert.deepInclude(layer?.encode?.["node.size"] as object, {
            by: "data.load",
            scale: "linear",
            midpoint: 0.5,
            reverse: true,
        });
    });

    it("refuses scale options the scale does not take, an unknown attribute and no source at all", async () => {
        const { session, call } = await styleAssistant();
        const options = await call({
            action: "encode",
            encode: { channel: "node.size", attribute: "load", scale: "linear", scaleOptions: { bogus: 1 } },
        });
        assert.strictEqual(options.code, "AI_ARG_INVALID");
        assert.include(options.params, { path: "encode.scaleOptions" });

        const column = await call({ action: "encode", encode: { channel: "node.color", attribute: "nope" } });
        assert.strictEqual(column.code, "AI_UNKNOWN_COLUMN");
        assert.include(column.params, { name: "nope", on: "node" });

        const nothing = await call({ action: "encode", encode: { channel: "node.color" } });
        assert.strictEqual(nothing.code, "AI_ARG_INVALID");
        assert.include(nothing.params, { path: "encode", expected: "attribute, or run and field" });
        assert.deepStrictEqual(ownLayers(session), []);
    });

    it("binds an edge channel to an attribute over a fixed domain", async () => {
        const { session, call } = await styleAssistant();
        const made = await call({
            action: "encode",
            encode: { channel: "edge.width", attribute: "weight", domain: [0, 1] },
        });
        assert.strictEqual(made.code, "style.encode");
        assert.deepStrictEqual(made.params.painted, { "edge.width": 5 });
        assert.strictEqual(session.styles.get(made.params.layer as string)?.target, "edge");
    });

    it("binds a channel to a run's field", async () => {
        const { session, call } = await styleAssistant();
        await session.runs.start("degree", undefined, { style: false });
        const made = await call({ action: "encode", encode: { channel: "node.size", run: "degree", field: "value" } });
        assert.strictEqual(made.code, "style.encode");
        assert.include(made.params, { matched: 5 });
    });

    it("reads an encoding layer back with get: its binding, and no literal values", async () => {
        const { call } = await styleAssistant();
        await call({
            action: "encode",
            encode: { channel: "node.color", attribute: "team", missing: "gray" },
            name: "Teams",
        });
        const got = (await call({ action: "get", layer: "Teams" })).data as Record<string, unknown>;
        assert.notProperty(got, "values");
        const color = (got.encode as Record<string, Record<string, unknown>>)["node.color"];
        assert.strictEqual(color.by, "data.team");
        assert.deepStrictEqual(color.missing, { value: "gray" });
    });

    it("highlights a run's path with a look for nodes and edges together, on a field it names", async () => {
        const { session, call } = await styleAssistant();
        await session.runs.start("shortest-path", { source: "a", target: "e" }, { style: false });
        const lit = await call({
            action: "highlight",
            run: "shortest-path",
            field: "onPath",
            values: { node: "red", "edge.color": "red" },
        });
        assert.strictEqual(lit.code, "AI_OK", JSON.stringify(lit));
        assert.isAbove(lit.params.matched as number, 0);
    });

    it("refuses a suggestion or a highlight with no run to read", async () => {
        const { call } = await styleAssistant();
        const suggestion = await call({ action: "apply_suggestion" });
        assert.strictEqual(suggestion.code, "AI_UNKNOWN_RUN");
        const highlight = await call({ action: "highlight" });
        assert.strictEqual(highlight.code, "AI_UNKNOWN_RUN");
    });
});
