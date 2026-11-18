/**
 * @file The version 2 `settings` section (spec 4.4): what it holds and leaves out, the column
 * dependencies, secrets, unknown keys kept, playback, and the round
 * trips state -> section -> state and section -> state -> section.
 */

import { readFileSync } from "node:fs";

import { Ajv2020 } from "ajv/dist/2020.js";
import addFormatsModule from "ajv-formats";
import { assert, describe, it } from "vitest";

import { createGraphSession, type GraphSession } from "../../../session";
import { settingsCodec } from "../../../src/session/document2/codecs/settings";
import { openDocument2, saveDocument2 } from "../../../src/session/document2/document";
import { parseDocument, schemaUrl } from "../../../src/session/document2/framing";
import type { CodecRegistry, DocumentProblem, JsonObject, SectionCodec } from "../../../src/session/document2/types";

const SPEC = new URL("../../../spec/", import.meta.url);
const readJson = (path: string): JsonObject => JSON.parse(readFileSync(new URL(path, SPEC), "utf8")) as JsonObject;
const CODECS: CodecRegistry = { settings: settingsCodec };
const ON = { features: ["save-files-v2", "timeline"] };

const ajv = new Ajv2020({ allErrors: true, strict: false });
const addFormats = (addFormatsModule as unknown as { default?: typeof addFormatsModule }).default ?? addFormatsModule;
addFormats(ajv);
ajv.addSchema(readJson("schemas/common/v2.json"));
ajv.addSchema(readJson("schemas/graphty-settings/v1.json"));

/**
 * Assert a section validates against the settings schema.
 * @param section - The section.
 */
function assertValid(section: JsonObject): void {
    const validate = ajv.getSchema(schemaUrl("graphty-settings", 1));
    assert.isDefined(validate);
    assert.isTrue(validate(section), ajv.errorsText(validate.errors));
}

/**
 * Save the settings section file.
 * @param session - The session.
 * @returns The section.
 */
async function save(session: GraphSession): Promise<JsonObject> {
    return (await saveReport(session)).document;
}

/**
 * Save the settings section file, with what the save reports.
 * @param session - The session.
 * @returns The section and the report.
 */
function saveReport(session: GraphSession): Promise<{ document: JsonObject; problems: DocumentProblem[] }> {
    return saveDocument2(session, CODECS, { sections: ["settings"], form: "section" }, () => false);
}

/**
 * Open a settings section file.
 * @param session - The session.
 * @param section - The section.
 * @returns The problems.
 */
async function open(session: GraphSession, section: JsonObject): Promise<DocumentProblem[]> {
    const opened = await openDocument2(
        session,
        CODECS,
        parseDocument(section, CODECS),
        {},
        { canned: new Map(), restoreDerived: () => undefined, beforeReplace: () => undefined, name: null },
    );
    return opened.problems;
}

/**
 * The session's settings that the section holds, for comparing.
 * @param session - The session.
 * @returns They, as JSON.
 */
function stateOf(session: GraphSession): unknown {
    const { runAlgorithmsOnLoad, background, selectionStyle, pinnedStyle, runPlacement, layoutBehavior } =
        session.config;
    return JSON.parse(
        JSON.stringify({
            runAlgorithmsOnLoad,
            background,
            selectionStyle,
            pinnedStyle,
            runPlacement,
            layoutBehavior,
            layoutTransition: session.config.layoutTransition,
            playback: session.time.settings,
        }),
    );
}

/**
 * A session with settings far from the defaults.
 * @returns The session.
 */
async function changed(): Promise<GraphSession> {
    const session = createGraphSession(ON);
    await session.config.set({
        data: {
            directed: true,
            knownFields: { nodeIdPath: "key", edgeTimePath: "when", edgeWeightPath: "cost", positionScale: 2 },
        },
        runAlgorithmsOnLoad: true,
        background: { backgroundType: "color", color: "#102030" },
        pinnedStyle: { color: "#868e96", scale: 1.12, opacity: 1 },
        runPlacement: "top",
        layoutBehavior: { preSteps: 40 },
        layoutTransition: { transition: "glide", seconds: 0.5 },
        viewRotation: 90,
        framing: { extent: "centers" },
        author: "someone",
        name: "A project",
        startingRows: true,
    });
    await session.time.setSettings({ mode: "cumulative", timeZone: "Europe/Paris", ageFade: 0.4 });
    return session;
}

