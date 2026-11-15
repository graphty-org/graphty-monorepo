/**
 * @file The version 2 style section codec (spec 4.2): what a save writes from the session, that it
 * validates against the style schema, that an open adds the layers in one step, and that a section
 * opened and saved again comes back byte for byte, unknown members and layers this release cannot
 * apply included. Experimental (`save-files-v2`).
 */

import { readFileSync } from "node:fs";

import { Ajv2020 } from "ajv/dist/2020.js";
import addFormatsModule from "ajv-formats";
import { assert, describe, it } from "vitest";

import { createGraphSession, type GraphSession } from "../../../session";
import type { LayerSpec } from "../../../src/catalog/types";
import { layerNamesElements } from "../../../src/session/document2/codecs/elementNaming";
import { runName, styleCodec } from "../../../src/session/document2/codecs/style";
import { openDocument2, saveDocument2 } from "../../../src/session/document2/document";
import { parseDocument } from "../../../src/session/document2/framing";
import type { CodecRegistry, DocumentProblem, JsonObject, SectionCodec } from "../../../src/session/document2/types";

const SPEC = new URL("../../../spec/", import.meta.url);
const readJson = (path: string): JsonObject => JSON.parse(readFileSync(new URL(path, SPEC), "utf8")) as JsonObject;
const ON = { features: ["save-files-v2"] };

const ajv = new Ajv2020({ allErrors: true, strict: false });
const addFormats = (addFormatsModule as unknown as { default?: typeof addFormatsModule }).default ?? addFormatsModule;
addFormats(ajv);
ajv.addSchema(readJson("schemas/common/v2.json"));
const validateStyle = ajv.compile(readJson("schemas/graphty-style/v2.json"));

/**
 * The schema errors of a style section.
 * @param section - The section.
 * @returns The errors, empty when it validates.
 */
function invalid(section: JsonObject): string[] {
    return validateStyle(section)
        ? []
        : (validateStyle.errors ?? []).map((error) => `${error.instancePath} ${String(error.message)}`);
}

/** A recipe codec that reads nothing, so a style can be opened beside a recipe. */
const quietRecipe: SectionCodec = {
    section: "recipe",
    version: 2,
    reads: [2],
    bound: false,
    members: ["namespace", "commands"],
    write: () => Promise.resolve({ body: { commands: [] } }),
    read: () => Promise.resolve(),
};
const CODECS: CodecRegistry = { style: styleCodec, recipe: quietRecipe };

/**
 * Save the session's style section as a section file.
 * @param session - The session.
 * @returns The section and the problems.
 */
async function saveStyle(session: GraphSession): Promise<{ section: JsonObject; problems: DocumentProblem[] }> {
    const saved = await saveDocument2(session, CODECS, { sections: ["style"], form: "section" }, () => false);
    return { section: saved.document, problems: saved.problems };
}

/**
 * Open a file into a session through the codecs.
 * @param session - The session.
 * @param file - A section file or a full file.
 * @returns The problems.
 */
async function open(session: GraphSession, file: JsonObject): Promise<DocumentProblem[]> {
    const parsed = parseDocument(file, CODECS);
    const opened = await openDocument2(
        session,
        CODECS,
        parsed,
        {},
        { canned: new Map(), restoreDerived: () => undefined, beforeReplace: () => undefined, name: null },
    );
    return opened.problems;
}

/**
 * A section without the members a save always rewrites.
 * @param section - The section.
 * @returns Its text.
 */
function content(section: JsonObject): string {
    const { created: _created, modified: _modified, generator: _generator, ...rest } = section;
    return JSON.stringify(rest);
}

/**
 * The session's own layers, without what an open stamps on them.
 * @param session - The session.
 * @returns The layers.
 */
function ownLayers(session: GraphSession): object[] {
    return session.styles.toDocument().layers.map(({ source: _source, row: _row, ...rest }) => rest);
}

