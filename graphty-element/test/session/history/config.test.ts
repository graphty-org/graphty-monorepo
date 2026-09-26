/**
 * @file The project settings on a session with no renderer: `session.config` reads the `config`
 * slice live, `config.set` is one step undo takes back, a setting set to `undefined` returns to
 * its default, and a patch naming anything that is not a project setting, or a value its setting
 * refuses, changes nothing and records nothing.
 */

import { assert, describe, it } from "vitest";

import { DataConfig } from "../../../src/config/DataConfig";
import { createElementSession, createGraphSession, dispatcherOf } from "../../../src/session/GraphSession";
import { stateDigest } from "../../../src/session/project/digest";
import type { GraphSession, ProjectConfigPatch } from "../../../src/session/types";

/**
 * The code a promise rejects with, or null when it resolves.
 * @param promise - The promise.
 * @returns The code.
 */
async function codeOf(promise: Promise<unknown>): Promise<string | null> {
    return promise.then(
        () => null,
        (error: unknown) => (error as { code?: string }).code ?? "no code",
    );
}

/**
 * Check a patch is refused without changing state or recording a step.
 * @param session - The session.
 * @param values - The patch.
 */
async function refuses(session: GraphSession, values: unknown): Promise<void> {
    const before = stateDigest(dispatcherOf(session).state);
    const steps = session.history.steps.length;

    assert.strictEqual(await codeOf(session.config.set(values as ProjectConfigPatch)), "E_BAD_COMMAND", JSON.stringify(values));
    assert.strictEqual(stateDigest(dispatcherOf(session).state), before, "state changed");
    assert.strictEqual(session.history.steps.length, steps, "a step was recorded");
}

describe("session.config", () => {
    it("reads every project setting at its default before anything is set", () => {
        const session = createElementSession();
        const { config } = session;

        assert.deepEqual(config.data, DataConfig.parse({}));
        assert.isFalse(config.runAlgorithmsOnLoad);
        assert.deepEqual(config.background, { backgroundType: "color", color: "#F5F5F5" });
        assert.deepEqual(config.selectionStyle, { color: "#FFD700", scale: 1.45, opacity: 0.4 });
        assert.deepEqual(config.layoutBehavior, { preSteps: 0, stepMultiplier: 1, minDelta: 0 });
        session.dispose();
    });

    it("reads a setting live, and undo and redo move it back and forth as one step", async () => {
        const session = createElementSession();

        await session.config.set({ data: { knownFields: { nodeLabelPath: "name" } }, layoutBehavior: { preSteps: 20 } });

        assert.strictEqual(session.config.data.knownFields.nodeLabelPath, "name");
        assert.strictEqual(session.config.layoutBehavior.preSteps, 20);
        assert.lengthOf(session.history.steps, 1);

        await session.undo();
        assert.isNull(session.config.data.knownFields.nodeLabelPath);
        assert.strictEqual(session.config.layoutBehavior.preSteps, 0);

        await session.redo();
        assert.strictEqual(session.config.data.knownFields.nodeLabelPath, "name");
        session.dispose();
    });

    it("returns the same frozen object on two reads with no change between them, and a new one after a change", async () => {
        const session = createElementSession();
        const first = session.config.data;

        assert.strictEqual(session.config.data, first);
        assert.isTrue(Object.isFrozen(first) && Object.isFrozen(first.knownFields));

        await session.config.set({ data: { directed: true } });
        assert.notStrictEqual(session.config.data, first);
        assert.isTrue(session.config.data.directed);
        session.dispose();
    });

    it("replaces the background and the selection style whole", async () => {
        const session = createElementSession();

        await session.config.set({ selectionStyle: { color: "#00ff00" } });
        await session.config.set({ selectionStyle: { scale: 2 } });

        assert.deepEqual(session.config.selectionStyle, { color: "#FFD700", scale: 2, opacity: 0.4 });
        session.dispose();
    });

    it("keeps the data configuration a headless session was built with, and undo returns to it", async () => {
        const base = DataConfig.parse({ knownFields: { nodeIdPath: "key" } });
        const session = createGraphSession({ config: { data: base } });

        assert.strictEqual(session.config.data.knownFields.nodeIdPath, "key");
        await session.config.set({ data: { knownFields: { nodeIdPath: "uid" } } });
        assert.strictEqual(session.config.data.knownFields.nodeIdPath, "uid");

        await session.undo();
        assert.strictEqual(session.config.data.knownFields.nodeIdPath, "key");
        session.dispose();
    });

    it("refuses a key that is not a project setting, and a value its setting refuses", async () => {
        const session = createElementSession();

        await refuses(session, { nope: 1 });
        await refuses(session, { data: { knownFields: { nodeIdpath: "id" } } });
        await refuses(session, { data: { knownFields: "id" } });
        await refuses(session, { data: { knownFields: { positionScale: 0 } } });
        await refuses(session, { background: { backgroundType: "colour", color: "red" } });
        await refuses(session, { selectionStyle: { scale: -1 } });
        session.dispose();
    });
});