describe("settings section", () => {
    it("writes the keys no other section holds, flat, valid against its schema", async () => {
        const { document: section, problems } = await saveReport(await changed());
        assertValid(section);
        const settings = section.settings as JsonObject;
        assert.strictEqual(settings["layoutBehavior.preSteps"], 40);
        assert.strictEqual(settings.runPlacement, "top");
        // No data key is written here; one with no home in any section is refused and reported.
        assert.isFalse(Object.keys(settings).some((key) => key.startsWith("data.")));
        assert.deepEqual(problems, [
            { code: "W_MEMBER_LEFT_OUT", params: { section: "settings", field: "data.knownFields.positionScale" } },
        ]);
        for (const key of ["viewRotation", "framing", "author", "name", "startingRows", "editableBase"]) {
            assert.notProperty(settings, key);
        }
        assert.deepEqual(section.playback, {
            mode: "cumulative",
            timeZone: "Europe/Paris",
            ageFade: 0.4,
        });
        assert.notProperty(section, "dependencies", "no key written here names a column");
    });

    it("onto an open project sets only the keys the section holds", async () => {
        const session = createGraphSession(ON);
        await session.config.set({ background: { backgroundType: "color", color: "#000000" }, runPlacement: "top" });
        await open(session, {
            kind: "graphty-settings",
            version: 1,
            generator: { name: "test", version: "0" },
            settings: { runPlacement: "beneath" },
        });
        assert.strictEqual(session.config.runPlacement, "beneath");
        assert.deepEqual(session.config.background, { backgroundType: "color", color: "#000000" });
    });

    it("opened as a new session, sets every absent key to its default", async () => {
        const session = createGraphSession(ON);
        await session.config.set({ runPlacement: "top", runAlgorithmsOnLoad: true });
        // A data section beside it makes the open a new session.
        const data: SectionCodec = {
            section: "data",
            version: 2,
            reads: [2],
            bound: false,
            members: [],
            write: () => Promise.resolve({ body: {} }),
            read: () => Promise.resolve(),
        };
        const codecs: CodecRegistry = { ...CODECS, data };
        const file = {
            kind: "graphty-document",
            version: 2,
            generator: { name: "test", version: "0" },
            sections: {
                data: { kind: "graphty-data", version: 2, id: "d", generator: { name: "test", version: "0" } },
                settings: { kind: "graphty-settings", version: 1, generator: { name: "test", version: "0" } },
            },
        };
        await openDocument2(
            session,
            codecs,
            parseDocument(file, codecs),
            {},
            { canned: new Map(), restoreDerived: () => undefined, beforeReplace: () => undefined, name: null },
        );
        assert.strictEqual(session.config.runPlacement, "beneath");
        assert.isFalse(session.config.runAlgorithmsOnLoad);
    });

    it("round-trips state -> section -> state, and section -> state -> section byte for byte", async () => {
        const first = await changed();
        const section = await save(first);
        const second = createGraphSession(ON);
        assert.deepEqual(await open(second, section), []);
        assert.deepEqual(stateOf(second), stateOf(first));
        const again = await save(second);
        Reflect.deleteProperty(again, "modified");
        Reflect.deleteProperty(section, "modified");
        assert.strictEqual(JSON.stringify(again), JSON.stringify(section));
    });

    it("strips credentials from URLs as a source's params do", async () => {
        const session = createGraphSession(ON);
        await session.config.set({
            background: { backgroundType: "skybox", data: "https://user:pw@example.com/sky.png?token=abc&size=2" },
        });
        const section = await save(session);
        const background = (section.settings as JsonObject).background as JsonObject;
        assert.strictEqual(background.data, "https://example.com/sky.png?size=2");
    });

    it("keeps an unknown key and writes it back; reports it and a misplaced or bad one", async () => {
        const session = createGraphSession(ON);
        const section = { ...(await save(session)) };
        section.settings = {
            ...(section.settings as JsonObject),
            "later.setting": { a: 1 },
            viewRotation: 90,
            runPlacement: "sideways",
        };
        const problems = await open(session, section);
        // In file order: runPlacement was already there.
        assert.deepEqual(problems, [
            { code: "E_BAD_DOCUMENT", params: { section: "settings", pointer: "/settings/runPlacement" } },
            { code: "W_UNKNOWN_MEMBER", params: { section: "settings", pointer: "/settings/later.setting" } },
            { code: "W_UNKNOWN_MEMBER", params: { section: "settings", pointer: "/settings/viewRotation" } },
        ]);
        assert.strictEqual(session.config.runPlacement, "beneath");
        assert.isUndefined(session.config.viewRotation);
        const saved = await save(session);
        assert.deepEqual((saved.settings as JsonObject)["later.setting"], { a: 1 });
        assert.notProperty(saved.settings as JsonObject, "viewRotation");
    });

    it("cuts a huge unknown key in the report", async () => {
        const session = createGraphSession(ON);
        const name = `x${"a".repeat(500_000)}`;
        const problems = await open(session, { ...(await save(session)), settings: { [name]: 1 } });
        assert.strictEqual(problems[0].params.pointer, `/settings/${name.slice(0, 256)}`);
    });

    it("keeps an unknown playback member", async () => {
        const session = createGraphSession(ON);
        const problems = await open(session, {
            ...(await save(session)),
            playback: { mode: "cumulative", later: true },
        });
        assert.deepEqual(problems, [
            { code: "W_UNKNOWN_MEMBER", params: { section: "settings", pointer: "/playback/later" } },
        ]);
        assert.strictEqual(session.time.settings.mode, "cumulative");
        assert.deepEqual((await save(session)).playback, { mode: "cumulative", later: true });
    });

    it("reads the worked example", async () => {
        const session = createGraphSession(ON);
        const example = readJson("examples/card-fraud.graphty-settings.json");
        assert.deepEqual(await open(session, example), []);
        assert.strictEqual(session.config.layoutTransition?.transition, "glide");
        assert.strictEqual(session.time.settings.missing, "outside");
        // The header it was read with is kept on re-save (spec 8.1 rule 5).
        const saved = await save(session);
        assert.deepEqual(saved.dependencies, example.dependencies);
        assertValid(saved);
    });
});