const pointerParams = (problems: readonly DocumentProblem[], code: string): unknown[] => {
    console.log(JSON.stringify(problems));
    return problems.filter((problem) => problem.code === code).map((problem) => problem.params.pointer);
};

describe("the style codec writes", () => {
    it("layers with ids, carried built-in palettes, runs by name and dependencies, and validates", async () => {
        const session = createGraphSession(ON);
        await session.styles.add({
            name: "Base",
            target: "node",
            selector: { match: "everything" },
            set: { "node.color": "#90a4ae" },
        });
        await session.styles.add({
            name: "Hubs",
            target: "node",
            selector: { match: "has", path: "results.team__hubs.value" },
            encode: { "node.color": { by: "results.team__hubs.value", scale: "linear", palette: "viridis" } },
        });
        await session.styles.add({
            name: "Big",
            target: "edge",
            selector: { match: "expression", where: "data.amount > `500`" },
            set: { "edge.color": "#c62828" },
        });
        const { section, problems } = await saveStyle(session);
        assert.deepEqual(invalid(section), []);

        const layers = section.layers as JsonObject[];
        assert.deepEqual(
            layers.map((layer) => layer.name),
            ["Base", "Hubs", "Big"],
        );
        assert.isTrue(layers.every((layer) => typeof layer.id === "string" && layer.id !== ""));
        assert.strictEqual((layers[1].selector as JsonObject).path, "results.hubs.value");
        assert.deepEqual(
            (section.palettes as JsonObject[]).map((palette) => palette.id),
            ["viridis"],
        );
        assert.deepEqual((section.dependencies as JsonObject).results, ["hubs"]);
        assert.deepEqual(
            ((section.dependencies as JsonObject).columns as JsonObject[]).map((column) => column.name),
            ["amount"],
        );
        assert.deepEqual(problems, []);
    });

    it("leaves out a layer that names elements and reports it", async () => {
        const session = createGraphSession(ON);
        await session.styles.add({
            name: "Keep",
            target: "node",
            selector: { match: "everything" },
            set: { "node.size": 2 },
        });
        await session.styles.add({
            name: "Picked",
            target: "node",
            selector: { match: "ids", nodes: ["a"] },
            set: { "node.color": "#ff0000" },
        });
        const { section, problems } = await saveStyle(session);
        assert.deepEqual(
            (section.layers as JsonObject[]).map((layer) => layer.name),
            ["Keep"],
        );
        assert.deepEqual(problems, [
            { code: "W_ELEMENT_NAMING_LEFT_OUT", params: { section: "style", pointer: "/layers/1" } },
        ]);
        assert.deepEqual(invalid(section), []);
    });

    it("writes the style tree by layer id", async () => {
        const session = createGraphSession(ON);
        await session.styles.add({
            name: "A",
            target: "node",
            selector: { match: "everything" },
            set: { "node.size": 2 },
        });
        await session.styles.addFolder("Looks");
        const { section } = await saveStyle(session);
        const [id] = (section.layers as JsonObject[]).map((layer) => layer.id);
        const tree = section.tree as JsonObject[];
        assert.deepEqual(tree[0], { layer: id });
        assert.deepEqual(tree[1], { folder: "Looks", children: [] });
        assert.deepEqual(invalid(section), []);
    });
});

