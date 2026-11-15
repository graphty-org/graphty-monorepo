/**
 * @file The version 2 `settings` section (spec 4.4): what it holds and leaves out, the column
 * dependencies, secrets, unknown keys kept, playback with the timeline on and off, and the round
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
import type { CodecRegistry, DocumentProblem, JsonObject } from "../../../src/session/document2/types";

const SPEC = new URL("../../../spec/", import.meta.url);
const readJson = (path: string): JsonObject => JSON.parse(readFileSync(new URL(path, SPEC), "utf8")) as JsonObject;
const CODECS: CodecRegistry = { settings: settingsCodec };
const ON = { features: ["save-files-v2", "timeline"] };
const NO_TIMELINE = { features: ["save-files-v2"] };

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
    const saved = await saveDocument2(session, CODECS, { sections: ["settings"], form: "section" }, () => false);
    return saved.document;
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
    const { data, runAlgorithmsOnLoad, background, selectionStyle, pinnedStyle, runPlacement, layoutBehavior } =
        session.config;
    return JSON.parse(
        JSON.stringify({
            data,
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
        data: { directed: true, knownFields: { nodeIdPath: "key", edgeTimePath: "when", edgeWeightPath: "cost" } },
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
    await session.time.setSettings({ mode: "cumulative", outside: "ghost", timeZone: "Europe/Paris", ageFade: 0.4 });
    return session;
}

describe("settings section", () => {
    it("writes the keys no other section holds, flat, valid against its schema", async () => {
        const section = await save(await changed());
        assertValid(section);
        const settings = section.settings as JsonObject;
        assert.strictEqual(settings["layoutBehavior.preSteps"], 40);
        assert.strictEqual(settings["data.knownFields.nodeIdPath"], "key");
        assert.strictEqual(settings.runPlacement, "top");
        for (const key of ["viewRotation", "framing", "author", "name", "startingRows", "editableBase"]) {
            assert.notProperty(settings, key);
        }
        assert.deepEqual(section.playback, {
            mode: "cumulative",
            outside: "ghost",
            timeZone: "Europe/Paris",
            ageFade: 0.4,
        });
        const { columns } = section.dependencies as { columns: JsonObject[] };
        assert.deepInclude(columns, { name: "key", schema: {} });
        assert.deepInclude(columns, { name: "when", schema: { measurement: "time" } });
        assert.deepInclude(columns, { name: "cost", schema: { measurement: "quantitative" } });
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

    it("leaves playback off with the timeline off, reports it, and writes it back", async () => {
        const section = await save(await changed());
        const session = createGraphSession(NO_TIMELINE);
        const problems = await open(session, section);
        assert.deepEqual(problems, [
            { code: "E_FEATURE_OFF", params: { feature: "timeline", key: "playback" } },
        ] as unknown as DocumentProblem[]);
        const saved = await save(session);
        assert.deepEqual(saved.playback, section.playback);
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
        assert.strictEqual(session.time.settings.outside, "ghost");
    });
});