describe("the style codec round-trips", () => {
    it("state -> section -> state", async () => {
        const first = createGraphSession(ON);
        await first.styles.add({
            name: "Base",
            target: "node",
            selector: { match: "everything" },
            set: { "node.shape": "box" },
        });
        await first.styles.add({
            name: "Score",
            target: "node",
            // A `top` selector ranks a run's field; the element refuses one over a column.
            selector: { match: "top", path: "results.degree.value", n: 3 },
            encode: { "node.size": { by: "data.score", scale: "linear", range: [1, 4] } },
        });
        const { section } = await saveStyle(first);

        const second = createGraphSession(ON);
        assert.deepEqual(await open(second, section), []);
        assert.deepEqual(ownLayers(second), ownLayers(first));
    });

    it("section -> state -> section, byte for byte", async () => {
        const first = createGraphSession(ON);
        await first.styles.add({
            name: "Base",
            target: "node",
            selector: { match: "everything" },
            set: { "node.shape": "box" },
        });
        await first.styles.add({
            name: "Hubs",
            target: "node",
            selector: { match: "has", path: "results.hubs.value" },
            encode: { "node.color": { by: "results.hubs.value", palette: "viridis" } },
        });
        await first.styles.addFolder("Looks");
        const { section } = await saveStyle(first);

        const second = createGraphSession(ON);
        await open(second, section);
        assert.strictEqual(content((await saveStyle(second)).section), content(section));
    });

    it("the worked example, a layer this release cannot apply kept in its place", async () => {
        const example = readJson("examples/card-fraud.graphty-style.json");
        const session = createGraphSession(ON);
        const problems = await open(session, example);
        // The `type` selector waits on the data store's types, and the element does not yet read a
        // bare number in an expression (style.md, "Expressions" rule 1): both layers are kept, not
        // applied.
        assert.deepEqual(pointerParams(problems, "W_UNKNOWN_MEMBER"), ["/layers/1", "/layers/2"]);
        assert.notInclude(
            session.styles.list().map((layer) => layer.name),
            "Merchants",
        );
        assert.strictEqual(content((await saveStyle(session)).section), content(example));
    });
});

describe("the style codec reads", () => {
    const layer = (extra: JsonObject): JsonObject => ({
        id: "one",
        name: "One",
        target: "node",
        selector: { match: "everything" },
        ...extra,
    });
    const file = (layers: JsonObject[], more: JsonObject = {}): JsonObject => ({
        kind: "graphty-style",
        version: 2,
        generator: { name: "test", version: "0" },
        ...more,
        layers,
    });

    it("adds the layers beside what the session holds, in one undoable step", async () => {
        const session = createGraphSession(ON);
        await session.styles.add({
            name: "Mine",
            target: "node",
            selector: { match: "everything" },
            set: { "node.size": 3 },
        });
        const names = (): string[] =>
            session.styles
                .list()
                .filter((each) => !each.locked)
                .map((each) => each.name);
        await open(session, file([layer({ set: { "node.size": 2 } })]));
        assert.deepEqual(names(), ["Mine", "One"]);
        await session.undo();
        assert.deepEqual(names(), ["Mine"]);
    });

    it("drops an unknown channel and an unknown built-in name, applies the rest, writes both back", async () => {
        const session = createGraphSession(ON);
        const written = file([layer({ set: { "node.colour": "#f00", "node.shape": "not-a-shape", "node.size": 2 } })]);
        const problems = await open(session, written);
        assert.deepEqual(pointerParams(problems, "W_UNKNOWN_MEMBER"), [
            "/layers/0/set/node.colour",
            "/layers/0/set/node.shape",
        ]);
        const [applied] = session.styles.list().filter((each) => !each.locked);
        assert.deepEqual(applied.set, { "node.size": 2 });
        assert.deepEqual((await saveStyle(session)).section.layers, written.layers);
    });

    it("reports unknown members of a selector, a binding and a palette, applies the layer and keeps them", async () => {
        const session = createGraphSession(ON);
        const written = file(
            [
                layer({
                    selector: { match: "everything", later: 1 },
                    encode: { "node.color": { by: "data.x", palette: "lab-reds", later: 2 } },
                }),
            ],
            {
                palettes: [
                    {
                        id: "lab-reds",
                        plainName: "Lab reds",
                        kind: "sequential",
                        colors: ["#fee0d2", "#de2d26"],
                        capacity: null,
                        colorblindSafe: [],
                        later: 3,
                    },
                ],
            },
        );
        const problems = await open(session, written);
        assert.deepEqual(pointerParams(problems, "W_UNKNOWN_MEMBER"), [
            "/palettes/0/later",
            "/layers/0/selector/later",
            "/layers/0/encode/node.color/later",
        ]);
        assert.lengthOf(
            session.styles.list().filter((each) => !each.locked),
            1,
        );
        const saved = (await saveStyle(session)).section;
        assert.deepEqual(saved.layers, written.layers);
        assert.deepEqual(saved.palettes, written.palettes);
    });

    it("renames a run named by `as` to the id the recipe loaded alongside gives it", async () => {
        const session = createGraphSession(ON);
        const style = file([
            layer({
                selector: { match: "has", path: "results.hubs.value" },
                encode: { "node.size": { by: "results.hubs.value" } },
            }),
        ]);
        const recipe = {
            kind: "graphty-recipe",
            version: 2,
            generator: { name: "test", version: "0" },
            namespace: "team",
            commands: [{ op: "algo.run", algorithm: "degree", as: "hubs", style: false }],
        };
        await open(session, {
            kind: "graphty-document",
            version: 2,
            generator: { name: "test", version: "0" },
            sections: { style, recipe },
        });
        const [applied] = session.styles.list().filter((each) => !each.locked);
        assert.deepEqual(applied.selector, { match: "has", path: "results.team__hubs.value" });
        // Saved again, the run is named by its `as`.
        assert.deepEqual((await saveStyle(session)).section.layers, style.layers);
    });
});

describe("layerNamesElements", () => {
    const session = createGraphSession(ON);
    const spec = (selector: LayerSpec["selector"], source?: LayerSpec["source"]): LayerSpec => ({
        name: "x",
        selector,
        ...(source === undefined ? {} : { source }),
    });

    it("is true for ids, listed members, inline fixed sets and element-naming rule leaves", () => {
        assert.isTrue(layerNamesElements(spec({ match: "ids", nodes: ["a"] }), session));
        assert.isTrue(layerNamesElements(spec({ match: "member", of: { nodes: ["a"] } }), session));
        assert.isTrue(
            layerNamesElements(
                spec({ match: "member", of: { define: { kind: "fixed", nodes: ["a"], reading: "induced" } } }),
                session,
            ),
        );
        assert.isTrue(
            layerNamesElements(
                spec({
                    match: "rule",
                    where: { kind: "all", of: [{ kind: "neighborhood", seeds: ["a"], depth: 1 }] },
                }),
                session,
            ),
        );
    });

    it("is false for reusable selectors", () => {
        assert.isFalse(layerNamesElements(spec({ match: "everything" }), session));
        assert.isFalse(layerNamesElements(spec({ match: "member", of: "selection" }), session));
        assert.isFalse(layerNamesElements(spec({ match: "member", of: { set: "set_missing" } }), session));
        assert.isFalse(
            layerNamesElements(spec({ match: "rule", where: { kind: "expression", where: "data.x > `1`" } }), session),
        );
    });

    it("is true for a run source whose params name a node", () => {
        const algorithm = session.catalog
            .algorithms()
            .find((each) => each.options.some((option) => option.type === "node-id"));
        assert.isDefined(algorithm);
        const option = algorithm.options.find((each) => each.type === "node-id");
        assert.isDefined(option);
        const source = (params: Record<string, unknown>): LayerSpec["source"] => ({
            by: "run",
            runId: "r",
            algorithm: algorithm.key,
            params,
        });
        assert.isTrue(layerNamesElements(spec({ match: "everything" }, source({ [option.name]: "a" })), session));
        assert.isFalse(layerNamesElements(spec({ match: "everything" }, source({})), session));
    });
});

describe("runName", () => {
    it("drops the namespace and makes a valid as", () => {
        assert.strictEqual(runName("team_overview__influence"), "influence");
        assert.strictEqual(runName("Hubs 2024"), "hubs_2024");
        assert.strictEqual(runName("2nd"), "r_2nd");
    });
});
